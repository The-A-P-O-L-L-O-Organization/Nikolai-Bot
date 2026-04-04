import { EmbedBuilder, ChannelType, PermissionFlagsBits } from 'discord.js';
import config from '../config.js';

export const name = 'guildCreate';

export async function execute(guild) {
  console.log(`Joined new server: ${guild.name} (${guild.id})`);

  // Find the best channel to send the welcome message
  const channel = findWelcomeChannel(guild);
  
  if (!channel) {
    console.log(`Could not find a suitable channel in ${guild.name}`);
    return;
  }

  const embed = new EmbedBuilder()
    .setColor(config.colors.primary)
    .setTitle('Hello! I\'m Nikolai')
    .setDescription(
      `Thanks for adding me to **${guild.name}**!\n\n` +
      `I'm a comprehensive **Nation Roleplay (NRP)** management bot designed to help Game Masters run immersive nation-based roleplay games.`
    )
    .addFields(
      {
        name: 'What I Can Do',
        value: [
          '**Nations** - Create and manage nations with detailed stats',
          '**Economy** - Multiple currencies, GDP, loans, and trade',
          '**Military** - Army, Navy, Airforce with production queues',
          '**Diplomacy** - Wars, treaties, and alliances',
          '**Research** - Technology trees and progression',
          '**Turns** - Automatic processing every 12 hours',
        ].join('\n'),
        inline: false,
      },
      {
        name: 'Getting Started',
        value: [
          `1. Create a role called **@${config.bot.gmRoleName}** for your Game Masters`,
          '2. Use `/help` to see all available commands',
          '3. Use `/nation create` to set up your first nation',
          '4. Use `/turn channel` to set where I announce turn results',
        ].join('\n'),
        inline: false,
      },
      {
        name: 'Documentation',
        value: `For a complete guide on all commands and features, check out the **[GM Usage Guide](https://github.com/The-A-P-O-L-L-O-Organization/Nikolai-Bot/blob/main/USAGE.md)**.`,
        inline: false,
      },
    )
    .setFooter({ text: 'Use /about for bot info • /help for commands' })
    .setTimestamp();

  try {
    await channel.send({ embeds: [embed] });
    console.log(`Sent welcome message to #${channel.name} in ${guild.name}`);
  } catch (error) {
    console.error(`Failed to send welcome message in ${guild.name}:`, error);
  }
}

/**
 * Find the best channel to send the welcome message
 * Priority: system channel > general > first available text channel
 */
function findWelcomeChannel(guild) {
  const botMember = guild.members.me;

  // Try system channel first (where Discord sends join messages)
  if (guild.systemChannel && canSendMessages(guild.systemChannel, botMember)) {
    return guild.systemChannel;
  }

  // Try to find a "general" or "welcome" channel
  const preferredNames = ['general', 'welcome', 'lobby', 'chat', 'main', 'lounge'];
  for (const name of preferredNames) {
    const channel = guild.channels.cache.find(
      ch => ch.type === ChannelType.GuildText &&
            ch.name.toLowerCase().includes(name) &&
            canSendMessages(ch, botMember)
    );
    if (channel) return channel;
  }

  // Fall back to first text channel we can send to
  return guild.channels.cache.find(
    ch => ch.type === ChannelType.GuildText && canSendMessages(ch, botMember)
  );
}

/**
 * Check if the bot can send messages in a channel
 */
function canSendMessages(channel, botMember) {
  if (!botMember) return false;
  const permissions = channel.permissionsFor(botMember);
  return permissions && 
         permissions.has(PermissionFlagsBits.ViewChannel) && 
         permissions.has(PermissionFlagsBits.SendMessages);
}
