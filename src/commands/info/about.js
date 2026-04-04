import { SlashCommandBuilder, version as djsVersion } from 'discord.js';
import { createEmbed } from '../../utils/embeds.js';
import { getGameState } from '../../database/models/GameState.js';
import Nation from '../../database/models/Nation.js';
import War from '../../database/models/War.js';
import Treaty from '../../database/models/Treaty.js';
import Technology from '../../database/models/Technology.js';
import config from '../../config.js';

export const data = new SlashCommandBuilder()
  .setName('about')
  .setDescription('Information about the Nikolai Bot');

export async function execute(interaction) {
  const gameState = await getGameState();
  
  // Get statistics
  const [nationCount, activeWars, activeTreaties, techCount] = await Promise.all([
    Nation.countDocuments(),
    War.countDocuments({ status: 'active' }),
    Treaty.countDocuments({ status: 'active' }),
    Technology.countDocuments(),
  ]);

  const embed = createEmbed({
    title: 'Nikolai Bot',
    description: 'A comprehensive Discord bot for managing Nation Roleplay (NRP) games.',
    color: config.colors.primary,
    thumbnail: interaction.client.user.displayAvatarURL(),
  });

  embed.addFields(
    {
      name: 'Features',
      value: [
        '**Nations** - Create and manage nations with detailed stats',
        '**Economy** - Multiple currencies, GDP, budgets, loans',
        '**Military** - Army, Airforce, Navy with production queues',
        '**Diplomacy** - Wars and treaties between nations',
        '**Research** - Technology trees and research progress',
        '**Spirits** - National traits with mechanical effects',
        '**Turns** - Automatic turn processing every 12 hours',
      ].join('\n'),
      inline: false,
    },
    {
      name: 'Game Statistics',
      value: [
        `**Nations:** ${nationCount}`,
        `**Active Wars:** ${activeWars}`,
        `**Active Treaties:** ${activeTreaties}`,
        `**Technologies:** ${techCount}`,
        `**Current Year:** ${gameState?.year || 'Not set'}`,
        `**Current Turn:** ${gameState?.turn?.current || 0}`,
      ].join('\n'),
      inline: true,
    },
    {
      name: 'Technical Info',
      value: [
        `**Discord.js:** v${djsVersion}`,
        `**Node.js:** ${process.version}`,
        `**Uptime:** ${formatUptime(interaction.client.uptime)}`,
        `**Servers:** ${interaction.client.guilds.cache.size}`,
      ].join('\n'),
      inline: true,
    },
    {
      name: 'Quick Start',
      value: [
        '1. Use `/nation create` to create nations',
        '2. Use `/economy set` to configure currencies',
        '3. Use `/turn settings` to enable auto-turns',
        '4. Use `/help` for detailed command info',
      ].join('\n'),
      inline: false,
    },
  );

  embed.setFooter({ text: 'Made for Nation Roleplay communities' });

  await interaction.reply({ embeds: [embed] });
}

function formatUptime(ms) {
  if (!ms) return 'Unknown';
  
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h ${minutes % 60}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}
