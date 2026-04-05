import { SlashCommandBuilder } from 'discord.js';
import Nation from '../../database/models/Nation.js';
import Sanction from '../../database/models/Sanction.js';
import TradeRoute from '../../database/models/TradeRoute.js';
import { createAuditLog } from '../../database/models/AuditLog.js';
import { createHistoryEntry } from '../../database/models/HistoryEntry.js';
import { isGM, requireGM, canModifyNation } from '../../utils/permissions.js';
import { createEmbed, errorEmbed, successEmbed } from '../../utils/embeds.js';
import config from '../../config.js';

const SANCTION_TYPES = {
  trade_embargo: { name: 'Trade Embargo', description: 'Blocks all trade routes' },
  resource_ban: { name: 'Resource Ban', description: 'Blocks specific resources' },
  currency_freeze: { name: 'Currency Freeze', description: 'Freezes currency transactions' },
  arms_embargo: { name: 'Arms Embargo', description: 'Blocks military trade' },
  full_embargo: { name: 'Full Embargo', description: 'Complete economic isolation' },
  custom: { name: 'Custom', description: 'Custom restrictions' },
};

const SEVERITY_INFO = {
  light: { name: 'Light', impact: '25% restriction' },
  moderate: { name: 'Moderate', impact: '50% restriction' },
  severe: { name: 'Severe', impact: '75% restriction' },
  total: { name: 'Total', impact: '100% restriction' },
};

export const data = new SlashCommandBuilder()
  .setName('sanction')
  .setDescription('Manage economic sanctions')
  .addSubcommand(sub =>
    sub.setName('impose')
      .setDescription('Impose sanctions on a nation')
      .addStringOption(opt =>
        opt.setName('from')
          .setDescription('Nation imposing sanctions')
          .setRequired(true)
          .setAutocomplete(true))
      .addStringOption(opt =>
        opt.setName('target')
          .setDescription('Nation to sanction')
          .setRequired(true)
          .setAutocomplete(true))
      .addStringOption(opt =>
        opt.setName('type')
          .setDescription('Type of sanction')
          .setRequired(true)
          .addChoices(
            { name: 'Trade Embargo', value: 'trade_embargo' },
            { name: 'Resource Ban', value: 'resource_ban' },
            { name: 'Currency Freeze', value: 'currency_freeze' },
            { name: 'Arms Embargo', value: 'arms_embargo' },
            { name: 'Full Embargo', value: 'full_embargo' },
            { name: 'Custom', value: 'custom' }
          ))
      .addStringOption(opt =>
        opt.setName('severity')
          .setDescription('Severity of sanctions')
          .setRequired(true)
          .addChoices(
            { name: 'Light (25%)', value: 'light' },
            { name: 'Moderate (50%)', value: 'moderate' },
            { name: 'Severe (75%)', value: 'severe' },
            { name: 'Total (100%)', value: 'total' }
          ))
      .addStringOption(opt =>
        opt.setName('reason')
          .setDescription('Reason for sanctions')
          .setRequired(false))
      .addIntegerOption(opt =>
        opt.setName('duration')
          .setDescription('Duration in turns (empty = indefinite)')
          .setRequired(false)
          .setMinValue(1)))
  .addSubcommand(sub =>
    sub.setName('lift')
      .setDescription('Lift sanctions on a nation')
      .addStringOption(opt =>
        opt.setName('from')
          .setDescription('Nation that imposed sanctions')
          .setRequired(true)
          .setAutocomplete(true))
      .addStringOption(opt =>
        opt.setName('sanction_id')
          .setDescription('Sanction ID to lift')
          .setRequired(true)))
  .addSubcommand(sub =>
    sub.setName('join')
      .setDescription('Join existing sanctions (coalition)')
      .addStringOption(opt =>
        opt.setName('nation')
          .setDescription('Your nation')
          .setRequired(true)
          .setAutocomplete(true))
      .addStringOption(opt =>
        opt.setName('sanction_id')
          .setDescription('Sanction ID to join')
          .setRequired(true)))
  .addSubcommand(sub =>
    sub.setName('leave')
      .setDescription('Leave a sanctions coalition')
      .addStringOption(opt =>
        opt.setName('nation')
          .setDescription('Your nation')
          .setRequired(true)
          .setAutocomplete(true))
      .addStringOption(opt =>
        opt.setName('sanction_id')
          .setDescription('Sanction ID to leave')
          .setRequired(true)))
  .addSubcommand(sub =>
    sub.setName('view')
      .setDescription('View sanctions')
      .addStringOption(opt =>
        opt.setName('nation')
          .setDescription('Nation to view sanctions for (as target or imposer)')
          .setRequired(false)
          .setAutocomplete(true)))
  .addSubcommand(sub =>
    sub.setName('check')
      .setDescription('Check if a nation is sanctioned')
      .addStringOption(opt =>
        opt.setName('nation')
          .setDescription('Nation to check')
          .setRequired(true)
          .setAutocomplete(true)));

