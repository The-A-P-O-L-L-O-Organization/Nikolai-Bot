import { SlashCommandBuilder, ChannelType } from 'discord.js';
import GameState, { getGameState, updateGameState } from '../../database/models/GameState.js';
import { createAuditLog } from '../../database/models/AuditLog.js';
import { isGM, requireGM } from '../../utils/permissions.js';
import { errorEmbed, successEmbed, createEmbed } from '../../utils/embeds.js';
import config from '../../config.js';

export const data = new SlashCommandBuilder()
  .setName('settings')
  .setDescription('Configure bot settings')
  .addSubcommand(sub =>
    sub.setName('view')
      .setDescription('View current settings'))
  .addSubcommand(sub =>
    sub.setName('turn-channel')
      .setDescription('Set the channel for turn announcements')
      .addChannelOption(opt =>
        opt.setName('channel')
          .setDescription('Channel for announcements (leave empty to disable)')
          .setRequired(false)
          .addChannelTypes(ChannelType.GuildText)))
  .addSubcommand(sub =>
    sub.setName('year-per-turn')
      .setDescription('Set how many years pass per turn')
      .addIntegerOption(opt =>
        opt.setName('years')
          .setDescription('Years per turn')
          .setRequired(true)
          .setMinValue(0)
          .setMaxValue(10)))
  .addSubcommand(sub =>
    sub.setName('auto-year')
      .setDescription('Toggle automatic year advancement')
      .addBooleanOption(opt =>
        opt.setName('enabled')
          .setDescription('Enable auto year advancement')
          .setRequired(true)))
  .addSubcommand(sub =>
    sub.setName('event-chance')
      .setDescription('Set random event chance per nation per turn')
      .addIntegerOption(opt =>
        opt.setName('percent')
          .setDescription('Percentage chance (0-100)')
          .setRequired(true)
          .setMinValue(0)
          .setMaxValue(100)));

export async function execute(interaction) {
  if (!requireGM(interaction)) return;

  const subcommand = interaction.options.getSubcommand();

  switch (subcommand) {
    case 'view':
      return handleView(interaction);
    case 'turn-channel':
      return handleTurnChannel(interaction);
    case 'year-per-turn':
      return handleYearPerTurn(interaction);
    case 'auto-year':
      return handleAutoYear(interaction);
    case 'event-chance':
      return handleEventChance(interaction);
  }
}

async function handleView(interaction) {
  const gameState = await getGameState();
  
  if (!gameState) {
    return interaction.reply({ embeds: [errorEmbed('Game state not initialized.')], ephemeral: true });
  }

  const embed = createEmbed({
    title: 'Bot Settings',
    color: config.colors.primary,
  });

  const settings = gameState.settings || {};
  const turn = gameState.turn || {};

  embed.addFields(
    { name: 'Turn Interval', value: `${turn.intervalHours || 12} hours`, inline: true },
    { name: 'Years per Turn', value: `${settings.yearPerTurn || 1}`, inline: true },
    { name: 'Auto Advance Year', value: settings.autoAdvanceYear ? 'Yes' : 'No', inline: true },
    { name: 'Random Event Chance', value: `${settings.randomEventChance || 10}%`, inline: true },
    { name: 'Turn Announcement Channel', value: settings.turnAnnouncementChannel ? `<#${settings.turnAnnouncementChannel}>` : 'Not set', inline: true },
  );

  await interaction.reply({ embeds: [embed] });
}

async function handleTurnChannel(interaction) {
  const channel = interaction.options.getChannel('channel');
  
  await updateGameState({
    'settings.turnAnnouncementChannel': channel?.id || null,
  });

  await createAuditLog({
    entityType: 'gamestate',
    entityName: 'Settings',
    action: 'update',
    field: 'settings.turnAnnouncementChannel',
    newValue: channel?.id || null,
    description: channel 
      ? `Turn announcement channel set to <#${channel.id}>`
      : 'Turn announcements disabled',
    performedBy: interaction.user.id,
    performedByTag: interaction.user.tag,
  });

  if (channel) {
    await interaction.reply({ embeds: [successEmbed(`Turn announcements will be posted to ${channel}.`)] });
  } else {
    await interaction.reply({ embeds: [successEmbed('Turn announcements have been disabled.')] });
  }
}

async function handleYearPerTurn(interaction) {
  const years = interaction.options.getInteger('years');
  
  await updateGameState({
    'settings.yearPerTurn': years,
  });

  await createAuditLog({
    entityType: 'gamestate',
    entityName: 'Settings',
    action: 'update',
    field: 'settings.yearPerTurn',
    newValue: years,
    description: `Years per turn set to **${years}**`,
    performedBy: interaction.user.id,
    performedByTag: interaction.user.tag,
  });

  await interaction.reply({ embeds: [successEmbed(`Each turn will now advance **${years}** year(s).`)] });
}

async function handleAutoYear(interaction) {
  const enabled = interaction.options.getBoolean('enabled');
  
  await updateGameState({
    'settings.autoAdvanceYear': enabled,
  });

  await createAuditLog({
    entityType: 'gamestate',
    entityName: 'Settings',
    action: 'update',
    field: 'settings.autoAdvanceYear',
    newValue: enabled,
    description: `Auto year advancement ${enabled ? 'enabled' : 'disabled'}`,
    performedBy: interaction.user.id,
    performedByTag: interaction.user.tag,
  });

  await interaction.reply({ embeds: [successEmbed(`Automatic year advancement is now **${enabled ? 'enabled' : 'disabled'}**.`)] });
}

async function handleEventChance(interaction) {
  const percent = interaction.options.getInteger('percent');
  
  await updateGameState({
    'settings.randomEventChance': percent,
  });

  await createAuditLog({
    entityType: 'gamestate',
    entityName: 'Settings',
    action: 'update',
    field: 'settings.randomEventChance',
    newValue: percent,
    description: `Random event chance set to **${percent}%**`,
    performedBy: interaction.user.id,
    performedByTag: interaction.user.tag,
  });

  await interaction.reply({ embeds: [successEmbed(`Random event chance set to **${percent}%** per nation per turn.`)] });
}
