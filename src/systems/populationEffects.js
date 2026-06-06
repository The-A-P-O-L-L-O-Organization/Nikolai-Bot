/**
 * Calculate military population limit from total population
 * @param {Number} totalPopulation - Total nation population
 * @param {Number} populationPerUnit - Population required per military unit (default 100,000)
 * @returns {Number} Maximum total military units allowed
 */
export function calculateMilitaryPopulationLimit(totalPopulation, populationPerUnit = 100000) {
  // Can field up to 25% of population as military
  const militaryCapacity = totalPopulation * 0.25;
  return Math.floor(militaryCapacity / populationPerUnit);
}

/**
 * Calculate production speed modifier from population
 * @param {Number} totalPopulation - Total nation population
 * @param {Number} optimalPopulation - Population at which modifier = 1.0 (default 100M)
 * @returns {Number} Production speed multiplier
 */
export function calculateProductionModifierFromPopulation(totalPopulation, optimalPopulation = 100000000) {
  // Power law: modifier = (population / optimal)^0.8
  // Prevents single small nation from out-producing empires
  return Math.pow(totalPopulation / optimalPopulation, 0.8);
}

/**
 * Calculate economic output modifier from population
 * @param {Number} totalPopulation - Total nation population
 * @param {Number} referencePopulation - Population at which modifier = 1.0 (default 50M)
 * @returns {Number} Income multiplier
 */
export function calculateIncomeModifierFromPopulation(totalPopulation, referencePopulation = 50000000) {
  // Power law: modifier = (population / reference)^0.8
  return Math.pow(totalPopulation / referencePopulation, 0.8);
}

/**
 * Get population crisis multiplier for below-threshold populations
 * @param {Number} totalPopulation - Total nation population
 * @returns {Object} { stabilityModifier, productionModifier, incomeModifier }
 */
export function getPopulationCrisisModifier(totalPopulation) {
  const modifiers = {
    stabilityModifier: 0,    // Flat change
    productionModifier: 1,   // Multiplier
    incomeModifier: 1,       // Multiplier
  };
  
  if (totalPopulation < 10000000) {
    // Below 10M: severe crisis
    modifiers.stabilityModifier = -10;
    modifiers.productionModifier = 0.9;  // -10%
    modifiers.incomeModifier = 0.9;      // -10%
  } else if (totalPopulation < 50000000) {
    // Below 50M: moderate crisis
    modifiers.stabilityModifier = -5;
    modifiers.productionModifier = 0.95; // -5%
    modifiers.incomeModifier = 0.95;     // -5%
  }
  
  if (totalPopulation > 1000000000) {
    // Above 1B: governance challenges
    modifiers.stabilityModifier = -5;    // Harder to govern
  }
  
  return modifiers;
}

/**
 * Check if nation is in population crisis
 * @param {Number} totalPopulation - Total nation population
 * @returns {boolean} True if in crisis
 */
export function isInPopulationCrisis(totalPopulation) {
  return totalPopulation < 50000000;
}

/**
 * Get population status description
 * @param {Number} totalPopulation - Total nation population
 * @returns {String} Human-readable status
 */
export function getPopulationStatus(totalPopulation) {
  if (totalPopulation < 10000000) {
    return '🔴 Critical (Below 10M)';
  } else if (totalPopulation < 50000000) {
    return '🟡 Low (Below 50M)';
  } else if (totalPopulation < 100000000) {
    return '🟢 Moderate (50M-100M)';
  } else if (totalPopulation < 500000000) {
    return '🟢 Healthy (100M-500M)';
  } else if (totalPopulation < 1000000000) {
    return '🔵 High (500M-1B)';
  } else {
    return '🟣 Massive (1B+)';
  }
}

export default {
  calculateMilitaryPopulationLimit,
  calculateProductionModifierFromPopulation,
  calculateIncomeModifierFromPopulation,
  getPopulationCrisisModifier,
  isInPopulationCrisis,
  getPopulationStatus,
};
