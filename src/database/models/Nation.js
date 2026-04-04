import mongoose from 'mongoose';

const spiritEffectSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: [
      'income_modifier',
      'production_speed', 
      'research_speed',
      'stability_modifier',
      'military_modifier',
      'diplomacy_bonus',
      'resource_income',
      'maintenance_modifier',
      'population_growth',
      'custom',
    ],
  },
  target: String,        // What the effect targets (e.g., 'rebels', 'tanks', 'oil')
  value: Number,         // Percentage or flat value
  description: String,   // For custom effects
});

const spiritSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, default: '' },
  effects: [spiritEffectSchema],
});

const loanSchema = new mongoose.Schema({
  creditor: { type: mongoose.Schema.Types.ObjectId, ref: 'Nation' },
  creditorName: String,
  amount: { type: Number, required: true },
  currency: { type: String, required: true },
  interestRate: { type: Number, default: 0 },  // Percentage
  createdAt: { type: Date, default: Date.now },
});

const productionQueueItemSchema = new mongoose.Schema({
  unitType: { type: String, required: true },
  quantity: { type: Number, required: true },
  turnsRemaining: { type: Number, required: true },
  totalTurns: { type: Number, required: true },
  startedAt: { type: Date, default: Date.now },
});

const nationSchema = new mongoose.Schema({
  // Basic Info
  name: { type: String, required: true, unique: true },
  owner: { type: String, default: null },  // Discord user ID
  leader: { type: String, default: 'Unknown' },
  flag: { type: String, default: null },   // URL to flag image
  description: { type: String, default: '' },

  // Demographics
  population: { type: String, default: '1M' },  // Stored as string for flexibility (1M, 300M, 1.2B)
  populationNumber: { type: Number, default: 1000000 },  // Actual number for calculations

  // Economy
  economy: {
    gdp: { type: Number, default: 0 },
    budget: { type: Number, default: 0 },
    primaryCurrency: { type: String, default: 'Dollars' },
    currencies: { type: Map, of: Number, default: {} },
    inflation: { type: Number, default: 0 },      // Percentage
    income: { type: Map, of: Number, default: {} },  // Per-turn income
    expenses: { type: Map, of: Number, default: {} }, // Per-turn expenses
  },

  // Resources
  resources: { type: Map, of: Number, default: {} },
  resourceIncome: { type: Map, of: Number, default: {} },

  // Stability & Other Stats
  stability: { type: Number, default: 50 },     // 0-100
  nukes: { type: Number, default: 0 },

  // Military
  military: {
    army: {
      troops: { type: Number, default: 0 },
      reserves: { type: Number, default: 0 },
      tanks: { type: Number, default: 0 },
      artillery: { type: Number, default: 0 },
      armoredVehicles: { type: Number, default: 0 },
      specialForces: { type: Number, default: 0 },
      // Custom units stored by name
      custom: { type: Map, of: Number, default: {} },
    },
    airforce: {
      jets: { type: Number, default: 0 },
      bombers: { type: Number, default: 0 },
      reconPlanes: { type: Number, default: 0 },
      transportPlanes: { type: Number, default: 0 },
      helicopters: { type: Number, default: 0 },
      custom: { type: Map, of: Number, default: {} },
    },
    navy: {
      carriers: { type: Number, default: 0 },
      submarines: { type: Number, default: 0 },
      destroyers: { type: Number, default: 0 },
      frigates: { type: Number, default: 0 },
      corvettes: { type: Number, default: 0 },
      battleships: { type: Number, default: 0 },
      custom: { type: Map, of: Number, default: {} },
    },
  },

  // Production Queue
  productionQueue: [productionQueueItemSchema],

  // Research
  research: {
    current: { type: String, default: null },
    turnsRemaining: { type: Number, default: 0 },
    completed: [{ type: String }],
  },

  // Spirits (National traits/buffs)
  spirits: [spiritSchema],

  // Loans
  loans: [loanSchema],
  debts: [loanSchema],  // Money owed TO this nation

  // Metadata
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  createdFrom: { type: String, default: null },  // Template name if created from template
});

// Update timestamp on save
nationSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Index for faster lookups
nationSchema.index({ name: 1 });
nationSchema.index({ owner: 1 });

const Nation = mongoose.model('Nation', nationSchema);

export default Nation;
