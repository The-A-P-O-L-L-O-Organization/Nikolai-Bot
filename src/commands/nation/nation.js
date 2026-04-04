import { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, StringSelectMenuBuilder } from 'discord.js';
import Nation from '../../database/models/Nation.js';
import Template from '../../database/models/Template.js';
import { createAuditLog } from '../../database/models/AuditLog.js';
import { isGM, requireGM } from '../../utils/permissions.js';
import { nationEmbed, errorEmbed, successEmbed, listEmbed } from '../../utils/embeds.js';
import { greatPower } from '../../presets/templates/greatPower.js';
import { regionalPower } from '../../presets/templates/regionalPower.js';
import { minorNation } from '../../presets/templates/minorNation.js';

export const data = new SlashCommandBuilder()
  .setName('nation')
  .setDescription('Nation management commands')
  .addSubcommand(sub =>
    sub.setName('create')
      .setDescription('Create a new nation')
      .addStringOption(opt =>
        opt.setName('name')
          .setDescription('Name of the nation')
          .setRequired(true))
      .addStringOption(opt =>
        opt.setName('template')
          .setDescription('Template to use')
          .setRequired(false)
          .addChoices(
            { name: 'Great Power (USA-style)', value: 'great_power' },
            { name: 'Regional Power', value: 'regional_power' },
            { name: 'Minor Nation', value: 'minor_nation' },
            { name: 'Blank (No template)', value: 'blank' },
          ))
      .addUserOption(opt =>
        opt.setName('owner')
          .setDescription('Player who owns this nation')
          .setRequired(false)))
  .addSubcommand(sub =>
    sub.setName('view')
      .setDescription('View a nation\'s stats')
      .addStringOption(opt =>
        opt.setName('name')
          .setDescription('Name of the nation')
          .setRequired(true)
          .setAutocomplete(true)))
  .addSubcommand(sub =>
    sub.setName('edit')
      .setDescription('Edit a nation\'s basic info')
      .addStringOption(opt =>
        opt.setName('name')
          .setDescription('Name of the nation to edit')
          .setRequired(true)
          .setAutocomplete(true)))
  .addSubcommand(sub =>
    sub.setName('delete')
      .setDescription('Delete a nation')
      .addStringOption(opt =>
        opt.setName('name')
          .setDescription('Name of the nation to delete')
          .setRequired(true)
          .setAutocomplete(true)))
  .addSubcommand(sub =>
    sub.setName('assign')
      .setDescription('Assign a player to a nation')
      .addStringOption(opt =>
        opt.setName('nation')
          .setDescription('Nation to assign')
          .setRequired(true)
          .setAutocomplete(true))
      .addUserOption(opt =>
        opt.setName('player')
          .setDescription('Player to assign (leave empty to unassign)')
          .setRequired(false)))
  .addSubcommand(sub =>
    sub.setName('list')
      .setDescription('List all nations'))
  .addSubcommand(sub =>
    sub.setName('stats')
      .setDescription('Set a specific stat on a nation')
      .addStringOption(opt =>
        opt.setName('nation')
          .setDescription('Nation to modify')
          .setRequired(true)
          .setAutocomplete(true))
      .addStringOption(opt =>
        opt.setName('stat')
          .setDescription('Stat to modify')
          .setRequired(true)
          .addChoices(
            { name: 'Leader', value: 'leader' },
            { name: 'Population', value: 'population' },
            { name: 'GDP', value: 'gdp' },
            { name: 'Budget', value: 'budget' },
            { name: 'Inflation', value: 'inflation' },
            { name: 'Stability', value: 'stability' },
            { name: 'Nukes', value: 'nukes' },
            { name: 'Primary Currency', value: 'primaryCurrency' },
          ))
      .addStringOption(opt =>
        opt.setName('value')
          .setDescription('New value')
          .setRequired(true)));

