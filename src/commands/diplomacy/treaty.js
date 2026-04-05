import { SlashCommandBuilder } from 'discord.js';
import Nation from '../../database/models/Nation.js';
import Treaty from '../../database/models/Treaty.js';
import { createAuditLog } from '../../database/models/AuditLog.js';
import { isGM, requireGM } from '../../utils/permissions.js';
import { treatyEmbed, errorEmbed, successEmbed, createEmbed } from '../../utils/embeds.js';
import { formatDate } from '../../utils/formatters.js';
import config from '../../config.js';

export const data = new SlashCommandBuilder()
  .setName('treaty')
  .setDescription('Treaty and alliance management')
  .addSubcommand(sub =>
    sub.setName('create')
      .setDescription('Create a new treaty')
      .addStringOption(opt =>
        opt.setName('name')
          .setDescription('Name of the treaty')
          .setRequired(true))
      .addStringOption(opt =>
        opt.setName('type')
          .setDescription('Type of treaty')
          .setRequired(true)
          .addChoices(
            { name: 'Alliance', value: 'alliance' },
            { name: 'Non-Aggression Pact', value: 'non_aggression' },
            { name: 'Trade Agreement', value: 'trade' },
            { name: 'Defensive Pact', value: 'defensive' },
            { name: 'Military Access', value: 'military_access' },
            { name: 'Vassalage', value: 'vassalage' },
            { name: 'Custom', value: 'custom' },
          ))
      .addStringOption(opt =>
        opt.setName('nations')
          .setDescription('Nations signing (comma-separated)')
          .setRequired(true))
      .addStringOption(opt =>
        opt.setName('description')
          .setDescription('Treaty description')
          .setRequired(false)))
  .addSubcommand(sub =>
    sub.setName('add')
      .setDescription('Add a nation to an existing treaty')
      .addStringOption(opt =>
        opt.setName('treaty')
          .setDescription('Treaty to join')
          .setRequired(true)
          .setAutocomplete(true))
      .addStringOption(opt =>
        opt.setName('nation')
          .setDescription('Nation to add')
          .setRequired(true)
          .setAutocomplete(true)))
  .addSubcommand(sub =>
    sub.setName('remove')
      .setDescription('Remove a nation from a treaty')
      .addStringOption(opt =>
        opt.setName('treaty')
          .setDescription('Treaty')
          .setRequired(true)
          .setAutocomplete(true))
      .addStringOption(opt =>
        opt.setName('nation')
          .setDescription('Nation to remove')
          .setRequired(true)
          .setAutocomplete(true)))
  .addSubcommand(sub =>
    sub.setName('dissolve')
      .setDescription('Dissolve a treaty')
      .addStringOption(opt =>
        opt.setName('treaty')
          .setDescription('Treaty to dissolve')
          .setRequired(true)
          .setAutocomplete(true)))
  .addSubcommand(sub =>
    sub.setName('view')
      .setDescription('View details of a treaty')
      .addStringOption(opt =>
        opt.setName('treaty')
          .setDescription('Treaty to view')
          .setRequired(true)
          .setAutocomplete(true)))
  .addSubcommand(sub =>
    sub.setName('list')
      .setDescription('List all treaties')
      .addBooleanOption(opt =>
        opt.setName('active_only')
          .setDescription('Show only active treaties')
          .setRequired(false)))
  .addSubcommand(sub =>
    sub.setName('terms')
      .setDescription('Add terms to a treaty')
      .addStringOption(opt =>
        opt.setName('treaty')
          .setDescription('Treaty to modify')
          .setRequired(true)
          .setAutocomplete(true))
      .addStringOption(opt =>
        opt.setName('term')
          .setDescription('Term to add')
          .setRequired(true)));

export async function execute(interaction) {
  const subcommand = interaction.options.getSubcommand();

  switch (subcommand) {
    case 'create':
      return handleCreate(interaction);
    case 'add':
      return handleAdd(interaction);
    case 'remove':
      return handleRemove(interaction);
    case 'dissolve':
      return handleDissolve(interaction);
    case 'view':
      return handleView(interaction);
    case 'list':
      return handleList(interaction);
    case 'terms':
      return handleTerms(interaction);
  }
}

