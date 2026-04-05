import { SlashCommandBuilder, StringSelectMenuBuilder, ActionRowBuilder } from 'discord.js';
import fs from 'fs/promises';
import path from 'path';
import Nation from '../../database/models/Nation.js';
import War from '../../database/models/War.js';
import Treaty from '../../database/models/Treaty.js';
import Transaction from '../../database/models/Transaction.js';
import Resource from '../../database/models/Resource.js';
import Unit from '../../database/models/Unit.js';
import HistoryEntry from '../../database/models/HistoryEntry.js';
import GameState, { getGameState } from '../../database/models/GameState.js';
import { createAuditLog } from '../../database/models/AuditLog.js';
import { requireGM } from '../../utils/permissions.js';
import { errorEmbed, successEmbed, createEmbed, warningEmbed } from '../../utils/embeds.js';
import config from '../../config.js';

export const data = new SlashCommandBuilder()
  .setName('savestate')
  .setDescription('Save and restore game states')
  .addSubcommand(sub =>
    sub.setName('save')
      .setDescription('Save current game state to a snapshot')
      .addStringOption(opt =>
        opt.setName('name')
          .setDescription('Name for this save (optional)')
          .setRequired(false)))
  .addSubcommand(sub =>
    sub.setName('list')
      .setDescription('List all saved game states'))
  .addSubcommand(sub =>
    sub.setName('restore')
      .setDescription('Restore a saved game state')
      .addStringOption(opt =>
        opt.setName('filename')
          .setDescription('Filename to restore (from /savestate list)')
          .setRequired(true)))
  .addSubcommand(sub =>
    sub.setName('delete')
      .setDescription('Delete a saved game state')
      .addStringOption(opt =>
        opt.setName('filename')
          .setDescription('Filename to delete')
          .setRequired(true)));

export async function execute(interaction) {
  if (!requireGM(interaction)) return;

  const subcommand = interaction.options.getSubcommand();
  const guildId = interaction.guildId;

  switch (subcommand) {
    case 'save':
      return handleSave(interaction, guildId);
    case 'list':
      return handleList(interaction, guildId);
    case 'restore':
      return handleRestore(interaction, guildId);
    case 'delete':
      return handleDelete(interaction, guildId);
  }
}

async function handleSave(interaction, guildId) {
  await interaction.deferReply();

  try {
    const customName = interaction.options.getString('name');
    const gameState = await getGameState(guildId);
    
    // Gather all data for this guild
    const saveData = {
      version: 2,
      guildId,
      savedAt: new Date().toISOString(),
      customName: customName || null,
      turn: gameState?.turn?.current || 0,
      year: gameState?.year || 1960,
      gameState: gameState ? gameState.toObject() : null,
      nations: await Nation.find({ guildId }).lean(),
      wars: await War.find({ guildId }).lean(),
      treaties: await Treaty.find({ guildId }).lean(),
      transactions: await Transaction.find({ guildId }).lean(),
      history: await HistoryEntry.find({ guildId }).lean(),
      resources: await Resource.find({ $or: [{ guildId }, { guildId: null }] }).lean(),
      units: await Unit.find({ $or: [{ guildId }, { guildId: null }] }).lean(),
    };

    // Convert to JSON
    const json = JSON.stringify(saveData, null, 2);

    // Create filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const safeName = customName ? customName.replace(/[^a-zA-Z0-9-_]/g, '_') : '';
    const filename = safeName 
      ? `save-${guildId}-${safeName}-${timestamp}.json`
      : `save-${guildId}-turn${saveData.turn}-${timestamp}.json`;
    
    const savesDir = path.join(process.cwd(), 'saves', guildId);
    const filepath = path.join(savesDir, filename);

    // Ensure saves directory exists
    await fs.mkdir(savesDir, { recursive: true });
    await fs.writeFile(filepath, json);

    // Audit log
    await createAuditLog({
      guildId,
      entityType: 'gamestate',
      entityName: 'Save State',
      action: 'create',
      description: `Game state saved: ${filename}${customName ? ` (${customName})` : ''}`,
      performedBy: interaction.user.id,
      performedByTag: interaction.user.tag,
    });

    const embed = createEmbed({
      title: 'Game State Saved',
      color: config.colors.success,
      fields: [
        { name: 'Filename', value: filename, inline: false },
        { name: 'Turn', value: `${saveData.turn}`, inline: true },
        { name: 'Year', value: `${saveData.year}`, inline: true },
        { name: 'Nations', value: `${saveData.nations.length}`, inline: true },
        { name: 'Wars', value: `${saveData.wars.length}`, inline: true },
        { name: 'Treaties', value: `${saveData.treaties.length}`, inline: true },
        { name: 'History Entries', value: `${saveData.history.length}`, inline: true },
      ],
    });

    if (customName) {
      embed.setDescription(`Save name: **${customName}**`);
    }

    await interaction.editReply({ embeds: [embed] });

  } catch (error) {
    console.error('Save state error:', error);
    await interaction.editReply({ embeds: [errorEmbed(`Save failed: ${error.message}`)] });
  }
}