export async function execute(interaction) {
  const subcommand = interaction.options.getSubcommand();

  switch (subcommand) {
    case 'create':
      return handleCreate(interaction);
    case 'view':
      return handleView(interaction);
    case 'edit':
      return handleEdit(interaction);
    case 'delete':
      return handleDelete(interaction);
    case 'assign':
      return handleAssign(interaction);
    case 'list':
      return handleList(interaction);
    case 'stats':
      return handleStats(interaction);
  }
}

async function handleCreate(interaction) {
  if (!requireGM(interaction)) return;

  const name = interaction.options.getString('name');
  const templateType = interaction.options.getString('template') || 'blank';
  const owner = interaction.options.getUser('owner');

  // Check if nation already exists
  const existing = await Nation.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
  if (existing) {
    return interaction.reply({ embeds: [errorEmbed(`A nation named **${name}** already exists.`)], ephemeral: true });
  }

  // Get template data
  let templateData = {};
  let templateName = null;

  switch (templateType) {
    case 'great_power':
      templateData = greatPower.data;
      templateName = 'Great Power';
      break;
    case 'regional_power':
      templateData = regionalPower.data;
      templateName = 'Regional Power';
      break;
    case 'minor_nation':
      templateData = minorNation.data;
      templateName = 'Minor Nation';
      break;
  }

  // Create nation
  const nationData = {
    name,
    owner: owner?.id || null,
    createdFrom: templateName,
    ...templateData,
    economy: {
      ...templateData.economy,
      currencies: new Map(Object.entries(templateData.economy?.currencies || {})),
      income: new Map(),
      expenses: new Map(),
    },
    resources: new Map(Object.entries(templateData.resources || {})),
    resourceIncome: new Map(),
  };

  const nation = await Nation.create(nationData);

  // Audit log
  await createAuditLog({
    entityType: 'nation',
    entityId: nation._id,
    entityName: nation.name,
    action: 'create',
    description: `Nation **${name}** created${templateName ? ` from template **${templateName}**` : ''}${owner ? ` and assigned to <@${owner.id}>` : ''}`,
    performedBy: interaction.user.id,
    performedByTag: interaction.user.tag,
  });

  await interaction.reply({
    content: `Nation **${name}** has been created!${templateName ? ` (Template: ${templateName})` : ''}`,
    embeds: [nationEmbed(nation)],
  });
}

async function handleView(interaction) {
  const name = interaction.options.getString('name');
  const nation = await Nation.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });

  if (!nation) {
    return interaction.reply({ embeds: [errorEmbed(`Nation **${name}** not found.`)], ephemeral: true });
  }

  await interaction.reply({ embeds: [nationEmbed(nation)] });
}

async function handleEdit(interaction) {
  if (!requireGM(interaction)) return;

  const name = interaction.options.getString('name');
  const nation = await Nation.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });

  if (!nation) {
    return interaction.reply({ embeds: [errorEmbed(`Nation **${name}** not found.`)], ephemeral: true });
  }

  // Show modal for editing
  const modal = new ModalBuilder()
    .setCustomId(`nation:edit:${nation._id}`)
    .setTitle(`Edit ${nation.name}`);

  const nameInput = new TextInputBuilder()
    .setCustomId('name')
    .setLabel('Nation Name')
    .setStyle(TextInputStyle.Short)
    .setValue(nation.name)
    .setRequired(true);

  const leaderInput = new TextInputBuilder()
    .setCustomId('leader')
    .setLabel('Leader')
    .setStyle(TextInputStyle.Short)
    .setValue(nation.leader)
    .setRequired(false);

  const populationInput = new TextInputBuilder()
    .setCustomId('population')
    .setLabel('Population (e.g., 300M, 1.2B)')
    .setStyle(TextInputStyle.Short)
    .setValue(nation.population)
    .setRequired(false);

  const descriptionInput = new TextInputBuilder()
    .setCustomId('description')
    .setLabel('Description')
    .setStyle(TextInputStyle.Paragraph)
    .setValue(nation.description || '')
    .setRequired(false)
    .setMaxLength(1000);

  const flagInput = new TextInputBuilder()
    .setCustomId('flag')
    .setLabel('Flag Image URL')
    .setStyle(TextInputStyle.Short)
    .setValue(nation.flag || '')
    .setRequired(false);

  modal.addComponents(
    new ActionRowBuilder().addComponents(nameInput),
    new ActionRowBuilder().addComponents(leaderInput),
    new ActionRowBuilder().addComponents(populationInput),
    new ActionRowBuilder().addComponents(descriptionInput),
    new ActionRowBuilder().addComponents(flagInput),
  );

  await interaction.showModal(modal);
}