async function handleCreate(interaction) {
  if (!requireGM(interaction)) return;

  const guildId = interaction.guildId;
  const name = interaction.options.getString('name');
  const type = interaction.options.getString('type');
  const nationsStr = interaction.options.getString('nations');
  const description = interaction.options.getString('description') || '';

  // Parse nation names
  const nationNames = nationsStr.split(',').map(n => n.trim()).filter(n => n);
  
  if (nationNames.length < 2) {
    return interaction.reply({ embeds: [errorEmbed('A treaty requires at least 2 nations.')], ephemeral: true });
  }

  // Find all nations
  const members = [];
  for (const nationName of nationNames) {
    const nation = await Nation.findOne({ guildId, name: { $regex: new RegExp(`^${nationName}$`, 'i') } });
    if (!nation) {
      return interaction.reply({ embeds: [errorEmbed(`Nation **${nationName}** not found.`)], ephemeral: true });
    }
    members.push({ nation: nation._id, nationName: nation.name });
  }

  const treaty = await Treaty.create({
    guildId,
    name,
    type,
    description,
    members,
    status: 'active',
  });

  await createAuditLog({
    guildId,
    entityType: 'treaty',
    entityId: treaty._id,
    entityName: treaty.name,
    action: 'create',
    description: `Treaty created: "${name}" (${type}) between ${members.map(m => m.nationName).join(', ')}`,
    performedBy: interaction.user.id,
    performedByTag: interaction.user.tag,
  });

  await interaction.reply({ 
    content: `Treaty has been signed!`,
    embeds: [treatyEmbed(treaty)] 
  });
}

async function handleAdd(interaction) {
  if (!requireGM(interaction)) return;

  const guildId = interaction.guildId;
  const treatyName = interaction.options.getString('treaty');
  const nationName = interaction.options.getString('nation');

  const treaty = await Treaty.findOne({ 
    guildId,
    name: { $regex: new RegExp(`^${treatyName}$`, 'i') },
    status: 'active'
  });
  
  if (!treaty) {
    return interaction.reply({ embeds: [errorEmbed(`Active treaty **${treatyName}** not found.`)], ephemeral: true });
  }

  const nation = await Nation.findOne({ guildId, name: { $regex: new RegExp(`^${nationName}$`, 'i') } });
  if (!nation) {
    return interaction.reply({ embeds: [errorEmbed(`Nation **${nationName}** not found.`)], ephemeral: true });
  }

  // Check if already in treaty
  if (treaty.members.some(m => m.nation.equals(nation._id))) {
    return interaction.reply({ embeds: [errorEmbed(`**${nation.name}** is already a signatory.`)], ephemeral: true });
  }

  treaty.members.push({ nation: nation._id, nationName: nation.name });
  await treaty.save();

  await createAuditLog({
    guildId,
    entityType: 'treaty',
    entityId: treaty._id,
    entityName: treaty.name,
    action: 'update',
    description: `**${nation.name}** joined the treaty "${treaty.name}"`,
    performedBy: interaction.user.id,
    performedByTag: interaction.user.tag,
  });

  await interaction.reply({ embeds: [successEmbed(`**${nation.name}** has signed **${treaty.name}**.`)] });
}

async function handleRemove(interaction) {
  if (!requireGM(interaction)) return;

  const guildId = interaction.guildId;
  const treatyName = interaction.options.getString('treaty');
  const nationName = interaction.options.getString('nation');

  const treaty = await Treaty.findOne({ guildId, name: { $regex: new RegExp(`^${treatyName}$`, 'i') } });
  if (!treaty) {
    return interaction.reply({ embeds: [errorEmbed(`Treaty **${treatyName}** not found.`)], ephemeral: true });
  }

  const nation = await Nation.findOne({ guildId, name: { $regex: new RegExp(`^${nationName}$`, 'i') } });
  if (!nation) {
    return interaction.reply({ embeds: [errorEmbed(`Nation **${nationName}** not found.`)], ephemeral: true });
  }

  const memberIndex = treaty.members.findIndex(m => m.nation.equals(nation._id));
  if (memberIndex === -1) {
    return interaction.reply({ embeds: [errorEmbed(`**${nation.name}** is not a signatory.`)], ephemeral: true });
  }

  treaty.members.splice(memberIndex, 1);
  await treaty.save();

  await createAuditLog({
    guildId,
    entityType: 'treaty',
    entityId: treaty._id,
    entityName: treaty.name,
    action: 'update',
    description: `**${nation.name}** left the treaty "${treaty.name}"`,
    performedBy: interaction.user.id,
    performedByTag: interaction.user.tag,
  });

  await interaction.reply({ embeds: [successEmbed(`**${nation.name}** has withdrawn from **${treaty.name}**.`)] });
}

