import mongoose from 'mongoose';
import config from '../../config.js';

const resourceSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  icon: { type: String, default: '📦' },
  type: { 
    type: String, 
    enum: ['currency', 'resource'], 
    default: 'resource' 
  },
  description: { type: String, default: '' },
  isDefault: { type: Boolean, default: false },  // Built-in resources
  createdAt: { type: Date, default: Date.now },
});

resourceSchema.index({ name: 1 });
resourceSchema.index({ type: 1 });

const Resource = mongoose.model('Resource', resourceSchema);

/**
 * Initialize default resources from config
 */
export async function initializeDefaultResources() {
  for (const resource of config.defaultResources) {
    const existing = await Resource.findOne({ name: resource.name });
    if (!existing) {
      await Resource.create(resource);
    }
  }
}

/**
 * Get all resources
 */
export async function getAllResources() {
  return await Resource.find().sort({ type: 1, name: 1 });
}

/**
 * Get all currencies
 */
export async function getAllCurrencies() {
  return await Resource.find({ type: 'currency' }).sort({ name: 1 });
}

/**
 * Get all non-currency resources
 */
export async function getAllNonCurrencyResources() {
  return await Resource.find({ type: 'resource' }).sort({ name: 1 });
}

export default Resource;
