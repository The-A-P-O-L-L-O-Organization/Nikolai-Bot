import mongoose from 'mongoose';

// Black Market Transaction - illicit trade
const blackMarketTransactionSchema = new mongoose.Schema({
  guildId: { type: String, required: true, index: true },
  
  // Buyer
  buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'Nation', default: null },
  buyerName: { type: String, default: 'Anonymous' },
  
  // Seller (can be anonymous/system for market listings)
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'Nation', default: null },
  sellerName: { type: String, default: 'Anonymous' },
  
  // Transaction type
  type: {
    type: String,
    enum: ['arms', 'contraband', 'intelligence', 'resources', 'currency', 'technology', 'mercenaries'],
    required: true,
  },
  
  // What's being sold
  item: {
    name: { type: String, required: true },
    category: { type: String, default: null },  // e.g., 'weapons', 'drugs', 'secrets'
    quantity: { type: Number, default: 1 },
    description: { type: String, default: '' },
  },
  
  // Price
  price: {
    amount: { type: Number, required: true },
    currency: { type: String, default: 'Dollars' },
  },
  
  // Market markup (black market premium)
  markup: { type: Number, default: 50 },  // percentage above normal price
  
  // Status
  status: {
    type: String,
    enum: ['listed', 'pending', 'completed', 'failed', 'cancelled', 'seized'],
    default: 'listed',
  },
  
  // Risk and detection
  risk: { type: Number, default: 50, min: 0, max: 100 },  // chance of detection
  detected: { type: Boolean, default: false },
  detectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Nation', default: null },
  
  // Sanctions evasion (if this bypasses active sanctions)
  bypassesSanctions: { type: Boolean, default: false },
  relatedSanction: { type: mongoose.Schema.Types.ObjectId, ref: 'Sanction', default: null },
  
  // Notes
  notes: { type: String, default: '' },
  
  // Metadata
  createdAt: { type: Date, default: Date.now },
  completedAt: { type: Date, default: null },
  expiresAt: { type: Date, default: null },  // for listings
  createdBy: { type: String, default: null },  // Discord user ID
});

blackMarketTransactionSchema.index({ guildId: 1, status: 1 });
blackMarketTransactionSchema.index({ guildId: 1, buyer: 1 });
blackMarketTransactionSchema.index({ guildId: 1, seller: 1 });
blackMarketTransactionSchema.index({ expiresAt: 1 }, { sparse: true });

const BlackMarketTransaction = mongoose.model('BlackMarketTransaction', blackMarketTransactionSchema);

export default BlackMarketTransaction;
