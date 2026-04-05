import mongoose from 'mongoose';

const pressReleaseSchema = new mongoose.Schema({
  // Guild (server) this press release belongs to
  guildId: { type: String, required: true, index: true },
  
  // The nation issuing the release
  nationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Nation', required: true },
  nationName: { type: String, required: true },
  
  // Content
  title: { type: String, required: true, maxLength: 256 },
  content: { type: String, required: true, maxLength: 2000 },
  
  // Type of announcement
  type: { 
    type: String, 
    enum: ['declaration', 'statement', 'warning', 'celebration', 'propaganda', 'diplomatic', 'military', 'economic', 'other'],
    default: 'statement'
  },
  
  // Visibility
  isPublic: { type: Boolean, default: true },
  targetNations: [{ type: String }],  // If not public, which nations can see it
  
  // Game context
  turn: { type: Number, required: true },
  year: { type: Number, required: true },
  
  // Who posted this
  postedBy: { type: String, required: true },  // Discord user ID
  postedByTag: { type: String },
  
  // Reactions/responses
  reactions: [{
    nationName: { type: String },
    reaction: { type: String, enum: ['support', 'oppose', 'neutral', 'condemn'] },
    comment: { type: String, maxLength: 500 },
    reactedAt: { type: Date, default: Date.now },
  }],
  
  // Metadata
  createdAt: { type: Date, default: Date.now },
  editedAt: { type: Date, default: null },
});

pressReleaseSchema.index({ guildId: 1, createdAt: -1 });
pressReleaseSchema.index({ guildId: 1, nationId: 1 });
pressReleaseSchema.index({ guildId: 1, turn: 1 });

const PressRelease = mongoose.model('PressRelease', pressReleaseSchema);

export default PressRelease;
