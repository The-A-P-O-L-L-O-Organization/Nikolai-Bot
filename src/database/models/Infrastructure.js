import mongoose from 'mongoose';

const infrastructureEffectSchema = new mongoose.Schema({
  type: { 
    type: String, 
    enum: [
      'income_modifier', 'production_speed', 'research_speed', 'stability_modifier',
      'military_modifier', 'resource_income', 'resource_capacity', 'population_growth',
      'maintenance_reduction', 'trade_bonus', 'custom'
    ],
    required: true 
  },
  target: { type: String },  // Which resource/unit/branch
  value: { type: Number },
  description: { type: String },
});

// Infrastructure Template (reusable definitions)
const infrastructureTemplateSchema = new mongoose.Schema({
  // Guild (server) this template belongs to (null for global defaults)
  guildId: { type: String, default: null, index: true },
  
  name: { type: String, required: true },
  description: { type: String, default: '' },
  
  // Category
  category: { 
    type: String, 
    enum: ['economic', 'military', 'civilian', 'industrial', 'transport', 'special'],
    default: 'civilian'
  },
  
  // Construction requirements
  buildTime: { type: Number, default: 2 },  // Turns to build
  costs: [{
    resource: { type: String, required: true },
    amount: { type: Number, required: true },
  }],
  
  // Prerequisites
  requiredTech: [{ type: String }],  // Technology names
  requiredInfrastructure: [{ type: String }],  // Other infrastructure names
  
  // Effects when built
  effects: [infrastructureEffectSchema],
  
  // Maintenance cost per turn
  maintenance: [{
    resource: { type: String },
    amount: { type: Number },
  }],
  
  // Maximum number a nation can have (0 = unlimited)
  maxPerNation: { type: Number, default: 0 },
  
  isDefault: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

infrastructureTemplateSchema.index({ guildId: 1, name: 1 }, { unique: true });

// Infrastructure Instance (built by a nation)
const infrastructureInstanceSchema = new mongoose.Schema({
  // Guild this belongs to
  guildId: { type: String, required: true, index: true },
  
  // The nation that owns this
  nationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Nation', required: true },
  nationName: { type: String, required: true },
  
  // Template reference
  templateId: { type: mongoose.Schema.Types.ObjectId, ref: 'InfrastructureTemplate' },
  templateName: { type: String, required: true },
  
  // Custom name for this instance (e.g., "Panama Canal")
  customName: { type: String },
  
  // Status
  status: {
    type: String,
    enum: ['constructing', 'active', 'damaged', 'destroyed', 'mothballed'],
    default: 'constructing',
  },
  
  // Construction progress
  turnsRemaining: { type: Number, default: 0 },
  
  // Level (for upgradeable infrastructure)
  level: { type: Number, default: 1 },
  
  // Metadata
  builtAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
});

infrastructureInstanceSchema.index({ guildId: 1, nationId: 1 });
infrastructureInstanceSchema.index({ guildId: 1, status: 1 });

const InfrastructureTemplate = mongoose.model('InfrastructureTemplate', infrastructureTemplateSchema);
const Infrastructure = mongoose.model('Infrastructure', infrastructureInstanceSchema);

export { InfrastructureTemplate };
export default Infrastructure;
