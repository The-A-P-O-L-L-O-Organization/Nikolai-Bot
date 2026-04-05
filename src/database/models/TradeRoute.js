import mongoose from 'mongoose';

// Trade Route - ongoing trade agreements between nations
const tradeRouteSchema = new mongoose.Schema({
  guildId: { type: String, required: true, index: true },
  
  // Nations involved
  nation1: { type: mongoose.Schema.Types.ObjectId, ref: 'Nation', required: true },
  nation1Name: { type: String, required: true },
  nation2: { type: mongoose.Schema.Types.ObjectId, ref: 'Nation', required: true },
  nation2Name: { type: String, required: true },
  
  // Trade type
  type: {
    type: String,
    enum: ['bilateral', 'export', 'import'],  // bilateral = mutual, export/import = one-way
    default: 'bilateral',
  },
  
  // What nation1 sends
  nation1Exports: [{
    type: { type: String, enum: ['currency', 'resource'], required: true },
    name: { type: String, required: true },
    amount: { type: Number, required: true },
  }],
  
  // What nation2 sends
  nation2Exports: [{
    type: { type: String, enum: ['currency', 'resource'], required: true },
    name: { type: String, required: true },
    amount: { type: Number, required: true },
  }],
  
  // Status
  status: {
    type: String,
    enum: ['pending', 'active', 'suspended', 'cancelled', 'expired'],
    default: 'pending',
  },
  
  // Who initiated and who needs to accept
  initiatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Nation' },
  acceptedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Nation', default: null },
  
  // Duration
  duration: { type: Number, default: null },  // turns, null = indefinite
  turnsRemaining: { type: Number, default: null },
  startedAt: { type: Date, default: null },
  
  // Notes/terms
  terms: { type: String, default: '' },
  
  // Metadata
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  createdBy: { type: String, default: null },  // Discord user ID
});

tradeRouteSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

tradeRouteSchema.index({ guildId: 1, nation1: 1, nation2: 1 });
tradeRouteSchema.index({ guildId: 1, status: 1 });

const TradeRoute = mongoose.model('TradeRoute', tradeRouteSchema);

export default TradeRoute;
