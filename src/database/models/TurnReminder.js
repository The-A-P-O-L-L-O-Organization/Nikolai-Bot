import mongoose from 'mongoose';

// Turn reminders - notify users before/after turns process
const turnReminderSchema = new mongoose.Schema({
  guildId: { type: String, required: true, index: true },
  
  // Who to remind
  userId: { type: String, required: true },       // Discord user ID
  nationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Nation', default: null },
  nationName: { type: String, default: null },
  
  // Reminder settings
  type: {
    type: String,
    enum: ['before', 'after', 'both'],
    default: 'before',
  },
  
  // How long before turn to remind (in minutes)
  beforeMinutes: { type: Number, default: 60 },
  
  // Whether to DM or mention in channel
  method: {
    type: String,
    enum: ['dm', 'channel', 'both'],
    default: 'dm',
  },
  
  // Channel to mention in (if method is channel or both)
  channelId: { type: String, default: null },
  
  // Custom message
  customMessage: { type: String, default: null },
  
  // Active status
  active: { type: Boolean, default: true },
  
  // Tracking
  lastReminded: { type: Date, default: null },
  reminderCount: { type: Number, default: 0 },
  
  // Metadata
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Update timestamp on save
turnReminderSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Compound index
turnReminderSchema.index({ guildId: 1, userId: 1 }, { unique: true });
turnReminderSchema.index({ active: 1, type: 1 });

const TurnReminder = mongoose.model('TurnReminder', turnReminderSchema);

export default TurnReminder;
