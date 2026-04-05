import { SlashCommandBuilder } from 'discord.js';
import Nation from '../../database/models/Nation.js';
import PressRelease from '../../database/models/PressRelease.js';
import { getGameState } from '../../database/models/GameState.js';
import { createHistoryEntry } from '../../database/models/HistoryEntry.js';
import { createAuditLog } from '../../database/models/AuditLog.js';
import { isGM, requireGM, canModifyNation } from '../../utils/permissions.js';
import { createEmbed, errorEmbed, successEmbed } from '../../utils/embeds.js';
import config from '../../config.js';

const RELEASE_TYPES = {
  declaration: { label: 'Declaration', color: 0xE74C3C, emoji: '📜' },
  statement: { label: 'Official Statement', color: 0x3498DB, emoji: '📰' },
  warning: { label: 'Warning', color: 0xE67E22, emoji: '⚠️' },
  celebration: { label: 'Celebration', color: 0x2ECC71, emoji: '🎉' },
  propaganda: { label: 'Propaganda', color: 0x9B59B6, emoji: '📢' },
  diplomatic: { label: 'Diplomatic Notice', color: 0x1ABC9C, emoji: '🤝' },
  military: { label: 'Military Communiqué', color: 0xC0392B, emoji: '⚔️' },
  economic: { label: 'Economic Report', color: 0xF1C40F, emoji: '💰' },
  other: { label: 'Announcement', color: 0x95A5A6, emoji: '📋' },
};

export const data = new SlashCommandBuilder()
  .setName('press')
  .setDescription('Issue and view press releases from nations')
  .addSubcommand(sub =>
    sub.setName('release')
      .setDescription('Issue a press release from your nation')
      .addStringOption(opt =>
        opt.setName('nation')
          .setDescription('Nation issuing the release')
          .setRequired(true)
          .setAutocomplete(true))
      .addStringOption(opt =>
        opt.setName('title')
          .setDescription('Title of the press release')
          .setRequired(true)
          .setMaxLength(256))
      .addStringOption(opt =>
        opt.setName('content')
          .setDescription('Content of the press release')
          .setRequired(true)
          .setMaxLength(2000))
      .addStringOption(opt =>
        opt.setName('type')
          .setDescription('Type of announcement')
          .setRequired(false)
          .addChoices(
            { name: 'Declaration', value: 'declaration' },
            { name: 'Official Statement', value: 'statement' },
            { name: 'Warning', value: 'warning' },
            { name: 'Celebration', value: 'celebration' },
            { name: 'Propaganda', value: 'propaganda' },
            { name: 'Diplomatic Notice', value: 'diplomatic' },
            { name: 'Military Communiqué', value: 'military' },
            { name: 'Economic Report', value: 'economic' },
            { name: 'Other', value: 'other' },
          )))
  .addSubcommand(sub =>
    sub.setName('view')
      .setDescription('View recent press releases')
      .addStringOption(opt =>
        opt.setName('nation')
          .setDescription('Filter by nation')
          .setRequired(false)
          .setAutocomplete(true))
      .addIntegerOption(opt =>
        opt.setName('limit')
          .setDescription('Number of releases to show (default: 10)')
          .setRequired(false)
          .setMinValue(1)
          .setMaxValue(25)))
  .addSubcommand(sub =>
    sub.setName('read')
      .setDescription('Read a specific press release')
      .addStringOption(opt =>
        opt.setName('id')
          .setDescription('Press release ID')
          .setRequired(true)))
  .addSubcommand(sub =>
    sub.setName('react')
      .setDescription('React to a press release as a nation')
      .addStringOption(opt =>
        opt.setName('id')
          .setDescription('Press release ID')
          .setRequired(true))
      .addStringOption(opt =>
        opt.setName('nation')
          .setDescription('Nation reacting')
          .setRequired(true)
          .setAutocomplete(true))
      .addStringOption(opt =>
        opt.setName('reaction')
          .setDescription('Your reaction')
          .setRequired(true)
          .addChoices(
            { name: 'Support', value: 'support' },
            { name: 'Oppose', value: 'oppose' },
            { name: 'Neutral', value: 'neutral' },
            { name: 'Condemn', value: 'condemn' },
          ))
      .addStringOption(opt =>
        opt.setName('comment')
          .setDescription('Optional comment')
          .setRequired(false)
          .setMaxLength(500)))
  .addSubcommand(sub =>
    sub.setName('delete')
      .setDescription('[GM] Delete a press release')
      .addStringOption(opt =>
        opt.setName('id')
          .setDescription('Press release ID')
          .setRequired(true)));

