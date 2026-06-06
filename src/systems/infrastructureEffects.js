/**
 * Infrastructure type definitions and their effects
 */
export const INFRASTRUCTURE_TYPES = {
  factory: {
    name: 'Factory',
    emoji: '🏭',
    productionBonus: 0.05,        // +5% per factory
    researchBonus: 0.03,          // +3% per factory
    maxCount: 10,
    maintenanceCost: 5000,
  },
  port: {
    name: 'Port',
    emoji: '⚓',
    tradeBonus: 0.10,             // +10% trade per port
    incomeBonus: 0.02,            // +2% economy per port
    maxCount: 5,
    maintenanceCost: 4000,
  },
  researchLab: {
    name: 'Research Lab',
    emoji: '🔬',
    researchBonus: 0.08,          // +8% per lab
    discoveryBonus: 0.05,         // +5% tech discovery
    maxCount: 8,
    maintenanceCost: 6000,
  },
  militaryBase: {
    name: 'Military Base',
    emoji: '🎖️',
    militaryProductionBonus: 0.10, // +10% unit production
    militaryEffectiveness: 0.03,   // +3% military bonus
    maxCount: 6,
    maintenanceCost: 7000,
  },
  hospital: {
    name: 'Hospital',
    emoji: '🏥',
    populationBonus: 0.05,        // +5% population growth
    casualtyReduction: 0.03,      // -3% casualty rate
    maxCount: 4,
    maintenanceCost: 3000,
  },
  energyPlant: {
    name: 'Energy Plant',
    emoji: '⚡',
    productionBonus: 0.15,        // +15% production with 1-3 plants
    maxCount: 3,
    maintenanceCost: 8000,
  },
  defensiveGrid: {
    name: 'Defensive Grid',
    emoji: '🛡️',
    defenseBonus: 0.02,           // +2% defense per grid
    maxCount: 10,
    maintenanceCost: 5500,
  },
};

/**
 * Calculate total infrastructure effectiveness for a nation
 * @param {Array} infrastructureList - List of infrastructure documents
 * @returns {Object} Aggregated bonuses
 */
export function calculateInfrastructureEffects(infrastructureList) {
  const effects = {
    productionSpeed: 1,
    researchSpeed: 1,
    militaryProduction: 1,
    militaryEffectiveness: 1,
    incomeModifier: 1,
    tradeBonus: 1,
    populationGrowth: 1,
    casualtyReduction: 1,
    defenseBonus: 1,
  };
  
  if (!infrastructureList || infrastructureList.length === 0) {
    return effects;
  }
  
  // Group by type and apply effectiveness
  const typeCount = {};
  for (const infra of infrastructureList) {
    const type = infra.type;
    const typeData = INFRASTRUCTURE_TYPES[type];
    if (!typeData) continue;
    
    if (!typeCount[type]) typeCount[type] = [];
    typeCount[type].push(infra);
  }
  
  // Apply bonuses per type
  for (const [type, items] of Object.entries(typeCount)) {
    const typeData = INFRASTRUCTURE_TYPES[type];
    
    // Calculate average condition for this type
    const avgCondition = items.reduce((sum, i) => sum + (i.condition || 100), 0) / items.length / 100;
    
    switch (type) {
      case 'factory':
        effects.productionSpeed *= (1 + (typeData.productionBonus * items.length * avgCondition));
        effects.researchSpeed *= (1 + (typeData.researchBonus * items.length * avgCondition));
        break;
      case 'port':
        effects.tradeBonus *= (1 + (typeData.tradeBonus * items.length * avgCondition));
        effects.incomeModifier *= (1 + (typeData.incomeBonus * items.length * avgCondition));
        break;
      case 'researchLab':
        effects.researchSpeed *= (1 + (typeData.researchBonus * items.length * avgCondition));
        break;
      case 'militaryBase':
        effects.militaryProduction *= (1 + (typeData.militaryProductionBonus * items.length * avgCondition));
        effects.militaryEffectiveness *= (1 + (typeData.militaryEffectiveness * items.length * avgCondition));
        break;
      case 'hospital':
        effects.populationGrowth *= (1 + (typeData.populationBonus * items.length * avgCondition));
        effects.casualtyReduction *= (1 - (typeData.casualtyReduction * items.length * avgCondition));
        break;
      case 'energyPlant':
        effects.productionSpeed *= (1 + (typeData.productionBonus * Math.min(items.length, typeData.maxCount) * avgCondition));
        break;
      case 'defensiveGrid':
        effects.defenseBonus *= (1 + (typeData.defenseBonus * items.length * avgCondition));
        break;
    }
  }
  
  return effects;
}

/**
 * Calculate maintenance cost for infrastructure
 * @param {String} type - Infrastructure type key
 * @param {Number} nationPopulation - Nation population for scaling
 * @returns {Number} Maintenance cost in primary currency
 */
export function calculateMaintenanceCost(type, nationPopulation) {
  const typeData = INFRASTRUCTURE_TYPES[type];
  if (!typeData) return 0;
  
  // Scale maintenance with population (larger nations pay more)
  const populationFactor = Math.pow(nationPopulation / 50000000, 0.6);
  return Math.ceil(typeData.maintenanceCost * populationFactor);
}

/**
 * Degrade infrastructure condition over time
 * @param {Object} infrastructure - Infrastructure document
 * @param {Number} degradationRate - Rate per turn (default 1 = 1% per turn)
 * @returns {Number} New condition percentage
 */
export function degradeInfrastructure(infrastructure, degradationRate = 1) {
  const newCondition = Math.max(0, (infrastructure.condition || 100) - degradationRate);
  return newCondition;
}

export default {
  INFRASTRUCTURE_TYPES,
  calculateInfrastructureEffects,
  calculateMaintenanceCost,
  degradeInfrastructure,
};
