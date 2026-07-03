/**
 * Tests for the crisis recovery system
 */

import assert from 'assert';
import {
  CRISIS_TYPES,
  RECOVERY_ACTIONS,
  calculateCrisisImpact,
  getCrisisPhase,
  calculateRecoveryProgress,
  isCrisisResolved,
  getCrisisStatus,
  calculateCrisisCascades,
} from './crisisRecovery.js';

console.log('Running Crisis Recovery System Tests...\n');

// Test 1: CRISIS_TYPES exports
console.log('Test 1: CRISIS_TYPES have correct structure');
assert(CRISIS_TYPES.recession, 'Recession crisis type missing');
assert.strictEqual(CRISIS_TYPES.recession.name, 'Recession', 'Recession name incorrect');
assert.strictEqual(CRISIS_TYPES.recession.emoji, '📉', 'Recession emoji incorrect');
assert.strictEqual(CRISIS_TYPES.recession.duration, 3, 'Recession duration should be 3');
assert.strictEqual(CRISIS_TYPES.recession.impact, -0.30, 'Recession impact should be -0.30');
assert.strictEqual(CRISIS_TYPES.recession.severity, 'moderate', 'Recession severity should be moderate');

assert(CRISIS_TYPES.depression, 'Depression crisis type missing');
assert.strictEqual(CRISIS_TYPES.depression.name, 'Depression', 'Depression name incorrect');
assert.strictEqual(CRISIS_TYPES.depression.emoji, '💔', 'Depression emoji incorrect');
assert.strictEqual(CRISIS_TYPES.depression.duration, 5, 'Depression duration should be 5');
assert.strictEqual(CRISIS_TYPES.depression.impact, -0.50, 'Depression impact should be -0.50');
assert.strictEqual(CRISIS_TYPES.depression.severity, 'severe', 'Depression severity should be severe');

assert(CRISIS_TYPES.hyperinflation, 'Hyperinflation crisis type missing');
assert.strictEqual(CRISIS_TYPES.hyperinflation.name, 'Hyperinflation', 'Hyperinflation name incorrect');
assert.strictEqual(CRISIS_TYPES.hyperinflation.emoji, '🔥', 'Hyperinflation emoji incorrect');

assert(CRISIS_TYPES.currencyCollapse, 'Currency Collapse crisis type missing');
assert.strictEqual(CRISIS_TYPES.currencyCollapse.name, 'Currency Collapse', 'Currency Collapse name incorrect');
assert.strictEqual(CRISIS_TYPES.currencyCollapse.emoji, '💥', 'Currency Collapse emoji incorrect');

assert(CRISIS_TYPES.resourceShortage, 'Resource Shortage crisis type missing');
assert.strictEqual(CRISIS_TYPES.resourceShortage.name, 'Resource Shortage', 'Resource Shortage name incorrect');
assert.strictEqual(CRISIS_TYPES.resourceShortage.emoji, '⚠️', 'Resource Shortage emoji incorrect');
console.log('✓ CRISIS_TYPES correctly defined\n');

// Test 2: RECOVERY_ACTIONS exports
console.log('Test 2: RECOVERY_ACTIONS have correct structure');
assert(RECOVERY_ACTIONS.austerity, 'Austerity action missing');
assert.strictEqual(RECOVERY_ACTIONS.austerity.name, 'Austerity Measures', 'Austerity name incorrect');
assert.strictEqual(RECOVERY_ACTIONS.austerity.militaryCost, 0.20, 'Austerity militaryCost should be 0.20');
assert.strictEqual(RECOVERY_ACTIONS.austerity.treasuryCost, 0.15, 'Austerity treasuryCost should be 0.15');
assert.strictEqual(RECOVERY_ACTIONS.austerity.recoveryBoost, 0.15, 'Austerity recoveryBoost should be 0.15');

assert(RECOVERY_ACTIONS.investment, 'Investment action missing');
assert.strictEqual(RECOVERY_ACTIONS.investment.name, 'Economic Investment', 'Investment name incorrect');
assert.strictEqual(RECOVERY_ACTIONS.investment.incomeLoss, 0.10, 'Investment incomeLoss should be 0.10');
assert.strictEqual(RECOVERY_ACTIONS.investment.recoveryBoost, 0.30, 'Investment recoveryBoost should be 0.30');
assert.strictEqual(RECOVERY_ACTIONS.investment.turnsTillEffect, 2, 'Investment turnsTillEffect should be 2');

assert(RECOVERY_ACTIONS.externalAid, 'External Aid action missing');
assert.strictEqual(RECOVERY_ACTIONS.externalAid.name, 'External Aid', 'External Aid name incorrect');
assert.strictEqual(RECOVERY_ACTIONS.externalAid.loanAmount, 10000, 'External Aid loanAmount should be 10000');
assert.strictEqual(RECOVERY_ACTIONS.externalAid.interestRate, 0.10, 'External Aid interestRate should be 0.10');
console.log('✓ RECOVERY_ACTIONS correctly defined\n');

