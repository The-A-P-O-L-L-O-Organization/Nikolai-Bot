import { loadCommands, registerCommands } from './handlers/commandHandler.js';
import config from './config.js';

// Minimal client object with commands collection
const client = {
  commands: new Map(),
};

console.log('🔄 Loading commands...');
await loadCommands(client);
console.log(`✅ Loaded ${client.commands.size} commands`);

console.log('📤 Registering commands with Discord...');
await registerCommands(client);
console.log('✅ Commands registered successfully!');