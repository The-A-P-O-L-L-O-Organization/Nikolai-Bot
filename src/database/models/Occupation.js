import mongoose from 'mongoose';

// Military occupation of territory
const occupationSchema = new mongoose.Schema({
  guildId: { type: String, required: true, index: true },
  
  // Occupying nation
  occupier: { type: mongoose.Schema.Types.ObjectId, ref: 'Nation', required: true },
  occupierName: { type: String, required: true },
  
  // Occupied nation/territory
  occupied: { type: mongoose.Schema.Types.ObjectId, ref: 'Nation', default: null },
  occupiedName: { type: String, required: true },
  
  // Territory details
  territory: {
    name: { type: String, default: null },          // Specific region name
    size: { type: String, default: 'partial' },     // full, partial, minor
    population: { type: Number, default: 0 },
    economicValue: { type: Number, default: 0 },    // Resource/GDP value
  },
  
  // Occupation type
  type: {
    type: String,
    enum: ['military', 'administrative', 'colonial', 'protective', 'peacekeeping', 'annexation'],
    default: 'military',
  },
  
  // Status
  status: {
    type: String,
    enum: ['active', 'resisted', 'stable', 'ending', 'ended'],
    default: 'active',
  },
  
  // Garrison
  garrison: {
    troops: { type: Number, default: 0 },
    quality: { type: Number, default: 50 },
    monthlyMaintenance: { type: Number, default: 0 },
    currency: { type: String, default: 'Dollars' },
  },
  
  // Resistance
  resistance: {
    level: { type: Number, default: 20 },            // 0-100 resistance intensity
    type: { type: String, enum: ['passive', 'active', 'armed', 'insurgency', 'none'], default: 'passive' },
    partisanStrength: { type: Number, default: 0 },  // Number of active partisans
    civilianSupport: { type: Number, default: 50 },  // % of population supporting resistance
  },
  
  // Extraction/exploitation
  extraction: {
    resourcesPerTurn: { type: Number, default: 0 },
    wealthPerTurn: { type: Number, default: 0 },
    laborForce: { type: Number, default: 0 },
    exploitationLevel: { type: String, enum: ['minimal', 'moderate', 'heavy', 'total'], default: 'moderate' },
  },
  
  // Policies
  policies: {
    governance: { type: String, enum: ['martial_law', 'military_admin', 'puppet_govt', 'direct_rule', 'autonomy'], default: 'military_admin' },
    civilianTreatment: { type: String, enum: ['harsh', 'strict', 'neutral', 'lenient', 'hearts_minds'], default: 'neutral' },
    economicPolicy: { type: String, enum: ['exploitation', 'integration', 'development', 'neglect'], default: 'exploitation' },
  },
  
  // Atrocities/events
  events: [{
    date: { type: Date, default: Date.now },
    type: { type: String },
    description: { type: String },
    casualtiesCivilian: { type: Number, default: 0 },
    casualtiesMilitary: { type: Number, default: 0 },
    internationalResponse: { type: String },
  }],
  
  // International response
  internationalPressure: { type: Number, default: 0 },  // 0-100
  sanctionsApplied: { type: Boolean, default: false },
  
  // Duration
  startDate: { type: Date, default: Date.now },
  endDate: { type: Date, default: null },
  
  // Metadata
  createdBy: { type: String, default: null },
});

occupationSchema.index({ guildId: 1, occupier: 1, status: 1 });
occupationSchema.index({ guildId: 1, occupied: 1, status: 1 });

const Occupation = mongoose.model('Occupation', occupationSchema);
export default Occupation;
