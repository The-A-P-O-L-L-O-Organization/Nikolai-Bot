import { REST, Routes } from 'discord.js';
import { readdir } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import config from '../config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Load all commands from the commands directory
 */
export async function loadCommands(client) {
  const commandsPath = join(__dirname, '..', 'commands');
  const commandFolders = await readdir(commandsPath);

  for (const folder of commandFolders) {
    const folderPath = join(commandsPath, folder);
    const commandFiles = await readdir(folderPath);
    
    for (const file of commandFiles.filter(f => f.endsWith('.js'))) {
      const filePath = join(folderPath, file);
      const command = await import(`file://${filePath}`);
      
      if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
      } else {
        console.warn(`⚠️ Command at ${filePath} is missing required "data" or "execute" export`);
      }
    }
  }
}

/**
 * Register all slash commands with Discord
 */
export async function registerCommands(client) {
  const commands = [];
  
  for (const [, command] of client.commands) {
    commands.push(command.data.toJSON());
  }

  const rest = new REST().setToken(config.discord.token);

  try {
    // Register commands globally or to specific guild
    if (config.discord.guildId) {
      // Guild-specific (faster for development)
      await rest.put(
        Routes.applicationGuildCommands(config.discord.clientId, config.discord.guildId),
        { body: commands }
      );
    } else {
      // Global (takes up to 1 hour to propagate)
      await rest.put(
        Routes.applicationCommands(config.discord.clientId),
        { body: commands }
      );
    }
  } catch (error) {
    console.error('Error registering commands:', error);
    throw error;
  }
}
