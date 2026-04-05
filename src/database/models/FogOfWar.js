import mongoose from 'mongoose';

// Fog of War - controls what information nations can see about each other
const fogOfWarSchema = new mongoose.Schema({
  guildId: { type: String, required: true, index: true },
  
  // The nation that has the intelligence
  observerNation: { type: mongoose.Schema.Types.ObjectId, ref: 'Nation', required: true },
  observerNationName: { type: String, required: true },
  
  // The nation being observed
  targetNation: { type: mongoose.Schema.Types.ObjectId, ref: 'Nation', required: true },
  targetNationName: { type: String, required: true },
  
  // Intelligence level determines what can be seen
  // 0: None - only public info (name, flag, leader)
  // 1: Basic - population range, general economy status
  // 2: Moderate - approximate military strength, resources
  // 3: Detailed - exact numbers for most things
  // 4: Complete - everything including production queue, research
  intelligenceLevel: { type: Number, default: 0, min: 0, max: 4 },
  
  // Specific visibility overrides (can grant/deny specific info regardless of level)
  visibilityOverrides: {
    population: { type: Boolean, default: null },      // null = use level default
    economy: { type: Boolean, default: null },
    military: { type: Boolean, default: null },
    resources: { type: Boolean, default: null },
    production: { type: Boolean, default: null },
    research: { type: Boolean, default: null },
    stability: { type: Boolean, default: null },
    nukes: { type: Boolean, default: null },
    loans: { type: Boolean, default: null },
    spirits: { type: Boolean, default: null },
  },
  
  // How intelligence was gained
  source: {
    type: String,
    enum: ['default', 'espionage', 'treaty', 'alliance', 'gm_granted', 'border', 'trade'],
    default: 'default',
  },
  
  // When intelligence expires (null = permanent)
  expiresAt: { type: Date, default: null },
  
  // Last updated
  updatedAt: { type: Date, default: Date.now },
  updatedBy: { type: String, default: null }, // Discord user ID
  notes: { type: String, default: '' },
});

// Update timestamp on save
fogOfWarSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Compound index for lookups
fogOfWarSchema.index({ guildId: 1, observerNation: 1, targetNation: 1 }, { unique: true });
fogOfWarSchema.index({ guildId: 1, targetNation: 1 });
fogOfWarSchema.index({ expiresAt: 1 }, { sparse: true });

// Static method to get intelligence level between two nations
fogOfWarSchema.statics.getIntelligence = async function(guildId, observerId, targetId) {
  const record = await this.findOne({
    guildId,
    observerNation: observerId,
    targetNation: targetId,
  });
  
  // Check if expired
  if (record && record.expiresAt && record.expiresAt < new Date()) {
    // Reset to default
    record.intelligenceLevel = 0;
    record.source = 'default';
    record.expiresAt = null;
    await record.save();
  }
  
  return record;
};

// Static method to check if a specific field is visible
fogOfWarSchema.statics.canSee = async function(guildId, observerId, targetId, field) {
  // Same nation can always see everything about itself
  if (observerId.toString() === targetId.toString()) return true;
  
  const intel = await this.getIntelligence(guildId, observerId, targetId);
  if (!intel) return false; // No intelligence = only public info
  
  // Check for specific override first
  if (intel.visibilityOverrides && intel.visibilityOverrides[field] !== null) {
    return intel.visibilityOverrides[field];
  }
  
  // Otherwise use level-based visibility
  const levelRequirements = {
    population: 1,
    economy: 1,
    stability: 2,
    military: 2,
    resources: 2,
    nukes: 3,
    loans: 3,
    spirits: 3,
    production: 4,
    research: 4,
  };
  
  const required = levelRequirements[field] ?? 3;
  return intel.intelligenceLevel >= required;
};

