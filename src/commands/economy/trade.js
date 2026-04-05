import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import Nation from '../../database/models/Nation.js';
import TradeRoute from '../../database/models/TradeRoute.js';
import Sanction from '../../database/models/Sanction.js';
import { createAuditLog } from '../../database/models/AuditLog.js';
import { createHistoryEntry } from '../../database/models/HistoryEntry.js';
import { isGM, requireGM, canModifyNation } from '../../utils/permissions.js';
import { createEmbed, errorEmbed, successEmbed } from '../../utils/embeds.js';
import { formatNumber } from '../../utils/formatters.js';
import config from '../../config.js';

export const data = new SlashCommandBuilder()
  .setName('trade')
  .setDescription('Manage trade routes between nations')
  .addSubcommand(sub =>
    sub.setName('propose')
      .setDescription('Propose a trade agreement')
      .addStringOption(opt =>
        opt.setName('from')
          .setDescription('Nation proposing trade')
          .setRequired(true)
          .setAutocomplete(true))
      .addStringOption(opt =>
        opt.setName('to')
          .setDescription('Nation to trade with')
          .setRequired(true)
          .setAutocomplete(true))
      .addStringOption(opt =>
        opt.setName('offer_type')
          .setDescription('What you offer')
          .setRequired(true)
          .addChoices(
            { name: 'Currency', value: 'currency' },
            { name: 'Resource', value: 'resource' }
          ))
      .addStringOption(opt =>
        opt.setName('offer_name')
          .setDescription('Currency or resource name')
          .setRequired(true))
      .addStringOption(opt =>
        opt.setName('offer_amount')
          .setDescription('Amount per turn')
          .setRequired(true))
      .addStringOption(opt =>
        opt.setName('request_type')
          .setDescription('What you want')
          .setRequired(true)
          .addChoices(
            { name: 'Currency', value: 'currency' },
            { name: 'Resource', value: 'resource' }
          ))
      .addStringOption(opt =>
        opt.setName('request_name')
          .setDescription('Currency or resource name')
          .setRequired(true))
      .addStringOption(opt =>
        opt.setName('request_amount')
          .setDescription('Amount per turn')
          .setRequired(true))
      .addIntegerOption(opt =>
        opt.setName('duration')
          .setDescription('Duration in turns (empty = indefinite)')
          .setRequired(false)
          .setMinValue(1)))
  .addSubcommand(sub =>
    sub.setName('accept')
      .setDescription('Accept a pending trade proposal')
      .addStringOption(opt =>
        opt.setName('nation')
          .setDescription('Your nation')
          .setRequired(true)
          .setAutocomplete(true))
      .addStringOption(opt =>
        opt.setName('trade_id')
          .setDescription('Trade proposal ID')
          .setRequired(true)))
  .addSubcommand(sub =>
    sub.setName('reject')
      .setDescription('Reject a pending trade proposal')
      .addStringOption(opt =>
        opt.setName('nation')
          .setDescription('Your nation')
          .setRequired(true)
          .setAutocomplete(true))
      .addStringOption(opt =>
        opt.setName('trade_id')
          .setDescription('Trade proposal ID')
          .setRequired(true)))
  .addSubcommand(sub =>
    sub.setName('cancel')
      .setDescription('Cancel an active trade route')
      .addStringOption(opt =>
        opt.setName('nation')
          .setDescription('Your nation')
          .setRequired(true)
          .setAutocomplete(true))
      .addStringOption(opt =>
        opt.setName('trade_id')
          .setDescription('Trade route ID')
          .setRequired(true)))
  .addSubcommand(sub =>
    sub.setName('view')
      .setDescription('View trade routes')
      .addStringOption(opt =>
        opt.setName('nation')
          .setDescription('Nation to view trades for')
          .setRequired(false)
          .setAutocomplete(true)))
  .addSubcommand(sub =>
    sub.setName('pending')
      .setDescription('View pending trade proposals')
      .addStringOption(opt =>
        opt.setName('nation')
          .setDescription('Nation to check proposals for')
          .setRequired(true)
          .setAutocomplete(true)));

export async function execute(interaction) {
  const subcommand = interaction.options.getSubcommand();
  
  switch (subcommand) {
    case 'propose':
      return handlePropose(interaction);
    case 'accept':
      return handleAccept(interaction);
    case 'reject':
      return handleReject(interaction);
    case 'cancel':
      return handleCancel(interaction);
    case 'view':
      return handleView(interaction);
    case 'pending':
      return handlePending(interaction);
    default:
      return interaction.reply({ embeds: [errorEmbed('Unknown subcommand')], ephemeral: true });
  }
}