async function handleDelete(interaction) {
  if (!requireGM(interaction)) return;

  const name = interaction.options.getString('name');
  const nation = await Nation.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });

  if (!nation) {
    return interaction.reply({ embeds: [errorEmbed(`Nation **${name}** not found.`)], ephemeral: true });
  }

  await Nation.deleteOne({ _id: nation._id });

  // Audit log
  await createAuditLog({
    entityType: 'nation',
    entityId: nation._id,
    entityName: nation.name,
    action: 'delete',
    description: `Nation **${nation.name}** was deleted`,
    performedBy: interaction.user.id,
    performedByTag: interaction.user.tag,
  });

  await interaction.reply({ embeds: [successEmbed(`Nation **${nation.name}** has been deleted.`)] });
}

async function handleAssign(interaction) {
  if (!requireGM(interaction)) return;

  const nationName = interaction.options.getString('nation');
  const player = interaction.options.getUser('player');

  const nation = await Nation.findOne({ name: { $regex: new RegExp(`^${nationName}$`, 'i') } });
  if (!nation) {
    return interaction.reply({ embeds: [errorEmbed(`Nation **${nationName}** not found.`)], ephemeral: true });
  }

  const oldOwner = nation.owner;
  nation.owner = player?.id || null;
  await nation.save();

  // Audit log
  await createAuditLog({
    entityType: 'nation',
    entityId: nation._id,
    entityName: nation.name,
    action: 'update',
    field: 'owner',
    oldValue: oldOwner,
    newValue: player?.id || null,
    description: player 
      ? `**${nation.name}** assigned to <@${player.id}>`
      : `**${nation.name}** unassigned from owner`,
    performedBy: interaction.user.id,
    performedByTag: interaction.user.tag,
  });

  if (player) {
    await interaction.reply({ embeds: [successEmbed(`**${nation.name}** has been assigned to ${player}.`)] });
  } else {
    await interaction.reply({ embeds: [successEmbed(`**${nation.name}** has been unassigned.`)] });
  }
}

async function handleList(interaction) {
  const nations = await Nation.find().sort({ name: 1 });

  if (nations.length === 0) {
    return interaction.reply({ embeds: [errorEmbed('No nations exist yet. Create one with `/nation create`.')] });
  }

  const items = nations.map(n => {
    const ownerText = n.owner ? `<@${n.owner}>` : '*Unassigned*';
    return `**${n.name}** - ${n.leader} | ${n.population} pop | ${ownerText}`;
  });

  await interaction.reply({ embeds: [listEmbed('Nations', items)] });
}

