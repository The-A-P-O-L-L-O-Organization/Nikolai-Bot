import { Client, GatewayIntentBits, Collection } from 'discord.js';
import mongoose from 'mongoose';
import config from './config.js';
import { loadCommands, registerCommands } from './handlers/commandHandler.js';
import { loadEvents } from './handlers/eventHandler.js';
import { startTurnScheduler } from './systems/turnProcessor.js';
import { initializeGameState } from './database/models/GameState.js';
import { initializeDefaultResources } from './database/models/Resource.js';
import { initializeDefaultUnits } from './database/models/Unit.js';

// Create Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
  ],
});

// Collection to store commands
client.commands = new Collection();

// Main startup function
async function start() {
  try {
    console.log('🚀 Starting Nikolai Bot...');

    // Connect to MongoDB
    console.log('📦 Connecting to MongoDB...');
    await mongoose.connect(config.mongodb.uri);
    console.log('✅ Connected to MongoDB');

    // Initialize game state if not exists
    await initializeGameState();
    console.log('✅ Game state initialized');

    // Initialize default resources
    await initializeDefaultResources();
    console.log('✅ Default resources initialized');

    // Initialize default units
    await initializeDefaultUnits();
    console.log('✅ Default units initialized');

    // Load commands
    console.log('📂 Loading commands...');
    await loadCommands(client);
    console.log(`✅ Loaded ${client.commands.size} commands`);

    // Load events
    console.log('📂 Loading events...');
    await loadEvents(client);
    console.log('✅ Events loaded');

    // Register slash commands
    console.log('📝 Registering slash commands...');
    await registerCommands(client);
    console.log('✅ Slash commands registered');

    // Login to Discord
    console.log('🔐 Logging in to Discord...');
    await client.login(config.discord.token);

    // Start turn scheduler after bot is ready
    client.once('ready', () => {
      console.log(`✅ Logged in as ${client.user.tag}`);
      startTurnScheduler(client);
      console.log(`⏰ Turn scheduler started (every ${config.bot.turnIntervalHours} hours)`);
      console.log('🎮 Nikolai Bot is ready!');
    });

  } catch (error) {
    console.error('❌ Failed to start bot:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down...');
  await mongoose.connection.close();
  client.destroy();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down...');
  await mongoose.connection.close();
  client.destroy();
  process.exit(0);
});

// Start the bot
start();
