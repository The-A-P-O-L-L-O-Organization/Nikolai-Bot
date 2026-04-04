import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  // What was modified
  entityType: { 
    type: String, 
    enum: ['nation', 'war', 'treaty', 'resource', 'unit', 'technology', 'gamestate', 'event'], 
    required: true 
  },
  entityId: { type: mongoose.Schema.Types.ObjectId },
  entityName: { type: String },
  
  // What action was taken
  action: { 
    type: String, 
    enum: ['create', 'update', 'delete', 'transfer', 'production', 'research', 'war', 'treaty'], 
    required: true 
  },
  
  // Details of the change
  field: { type: String },  // Which field was changed
  oldValue: { type: mongoose.Schema.Types.Mixed },
  newValue: { type: mongoose.Schema.Types.Mixed },
  
  // Full description of what happened
  description: { type: String, required: true },
  
  // Who made the change
  performedBy: { type: String, required: true },  // Discord user ID
  performedByTag: { type: String },  // Discord username for display
  
  // When
  turn: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

auditLogSchema.index({ entityType: 1, entityId: 1 });
auditLogSchema.index({ performedBy: 1 });
auditLogSchema.index({ createdAt: -1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

/**
 * Create an audit log entry
 */
export async function createAuditLog(data) {
  return await AuditLog.create(data);
}

/**
 * Get audit logs for an entity
 */
export async function getAuditLogs(entityType, entityId, limit = 50) {
  return await AuditLog.find({ entityType, entityId })
    .sort({ createdAt: -1 })
    .limit(limit);
}

/**
 * Get recent audit logs
 */
export async function getRecentAuditLogs(limit = 50) {
  return await AuditLog.find()
    .sort({ createdAt: -1 })
    .limit(limit);
}

export default AuditLog;
