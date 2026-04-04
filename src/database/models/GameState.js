import mongoose from 'mongoose';
import config from '../../config.js';

const gameStateSchema = new mongoose.Schema({
  // Singleton identifier
  _id: { type: String, default: 'gameState' },

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
 * Initialize game state if it doesn't exist
 */
export async function initializeGameState() {
  const existing = await GameState.findById('gameState');
  
  if (!existing) {
    const now = new Date();
    const nextProcessing = new Date(now.getTime() + (config.bot.turnIntervalHours * 60 * 60 * 1000));
    
    await GameState.create({
      _id: 'gameState',
      year: config.bot.startingYear,
      turn: {
        current: 0,
        lastProcessed: null,
        nextProcessing: nextProcessing,
        intervalHours: config.bot.turnIntervalHours,
      },
    });
  }
}

/**
 * Get the current game state
 */
export async function getGameState() {
  return await GameState.findById('gameState');
}

/**
 * Update game state
 */
export async function updateGameState(updates) {
  return await GameState.findByIdAndUpdate('gameState', updates, { new: true });
}

export default GameState;
