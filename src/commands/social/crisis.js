import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import Nation from '../../database/models/Nation.js';
import Crisis from '../../database/models/Crisis.js';
import { getGameState } from '../../database/models/GameState.js';
import { createHistoryEntry } from '../../database/models/HistoryEntry.js';
import { createAuditLog } from '../../database/models/AuditLog.js';
import { modifyReputation } from '../../database/models/Reputation.js';
import { isGM, requireGM, canModifyNation } from '../../utils/permissions.js';
import { createEmbed, errorEmbed, successEmbed } from '../../utils/embeds.js';
import config from '../../config.js';

const SEVERITY_INFO = {
  minor: { emoji: '🟢', label: 'Minor', color: 0x2ECC71 },
  moderate: { emoji: '🟡', label: 'Moderate', color: 0xF1C40F },
  major: { emoji: '🟠', label: 'Major', color: 0xE67E22 },
  critical: { emoji: '🔴', label: 'Critical', color: 0xE74C3C },
  catastrophic: { emoji: '💀', label: 'Catastrophic', color: 0x8B0000 },
};

const CATEGORY_INFO = {
  political: { emoji: '🏛️', label: 'Political' },
  military: { emoji: '⚔️', label: 'Military' },
  economic: { emoji: '💰', label: 'Economic' },
  humanitarian: { emoji: '🏥', label: 'Humanitarian' },
  environmental: { emoji: '🌍', label: 'Environmental' },
  diplomatic: { emoji: '🤝', label: 'Diplomatic' },
  other: { emoji: '❓', label: 'Other' },
};

export const data = new SlashCommandBuilder()
  .setName('crisis')
  .setDescription('Manage server-wide crisis events')
  .addSubcommand(sub =>
    sub.setName('create')
      .setDescription('[GM] Create a new crisis event')
      .addStringOption(opt =>
        opt.setName('name')
          .setDescription('Crisis name')
          .setRequired(true))
      .addStringOption(opt =>
        opt.setName('description')
          .setDescription('Crisis description')
          .setRequired(true))
      .addStringOption(opt =>
        opt.setName('category')
          .setDescription('Crisis category')
          .setRequired(true)
          .addChoices(
            { name: 'Political', value: 'political' },
            { name: 'Military', value: 'military' },
            { name: 'Economic', value: 'economic' },
            { name: 'Humanitarian', value: 'humanitarian' },
            { name: 'Environmental', value: 'environmental' },
            { name: 'Diplomatic', value: 'diplomatic' },
            { name: 'Other', value: 'other' },
          ))
      .addStringOption(opt =>
        opt.setName('severity')
          .setDescription('Crisis severity')
          .setRequired(true)
          .addChoices(
            { name: 'Minor', value: 'minor' },
            { name: 'Moderate', value: 'moderate' },
            { name: 'Major', value: 'major' },
            { name: 'Critical', value: 'critical' },
            { name: 'Catastrophic', value: 'catastrophic' },
          ))
      .addStringOption(opt =>
        opt.setName('affected')
          .setDescription('Affected nations (comma-separated, or "all")')
          .setRequired(false))
      .addIntegerOption(opt =>
        opt.setName('expires')
          .setDescription('Turns until auto-resolution (default: 3)')
          .setRequired(false)
          .setMinValue(1)
          .setMaxValue(10)))
  .addSubcommand(sub =>
    sub.setName('view')
      .setDescription('View active crises')
      .addStringOption(opt =>
        opt.setName('id')
          .setDescription('Specific crisis ID to view')
          .setRequired(false)))
  .addSubcommand(sub =>
    sub.setName('addoption')
      .setDescription('[GM] Add a response option to a crisis')
      .addStringOption(opt =>
        opt.setName('id')
          .setDescription('Crisis ID')
          .setRequired(true))
      .addStringOption(opt =>
        opt.setName('label')
          .setDescription('Option label')
          .setRequired(true))
      .addStringOption(opt =>
        opt.setName('description')
          .setDescription('Option description')
          .setRequired(false)))
  .addSubcommand(sub =>
    sub.setName('vote')
      .setDescription('Vote on a crisis response as a nation')
      .addStringOption(opt =>
        opt.setName('id')
          .setDescription('Crisis ID')
          .setRequired(true))
      .addStringOption(opt =>
        opt.setName('nation')
          .setDescription('Nation voting')
          .setRequired(true)
          .setAutocomplete(true))
      .addIntegerOption(opt =>
        opt.setName('option')
          .setDescription('Option number to vote for')
          .setRequired(true)
          .setMinValue(1)))
  .addSubcommand(sub =>
    sub.setName('resolve')
      .setDescription('[GM] Resolve a crisis')
      .addStringOption(opt =>
        opt.setName('id')
          .setDescription('Crisis ID')
          .setRequired(true))
      .addIntegerOption(opt =>
        opt.setName('option')
          .setDescription('Winning option number (0 for custom resolution)')
          .setRequired(true)
          .setMinValue(0))
      .addStringOption(opt =>
        opt.setName('summary')
          .setDescription('Resolution summary')
          .setRequired(true)))
  .addSubcommand(sub =>
    sub.setName('cancel')
      .setDescription('[GM] Cancel/expire a crisis')
      .addStringOption(opt =>
        opt.setName('id')
          .setDescription('Crisis ID')
          .setRequired(true)));

