import mongoose from 'mongoose';

const costSchema = new mongoose.Schema({
  resource: { type: String, required: true },
  amount: { type: Number, required: true },
});

const unitSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  category: { 
    type: String, 
    enum: ['army', 'airforce', 'navy'], 
    required: true 
  },
  description: { type: String, default: '' },
  
  // Production costs
  costs: [costSchema],
  productionTime: { type: Number, default: 1 },  // Turns to produce
  
  // Maintenance per turn (optional)
  maintenance: [costSchema],
  
  // Stats (for display, GM interprets)
  stats: {
    attack: { type: Number, default: 0 },
    defense: { type: Number, default: 0 },
    speed: { type: Number, default: 0 },
  },
  
  // Built-in unit flag
  isDefault: { type: Boolean, default: false },
  
  createdAt: { type: Date, default: Date.now },
});

// name already indexed via unique: true
unitSchema.index({ category: 1 });

const Unit = mongoose.model('Unit', unitSchema);

// Default units
const defaultUnits = [
  // Army
  { name: 'Troops', category: 'army', isDefault: true, productionTime: 1 },
  { name: 'Reserves', category: 'army', isDefault: true, productionTime: 1 },
  { name: 'Tanks', category: 'army', isDefault: true, productionTime: 2 },
  { name: 'Artillery', category: 'army', isDefault: true, productionTime: 2 },
  { name: 'Armored Vehicles', category: 'army', isDefault: true, productionTime: 1 },
  { name: 'Special Forces', category: 'army', isDefault: true, productionTime: 3 },
  
  // Airforce
  { name: 'Jet Fighters', category: 'airforce', isDefault: true, productionTime: 2 },
  { name: 'Bombers', category: 'airforce', isDefault: true, productionTime: 3 },
  { name: 'Recon Planes', category: 'airforce', isDefault: true, productionTime: 2 },
  { name: 'Transport Planes', category: 'airforce', isDefault: true, productionTime: 2 },
  { name: 'Helicopters', category: 'airforce', isDefault: true, productionTime: 1 },
  
  // Navy
  { name: 'Carriers', category: 'navy', isDefault: true, productionTime: 5 },
  { name: 'Submarines', category: 'navy', isDefault: true, productionTime: 3 },
  { name: 'Destroyers', category: 'navy', isDefault: true, productionTime: 3 },
  { name: 'Frigates', category: 'navy', isDefault: true, productionTime: 2 },
  { name: 'Corvettes', category: 'navy', isDefault: true, productionTime: 2 },
  { name: 'Battleships', category: 'navy', isDefault: true, productionTime: 4 },
];

/**
 * Initialize default units
 */
export async function initializeDefaultUnits() {
  for (const unit of defaultUnits) {
    const existing = await Unit.findOne({ name: unit.name });
    if (!existing) {
      await Unit.create(unit);
    }
  }
}

/**
 * Get all units by category
 */
export async function getUnitsByCategory(category) {
  return await Unit.find({ category }).sort({ name: 1 });
}

/**
 * Get all units
 */
export async function getAllUnits() {
  return await Unit.find().sort({ category: 1, name: 1 });
}

export default Unit;