export async function execute(interaction) {
  const subcommand = interaction.options.getSubcommand();

  switch (subcommand) {
    case 'release':
      return handleRelease(interaction);
    case 'view':
      return handleView(interaction);
    case 'read':
      return handleRead(interaction);
    case 'react':
      return handleReact(interaction);
    case 'delete':
      return handleDelete(interaction);
  }
}

async function handleRelease(interaction) {
  const guildId = interaction.guildId;
  const nationName = interaction.options.getString('nation');
  const title = interaction.options.getString('title');
  const content = interaction.options.getString('content');
  const type = interaction.options.getString('type') || 'statement';

  const nation = await Nation.findOne({ guildId, name: { $regex: new RegExp(`^${nationName}$`, 'i') } });
  if (!nation) {
    return interaction.reply({ embeds: [errorEmbed(`Nation **${nationName}** not found.`)], ephemeral: true });
  }

  // Check permission (nation owner or GM)
  if (!canModifyNation(interaction.member, nation)) {
    return interaction.reply({
      embeds: [errorEmbed(`You don't have permission to issue press releases for **${nation.name}**.`)],
      ephemeral: true,
    });
  }

  const gameState = await getGameState(guildId);
  const turn = gameState?.turn?.current || 0;
  const year = gameState?.year || 1960;

  const release = await PressRelease.create({
    guildId,
    nationId: nation._id,
    nationName: nation.name,
    title,
    content,
    type,
    turn,
    year,
    postedBy: interaction.user.id,
    postedByTag: interaction.user.tag,
  });

  // Create history entry
  await createHistoryEntry({
    guildId,
    turn,
    year,
    title: `Press Release: ${title}`,
    description: `**${nation.name}** issued a ${RELEASE_TYPES[type].label.toLowerCase()}.`,
    category: 'political',
    nations: [nation.name],
    isAutoGenerated: true,
  });

  // Audit log
  await createAuditLog({
    guildId,
    entityType: 'press_release',
    entityId: release._id,
    entityName: title,
    action: 'create',
    description: `**${nation.name}** issued press release: "${title}"`,
    performedBy: interaction.user.id,
    performedByTag: interaction.user.tag,
  });

  const typeInfo = RELEASE_TYPES[type];
  const embed = createEmbed({
    title: `${typeInfo.emoji} ${title}`,
    description: content,
    color: typeInfo.color,
    footer: { text: `${nation.name} • Year ${year} • Turn ${turn} • ID: ${release._id}` },
    timestamp: new Date(),
  });

  embed.setAuthor({ name: `${nation.name} - ${typeInfo.label}`, iconURL: nation.flag || undefined });

  await interaction.reply({ 
    content: `**${nation.name}** has issued a ${typeInfo.label.toLowerCase()}!`,
    embeds: [embed] 
  });
}

async function handleView(interaction) {
  const guildId = interaction.guildId;
  const nationName = interaction.options.getString('nation');
  const limit = interaction.options.getInteger('limit') || 10;

  const query = { guildId };
  if (nationName) {
    const nation = await Nation.findOne({ guildId, name: { $regex: new RegExp(`^${nationName}$`, 'i') } });
    if (!nation) {
      return interaction.reply({ embeds: [errorEmbed(`Nation **${nationName}** not found.`)], ephemeral: true });
    }
    query.nationId = nation._id;
  }

  const releases = await PressRelease.find(query)
    .sort({ createdAt: -1 })
    .limit(limit);

  if (releases.length === 0) {
    return interaction.reply({
      embeds: [errorEmbed(nationName ? `No press releases from **${nationName}**.` : 'No press releases yet.')],
      ephemeral: true,
    });
  }

  const embed = createEmbed({
    title: nationName ? `Press Releases from ${nationName}` : 'Recent Press Releases',
    color: config.colors.primary,
  });

  const releaseList = releases.map(r => {
    const typeInfo = RELEASE_TYPES[r.type] || RELEASE_TYPES.other;
    const reactions = r.reactions?.length || 0;
    return `${typeInfo.emoji} **${r.title}**\n` +
           `   *${r.nationName}* • Year ${r.year} • ${reactions} reaction(s)\n` +
           `   ID: \`${r._id}\``;
  }).join('\n\n');

  embed.setDescription(releaseList);
  embed.setFooter({ text: `Use /press read <id> to read full content` });

  await interaction.reply({ embeds: [embed] });
}

