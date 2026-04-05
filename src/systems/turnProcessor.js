import cron from 'node-cron';
import Nation from '../database/models/Nation.js';
import GameState, { getGameState, updateGameState } from '../database/models/GameState.js';
import Transaction from '../database/models/Transaction.js';
import { createAuditLog } from '../database/models/AuditLog.js';
import { turnSummaryEmbed } from '../utils/embeds.js';
import { formatNumber } from '../utils/formatters.js';
import { processEventsForTurn, eventEmbed } from './eventSystem.js';
import { applySpiritEffects } from './spiritSystem.js';
import config from '../config.js';

let scheduledJob = null;

/**
 * Start the automatic turn scheduler
 */
export function startTurnScheduler(client) {
  // Run check every minute to see if a turn should process
  scheduledJob = cron.schedule('* * * * *', async () => {
    try {
      // Get all game states that need processing
      const now = new Date();
      const gameStates = await GameState.find({
        'turn.nextProcessing': { $lte: now }
      });

      for (const gameState of gameStates) {
        console.log(`Processing turn for guild ${gameState.guildId}`);
        const result = await processTurn(client, gameState.guildId);
        
        // Announce in channel if configured
        if (gameState.settings.turnAnnouncementChannel) {
          try {
            const channel = await client.channels.fetch(gameState.settings.turnAnnouncementChannel);
            if (channel) {
              await channel.send({ embeds: [turnSummaryEmbed(result.turnNumber, result.year, result.changes)] });
            }
          } catch (err) {
            console.error(`Failed to announce turn for guild ${gameState.guildId}:`, err);
          }
        }
      }
    } catch (error) {
      console.error('Turn scheduler error:', error);
    }
  });

  console.log('Turn scheduler initialized');
}

/**
 * Stop the turn scheduler
 */
export function stopTurnScheduler() {
  if (scheduledJob) {
    scheduledJob.stop();
    scheduledJob = null;
  }
}

/**
 * Process a single turn for a specific guild
 */
