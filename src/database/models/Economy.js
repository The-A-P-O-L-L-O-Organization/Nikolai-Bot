import mongoose from 'mongoose';

// Currency Exchange Rate - tracks exchange rates between currencies
const exchangeRateSchema = new mongoose.Schema({
  guildId: { type: String, required: true, index: true },
  
  // Base currency (what you're exchanging from)
  baseCurrency: { type: String, required: true },
  
  // Target currency (what you're exchanging to)
  targetCurrency: { type: String, required: true },
  
  // Exchange rate (how much target you get for 1 base)
  rate: { type: Number, required: true },
  
  // Historical rate for tracking trends
  previousRate: { type: Number, default: null },
  
  // Volatility (how much rate can change per turn)
  volatility: { type: Number, default: 5 },  // percentage
  
  // Is this rate controlled by GM or dynamic
  controlled: { type: Boolean, default: false },
  
  // Last update
  lastUpdated: { type: Date, default: Date.now },
  updatedBy: { type: String, default: null },  // Discord user ID or 'system'
});

exchangeRateSchema.index({ guildId: 1, baseCurrency: 1, targetCurrency: 1 }, { unique: true });

// Economic Crisis - major economic events affecting nations
const economicCrisisSchema = new mongoose.Schema({
  guildId: { type: String, required: true, index: true },
  
  // Crisis name and description
  name: { type: String, required: true },
  description: { type: String, default: '' },
  
  // Type of crisis
  type: {
    type: String,
    enum: ['recession', 'depression', 'hyperinflation', 'currency_crash', 'bank_run', 'debt_crisis', 'trade_war', 'oil_shock', 'market_crash', 'custom'],
    default: 'recession',
  },
  
  // Severity
  severity: {
    type: String,
    enum: ['minor', 'moderate', 'major', 'catastrophic'],
    default: 'moderate',
  },
  
  // Scope
  scope: {
    type: String,
    enum: ['national', 'regional', 'global'],
    default: 'national',
  },
  
  // Affected nations (empty = all for global)
  affectedNations: [{
    nation: { type: mongoose.Schema.Types.ObjectId, ref: 'Nation' },
    nationName: { type: String },
    impact: { type: Number, default: 100 },  // percentage of full effect
  }],
  
  // Effects
  effects: {
    gdpModifier: { type: Number, default: 0 },        // percentage change
    incomeModifier: { type: Number, default: 0 },     // percentage change
    inflationChange: { type: Number, default: 0 },    // absolute change
    stabilityModifier: { type: Number, default: 0 },  // percentage change
    tradeModifier: { type: Number, default: 0 },      // percentage change
    customEffects: [{ type: String }],                // text descriptions
  },
  
  // Duration
  duration: { type: Number, default: 5 },  // turns
  turnsRemaining: { type: Number, default: 5 },
  
  // Status
  status: {
    type: String,
    enum: ['building', 'active', 'recovering', 'resolved'],
    default: 'active',
  },
  
  // Recovery conditions
  recoveryConditions: [{ type: String }],
  
  // Metadata
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  resolvedAt: { type: Date, default: null },
  createdBy: { type: String, default: null },  // Discord user ID
});

economicCrisisSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

economicCrisisSchema.index({ guildId: 1, status: 1 });

const ExchangeRate = mongoose.model('ExchangeRate', exchangeRateSchema);
const EconomicCrisis = mongoose.model('EconomicCrisis', economicCrisisSchema);

export { ExchangeRate, EconomicCrisis };
