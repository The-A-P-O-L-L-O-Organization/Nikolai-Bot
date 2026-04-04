import { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } from 'discord.js';
import Unit, { getAllUnits, getUnitsByCategory } from '../../database/models/Unit.js';
import { createAuditLog } from '../../database/models/AuditLog.js';
import { isGM, requireGM } from '../../utils/permissions.js';
import { errorEmbed, successEmbed, createEmbed, listEmbed } from '../../utils/embeds.js';
import { formatNumber } from '../../utils/formatters.js';
import config from '../../config.js';

export const data = new SlashCommandBuilder()
  .setName('unit')
  .setDescription('Unit type management')
  .addSubcommand(sub =>
    sub.setName('list')
      .setDescription('List all unit types')
      .addStringOption(opt =>
        opt.setName('category')
          .setDescription('Filter by category')
          .setRequired(false)
          .addChoices(
            { name: 'Army', value: 'army' },
            { name: 'Airforce', value: 'airforce' },
            { name: 'Navy', value: 'navy' },
          )))
  .addSubcommand(sub =>
    sub.setName('info')
      .setDescription('View details of a unit type')
      .addStringOption(opt =>
        opt.setName('name')
          .setDescription('Unit name')
          .setRequired(true)
          .setAutocomplete(true)))
  .addSubcommand(sub =>
    sub.setName('create')
      .setDescription('Create a custom unit type')
      .addStringOption(opt =>
        opt.setName('name')
          .setDescription('Unit name')
          .setRequired(true))
      .addStringOption(opt =>
        opt.setName('category')
          .setDescription('Unit category')
          .setRequired(true)
          .addChoices(
            { name: 'Army', value: 'army' },
            { name: 'Airforce', value: 'airforce' },
            { name: 'Navy', value: 'navy' },
          ))
      .addIntegerOption(opt =>
        opt.setName('production_time')
          .setDescription('Turns to produce (default: 1)')
          .setRequired(false)
          .setMinValue(1)
          .setMaxValue(20))
      .addStringOption(opt =>
        opt.setName('description')
          .setDescription('Unit description')
          .setRequired(false)))
  .addSubcommand(sub =>
    sub.setName('delete')
      .setDescription('Delete a custom unit type')
      .addStringOption(opt =>
        opt.setName('name')
          .setDescription('Unit name')
          .setRequired(true)
          .setAutocomplete(true)));

export async function execute(interaction) {
  const subcommand = interaction.options.getSubcommand();

  switch (subcommand) {
    case 'list':
      return handleList(interaction);
    case 'info':
      return handleInfo(interaction);
    case 'create':
      return handleCreate(interaction);
    case 'delete':
      return handleDelete(interaction);
  }
}

async function handleList(interaction) {
  const category = interaction.options.getString('category');
  
  let units;
  if (category) {
    units = await getUnitsByCategory(category);
  } else {
    units = await getAllUnits();
  }

  const embed = createEmbed({
    title: category ? `${category.charAt(0).toUpperCase() + category.slice(1)} Units` : 'All Unit Types',
    color: config.colors.military,
  });

  const categories = ['army', 'airforce', 'navy'];
  
  for (const cat of categories) {
    if (category && cat !== category) continue;
    
    const catUnits = units.filter(u => u.category === cat);
    if (catUnits.length === 0) continue;

    const lines = catUnits.map(u => {
      let line = `**${u.name}**`;
      if (u.productionTime > 1) line += ` (${u.productionTime} turns)`;
      if (!u.isDefault) line += ' *(Custom)*';
      return line;
    });

    embed.addFields({
      name: cat.charAt(0).toUpperCase() + cat.slice(1),
      value: lines.join('\n'),
      inline: true,
    });
  }

  await interaction.reply({ embeds: [embed] });
}

async function handleInfo(interaction) {
  const unitName = interaction.options.getString('name');
  const unit = await Unit.findOne({ name: { $regex: new RegExp(`^${unitName}$`, 'i') } });

  if (!unit) {
    return interaction.reply({ embeds: [errorEmbed(`Unit type **${unitName}** not found.`)], ephemeral: true });
  }

  const embed = createEmbed({
    title: unit.name,
    color: config.colors.military,
  });

  embed.addFields(
    { name: 'Category', value: unit.category.charAt(0).toUpperCase() + unit.category.slice(1), inline: true },
    { name: 'Production Time', value: `${unit.productionTime} turn(s)`, inline: true },
    { name: 'Type', value: unit.isDefault ? 'Built-in' : 'Custom', inline: true },
  );

  if (unit.description) {
    embed.setDescription(unit.description);
  }

  if (unit.costs && unit.costs.length > 0) {
    const costText = unit.costs.map(c => `${c.resource}: ${formatNumber(c.amount)}`).join('\n');
    embed.addFields({ name: 'Production Cost', value: costText, inline: false });
  }

  if (unit.maintenance && unit.maintenance.length > 0) {
    const maintText = unit.maintenance.map(m => `${m.resource}: ${formatNumber(m.amount)}`).join('\n');
    embed.addFields({ name: 'Maintenance/Turn', value: maintText, inline: false });
  }

  await interaction.reply({ embeds: [embed] });
}

async function handleCreate(interaction) {
  if (!requireGM(interaction)) return;

  const name = interaction.options.getString('name');
  const category = interaction.options.getString('category');
  const productionTime = interaction.options.getInteger('production_time') || 1;
  const description = interaction.options.getString('description') || '';

  const existing = await Unit.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
  if (existing) {
    return interaction.reply({ embeds: [errorEmbed(`A unit named **${name}** already exists.`)], ephemeral: true });
  }

  await Unit.create({
    name,
    category,
    productionTime,
    description,
    isDefault: false,
  });

  await createAuditLog({
    entityType: 'unit',
    entityName: name,
    action: 'create',
    description: `Custom ${category} unit **${name}** created (${productionTime} turns)`,
    performedBy: interaction.user.id,
    performedByTag: interaction.user.tag,
  });

  await interaction.reply({ embeds: [successEmbed(`Created custom ${category} unit: **${name}** (${productionTime} turn production)`)] });
}

async function handleDelete(interaction) {
  if (!requireGM(interaction)) return;

  const unitName = interaction.options.getString('name');
  const unit = await Unit.findOne({ name: { $regex: new RegExp(`^${unitName}$`, 'i') } });

  if (!unit) {
    return interaction.reply({ embeds: [errorEmbed(`Unit type **${unitName}** not found.`)], ephemeral: true });
  }

  if (unit.isDefault) {
    return interaction.reply({ embeds: [errorEmbed(`Cannot delete built-in unit **${unit.name}**. You can only delete custom units.`)], ephemeral: true });
  }

  await Unit.deleteOne({ _id: unit._id });

  await createAuditLog({
    entityType: 'unit',
    entityName: unit.name,
    action: 'delete',
    description: `Custom unit **${unit.name}** deleted`,
    performedBy: interaction.user.id,
    performedByTag: interaction.user.tag,
  });

  await interaction.reply({ embeds: [successEmbed(`Deleted custom unit **${unit.name}**.`)] });
}

export async function autocomplete(interaction) {
  const focusedOption = interaction.options.getFocused(true);

  if (focusedOption.name === 'name') {
    const units = await Unit.find({
      name: { $regex: focusedOption.value, $options: 'i' }
    }).limit(25);
    await interaction.respond(units.map(u => ({ name: `${u.name} (${u.category})`, value: u.name })));
  }
}