export async function processTurn(client, guildId) {
  const gameState = await getGameState(guildId);
  const turnNumber = (gameState?.turn?.current || 0) + 1;
  
  const changes = {
    income: [],
    production: [],
    research: [],
    events: [],
    loans: [],
    spirits: [],
  };

  // Get all nations for this guild
  const nations = await Nation.find({ guildId });

  for (const nation of nations) {
    // Calculate spirit modifiers for this nation
    const spiritModifiers = applySpiritEffects(nation);
    
    // Process currency income (with spirit modifiers)
    if (nation.economy.income && nation.economy.income.size > 0) {
      for (const [currency, baseAmount] of nation.economy.income.entries()) {
        if (baseAmount !== 0) {
          // Apply income modifier from spirits
          const incomeModifier = spiritModifiers.incomeModifier || 1;
          const amount = Math.round(baseAmount * incomeModifier);
          
          if (!nation.economy.currencies) nation.economy.currencies = new Map();
          const current = nation.economy.currencies.get(currency) || 0;
          nation.economy.currencies.set(currency, current + amount);
          
          if (amount > 0) {
            let incomeText = `${nation.name}: +${formatNumber(amount)} ${currency}`;
            if (incomeModifier !== 1) {
              incomeText += ` (${incomeModifier > 1 ? '+' : ''}${Math.round((incomeModifier - 1) * 100)}% from spirits)`;
            }
            changes.income.push(incomeText);
          }

          // Log transaction
          await Transaction.create({
            type: 'income',
            to: { nation: nation._id, nationName: nation.name },
            currency,
            amount,
            description: incomeModifier !== 1 ? `Turn income (modified by spirits)` : 'Turn income',
            turn: turnNumber,
          });
        }
      }
    }

    // Process resource income (with spirit modifiers)
    if (nation.resourceIncome && nation.resourceIncome.size > 0) {
      for (const [resource, baseAmount] of nation.resourceIncome.entries()) {
        if (baseAmount !== 0) {
          // Check for specific resource modifiers from spirits
          const resourceModifier = spiritModifiers.resourceModifiers?.[resource] || 1;
          const amount = Math.round(baseAmount * resourceModifier);
          
          if (!nation.resources) nation.resources = new Map();
          const current = nation.resources.get(resource) || 0;
          nation.resources.set(resource, current + amount);
        }
      }
    }

    // Process production queue (with production speed modifier)
    if (nation.productionQueue && nation.productionQueue.length > 0) {
      const completedIndices = [];
      const productionSpeed = spiritModifiers.productionSpeed || 1;
      
      for (let i = 0; i < nation.productionQueue.length; i++) {
        const item = nation.productionQueue[i];
        // Production speed > 1 means faster production (reduce more turns)
        const turnsToReduce = productionSpeed >= 1 ? Math.ceil(productionSpeed) : 1;
        item.turnsRemaining -= turnsToReduce;
        
        if (item.turnsRemaining <= 0) {
          // Production complete - add units
          completedIndices.push(i);
          changes.production.push(`${nation.name}: ${formatNumber(item.quantity)} ${item.unitType} completed`);
          
          // Add units to military (simplified - adds to custom)
          const unitName = item.unitType.toLowerCase();
          const branch = determineBranch(unitName);
          
          if (branch) {
            if (!nation.military[branch].custom) nation.military[branch].custom = new Map();
            const current = nation.military[branch].custom.get(item.unitType) || 0;
            nation.military[branch].custom.set(item.unitType, current + item.quantity);
            nation.markModified('military');
          }
        }
      }

      // Remove completed items (in reverse order to maintain indices)
      for (let i = completedIndices.length - 1; i >= 0; i--) {
        nation.productionQueue.splice(completedIndices[i], 1);
      }
    }

    // Process research (with research speed modifier)
    if (nation.research.current && nation.research.turnsRemaining > 0) {
      const researchSpeed = spiritModifiers.researchSpeed || 1;
      const turnsToReduce = researchSpeed >= 1 ? Math.ceil(researchSpeed) : 1;
      nation.research.turnsRemaining -= turnsToReduce;
      
      if (nation.research.turnsRemaining <= 0) {
        changes.research.push(`${nation.name}: ${nation.research.current} completed`);
        nation.research.completed.push(nation.research.current);
        nation.research.current = null;
      } else {
        changes.research.push(`${nation.name}: ${nation.research.current} - ${nation.research.turnsRemaining} turns remaining`);
      }
    }

    // Process loan interest (with maintenance modifier)
    if (nation.loans && nation.loans.length > 0) {
      const maintenanceModifier = spiritModifiers.maintenanceModifier || 1;
      for (const loan of nation.loans) {
        if (loan.interestRate > 0) {
          // Lower maintenance modifier = lower interest
          const effectiveRate = loan.interestRate * maintenanceModifier;
          const interest = loan.amount * (effectiveRate / 100);
          loan.amount += interest;
          changes.loans.push(`${nation.name}: Loan interest +${formatNumber(interest)} ${loan.currency}`);
        }
      }
    }
    
    // Apply stability modifier from spirits
    if (spiritModifiers.stabilityModifier && spiritModifiers.stabilityModifier !== 0) {
      const oldStability = nation.stability;
      nation.stability = Math.max(0, Math.min(100, nation.stability + spiritModifiers.stabilityModifier));
      if (nation.stability !== oldStability) {
        changes.spirits.push(`${nation.name}: Stability ${spiritModifiers.stabilityModifier > 0 ? '+' : ''}${spiritModifiers.stabilityModifier}% (spirits)`);
      }
    }
    
    // Apply population growth modifier
    if (spiritModifiers.populationGrowth && spiritModifiers.populationGrowth !== 0) {
      const growth = Math.round(nation.populationNumber * (spiritModifiers.populationGrowth / 100));
      nation.populationNumber += growth;
      nation.population = formatPopulation(nation.populationNumber);
    }

    await nation.save();
  }
  
  // Process random events (if enabled)
  const eventChance = gameState?.settings?.randomEventChance ?? 15;
  if (eventChance > 0) {
    const reloadedNations = await Nation.find({ guildId });
    const triggeredEvents = await processEventsForTurn(reloadedNations, eventChance, guildId);
    
    for (const { nation, event } of triggeredEvents) {
      changes.events.push(`${nation.name}: ${event.name} (${event.severity})`);
    }
    
    // Send event embeds to announcement channel
    if (triggeredEvents.length > 0 && gameState?.settings?.turnAnnouncementChannel && client) {
      try {
        const channel = await client.channels.fetch(gameState.settings.turnAnnouncementChannel);
        if (channel) {
          for (const eventResult of triggeredEvents) {
            await channel.send({ embeds: [eventEmbed(eventResult.nation, eventResult)] });
          }
        }
      } catch (err) {
        console.error('Failed to send event announcements:', err);
      }
    }
  }

  // Update game state
  const intervalHours = gameState?.turn?.intervalHours || 12;
  const nextProcessing = new Date(Date.now() + (intervalHours * 60 * 60 * 1000));
  
  // Advance year if enabled
  const newYear = gameState.settings?.autoAdvanceYear 
    ? gameState.year + (gameState.settings?.yearPerTurn || 1)
    : gameState.year;

  await updateGameState(guildId, {
    year: newYear,
    'turn.current': turnNumber,
    'turn.lastProcessed': new Date(),
    'turn.nextProcessing': nextProcessing,
  });

  // Audit log
  await createAuditLog({
    guildId,
    entityType: 'gamestate',
    entityName: 'Turn',
    action: 'update',
    description: `Turn ${turnNumber} processed automatically`,
    performedBy: 'system',
    performedByTag: 'Nikolai Bot',
    turn: turnNumber,
  });

  return {
    turnNumber,
    year: newYear,
    changes,
  };
}

/**
 * Format population number to display string
 */
function formatPopulation(num) {
  if (num >= 1_000_000_000) {
    return `${(num / 1_000_000_000).toFixed(1)}B`;
  } else if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1)}M`;
  } else if (num >= 1_000) {
    return `${(num / 1_000).toFixed(1)}K`;
  }
  return num.toString();
}

/**
 * Determine which military branch a unit belongs to
 */
function determineBranch(unitName) {
  const army = ['troops', 'reserves', 'tanks', 'artillery', 'armored vehicles', 'special forces'];
  const airforce = ['jets', 'jet fighters', 'bombers', 'recon planes', 'transport planes', 'helicopters'];
  const navy = ['carriers', 'submarines', 'destroyers', 'frigates', 'corvettes', 'battleships'];

  const lower = unitName.toLowerCase();
  
  if (army.some(u => lower.includes(u))) return 'army';
  if (airforce.some(u => lower.includes(u))) return 'airforce';
  if (navy.some(u => lower.includes(u))) return 'navy';
  
  return 'army'; // Default to army for custom units
}
