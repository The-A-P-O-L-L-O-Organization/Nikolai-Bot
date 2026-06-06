import { applySpiritEffects } from './spiritSystem.js';

// Battle calculation constants
const BATTLE_CONSTANTS = {
  FORCE_BASE_STRENGTH: 0.5,      // Base strength per unit
  DEFAULT_UNIT_QUALITY: 50,       // Default quality if not specified (0-100)
  DEFENDER_BONUS: 10,             // Inherent defensive advantage
  DICE_SIDES: 100,                // D100 roll
  SPIRIT_MODIFIER_MIN: 0.1,       // 10% minimum multiplier
  SPIRIT_MODIFIER_MAX: 2.0,       // 200% maximum multiplier
  SCORE_THRESHOLD_STALEMATE: 10,  // Within 10 = stalemate
  SCORE_THRESHOLD_DECISIVE: 50,   // >= 50 diff = decisive
  SCORE_THRESHOLD_MARGINAL: 10,   // < 50, >= 10 = marginal
};

/**
 * Calculate force strength from military units
 * @param {Array} forces - Array of force objects with quantity and quality
 * @returns {Number} Total force strength value
 */
export function calculateForceStrength(forces) {
  if (!Array.isArray(forces)) {
    console.warn('calculateForceStrength: forces is not an array');
    return 0;
  }
  
  let strength = 0;
  for (const force of forces) {
    if (!force || typeof force.quantity !== 'number') {
      console.warn('calculateForceStrength: Invalid force object', force);
      continue;
    }
    
    const baseStrength = force.quantity * BATTLE_CONSTANTS.FORCE_BASE_STRENGTH;
    const qualityBonus = ((force.quality ?? BATTLE_CONSTANTS.DEFAULT_UNIT_QUALITY) / 100);
    strength += baseStrength * (1 + qualityBonus);
  }
  return strength;
}

/**
 * Sum modifier values into a single number
 * @param {Array|Object} modifiers - Array of modifier objects with value property, or object with numeric values
 * @returns {Number} Sum of all modifier values
 */
export function sumModifiers(modifiers) {
  if (!modifiers) {
    return 0;
  }
  
  if (Array.isArray(modifiers)) {
    return modifiers.reduce((sum, mod) => {
      if (mod && typeof mod.value === 'number') {
        return sum + mod.value;
      }
      return sum;
    }, 0);
  }
  
  // If it's an object (like battle.modifiers), try to sum numeric values
  if (typeof modifiers === 'object') {
    return Object.values(modifiers).reduce((sum, val) => {
      return sum + (typeof val === 'number' ? val : 0);
    }, 0);
  }
  
  return 0;
}

/**
 * Apply spirit military modifier to battle modifiers
 * @param {Number} baseModifier - Base modifier sum
 * @param {Number} militaryModifier - Military effectiveness multiplier from spirits
 * @returns {Number} Modified value with spirit multiplier applied, capped at limits
 */
export function applySpiritMilitaryModifier(baseModifier, militaryModifier) {
  const clampedMilitaryMod = Math.max(
    BATTLE_CONSTANTS.SPIRIT_MODIFIER_MIN,
    Math.min(BATTLE_CONSTANTS.SPIRIT_MODIFIER_MAX, militaryModifier)
  );
  
  const modifiedValue = baseModifier * clampedMilitaryMod;
  const maxModifier = baseModifier > 0 ? baseModifier * 3 : 30;
  
  return Math.min(modifiedValue, maxModifier);
}

/**
 * Calculate final battle scores for both sides including spirit modifiers
 * @param {Object} battle - Battle document with attacker/defender setup
 * @param {Object} attackerNation - Attacker's nation document
 * @param {Object} defenderNation - Defender's nation document
 * @returns {Object} { attackerScore, defenderScore, attackerMods, defenderMods }
 */
export function calculateBattleScores(battle, attackerNation, defenderNation) {
  if (!battle) throw new Error('battle object is required');
  if (!battle.attacker || !battle.defender) throw new Error('battle must have attacker and defender');
  if (!attackerNation) throw new Error('attackerNation object is required');
  if (!defenderNation) throw new Error('defenderNation object is required');
  
  // Calculate force strengths
  const attackerStrength = calculateForceStrength(battle.attacker.forces);
  const defenderStrength = calculateForceStrength(battle.defender.forces);
  
  // Get base modifiers
  const attackerBaseMods = sumModifiers(battle.attacker.modifiers);
  const defenderBaseMods = sumModifiers(battle.defender.modifiers);
  
  // Apply spirit military modifiers
  const attackerSpiritMods = applySpiritEffects(attackerNation);
  const defenderSpiritMods = applySpiritEffects(defenderNation);
  
  const attackerModsWithSpirit = applySpiritMilitaryModifier(
    attackerBaseMods,
    attackerSpiritMods.militaryModifier
  );
  const defenderModsWithSpirit = applySpiritMilitaryModifier(
    defenderBaseMods,
    defenderSpiritMods.militaryModifier
  );
  
  // Roll dice
  const attackerRoll = Math.floor(Math.random() * BATTLE_CONSTANTS.DICE_SIDES) + 1;
  const defenderRoll = Math.floor(Math.random() * BATTLE_CONSTANTS.DICE_SIDES) + 1;
  
  // Calculate final scores
  const attackerScore = attackerStrength + attackerModsWithSpirit + attackerRoll;
  const defenderScore = defenderStrength + defenderModsWithSpirit + defenderRoll + BATTLE_CONSTANTS.DEFENDER_BONUS;
  
  return {
    attackerScore,
    defenderScore,
    attackerMods: attackerModsWithSpirit,
    defenderMods: defenderModsWithSpirit,
    attackerRoll,
    defenderRoll,
    attackerSpiritModifier: attackerSpiritMods.militaryModifier,
    defenderSpiritModifier: defenderSpiritMods.militaryModifier,
  };
}

/**
 * Determine battle victor and decisiveness from scores
 * @param {Number} attackerScore - Final attacker score
 * @param {Number} defenderScore - Final defender score
 * @returns {Object} { victor, decisiveness }
 */
export function determineBattleVictor(attackerScore, defenderScore) {
  const scoreDiff = attackerScore - defenderScore;
  let victor, decisiveness;
  
  if (Math.abs(scoreDiff) < BATTLE_CONSTANTS.SCORE_THRESHOLD_STALEMATE) {
    victor = 'draw';
    decisiveness = 'stalemate';
  } else if (scoreDiff >= BATTLE_CONSTANTS.SCORE_THRESHOLD_DECISIVE) {
    victor = 'attacker';
    decisiveness = 'decisive';
  } else if (scoreDiff >= BATTLE_CONSTANTS.SCORE_THRESHOLD_MARGINAL) {
    victor = 'attacker';
    decisiveness = 'marginal';
  } else if (scoreDiff <= -BATTLE_CONSTANTS.SCORE_THRESHOLD_DECISIVE) {
    victor = 'defender';
    decisiveness = 'decisive';
  } else {
    victor = 'defender';
    decisiveness = 'marginal';
  }
  
  return { victor, decisiveness };
}

export default {
  calculateForceStrength,
  sumModifiers,
  applySpiritMilitaryModifier,
  calculateBattleScores,
  determineBattleVictor,
};
