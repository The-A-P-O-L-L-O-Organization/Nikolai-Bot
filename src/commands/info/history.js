import { SlashCommandBuilder } from 'discord.js';
import HistoryEntry, { getHistory, getNationHistory, createHistoryEntry } from '../../database/models/HistoryEntry.js';
import { getGameState } from '../../database/models/GameState.js';
import Nation from '../../database/models/Nation.js';
import { createAuditLog } from '../../database/models/AuditLog.js';
import { requireGM } from '../../utils/permissions.js';
import { errorEmbed, successEmbed, createEmbed } from '../../utils/embeds.js';
import config from '../../config.js';

// Category display info
const CATEGORY_INFO = {
  war: { emoji: '⚔️', label: 'War' },
  diplomacy: { emoji: '🤝', label: 'Diplomacy' },
  economy: { emoji: '💰', label: 'Economy' },
  political: { emoji: '🏛️', label: 'Political' },
  military: { emoji: '🎖️', label: 'Military' },
  disaster: { emoji: '💥', label: 'Disaster' },
  discovery: { emoji: '🔬', label: 'Discovery' },
  custom: { emoji: '📜', label: 'Custom' },
};

export const data = new SlashCommandBuilder()
  .setName('history')
  .setDescription('View and manage the historical timeline')
  .addSubcommand(sub =>
    sub.setName('view')
      .setDescription('View the historical timeline')
      .addStringOption(opt =>
        opt.setName('category')
          .setDescription('Filter by category')
          .setRequired(false)
          .addChoices(
            { name: 'War', value: 'war' },
            { name: 'Diplomacy', value: 'diplomacy' },
            { name: 'Economy', value: 'economy' },
            { name: 'Political', value: 'political' },
            { name: 'Military', value: 'military' },
            { name: 'Disaster', value: 'disaster' },
            { name: 'Discovery', value: 'discovery' },
            { name: 'Custom', value: 'custom' }
          ))
      .addStringOption(opt =>
        opt.setName('nation')
          .setDescription('Filter by nation name')
          .setRequired(false))
      .addIntegerOption(opt =>
        opt.setName('limit')
          .setDescription('Number of entries to show (default: 15)')
          .setRequired(false)
          .setMinValue(1)
          .setMaxValue(50)))
  .addSubcommand(sub =>
    sub.setName('add')
      .setDescription('Add a new history entry (GM only)')
      .addStringOption(opt =>
        opt.setName('title')
          .setDescription('Title of the event')
          .setRequired(true)
          .setMaxLength(100))
      .addStringOption(opt =>
        opt.setName('description')
          .setDescription('Description of what happened')
          .setRequired(true)
          .setMaxLength(1000))
      .addStringOption(opt =>
        opt.setName('category')
          .setDescription('Category of the event')
          .setRequired(true)
          .addChoices(
            { name: 'War', value: 'war' },
            { name: 'Diplomacy', value: 'diplomacy' },
            { name: 'Economy', value: 'economy' },
            { name: 'Political', value: 'political' },
            { name: 'Military', value: 'military' },
            { name: 'Disaster', value: 'disaster' },
            { name: 'Discovery', value: 'discovery' },
            { name: 'Custom', value: 'custom' }
          ))
      .addStringOption(opt =>
        opt.setName('nations')
          .setDescription('Nations involved (comma-separated)')
          .setRequired(false)))
  .addSubcommand(sub =>
    sub.setName('delete')
      .setDescription('Delete a history entry (GM only)')
      .addStringOption(opt =>
        opt.setName('id')
          .setDescription('The entry ID to delete')
          .setRequired(true)))
  .addSubcommand(sub =>
    sub.setName('nation')
      .setDescription('View history for a specific nation')
      .addStringOption(opt =>
        opt.setName('name')
          .setDescription('Nation name')
          .setRequired(true))
      .addIntegerOption(opt =>
        opt.setName('limit')
          .setDescription('Number of entries to show (default: 15)')
          .setRequired(false)
          .setMinValue(1)
          .setMaxValue(50)));

