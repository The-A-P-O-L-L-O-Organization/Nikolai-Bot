import mongoose from 'mongoose';

const treatySchema = new mongoose.Schema({
  // Guild (server) this treaty belongs to
  guildId: { type: String, required: true, index: true },
  
  name: { type: String, required: true },
  type: { 
    type: String, 
    enum: ['alliance', 'non_aggression', 'trade', 'defensive', 'military_access', 'vassalage', 'custom'], 
    default: 'alliance' 
  },
  
  // Signatories
  members: [{
    nation: { type: mongoose.Schema.Types.ObjectId, ref: 'Nation' },
    nationName: String,
    joinedAt: { type: Date, default: Date.now },
    role: { type: String, default: 'member' },  // 'leader', 'member', 'vassal', etc.
  }],
  
  // Treaty details
  description: { type: String, default: '' },
  terms: [{ type: String }],  // List of treaty terms
  
  // Duration
  signedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, default: null },  // null = permanent
  dissolvedAt: { type: Date, default: null },
  
  // Status
  status: { 
    type: String, 
    enum: ['active', 'expired', 'dissolved'], 
    default: 'active' 
  },
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

treatySchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

treatySchema.index({ status: 1 });
treatySchema.index({ type: 1 });

const Treaty = mongoose.model('Treaty', treatySchema);

export default Treaty;
