import { SlashCommandBuilder } from 'discord.js';
import Nation from '../../database/models/Nation.js';
import Reputation, { getOrCreateReputation, modifyReputation, getNationReputations, getReputationsToward, deriveStatus } from '../../database/models/Reputation.js';
import { createAuditLog } from '../../database/models/AuditLog.js';
import { isGM, requireGM, canModifyNation } from '../../utils/permissions.js';
import { createEmbed, errorEmbed, successEmbed } from '../../utils/embeds.js';
import config from '../../config.js';

const STATUS_INFO = {
  allied: { emoji: '💚', label: 'Allied', color: 0x2ECC71 },
  friendly: { emoji: '💙', label: 'Friendly', color: 0x3498DB },
  cordial: { emoji: '🤝', label: 'Cordial', color: 0x1ABC9C },
  neutral: { emoji: '😐', label: 'Neutral', color: 0x95A5A6 },
  cold: { emoji: '❄️', label: 'Cold', color: 0x9B59B6 },
  hostile: { emoji: '😠', label: 'Hostile', color: 0xE67E22 },
  enemy: { emoji: '💔', label: 'Enemy', color: 0xE74C3C },
  war: { emoji: '⚔️', label: 'At War', color: 0xC0392B },
};

export const data = new SlashCommandBuilder()
  .setName('reputation')
  .setDescription('Manage and view nation reputations')
  .addSubcommand(sub =>
    sub.setName('view')
      .setDescription('View a nation\'s reputation with others')
      .addStringOption(opt =>
        opt.setName('nation')
          .setDescription('Nation to view')
          .setRequired(true)
          .setAutocomplete(true)))
  .addSubcommand(sub =>
    sub.setName('between')
      .setDescription('View reputation between two specific nations')
      .addStringOption(opt =>
        opt.setName('nation1')
          .setDescription('First nation')
          .setRequired(true)
          .setAutocomplete(true))
      .addStringOption(opt =>
        opt.setName('nation2')
          .setDescription('Second nation')
          .setRequired(true)
          .setAutocomplete(true)))
  .addSubcommand(sub =>
    sub.setName('set')
      .setDescription('[GM] Set reputation between two nations')
      .addStringOption(opt =>
        opt.setName('nation')
          .setDescription('Nation whose opinion is being set')
          .setRequired(true)
          .setAutocomplete(true))
      .addStringOption(opt =>
        opt.setName('target')
          .setDescription('Nation being judged')
          .setRequired(true)
          .setAutocomplete(true))
      .addIntegerOption(opt =>
        opt.setName('value')
          .setDescription('Reputation value (-100 to +100)')
          .setRequired(true)
          .setMinValue(-100)
          .setMaxValue(100))
      .addStringOption(opt =>
        opt.setName('reason')
          .setDescription('Reason for this reputation')
          .setRequired(false)))
  .addSubcommand(sub =>
    sub.setName('modify')
      .setDescription('[GM] Modify reputation between two nations')
      .addStringOption(opt =>
        opt.setName('nation')
          .setDescription('Nation whose opinion is changing')
          .setRequired(true)
          .setAutocomplete(true))
      .addStringOption(opt =>
        opt.setName('target')
          .setDescription('Nation being judged')
          .setRequired(true)
          .setAutocomplete(true))
      .addIntegerOption(opt =>
        opt.setName('change')
          .setDescription('Amount to change (+/-)')
          .setRequired(true)
          .setMinValue(-100)
          .setMaxValue(100))
      .addStringOption(opt =>
        opt.setName('reason')
          .setDescription('Reason for this change')
          .setRequired(true)))
  .addSubcommand(sub =>
    sub.setName('setstatus')
      .setDescription('[GM] Override relationship status')
      .addStringOption(opt =>
        opt.setName('nation')
          .setDescription('Nation whose opinion is being set')
          .setRequired(true)
          .setAutocomplete(true))
      .addStringOption(opt =>
        opt.setName('target')
          .setDescription('Nation being judged')
          .setRequired(true)
          .setAutocomplete(true))
      .addStringOption(opt =>
        opt.setName('status')
          .setDescription('Relationship status')
          .setRequired(true)
          .addChoices(
            { name: 'Allied', value: 'allied' },
            { name: 'Friendly', value: 'friendly' },
            { name: 'Cordial', value: 'cordial' },
            { name: 'Neutral', value: 'neutral' },
            { name: 'Cold', value: 'cold' },
            { name: 'Hostile', value: 'hostile' },
            { name: 'Enemy', value: 'enemy' },
            { name: 'At War', value: 'war' },
          )))
  .addSubcommand(sub =>
    sub.setName('history')
      .setDescription('View reputation change history between nations')
      .addStringOption(opt =>
        opt.setName('nation')
          .setDescription('First nation')
          .setRequired(true)
          .setAutocomplete(true))
      .addStringOption(opt =>
        opt.setName('target')
          .setDescription('Second nation')
          .setRequired(true)
          .setAutocomplete(true)));

