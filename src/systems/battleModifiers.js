import { applySpiritEffects } from './spiritSystem.js';

/**
 * Calculate force strength from military units
 * @param {Array} forces - Array of force objects with quantity and quality
 * @returns {Number} Total force strength value
 */
export function calculateForceStrength(forces) {
  let strength = 0;
  for (const force of forces) {
    const baseStrength = force.quantity * 0.5; // Base: 0.5 per unit
    const qualityBonus = (force.quality || 50) / 100; // Quality from 0-100 scales 0-1
    strength += baseStrength * (1 + qualityBonus);
  }
  return strength;
}

/**
 * Sum modifier values into a single number
 * @param {Array} modifiers - Array of modifier objects with value property
 * @returns {Number} Sum of all modifier values
 */
export function sumModifiers(modifiers) {
  if (!modifiers || modifiers.length === 0) return 0;
  return modifiers.reduce((sum, mod) => sum + (mod.value || 0), 0);
}

/**
 * Apply spirit military modifier to battle modifiers
 * @param {Number} baseModifier - Base modifier sum
 * @param {Number} militaryModifier - Military effectiveness multiplier from spirits
 * @returns {Number} Modified value with spirit multiplier applied, capped at limits
 */
export function applySpiritMilitaryModifier(baseModifier, militaryModifier) {
  // Clamp military modifier to 0.1-2.0 range (10% - 200%)
  const clampedMilitaryMod = Math.max(0.1, Math.min(2.0, militaryModifier));
  
  // Calculate modified value with capping at +200% total
  const modifiedValue = baseModifier * clampedMilitaryMod;
  const maxModifier = baseModifier > 0 ? baseModifier * 3 : 30; // Allow up to 300% of base or 30 max
  
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
  const attackerRoll = Math.floor(Math.random() * 100) + 1;
  const defenderRoll = Math.floor(Math.random() * 100) + 1;
  
  // Calculate final scores
  const attackerScore = attackerStrength + attackerModsWithSpirit + attackerRoll;
  const defenderScore = defenderStrength + defenderModsWithSpirit + defenderRoll + 10; // Defender bonus
  
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
  
  if (Math.abs(scoreDiff) < 10) {
    victor = 'draw';
    decisiveness = 'stalemate';
  } else if (scoreDiff >= 50) {
    victor = 'attacker';
    decisiveness = 'decisive';
  } else if (scoreDiff >= 10) {
    victor = 'attacker';
    decisiveness = 'marginal';
  } else if (scoreDiff <= -50) {
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
