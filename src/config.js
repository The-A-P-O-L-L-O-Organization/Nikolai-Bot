import 'dotenv/config';

export default {
  // Discord Configuration
  discord: {
    token: process.env.DISCORD_TOKEN,
    clientId: process.env.CLIENT_ID,
    guildId: process.env.GUILD_ID,
  },

  // MongoDB Configuration
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/nikolai',
  },

  // Bot Configuration
  bot: {
    gmRoleName: process.env.GM_ROLE_NAME || 'GM',
    turnIntervalHours: parseInt(process.env.TURN_INTERVAL_HOURS) || 12,
    startingYear: parseInt(process.env.STARTING_YEAR) || 1960,
    turnChannel: process.env.TURN_CHANNEL || 'game-updates',
  },

  // Colors for embeds
  colors: {
    primary: 0x5865F2,    // Discord Blurple
    success: 0x57F287,    // Green
    warning: 0xFEE75C,    // Yellow
    error: 0xED4245,      // Red
    info: 0x5865F2,       // Blue
    economy: 0xF1C40F,    // Gold
    military: 0xE74C3C,   // Red
    diplomacy: 0x3498DB,  // Blue
    research: 0x9B59B6,   // Purple
  },

  // Default resources that come with the bot
  defaultResources: [
    // Currencies
    { name: 'Dollars', icon: '$', type: 'currency', isDefault: true },
    { name: 'Euros', icon: '€', type: 'currency', isDefault: true },
    { name: 'Reichsmarks', icon: 'ℛℳ', type: 'currency', isDefault: true },
    { name: 'Yen', icon: '¥', type: 'currency', isDefault: true },
    { name: 'Rubles', icon: '₽', type: 'currency', isDefault: true },
    // Basic Resources
    { name: 'Oil', icon: '🛢️', type: 'resource', isDefault: true },
    { name: 'Steel', icon: '🔩', type: 'resource', isDefault: true },
    { name: 'Food', icon: '🌾', type: 'resource', isDefault: true },
    { name: 'Aluminum', icon: '🪨', type: 'resource', isDefault: true },
    { name: 'Rubber', icon: '⚫', type: 'resource', isDefault: true },
    // Advanced Resources
    { name: 'Uranium', icon: '☢️', type: 'resource', isDefault: true },
    { name: 'Rare Earth', icon: '💎', type: 'resource', isDefault: true },
    { name: 'Electronics', icon: '🔌', type: 'resource', isDefault: true },
  ],

  // Effect types for spirits
  effectTypes: [
    'income_modifier',
    'production_speed',
    'research_speed',
    'stability_modifier',
    'military_modifier',
    'diplomacy_bonus',
    'resource_income',
    'maintenance_modifier',
    'population_growth',
    'custom',
  ],
};
