import { SlashCommandBuilder } from 'discord.js';
import Nation from '../../database/models/Nation.js';
import Transaction from '../../database/models/Transaction.js';
import { createAuditLog } from '../../database/models/AuditLog.js';
import { getGameState } from '../../database/models/GameState.js';
import { getAllCurrencies } from '../../database/models/Resource.js';
import { isGM, requireGM, canModifyNation } from '../../utils/permissions.js';
import { errorEmbed, successEmbed, createEmbed } from '../../utils/embeds.js';
import { formatNumber, parseAbbreviatedNumber, formatDate } from '../../utils/formatters.js';
import config from '../../config.js';

export const data = new SlashCommandBuilder()
  .setName('transfer')
  .setDescription('Transfer currency between nations')
  .addStringOption(opt =>
    opt.setName('from')
      .setDescription('Nation sending money')
      .setRequired(true)
      .setAutocomplete(true))
  .addStringOption(opt =>
    opt.setName('to')
      .setDescription('Nation receiving money')
      .setRequired(true)
      .setAutocomplete(true))
  .addStringOption(opt =>
    opt.setName('amount')
      .setDescription('Amount to transfer')
      .setRequired(true))
  .addStringOption(opt =>
    opt.setName('currency')
      .setDescription('Currency to transfer')
      .setRequired(true)
      .setAutocomplete(true))
  .addStringOption(opt =>
    opt.setName('reason')
      .setDescription('Reason for transfer')
      .setRequired(false));

export async function execute(interaction) {
  const guildId = interaction.guildId;
  const fromName = interaction.options.getString('from');
  const toName = interaction.options.getString('to');
  const amountStr = interaction.options.getString('amount');
  const currencyName = interaction.options.getString('currency');
  const reason = interaction.options.getString('reason') || 'Transfer';

  // Get both nations
  const fromNation = await Nation.findOne({ guildId, name: { $regex: new RegExp(`^${fromName}$`, 'i') } });
  const toNation = await Nation.findOne({ guildId, name: { $regex: new RegExp(`^${toName}$`, 'i') } });

  if (!fromNation) {
    return interaction.reply({ embeds: [errorEmbed(`Sending nation **${fromName}** not found.`)], ephemeral: true });
  }
  if (!toNation) {
    return interaction.reply({ embeds: [errorEmbed(`Receiving nation **${toName}** not found.`)], ephemeral: true });
  }
  if (fromNation._id.equals(toNation._id)) {
    return interaction.reply({ embeds: [errorEmbed('Cannot transfer to the same nation.')], ephemeral: true });
  }

  // Check permission - either GM or owner of the sending nation
  if (!canModifyNation(interaction.member, fromNation)) {
    return interaction.reply({
      embeds: [errorEmbed(`You don't have permission to transfer from **${fromNation.name}**. You must be the nation owner or a GM.`)],
      ephemeral: true,
    });
  }

  const amount = parseAbbreviatedNumber(amountStr);
  if (amount <= 0) {
    return interaction.reply({ embeds: [errorEmbed('Transfer amount must be positive.')], ephemeral: true });
  }

  // Check if sender has enough
  if (!fromNation.economy.currencies) {
    fromNation.economy.currencies = new Map();
  }
  if (!toNation.economy.currencies) {
    toNation.economy.currencies = new Map();
  }

  const senderBalance = fromNation.economy.currencies.get(currencyName) || 0;
  
  // GMs can transfer even if balance would go negative
  if (!isGM(interaction.member) && senderBalance < amount) {
    return interaction.reply({
      embeds: [errorEmbed(`**${fromNation.name}** only has **${formatNumber(senderBalance)}** ${currencyName}.`)],
      ephemeral: true,
    });
  }

  // Perform transfer
  const newSenderBalance = senderBalance - amount;
  const receiverBalance = toNation.economy.currencies.get(currencyName) || 0;
  const newReceiverBalance = receiverBalance + amount;

  fromNation.economy.currencies.set(currencyName, newSenderBalance);
  toNation.economy.currencies.set(currencyName, newReceiverBalance);

  await fromNation.save();
  await toNation.save();

  const gameState = await getGameState(guildId);

  // Log transaction
  await Transaction.create({
    guildId,
    type: 'transfer',
    from: { nation: fromNation._id, nationName: fromNation.name },
    to: { nation: toNation._id, nationName: toNation.name },
    currency: currencyName,
    amount: amount,
    description: reason,
    initiatedBy: interaction.user.id,
    turn: gameState?.turn?.current || 0,
  });

  // Audit log
  await createAuditLog({
    guildId,
    entityType: 'nation',
    entityId: fromNation._id,
    entityName: fromNation.name,
    action: 'transfer',
    description: `Transferred **${formatNumber(amount)}** ${currencyName} from **${fromNation.name}** to **${toNation.name}** (${reason})`,
    performedBy: interaction.user.id,
    performedByTag: interaction.user.tag,
  });

  const embed = createEmbed({
    title: 'Transfer Complete',
    color: config.colors.economy,
    fields: [
      { name: 'From', value: `${fromNation.name}\nNew Balance: ${formatNumber(newSenderBalance)} ${currencyName}`, inline: true },
      { name: 'To', value: `${toNation.name}\nNew Balance: ${formatNumber(newReceiverBalance)} ${currencyName}`, inline: true },
      { name: 'Amount', value: `${formatNumber(amount)} ${currencyName}`, inline: true },
    ],
  });

  if (reason && reason !== 'Transfer') {
    embed.addFields({ name: 'Reason', value: reason, inline: false });
  }

  await interaction.reply({ embeds: [embed] });
}

export async function autocomplete(interaction) {
  const focusedOption = interaction.options.getFocused(true);
  const guildId = interaction.guildId;

  if (focusedOption.name === 'from' || focusedOption.name === 'to') {
    const nations = await Nation.find({
      guildId,
      name: { $regex: focusedOption.value, $options: 'i' }
    }).limit(25);
    await interaction.respond(nations.map(n => ({ name: n.name, value: n.name })));
  } else if (focusedOption.name === 'currency') {
    const currencies = await getAllCurrencies();
    const filtered = currencies.filter(c =>
      c.name.toLowerCase().includes(focusedOption.value.toLowerCase())
    ).slice(0, 25);
    await interaction.respond(filtered.map(c => ({ name: `${c.icon} ${c.name}`, value: c.name })));
  }
}
