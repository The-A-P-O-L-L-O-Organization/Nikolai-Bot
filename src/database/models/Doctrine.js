import mongoose from 'mongoose';

// Military doctrine - affects combat bonuses
const doctrineSchema = new mongoose.Schema({
  guildId: { type: String, required: true, index: true },
  
  // Doctrine name
  name: { type: String, required: true },
  description: { type: String, default: '' },
  
  // Category
  category: {
    type: String,
    enum: ['offensive', 'defensive', 'mobile', 'guerrilla', 'combined_arms', 'naval', 'aerial', 'nuclear', 'irregular', 'siege', 'custom'],
    default: 'custom',
  },
  
  // Combat modifiers
  modifiers: {
    attack: { type: Number, default: 0 },           // +/- to attack rolls
    defense: { type: Number, default: 0 },          // +/- to defense rolls
    mobility: { type: Number, default: 0 },         // Movement/maneuver bonus
    morale: { type: Number, default: 0 },           // Morale modifier
    logistics: { type: Number, default: 0 },        // Supply efficiency
    casualties: { type: Number, default: 0 },       // Casualty rate modifier (negative = fewer casualties)
    siege: { type: Number, default: 0 },            // Siege warfare bonus
    naval: { type: Number, default: 0 },            // Naval combat bonus
    aerial: { type: Number, default: 0 },           // Air combat bonus
    urbanCombat: { type: Number, default: 0 },      // Urban warfare bonus
    terrainAdaptation: { type: Number, default: 0 }, // Reduces terrain penalties
  },
  
  // Special abilities
  abilities: [{
    name: { type: String },
    description: { type: String },
    effect: { type: String },
  }],
  
  // Requirements to adopt
  requirements: {
    minMilitarySize: { type: Number, default: 0 },
    requiredTech: [{ type: String }],
    trainingTime: { type: Number, default: 1 },  // Turns to fully adopt
  },
  
  // Is this a template or assigned to a nation
  isTemplate: { type: Boolean, default: true },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Nation', default: null },
  assignedToName: { type: String, default: null },
  adoptedAt: { type: Date, default: null },
  trainingProgress: { type: Number, default: 0 },  // 0-100%
  
  // Metadata
  createdAt: { type: Date, default: Date.now },
  createdBy: { type: String, default: null },
});

doctrineSchema.index({ guildId: 1, name: 1 });
doctrineSchema.index({ guildId: 1, assignedTo: 1 });

const Doctrine = mongoose.model('Doctrine', doctrineSchema);
export default Doctrine;