async function handleList(interaction, guildId) {
  await interaction.deferReply();

  try {
    const savesDir = path.join(process.cwd(), 'saves', guildId);
    
    // Check if directory exists
    try {
      await fs.access(savesDir);
    } catch {
      return interaction.editReply({ embeds: [errorEmbed('No saves found for this server.')] });
    }

    const files = await fs.readdir(savesDir);
    const jsonFiles = files.filter(f => f.endsWith('.json')).sort().reverse();

    if (jsonFiles.length === 0) {
      return interaction.editReply({ embeds: [errorEmbed('No saves found for this server.')] });
    }

    // Get details for each save
    const saves = [];
    for (const file of jsonFiles.slice(0, 20)) {
      try {
        const filepath = path.join(savesDir, file);
        const content = await fs.readFile(filepath, 'utf-8');
        const data = JSON.parse(content);
        saves.push({
          filename: file,
          savedAt: data.savedAt,
          customName: data.customName,
          turn: data.turn,
          year: data.year,
          nations: data.nations?.length || 0,
        });
      } catch (e) {
        saves.push({
          filename: file,
          error: 'Could not read file',
        });
      }
    }

    const description = saves.map((s, i) => {
      if (s.error) return `${i + 1}. \`${s.filename}\` - *${s.error}*`;
      const nameStr = s.customName ? `**${s.customName}** - ` : '';
      return `${i + 1}. ${nameStr}Turn ${s.turn}, Year ${s.year} (${s.nations} nations)\n   \`${s.filename}\``;
    }).join('\n\n');

    const embed = createEmbed({
      title: 'Saved Game States',
      description: description.substring(0, 4000),
      footer: `${jsonFiles.length} saves found${jsonFiles.length > 20 ? ' (showing first 20)' : ''}`,
    });

    await interaction.editReply({ embeds: [embed] });

  } catch (error) {
    console.error('List saves error:', error);
    await interaction.editReply({ embeds: [errorEmbed(`Failed to list saves: ${error.message}`)] });
  }
}

