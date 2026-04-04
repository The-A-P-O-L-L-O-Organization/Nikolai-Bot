import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  // Transaction type
  type: { 
    type: String, 
    enum: ['transfer', 'income', 'expense', 'loan', 'loan_payment', 'purchase', 'production', 'adjustment'], 
    required: true 
  },
  
  // Parties involved
  from: {
    nation: { type: mongoose.Schema.Types.ObjectId, ref: 'Nation' },
    nationName: String,
  },
  to: {
    nation: { type: mongoose.Schema.Types.ObjectId, ref: 'Nation' },
    nationName: String,
  },
  
  // Amount
  currency: { type: String, required: true },
  amount: { type: Number, required: true },
  
  // Additional context
  description: { type: String, default: '' },
  
  // Who initiated this
  initiatedBy: { type: String, default: null },  // Discord user ID
  
  // Turn this occurred on
  turn: { type: Number, default: 0 },
  
  createdAt: { type: Date, default: Date.now },
});

transactionSchema.index({ 'from.nation': 1 });
transactionSchema.index({ 'to.nation': 1 });
transactionSchema.index({ createdAt: -1 });
transactionSchema.index({ turn: 1 });

const Transaction = mongoose.model('Transaction', transactionSchema);

export default Transaction;
