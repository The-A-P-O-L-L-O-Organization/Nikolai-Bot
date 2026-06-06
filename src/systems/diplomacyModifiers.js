import { applySpiritEffects } from './spiritSystem.js';

/**
 * Calculate espionage operation difficulty with spirit bonuses applied
 * @param {Number} baseDifficulty - Base difficulty of operation type
 * @param {Number} diplomacyEspionageBonus - Bonus from nation's spirits
 * @returns {Number} Adjusted difficulty (lower = easier)
 */
export function calculateEspionageDifficulty(baseDifficulty, diplomacyEspionageBonus) {
  // Each point of diplomacy bonus reduces difficulty by 1, min difficulty 25
  const adjustedDifficulty = Math.max(25, baseDifficulty - diplomacyEspionageBonus);
  return adjustedDifficulty;
}

/**
 * Calculate espionage operation detection risk with spirit bonuses
 * @param {Number} baseDetectionRisk - Base detection risk
 * @param {Number} diplomacyEspionageBonus - Bonus from nation's spirits
 * @returns {Number} Adjusted detection risk percentage
 */
export function calculateDetectionRisk(baseDetectionRisk, diplomacyEspionageBonus) {
  // Each point of bonus reduces detection risk by 0.5%, min risk 5%
  const adjustedRisk = Math.max(5, baseDetectionRisk - (diplomacyEspionageBonus * 0.5));
  return adjustedRisk;
}

/**
 * Calculate counterintelligence bonus for detecting enemy operations
 * @param {Number} baseDetectionChance - Base chance to detect (0-100)
 * @param {Number} diplomacyCounterintelBonus - Counterintel bonus from spirits
 * @returns {Number} Adjusted detection chance (capped at 85%)
 */
export function calculateCounterintelDetectionChance(baseDetectionChance, diplomacyCounterintelBonus) {
  // Each point of bonus adds 1% to detection chance, max 85%
  return Math.min(85, baseDetectionChance + diplomacyCounterintelBonus);
}

/**
 * Calculate treaty/alliance acceptance difficulty with spirit bonuses
 * @param {Number} baseDifficulty - Base resistance to diplomatic agreement
 * @param {Number} diplomacyTreatyBonus - Treaty bonus from initiating nation's spirits
 * @returns {Number} Adjusted difficulty (lower = easier to convince)
 */
export function calculateTreatyDifficulty(baseDifficulty, diplomacyTreatyBonus) {
  // Each point of bonus reduces resistance by 1, min difficulty 10
  return Math.max(10, baseDifficulty - diplomacyTreatyBonus);
}

/**
 * Calculate propaganda operation effectiveness
 * @param {Number} baseEffectiveness - Base impact (0-100)
 * @param {Number} diplomacyPropagandaBonus - Propaganda bonus from spirits
 * @returns {Number} Adjusted effectiveness capped at 100
 */
export function calculatePropagandaEffectiveness(baseEffectiveness, diplomacyPropagandaBonus) {
  // Each point of bonus adds 1% effectiveness, max 100%
  return Math.min(100, baseEffectiveness + diplomacyPropagandaBonus);
}

/**
 * Get all diplomacy modifiers for a nation
 * @param {Object} nation - Nation document
 * @returns {Object} All diplomacy-related modifiers
 */
export function getNationDiplomacyModifiers(nation) {
  const spiritMods = applySpiritEffects(nation);
  return {
    espionage: spiritMods.diplomacyEspionageBonus + spiritMods.diplomacyBonus,
    treaty: spiritMods.diplomacyTreatyBonus + spiritMods.diplomacyBonus,
    counterintel: spiritMods.diplomacyCounterintelBonus + spiritMods.diplomacyBonus,
    propaganda: spiritMods.diplomacyPropagandaBonus + spiritMods.diplomacyBonus,
  };
}

export default {
  calculateEspionageDifficulty,
  calculateDetectionRisk,
  calculateCounterintelDetectionChance,
  calculateTreatyDifficulty,
  calculatePropagandaEffectiveness,
  getNationDiplomacyModifiers,
};