async function handleStats(interaction) {
  if (!requireGM(interaction)) return;

  const nationName = interaction.options.getString('nation');
  const stat = interaction.options.getString('stat');
  const value = interaction.options.getString('value');

  const nation = await Nation.findOne({ name: { $regex: new RegExp(`^${nationName}$`, 'i') } });
  if (!nation) {
    return interaction.reply({ embeds: [errorEmbed(`Nation **${nationName}** not found.`)], ephemeral: true });
  }

  let oldValue;
  let displayStat = stat;

  switch (stat) {
    case 'leader':
      oldValue = nation.leader;
      nation.leader = value;
      break;
    case 'population':
      oldValue = nation.population;
      nation.population = value;
      // Try to parse the number
      const popMatch = value.toUpperCase().match(/^([\d.]+)\s*([KMB])?$/);
      if (popMatch) {
        const num = parseFloat(popMatch[1]);
        const mult = { K: 1e3, M: 1e6, B: 1e9 }[popMatch[2]] || 1;
        nation.populationNumber = num * mult;
      }
      break;
    case 'gdp':
      oldValue = nation.economy.gdp;
      nation.economy.gdp = parseFloat(value.replace(/[^0-9.-]/g, '')) || 0;
      displayStat = 'GDP';
      break;
    case 'budget':
      oldValue = nation.economy.budget;
      nation.economy.budget = parseFloat(value.replace(/[^0-9.-]/g, '')) || 0;
      break;
    case 'inflation':
      oldValue = nation.economy.inflation;
      nation.economy.inflation = parseFloat(value) || 0;
      break;
    case 'stability':
      oldValue = nation.stability;
      nation.stability = Math.max(0, Math.min(100, parseFloat(value) || 0));
      break;
    case 'nukes':
      oldValue = nation.nukes;
      nation.nukes = parseInt(value) || 0;
      break;
    case 'primaryCurrency':
      oldValue = nation.economy.primaryCurrency;
      nation.economy.primaryCurrency = value;
      displayStat = 'Primary Currency';
      break;
  }

  await nation.save();

  // Audit log
  await createAuditLog({
    entityType: 'nation',
    entityId: nation._id,
    entityName: nation.name,
    action: 'update',
    field: stat,
    oldValue,
    newValue: value,
    description: `**${nation.name}** ${displayStat} changed from **${oldValue}** to **${value}**`,
    performedBy: interaction.user.id,
    performedByTag: interaction.user.tag,
  });

  await interaction.reply({ embeds: [successEmbed(`**${nation.name}**'s ${displayStat} has been set to **${value}**.`)] });
}

// Handle modal submissions
export async function handleModal(interaction) {
  const [, action, nationId] = interaction.customId.split(':');
  
  if (action === 'edit') {
    const nation = await Nation.findById(nationId);
    if (!nation) {
      return interaction.reply({ embeds: [errorEmbed('Nation not found.')], ephemeral: true });
    }

    const newName = interaction.fields.getTextInputValue('name');
    const newLeader = interaction.fields.getTextInputValue('leader');
    const newPopulation = interaction.fields.getTextInputValue('population');
    const newDescription = interaction.fields.getTextInputValue('description');
    const newFlag = interaction.fields.getTextInputValue('flag');

    // Track changes for audit
    const changes = [];
    if (newName !== nation.name) changes.push(`Name: ${nation.name} → ${newName}`);
    if (newLeader !== nation.leader) changes.push(`Leader: ${nation.leader} → ${newLeader}`);
    if (newPopulation !== nation.population) changes.push(`Population: ${nation.population} → ${newPopulation}`);

    nation.name = newName;
    nation.leader = newLeader || nation.leader;
    nation.population = newPopulation || nation.population;
    nation.description = newDescription;
    nation.flag = newFlag || null;

    await nation.save();

    // Audit log
    if (changes.length > 0) {
      await createAuditLog({
        entityType: 'nation',
        entityId: nation._id,
        entityName: nation.name,
        action: 'update',
        description: `**${nation.name}** updated: ${changes.join(', ')}`,
        performedBy: interaction.user.id,
        performedByTag: interaction.user.tag,
      });
    }

    await interaction.reply({
      content: `**${nation.name}** has been updated!`,
      embeds: [nationEmbed(nation)],
    });
  }
}

// Autocomplete for nation names
export async function autocomplete(interaction) {
  const focusedValue = interaction.options.getFocused().toLowerCase();
  const nations = await Nation.find({
    name: { $regex: focusedValue, $options: 'i' }
  }).limit(25);

  await interaction.respond(
    nations.map(n => ({ name: n.name, value: n.name }))
  );
}
