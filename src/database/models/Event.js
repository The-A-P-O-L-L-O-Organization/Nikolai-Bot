import mongoose from 'mongoose';

const eventEffectSchema = new mongoose.Schema({
  type: { 
    type: String, 
    enum: ['currency', 'resource', 'stability', 'population', 'military', 'custom'], 
    required: true 
  },
  target: { type: String },  // Which currency/resource/military unit
  value: { type: Number },   // Amount to add/subtract (negative for losses)
  percentage: { type: Boolean, default: false },  // Is value a percentage?
  description: { type: String },
});

const eventSchema = new mongoose.Schema({
  // Guild (server) this event belongs to (null for global defaults)
  guildId: { type: String, default: null, index: true },
  
  name: { type: String, required: true },
  description: { type: String, required: true },
  
  // Event categorization
  category: { 
    type: String, 
    enum: ['economic', 'military', 'social', 'natural', 'political', 'random'], 
    default: 'random' 
  },
  severity: { 
    type: String, 
    enum: ['positive', 'neutral', 'negative', 'catastrophic'], 
    default: 'neutral' 
  },
  
  // Effects when triggered
  effects: [eventEffectSchema],
  
  // Trigger conditions (optional)
  conditions: {
    minStability: { type: Number },
    maxStability: { type: Number },
    minPopulation: { type: Number },
    atWar: { type: Boolean },
    hasResource: { type: String },
  },
  
  // Weight for random selection (higher = more likely)
  weight: { type: Number, default: 1 },
  
  // Can this event repeat?
  repeatable: { type: Boolean, default: true },
  
  isDefault: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

eventSchema.index({ category: 1 });
eventSchema.index({ severity: 1 });

const Event = mongoose.model('Event', eventSchema);

export default Event;
