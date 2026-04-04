import { SlashCommandBuilder } from 'discord.js';
import Nation from '../../database/models/Nation.js';
import War from '../../database/models/War.js';
import { createAuditLog } from '../../database/models/AuditLog.js';
import { isGM, requireGM } from '../../utils/permissions.js';
import { warEmbed, errorEmbed, successEmbed, createEmbed, listEmbed } from '../../utils/embeds.js';
import { formatDate } from '../../utils/formatters.js';
import config from '../../config.js';

export const data = new SlashCommandBuilder()
  .setName('war')
  .setDescription('War and conflict management')
  .addSubcommand(sub =>
    sub.setName('declare')
      .setDescription('Declare a new war')
      .addStringOption(opt =>
        opt.setName('name')
          .setDescription('Name of the war')
          .setRequired(true))
      .addStringOption(opt =>
        opt.setName('aggressor')
          .setDescription('Attacking nation')
          .setRequired(true)
          .setAutocomplete(true))
      .addStringOption(opt =>
        opt.setName('defender')
          .setDescription('Defending nation')
          .setRequired(true)
          .setAutocomplete(true))
      .addStringOption(opt =>
        opt.setName('reason')
          .setDescription('Casus belli / reason for war')
          .setRequired(false)))
  .addSubcommand(sub =>
    sub.setName('join')
      .setDescription('Add a nation to a war')
      .addStringOption(opt =>
        opt.setName('war')
          .setDescription('War to join')
          .setRequired(true)
          .setAutocomplete(true))
      .addStringOption(opt =>
        opt.setName('nation')
          .setDescription('Nation joining')
          .setRequired(true)
          .setAutocomplete(true))
      .addStringOption(opt =>
        opt.setName('side')
          .setDescription('Which side to join')
          .setRequired(true)
          .addChoices(
            { name: 'Aggressors', value: 'aggressors' },
            { name: 'Defenders', value: 'defenders' },
          )))
  .addSubcommand(sub =>
    sub.setName('end')
      .setDescription('End a war')
      .addStringOption(opt =>
        opt.setName('war')
          .setDescription('War to end')
          .setRequired(true)
          .setAutocomplete(true))
      .addStringOption(opt =>
        opt.setName('outcome')
          .setDescription('How the war ended')
          .setRequired(false)
          .addChoices(
            { name: 'Aggressor Victory', value: 'aggressor_victory' },
            { name: 'Defender Victory', value: 'defender_victory' },
            { name: 'White Peace', value: 'white_peace' },
            { name: 'Stalemate', value: 'stalemate' },
          )))
  .addSubcommand(sub =>
    sub.setName('view')
      .setDescription('View details of a war')
      .addStringOption(opt =>
        opt.setName('war')
          .setDescription('War to view')
          .setRequired(true)
          .setAutocomplete(true)))
  .addSubcommand(sub =>
    sub.setName('list')
      .setDescription('List all wars')
      .addBooleanOption(opt =>
        opt.setName('active_only')
          .setDescription('Show only active wars')
          .setRequired(false)))
  .addSubcommand(sub =>
    sub.setName('note')
      .setDescription('Add a note to a war')
      .addStringOption(opt =>
        opt.setName('war')
          .setDescription('War to add note to')
          .setRequired(true)
          .setAutocomplete(true))
      .addStringOption(opt =>
        opt.setName('note')
          .setDescription('Note content')
          .setRequired(true)));

export async function execute(interaction) {
  const subcommand = interaction.options.getSubcommand();

  switch (subcommand) {
    case 'declare':
      return handleDeclare(interaction);
    case 'join':
      return handleJoin(interaction);
    case 'end':
      return handleEnd(interaction);
    case 'view':
      return handleView(interaction);
    case 'list':
      return handleList(interaction);
    case 'note':
      return handleNote(interaction);
  }
}

async function handleDeclare(interaction) {
  if (!requireGM(interaction)) return;

  const name = interaction.options.getString('name');
  const aggressorName = interaction.options.getString('aggressor');
  const defenderName = interaction.options.getString('defender');
  const reason = interaction.options.getString('reason') || '';

  const aggressor = await Nation.findOne({ name: { $regex: new RegExp(`^${aggressorName}$`, 'i') } });
  const defender = await Nation.findOne({ name: { $regex: new RegExp(`^${defenderName}$`, 'i') } });

  if (!aggressor) {
    return interaction.reply({ embeds: [errorEmbed(`Nation **${aggressorName}** not found.`)], ephemeral: true });
  }
  if (!defender) {
    return interaction.reply({ embeds: [errorEmbed(`Nation **${defenderName}** not found.`)], ephemeral: true });
  }

  const war = await War.create({
    name,
    aggressors: [{ nation: aggressor._id, nationName: aggressor.name }],
    defenders: [{ nation: defender._id, nationName: defender.name }],
    reason,
    status: 'active',
  });

  await createAuditLog({
    entityType: 'war',
    entityId: war._id,
    entityName: war.name,
    action: 'create',
    description: `War declared: **${aggressor.name}** vs **${defender.name}** - "${name}"`,
    performedBy: interaction.user.id,
    performedByTag: interaction.user.tag,
  });

  await interaction.reply({ 
    content: `War has been declared!`,
    embeds: [warEmbed(war)] 
  });
}

