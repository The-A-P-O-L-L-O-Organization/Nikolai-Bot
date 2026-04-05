import mongoose from 'mongoose';

// World Council / UN - international governing body
const worldCouncilSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  
  // Council info
  name: { type: String, default: 'World Council' },
  description: { type: String, default: '' },
  
  // Members
  members: [{
    nation: { type: mongoose.Schema.Types.ObjectId, ref: 'Nation' },
    nationName: { type: String },
    role: {
      type: String,
      enum: ['permanent', 'rotating', 'observer', 'suspended'],
      default: 'rotating',
    },
    vetopower: { type: Boolean, default: false },
    joinedAt: { type: Date, default: Date.now },
  }],
  
  // Permanent security council members (have veto)
  securityCouncil: [{
    nation: { type: mongoose.Schema.Types.ObjectId, ref: 'Nation' },
    nationName: { type: String },
  }],
  
  // Settings
  settings: {
    vetoEnabled: { type: Boolean, default: true },
    rotatingSeats: { type: Number, default: 5 },
    resolutionThreshold: { type: Number, default: 50 },  // % needed to pass
    securityThreshold: { type: Number, default: 60 },    // % for security matters
  },
  
  // Current session
  currentSession: { type: Number, default: 1 },
  
  // Metadata
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  createdBy: { type: String, default: null },
});

worldCouncilSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// World Council Resolution - proposals and votes
const resolutionSchema = new mongoose.Schema({
  guildId: { type: String, required: true, index: true },
  
  // Resolution info
  number: { type: Number, required: true },  // Resolution number
  title: { type: String, required: true },
  description: { type: String, default: '' },
  fullText: { type: String, default: '' },
  
  // Type
  type: {
    type: String,
    enum: ['general', 'security', 'economic', 'humanitarian', 'environmental', 'membership', 'procedural'],
    default: 'general',
  },
  
  // Sponsor
  sponsor: { type: mongoose.Schema.Types.ObjectId, ref: 'Nation' },
  sponsorName: { type: String },
  coSponsors: [{
    nation: { type: mongoose.Schema.Types.ObjectId, ref: 'Nation' },
    nationName: { type: String },
  }],
  
  // Voting
  status: {
    type: String,
    enum: ['draft', 'debate', 'voting', 'passed', 'failed', 'vetoed', 'withdrawn'],
    default: 'draft',
  },
  
  votes: [{
    nation: { type: mongoose.Schema.Types.ObjectId, ref: 'Nation' },
    nationName: { type: String },
    vote: { type: String, enum: ['for', 'against', 'abstain'], required: true },
    votedAt: { type: Date, default: Date.now },
  }],
  
  // Veto tracking
  vetoed: { type: Boolean, default: false },
  vetoedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Nation', default: null },
  vetoedByName: { type: String, default: null },
  
  // Results
  results: {
    votesFor: { type: Number, default: 0 },
    votesAgainst: { type: Number, default: 0 },
    abstentions: { type: Number, default: 0 },
    percentageFor: { type: Number, default: 0 },
  },
  
  // Effects if passed
  effects: [{
    type: { type: String },
    target: { type: String },
    value: { type: String },
    description: { type: String },
  }],
  
  // Voting deadline
  votingEnds: { type: Date, default: null },
  
  // Metadata
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  resolvedAt: { type: Date, default: null },
  createdBy: { type: String, default: null },
});

resolutionSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

resolutionSchema.index({ guildId: 1, number: 1 }, { unique: true });
resolutionSchema.index({ guildId: 1, status: 1 });

const WorldCouncil = mongoose.model('WorldCouncil', worldCouncilSchema);
const Resolution = mongoose.model('Resolution', resolutionSchema);

export { WorldCouncil, Resolution };