async function handleRead(interaction) {
  const guildId = interaction.guildId;
  const releaseId = interaction.options.getString('id');

  let release;
  try {
    release = await PressRelease.findOne({ _id: releaseId, guildId });
  } catch {
    return interaction.reply({ embeds: [errorEmbed('Invalid press release ID.')], ephemeral: true });
  }

  if (!release) {
    return interaction.reply({ embeds: [errorEmbed('Press release not found.')], ephemeral: true });
  }

  const typeInfo = RELEASE_TYPES[release.type] || RELEASE_TYPES.other;
  const embed = createEmbed({
    title: `${typeInfo.emoji} ${release.title}`,
    description: release.content,
    color: typeInfo.color,
    footer: { text: `Year ${release.year} • Turn ${release.turn} • ID: ${release._id}` },
    timestamp: release.createdAt,
  });

  embed.setAuthor({ name: `${release.nationName} - ${typeInfo.label}` });

  // Add reactions if any
  if (release.reactions && release.reactions.length > 0) {
    const reactionEmojis = { support: '👍', oppose: '👎', neutral: '😐', condemn: '❌' };
    const reactionsText = release.reactions.map(r => {
      const emoji = reactionEmojis[r.reaction];
      let text = `${emoji} **${r.nationName}**: ${r.reaction}`;
      if (r.comment) text += `\n   *"${r.comment}"*`;
      return text;
    }).join('\n');
    
    embed.addFields({ name: 'Reactions', value: reactionsText, inline: false });
  }

  await interaction.reply({ embeds: [embed] });
}

async function handleReact(interaction) {
  const guildId = interaction.guildId;
  const releaseId = interaction.options.getString('id');
  const nationName = interaction.options.getString('nation');
  const reaction = interaction.options.getString('reaction');
  const comment = interaction.options.getString('comment');

  const nation = await Nation.findOne({ guildId, name: { $regex: new RegExp(`^${nationName}$`, 'i') } });
  if (!nation) {
    return interaction.reply({ embeds: [errorEmbed(`Nation **${nationName}** not found.`)], ephemeral: true });
  }

  // Check permission
  if (!canModifyNation(interaction.member, nation)) {
    return interaction.reply({
      embeds: [errorEmbed(`You don't have permission to react as **${nation.name}**.`)],
      ephemeral: true,
    });
  }

  let release;
  try {
    release = await PressRelease.findOne({ _id: releaseId, guildId });
  } catch {
    return interaction.reply({ embeds: [errorEmbed('Invalid press release ID.')], ephemeral: true });
  }

  if (!release) {
    return interaction.reply({ embeds: [errorEmbed('Press release not found.')], ephemeral: true });
  }

  // Can't react to own press release
  if (release.nationId.toString() === nation._id.toString()) {
    return interaction.reply({
      embeds: [errorEmbed(`**${nation.name}** cannot react to their own press release.`)],
      ephemeral: true,
    });
  }

  // Remove existing reaction from this nation
  release.reactions = release.reactions.filter(r => r.nationName !== nation.name);

  // Add new reaction
  release.reactions.push({
    nationName: nation.name,
    reaction,
    comment,
  });

  await release.save();

  const reactionEmojis = { support: '👍 Supports', oppose: '👎 Opposes', neutral: '😐 Remains Neutral', condemn: '❌ Condemns' };
  
  await interaction.reply({
    embeds: [successEmbed(`**${nation.name}** ${reactionEmojis[reaction].toLowerCase()} the press release "${release.title}" from **${release.nationName}**.`)],
  });
}

async function handleDelete(interaction) {
  if (!requireGM(interaction)) return;

  const guildId = interaction.guildId;
  const releaseId = interaction.options.getString('id');

  let release;
  try {
    release = await PressRelease.findOne({ _id: releaseId, guildId });
  } catch {
    return interaction.reply({ embeds: [errorEmbed('Invalid press release ID.')], ephemeral: true });
  }

  if (!release) {
    return interaction.reply({ embeds: [errorEmbed('Press release not found.')], ephemeral: true });
  }

  await PressRelease.deleteOne({ _id: release._id });

  await createAuditLog({
    guildId,
    entityType: 'press_release',
    entityId: release._id,
    entityName: release.title,
    action: 'delete',
    description: `Deleted press release "${release.title}" from **${release.nationName}**`,
    performedBy: interaction.user.id,
    performedByTag: interaction.user.tag,
  });

  await interaction.reply({
    embeds: [successEmbed(`Deleted press release "${release.title}" from **${release.nationName}**.`)],
  });
}

export async function autocomplete(interaction) {
  const focusedOption = interaction.options.getFocused(true);
  const guildId = interaction.guildId;

  if (focusedOption.name === 'nation') {
    const nations = await Nation.find({
      guildId,
      name: { $regex: focusedOption.value, $options: 'i' },
    }).limit(25);
    await interaction.respond(nations.map(n => ({ name: n.name, value: n.name })));
  }
}
