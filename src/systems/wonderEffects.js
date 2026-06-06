/**
 * Project/Wonder type definitions and their completion effects
 */
export const WONDER_TYPES = {
  greatLibrary: {
    name: 'Great Library',
    emoji: '📚',
    primaryBonus: {
      researchSpeed: 0.20,        // +20% research speed
      technologyDiscount: 0.10,   // -10% to tech requirements
      bonusResearchProjects: true, // Every 5 turns can do bonus research
    },
    secondaryBonus: {
      researchSpeed: 0.10,        // +10% for secondary completion
    },
  },
  monument: {
    name: 'Monument',
    emoji: '🗿',
    primaryBonus: {
      stability: 15,              // +15 stability
      populationGrowth: 0.10,     // +10% population growth
      globalReputation: 5,        // +5% global reputation
    },
    secondaryBonus: {
      stability: 7,               // +7 stability for secondary
    },
  },
  spaceProgram: {
    name: 'Space Program',
    emoji: '🚀',
    primaryBonus: {
      advancedTechUnlock: true,   // Unlock space-age techs
      lateGameResearchBonus: 0.30, // +30% late-game research
    },
    secondaryBonus: {
      lateGameResearchBonus: 0.15, // +15% for secondary
    },
  },
  economicCenter: {
    name: 'Economic Center',
    emoji: '💼',
    primaryBonus: {
      incomeModifier: 0.25,       // +25% economy income
      tradeEffectiveness: 0.10,   // +10% trade routes
      economicWarfareUnlock: true, // Enable economic abilities
    },
    secondaryBonus: {
      incomeModifier: 0.12,       // +12% for secondary
    },
  },
  militaryComplex: {
    name: 'Military Complex',
    emoji: '⚔️',
    primaryBonus: {
      militaryProduction: 0.20,   // +20% military production
      militaryEffectiveness: 0.10, // +10% military effectiveness
      advancedDoctrines: true,    // Unlock advanced doctrines
    },
    secondaryBonus: {
      militaryProduction: 0.10,   // +10% for secondary
    },
  },
  medicalMegaCenter: {
    name: 'Medical Mega-Center',
    emoji: '🏥',
    primaryBonus: {
      populationGrowth: 0.25,     // +25% population growth
      casualtyReduction: 0.20,    // -20% casualty rates
      populationControl: true,    // Can set target population
    },
    secondaryBonus: {
      populationGrowth: 0.12,     // +12% for secondary
    },
  },
  energyMegastructure: {
    name: 'Energy Megastructure',
    emoji: '⚡',
    primaryBonus: {
      productionSpeed: 0.40,      // +40% production speed
      researchSpeed: 0.20,        // +20% research speed
      highTechUnlock: true,       // Unlock high-tech research
    },
    secondaryBonus: {
      productionSpeed: 0.20,      // +20% for secondary
    },
  },
};

/**
 * Calculate total wonder/project effects for a nation
 * @param {Array} completedProjects - List of completed project documents
 * @returns {Object} Aggregated bonuses
 */
