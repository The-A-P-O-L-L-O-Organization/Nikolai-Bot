/**
 * Economic crisis type definitions
 */
export const CRISIS_TYPES = {
  recession: {
    name: 'Recession',
    emoji: '📉',
    duration: 3,
    impact: -0.30,      // -30% economy
    severity: 'moderate',
  },
  depression: {
    name: 'Depression',
    emoji: '💔',
    duration: 5,
    impact: -0.50,      // -50% economy
    severity: 'severe',
  },
  hyperinflation: {
    name: 'Hyperinflation',
    emoji: '🔥',
    duration: 4,
    impact: -0.40,      // -40% economy
    severity: 'moderate',
  },
  currencyCollapse: {
    name: 'Currency Collapse',
    emoji: '💥',
    duration: 6,
    impact: -0.60,      // -60% economy
    severity: 'severe',
  },
  resourceShortage: {
    name: 'Resource Shortage',
    emoji: '⚠️',
    duration: 3,
    impact: -0.25,      // -25% economy
    severity: 'low',
  },
};

/**
 * Recovery action definitions
 */
export const RECOVERY_ACTIONS = {
  austerity: {
    name: 'Austerity Measures',
    description: 'Cut spending to stabilize economy',
    militaryCost: 0.20,        // -20% military upkeep
    treasuryCost: 0.15,        // -15% of treasury spent
    recoveryBoost: 0.15,       // +15% recovery progress
    turnsTillEffect: 1,
  },
  investment: {
    name: 'Economic Investment',
    description: 'Invest in economy recovery',
    incomeLoss: 0.10,          // -10% income for 1 turn
    recoveryBoost: 0.30,       // +30% recovery progress
    turnsTillEffect: 2,
  },
  externalAid: {
    name: 'External Aid',
    description: 'Accept international loan',
    loanAmount: 10000,         // Loan amount
    interestRate: 0.10,        // 10% interest
    recoveryBoost: 0.25,       // +25% recovery progress
    turnsTillEffect: 1,
  },
};

/**
 * Calculate crisis impact on nation
 * @param {Object} crisisData - Crisis object from CRISIS_TYPES
 * @param {Number} baseIncome - Nation's base income
 * @returns {Object} { incomeModifier, stabilityChange, populationGrowthModifier }
 */
export function calculateCrisisImpact(crisisData, baseIncome) {
  return {
    incomeModifier: crisisData.impact,
    stabilityChange: -15,
    populationGrowthModifier: crisisData.severity === 'severe' ? -0.10 : 0,
  };
}

/**
 * Get current crisis phase (1-3)
 * @param {Number} turnsSinceTrigger - Turns elapsed since crisis started
 * @param {Number} crisisDuration - Total duration of crisis
 * @returns {Number} Current phase (1, 2, or 3)
 */
export function getCrisisPhase(turnsSinceTrigger, crisisDuration) {
  const phaseLength = Math.ceil(crisisDuration / 3);
  if (turnsSinceTrigger < phaseLength) return 1;
  if (turnsSinceTrigger < phaseLength * 2) return 2;
  return 3;
}

/**
 * Calculate recovery progress
 * @param {Number} baseRecovery - Base recovery per turn (0-1)
 * @param {String} recoveryAction - Recovery action taken (or null)
 * @returns {Number} Recovery progress added this turn
 */
export function calculateRecoveryProgress(baseRecovery = 0.10, recoveryAction = null) {
  let progress = baseRecovery;
  
  if (recoveryAction && RECOVERY_ACTIONS[recoveryAction]) {
    const action = RECOVERY_ACTIONS[recoveryAction];
    progress += action.recoveryBoost;
  }
  
  // Cap at 1.0 (100% recovered)
  return Math.min(1.0, progress);
}

/**
 * Check if crisis is resolved
 * @param {Number} recoveryProgress - Recovery progress (0-1)
 * @param {Number} turnsSinceTrigger - Turns since crisis started
 * @param {Number} crisisDuration - Crisis duration
 * @returns {boolean} True if crisis is resolved
 */
export function isCrisisResolved(recoveryProgress, turnsSinceTrigger, crisisDuration) {
  // Resolved if recovered 100% OR duration exceeded
  return recoveryProgress >= 1.0 || turnsSinceTrigger > crisisDuration + 2;
}

/**
 * Get crisis status text
 * @param {Object} crisis - Active crisis object
 * @returns {String} Human-readable status
 */
export function getCrisisStatus(crisis) {
  const phase = getCrisisPhase(crisis.turnsSinceTrigger, crisis.duration);
  const recovered = Math.round(crisis.recoveryProgress * 100);
  return `${CRISIS_TYPES[crisis.type].emoji} ${CRISIS_TYPES[crisis.type].name} - Phase ${phase}/3 (${recovered}% recovered)`;
}

/**
 * Check for cascading crisis effects
 * @param {Object} crisis - Active crisis
 * @param {Number} population - Nation population
 * @returns {Object} { populationGrowthModifier, chanceOfRevolution, cascadeDescription }
 */
export function calculateCrisisCascades(crisis, population) {
  const cascades = {
    populationGrowthModifier: 1,
    chanceOfRevolution: 0,
    cascadeDescription: null,
  };
  
  // If not recovering well, population flees
  if (crisis.recoveryProgress < 0.3) {
    cascades.populationGrowthModifier = 0.8; // -20% growth (people fleeing)
    cascades.cascadeDescription = 'Population is fleeing due to economic hardship';
  }
  
  // If in crisis for 2+ turns with low recovery, revolution risk
  if (crisis.turnsSinceTrigger >= 2 && crisis.recoveryProgress < 0.4) {
    cascades.chanceOfRevolution = 15; // 15% chance per turn
    cascades.cascadeDescription = 'Risk of revolution or coup attempt';
  }
  
  return cascades;
}

export default {
  CRISIS_TYPES,
  RECOVERY_ACTIONS,
  calculateCrisisImpact,
  getCrisisPhase,
  calculateRecoveryProgress,
  isCrisisResolved,
  getCrisisStatus,
  calculateCrisisCascades,
};
