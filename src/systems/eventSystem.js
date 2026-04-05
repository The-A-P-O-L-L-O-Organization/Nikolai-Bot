import Nation from '../database/models/Nation.js';
import Event from '../database/models/Event.js';
import { createAuditLog } from '../database/models/AuditLog.js';
import { getGameState } from '../database/models/GameState.js';
import { formatNumber } from '../utils/formatters.js';
import { createEmbed } from '../utils/embeds.js';
import config from '../config.js';

/**
 * Trigger random events for a nation based on probability
 * @param {Object} nation - The nation to potentially trigger events for
 * @param {number} eventChance - Percentage chance (0-100) of an event occurring
 * @returns {Object|null} The triggered event and its results, or null
 */
export async function triggerRandomEvent(nation, eventChance = 15) {
  // Check if event should trigger
  if (Math.random() * 100 > eventChance) {
    return null;
  }

  // Get all available events (guild-specific + global defaults)
  const allEvents = await Event.find({
    $or: [
      { guildId: nation.guildId },
      { guildId: null, isDefault: true }
    ]
  });
  if (allEvents.length === 0) return null;

  // Filter events based on conditions
  const eligibleEvents = allEvents.filter(event => {
    if (!event.conditions) return true;
    
    const cond = event.conditions;
    
    // Check stability conditions
    if (cond.minStability !== undefined && nation.stability < cond.minStability) return false;
    if (cond.maxStability !== undefined && nation.stability > cond.maxStability) return false;
    
    // Check population (using populationNumber)
    if (cond.minPopulation !== undefined && nation.populationNumber < cond.minPopulation) return false;
    
    // Check war status - would need to query Wars collection
    // For now, skip this condition check
    
    // Check resource
    if (cond.hasResource) {
      const hasIt = nation.resources?.has(cond.hasResource) && nation.resources.get(cond.hasResource) > 0;
      if (!hasIt) return false;
    }
    
    return true;
  });

  if (eligibleEvents.length === 0) return null;

  // Weighted random selection
  const totalWeight = eligibleEvents.reduce((sum, e) => sum + (e.weight || 1), 0);
  let random = Math.random() * totalWeight;
  
  let selectedEvent = eligibleEvents[0];
  for (const event of eligibleEvents) {
    random -= (event.weight || 1);
    if (random <= 0) {
      selectedEvent = event;
      break;
    }
  }

  // Apply event effects
  const results = await applyEventEffects(nation, selectedEvent);

  return {
    event: selectedEvent,
    results,
  };
}

/**
 * Apply event effects to a nation
 */
