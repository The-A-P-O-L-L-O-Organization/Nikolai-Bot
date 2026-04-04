import { SlashCommandBuilder } from 'discord.js';
import GameState, { getGameState, updateGameState } from '../../database/models/GameState.js';
import { createAuditLog } from '../../database/models/AuditLog.js';
import { isGM, requireGM } from '../../utils/permissions.js';
import { errorEmbed, successEmbed, createEmbed } from '../../utils/embeds.js';
import { formatDate, formatRelativeTime } from '../../utils/formatters.js';
import { processTurn } from '../../systems/turnProcessor.js';
import config from '../../config.js';

export const data = new SlashCommandBuilder()
  .setName('turn')
  .setDescription('Turn management commands')
  .addSubcommand(sub =>
    sub.setName('info')
      .setDescription('View turn information and next processing time'))
  .addSubcommand(sub =>
    sub.setName('process')
      .setDescription('Manually process a turn'))
  .addSubcommand(sub =>
    sub.setName('schedule')
      .setDescription('Set the turn processing interval')
      .addIntegerOption(opt =>
        opt.setName('hours')
          .setDescription('Hours between turns')
          .setRequired(true)
          .setMinValue(1)
          .setMaxValue(168)));

export async function execute(interaction) {
  const subcommand = interaction.options.getSubcommand();

  switch (subcommand) {
    case 'info':
      return handleInfo(interaction);
    case 'process':
      return handleProcess(interaction);
    case 'schedule':
      return handleSchedule(interaction);
  }
}

async function handleInfo(interaction) {
  const gameState = await getGameState();
  
  if (!gameState) {
    return interaction.reply({ embeds: [errorEmbed('Game state not initialized.')], ephemeral: true });
  }

  const embed = createEmbed({
    title: 'Turn Information',
    color: config.colors.primary,
  });

  embed.addFields(
    { name: 'Current Turn', value: `${gameState.turn.current}`, inline: true },
    { name: 'Current Year', value: `${gameState.year}`, inline: true },
    { name: 'Turn Interval', value: `${gameState.turn.intervalHours} hours`, inline: true },
  );

  if (gameState.turn.lastProcessed) {
    embed.addFields({ name: 'Last Processed', value: formatRelativeTime(gameState.turn.lastProcessed), inline: true });
  }

  if (gameState.turn.nextProcessing) {
    embed.addFields({ name: 'Next Turn', value: formatRelativeTime(gameState.turn.nextProcessing), inline: true });
  }

  embed.addFields({
    name: 'What Happens Each Turn',
    value: [
      '• Currency/resource income is added',
      '• Production queues advance',
      '• Research progress advances',
      '• Loan interest is applied',
      '• Random events may trigger',
      '• Year advances (if enabled)',
    ].join('\n'),
    inline: false,
  });

  await interaction.reply({ embeds: [embed] });
}

async function handleProcess(interaction) {
  if (!requireGM(interaction)) return;

  await interaction.deferReply();

  try {
    const result = await processTurn(interaction.client);
    
    await createAuditLog({
      entityType: 'gamestate',
      entityName: 'Turn',
      action: 'update',
      description: `Turn manually processed by <@${interaction.user.id}>`,
      performedBy: interaction.user.id,
      performedByTag: interaction.user.tag,
    });

    const embed = createEmbed({
      title: `Turn ${result.turnNumber} Processed`,
      description: `**Year:** ${result.year}`,
      color: config.colors.success,
    });

    if (result.changes.income.length > 0) {
      embed.addFields({
        name: `Income (${result.changes.income.length} nations)`,
        value: result.changes.income.slice(0, 5).map(c => `• ${c}`).join('\n') + 
          (result.changes.income.length > 5 ? `\n...and ${result.changes.income.length - 5} more` : ''),
        inline: false,
      });
    }

    if (result.changes.production.length > 0) {
      embed.addFields({
        name: 'Production Completed',
        value: result.changes.production.slice(0, 5).map(c => `• ${c}`).join('\n'),
        inline: false,
      });
    }

    if (result.changes.research.length > 0) {
      embed.addFields({
        name: 'Research Progress',
        value: result.changes.research.slice(0, 5).map(c => `• ${c}`).join('\n'),
        inline: false,
      });
    }

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('Turn processing error:', error);
    await interaction.editReply({ embeds: [errorEmbed(`Error processing turn: ${error.message}`)] });
  }
}

async function handleSchedule(interaction) {
  if (!requireGM(interaction)) return;

  const hours = interaction.options.getInteger('hours');
  const gameState = await getGameState();
  const oldInterval = gameState?.turn?.intervalHours || 12;

  // Calculate next processing time
  const now = new Date();
  const nextProcessing = new Date(now.getTime() + (hours * 60 * 60 * 1000));

  await updateGameState({
    'turn.intervalHours': hours,
    'turn.nextProcessing': nextProcessing,
  });

  await createAuditLog({
    entityType: 'gamestate',
    entityName: 'Turn Schedule',
    action: 'update',
    field: 'turn.intervalHours',
    oldValue: oldInterval,
    newValue: hours,
    description: `Turn interval changed from **${oldInterval}h** to **${hours}h**`,
    performedBy: interaction.user.id,
    performedByTag: interaction.user.tag,
  });

  await interaction.reply({ embeds: [successEmbed(`Turn interval set to **${hours} hours**.\nNext turn: ${formatRelativeTime(nextProcessing)}`)] });
}
