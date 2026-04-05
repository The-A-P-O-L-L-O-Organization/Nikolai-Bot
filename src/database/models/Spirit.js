import mongoose from 'mongoose';

const spiritEffectSchema = new mongoose.Schema({
  type: { 
    type: String, 
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
    required: true 
  },
  target: { type: String },  // Which resource/unit/branch (e.g., 'Oil', 'army', 'navy')
  value: { type: Number },   // Amount (percentage for modifiers, flat for income)
  description: { type: String },  // Human-readable description
});

const spiritSchema = new mongoose.Schema({
  // Guild (server) this spirit belongs to (null for global defaults)
  guildId: { type: String, default: null, index: true },
  
  name: { type: String, required: true },
  description: { type: String, default: '' },
  
  // Categorization
  category: { 
    type: String, 
    enum: ['military', 'economic', 'political', 'research', 'geographic', 'custom'], 
    default: 'custom' 
  },
  
  // Effects when applied to a nation
  effects: [spiritEffectSchema],
  
  // Whether this is a built-in preset
  isDefault: { type: Boolean, default: false },
  
  createdAt: { type: Date, default: Date.now },
  createdBy: { type: String },  // User ID who created this spirit
});

// Compound index for unique names per guild
spiritSchema.index({ guildId: 1, name: 1 }, { unique: true });
spiritSchema.index({ category: 1 });

const Spirit = mongoose.model('Spirit', spiritSchema);

export default Spirit;