async function handlePropose(interaction) {
  const guildId = interaction.guildId;
  const fromName = interaction.options.getString('from');
  const toName = interaction.options.getString('to');
  const offerType = interaction.options.getString('offer_type');
  const offerName = interaction.options.getString('offer_name');
  const offerAmountStr = interaction.options.getString('offer_amount');
  const requestType = interaction.options.getString('request_type');
  const requestName = interaction.options.getString('request_name');
  const requestAmountStr = interaction.options.getString('request_amount');
  const duration = interaction.options.getInteger('duration');
  
  const fromNation = await Nation.findOne({ guildId, name: { $regex: new RegExp(`^${fromName}$`, 'i') } });
  const toNation = await Nation.findOne({ guildId, name: { $regex: new RegExp(`^${toName}$`, 'i') } });
  
  if (!fromNation) {
    return interaction.reply({ embeds: [errorEmbed(`Nation "${fromName}" not found`)], ephemeral: true });
  }
  if (!toNation) {
    return interaction.reply({ embeds: [errorEmbed(`Nation "${toName}" not found`)], ephemeral: true });
  }
  if (fromNation._id.equals(toNation._id)) {
    return interaction.reply({ embeds: [errorEmbed('Cannot trade with yourself')], ephemeral: true });
  }
  
  // Check permissions
  const canModify = await canModifyNation(interaction, fromNation);
  if (!canModify) {
    return interaction.reply({ embeds: [errorEmbed('You can only propose trades from nations you own')], ephemeral: true });
  }
  
  // Check for active sanctions
  const sanctions = await Sanction.find({
    guildId,
    status: 'active',
    $or: [
      { target: fromNation._id },
      { target: toNation._id }
    ],
    type: { $in: ['trade_embargo', 'full_embargo'] }
  });
  
  if (sanctions.length > 0) {
    const sanctionInfo = sanctions.map(s => `${s.targetName} (by ${s.imposedByName})`).join(', ');
    return interaction.reply({ 
      embeds: [errorEmbed(`Trade blocked by active sanctions on: ${sanctionInfo}`)], 
      ephemeral: true 
    });
  }
  
  const offerAmount = parseFloat(offerAmountStr.replace(/[^0-9.-]/g, '')) || 0;
  const requestAmount = parseFloat(requestAmountStr.replace(/[^0-9.-]/g, '')) || 0;
  
  if (offerAmount <= 0 || requestAmount <= 0) {
    return interaction.reply({ embeds: [errorEmbed('Amounts must be positive')], ephemeral: true });
  }
  
  // Create trade proposal
  const trade = await TradeRoute.create({
    guildId,
    nation1: fromNation._id,
    nation1Name: fromNation.name,
    nation2: toNation._id,
    nation2Name: toNation.name,
    type: 'bilateral',
    nation1Exports: [{ type: offerType, name: offerName, amount: offerAmount }],
    nation2Exports: [{ type: requestType, name: requestName, amount: requestAmount }],
    status: 'pending',
    initiatedBy: fromNation._id,
    duration,
    turnsRemaining: duration,
    createdBy: interaction.user.id,
  });
  
  await createAuditLog({
    guildId,
    action: 'trade_propose',
    performedBy: interaction.user.id,
    target: `${fromNation.name} -> ${toNation.name}`,
    details: { tradeId: trade._id.toString(), offer: { type: offerType, name: offerName, amount: offerAmount }, request: { type: requestType, name: requestName, amount: requestAmount } },
  });
  
  const embed = successEmbed('Trade Proposal Created')
    .setDescription(`**${fromNation.name}** proposes a trade with **${toNation.name}**`)
    .addFields(
      { name: `${fromNation.name} Offers`, value: `${formatNumber(offerAmount)} ${offerName} (${offerType})/turn`, inline: true },
      { name: `${toNation.name} Offers`, value: `${formatNumber(requestAmount)} ${requestName} (${requestType})/turn`, inline: true },
      { name: 'Duration', value: duration ? `${duration} turns` : 'Indefinite', inline: true },
      { name: 'Trade ID', value: `\`${trade._id}\``, inline: false }
    )
    .setFooter({ text: `${toNation.name} must accept with: /trade accept` });
  
  return interaction.reply({ embeds: [embed] });
}

