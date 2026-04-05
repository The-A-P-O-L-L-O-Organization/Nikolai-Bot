import mongoose from 'mongoose';

// Espionage operations and intelligence gathering
const espionageOperationSchema = new mongoose.Schema({
  guildId: { type: String, required: true, index: true },
  
  // Who is conducting the operation
  operator: { type: mongoose.Schema.Types.ObjectId, ref: 'Nation', required: true },
  operatorName: { type: String, required: true },
  
  // Target of the operation
  target: { type: mongoose.Schema.Types.ObjectId, ref: 'Nation', required: true },
  targetName: { type: String, required: true },
  
  // Operation type
  type: {
    type: String,
    enum: [
      'reconnaissance',       // Gather general intel
      'infiltration',         // Plant agents
      'sabotage',            // Damage infrastructure/military
      'assassination',       // Target leadership
      'theft',               // Steal resources/technology
      'counterintelligence', // Find enemy spies
      'propaganda',          // Influence stability/opinion
      'cyber',               // Modern cyber operations
    ],
    required: true,
  },
  
  // Operation status
  status: {
    type: String,
    enum: ['planning', 'active', 'completed', 'failed', 'detected', 'aborted'],
    default: 'planning',
  },
  
  // Success factors
  difficulty: { type: Number, default: 50, min: 0, max: 100 },  // Base difficulty
  successChance: { type: Number, default: 50 },                  // Calculated chance
  detectionRisk: { type: Number, default: 30 },                  // Chance of being caught
  
  // Resources committed
  resources: {
    agents: { type: Number, default: 1 },
    funding: { type: Number, default: 0 },
    currency: { type: String, default: 'Dollars' },
  },
  
  // Duration
  turnsRequired: { type: Number, default: 1 },
  turnsRemaining: { type: Number, default: 1 },
  
  // Results
  result: {
    success: { type: Boolean, default: null },
    detected: { type: Boolean, default: false },
    intelGained: { type: Number, default: 0 },     // Intel level gained on target
    damageDealt: { type: String, default: null },  // Description of damage
    loot: [{
      type: { type: String },
      name: { type: String },
      amount: { type: Number },
    }],
    agentsLost: { type: Number, default: 0 },
    notes: { type: String, default: '' },
  },
  
  // Metadata
  createdAt: { type: Date, default: Date.now },
  completedAt: { type: Date, default: null },
  createdBy: { type: String, default: null },  // Discord user ID
});

espionageOperationSchema.index({ guildId: 1, operator: 1, status: 1 });
espionageOperationSchema.index({ guildId: 1, target: 1, status: 1 });

const EspionageOperation = mongoose.model('EspionageOperation', espionageOperationSchema);

export default EspionageOperation;