async function handleRestore(interaction, guildId) {
  await interaction.deferReply();

  try {
    const filename = interaction.options.getString('filename');
    const savesDir = path.join(process.cwd(), 'saves', guildId);
    const filepath = path.join(savesDir, filename);

    // Read save file
    let content;
    try {
      content = await fs.readFile(filepath, 'utf-8');
    } catch {
      return interaction.editReply({ embeds: [errorEmbed(`Save file not found: ${filename}`)] });
    }

    const saveData = JSON.parse(content);

    // Validate it's for this guild
    if (saveData.guildId && saveData.guildId !== guildId) {
      return interaction.editReply({ embeds: [errorEmbed('This save file is for a different server.')] });
    }

    // Delete existing data for this guild
    await Nation.deleteMany({ guildId });
    await War.deleteMany({ guildId });
    await Treaty.deleteMany({ guildId });
    await Transaction.deleteMany({ guildId });
    await HistoryEntry.deleteMany({ guildId });
    await GameState.deleteOne({ guildId });

    // Restore data
    if (saveData.gameState) {
      const { _id, __v, ...gameStateData } = saveData.gameState;
      await GameState.create({ ...gameStateData, guildId });
    }

    if (saveData.nations?.length > 0) {
      const nations = saveData.nations.map(n => {
        const { _id, __v, ...data } = n;
        return { ...data, guildId };
      });
      await Nation.insertMany(nations);
    }

    if (saveData.wars?.length > 0) {
      const wars = saveData.wars.map(w => {
        const { _id, __v, ...data } = w;
        return { ...data, guildId };
      });
      await War.insertMany(wars);
    }

    if (saveData.treaties?.length > 0) {
      const treaties = saveData.treaties.map(t => {
        const { _id, __v, ...data } = t;
        return { ...data, guildId };
      });
      await Treaty.insertMany(treaties);
    }

    if (saveData.transactions?.length > 0) {
      const transactions = saveData.transactions.map(t => {
        const { _id, __v, ...data } = t;
        return { ...data, guildId };
      });
      await Transaction.insertMany(transactions);
    }

    if (saveData.history?.length > 0) {
      const history = saveData.history.map(h => {
        const { _id, __v, ...data } = h;
        return { ...data, guildId };
      });
      await HistoryEntry.insertMany(history);
    }

    // Audit log
    await createAuditLog({
      guildId,
      entityType: 'gamestate',
      entityName: 'Restore',
      action: 'update',
      description: `Game state restored from: ${filename}`,
      performedBy: interaction.user.id,
      performedByTag: interaction.user.tag,
    });

    // Create history entry for the restore
    await HistoryEntry.create({
      guildId,
      turn: saveData.turn || 0,
      year: saveData.year || 1960,
      title: 'Game State Restored',
      description: `Game was restored to a previous state from save: ${saveData.customName || filename}`,
      category: 'custom',
      createdBy: interaction.user.id,
      isAutoGenerated: true,
    });

    const embed = createEmbed({
      title: 'Game State Restored',
      color: config.colors.success,
      description: `Successfully restored game state from:\n\`${filename}\``,
      fields: [
        { name: 'Turn', value: `${saveData.turn || 'Unknown'}`, inline: true },
        { name: 'Year', value: `${saveData.year || 'Unknown'}`, inline: true },
        { name: 'Nations Restored', value: `${saveData.nations?.length || 0}`, inline: true },
      ],
    });

    await interaction.editReply({ embeds: [embed] });

  } catch (error) {
    console.error('Restore error:', error);
    await interaction.editReply({ embeds: [errorEmbed(`Restore failed: ${error.message}`)] });
  }
}

async function handleDelete(interaction, guildId) {
  await interaction.deferReply();

  try {
    const filename = interaction.options.getString('filename');
    const savesDir = path.join(process.cwd(), 'saves', guildId);
    const filepath = path.join(savesDir, filename);

    // Check file exists
    try {
      await fs.access(filepath);
    } catch {
      return interaction.editReply({ embeds: [errorEmbed(`Save file not found: ${filename}`)] });
    }

    // Delete the file
    await fs.unlink(filepath);

    // Audit log
    await createAuditLog({
      guildId,
      entityType: 'gamestate',
      entityName: 'Save State',
      action: 'delete',
      description: `Save state deleted: ${filename}`,
      performedBy: interaction.user.id,
      performedByTag: interaction.user.tag,
    });

    await interaction.editReply({ embeds: [successEmbed(`Save file deleted: \`${filename}\``)] });

  } catch (error) {
    console.error('Delete save error:', error);
    await interaction.editReply({ embeds: [errorEmbed(`Delete failed: ${error.message}`)] });
  }
}
