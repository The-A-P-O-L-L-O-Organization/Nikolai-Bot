import { SlashCommandBuilder, ChannelType } from 'discord.js';
import Nation from '../../database/models/Nation.js';
import TurnReminder from '../../database/models/TurnReminder.js';
import { getGameState } from '../../database/models/GameState.js';
import { createEmbed, errorEmbed, successEmbed } from '../../utils/embeds.js';
import config from '../../config.js';

export const data = new SlashCommandBuilder()
  .setName('reminder')
  .setDescription('Manage turn reminders')
  .addSubcommand(sub =>
    sub.setName('set')
      .setDescription('Set a turn reminder')
      .addStringOption(opt =>
        opt.setName('type')
          .setDescription('When to remind you')
          .setRequired(true)
          .addChoices(
            { name: 'Before turn', value: 'before' },
            { name: 'After turn', value: 'after' },
            { name: 'Both', value: 'both' }
          ))
      .addStringOption(opt =>
        opt.setName('method')
          .setDescription('How to remind you')
          .setRequired(false)
          .addChoices(
            { name: 'DM (Recommended)', value: 'dm' },
            { name: 'Channel mention', value: 'channel' },
            { name: 'Both', value: 'both' }
          ))
      .addIntegerOption(opt =>
        opt.setName('before')
          .setDescription('Minutes before turn to remind (for before/both)')
          .setRequired(false)
          .setMinValue(5)
          .setMaxValue(1440))
      .addChannelOption(opt =>
        opt.setName('channel')
          .setDescription('Channel for mentions (if method is channel/both)')
          .addChannelTypes(ChannelType.GuildText)
          .setRequired(false))
      .addStringOption(opt =>
        opt.setName('message')
          .setDescription('Custom reminder message')
          .setRequired(false)))
  .addSubcommand(sub =>
    sub.setName('remove')
      .setDescription('Remove your turn reminder'))
  .addSubcommand(sub =>
    sub.setName('view')
      .setDescription('View your reminder settings'))
  .addSubcommand(sub =>
    sub.setName('toggle')
      .setDescription('Toggle your reminder on/off'))
  .addSubcommand(sub =>
    sub.setName('next')
      .setDescription('Show when the next turn will process'));

export async function execute(interaction) {
  const subcommand = interaction.options.getSubcommand();
  
  switch (subcommand) {
    case 'set':
      return handleSet(interaction);
    case 'remove':
      return handleRemove(interaction);
    case 'view':
      return handleView(interaction);
    case 'toggle':
      return handleToggle(interaction);
    case 'next':
      return handleNext(interaction);
    default:
      return interaction.reply({ embeds: [errorEmbed('Unknown subcommand')], ephemeral: true });
  }
}