export async function execute(interaction) {
  const subcommand = interaction.options.getSubcommand();
  
  switch (subcommand) {
    case 'impose':
      return handleImpose(interaction);
    case 'lift':
      return handleLift(interaction);
    case 'join':
      return handleJoin(interaction);
    case 'leave':
      return handleLeave(interaction);
    case 'view':
      return handleView(interaction);
    case 'check':
      return handleCheck(interaction);
    default:
      return interaction.reply({ embeds: [errorEmbed('Unknown subcommand')], ephemeral: true });
  }
}

async function handleImpose(interaction) {
  const guildId = interaction.guildId;
  const fromName = interaction.options.getString('from');
  const targetName = interaction.options.getString('target');
  const type = interaction.options.getString('type');
  const severity = interaction.options.getString('severity');
  const reason = interaction.options.getString('reason') || 'No reason provided';
  const duration = interaction.options.getInteger('duration');
  
  const fromNation = await Nation.findOne({ guildId, name: { $regex: new RegExp(`^${fromName}$`, 'i') } });
  const targetNation = await Nation.findOne({ guildId, name: { $regex: new RegExp(`^${targetName}$`, 'i') } });
  
  if (!fromNation) {
    return interaction.reply({ embeds: [errorEmbed(`Nation "${fromName}" not found`)], ephemeral: true });
  }
  if (!targetNation) {
    return interaction.reply({ embeds: [errorEmbed(`Nation "${targetName}" not found`)], ephemeral: true });
  }
  if (fromNation._id.equals(targetNation._id)) {
    return interaction.reply({ embeds: [errorEmbed('Cannot sanction yourself')], ephemeral: true });
  }
  
  const canModify = await canModifyNation(interaction.member, fromNation);
  if (!canModify) {
    return interaction.reply({ embeds: [errorEmbed('You can only impose sanctions from nations you own')], ephemeral: true });
  }
  
  // Check for existing sanction of same type
  const existingSanction = await Sanction.findOne({
    guildId,
    imposedBy: fromNation._id,
    target: targetNation._id,
    type,
    status: 'active'
  });
  
  if (existingSanction) {
    return interaction.reply({ embeds: [errorEmbed(`${fromNation.name} already has active ${SANCTION_TYPES[type].name} on ${targetNation.name}`)], ephemeral: true });
  }
  
  // Create sanction
  const sanction = await Sanction.create({
    guildId,
    imposedBy: fromNation._id,
    imposedByName: fromNation.name,
    target: targetNation._id,
    targetName: targetNation.name,
    type,
    severity,
    reason,
    duration,
    turnsRemaining: duration,
    createdBy: interaction.user.id,
  });
  
  // If trade embargo or full embargo, suspend affected trade routes
  if (type === 'trade_embargo' || type === 'full_embargo') {
    await TradeRoute.updateMany(
      {
        guildId,
        status: 'active',
        $or: [
          { nation1: fromNation._id, nation2: targetNation._id },
          { nation1: targetNation._id, nation2: fromNation._id }
        ]
      },
      { status: 'suspended' }
    );
  }
  
  await createHistoryEntry({
    guildId,
    nation: targetNation._id,
    nationName: targetNation.name,
    type: 'diplomatic',
    title: 'Sanctions Imposed',
    description: `${fromNation.name} has imposed ${SANCTION_TYPES[type].name} (${severity})`,
    details: { type, severity, reason },
    performedBy: interaction.user.id,
  });
  
  await createAuditLog({
    guildId,
    action: 'sanction_impose',
    performedBy: interaction.user.id,
    target: `${fromNation.name} -> ${targetNation.name}`,
    details: { sanctionId: sanction._id.toString(), type, severity, reason },
  });
  
  const embed = successEmbed('Sanctions Imposed')
    .setDescription(`**${fromNation.name}** has imposed sanctions on **${targetNation.name}**`)
    .addFields(
      { name: 'Type', value: SANCTION_TYPES[type].name, inline: true },
      { name: 'Severity', value: `${SEVERITY_INFO[severity].name} (${SEVERITY_INFO[severity].impact})`, inline: true },
      { name: 'Duration', value: duration ? `${duration} turns` : 'Indefinite', inline: true },
      { name: 'Reason', value: reason, inline: false },
      { name: 'Sanction ID', value: `\`${sanction._id}\``, inline: false }
    );
  
  return interaction.reply({ embeds: [embed] });
}

