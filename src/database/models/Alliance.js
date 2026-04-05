import mongoose from 'mongoose';

// Alliance - formal agreements between nations
const allianceSchema = new mongoose.Schema({
  guildId: { type: String, required: true, index: true },
  
  // Alliance name and details
  name: { type: String, required: true },
  acronym: { type: String, default: null },
  description: { type: String, default: '' },
  flag: { type: String, default: null },  // URL to alliance flag
  
  // Alliance type
  type: {
    type: String,
    enum: ['military', 'economic', 'defensive', 'offensive', 'mutual_defense', 'trade_bloc', 'political_union', 'custom'],
    default: 'military',
  },
  
  // Members
  members: [{
    nation: { type: mongoose.Schema.Types.ObjectId, ref: 'Nation' },
    nationName: { type: String },
    role: {
      type: String,
      enum: ['leader', 'founder', 'member', 'observer', 'applicant'],
      default: 'member',
    },
    joinedAt: { type: Date, default: Date.now },
    votingPower: { type: Number, default: 1 },
  }],
  
  // Leadership
  leader: { type: mongoose.Schema.Types.ObjectId, ref: 'Nation', default: null },
  leaderName: { type: String, default: null },
  
  // Alliance terms
  terms: {
    mutualDefense: { type: Boolean, default: true },
    economicCooperation: { type: Boolean, default: false },
    intelligenceSharing: { type: Boolean, default: false },
    militaryAccess: { type: Boolean, default: false },
    collectiveSanctions: { type: Boolean, default: false },
    customTerms: [{ type: String }],
  },
  
  // Voting requirements
  voting: {
    admissionRequires: { type: String, enum: ['majority', 'supermajority', 'unanimous', 'leader'], default: 'majority' },
    warRequires: { type: String, enum: ['majority', 'supermajority', 'unanimous', 'leader'], default: 'supermajority' },
    expulsionRequires: { type: String, enum: ['majority', 'supermajority', 'unanimous', 'leader'], default: 'supermajority' },
  },
  
  // Status
  status: {
    type: String,
    enum: ['active', 'inactive', 'dissolved'],
    default: 'active',
  },
  
  // Metadata
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  dissolvedAt: { type: Date, default: null },
  createdBy: { type: String, default: null },
});

allianceSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

allianceSchema.index({ guildId: 1, name: 1 }, { unique: true });
allianceSchema.index({ guildId: 1, 'members.nation': 1 });

const Alliance = mongoose.model('Alliance', allianceSchema);

export default Alliance;
