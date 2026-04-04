import { SlashCommandBuilder } from 'discord.js';
import Nation from '../../database/models/Nation.js';
import Transaction from '../../database/models/Transaction.js';
import { getAllCurrencies } from '../../database/models/Resource.js';
import { canModifyNation, isGM } from '../../utils/permissions.js';
import { errorEmbed, createEmbed, listEmbed } from '../../utils/embeds.js';
import { formatNumber, formatDate, formatRelativeTime } from '../../utils/formatters.js';
import config from '../../config.js';

export const data = new SlashCommandBuilder()
  .setName('transactions')
  .setDescription('View transaction history for a nation')
  .addStringOption(opt =>
    opt.setName('nation')
      .setDescription('Nation to view (GMs can view any)')
      .setRequired(true)
      .setAutocomplete(true))
  .addIntegerOption(opt =>
    opt.setName('limit')
      .setDescription('Number of transactions to show (default: 20)')
      .setRequired(false)
      .setMinValue(1)
      .setMaxValue(50));

export async function execute(interaction) {
  const nationName = interaction.options.getString('nation');
  const limit = interaction.options.getInteger('limit') || 20;

  const nation = await Nation.findOne({ name: { $regex: new RegExp(`^${nationName}$`, 'i') } });
  if (!nation) {
    return interaction.reply({ embeds: [errorEmbed(`Nation **${nationName}** not found.`)], ephemeral: true });
  }

  // Check permissions - nation owner or GM can view
  if (!canModifyNation(interaction.member, nation)) {
    return interaction.reply({
      embeds: [errorEmbed(`You don't have permission to view **${nation.name}**'s transactions.`)],
      ephemeral: true,
    });
  }

  // Get transactions
  const transactions = await Transaction.find({
    $or: [
      { 'from.nation': nation._id },
      { 'to.nation': nation._id },
    ],
  })
    .sort({ createdAt: -1 })
    .limit(limit);

  if (transactions.length === 0) {
    return interaction.reply({ embeds: [errorEmbed(`No transactions found for **${nation.name}**.`)] });
  }

  const embed = createEmbed({
    title: `${nation.name} - Transaction History`,
    color: config.colors.economy,
  });

  const lines = transactions.map(t => {
    const isOutgoing = t.from?.nation?.equals(nation._id);
    const direction = isOutgoing ? '📤' : '📥';
    const otherParty = isOutgoing ? t.to?.nationName : t.from?.nationName;
    const sign = isOutgoing ? '-' : '+';
    const amountStr = `${sign}${formatNumber(t.amount)} ${t.currency}`;
    const timeStr = formatRelativeTime(t.createdAt);
    
    let line = `${direction} **${amountStr}**`;
    if (otherParty) {
      line += isOutgoing ? ` → ${otherParty}` : ` ← ${otherParty}`;
    }
    line += ` • ${t.description || t.type}`;
    line += ` • *${timeStr}*`;
    
    return line;
  });

  // Split into chunks if too long
  const chunkSize = 10;
  for (let i = 0; i < lines.length; i += chunkSize) {
    const chunk = lines.slice(i, i + chunkSize);
    const fieldName = i === 0 ? 'Recent Transactions' : '\u200b';
    embed.addFields({ name: fieldName, value: chunk.join('\n'), inline: false });
  }

  embed.setFooter({ text: `Showing ${transactions.length} most recent transactions` });

  await interaction.reply({ embeds: [embed] });
}

export async function autocomplete(interaction) {
  const focusedOption = interaction.options.getFocused(true);

  if (focusedOption.name === 'nation') {
    let query = { name: { $regex: focusedOption.value, $options: 'i' } };
    
    // Non-GMs can only see their own nations
    if (!isGM(interaction.member)) {
      query.owner = interaction.user.id;
    }
    
    const nations = await Nation.find(query).limit(25);
    await interaction.respond(nations.map(n => ({ name: n.name, value: n.name })));
  }
}