export async function execute(interaction) {
  const subcommand = interaction.options.getSubcommand();

  switch (subcommand) {
    case 'view':
      return handleView(interaction);
    case 'between':
      return handleBetween(interaction);
    case 'set':
      return handleSet(interaction);
    case 'modify':
      return handleModify(interaction);
    case 'setstatus':
      return handleSetStatus(interaction);
    case 'history':
      return handleHistory(interaction);
  }
}

async function handleView(interaction) {
  const guildId = interaction.guildId;
  const nationName = interaction.options.getString('nation');

  const nation = await Nation.findOne({ guildId, name: { $regex: new RegExp(`^${nationName}$`, 'i') } });
  if (!nation) {
    return interaction.reply({ embeds: [errorEmbed(`Nation **${nationName}** not found.`)], ephemeral: true });
  }

  const reputations = await getNationReputations(guildId, nation._id);

  if (reputations.length === 0) {
    return interaction.reply({
      embeds: [createEmbed({
        title: `${nation.name} - Reputations`,
        description: 'No reputation records exist yet.',
        color: config.colors.primary,
      })],
    });
  }

  const embed = createEmbed({
    title: `${nation.name} - Reputations`,
    description: `How **${nation.name}** views other nations:`,
    color: config.colors.primary,
  });

  const repList = reputations.map(r => {
    const info = STATUS_INFO[r.status] || STATUS_INFO.neutral;
    return `${info.emoji} **${r.targetNationName}**: ${r.value} (${info.label})`;
  }).join('\n');

  embed.addFields({ name: 'Relations', value: repList || 'None', inline: false });

  await interaction.reply({ embeds: [embed] });
}

async function handleBetween(interaction) {
  const guildId = interaction.guildId;
  const nation1Name = interaction.options.getString('nation1');
  const nation2Name = interaction.options.getString('nation2');

  const nation1 = await Nation.findOne({ guildId, name: { $regex: new RegExp(`^${nation1Name}$`, 'i') } });
  const nation2 = await Nation.findOne({ guildId, name: { $regex: new RegExp(`^${nation2Name}$`, 'i') } });

  if (!nation1 || !nation2) {
    return interaction.reply({ embeds: [errorEmbed('One or both nations not found.')], ephemeral: true });
  }

  if (nation1._id.toString() === nation2._id.toString()) {
    return interaction.reply({ embeds: [errorEmbed('Cannot view reputation between a nation and itself.')], ephemeral: true });
  }

  // Get both directions
  const rep1to2 = await getOrCreateReputation(guildId, nation1._id, nation1.name, nation2._id, nation2.name);
  const rep2to1 = await getOrCreateReputation(guildId, nation2._id, nation2.name, nation1._id, nation1.name);

  const info1 = STATUS_INFO[rep1to2.status] || STATUS_INFO.neutral;
  const info2 = STATUS_INFO[rep2to1.status] || STATUS_INFO.neutral;

  const embed = createEmbed({
    title: `Relations: ${nation1.name} ↔ ${nation2.name}`,
    color: config.colors.primary,
  });

  embed.addFields(
    { 
      name: `${nation1.name} → ${nation2.name}`, 
      value: `${info1.emoji} **${rep1to2.value}** (${info1.label})`, 
      inline: true 
    },
    { 
      name: `${nation2.name} → ${nation1.name}`, 
      value: `${info2.emoji} **${rep2to1.value}** (${info2.label})`, 
      inline: true 
    },
  );

  // Calculate overall relationship
  const avgValue = Math.round((rep1to2.value + rep2to1.value) / 2);
  const avgStatus = deriveStatus(avgValue);
  const avgInfo = STATUS_INFO[avgStatus];
  
  embed.addFields({
    name: 'Overall Relationship',
    value: `${avgInfo.emoji} ${avgInfo.label} (avg: ${avgValue})`,
    inline: false,
  });

  await interaction.reply({ embeds: [embed] });
}

