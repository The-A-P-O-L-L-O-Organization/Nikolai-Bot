import mongoose from 'mongoose';

// Battle simulation record
const battleSchema = new mongoose.Schema({
  guildId: { type: String, required: true, index: true },
  
  // Battle name/description
  name: { type: String, required: true },
  description: { type: String, default: '' },
  
  // Combatants
  attacker: {
    nation: { type: mongoose.Schema.Types.ObjectId, ref: 'Nation', required: true },
    nationName: { type: String, required: true },
    commander: { type: String, default: null },
    
    // Forces committed
    forces: [{
      unitType: { type: String, required: true },
      quantity: { type: Number, required: true },
      quality: { type: Number, default: 50 },  // 0-100 training/experience
    }],
    
    // Modifiers
    modifiers: {
      terrain: { type: Number, default: 0 },
      supply: { type: Number, default: 0 },
      morale: { type: Number, default: 0 },
      technology: { type: Number, default: 0 },
      doctrine: { type: Number, default: 0 },
      fortifications: { type: Number, default: 0 },
      airSupport: { type: Number, default: 0 },
      navalSupport: { type: Number, default: 0 },
      surprise: { type: Number, default: 0 },
      custom: { type: Number, default: 0 },
    },
    
    // Results
    casualties: { type: Number, default: 0 },
    casualtyPercent: { type: Number, default: 0 },
    equipmentLost: { type: Number, default: 0 },
  },
  
  defender: {
    nation: { type: mongoose.Schema.Types.ObjectId, ref: 'Nation', required: true },
    nationName: { type: String, required: true },
    commander: { type: String, default: null },
    
    forces: [{
      unitType: { type: String, required: true },
      quantity: { type: Number, required: true },
      quality: { type: Number, default: 50 },
    }],
    
    modifiers: {
      terrain: { type: Number, default: 0 },
      supply: { type: Number, default: 0 },
      morale: { type: Number, default: 0 },
      technology: { type: Number, default: 0 },
      doctrine: { type: Number, default: 0 },
      fortifications: { type: Number, default: 0 },
      airSupport: { type: Number, default: 0 },
      navalSupport: { type: Number, default: 0 },
      surprise: { type: Number, default: 0 },
      custom: { type: Number, default: 0 },
    },
    
    casualties: { type: Number, default: 0 },
    casualtyPercent: { type: Number, default: 0 },
    equipmentLost: { type: Number, default: 0 },
  },
  
  // Battle location
  location: { type: String, default: null },
  terrain: {
    type: String,
    enum: ['plains', 'forest', 'mountains', 'urban', 'desert', 'jungle', 'arctic', 'coastal', 'river', 'marsh', 'hills'],
    default: 'plains',
  },
  
  // Battle type
  battleType: {
    type: String,
    enum: ['pitched', 'siege', 'ambush', 'naval', 'aerial', 'amphibious', 'defensive', 'pursuit', 'skirmish'],
    default: 'pitched',
  },
  
  // Status
  status: {
    type: String,
    enum: ['setup', 'simulated', 'resolved'],
    default: 'setup',
  },
  
  // Results
  result: {
    victor: { type: String, enum: ['attacker', 'defender', 'draw', 'pyrrhic_attacker', 'pyrrhic_defender'], default: null },
    victorNation: { type: String, default: null },
    decisiveness: { type: String, enum: ['decisive', 'marginal', 'pyrrhic', 'stalemate'], default: null },
    attackerScore: { type: Number, default: 0 },
    defenderScore: { type: Number, default: 0 },
    narrative: { type: String, default: '' },
    gmNotes: { type: String, default: '' },
  },
  
  // Dice rolls (for transparency)
  rolls: [{
    description: { type: String },
    roll: { type: Number },
    modifier: { type: Number },
    result: { type: Number },
  }],
  
  // Metadata
  createdAt: { type: Date, default: Date.now },
  resolvedAt: { type: Date, default: null },
  createdBy: { type: String, default: null },
});

battleSchema.index({ guildId: 1, status: 1 });
battleSchema.index({ guildId: 1, 'attacker.nation': 1 });
battleSchema.index({ guildId: 1, 'defender.nation': 1 });

const Battle = mongoose.model('Battle', battleSchema);
export default Battle;