async function handleDissolve(interaction) {
  if (!requireGM(interaction)) return;

  const guildId = interaction.guildId;
  const treatyName = interaction.options.getString('treaty');

  const treaty = await Treaty.findOne({ 
    guildId,
    name: { $regex: new RegExp(`^${treatyName}$`, 'i') },
    status: 'active'
  });
  
  if (!treaty) {
    return interaction.reply({ embeds: [errorEmbed(`Active treaty **${treatyName}** not found.`)], ephemeral: true });
  }

  treaty.status = 'dissolved';
  treaty.dissolvedAt = new Date();
  await treaty.save();

  await createAuditLog({
    guildId,
    entityType: 'treaty',
    entityId: treaty._id,
    entityName: treaty.name,
    action: 'update',
    description: `Treaty dissolved: "${treaty.name}"`,
    performedBy: interaction.user.id,
    performedByTag: interaction.user.tag,
  });

  await interaction.reply({ embeds: [successEmbed(`Treaty **${treaty.name}** has been dissolved.`)] });
}

async function handleView(interaction) {
  const guildId = interaction.guildId;
  const treatyName = interaction.options.getString('treaty');
  const treaty = await Treaty.findOne({ guildId, name: { $regex: new RegExp(`^${treatyName}$`, 'i') } });

  if (!treaty) {
    return interaction.reply({ embeds: [errorEmbed(`Treaty **${treatyName}** not found.`)], ephemeral: true });
  }

  await interaction.reply({ embeds: [treatyEmbed(treaty)] });
}

async function handleList(interaction) {
  const guildId = interaction.guildId;
  const activeOnly = interaction.options.getBoolean('active_only') ?? true;
  
  const query = activeOnly ? { guildId, status: 'active' } : { guildId };
  const treaties = await Treaty.find(query).sort({ signedAt: -1 });

  if (treaties.length === 0) {
    return interaction.reply({ content: activeOnly ? 'No active treaties.' : 'No treaties recorded.' });
  }

  const embed = createEmbed({
    title: activeOnly ? 'Active Treaties' : 'All Treaties',
    color: config.colors.diplomacy,
  });

  const lines = treaties.map(t => {
    const members = t.members.map(m => m.nationName).join(', ');
    const type = t.type.replace(/_/g, ' ').toUpperCase();
    const status = t.status === 'active' ? '🟢' : '⚪';
    return `${status} **${t.name}** (${type})\n${members}`;
  });

  embed.setDescription(lines.join('\n\n'));

  await interaction.reply({ embeds: [embed] });
}

async function handleTerms(interaction) {
  if (!requireGM(interaction)) return;

  const guildId = interaction.guildId;
  const treatyName = interaction.options.getString('treaty');
  const term = interaction.options.getString('term');

  const treaty = await Treaty.findOne({ guildId, name: { $regex: new RegExp(`^${treatyName}$`, 'i') } });
  if (!treaty) {
    return interaction.reply({ embeds: [errorEmbed(`Treaty **${treatyName}** not found.`)], ephemeral: true });
  }

  treaty.terms.push(term);
  await treaty.save();

  await interaction.reply({ embeds: [successEmbed(`Term added to **${treaty.name}**.`)] });
}

export async function autocomplete(interaction) {
  const focusedOption = interaction.options.getFocused(true);
  const guildId = interaction.guildId;

  if (focusedOption.name === 'nation') {
    const nations = await Nation.find({
      guildId,
      name: { $regex: focusedOption.value, $options: 'i' }
    }).limit(25);
    await interaction.respond(nations.map(n => ({ name: n.name, value: n.name })));
  } else if (focusedOption.name === 'treaty') {
    const treaties = await Treaty.find({
      guildId,
      name: { $regex: focusedOption.value, $options: 'i' }
    }).limit(25);
    await interaction.respond(treaties.map(t => ({ name: `${t.name} (${t.status})`, value: t.name })));
  }
}