async function handleLift(interaction) {
  const guildId = interaction.guildId;
  const fromName = interaction.options.getString('from');
  const sanctionId = interaction.options.getString('sanction_id');
  
  const fromNation = await Nation.findOne({ guildId, name: { $regex: new RegExp(`^${fromName}$`, 'i') } });
  if (!fromNation) {
    return interaction.reply({ embeds: [errorEmbed(`Nation "${fromName}" not found`)], ephemeral: true });
  }
  
  const canModify = await canModifyNation(interaction.member, fromNation);
  if (!canModify) {
    return interaction.reply({ embeds: [errorEmbed('You can only lift sanctions from nations you own')], ephemeral: true });
  }
  
  const sanction = await Sanction.findById(sanctionId);
  if (!sanction || sanction.guildId !== guildId) {
    return interaction.reply({ embeds: [errorEmbed('Sanction not found')], ephemeral: true });
  }
  
  if (!sanction.imposedBy.equals(fromNation._id)) {
    return interaction.reply({ embeds: [errorEmbed('Only the imposing nation can lift sanctions')], ephemeral: true });
  }
  
  if (sanction.status !== 'active') {
    return interaction.reply({ embeds: [errorEmbed(`Sanction is already ${sanction.status}`)], ephemeral: true });
  }
  
  sanction.status = 'lifted';
  sanction.liftedAt = new Date();
  await sanction.save();
  
  await createHistoryEntry({
    guildId,
    nation: sanction.target,
    nationName: sanction.targetName,
    type: 'diplomatic',
    title: 'Sanctions Lifted',
    description: `${fromNation.name} has lifted ${SANCTION_TYPES[sanction.type].name}`,
    performedBy: interaction.user.id,
  });
  
  const embed = successEmbed('Sanctions Lifted')
    .setDescription(`**${fromNation.name}** has lifted sanctions on **${sanction.targetName}**`)
    .addFields(
      { name: 'Type', value: SANCTION_TYPES[sanction.type].name, inline: true },
      { name: 'Was Active', value: sanction.createdAt ? `Since <t:${Math.floor(sanction.createdAt.getTime() / 1000)}:R>` : 'Unknown', inline: true }
    );
  
  return interaction.reply({ embeds: [embed] });
}

async function handleJoin(interaction) {
  const guildId = interaction.guildId;
  const nationName = interaction.options.getString('nation');
  const sanctionId = interaction.options.getString('sanction_id');
  
  const nation = await Nation.findOne({ guildId, name: { $regex: new RegExp(`^${nationName}$`, 'i') } });
  if (!nation) {
    return interaction.reply({ embeds: [errorEmbed(`Nation "${nationName}" not found`)], ephemeral: true });
  }
  
  const canModify = await canModifyNation(interaction.member, nation);
  if (!canModify) {
    return interaction.reply({ embeds: [errorEmbed('You can only join sanctions with nations you own')], ephemeral: true });
  }
  
  const sanction = await Sanction.findById(sanctionId);
  if (!sanction || sanction.guildId !== guildId) {
    return interaction.reply({ embeds: [errorEmbed('Sanction not found')], ephemeral: true });
  }
  
  if (sanction.status !== 'active') {
    return interaction.reply({ embeds: [errorEmbed('Can only join active sanctions')], ephemeral: true });
  }
  
  if (sanction.target.equals(nation._id)) {
    return interaction.reply({ embeds: [errorEmbed('Cannot join sanctions against yourself')], ephemeral: true });
  }
  
  if (sanction.imposedBy.equals(nation._id)) {
    return interaction.reply({ embeds: [errorEmbed('You already imposed this sanction')], ephemeral: true });
  }
  
  // Check if already a supporter
  const alreadySupporter = sanction.supporters.some(s => s.nation.equals(nation._id));
  if (alreadySupporter) {
    return interaction.reply({ embeds: [errorEmbed('Already part of this sanctions coalition')], ephemeral: true });
  }
  
  sanction.supporters.push({
    nation: nation._id,
    nationName: nation.name,
    joinedAt: new Date()
  });
  await sanction.save();
  
  const embed = successEmbed('Joined Sanctions Coalition')
    .setDescription(`**${nation.name}** has joined the sanctions against **${sanction.targetName}**`)
    .addFields(
      { name: 'Led by', value: sanction.imposedByName, inline: true },
      { name: 'Coalition Size', value: `${sanction.supporters.length + 1} nations`, inline: true }
    );
  
  return interaction.reply({ embeds: [embed] });
}