export async function execute(interaction) {
  const subcommand = interaction.options.getSubcommand();

  switch (subcommand) {
    case 'create':
      return handleCreate(interaction);
    case 'view':
      return handleView(interaction);
    case 'addoption':
      return handleAddOption(interaction);
    case 'vote':
      return handleVote(interaction);
    case 'resolve':
      return handleResolve(interaction);
    case 'cancel':
      return handleCancel(interaction);
  }
}

async function handleCreate(interaction) {
  if (!requireGM(interaction)) return;

  const guildId = interaction.guildId;
  const name = interaction.options.getString('name');
  const description = interaction.options.getString('description');
  const category = interaction.options.getString('category');
  const severity = interaction.options.getString('severity');
  const affectedStr = interaction.options.getString('affected');
  const expiresInTurns = interaction.options.getInteger('expires') || 3;

  const gameState = await getGameState(guildId);
  const turn = gameState?.turn?.current || 0;
  const year = gameState?.year || 1960;

  // Parse affected nations
  let affectedNations = [];
  if (affectedStr) {
    if (affectedStr.toLowerCase() === 'all') {
      const allNations = await Nation.find({ guildId });
      affectedNations = allNations.map(n => n.name);
    } else {
      affectedNations = affectedStr.split(',').map(n => n.trim());
    }
  }

  const crisis = await Crisis.create({
    guildId,
    name,
    description,
    category,
    severity,
    status: 'active',
    affectedNations,
    options: [],
    startTurn: turn,
    startYear: year,
    expiresInTurns,
    createdBy: interaction.user.id,
  });

  // Create history entry
  await createHistoryEntry({
    guildId,
    turn,
    year,
    title: `Crisis: ${name}`,
    description: `A ${severity} ${category} crisis has emerged: ${description}`,
    category: category === 'military' ? 'military' : category === 'economic' ? 'economy' : 'political',
    nations: affectedNations,
    isAutoGenerated: true,
  });

  await createAuditLog({
    guildId,
    entityType: 'crisis',
    entityId: crisis._id,
    entityName: name,
    action: 'create',
    description: `Created ${severity} ${category} crisis: ${name}`,
    performedBy: interaction.user.id,
    performedByTag: interaction.user.tag,
  });

  const sevInfo = SEVERITY_INFO[severity];
  const catInfo = CATEGORY_INFO[category];

  const embed = createEmbed({
    title: `${sevInfo.emoji} CRISIS: ${name}`,
    description: description,
    color: sevInfo.color,
    fields: [
      { name: 'Category', value: `${catInfo.emoji} ${catInfo.label}`, inline: true },
      { name: 'Severity', value: `${sevInfo.emoji} ${sevInfo.label}`, inline: true },
      { name: 'Expires In', value: `${expiresInTurns} turns`, inline: true },
    ],
    footer: { text: `Crisis ID: ${crisis._id}` },
  });

  if (affectedNations.length > 0) {
    embed.addFields({
      name: 'Affected Nations',
      value: affectedNations.join(', '),
      inline: false,
    });
  }

  embed.addFields({
    name: 'Next Steps',
    value: 'Use `/crisis addoption` to add response options for nations to vote on.',
    inline: false,
  });

  await interaction.reply({ embeds: [embed] });
}

