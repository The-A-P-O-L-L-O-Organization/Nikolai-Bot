import mongoose from 'mongoose';

const reputationSchema = new mongoose.Schema({
  // Guild (server) this reputation record belongs to
  guildId: { type: String, required: true, index: true },
  
  // The nation that HOLDS the opinion
  nationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Nation', required: true },
  nationName: { type: String, required: true },
  
  // The nation being judged
  targetNationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Nation', required: true },
  targetNationName: { type: String, required: true },
  
  // Reputation value (-100 to +100)
  // -100 = Mortal Enemy, -50 = Hostile, 0 = Neutral, +50 = Friendly, +100 = Allied
  value: { type: Number, default: 0, min: -100, max: 100 },
  
  // Relationship status (derived from value, but can be overridden)
  status: {
    type: String,
    enum: ['allied', 'friendly', 'cordial', 'neutral', 'cold', 'hostile', 'enemy', 'war'],
    default: 'neutral',
  },
  
  // History of reputation changes
  history: [{
    oldValue: { type: Number },
    newValue: { type: Number },
    reason: { type: String },
    changedAt: { type: Date, default: Date.now },
    changedBy: { type: String },  // 'system' or user ID
  }],
  
  // Metadata
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Unique compound index - one reputation record per nation pair per guild
reputationSchema.index({ guildId: 1, nationId: 1, targetNationId: 1 }, { unique: true });
reputationSchema.index({ guildId: 1, nationName: 1 });
reputationSchema.index({ guildId: 1, targetNationName: 1 });

reputationSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // Auto-derive status from value if not manually set
  if (this.isModified('value')) {
    this.status = deriveStatus(this.value);
  }
  next();
});

/**
 * Derive relationship status from reputation value
 */
function deriveStatus(value) {
  if (value >= 80) return 'allied';
  if (value >= 50) return 'friendly';
  if (value >= 20) return 'cordial';
  if (value >= -20) return 'neutral';
  if (value >= -50) return 'cold';
  if (value >= -80) return 'hostile';
  return 'enemy';
}

const Reputation = mongoose.model('Reputation', reputationSchema);

/**
 * Get or create reputation between two nations
 */
export async function getOrCreateReputation(guildId, nationId, nationName, targetNationId, targetNationName) {
  let rep = await Reputation.findOne({ guildId, nationId, targetNationId });
  
  if (!rep) {
    rep = await Reputation.create({
      guildId,
      nationId,
      nationName,
      targetNationId,
      targetNationName,
      value: 0,
      status: 'neutral',
    });
  }
  
  return rep;
}

/**
 * Modify reputation between two nations
 */
export async function modifyReputation(guildId, nationId, nationName, targetNationId, targetNationName, change, reason, changedBy = 'system') {
  const rep = await getOrCreateReputation(guildId, nationId, nationName, targetNationId, targetNationName);
  
  const oldValue = rep.value;
  rep.value = Math.max(-100, Math.min(100, rep.value + change));
  
  rep.history.push({
    oldValue,
    newValue: rep.value,
    reason,
    changedBy,
  });
  
  // Keep history limited to last 50 entries
  if (rep.history.length > 50) {
    rep.history = rep.history.slice(-50);
  }
  
  await rep.save();
  return rep;
}

/**
 * Get all reputations for a nation
 */
export async function getNationReputations(guildId, nationId) {
  return await Reputation.find({ guildId, nationId }).sort({ value: -1 });
}

/**
 * Get reputation towards a specific nation from all nations
 */
export async function getReputationsToward(guildId, targetNationId) {
  return await Reputation.find({ guildId, targetNationId }).sort({ value: -1 });
}

export { deriveStatus };
export default Reputation;