// Static method to filter nation data based on fog of war
fogOfWarSchema.statics.filterNationData = async function(guildId, observerId, targetNation) {
  const targetId = targetNation._id;
  
  // Same nation sees everything
  if (observerId && observerId.toString() === targetId.toString()) {
    return targetNation;
  }
  
  const intel = await this.getIntelligence(guildId, observerId, targetId);
  const level = intel?.intelligenceLevel ?? 0;
  
  // Helper to check visibility
  const canSeeField = (field) => {
    if (intel?.visibilityOverrides?.[field] !== null && intel?.visibilityOverrides?.[field] !== undefined) {
      return intel.visibilityOverrides[field];
    }
    const requirements = { population: 1, economy: 1, stability: 2, military: 2, resources: 2, nukes: 3, loans: 3, spirits: 3, production: 4, research: 4 };
    return level >= (requirements[field] ?? 3);
  };
  
  // Create filtered copy
  const filtered = {
    _id: targetNation._id,
    guildId: targetNation.guildId,
    name: targetNation.name,
    leader: targetNation.leader,
    flag: targetNation.flag,
    description: targetNation.description,
    createdAt: targetNation.createdAt,
  };
  
  // Level 1+: Population (approximate at level 1, exact at 3+)
  if (canSeeField('population')) {
    if (level >= 3) {
      filtered.population = targetNation.population;
      filtered.populationNumber = targetNation.populationNumber;
    } else {
      // Give approximate range
      const pop = targetNation.populationNumber;
      if (pop < 1000000) filtered.population = '< 1M';
      else if (pop < 10000000) filtered.population = '1-10M';
      else if (pop < 50000000) filtered.population = '10-50M';
      else if (pop < 100000000) filtered.population = '50-100M';
      else if (pop < 500000000) filtered.population = '100-500M';
      else filtered.population = '500M+';
    }
  } else {
    filtered.population = 'Unknown';
  }
  
  // Level 1+: Economy (vague at 1, detailed at 3+)
  if (canSeeField('economy')) {
    if (level >= 3) {
      filtered.economy = targetNation.economy;
    } else {
      // Vague description
      const gdp = targetNation.economy?.gdp ?? 0;
      filtered.economy = {
        primaryCurrency: targetNation.economy?.primaryCurrency,
        gdpEstimate: gdp < 1000000000 ? 'Small' : gdp < 100000000000 ? 'Moderate' : gdp < 1000000000000 ? 'Large' : 'Massive',
      };
    }
  } else {
    filtered.economy = { gdpEstimate: 'Unknown' };
  }
  
  // Level 2+: Stability
  if (canSeeField('stability')) {
    if (level >= 3) {
      filtered.stability = targetNation.stability;
    } else {
      const stab = targetNation.stability;
      filtered.stability = stab < 20 ? 'Critical' : stab < 40 ? 'Unstable' : stab < 60 ? 'Moderate' : stab < 80 ? 'Stable' : 'Very Stable';
    }
  } else {
    filtered.stability = 'Unknown';
  }
  
  // Level 2+: Military (approximate at 2, exact at 3+)
  if (canSeeField('military')) {
    if (level >= 3) {
      filtered.military = targetNation.military;
    } else {
      // Give rough estimates
      const mil = targetNation.military;
      const totalArmy = (mil?.army?.troops ?? 0) + (mil?.army?.reserves ?? 0);
      const totalNavy = (mil?.navy?.carriers ?? 0) + (mil?.navy?.submarines ?? 0) + (mil?.navy?.destroyers ?? 0) + (mil?.navy?.frigates ?? 0);
      const totalAir = (mil?.airforce?.jets ?? 0) + (mil?.airforce?.bombers ?? 0);
      
      filtered.military = {
        armyStrength: totalArmy < 10000 ? 'Minimal' : totalArmy < 100000 ? 'Small' : totalArmy < 500000 ? 'Moderate' : totalArmy < 1000000 ? 'Large' : 'Massive',
        navalStrength: totalNavy < 10 ? 'Minimal' : totalNavy < 50 ? 'Small' : totalNavy < 100 ? 'Moderate' : 'Large',
        airStrength: totalAir < 50 ? 'Minimal' : totalAir < 200 ? 'Small' : totalAir < 500 ? 'Moderate' : 'Large',
      };
    }
  } else {
    filtered.military = { estimate: 'Unknown' };
  }
  
  // Level 2+: Resources
  if (canSeeField('resources')) {
    if (level >= 3) {
      filtered.resources = targetNation.resources;
      filtered.resourceIncome = targetNation.resourceIncome;
    } else {
      // Just list what resources they have (not amounts)
      const resources = targetNation.resources;
      if (resources && resources.size > 0) {
        filtered.resources = Array.from(resources.keys());
      } else {
        filtered.resources = [];
      }
    }
  }
  
  // Level 3+: Nukes
  if (canSeeField('nukes')) {
    filtered.nukes = targetNation.nukes;
  }
  
  // Level 3+: Loans
  if (canSeeField('loans')) {
    filtered.loans = targetNation.loans;
    filtered.debts = targetNation.debts;
  }
  
  // Level 3+: Spirits
  if (canSeeField('spirits')) {
    filtered.spirits = targetNation.spirits;
  }
  
  // Level 4: Production queue
  if (canSeeField('production')) {
    filtered.productionQueue = targetNation.productionQueue;
  }
  
  // Level 4: Research
  if (canSeeField('research')) {
    filtered.research = targetNation.research;
  }
  
  return filtered;
};

const FogOfWar = mongoose.model('FogOfWar', fogOfWarSchema);

export default FogOfWar;