async function handleJoin(interaction) {
  if (!requireGM(interaction)) return;

  const warName = interaction.options.getString('war');
  const nationName = interaction.options.getString('nation');
  const side = interaction.options.getString('side');

  const war = await War.findOne({ 
    name: { $regex: new RegExp(`^${warName}$`, 'i') },
    status: 'active'
  });
  
  if (!war) {
    return interaction.reply({ embeds: [errorEmbed(`Active war **${warName}** not found.`)], ephemeral: true });
  }

  const nation = await Nation.findOne({ name: { $regex: new RegExp(`^${nationName}$`, 'i') } });
  if (!nation) {
    return interaction.reply({ embeds: [errorEmbed(`Nation **${nationName}** not found.`)], ephemeral: true });
  }

  // Check if already in war
  const inAggressors = war.aggressors.some(a => a.nation.equals(nation._id));
  const inDefenders = war.defenders.some(d => d.nation.equals(nation._id));
  
  if (inAggressors || inDefenders) {
    return interaction.reply({ embeds: [errorEmbed(`**${nation.name}** is already in this war.`)], ephemeral: true });
  }

  war[side].push({ nation: nation._id, nationName: nation.name });
  await war.save();

  await createAuditLog({
    entityType: 'war',
    entityId: war._id,
    entityName: war.name,
    action: 'update',
    description: `**${nation.name}** joined the ${side} in "${war.name}"`,
    performedBy: interaction.user.id,
    performedByTag: interaction.user.tag,
  });

  await interaction.reply({ embeds: [successEmbed(`**${nation.name}** has joined the ${side} in **${war.name}**.`)] });
}

async function handleEnd(interaction) {
  if (!requireGM(interaction)) return;

  const warName = interaction.options.getString('war');
  const outcome = interaction.options.getString('outcome');

  const war = await War.findOne({ 
    name: { $regex: new RegExp(`^${warName}$`, 'i') },
    status: 'active'
  });
  
  if (!war) {
    return interaction.reply({ embeds: [errorEmbed(`Active war **${warName}** not found.`)], ephemeral: true });
  }

  war.status = 'ended';
  war.endedAt = new Date();
  if (outcome) war.outcome = outcome;
  await war.save();

  await createAuditLog({
    entityType: 'war',
    entityId: war._id,
    entityName: war.name,
    action: 'update',
    description: `War ended: "${war.name}"${outcome ? ` - ${outcome.replace(/_/g, ' ')}` : ''}`,
    performedBy: interaction.user.id,
    performedByTag: interaction.user.tag,
  });

  await interaction.reply({ 
    content: `War has ended!`,
    embeds: [warEmbed(war)] 
  });
}

async function handleView(interaction) {
  const warName = interaction.options.getString('war');
  const war = await War.findOne({ name: { $regex: new RegExp(`^${warName}$`, 'i') } });

  if (!war) {
    return interaction.reply({ embeds: [errorEmbed(`War **${warName}** not found.`)], ephemeral: true });
  }

  await interaction.reply({ embeds: [warEmbed(war)] });
}

async function handleList(interaction) {
  const activeOnly = interaction.options.getBoolean('active_only') ?? true;
  
  const query = activeOnly ? { status: 'active' } : {};
  const wars = await War.find(query).sort({ startedAt: -1 });

  if (wars.length === 0) {
    return interaction.reply({ content: activeOnly ? 'No active wars.' : 'No wars recorded.' });
  }

  const embed = createEmbed({
    title: activeOnly ? 'Active Wars' : 'All Wars',
    color: config.colors.error,
  });

  const lines = wars.map(w => {
    const aggressors = w.aggressors.map(a => a.nationName).join(', ');
    const defenders = w.defenders.map(d => d.nationName).join(', ');
    const status = w.status === 'active' ? '🔴 ACTIVE' : '⚪ ENDED';
    return `**${w.name}** ${status}\n${aggressors} vs ${defenders}`;
  });

  embed.setDescription(lines.join('\n\n'));

  await interaction.reply({ embeds: [embed] });
}

async function handleNote(interaction) {
  if (!requireGM(interaction)) return;

  const warName = interaction.options.getString('war');
  const noteContent = interaction.options.getString('note');

  const war = await War.findOne({ name: { $regex: new RegExp(`^${warName}$`, 'i') } });
  if (!war) {
    return interaction.reply({ embeds: [errorEmbed(`War **${warName}** not found.`)], ephemeral: true });
  }

  war.notes.push({
    content: noteContent,
    addedBy: interaction.user.id,
  });
  await war.save();

  await interaction.reply({ embeds: [successEmbed(`Note added to **${war.name}**.`)] });
}

export async function autocomplete(interaction) {
  const focusedOption = interaction.options.getFocused(true);

  if (focusedOption.name === 'aggressor' || focusedOption.name === 'defender' || focusedOption.name === 'nation') {
    const nations = await Nation.find({
      name: { $regex: focusedOption.value, $options: 'i' }
    }).limit(25);
    await interaction.respond(nations.map(n => ({ name: n.name, value: n.name })));
  } else if (focusedOption.name === 'war') {
    const wars = await War.find({
      name: { $regex: focusedOption.value, $options: 'i' }
    }).limit(25);
    await interaction.respond(wars.map(w => ({ name: `${w.name} (${w.status})`, value: w.name })));
  }
}
