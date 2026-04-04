import { readdir } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Load all event handlers
 */
export async function loadEvents(client) {
  const eventsPath = join(__dirname, '..', 'events');
  
  try {
    const eventFiles = await readdir(eventsPath);
    
    for (const file of eventFiles.filter(f => f.endsWith('.js'))) {
      const filePath = join(eventsPath, file);
      const event = await import(`file://${filePath}`);
      
      if (event.once) {
        client.once(event.name, (...args) => event.execute(...args));
      } else {
        client.on(event.name, (...args) => event.execute(...args));
      }
    }
  } catch (error) {
    // Events directory might not exist yet, that's okay
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
}