async function handleAccept(interaction) {
  const guildId = interaction.guildId;
  const nationName = interaction.options.getString('nation');
  const tradeId = interaction.options.getString('trade_id');
  
  const nation = await Nation.findOne({ guildId, name: { $regex: new RegExp(`^${nationName}$`, 'i') } });
  if (!nation) {
    return interaction.reply({ embeds: [errorEmbed(`Nation "${nationName}" not found`)], ephemeral: true });
  }
  
  const canModify = await canModifyNation(interaction, nation);
  if (!canModify) {
    return interaction.reply({ embeds: [errorEmbed('You can only accept trades for nations you own')], ephemeral: true });
  }
  
  const trade = await TradeRoute.findById(tradeId);
  if (!trade || trade.guildId !== guildId) {
    return interaction.reply({ embeds: [errorEmbed('Trade proposal not found')], ephemeral: true });
  }
  
  if (trade.status !== 'pending') {
    return interaction.reply({ embeds: [errorEmbed(`This trade is already ${trade.status}`)], ephemeral: true });
  }
  
  // Check that this nation is the recipient
  if (!trade.nation2.equals(nation._id)) {
    return interaction.reply({ embeds: [errorEmbed('This trade proposal is not for your nation')], ephemeral: true });
  }
  
  // Activate the trade
  trade.status = 'active';
  trade.acceptedBy = nation._id;
  trade.startedAt = new Date();
  await trade.save();
  
  await createHistoryEntry({
    guildId,
    nation: trade.nation1,
    nationName: trade.nation1Name,
    type: 'economic',
    title: 'Trade Agreement Activated',
    description: `Trade route established with ${trade.nation2Name}`,
    performedBy: interaction.user.id,
  });
  
  await createHistoryEntry({
    guildId,
    nation: trade.nation2,
    nationName: trade.nation2Name,
    type: 'economic',
    title: 'Trade Agreement Activated',
    description: `Trade route established with ${trade.nation1Name}`,
    performedBy: interaction.user.id,
  });
  
  const embed = successEmbed('Trade Agreement Accepted!')
    .setDescription(`Trade route between **${trade.nation1Name}** and **${trade.nation2Name}** is now active.`)
    .addFields(
      { name: `${trade.nation1Name} Exports`, value: trade.nation1Exports.map(e => `${formatNumber(e.amount)} ${e.name}/turn`).join('\n'), inline: true },
      { name: `${trade.nation2Name} Exports`, value: trade.nation2Exports.map(e => `${formatNumber(e.amount)} ${e.name}/turn`).join('\n'), inline: true }
    );
  
  return interaction.reply({ embeds: [embed] });
}

async function handleReject(interaction) {
  const guildId = interaction.guildId;
  const nationName = interaction.options.getString('nation');
  const tradeId = interaction.options.getString('trade_id');
  
  const nation = await Nation.findOne({ guildId, name: { $regex: new RegExp(`^${nationName}$`, 'i') } });
  if (!nation) {
    return interaction.reply({ embeds: [errorEmbed(`Nation "${nationName}" not found`)], ephemeral: true });
  }
  
  const canModify = await canModifyNation(interaction, nation);
  if (!canModify) {
    return interaction.reply({ embeds: [errorEmbed('You can only reject trades for nations you own')], ephemeral: true });
  }
  
  const trade = await TradeRoute.findById(tradeId);
  if (!trade || trade.guildId !== guildId) {
    return interaction.reply({ embeds: [errorEmbed('Trade proposal not found')], ephemeral: true });
  }
  
  if (trade.status !== 'pending') {
    return interaction.reply({ embeds: [errorEmbed(`This trade is already ${trade.status}`)], ephemeral: true });
  }
  
  if (!trade.nation2.equals(nation._id)) {
    return interaction.reply({ embeds: [errorEmbed('This trade proposal is not for your nation')], ephemeral: true });
  }
  
  trade.status = 'cancelled';
  await trade.save();
  
  const embed = createEmbed()
    .setTitle('Trade Proposal Rejected')
    .setDescription(`**${nation.name}** has rejected the trade proposal from **${trade.nation1Name}**.`)
    .setColor(0xff6b6b);
  
  return interaction.reply({ embeds: [embed] });
}

async function handleCancel(interaction) {
  const guildId = interaction.guildId;
  const nationName = interaction.options.getString('nation');
  const tradeId = interaction.options.getString('trade_id');
  
  const nation = await Nation.findOne({ guildId, name: { $regex: new RegExp(`^${nationName}$`, 'i') } });
  if (!nation) {
    return interaction.reply({ embeds: [errorEmbed(`Nation "${nationName}" not found`)], ephemeral: true });
  }
  
  const canModify = await canModifyNation(interaction, nation);
  if (!canModify) {
    return interaction.reply({ embeds: [errorEmbed('You can only cancel trades involving nations you own')], ephemeral: true });
  }
  
  const trade = await TradeRoute.findById(tradeId);
  if (!trade || trade.guildId !== guildId) {
    return interaction.reply({ embeds: [errorEmbed('Trade route not found')], ephemeral: true });
  }
  
  // Check nation is part of this trade
  if (!trade.nation1.equals(nation._id) && !trade.nation2.equals(nation._id)) {
    return interaction.reply({ embeds: [errorEmbed('Your nation is not part of this trade')], ephemeral: true });
  }
  
  if (trade.status === 'cancelled' || trade.status === 'expired') {
    return interaction.reply({ embeds: [errorEmbed('This trade is already cancelled/expired')], ephemeral: true });
  }
  
  trade.status = 'cancelled';
  await trade.save();
  
  const embed = createEmbed()
    .setTitle('Trade Route Cancelled')
    .setDescription(`Trade between **${trade.nation1Name}** and **${trade.nation2Name}** has been cancelled by **${nation.name}**.`)
    .setColor(0xff6b6b);
  
  return interaction.reply({ embeds: [embed] });
}