async function handleSet(interaction) {
  const guildId = interaction.guildId;
  const userId = interaction.user.id;
  const type = interaction.options.getString('type');
  const method = interaction.options.getString('method') || 'dm';
  const beforeMinutes = interaction.options.getInteger('before') || 60;
  const channel = interaction.options.getChannel('channel');
  const customMessage = interaction.options.getString('message');
  
  // If method requires channel, make sure it's provided
  if ((method === 'channel' || method === 'both') && !channel) {
    return interaction.reply({ 
      embeds: [errorEmbed('You must specify a channel when using channel or both method')], 
      ephemeral: true 
    });
  }
  
  // Check if user has a nation (optional, but useful for context)
  const nation = await Nation.findOne({ guildId, owner: userId });
  
  // Upsert reminder
  await TurnReminder.findOneAndUpdate(
    { guildId, userId },
    {
      nationId: nation?._id || null,
      nationName: nation?.name || null,
      type,
      method,
      beforeMinutes,
      channelId: channel?.id || null,
      customMessage,
      active: true,
    },
    { upsert: true, new: true }
  );
  
  const embed = successEmbed('Reminder set!')
    .addFields(
      { name: 'When', value: type === 'before' ? `${beforeMinutes} minutes before turn` : type === 'after' ? 'After turn processes' : `${beforeMinutes} min before & after turn`, inline: true },
      { name: 'Method', value: method === 'dm' ? 'Direct Message' : method === 'channel' ? `#${channel.name}` : `DM + #${channel?.name || 'N/A'}`, inline: true }
    );
  
  if (nation) {
    embed.addFields({ name: 'Nation', value: nation.name, inline: true });
  }
  if (customMessage) {
    embed.addFields({ name: 'Custom Message', value: customMessage, inline: false });
  }
  
  return interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleRemove(interaction) {
  const guildId = interaction.guildId;
  const userId = interaction.user.id;
  
  const result = await TurnReminder.findOneAndDelete({ guildId, userId });
  
  if (!result) {
    return interaction.reply({ embeds: [errorEmbed('You don\'t have a reminder set')], ephemeral: true });
  }
  
  return interaction.reply({ embeds: [successEmbed('Reminder removed!')], ephemeral: true });
}

async function handleView(interaction) {
  const guildId = interaction.guildId;
  const userId = interaction.user.id;
  
  const reminder = await TurnReminder.findOne({ guildId, userId });
  
  if (!reminder) {
    return interaction.reply({ 
      embeds: [createEmbed()
        .setTitle('No Reminder Set')
        .setDescription('Use `/reminder set` to create a turn reminder.')
      ], 
      ephemeral: true 
    });
  }
  
  const statusEmoji = reminder.active ? '✅' : '❌';
  const typeText = reminder.type === 'before' 
    ? `${reminder.beforeMinutes} minutes before turn` 
    : reminder.type === 'after' 
    ? 'After turn processes' 
    : `${reminder.beforeMinutes} min before & after turn`;
  
  const embed = createEmbed()
    .setTitle('Your Turn Reminder')
    .addFields(
      { name: 'Status', value: `${statusEmoji} ${reminder.active ? 'Active' : 'Disabled'}`, inline: true },
      { name: 'When', value: typeText, inline: true },
      { name: 'Method', value: reminder.method === 'dm' ? 'Direct Message' : reminder.method === 'channel' ? 'Channel mention' : 'DM + Channel', inline: true }
    );
  
  if (reminder.channelId) {
    embed.addFields({ name: 'Channel', value: `<#${reminder.channelId}>`, inline: true });
  }
  if (reminder.nationName) {
    embed.addFields({ name: 'Nation', value: reminder.nationName, inline: true });
  }
  if (reminder.customMessage) {
    embed.addFields({ name: 'Custom Message', value: reminder.customMessage, inline: false });
  }
  if (reminder.lastReminded) {
    embed.addFields({ 
      name: 'Last Reminded', 
      value: `<t:${Math.floor(reminder.lastReminded.getTime() / 1000)}:R>`, 
      inline: true 
    });
  }
  embed.addFields({ name: 'Total Reminders Sent', value: reminder.reminderCount.toString(), inline: true });
  
  return interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleToggle(interaction) {
  const guildId = interaction.guildId;
  const userId = interaction.user.id;
  
  const reminder = await TurnReminder.findOne({ guildId, userId });
  
  if (!reminder) {
    return interaction.reply({ embeds: [errorEmbed('You don\'t have a reminder set')], ephemeral: true });
  }
  
  reminder.active = !reminder.active;
  await reminder.save();
  
  const statusEmoji = reminder.active ? '✅' : '❌';
  const statusText = reminder.active ? 'enabled' : 'disabled';
  
  return interaction.reply({ 
    embeds: [successEmbed(`Reminder ${statusText}!`)
      .setDescription(`${statusEmoji} Your turn reminder is now ${statusText}.`)
    ], 
    ephemeral: true 
  });
}

async function handleNext(interaction) {
  const guildId = interaction.guildId;
  const gameState = await getGameState(guildId);
  
  if (!gameState || !gameState.turn.nextProcessing) {
    return interaction.reply({ 
      embeds: [createEmbed()
        .setTitle('Turn Schedule')
        .setDescription('No turn is currently scheduled. The GM may need to start the turn scheduler.')
      ],
      ephemeral: true 
    });
  }
  
  const nextTurn = gameState.turn.nextProcessing;
  const timestamp = Math.floor(nextTurn.getTime() / 1000);
  const currentTurn = gameState.turn.current;
  const currentYear = gameState.year;
  
  const embed = createEmbed()
    .setTitle('Turn Schedule')
    .addFields(
      { name: 'Current Turn', value: `Turn ${currentTurn}`, inline: true },
      { name: 'Current Year', value: currentYear.toString(), inline: true },
      { name: 'Turn Interval', value: `${gameState.turn.intervalHours} hours`, inline: true },
      { name: 'Next Turn', value: `<t:${timestamp}:F>`, inline: false },
      { name: 'Time Until', value: `<t:${timestamp}:R>`, inline: true }
    );
  
  // Check if user has a reminder set
  const reminder = await TurnReminder.findOne({ guildId, userId: interaction.user.id });
  if (reminder && reminder.active) {
    embed.addFields({ 
      name: 'Your Reminder', 
      value: `✅ Active (${reminder.type === 'before' ? `${reminder.beforeMinutes} min before` : reminder.type})`, 
      inline: true 
    });
  } else {
    embed.addFields({ name: 'Your Reminder', value: '❌ Not set', inline: true });
  }
  
  return interaction.reply({ embeds: [embed] });
}