export async function execute(interaction) {
  const subcommand = interaction.options.getSubcommand();
  const guildId = interaction.guildId;

  switch (subcommand) {
    case 'view':
      return handleView(interaction, guildId);
    case 'add':
      return handleAdd(interaction, guildId);
    case 'delete':
      return handleDelete(interaction, guildId);
    case 'nation':
      return handleNation(interaction, guildId);
  }
}

async function handleView(interaction, guildId) {
  await interaction.deferReply();

  try {
    const category = interaction.options.getString('category');
    const nation = interaction.options.getString('nation');
    const limit = interaction.options.getInteger('limit') || 15;

    const entries = await getHistory(guildId, { limit, category, nation });

    if (entries.length === 0) {
      const filterMsg = category ? ` in category "${category}"` : nation ? ` involving "${nation}"` : '';
      return interaction.editReply({ 
        embeds: [errorEmbed(`No history entries found${filterMsg}. Use \`/history add\` to create one.`)] 
      });
    }

    const embed = createEmbed({
      title: 'Historical Timeline',
      color: config.colors.primary,
    });

    if (category) {
      const catInfo = CATEGORY_INFO[category];
      embed.setDescription(`Filtered by: ${catInfo.emoji} **${catInfo.label}**`);
    } else if (nation) {
      embed.setDescription(`Events involving: **${nation}**`);
    }

    // Group entries by year for better presentation
    const description = entries.map(entry => {
      const catInfo = CATEGORY_INFO[entry.category] || CATEGORY_INFO.custom;
      const nationsStr = entry.nations.length > 0 ? ` (${entry.nations.join(', ')})` : '';
      return `${catInfo.emoji} **Year ${entry.year}** (Turn ${entry.turn})\n**${entry.title}**${nationsStr}\n${entry.description.substring(0, 200)}${entry.description.length > 200 ? '...' : ''}`;
    }).join('\n\n');

    // Discord embed description limit is 4096
    if (description.length > 4000) {
      embed.setDescription(description.substring(0, 4000) + '\n\n*...truncated*');
    } else {
      embed.setDescription((embed.data.description ? embed.data.description + '\n\n' : '') + description);
    }

    embed.setFooter({ text: `Showing ${entries.length} entries` });

    await interaction.editReply({ embeds: [embed] });

  } catch (error) {
    console.error('History view error:', error);
    await interaction.editReply({ embeds: [errorEmbed(`Failed to load history: ${error.message}`)] });
  }
}

async function handleAdd(interaction, guildId) {
  if (!requireGM(interaction)) return;

  await interaction.deferReply();

  try {
    const title = interaction.options.getString('title');
    const description = interaction.options.getString('description');
    const category = interaction.options.getString('category');
    const nationsRaw = interaction.options.getString('nations');

    // Get current game state for turn/year
    const gameState = await getGameState(guildId);
    const turn = gameState?.turn?.current || 0;
    const year = gameState?.year || 1960;

    // Parse nations
    let nations = [];
    if (nationsRaw) {
      nations = nationsRaw.split(',').map(n => n.trim()).filter(n => n.length > 0);
      
      // Validate nations exist
      for (const nationName of nations) {
        const exists = await Nation.findOne({ guildId, name: { $regex: new RegExp(`^${nationName}$`, 'i') } });
        if (!exists) {
          return interaction.editReply({ 
            embeds: [errorEmbed(`Nation "${nationName}" not found. Check the name and try again.`)] 
          });
        }
      }
    }

    // Create the history entry
    const entry = await createHistoryEntry({
      guildId,
      turn,
      year,
      title,
      description,
      category,
      nations,
      createdBy: interaction.user.id,
      isAutoGenerated: false,
    });

    // Audit log
    await createAuditLog({
      guildId,
      entityType: 'history',
      entityName: title,
      action: 'create',
      description: `History entry created: "${title}" (${category})`,
      performedBy: interaction.user.id,
      performedByTag: interaction.user.tag,
    });

    const catInfo = CATEGORY_INFO[category];
    const embed = createEmbed({
      title: 'History Entry Added',
      color: config.colors.success,
      fields: [
        { name: 'Title', value: title, inline: false },
        { name: 'Category', value: `${catInfo.emoji} ${catInfo.label}`, inline: true },
        { name: 'Year', value: `${year}`, inline: true },
        { name: 'Turn', value: `${turn}`, inline: true },
      ],
    });

    if (nations.length > 0) {
      embed.addFields({ name: 'Nations Involved', value: nations.join(', '), inline: false });
    }

    embed.addFields({ name: 'Description', value: description.substring(0, 500), inline: false });
    embed.setFooter({ text: `Entry ID: ${entry._id}` });

    await interaction.editReply({ embeds: [embed] });

  } catch (error) {
    console.error('History add error:', error);
    await interaction.editReply({ embeds: [errorEmbed(`Failed to add entry: ${error.message}`)] });
  }
}

