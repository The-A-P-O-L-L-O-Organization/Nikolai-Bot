import mongoose from 'mongoose';

// Sanction - economic restrictions imposed on nations
const sanctionSchema = new mongoose.Schema({
  guildId: { type: String, required: true, index: true },
  
  // Who imposed the sanction
  imposedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Nation', required: true },
  imposedByName: { type: String, required: true },
  
  // Who is sanctioned
  target: { type: mongoose.Schema.Types.ObjectId, ref: 'Nation', required: true },
  targetName: { type: String, required: true },
  
  // Type of sanction
  type: {
    type: String,
    enum: ['trade_embargo', 'resource_ban', 'currency_freeze', 'arms_embargo', 'full_embargo', 'custom'],
    default: 'trade_embargo',
  },
  
  // Severity level (affects gameplay impact)
  severity: {
    type: String,
    enum: ['light', 'moderate', 'severe', 'total'],
    default: 'moderate',
  },
  
  // What specifically is restricted (for resource_ban type)
  restrictions: [{
    type: { type: String, enum: ['currency', 'resource', 'military', 'trade'], required: true },
    name: { type: String, default: null },  // specific resource/currency name
    percentage: { type: Number, default: 100 },  // how much is blocked (100 = total)
  }],
  
  // Reason for sanction
  reason: { type: String, default: '' },
  
  // Public announcement
  publicStatement: { type: String, default: '' },
  
  // Status
  status: {
    type: String,
    enum: ['active', 'suspended', 'lifted', 'expired'],
    default: 'active',
  },
  
  // Duration
  duration: { type: Number, default: null },  // turns, null = indefinite
  turnsRemaining: { type: Number, default: null },
  
  // Nations supporting the sanction (coalition)
  supporters: [{
    nation: { type: mongoose.Schema.Types.ObjectId, ref: 'Nation' },
    nationName: { type: String },
    joinedAt: { type: Date, default: Date.now },
  }],
  
  // Economic impact tracking
  impactTracking: {
    tradeBlocked: { type: Number, default: 0 },
    currencyFrozen: { type: Number, default: 0 },
    resourcesBlocked: { type: Number, default: 0 },
  },
  
  // Metadata
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  liftedAt: { type: Date, default: null },
  createdBy: { type: String, default: null },  // Discord user ID
});

sanctionSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

sanctionSchema.index({ guildId: 1, target: 1, status: 1 });
sanctionSchema.index({ guildId: 1, imposedBy: 1 });

const Sanction = mongoose.model('Sanction', sanctionSchema);

export default Sanction;