async function handleSet(interaction) {
  if (!requireGM(interaction)) return;

  const guildId = interaction.guildId;
  const nationName = interaction.options.getString('nation');
  const targetName = interaction.options.getString('target');
  const value = interaction.options.getInteger('value');
  const reason = interaction.options.getString('reason') || 'GM set reputation';

  const nation = await Nation.findOne({ guildId, name: { $regex: new RegExp(`^${nationName}$`, 'i') } });
  const target = await Nation.findOne({ guildId, name: { $regex: new RegExp(`^${targetName}$`, 'i') } });

  if (!nation || !target) {
    return interaction.reply({ embeds: [errorEmbed('One or both nations not found.')], ephemeral: true });
  }

  if (nation._id.toString() === target._id.toString()) {
    return interaction.reply({ embeds: [errorEmbed('Cannot set reputation with itself.')], ephemeral: true });
  }

  const rep = await getOrCreateReputation(guildId, nation._id, nation.name, target._id, target.name);
  const oldValue = rep.value;
  
  rep.value = value;
  rep.history.push({
    oldValue,
    newValue: value,
    reason,
    changedBy: interaction.user.id,
  });
  await rep.save();

  await createAuditLog({
    guildId,
    entityType: 'reputation',
    entityId: rep._id,
    entityName: `${nation.name} → ${target.name}`,
    action: 'update',
    field: 'value',
    oldValue,
    newValue: value,
    description: `Set ${nation.name}'s reputation toward ${target.name} to ${value}`,
    performedBy: interaction.user.id,
    performedByTag: interaction.user.tag,
  });

  const info = STATUS_INFO[rep.status];
  await interaction.reply({
    embeds: [successEmbed(`Set **${nation.name}**'s reputation toward **${target.name}** to **${value}** (${info.emoji} ${info.label})`)],
  });
}

async function handleModify(interaction) {
  if (!requireGM(interaction)) return;

  const guildId = interaction.guildId;
  const nationName = interaction.options.getString('nation');
  const targetName = interaction.options.getString('target');
  const change = interaction.options.getInteger('change');
  const reason = interaction.options.getString('reason');

  const nation = await Nation.findOne({ guildId, name: { $regex: new RegExp(`^${nationName}$`, 'i') } });
  const target = await Nation.findOne({ guildId, name: { $regex: new RegExp(`^${targetName}$`, 'i') } });

  if (!nation || !target) {
    return interaction.reply({ embeds: [errorEmbed('One or both nations not found.')], ephemeral: true });
  }

  const rep = await modifyReputation(guildId, nation._id, nation.name, target._id, target.name, change, reason, interaction.user.id);

  await createAuditLog({
    guildId,
    entityType: 'reputation',
    entityId: rep._id,
    entityName: `${nation.name} → ${target.name}`,
    action: 'update',
    field: 'value',
    newValue: rep.value,
    description: `Modified ${nation.name}'s reputation toward ${target.name} by ${change > 0 ? '+' : ''}${change}: ${reason}`,
    performedBy: interaction.user.id,
    performedByTag: interaction.user.tag,
  });

  const info = STATUS_INFO[rep.status];
  const changeText = change > 0 ? `+${change}` : change.toString();
  
  await interaction.reply({
    embeds: [successEmbed(`**${nation.name}**'s reputation toward **${target.name}** changed by **${changeText}**\nNew value: **${rep.value}** (${info.emoji} ${info.label})\nReason: ${reason}`)],
  });
}

