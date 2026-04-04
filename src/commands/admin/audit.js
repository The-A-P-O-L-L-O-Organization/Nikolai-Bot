import { SlashCommandBuilder } from 'discord.js';
import AuditLog, { getAuditLogs, getRecentAuditLogs } from '../../database/models/AuditLog.js';
import Nation from '../../database/models/Nation.js';
import { isGM, requireGM } from '../../utils/permissions.js';
import { errorEmbed, createEmbed, listEmbed } from '../../utils/embeds.js';
import { formatDate, formatRelativeTime } from '../../utils/formatters.js';
import config from '../../config.js';

export const data = new SlashCommandBuilder()
  .setName('audit')
  .setDescription('View audit logs and change history')
  .addSubcommand(sub =>
    sub.setName('nation')
      .setDescription('View audit log for a specific nation')
      .addStringOption(opt =>
        opt.setName('nation')
          .setDescription('Nation to view')
          .setRequired(true)
          .setAutocomplete(true))
      .addIntegerOption(opt =>
        opt.setName('limit')
          .setDescription('Number of entries to show')
          .setRequired(false)
          .setMinValue(1)
          .setMaxValue(50)))
  .addSubcommand(sub =>
    sub.setName('recent')
      .setDescription('View recent audit logs')
      .addIntegerOption(opt =>
        opt.setName('limit')
          .setDescription('Number of entries to show')
          .setRequired(false)
          .setMinValue(1)
          .setMaxValue(50)))
  .addSubcommand(sub =>
    sub.setName('search')
      .setDescription('Search audit logs')
      .addStringOption(opt =>
        opt.setName('query')
          .setDescription('Search term')
          .setRequired(true)));

export async function execute(interaction) {
  if (!requireGM(interaction)) return;

  const subcommand = interaction.options.getSubcommand();

  switch (subcommand) {
    case 'nation':
      return handleNation(interaction);
    case 'recent':
      return handleRecent(interaction);
    case 'search':
      return handleSearch(interaction);
  }
}

async function handleNation(interaction) {
  const nationName = interaction.options.getString('nation');
  const limit = interaction.options.getInteger('limit') || 20;

  const nation = await Nation.findOne({ name: { $regex: new RegExp(`^${nationName}$`, 'i') } });
  if (!nation) {
    return interaction.reply({ embeds: [errorEmbed(`Nation **${nationName}** not found.`)], ephemeral: true });
  }

  const logs = await getAuditLogs('nation', nation._id, limit);

  if (logs.length === 0) {
    return interaction.reply({ content: `No audit logs found for **${nation.name}**.` });
  }

  const embed = createEmbed({
    title: `${nation.name} - Audit Log`,
    color: config.colors.primary,
  });

  const lines = logs.map(log => {
    const time = formatRelativeTime(log.createdAt);
    const user = log.performedByTag || log.performedBy;
    return `**${log.action.toUpperCase()}** • ${time}\n${log.description}\n*by ${user}*`;
  });

  // Split into chunks
  const chunkSize = 5;
  for (let i = 0; i < lines.length && i < chunkSize * 2; i += chunkSize) {
    const chunk = lines.slice(i, i + chunkSize);
    embed.addFields({ name: i === 0 ? 'Recent Changes' : '\u200b', value: chunk.join('\n\n'), inline: false });
  }

  embed.setFooter({ text: `Showing ${Math.min(logs.length, chunkSize * 2)} of ${logs.length} entries` });

  await interaction.reply({ embeds: [embed] });
}

async function handleRecent(interaction) {
  const limit = interaction.options.getInteger('limit') || 20;

  const logs = await getRecentAuditLogs(limit);

  if (logs.length === 0) {
    return interaction.reply({ content: 'No audit logs found.' });
  }

  const embed = createEmbed({
    title: 'Recent Audit Logs',
    color: config.colors.primary,
  });

  const lines = logs.map(log => {
    const time = formatRelativeTime(log.createdAt);
    const user = log.performedByTag || log.performedBy;
    const entity = log.entityName ? `[${log.entityType}:${log.entityName}]` : `[${log.entityType}]`;
    return `${entity} **${log.action}** • ${time}\n${log.description.substring(0, 100)}${log.description.length > 100 ? '...' : ''}`;
  });

  const chunkSize = 5;
  for (let i = 0; i < lines.length && i < chunkSize * 2; i += chunkSize) {
    const chunk = lines.slice(i, i + chunkSize);
    embed.addFields({ name: i === 0 ? 'Entries' : '\u200b', value: chunk.join('\n\n'), inline: false });
  }

  await interaction.reply({ embeds: [embed] });
}

async function handleSearch(interaction) {
  const query = interaction.options.getString('query');

  const logs = await AuditLog.find({
    description: { $regex: query, $options: 'i' }
  }).sort({ createdAt: -1 }).limit(25);

  if (logs.length === 0) {
    return interaction.reply({ content: `No audit logs matching "${query}".` });
  }

  const embed = createEmbed({
    title: `Audit Search: "${query}"`,
    color: config.colors.primary,
  });

  const lines = logs.map(log => {
    const time = formatRelativeTime(log.createdAt);
    return `[${log.entityType}] **${log.action}** • ${time}\n${log.description.substring(0, 80)}...`;
  });

  embed.setDescription(lines.slice(0, 10).join('\n\n'));
  embed.setFooter({ text: `Found ${logs.length} matching entries` });

  await interaction.reply({ embeds: [embed] });
}

export async function autocomplete(interaction) {
  const focusedOption = interaction.options.getFocused(true);

  if (focusedOption.name === 'nation') {
    const nations = await Nation.find({
      name: { $regex: focusedOption.value, $options: 'i' }
    }).limit(25);
    await interaction.respond(nations.map(n => ({ name: n.name, value: n.name })));
  }
}