export function calculateWonderEffects(completedProjects) {
  const effects = {
    researchSpeed: 1,
    technologyDiscount: 1,
    stability: 0,
    populationGrowth: 1,
    globalReputation: 0,
    incomeModifier: 1,
    tradeEffectiveness: 1,
    militaryProduction: 1,
    militaryEffectiveness: 1,
    casualtyReduction: 1,
    productionSpeed: 1,
    // Unlock flags
    bonusResearchProjects: false,
    advancedTechUnlock: false,
    economicWarfareUnlock: false,
    advancedDoctrines: false,
    populationControl: false,
    highTechUnlock: false,
  };
  
  if (!completedProjects || completedProjects.length === 0) {
    return effects;
  }
  
  for (const project of completedProjects) {
    const wonderType = WONDER_TYPES[project.type];
    if (!wonderType) continue;
    
    // Get bonus based on whether this was primary or secondary completion
    const bonusSet = project.primaryCompletion ? wonderType.primaryBonus : wonderType.secondaryBonus;
    
    // Apply multiplicative bonuses
    if (bonusSet.researchSpeed) {
      effects.researchSpeed *= (1 + bonusSet.researchSpeed);
    }
    if (bonusSet.lateGameResearchBonus) {
      effects.researchSpeed *= (1 + bonusSet.lateGameResearchBonus);
    }
    if (bonusSet.technologyDiscount) {
      effects.technologyDiscount *= (1 - bonusSet.technologyDiscount);
    }
    if (bonusSet.incomeModifier) {
      effects.incomeModifier *= (1 + bonusSet.incomeModifier);
    }
    if (bonusSet.tradeEffectiveness) {
      effects.tradeEffectiveness *= (1 + bonusSet.tradeEffectiveness);
    }
    if (bonusSet.militaryProduction) {
      effects.militaryProduction *= (1 + bonusSet.militaryProduction);
    }
    if (bonusSet.militaryEffectiveness) {
      effects.militaryEffectiveness *= (1 + bonusSet.militaryEffectiveness);
    }
    if (bonusSet.casualtyReduction) {
      effects.casualtyReduction *= (1 - bonusSet.casualtyReduction);
    }
    if (bonusSet.productionSpeed) {
      effects.productionSpeed *= (1 + bonusSet.productionSpeed);
    }
    if (bonusSet.populationGrowth) {
      effects.populationGrowth *= (1 + bonusSet.populationGrowth);
    }
    
    // Apply additive bonuses
    if (bonusSet.stability) {
      effects.stability += bonusSet.stability;
    }
    if (bonusSet.globalReputation) {
      effects.globalReputation += bonusSet.globalReputation;
    }
    
    // Apply unlock flags
    if (bonusSet.bonusResearchProjects) {
      effects.bonusResearchProjects = true;
    }
    if (bonusSet.advancedTechUnlock) {
      effects.advancedTechUnlock = true;
    }
    if (bonusSet.economicWarfareUnlock) {
      effects.economicWarfareUnlock = true;
    }
    if (bonusSet.advancedDoctrines) {
      effects.advancedDoctrines = true;
    }
    if (bonusSet.populationControl) {
      effects.populationControl = true;
    }
    if (bonusSet.highTechUnlock) {
      effects.highTechUnlock = true;
    }
  }
  
  return effects;
}

/**
 * Get wonder display information
 * @param {String} wonderType - Key from WONDER_TYPES
 * @returns {Object} Display info with name, emoji, etc.
 */
export function getWonderInfo(wonderType) {
  return WONDER_TYPES[wonderType] || null;
}

/**
 * Format wonder effects for display
 * @param {Object} effects - Effects object from calculateWonderEffects
 * @returns {Array} Array of effect descriptions
 */
export function formatWonderEffects(effects) {
  const descriptions = [];
  
  if (effects.researchSpeed > 1) {
    descriptions.push(`📚 Research Speed: +${Math.round((effects.researchSpeed - 1) * 100)}%`);
  }
  if (effects.incomeModifier > 1) {
    descriptions.push(`💰 Economy: +${Math.round((effects.incomeModifier - 1) * 100)}%`);
  }
  if (effects.militaryProduction > 1) {
    descriptions.push(`⚔️ Military Production: +${Math.round((effects.militaryProduction - 1) * 100)}%`);
  }
  if (effects.populationGrowth > 1) {
    descriptions.push(`👥 Population Growth: +${Math.round((effects.populationGrowth - 1) * 100)}%`);
  }
  if (effects.productionSpeed > 1) {
    descriptions.push(`🏭 Production: +${Math.round((effects.productionSpeed - 1) * 100)}%`);
  }
  if (effects.stability > 0) {
    descriptions.push(`🟢 Stability: +${effects.stability}`);
  }
  if (effects.globalReputation > 0) {
    descriptions.push(`🌍 Global Reputation: +${effects.globalReputation}%`);
  }
  
  return descriptions;
}

export default {
  WONDER_TYPES,
  calculateWonderEffects,
  getWonderInfo,
  formatWonderEffects,
};