async function handleSetStatus(interaction) {
  if (!requireGM(interaction)) return;

  const guildId = interaction.guildId;
  const nationName = interaction.options.getString('nation');
  const targetName = interaction.options.getString('target');
  const status = interaction.options.getString('status');

  const nation = await Nation.findOne({ guildId, name: { $regex: new RegExp(`^${nationName}$`, 'i') } });
  const target = await Nation.findOne({ guildId, name: { $regex: new RegExp(`^${targetName}$`, 'i') } });

  if (!nation || !target) {
    return interaction.reply({ embeds: [errorEmbed('One or both nations not found.')], ephemeral: true });
  }

  const rep = await getOrCreateReputation(guildId, nation._id, nation.name, target._id, target.name);
  const oldStatus = rep.status;
  rep.status = status;
  await rep.save();

  await createAuditLog({
    guildId,
    entityType: 'reputation',
    entityId: rep._id,
    entityName: `${nation.name} → ${target.name}`,
    action: 'update',
    field: 'status',
    oldValue: oldStatus,
    newValue: status,
    description: `Set relationship status from ${nation.name} to ${target.name} as ${status}`,
    performedBy: interaction.user.id,
    performedByTag: interaction.user.tag,
  });

  const info = STATUS_INFO[status];
  await interaction.reply({
    embeds: [successEmbed(`Set **${nation.name}**'s relationship with **${target.name}** to ${info.emoji} **${info.label}**`)],
  });
}

async function handleHistory(interaction) {
  const guildId = interaction.guildId;
  const nationName = interaction.options.getString('nation');
  const targetName = interaction.options.getString('target');

  const nation = await Nation.findOne({ guildId, name: { $regex: new RegExp(`^${nationName}$`, 'i') } });
  const target = await Nation.findOne({ guildId, name: { $regex: new RegExp(`^${targetName}$`, 'i') } });

  if (!nation || !target) {
    return interaction.reply({ embeds: [errorEmbed('One or both nations not found.')], ephemeral: true });
  }

  const rep = await Reputation.findOne({ guildId, nationId: nation._id, targetNationId: target._id });

  if (!rep || !rep.history || rep.history.length === 0) {
    return interaction.reply({
      embeds: [errorEmbed(`No reputation history between **${nation.name}** and **${target.name}**.`)],
      ephemeral: true,
    });
  }

  const embed = createEmbed({
    title: `Reputation History: ${nation.name} → ${target.name}`,
    description: `Current: **${rep.value}** (${STATUS_INFO[rep.status]?.label || 'Unknown'})`,
    color: config.colors.primary,
  });

  const historyText = rep.history.slice(-10).reverse().map(h => {
    const date = new Date(h.changedAt).toLocaleDateString();
    const change = h.newValue - h.oldValue;
    const changeText = change > 0 ? `+${change}` : change.toString();
    return `**${h.oldValue} → ${h.newValue}** (${changeText})\n*${h.reason}*\n${date}`;
  }).join('\n\n');

  embed.addFields({ name: 'Recent Changes', value: historyText || 'No history', inline: false });

  await interaction.reply({ embeds: [embed] });
}

export async function autocomplete(interaction) {
  const focusedOption = interaction.options.getFocused(true);
  const guildId = interaction.guildId;

  if (['nation', 'nation1', 'nation2', 'target'].includes(focusedOption.name)) {
    const nations = await Nation.find({
      guildId,
      name: { $regex: focusedOption.value, $options: 'i' },
    }).limit(25);
    await interaction.respond(nations.map(n => ({ name: n.name, value: n.name })));
  }
}