async function handleView(interaction) {
  const guildId = interaction.guildId;
  const crisisId = interaction.options.getString('id');

  if (crisisId) {
    // View specific crisis
    let crisis;
    try {
      crisis = await Crisis.findOne({ _id: crisisId, guildId });
    } catch {
      return interaction.reply({ embeds: [errorEmbed('Invalid crisis ID.')], ephemeral: true });
    }

    if (!crisis) {
      return interaction.reply({ embeds: [errorEmbed('Crisis not found.')], ephemeral: true });
    }

    const sevInfo = SEVERITY_INFO[crisis.severity];
    const catInfo = CATEGORY_INFO[crisis.category];

    const embed = createEmbed({
      title: `${sevInfo.emoji} ${crisis.name}`,
      description: crisis.description,
      color: sevInfo.color,
      fields: [
        { name: 'Status', value: crisis.status.toUpperCase(), inline: true },
        { name: 'Category', value: `${catInfo.emoji} ${catInfo.label}`, inline: true },
        { name: 'Severity', value: `${sevInfo.emoji} ${sevInfo.label}`, inline: true },
        { name: 'Started', value: `Turn ${crisis.startTurn} (Year ${crisis.startYear})`, inline: true },
      ],
      footer: { text: `ID: ${crisis._id}` },
    });

    if (crisis.affectedNations.length > 0) {
      embed.addFields({
        name: 'Affected Nations',
        value: crisis.affectedNations.join(', '),
        inline: false,
      });
    }

    if (crisis.options.length > 0) {
      const optionsText = crisis.options.map((opt, i) => {
        const voteCount = opt.votes?.length || 0;
        const voters = opt.votes?.map(v => v.nationName).join(', ') || 'None';
        return `**${i + 1}. ${opt.label}**\n${opt.description || 'No description'}\nVotes: ${voteCount} (${voters})`;
      }).join('\n\n');
      
      embed.addFields({ name: 'Response Options', value: optionsText, inline: false });
    }

    if (crisis.resolution?.summary) {
      embed.addFields({
        name: 'Resolution',
        value: crisis.resolution.summary,
        inline: false,
      });
    }

    await interaction.reply({ embeds: [embed] });
  } else {
    // View all active crises
    const crises = await Crisis.find({ 
      guildId, 
      status: { $in: ['active', 'voting', 'pending'] } 
    }).sort({ createdAt: -1 });

    if (crises.length === 0) {
      return interaction.reply({
        embeds: [createEmbed({
          title: 'Active Crises',
          description: 'No active crises at this time.',
          color: config.colors.success,
        })],
      });
    }

    const embed = createEmbed({
      title: 'Active Crises',
      color: config.colors.warning,
    });

    const crisisList = crises.map(c => {
      const sevInfo = SEVERITY_INFO[c.severity];
      const catInfo = CATEGORY_INFO[c.category];
      const optionCount = c.options?.length || 0;
      return `${sevInfo.emoji} **${c.name}** (${catInfo.label})\n` +
             `Status: ${c.status} • Options: ${optionCount}\n` +
             `ID: \`${c._id}\``;
    }).join('\n\n');

    embed.setDescription(crisisList);
    embed.setFooter({ text: 'Use /crisis view <id> for details' });

    await interaction.reply({ embeds: [embed] });
  }
}

async function handleAddOption(interaction) {
  if (!requireGM(interaction)) return;

  const guildId = interaction.guildId;
  const crisisId = interaction.options.getString('id');
  const label = interaction.options.getString('label');
  const description = interaction.options.getString('description') || '';

  let crisis;
  try {
    crisis = await Crisis.findOne({ _id: crisisId, guildId });
  } catch {
    return interaction.reply({ embeds: [errorEmbed('Invalid crisis ID.')], ephemeral: true });
  }

  if (!crisis) {
    return interaction.reply({ embeds: [errorEmbed('Crisis not found.')], ephemeral: true });
  }

  if (crisis.status === 'resolved' || crisis.status === 'expired') {
    return interaction.reply({ embeds: [errorEmbed('Cannot add options to a resolved crisis.')], ephemeral: true });
  }

  crisis.options.push({ label, description, effects: [], votes: [] });
  if (crisis.status === 'active') {
    crisis.status = 'voting';
  }
  await crisis.save();

  await interaction.reply({
    embeds: [successEmbed(`Added option **${label}** to crisis "${crisis.name}".\nOption number: **${crisis.options.length}**`)],
  });
}

