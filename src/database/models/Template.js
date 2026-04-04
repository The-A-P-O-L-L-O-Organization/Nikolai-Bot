import mongoose from 'mongoose';

const templateSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String, default: '' },
  tier: { 
    type: String, 
    enum: ['great_power', 'regional_power', 'minor_nation', 'custom'], 
    default: 'custom' 
  },
  
  // Template data (mirrors Nation schema structure)
  data: {
    leader: { type: String, default: 'Unknown' },
    population: { type: String, default: '1M' },
    populationNumber: { type: Number, default: 1000000 },
    
    economy: {
      gdp: { type: Number, default: 0 },
      budget: { type: Number, default: 0 },
      primaryCurrency: { type: String, default: 'Dollars' },
      currencies: { type: Map, of: Number, default: {} },
      inflation: { type: Number, default: 0 },
    },
    
    resources: { type: Map, of: Number, default: {} },
    stability: { type: Number, default: 50 },
    nukes: { type: Number, default: 0 },
    
    military: {
      army: {
        troops: { type: Number, default: 0 },
        reserves: { type: Number, default: 0 },
        tanks: { type: Number, default: 0 },
        artillery: { type: Number, default: 0 },
        armoredVehicles: { type: Number, default: 0 },
        specialForces: { type: Number, default: 0 },
      },
      airforce: {
        jets: { type: Number, default: 0 },
        bombers: { type: Number, default: 0 },
        reconPlanes: { type: Number, default: 0 },
        transportPlanes: { type: Number, default: 0 },
        helicopters: { type: Number, default: 0 },
      },
      navy: {
        carriers: { type: Number, default: 0 },
        submarines: { type: Number, default: 0 },
        destroyers: { type: Number, default: 0 },
        frigates: { type: Number, default: 0 },
        corvettes: { type: Number, default: 0 },
        battleships: { type: Number, default: 0 },
      },
    },
    
    spirits: [{
      name: { type: String },
      description: { type: String },
      effects: [{
        type: { type: String },
        target: String,
        value: Number,
        description: String,
      }],
    }],
  },
  
  isDefault: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

// name already indexed via unique: true
templateSchema.index({ tier: 1 });

const Template = mongoose.model('Template', templateSchema);

export default Template;
