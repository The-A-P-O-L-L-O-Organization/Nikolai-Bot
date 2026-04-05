import mongoose from 'mongoose';

// Nuclear/Arms control treaty - more detailed than generic Treaty
const nuclearTreatySchema = new mongoose.Schema({
  guildId: { type: String, required: true, index: true },
  
  // Treaty name
  name: { type: String, required: true },
  description: { type: String, default: '' },
  
  // Treaty type
  type: {
    type: String,
    enum: ['nuclear_nonproliferation', 'arms_limitation', 'test_ban', 'disarmament', 'demilitarization', 'weapons_ban', 'custom'],
    default: 'custom',
  },
  
  // Status
  status: {
    type: String,
    enum: ['draft', 'proposed', 'ratifying', 'active', 'violated', 'expired', 'withdrawn', 'collapsed'],
    default: 'draft',
  },
  
  // Signatories
  signatories: [{
    nation: { type: mongoose.Schema.Types.ObjectId, ref: 'Nation' },
    nationName: { type: String },
    status: { type: String, enum: ['invited', 'signed', 'ratified', 'withdrawn', 'expelled'], default: 'invited' },
    signedAt: { type: Date, default: null },
    ratifiedAt: { type: Date, default: null },
    withdrawnAt: { type: Date, default: null },
  }],
  
  // Treaty terms/restrictions
  terms: {
    // Nuclear specific
    nuclearWeaponsBan: { type: Boolean, default: false },
    nuclearTestsBan: { type: Boolean, default: false },
    maxWarheads: { type: Number, default: null },
    maxDeliveryVehicles: { type: Number, default: null },
    enrichmentBan: { type: Boolean, default: false },
    inspectionsRequired: { type: Boolean, default: false },
    
    // Conventional arms
    maxTroops: { type: Number, default: null },
    maxTanks: { type: Number, default: null },
    maxAircraft: { type: Number, default: null },
    maxNavalVessels: { type: Number, default: null },
    
    // Other restrictions
    bannedWeapons: [{ type: String }],  // Chemical, biological, cluster munitions, etc.
    demilitarizedZones: [{ type: String }],
    
    // Custom terms
    customTerms: [{ 
      term: { type: String },
      description: { type: String },
    }],
  },
  
  // Verification
  verification: {
    mechanism: { type: String, enum: ['self_report', 'mutual_inspection', 'international_body', 'satellite', 'none'], default: 'self_report' },
    inspectorBody: { type: String, default: null },
    lastInspection: { type: Date, default: null },
    complianceStatus: { type: String, enum: ['compliant', 'minor_violations', 'major_violations', 'unknown'], default: 'unknown' },
  },
  
  // Violations
  violations: [{
    date: { type: Date, default: Date.now },
    violator: { type: mongoose.Schema.Types.ObjectId, ref: 'Nation' },
    violatorName: { type: String },
    description: { type: String },
    severity: { type: String, enum: ['minor', 'moderate', 'major', 'critical'], default: 'minor' },
    response: { type: String },
    resolved: { type: Boolean, default: false },
  }],
  
  // Duration
  effectiveDate: { type: Date, default: null },
  expirationDate: { type: Date, default: null },
  renewalTerms: { type: String, default: null },
  
  // Metadata
  createdAt: { type: Date, default: Date.now },
  createdBy: { type: String, default: null },
});

nuclearTreatySchema.index({ guildId: 1, name: 1 });
nuclearTreatySchema.index({ guildId: 1, status: 1 });
nuclearTreatySchema.index({ guildId: 1, 'signatories.nation': 1 });

const NuclearTreaty = mongoose.model('NuclearTreaty', nuclearTreatySchema);
export default NuclearTreaty;