async function handleVote(interaction) {
  const guildId = interaction.guildId;
  const crisisId = interaction.options.getString('id');
  const nationName = interaction.options.getString('nation');
  const optionNum = interaction.options.getInteger('option');

  const nation = await Nation.findOne({ guildId, name: { $regex: new RegExp(`^${nationName}$`, 'i') } });
  if (!nation) {
    return interaction.reply({ embeds: [errorEmbed(`Nation **${nationName}** not found.`)], ephemeral: true });
  }

  if (!canModifyNation(interaction.member, nation)) {
    return interaction.reply({
      embeds: [errorEmbed(`You don't have permission to vote as **${nation.name}**.`)],
      ephemeral: true,
    });
  }

  let crisis;
  try {
    crisis = await Crisis.findOne({ _id: crisisId, guildId });
  } catch {
    return interaction.reply({ embeds: [errorEmbed('Invalid crisis ID.')], ephemeral: true });
  }

  if (!crisis) {
    return interaction.reply({ embeds: [errorEmbed('Crisis not found.')], ephemeral: true });
  }

  if (crisis.status !== 'voting' && crisis.status !== 'active') {
    return interaction.reply({ embeds: [errorEmbed('This crisis is not accepting votes.')], ephemeral: true });
  }

  if (optionNum < 1 || optionNum > crisis.options.length) {
    return interaction.reply({ embeds: [errorEmbed(`Invalid option number. Choose between 1 and ${crisis.options.length}.`)], ephemeral: true });
  }

  // Remove any existing votes from this nation
  for (const opt of crisis.options) {
    opt.votes = opt.votes.filter(v => v.nationId?.toString() !== nation._id.toString());
  }

  // Add new vote
  crisis.options[optionNum - 1].votes.push({
    nationId: nation._id,
    nationName: nation.name,
    votedBy: interaction.user.id,
  });

  await crisis.save();

  await interaction.reply({
    embeds: [successEmbed(`**${nation.name}** voted for option **${optionNum}: ${crisis.options[optionNum - 1].label}** in the "${crisis.name}" crisis.`)],
  });
}

async function handleResolve(interaction) {
  if (!requireGM(interaction)) return;

  const guildId = interaction.guildId;
  const crisisId = interaction.options.getString('id');
  const optionNum = interaction.options.getInteger('option');
  const summary = interaction.options.getString('summary');

  let crisis;
  try {
    crisis = await Crisis.findOne({ _id: crisisId, guildId });
  } catch {
    return interaction.reply({ embeds: [errorEmbed('Invalid crisis ID.')], ephemeral: true });
  }

  if (!crisis) {
    return interaction.reply({ embeds: [errorEmbed('Crisis not found.')], ephemeral: true });
  }

  crisis.status = 'resolved';
  crisis.resolution = {
    selectedOption: optionNum > 0 ? optionNum - 1 : null,
    summary,
    resolvedAt: new Date(),
    resolvedBy: 'gm',
  };
  await crisis.save();

  const gameState = await getGameState(guildId);
  
  // Create history entry
  await createHistoryEntry({
    guildId,
    turn: gameState?.turn?.current || 0,
    year: gameState?.year || 1960,
    title: `Crisis Resolved: ${crisis.name}`,
    description: summary,
    category: 'political',
    nations: crisis.affectedNations,
    isAutoGenerated: true,
  });

  await createAuditLog({
    guildId,
    entityType: 'crisis',
    entityId: crisis._id,
    entityName: crisis.name,
    action: 'update',
    field: 'status',
    newValue: 'resolved',
    description: `Resolved crisis: ${crisis.name}`,
    performedBy: interaction.user.id,
    performedByTag: interaction.user.tag,
  });

  const embed = createEmbed({
    title: `Crisis Resolved: ${crisis.name}`,
    description: summary,
    color: config.colors.success,
  });

  if (optionNum > 0 && crisis.options[optionNum - 1]) {
    embed.addFields({
      name: 'Selected Response',
      value: crisis.options[optionNum - 1].label,
      inline: false,
    });
  }

  await interaction.reply({ embeds: [embed] });
}

async function handleCancel(interaction) {
  if (!requireGM(interaction)) return;

  const guildId = interaction.guildId;
  const crisisId = interaction.options.getString('id');

  let crisis;
  try {
    crisis = await Crisis.findOne({ _id: crisisId, guildId });
  } catch {
    return interaction.reply({ embeds: [errorEmbed('Invalid crisis ID.')], ephemeral: true });
  }

  if (!crisis) {
    return interaction.reply({ embeds: [errorEmbed('Crisis not found.')], ephemeral: true });
  }

  crisis.status = 'expired';
  await crisis.save();

  await createAuditLog({
    guildId,
    entityType: 'crisis',
    entityId: crisis._id,
    entityName: crisis.name,
    action: 'update',
    field: 'status',
    newValue: 'expired',
    description: `Cancelled/expired crisis: ${crisis.name}`,
    performedBy: interaction.user.id,
    performedByTag: interaction.user.tag,
  });

  await interaction.reply({
    embeds: [successEmbed(`Crisis "${crisis.name}" has been cancelled/expired.`)],
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