// Test 3: calculateCrisisImpact
console.log('Test 3: calculateCrisisImpact function');
const recessionImpact = calculateCrisisImpact(CRISIS_TYPES.recession, 1000);
assert.strictEqual(recessionImpact.incomeModifier, -0.30, 'Income modifier should match crisis impact');
assert.strictEqual(recessionImpact.stabilityChange, -15, 'Stability change should be -15');
assert.strictEqual(recessionImpact.populationGrowthModifier, 0, 'Population growth modifier for moderate crisis should be 0');

const depressionImpact = calculateCrisisImpact(CRISIS_TYPES.depression, 1000);
assert.strictEqual(depressionImpact.populationGrowthModifier, -0.10, 'Population growth modifier for severe crisis should be -0.10');
console.log('✓ calculateCrisisImpact works correctly\n');

// Test 4: getCrisisPhase
console.log('Test 4: getCrisisPhase function');
assert.strictEqual(getCrisisPhase(0, 3), 1, 'Turn 0 of 3-turn crisis should be phase 1');
assert.strictEqual(getCrisisPhase(1, 3), 2, 'Turn 1 of 3-turn crisis should be phase 2');
assert.strictEqual(getCrisisPhase(2, 3), 3, 'Turn 2 of 3-turn crisis should be phase 3');

const phase1Max = Math.ceil(5 / 3); // 2
assert.strictEqual(getCrisisPhase(0, 5), 1, 'Turn 0 of 5-turn crisis should be phase 1');
assert.strictEqual(getCrisisPhase(1, 5), 1, 'Turn 1 of 5-turn crisis should be phase 1');
assert.strictEqual(getCrisisPhase(2, 5), 2, 'Turn 2 of 5-turn crisis should be phase 2');
assert.strictEqual(getCrisisPhase(4, 5), 3, 'Turn 4 of 5-turn crisis should be phase 3');
console.log('✓ getCrisisPhase works correctly\n');

// Test 5: calculateRecoveryProgress
console.log('Test 5: calculateRecoveryProgress function');
const baseRecovery = calculateRecoveryProgress(0.10, null);
assert.strictEqual(baseRecovery, 0.10, 'Base recovery should return 0.10');

const austerityRecovery = calculateRecoveryProgress(0.10, 'austerity');
assert.strictEqual(austerityRecovery, 0.25, 'Recovery with austerity should be 0.10 + 0.15 = 0.25');

const investmentRecovery = calculateRecoveryProgress(0.10, 'investment');
assert.strictEqual(investmentRecovery, 0.40, 'Recovery with investment should be 0.10 + 0.30 = 0.40');

// Test capping at 1.0
const highRecovery = calculateRecoveryProgress(0.95, 'investment');
assert.strictEqual(highRecovery, 1.0, 'Recovery should cap at 1.0');
console.log('✓ calculateRecoveryProgress works correctly\n');

// Test 6: isCrisisResolved
console.log('Test 6: isCrisisResolved function');
assert.strictEqual(isCrisisResolved(1.0, 2, 5), true, 'Crisis with 100% recovery should be resolved');
assert.strictEqual(isCrisisResolved(0.5, 8, 5), true, 'Crisis past duration + 2 should be resolved');
assert.strictEqual(isCrisisResolved(0.3, 2, 5), false, 'Crisis with 30% recovery and 2 turns should not be resolved');
console.log('✓ isCrisisResolved works correctly\n');

// Test 7: getCrisisStatus
console.log('Test 7: getCrisisStatus function');
const activeCrisis = {
  type: 'recession',
  turnsSinceTrigger: 0,
  duration: 3,
  recoveryProgress: 0.30,
};
const status = getCrisisStatus(activeCrisis);
assert(status.includes('📉'), 'Status should include emoji');
assert(status.includes('Recession'), 'Status should include crisis name');
assert(status.includes('Phase 1/3'), 'Status should show phase');
assert(status.includes('30%'), 'Status should show recovery percentage');
console.log('✓ getCrisisStatus works correctly\n');

// Test 8: calculateCrisisCascades
console.log('Test 8: calculateCrisisCascades function');
const poorRecoveryCascade = calculateCrisisCascades(
  { recoveryProgress: 0.2, turnsSinceTrigger: 0 },
  10000
);
assert.strictEqual(poorRecoveryCascade.populationGrowthModifier, 0.8, 'Low recovery should reduce population growth to 0.8');
assert(poorRecoveryCascade.cascadeDescription, 'Should have cascade description for low recovery');

const revoltCascade = calculateCrisisCascades(
  { recoveryProgress: 0.3, turnsSinceTrigger: 2 },
  10000
);
assert(revoltCascade.chanceOfRevolution > 0, 'Should have revolution chance at turn 2 with low recovery');
assert(revoltCascade.cascadeDescription, 'Should have cascade description for revolution risk');

const goodRecoveryCascade = calculateCrisisCascades(
  { recoveryProgress: 0.9, turnsSinceTrigger: 1 },
  10000
);
assert.strictEqual(goodRecoveryCascade.populationGrowthModifier, 1, 'Good recovery should have normal population growth');
assert.strictEqual(goodRecoveryCascade.chanceOfRevolution, 0, 'Good recovery should have no revolution chance');
console.log('✓ calculateCrisisCascades works correctly\n');

console.log('═══════════════════════════════════════');
console.log('✓ All tests passed!');
console.log('═══════════════════════════════════════');
