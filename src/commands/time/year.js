import { SlashCommandBuilder } from 'discord.js';
import GameState, { getGameState, updateGameState } from '../../database/models/GameState.js';
import { createAuditLog } from '../../database/models/AuditLog.js';
import { isGM, requireGM } from '../../utils/permissions.js';
import { errorEmbed, successEmbed, createEmbed } from '../../utils/embeds.js';
import { formatDate, formatRelativeTime } from '../../utils/formatters.js';
import config from '../../config.js';

export const data = new SlashCommandBuilder()
  .setName('year')
  .setDescription('View or set the current in-game year')
  .addSubcommand(sub =>
    sub.setName('view')
      .setDescription('View the current year'))
  .addSubcommand(sub =>
    sub.setName('set')
      .setDescription('Set the current year')
      .addIntegerOption(opt =>
        opt.setName('year')
          .setDescription('New year value')
          .setRequired(true)))
  .addSubcommand(sub =>
    sub.setName('advance')
      .setDescription('Advance the year by a specified amount')
      .addIntegerOption(opt =>
        opt.setName('years')
          .setDescription('Number of years to advance')
          .setRequired(false)
          .setMinValue(1)));

export async function execute(interaction) {
  const subcommand = interaction.options.getSubcommand();

  switch (subcommand) {
    case 'view':
      return handleView(interaction);
    case 'set':
      return handleSet(interaction);
    case 'advance':
      return handleAdvance(interaction);
  }
}

async function handleView(interaction) {
  const guildId = interaction.guildId;
  const gameState = await getGameState(guildId);
  
  if (!gameState) {
    return interaction.reply({ embeds: [errorEmbed('Game state not initialized.')], ephemeral: true });
  }

  const embed = createEmbed({
    title: `Current Year: ${gameState.year}`,
    color: config.colors.primary,
    fields: [
      { name: 'Turn', value: `${gameState.turn.current}`, inline: true },
      { name: 'Next Turn', value: gameState.turn.nextProcessing ? formatRelativeTime(gameState.turn.nextProcessing) : 'Not scheduled', inline: true },
    ],
  });

  await interaction.reply({ embeds: [embed] });
}

async function handleSet(interaction) {
  if (!requireGM(interaction)) return;

  const guildId = interaction.guildId;
  const newYear = interaction.options.getInteger('year');
  const gameState = await getGameState(guildId);
  const oldYear = gameState?.year || 0;

  await updateGameState(guildId, { year: newYear });

  await createAuditLog({
    guildId,
    entityType: 'gamestate',
    entityName: 'Year',
    action: 'update',
    field: 'year',
    oldValue: oldYear,
    newValue: newYear,
    description: `Year changed from **${oldYear}** to **${newYear}**`,
    performedBy: interaction.user.id,
    performedByTag: interaction.user.tag,
  });

  await interaction.reply({ embeds: [successEmbed(`Year has been set to **${newYear}**.`)] });
}

async function handleAdvance(interaction) {
  if (!requireGM(interaction)) return;

  const guildId = interaction.guildId;
  const years = interaction.options.getInteger('years') || 1;
  const gameState = await getGameState(guildId);
  const oldYear = gameState?.year || 0;
  const newYear = oldYear + years;

  await updateGameState(guildId, { year: newYear });

  await createAuditLog({
    guildId,
    entityType: 'gamestate',
    entityName: 'Year',
    action: 'update',
    field: 'year',
    oldValue: oldYear,
    newValue: newYear,
    description: `Year advanced from **${oldYear}** to **${newYear}** (+${years})`,
    performedBy: interaction.user.id,
    performedByTag: interaction.user.tag,
  });

  await interaction.reply({ embeds: [successEmbed(`Year has been advanced to **${newYear}**.`)] });
}
