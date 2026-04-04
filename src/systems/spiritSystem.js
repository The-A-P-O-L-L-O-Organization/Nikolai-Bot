/**
 * Spirit Effects System
 * 
 * Processes national spirits and calculates their mechanical effects
 * during turn processing.
 */

/**
 * Apply spirit effects to calculate modifiers for a nation
 * @param {Object} nation - The nation document
 * @returns {Object} Calculated modifiers
 */
export function applySpiritEffects(nation) {
  const modifiers = {
    incomeModifier: 1,          // Multiplier for currency income
    productionSpeed: 1,         // Multiplier for production turns
    researchSpeed: 1,           // Multiplier for research turns
    stabilityModifier: 0,       // Flat change to stability per turn
    militaryModifier: 1,        // Combat effectiveness (for future use)
    diplomacyBonus: 0,          // Diplomacy bonuses (for future use)
    maintenanceModifier: 1,     // Multiplier for maintenance costs
    populationGrowth: 0,        // Percentage population growth per turn
    resourceModifiers: {},      // Per-resource income multipliers
  };

  if (!nation.spirits || nation.spirits.length === 0) {
    return modifiers;
  }

  for (const spirit of nation.spirits) {
    if (!spirit.effects || spirit.effects.length === 0) continue;

    for (const effect of spirit.effects) {
      switch (effect.type) {
        case 'income_modifier':
          // Value is percentage (e.g., 10 = +10%)
          modifiers.incomeModifier *= (1 + (effect.value || 0) / 100);
          break;

        case 'production_speed':
          // Value is percentage (e.g., 20 = 20% faster)
          modifiers.productionSpeed *= (1 + (effect.value || 0) / 100);
          break;

        case 'research_speed':
          // Value is percentage (e.g., 15 = 15% faster)
          modifiers.researchSpeed *= (1 + (effect.value || 0) / 100);
          break;

        case 'stability_modifier':
          // Flat value per turn
          modifiers.stabilityModifier += (effect.value || 0);
          break;

        case 'military_modifier':
          // Combat effectiveness multiplier
          modifiers.militaryModifier *= (1 + (effect.value || 0) / 100);
          break;

        case 'diplomacy_bonus':
          // Flat diplomacy bonus
          modifiers.diplomacyBonus += (effect.value || 0);
          break;

        case 'resource_income':
          // Per-resource modifier
          if (effect.target) {
            const currentMod = modifiers.resourceModifiers[effect.target] || 1;
            modifiers.resourceModifiers[effect.target] = currentMod * (1 + (effect.value || 0) / 100);
          }
          break;

        case 'maintenance_modifier':
          // Maintenance cost multiplier (lower = cheaper)
          modifiers.maintenanceModifier *= (1 + (effect.value || 0) / 100);
          break;

        case 'population_growth':
          // Percentage growth per turn
          modifiers.populationGrowth += (effect.value || 0);
          break;

        case 'custom':
          // Custom effects handled elsewhere or just for flavor
          break;
      }
    }
  }

  return modifiers;
}

/**
 * Get a summary of spirit effects for display
 * @param {Object} nation - The nation document
 * @returns {Array} Array of effect descriptions
 */
export function getSpiritEffectsSummary(nation) {
  const modifiers = applySpiritEffects(nation);
  const summary = [];

  if (modifiers.incomeModifier !== 1) {
    const pct = Math.round((modifiers.incomeModifier - 1) * 100);
    summary.push(`Income: ${pct >= 0 ? '+' : ''}${pct}%`);
  }

  if (modifiers.productionSpeed !== 1) {
    const pct = Math.round((modifiers.productionSpeed - 1) * 100);
    summary.push(`Production Speed: ${pct >= 0 ? '+' : ''}${pct}%`);
  }

  if (modifiers.researchSpeed !== 1) {
    const pct = Math.round((modifiers.researchSpeed - 1) * 100);
    summary.push(`Research Speed: ${pct >= 0 ? '+' : ''}${pct}%`);
  }

  if (modifiers.stabilityModifier !== 0) {
    summary.push(`Stability/Turn: ${modifiers.stabilityModifier >= 0 ? '+' : ''}${modifiers.stabilityModifier}`);
  }

  if (modifiers.militaryModifier !== 1) {
    const pct = Math.round((modifiers.militaryModifier - 1) * 100);
    summary.push(`Military Effectiveness: ${pct >= 0 ? '+' : ''}${pct}%`);
  }

  if (modifiers.maintenanceModifier !== 1) {
    const pct = Math.round((modifiers.maintenanceModifier - 1) * 100);
    summary.push(`Maintenance Costs: ${pct >= 0 ? '+' : ''}${pct}%`);
  }

  if (modifiers.populationGrowth !== 0) {
    summary.push(`Population Growth: ${modifiers.populationGrowth >= 0 ? '+' : ''}${modifiers.populationGrowth}%/turn`);
  }

  for (const [resource, mod] of Object.entries(modifiers.resourceModifiers)) {
    if (mod !== 1) {
      const pct = Math.round((mod - 1) * 100);
      summary.push(`${resource} Income: ${pct >= 0 ? '+' : ''}${pct}%`);
    }
  }

  return summary;
}

/**
 * Validate spirit effect structure
 * @param {Object} effect - Effect object to validate
 * @returns {boolean} Whether the effect is valid
 */
export function validateSpiritEffect(effect) {
  const validTypes = [
    'income_modifier',
    'production_speed',
    'research_speed',
    'stability_modifier',
    'military_modifier',
    'diplomacy_bonus',
    'resource_income',
    'maintenance_modifier',
    'population_growth',
    'custom',
  ];

  if (!effect.type || !validTypes.includes(effect.type)) {
    return false;
  }

  // Resource income requires a target
  if (effect.type === 'resource_income' && !effect.target) {
    return false;
  }

  return true;
}

export default {
  applySpiritEffects,
  getSpiritEffectsSummary,
  validateSpiritEffect,
};
