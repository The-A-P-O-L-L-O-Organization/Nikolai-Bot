import mongoose from 'mongoose';

const warSchema = new mongoose.Schema({
  name: { type: String, required: true },
  
  // Belligerents
  aggressors: [{
    nation: { type: mongoose.Schema.Types.ObjectId, ref: 'Nation' },
    nationName: String,
    joinedAt: { type: Date, default: Date.now },
  }],
  defenders: [{
    nation: { type: mongoose.Schema.Types.ObjectId, ref: 'Nation' },
    nationName: String,
    joinedAt: { type: Date, default: Date.now },
  }],
  
  // War details
  reason: { type: String, default: '' },
  startedAt: { type: Date, default: Date.now },
  endedAt: { type: Date, default: null },
  
  // Status
  status: { 
    type: String, 
    enum: ['active', 'ended', 'ceasefire'], 
    default: 'active' 
  },
  outcome: { type: String, default: null },  // 'aggressor_victory', 'defender_victory', 'white_peace', 'stalemate'
  
  // Notes and events
  notes: [{ 
    content: String, 
    addedBy: String,  // Discord user ID
    addedAt: { type: Date, default: Date.now },
  }],
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

warSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

warSchema.index({ status: 1 });

const War = mongoose.model('War', warSchema);

export default War;