async function applyEventEffects(nation, event) {
  const results = [];

  for (const effect of event.effects) {
    switch (effect.type) {
      case 'currency': {
        const currencyName = effect.target === 'primary' 
          ? nation.economy.primaryCurrency || 'Dollars'
          : effect.target;
        
        if (!nation.economy.currencies) nation.economy.currencies = new Map();
        const current = nation.economy.currencies.get(currencyName) || 0;
        
        let change;
        if (effect.percentage) {
          change = Math.round(current * (effect.value / 100));
        } else {
          change = effect.value;
        }
        
        nation.economy.currencies.set(currencyName, current + change);
        results.push({
          type: 'currency',
          target: currencyName,
          oldValue: current,
          newValue: current + change,
          change,
          description: effect.description,
        });
        break;
      }

      case 'resource': {
        if (!nation.resources) nation.resources = new Map();
        const current = nation.resources.get(effect.target) || 0;
        
        let change;
        if (effect.percentage) {
          change = Math.round(current * (effect.value / 100));
        } else {
          change = effect.value;
        }
        
        // Don't go below 0
        const newValue = Math.max(0, current + change);
        nation.resources.set(effect.target, newValue);
        results.push({
          type: 'resource',
          target: effect.target,
          oldValue: current,
          newValue,
          change: newValue - current,
          description: effect.description,
        });
        break;
      }

      case 'stability': {
        const oldStability = nation.stability;
        let change = effect.value;
        if (effect.percentage) {
          change = Math.round(nation.stability * (effect.value / 100));
        }
        
        // Clamp between 0 and 100
        nation.stability = Math.max(0, Math.min(100, nation.stability + change));
        results.push({
          type: 'stability',
          oldValue: oldStability,
          newValue: nation.stability,
          change: nation.stability - oldStability,
          description: effect.description,
        });
        break;
      }

      case 'population': {
        const oldPop = nation.populationNumber;
        let change;
        if (effect.percentage) {
          change = Math.round(nation.populationNumber * (effect.value / 100));
        } else {
          change = effect.value;
        }
        
        nation.populationNumber = Math.max(0, nation.populationNumber + change);
        // Update display string
        nation.population = formatPopulation(nation.populationNumber);
        results.push({
          type: 'population',
          oldValue: oldPop,
          newValue: nation.populationNumber,
          change,
          description: effect.description,
        });
        break;
      }

      case 'military': {
        // Handle military unit changes
        results.push({
          type: 'military',
          target: effect.target,
          description: effect.description,
        });
        break;
      }

      case 'custom': {
        // Custom effects are just for display
        results.push({
          type: 'custom',
          description: effect.description,
        });
        
        // Handle special custom effects
        if (effect.description?.includes('Research progress')) {
          if (nation.research.current && nation.research.turnsRemaining > 1) {
            nation.research.turnsRemaining--;
            results[results.length - 1].applied = true;
          }
        }
        break;
      }
    }
  }

  return results;
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
 * Create an embed for displaying an event
 */
export function eventEmbed(nation, eventResult) {
  const { event, results } = eventResult;
  
  const severityColors = {
    positive: config.colors.success,
    neutral: config.colors.primary,
    negative: config.colors.warning,
    catastrophic: config.colors.error,
  };

  const embed = createEmbed({
    title: `Event: ${event.name}`,
    description: event.description,
    color: severityColors[event.severity] || config.colors.primary,
  });

  embed.addFields({
    name: 'Nation Affected',
    value: nation.name,
    inline: true,
  });

  embed.addFields({
    name: 'Severity',
    value: event.severity.charAt(0).toUpperCase() + event.severity.slice(1),
    inline: true,
  });

  // List effects
  if (results.length > 0) {
    const effectsText = results.map(r => {
      if (r.description) return `• ${r.description}`;
      if (r.change !== undefined) {
        const changeStr = r.change >= 0 ? `+${formatNumber(r.change)}` : formatNumber(r.change);
        return `• ${r.target || r.type}: ${changeStr}`;
      }
      return `• ${r.type}`;
    }).join('\n');

    embed.addFields({
      name: 'Effects',
      value: effectsText,
      inline: false,
    });
  }

  return embed;
}

/**
 * Process events for all nations during a turn
 * @param {Array} nations - Array of nation documents
 * @param {number} eventChance - Percentage chance per nation
 * @param {string} guildId - The guild ID for these nations
 * @returns {Array} Array of triggered events
 */
export async function processEventsForTurn(nations, eventChance = 15, guildId = null) {
  const triggeredEvents = [];
  const effectiveGuildId = guildId || nations[0]?.guildId;
  const gameState = effectiveGuildId ? await getGameState(effectiveGuildId) : null;

  for (const nation of nations) {
    const result = await triggerRandomEvent(nation, eventChance);
    
    if (result) {
      await nation.save();
      
      // Audit log
      await createAuditLog({
        guildId: nation.guildId,
        entityType: 'nation',
        entityId: nation._id,
        entityName: nation.name,
        action: 'event',
        description: `Random event **${result.event.name}** (${result.event.severity}) triggered`,
        performedBy: 'system',
        performedByTag: 'Random Event System',
        turn: gameState?.turn?.current || 0,
      });

      triggeredEvents.push({
        nation,
        ...result,
      });
    }
  }

  return triggeredEvents;
}

export default {
  triggerRandomEvent,
  processEventsForTurn,
  eventEmbed,
};
