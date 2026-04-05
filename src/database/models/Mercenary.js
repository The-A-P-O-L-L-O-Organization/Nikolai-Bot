import mongoose from 'mongoose';

// Mercenary company/group
const mercenaryCompanySchema = new mongoose.Schema({
  guildId: { type: String, required: true, index: true },
  
  // Company details
  name: { type: String, required: true },
  description: { type: String, default: '' },
  motto: { type: String, default: null },
  
  // Type
  type: {
    type: String,
    enum: ['private_military', 'mercenary_band', 'security_contractor', 'foreign_legion', 'volunteer_corps', 'pirates', 'rebel_fighters', 'custom'],
    default: 'private_military',
  },
  
  // Status
  status: {
    type: String,
    enum: ['available', 'contracted', 'disbanded', 'destroyed'],
    default: 'available',
  },
  
  // Current employer
  employer: { type: mongoose.Schema.Types.ObjectId, ref: 'Nation', default: null },
  employerName: { type: String, default: null },
  
  // Forces
  forces: {
    infantry: { type: Number, default: 0 },
    armor: { type: Number, default: 0 },
    artillery: { type: Number, default: 0 },
    aircraft: { type: Number, default: 0 },
    naval: { type: Number, default: 0 },
    special: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
  },
  
  // Quality ratings (0-100)
  ratings: {
    combat: { type: Number, default: 50 },       // Combat effectiveness
    discipline: { type: Number, default: 50 },   // Follow orders, avoid atrocities
    loyalty: { type: Number, default: 50 },      // Won't switch sides
    morale: { type: Number, default: 50 },       // Will fight hard
    equipment: { type: Number, default: 50 },    // Quality of gear
  },
  
  // Specializations
  specializations: [{
    type: String,
    enum: ['infantry', 'armor', 'aerial', 'naval', 'special_ops', 'urban', 'jungle', 'desert', 'arctic', 'mountain', 'siege', 'counter_insurgency', 'assassination', 'sabotage', 'training', 'security'],
  }],
  
  // Pricing
  pricing: {
    hireCost: { type: Number, default: 0 },          // One-time hiring fee
    monthlyCost: { type: Number, default: 0 },       // Per-turn maintenance
    combatBonus: { type: Number, default: 0 },       // Extra pay for combat
    currency: { type: String, default: 'Dollars' },
  },
  
  // Contract details (when hired)
  contract: {
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
    terms: { type: String, default: '' },
    restrictions: [{ type: String }],  // What they won't do
    totalPaid: { type: Number, default: 0 },
  },
  
  // History
  history: {
    battlesWon: { type: Number, default: 0 },
    battlesLost: { type: Number, default: 0 },
    contractsCompleted: { type: Number, default: 0 },
    contractsBroken: { type: Number, default: 0 },
    atrocitiesCommitted: { type: Number, default: 0 },
  },
  
  // Reputation
  reputation: {
    reliability: { type: Number, default: 50 },   // 0-100, will they honor contracts
    brutality: { type: Number, default: 50 },     // 0-100, how brutal are they
    effectiveness: { type: Number, default: 50 }, // 0-100, do they win
    international: { type: Number, default: 0 },  // International infamy (-100 to +100)
  },
  
  // Leadership
  commander: {
    name: { type: String, default: null },
    background: { type: String, default: null },
    skills: [{ type: String }],
  },
  
  // Notes
  notes: { type: String, default: '' },
  
  // Metadata
  createdAt: { type: Date, default: Date.now },
  createdBy: { type: String, default: null },
});

mercenaryCompanySchema.index({ guildId: 1, name: 1 });
mercenaryCompanySchema.index({ guildId: 1, status: 1 });
mercenaryCompanySchema.index({ guildId: 1, employer: 1 });

// Contract history for a mercenary company
const mercenaryContractSchema = new mongoose.Schema({
  guildId: { type: String, required: true, index: true },
  
  // Company
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'MercenaryCompany', required: true },
  companyName: { type: String, required: true },
  
  // Employer
  employer: { type: mongoose.Schema.Types.ObjectId, ref: 'Nation', required: true },
  employerName: { type: String, required: true },
  
  // Contract terms
  terms: {
    mission: { type: String, default: '' },
    duration: { type: Number, default: 1 },  // In turns
    hireCost: { type: Number, default: 0 },
    monthlyCost: { type: Number, default: 0 },
    combatBonus: { type: Number, default: 0 },
    currency: { type: String, default: 'Dollars' },
    restrictions: [{ type: String }],
  },
  
  // Status
  status: {
    type: String,
    enum: ['active', 'completed', 'terminated', 'betrayed', 'destroyed'],
    default: 'active',
  },
  
  // Performance
  performance: {
    battlesParticipated: { type: Number, default: 0 },
    battlesWon: { type: Number, default: 0 },
    casualtiesTaken: { type: Number, default: 0 },
    atrocities: { type: Number, default: 0 },
    rating: { type: Number, default: null },  // Employer rating 1-5
  },
  
  // Dates
  startDate: { type: Date, default: Date.now },
  endDate: { type: Date, default: null },
  
  // Payment tracking
  totalPaid: { type: Number, default: 0 },
  
  // Metadata
  createdBy: { type: String, default: null },
});

mercenaryContractSchema.index({ guildId: 1, company: 1 });
mercenaryContractSchema.index({ guildId: 1, employer: 1 });

const MercenaryCompany = mongoose.model('MercenaryCompany', mercenaryCompanySchema);
const MercenaryContract = mongoose.model('MercenaryContract', mercenaryContractSchema);

export { MercenaryCompany, MercenaryContract };
