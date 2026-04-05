import mongoose from 'mongoose';
import config from '../../config.js';

const gameStateSchema = new mongoose.Schema({
  // Guild (server) this game state belongs to
  guildId: { type: String, required: true, unique: true },

  // Current game year
  year: { type: Number, default: 1960 },

  // Turn information
  turn: {
    current: { type: Number, default: 0 },
    lastProcessed: { type: Date, default: null },
    nextProcessing: { type: Date, default: null },
    intervalHours: { type: Number, default: 12 },
  },

  // Settings
  settings: {
    yearPerTurn: { type: Number, default: 1 },  // How many years pass per turn
    randomEventChance: { type: Number, default: 10 },  // Percentage chance per nation per turn
    autoAdvanceYear: { type: Boolean, default: true },
    turnAnnouncementChannel: { type: String, default: null },  // Channel ID
  },

  // Metadata
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

gameStateSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

const GameState = mongoose.model('GameState', gameStateSchema);

/**
 * Initialize game state for a guild if it doesn't exist
 */
export async function initializeGameState(guildId) {
  const existing = await GameState.findOne({ guildId });
  
  if (!existing) {
    const now = new Date();
    const nextProcessing = new Date(now.getTime() + (config.bot.turnIntervalHours * 60 * 60 * 1000));
    
    await GameState.create({
      guildId,
      year: config.bot.startingYear,
      turn: {
        current: 0,
        lastProcessed: null,
        nextProcessing: nextProcessing,
        intervalHours: config.bot.turnIntervalHours,
      },
    });
  }
  
  return await GameState.findOne({ guildId });
}

/**
 * Get the current game state for a guild
 */
export async function getGameState(guildId) {
  return await GameState.findOne({ guildId });
}

/**
 * Update game state for a guild
 */
export async function updateGameState(guildId, updates) {
  return await GameState.findOneAndUpdate({ guildId }, updates, { new: true });
}

export default GameState;
