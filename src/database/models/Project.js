import mongoose from 'mongoose';

const projectEffectSchema = new mongoose.Schema({
  type: { 
    type: String, 
    enum: [
      'income_modifier', 'production_speed', 'research_speed', 'stability_modifier',
      'military_modifier', 'resource_income', 'prestige', 'unique_ability', 'custom'
    ],
    required: true 
  },
  target: { type: String },
  value: { type: Number },
  description: { type: String },
});

const projectStageSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  turnsRequired: { type: Number, required: true },
  costs: [{
    resource: { type: String, required: true },
    amount: { type: Number, required: true },
  }],
  // Optional intermediate effects
  effects: [projectEffectSchema],
});

// Project/Wonder Template
const projectTemplateSchema = new mongoose.Schema({
  // Guild (server) this template belongs to
  guildId: { type: String, default: null, index: true },
  
  name: { type: String, required: true },
  description: { type: String, default: '' },
  
  // Type
  type: { 
    type: String, 
    enum: ['wonder', 'megaproject', 'program', 'initiative'],
    default: 'project'
  },
  
  // Category
  category: { 
    type: String, 
    enum: ['military', 'economic', 'scientific', 'cultural', 'infrastructure', 'space', 'special'],
    default: 'special'
  },
  
  // Is this a unique wonder (only one nation can build it)?
  isUnique: { type: Boolean, default: false },
  
  // Multi-stage construction
  stages: [projectStageSchema],
  
  // Total resources needed (sum of all stages, for display)
  totalCosts: [{
    resource: { type: String },
    amount: { type: Number },
  }],
  
  // Total turns needed (sum of all stages)
  totalTurns: { type: Number, default: 1 },
  
  // Prerequisites
  requiredTech: [{ type: String }],
  requiredInfrastructure: [{ type: String }],
  minPopulation: { type: Number },
  minStability: { type: Number },
  
  // Final effects when completed
  effects: [projectEffectSchema],
  
  // Flavor
  completionMessage: { type: String },
  
  isDefault: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

projectTemplateSchema.index({ guildId: 1, name: 1 }, { unique: true });
projectTemplateSchema.index({ guildId: 1, type: 1 });

// Project Instance (being built or completed by a nation)
const projectInstanceSchema = new mongoose.Schema({
  // Guild this belongs to
  guildId: { type: String, required: true, index: true },
  
  // The nation building/owning this
  nationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Nation', required: true },
  nationName: { type: String, required: true },
  
  // Template reference
  templateId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProjectTemplate' },
  templateName: { type: String, required: true },
  
  // Custom name
  customName: { type: String },
  
  // Status
  status: {
    type: String,
    enum: ['planning', 'in_progress', 'paused', 'completed', 'abandoned', 'destroyed'],
    default: 'planning',
  },
  
  // Current stage (0-indexed)
  currentStage: { type: Number, default: 0 },
  turnsRemainingInStage: { type: Number, default: 0 },
  
  // Track invested resources (for partial refunds if cancelled)
  invested: [{
    resource: { type: String },
    amount: { type: Number },
  }],
  
  // Metadata
  startedAt: { type: Date },
  completedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
});

projectInstanceSchema.index({ guildId: 1, nationId: 1 });
projectInstanceSchema.index({ guildId: 1, status: 1 });
projectInstanceSchema.index({ guildId: 1, templateName: 1 });

const ProjectTemplate = mongoose.model('ProjectTemplate', projectTemplateSchema);
const Project = mongoose.model('Project', projectInstanceSchema);

export { ProjectTemplate };
export default Project;
