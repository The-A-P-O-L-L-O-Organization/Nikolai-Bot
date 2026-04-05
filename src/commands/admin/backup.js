import { SlashCommandBuilder } from 'discord.js';
import fs from 'fs/promises';
import path from 'path';
import Nation from '../../database/models/Nation.js';
import War from '../../database/models/War.js';
import Treaty from '../../database/models/Treaty.js';
import Resource from '../../database/models/Resource.js';
import Unit from '../../database/models/Unit.js';
import GameState, { getGameState } from '../../database/models/GameState.js';
import { createAuditLog } from '../../database/models/AuditLog.js';
import { isGM, requireGM } from '../../utils/permissions.js';
import { errorEmbed, successEmbed, createEmbed } from '../../utils/embeds.js';
import config from '../../config.js';

export const data = new SlashCommandBuilder()
  .setName('backup')
  .setDescription('Export all game data to JSON');

export async function execute(interaction) {
  if (!requireGM(interaction)) return;

  await interaction.deferReply();

  const guildId = interaction.guildId;

  try {
    // Gather all data
    const data = {
      exportedAt: new Date().toISOString(),
      guildId,
      gameState: await getGameState(guildId),
      nations: await Nation.find({ guildId }).lean(),
      wars: await War.find({ guildId }).lean(),
      treaties: await Treaty.find({ guildId }).lean(),
      resources: await Resource.find({ $or: [{ guildId }, { guildId: null }] }).lean(),
      units: await Unit.find({ $or: [{ guildId }, { guildId: null }] }).lean(),
    };

    // Convert to JSON
    const json = JSON.stringify(data, null, 2);

    // Save to file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup-${guildId}-${timestamp}.json`;
    const filepath = path.join(process.cwd(), 'backups', filename);

    // Ensure backups directory exists
    await fs.mkdir(path.join(process.cwd(), 'backups'), { recursive: true });
    await fs.writeFile(filepath, json);

    // Audit log
    await createAuditLog({
      guildId,
      entityType: 'gamestate',
      entityName: 'Backup',
      action: 'create',
      description: `Game data exported to ${filename}`,
      performedBy: interaction.user.id,
      performedByTag: interaction.user.tag,
    });

    const embed = createEmbed({
      title: 'Backup Complete',
      color: config.colors.success,
      fields: [
        { name: 'Filename', value: filename, inline: false },
        { name: 'Nations', value: `${data.nations.length}`, inline: true },
        { name: 'Wars', value: `${data.wars.length}`, inline: true },
        { name: 'Treaties', value: `${data.treaties.length}`, inline: true },
      ],
    });

    await interaction.editReply({ embeds: [embed] });

  } catch (error) {
    console.error('Backup error:', error);
    await interaction.editReply({ embeds: [errorEmbed(`Backup failed: ${error.message}`)] });
  }
}