async function handleDelete(interaction, guildId) {
  if (!requireGM(interaction)) return;

  await interaction.deferReply();

  try {
    const entryId = interaction.options.getString('id');

    // Find the entry
    const entry = await HistoryEntry.findOne({ _id: entryId, guildId });
    if (!entry) {
      return interaction.editReply({ embeds: [errorEmbed('History entry not found.')] });
    }

    // Delete it
    await HistoryEntry.deleteOne({ _id: entryId });

    // Audit log
    await createAuditLog({
      guildId,
      entityType: 'history',
      entityName: entry.title,
      action: 'delete',
      description: `History entry deleted: "${entry.title}"`,
      performedBy: interaction.user.id,
      performedByTag: interaction.user.tag,
    });

    await interaction.editReply({ 
      embeds: [successEmbed(`Deleted history entry: **${entry.title}** (Year ${entry.year})`)] 
    });

  } catch (error) {
    console.error('History delete error:', error);
    await interaction.editReply({ embeds: [errorEmbed(`Failed to delete entry: ${error.message}`)] });
  }
}

async function handleNation(interaction, guildId) {
  await interaction.deferReply();

  try {
    const nationName = interaction.options.getString('name');
    const limit = interaction.options.getInteger('limit') || 15;

    // Verify nation exists
    const nation = await Nation.findOne({ guildId, name: { $regex: new RegExp(`^${nationName}$`, 'i') } });
    if (!nation) {
      return interaction.editReply({ embeds: [errorEmbed(`Nation "${nationName}" not found.`)] });
    }

    const entries = await getNationHistory(guildId, nation.name, limit);

    if (entries.length === 0) {
      return interaction.editReply({ 
        embeds: [errorEmbed(`No history entries found involving ${nation.name}.`)] 
      });
    }

    const embed = createEmbed({
      title: `History of ${nation.name}`,
      color: config.colors.primary,
    });

    const description = entries.map(entry => {
      const catInfo = CATEGORY_INFO[entry.category] || CATEGORY_INFO.custom;
      const otherNations = entry.nations.filter(n => n.toLowerCase() !== nation.name.toLowerCase());
      const othersStr = otherNations.length > 0 ? ` with ${otherNations.join(', ')}` : '';
      return `${catInfo.emoji} **Year ${entry.year}** - ${entry.title}${othersStr}\n${entry.description.substring(0, 150)}${entry.description.length > 150 ? '...' : ''}`;
    }).join('\n\n');

    if (description.length > 4000) {
      embed.setDescription(description.substring(0, 4000) + '\n\n*...truncated*');
    } else {
      embed.setDescription(description);
    }

    embed.setFooter({ text: `Showing ${entries.length} entries` });

    await interaction.editReply({ embeds: [embed] });

  } catch (error) {
    console.error('History nation error:', error);
    await interaction.editReply({ embeds: [errorEmbed(`Failed to load nation history: ${error.message}`)] });
  }
}