async function handleLeave(interaction) {
  const guildId = interaction.guildId;
  const nationName = interaction.options.getString('nation');
  const sanctionId = interaction.options.getString('sanction_id');
  
  const nation = await Nation.findOne({ guildId, name: { $regex: new RegExp(`^${nationName}$`, 'i') } });
  if (!nation) {
    return interaction.reply({ embeds: [errorEmbed(`Nation "${nationName}" not found`)], ephemeral: true });
  }
  
  const canModify = await canModifyNation(interaction.member, nation);
  if (!canModify) {
    return interaction.reply({ embeds: [errorEmbed('You can only leave sanctions with nations you own')], ephemeral: true });
  }
  
  const sanction = await Sanction.findById(sanctionId);
  if (!sanction || sanction.guildId !== guildId) {
    return interaction.reply({ embeds: [errorEmbed('Sanction not found')], ephemeral: true });
  }
  
  const supporterIndex = sanction.supporters.findIndex(s => s.nation.equals(nation._id));
  if (supporterIndex === -1) {
    return interaction.reply({ embeds: [errorEmbed('You are not part of this sanctions coalition')], ephemeral: true });
  }
  
  sanction.supporters.splice(supporterIndex, 1);
  await sanction.save();
  
  const embed = createEmbed()
    .setTitle('Left Sanctions Coalition')
    .setDescription(`**${nation.name}** has left the sanctions against **${sanction.targetName}**`)
    .setColor(0xffa500);
  
  return interaction.reply({ embeds: [embed] });
}

async function handleView(interaction) {
  const guildId = interaction.guildId;
  const nationName = interaction.options.getString('nation');
  
  let query = { guildId, status: 'active' };
  let title = 'Active Sanctions';
  
  if (nationName) {
    const nation = await Nation.findOne({ guildId, name: { $regex: new RegExp(`^${nationName}$`, 'i') } });
    if (!nation) {
      return interaction.reply({ embeds: [errorEmbed(`Nation "${nationName}" not found`)], ephemeral: true });
    }
    query.$or = [{ imposedBy: nation._id }, { target: nation._id }];
    title = `Sanctions: ${nation.name}`;
  }
  
  const sanctions = await Sanction.find(query).sort({ createdAt: -1 }).limit(15);
  
  if (sanctions.length === 0) {
    return interaction.reply({ 
      embeds: [createEmbed()
        .setTitle(title)
        .setDescription('No active sanctions.')
      ] 
    });
  }
  
  const embed = createEmbed()
    .setTitle(title)
    .setDescription(`${sanctions.length} active sanction(s)`);
  
  for (const sanction of sanctions.slice(0, 10)) {
    const coalitionSize = sanction.supporters.length + 1;
    const duration = sanction.turnsRemaining ? `${sanction.turnsRemaining} turns left` : 'Indefinite';
    
    embed.addFields({
      name: `${sanction.imposedByName} → ${sanction.targetName}`,
      value: `**${SANCTION_TYPES[sanction.type].name}** (${sanction.severity})\n${duration} | Coalition: ${coalitionSize}\nID: \`${sanction._id}\``,
      inline: false
    });
  }
  
  return interaction.reply({ embeds: [embed] });
}

async function handleCheck(interaction) {
  const guildId = interaction.guildId;
  const nationName = interaction.options.getString('nation');
  
  const nation = await Nation.findOne({ guildId, name: { $regex: new RegExp(`^${nationName}$`, 'i') } });
  if (!nation) {
    return interaction.reply({ embeds: [errorEmbed(`Nation "${nationName}" not found`)], ephemeral: true });
  }
  
  const sanctionsAgainst = await Sanction.find({ guildId, target: nation._id, status: 'active' });
  
  if (sanctionsAgainst.length === 0) {
    const embed = createEmbed()
      .setTitle(`Sanction Check: ${nation.name}`)
      .setDescription('✅ This nation is not under any active sanctions.')
      .setColor(0x2ecc71);
    return interaction.reply({ embeds: [embed] });
  }
  
  const embed = createEmbed()
    .setTitle(`Sanction Check: ${nation.name}`)
    .setDescription(`⚠️ This nation is under **${sanctionsAgainst.length}** active sanction(s)`)
    .setColor(0xe74c3c);
  
  for (const sanction of sanctionsAgainst) {
    const coalitionMembers = [sanction.imposedByName, ...sanction.supporters.map(s => s.nationName)];
    
    embed.addFields({
      name: SANCTION_TYPES[sanction.type].name,
      value: `Severity: ${sanction.severity}\nImposed by: ${coalitionMembers.join(', ')}\nReason: ${sanction.reason || 'Not specified'}`,
      inline: false
    });
  }
  
  return interaction.reply({ embeds: [embed] });
}

export async function autocomplete(interaction) {
  const focusedOption = interaction.options.getFocused(true);
  const guildId = interaction.guildId;
  
  if (['nation', 'from', 'target'].includes(focusedOption.name)) {
    const nations = await Nation.find({ 
      guildId,
      name: { $regex: focusedOption.value, $options: 'i' }
    }).limit(25).select('name');
    
    return interaction.respond(
      nations.map(n => ({ name: n.name, value: n.name }))
    );
  }
}
