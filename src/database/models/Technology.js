import mongoose from 'mongoose';

const technologySchema = new mongoose.Schema({
  // Guild (server) this technology belongs to (null for global defaults)
  guildId: { type: String, default: null, index: true },
  
  name: { type: String, required: true },
  category: { 
    type: String, 
    enum: ['military', 'economy', 'infrastructure', 'science', 'social', 'special'], 
    default: 'military' 
  },
  description: { type: String, default: '' },
  
  // Research requirements
  researchTime: { type: Number, default: 3 },  // Turns to complete
  prerequisites: [{ type: String }],  // Names of required techs
  
  // Costs to research
  costs: [{
    resource: { type: String, required: true },
    amount: { type: Number, required: true },
  }],
  
  // Effects when researched
  effects: [{
    type: { type: String, required: true },
    target: String,
    value: Number,
    description: String,
  }],
  
  // Unlocks (unit types, buildings, etc.)
  unlocks: [{ type: String }],
  
  isDefault: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

// name already indexed via unique: true
technologySchema.index({ category: 1 });

const Technology = mongoose.model('Technology', technologySchema);

export default Technology;