async function handleView(interaction) {
  const guildId = interaction.guildId;
  const nationName = interaction.options.getString('nation');
  
  let query = { guildId, status: 'active' };
  
  if (nationName) {
    const nation = await Nation.findOne({ guildId, name: { $regex: new RegExp(`^${nationName}$`, 'i') } });
    if (!nation) {
      return interaction.reply({ embeds: [errorEmbed(`Nation "${nationName}" not found`)], ephemeral: true });
    }
    query.$or = [{ nation1: nation._id }, { nation2: nation._id }];
  }
  
  const trades = await TradeRoute.find(query).sort({ createdAt: -1 }).limit(15);
  
  if (trades.length === 0) {
    return interaction.reply({ 
      embeds: [createEmbed()
        .setTitle('Trade Routes')
        .setDescription(nationName ? `No active trade routes for ${nationName}.` : 'No active trade routes.')
      ] 
    });
  }
  
  const embed = createEmbed()
    .setTitle(nationName ? `Trade Routes: ${nationName}` : 'Active Trade Routes')
    .setDescription(`${trades.length} active trade route(s)`);
  
  for (const trade of trades.slice(0, 10)) {
    const n1Exports = trade.nation1Exports.map(e => `${formatNumber(e.amount)} ${e.name}`).join(', ');
    const n2Exports = trade.nation2Exports.map(e => `${formatNumber(e.amount)} ${e.name}`).join(', ');
    const duration = trade.turnsRemaining ? `${trade.turnsRemaining} turns left` : 'Indefinite';
    
    embed.addFields({
      name: `${trade.nation1Name} ↔ ${trade.nation2Name}`,
      value: `${trade.nation1Name}: ${n1Exports}\n${trade.nation2Name}: ${n2Exports}\n*${duration}*`,
      inline: false
    });
  }
  
  return interaction.reply({ embeds: [embed] });
}

async function handlePending(interaction) {
  const guildId = interaction.guildId;
  const nationName = interaction.options.getString('nation');
  
  const nation = await Nation.findOne({ guildId, name: { $regex: new RegExp(`^${nationName}$`, 'i') } });
  if (!nation) {
    return interaction.reply({ embeds: [errorEmbed(`Nation "${nationName}" not found`)], ephemeral: true });
  }
  
  const pendingTrades = await TradeRoute.find({
    guildId,
    status: 'pending',
    nation2: nation._id
  }).sort({ createdAt: -1 });
  
  if (pendingTrades.length === 0) {
    return interaction.reply({ 
      embeds: [createEmbed()
        .setTitle(`Pending Trade Proposals: ${nation.name}`)
        .setDescription('No pending trade proposals.')
      ],
      ephemeral: true
    });
  }
  
  const embed = createEmbed()
    .setTitle(`Pending Trade Proposals: ${nation.name}`)
    .setDescription(`${pendingTrades.length} pending proposal(s)`);
  
  for (const trade of pendingTrades) {
    const n1Exports = trade.nation1Exports.map(e => `${formatNumber(e.amount)} ${e.name}`).join(', ');
    const n2Exports = trade.nation2Exports.map(e => `${formatNumber(e.amount)} ${e.name}`).join(', ');
    
    embed.addFields({
      name: `From: ${trade.nation1Name}`,
      value: `They offer: ${n1Exports}/turn\nThey want: ${n2Exports}/turn\nID: \`${trade._id}\``,
      inline: false
    });
  }
  
  embed.setFooter({ text: 'Use /trade accept or /trade reject with the Trade ID' });
  
  return interaction.reply({ embeds: [embed], ephemeral: true });
}

export async function autocomplete(interaction) {
  const focusedOption = interaction.options.getFocused(true);
  const guildId = interaction.guildId;
  
  if (['nation', 'from', 'to'].includes(focusedOption.name)) {
    const nations = await Nation.find({ 
      guildId,
      name: { $regex: focusedOption.value, $options: 'i' }
    }).limit(25).select('name');
    
    return interaction.respond(
      nations.map(n => ({ name: n.name, value: n.name }))
    );
  }
}
