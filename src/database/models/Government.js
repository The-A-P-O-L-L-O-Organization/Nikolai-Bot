import mongoose from 'mongoose';

// Government Type - tracks nation government systems
const governmentTypeSchema = new mongoose.Schema({
  guildId: { type: String, required: true, index: true },
  
  // Template name (reusable)
  name: { type: String, required: true },
  description: { type: String, default: '' },
  
  // Type category
  category: {
    type: String,
    enum: ['democracy', 'republic', 'monarchy', 'dictatorship', 'communist', 'fascist', 'theocracy', 'oligarchy', 'anarchy', 'military_junta', 'constitutional_monarchy', 'parliamentary', 'presidential', 'socialist', 'custom'],
    default: 'custom',
  },
  
  // Modifiers this government type provides
  modifiers: {
    stability: { type: Number, default: 0 },           // +/- to base stability
    economyGrowth: { type: Number, default: 0 },       // % modifier
    militaryMorale: { type: Number, default: 0 },      // % modifier
    researchSpeed: { type: Number, default: 0 },       // % modifier
    diplomacyBonus: { type: Number, default: 0 },      // +/- to diplomacy
    corruptionLevel: { type: Number, default: 0 },     // % corruption
    freedomIndex: { type: Number, default: 50 },       // 0-100 freedom rating
    coupResistance: { type: Number, default: 50 },     // resistance to coups
  },
  
  // Succession rules
  succession: {
    type: String,
    enum: ['election', 'hereditary', 'appointment', 'military', 'revolution', 'none'],
    default: 'election',
  },
  
  // Is this a template or assigned to nation
  isTemplate: { type: Boolean, default: true },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Nation', default: null },
  assignedToName: { type: String, default: null },
  
  // Metadata
  createdAt: { type: Date, default: Date.now },
  createdBy: { type: String, default: null },
});

governmentTypeSchema.index({ guildId: 1, name: 1 });
governmentTypeSchema.index({ guildId: 1, assignedTo: 1 });

// Coup attempt - tracks coup d'états
const coupAttemptSchema = new mongoose.Schema({
  guildId: { type: String, required: true, index: true },
  
  // Target nation
  target: { type: mongoose.Schema.Types.ObjectId, ref: 'Nation', required: true },
  targetName: { type: String, required: true },
  
  // Coup leader (can be internal or foreign-backed)
  leader: { type: String, required: true },  // Name of coup leader
  
  // Foreign backer (if any)
  foreignBacker: { type: mongoose.Schema.Types.ObjectId, ref: 'Nation', default: null },
  foreignBackerName: { type: String, default: null },
  
  // Coup type
  type: {
    type: String,
    enum: ['military', 'political', 'popular', 'palace', 'foreign_backed', 'self_coup'],
    default: 'military',
  },
  
  // Status
  status: {
    type: String,
    enum: ['planning', 'active', 'succeeded', 'failed', 'crushed'],
    default: 'planning',
  },
  
  // Success factors (all percentages, combined for final chance)
  factors: {
    militarySupport: { type: Number, default: 20 },    // % of military backing coup
    popularSupport: { type: Number, default: 20 },     // % of population backing coup
    eliteSupport: { type: Number, default: 20 },       // % of elites backing coup
    foreignSupport: { type: Number, default: 0 },      // Foreign assistance bonus
    governmentWeakness: { type: Number, default: 0 },  // Based on low stability
  },
  
  // Calculated overall chance
  successChance: { type: Number, default: 30 },
  
  // Resources committed
  resources: {
    troops: { type: Number, default: 0 },
    funding: { type: Number, default: 0 },
    currency: { type: String, default: 'Dollars' },
  },
  
  // Results
  result: {
    success: { type: Boolean, default: null },
    leaderSurvived: { type: Boolean, default: null },
    casualtiesCivilian: { type: Number, default: 0 },
    casualtiesMilitary: { type: Number, default: 0 },
    stabilityChange: { type: Number, default: 0 },
    newGovernment: { type: String, default: null },
    notes: { type: String, default: '' },
  },
  
  // If successful, new government details
  newGovernmentType: { type: mongoose.Schema.Types.ObjectId, ref: 'GovernmentType', default: null },
  newLeader: { type: String, default: null },
  
  // Metadata
  createdAt: { type: Date, default: Date.now },
  resolvedAt: { type: Date, default: null },
  createdBy: { type: String, default: null },
});

coupAttemptSchema.index({ guildId: 1, target: 1, status: 1 });

const GovernmentType = mongoose.model('GovernmentType', governmentTypeSchema);
const CoupAttempt = mongoose.model('CoupAttempt', coupAttemptSchema);

export { GovernmentType, CoupAttempt };
