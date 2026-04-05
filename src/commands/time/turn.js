import { SlashCommandBuilder } from 'discord.js';
import GameState, { getGameState, updateGameState } from '../../database/models/GameState.js';
import Nation from '../../database/models/Nation.js';
import { createAuditLog } from '../../database/models/AuditLog.js';
import { isGM, requireGM } from '../../utils/permissions.js';
import { errorEmbed, successEmbed, createEmbed } from '../../utils/embeds.js';
import { formatDate, formatRelativeTime, formatNumber } from '../../utils/formatters.js';
import { processTurn } from '../../systems/turnProcessor.js';
import { applySpiritEffects } from '../../systems/spiritSystem.js';
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
    sub.setName('preview')
      .setDescription('Preview what will happen next turn without processing'))
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
    case 'preview':
      return handlePreview(interaction);
    case 'schedule':
      return handleSchedule(interaction);
  }
}

async function handleInfo(interaction) {
  const guildId = interaction.guildId;
  const gameState = await getGameState(guildId);
  
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
  const guildId = interaction.guildId;

  try {
    const result = await processTurn(interaction.client, guildId);
    
    await createAuditLog({
      guildId,
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

/**
 * Preview what will happen next turn without actually processing it
 */
async function handlePreview(interaction) {
  await interaction.deferReply();
  const guildId = interaction.guildId;

  try {
    const gameState = await getGameState(guildId);
    if (!gameState) {
      return interaction.editReply({ embeds: [errorEmbed('Game state not initialized.')] });
    }

    const nations = await Nation.find({ guildId });
    if (nations.length === 0) {
      return interaction.editReply({ embeds: [errorEmbed('No nations exist yet.')] });
    }

    const preview = {
      income: [],
      production: [],
      research: [],
      loans: [],
      spirits: [],
    };

    // Simulate what would happen for each nation
    for (const nation of nations) {
      const spiritModifiers = applySpiritEffects(nation);
      
      // Preview currency income
      if (nation.economy.income && nation.economy.income.size > 0) {
        for (const [currency, baseAmount] of nation.economy.income.entries()) {
          if (baseAmount !== 0) {
            const incomeModifier = spiritModifiers.incomeModifier || 1;
            const amount = Math.round(baseAmount * incomeModifier);
            if (amount > 0) {
              let incomeText = `${nation.name}: +${formatNumber(amount)} ${currency}`;
              if (incomeModifier !== 1) {
                incomeText += ` (${incomeModifier > 1 ? '+' : ''}${Math.round((incomeModifier - 1) * 100)}% spirits)`;
              }
              preview.income.push(incomeText);
            }
          }
        }
      }

      // Preview production completions
      if (nation.productionQueue && nation.productionQueue.length > 0) {
        const productionSpeed = spiritModifiers.productionSpeed || 1;
        for (const item of nation.productionQueue) {
          const turnsToReduce = productionSpeed >= 1 ? Math.ceil(productionSpeed) : 1;
          const newTurnsRemaining = item.turnsRemaining - turnsToReduce;
          
          if (newTurnsRemaining <= 0) {
            preview.production.push(`${nation.name}: ${formatNumber(item.quantity)} ${item.unitType} will complete`);
          } else {
            preview.production.push(`${nation.name}: ${item.unitType} - ${newTurnsRemaining} turns remaining`);
          }
        }
      }

      // Preview research
      if (nation.research.current && nation.research.turnsRemaining > 0) {
        const researchSpeed = spiritModifiers.researchSpeed || 1;
        const turnsToReduce = researchSpeed >= 1 ? Math.ceil(researchSpeed) : 1;
        const newTurnsRemaining = nation.research.turnsRemaining - turnsToReduce;
        
        if (newTurnsRemaining <= 0) {
          preview.research.push(`${nation.name}: **${nation.research.current}** will complete`);
        } else {
          preview.research.push(`${nation.name}: ${nation.research.current} - ${newTurnsRemaining} turns remaining`);
        }
      }

      // Preview loan interest
      if (nation.loans && nation.loans.length > 0) {
        const maintenanceModifier = spiritModifiers.maintenanceModifier || 1;
        for (const loan of nation.loans) {
          if (loan.interestRate > 0) {
            const effectiveRate = loan.interestRate * maintenanceModifier;
            const interest = Math.round(loan.amount * (effectiveRate / 100));
            preview.loans.push(`${nation.name}: +${formatNumber(interest)} ${loan.currency} interest`);
          }
        }
      }

      // Preview spirit effects
      if (spiritModifiers.stabilityModifier && spiritModifiers.stabilityModifier !== 0) {
        preview.spirits.push(`${nation.name}: Stability ${spiritModifiers.stabilityModifier > 0 ? '+' : ''}${spiritModifiers.stabilityModifier}%`);
      }
      if (spiritModifiers.populationGrowth && spiritModifiers.populationGrowth !== 0) {
        const growth = Math.round(nation.populationNumber * (spiritModifiers.populationGrowth / 100));
        preview.spirits.push(`${nation.name}: Population ${growth > 0 ? '+' : ''}${formatNumber(growth)}`);
      }
    }

    // Build embed
    const nextTurn = (gameState.turn?.current || 0) + 1;
    const nextYear = gameState.settings?.autoAdvanceYear 
      ? gameState.year + (gameState.settings?.yearPerTurn || 1)
      : gameState.year;

    const embed = createEmbed({
      title: `Turn ${nextTurn} Preview`,
      description: `**Next Year:** ${nextYear}\n*This is a preview - no changes have been made.*`,
      color: config.colors.warning,
    });

    if (preview.income.length > 0) {
      embed.addFields({
        name: `Income Preview (${preview.income.length})`,
        value: preview.income.slice(0, 8).join('\n') + 
          (preview.income.length > 8 ? `\n...and ${preview.income.length - 8} more` : ''),
        inline: false,
      });
    }

    if (preview.production.length > 0) {
      embed.addFields({
        name: 'Production Queue',
        value: preview.production.slice(0, 6).join('\n') +
          (preview.production.length > 6 ? `\n...and ${preview.production.length - 6} more` : ''),
        inline: false,
      });
    }

    if (preview.research.length > 0) {
      embed.addFields({
        name: 'Research Progress',
        value: preview.research.slice(0, 6).join('\n'),
        inline: false,
      });
    }

    if (preview.loans.length > 0) {
      embed.addFields({
        name: 'Loan Interest',
        value: preview.loans.slice(0, 5).join('\n'),
        inline: false,
      });
    }

    if (preview.spirits.length > 0) {
      embed.addFields({
        name: 'Spirit Effects',
        value: preview.spirits.slice(0, 5).join('\n'),
        inline: false,
      });
    }

    // Add note about random events
    const eventChance = gameState.settings?.randomEventChance ?? 15;
    if (eventChance > 0) {
      embed.addFields({
        name: 'Random Events',
        value: `Each nation has a **${eventChance}%** chance of triggering a random event.`,
        inline: false,
      });
    }

    await interaction.editReply({ embeds: [embed] });

  } catch (error) {
    console.error('Turn preview error:', error);
    await interaction.editReply({ embeds: [errorEmbed(`Preview failed: ${error.message}`)] });
  }
}

async function handleSchedule(interaction) {
  if (!requireGM(interaction)) return;

  const guildId = interaction.guildId;
  const hours = interaction.options.getInteger('hours');
  const gameState = await getGameState(guildId);
  const oldInterval = gameState?.turn?.intervalHours || 12;

  // Calculate next processing time
  const now = new Date();
  const nextProcessing = new Date(now.getTime() + (hours * 60 * 60 * 1000));

  await updateGameState(guildId, {
    'turn.intervalHours': hours,
    'turn.nextProcessing': nextProcessing,
  });

  await createAuditLog({
    guildId,
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
