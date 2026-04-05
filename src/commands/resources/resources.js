import { SlashCommandBuilder } from 'discord.js';
import Nation from '../../database/models/Nation.js';
import Resource, { getAllResources, getAllNonCurrencyResources } from '../../database/models/Resource.js';
import { createAuditLog } from '../../database/models/AuditLog.js';
import { isGM, requireGM } from '../../utils/permissions.js';
import { errorEmbed, successEmbed, createEmbed, listEmbed } from '../../utils/embeds.js';
import { formatNumber, parseAbbreviatedNumber } from '../../utils/formatters.js';
import config from '../../config.js';

export const data = new SlashCommandBuilder()
  .setName('resources')
  .setDescription('Resource management commands')
  .addSubcommand(sub =>
    sub.setName('list')
      .setDescription('List all available resource types'))
  .addSubcommand(sub =>
    sub.setName('view')
      .setDescription('View a nation\'s resources')
      .addStringOption(opt =>
        opt.setName('nation')
          .setDescription('Nation to view')
          .setRequired(true)
          .setAutocomplete(true)))
  .addSubcommand(sub =>
    sub.setName('add')
      .setDescription('Add resources to a nation')
      .addStringOption(opt =>
        opt.setName('nation')
          .setDescription('Nation to modify')
          .setRequired(true)
          .setAutocomplete(true))
      .addStringOption(opt =>
        opt.setName('resource')
          .setDescription('Resource to add')
          .setRequired(true)
          .setAutocomplete(true))
      .addStringOption(opt =>
        opt.setName('amount')
          .setDescription('Amount to add')
          .setRequired(true)))
  .addSubcommand(sub =>
    sub.setName('remove')
      .setDescription('Remove resources from a nation')
      .addStringOption(opt =>
        opt.setName('nation')
          .setDescription('Nation to modify')
          .setRequired(true)
          .setAutocomplete(true))
      .addStringOption(opt =>
        opt.setName('resource')
          .setDescription('Resource to remove')
          .setRequired(true)
          .setAutocomplete(true))
      .addStringOption(opt =>
        opt.setName('amount')
          .setDescription('Amount to remove')
          .setRequired(true)))
  .addSubcommand(sub =>
    sub.setName('set')
      .setDescription('Set a nation\'s resource amount')
      .addStringOption(opt =>
        opt.setName('nation')
          .setDescription('Nation to modify')
          .setRequired(true)
          .setAutocomplete(true))
      .addStringOption(opt =>
        opt.setName('resource')
          .setDescription('Resource to set')
          .setRequired(true)
          .setAutocomplete(true))
      .addStringOption(opt =>
        opt.setName('amount')
          .setDescription('New amount')
          .setRequired(true)))
  .addSubcommand(sub =>
    sub.setName('income')
      .setDescription('Set per-turn resource income')
      .addStringOption(opt =>
        opt.setName('nation')
          .setDescription('Nation to modify')
          .setRequired(true)
          .setAutocomplete(true))
      .addStringOption(opt =>
        opt.setName('resource')
          .setDescription('Resource')
          .setRequired(true)
          .setAutocomplete(true))
      .addStringOption(opt =>
        opt.setName('amount')
          .setDescription('Amount per turn')
          .setRequired(true)))
  .addSubcommand(sub =>
    sub.setName('create')
      .setDescription('Create a custom resource type')
      .addStringOption(opt =>
        opt.setName('name')
          .setDescription('Resource name')
          .setRequired(true))
      .addStringOption(opt =>
        opt.setName('icon')
          .setDescription('Emoji icon for the resource')
          .setRequired(false))
      .addStringOption(opt =>
        opt.setName('type')
          .setDescription('Resource type')
          .setRequired(false)
          .addChoices(
            { name: 'Resource (Oil, Steel, etc.)', value: 'resource' },
            { name: 'Currency (Money)', value: 'currency' },
          )));

export async function execute(interaction) {
  const subcommand = interaction.options.getSubcommand();

  switch (subcommand) {
    case 'list':
      return handleList(interaction);
    case 'view':
      return handleView(interaction);
    case 'add':
      return handleAdd(interaction);
    case 'remove':
      return handleRemove(interaction);
    case 'set':
      return handleSet(interaction);
    case 'income':
      return handleIncome(interaction);
    case 'create':
      return handleCreate(interaction);
  }
}

async function handleList(interaction) {
  const resources = await getAllResources();
  
  const currencies = resources.filter(r => r.type === 'currency');
  const nonCurrencies = resources.filter(r => r.type === 'resource');
  
  const embed = createEmbed({
    title: 'Available Resources',
    color: config.colors.primary,
  });

  if (currencies.length > 0) {
    embed.addFields({
      name: 'Currencies',
      value: currencies.map(r => `${r.icon} **${r.name}**${r.isDefault ? '' : ' (Custom)'}`).join('\n'),
      inline: true,
    });
  }

  if (nonCurrencies.length > 0) {
    embed.addFields({
      name: 'Resources',
      value: nonCurrencies.map(r => `${r.icon} **${r.name}**${r.isDefault ? '' : ' (Custom)'}`).join('\n'),
      inline: true,
    });
  }

  await interaction.reply({ embeds: [embed] });
}

async function handleView(interaction) {
  const guildId = interaction.guildId;
  const nationName = interaction.options.getString('nation');
  const nation = await Nation.findOne({ guildId, name: { $regex: new RegExp(`^${nationName}$`, 'i') } });

  if (!nation) {
    return interaction.reply({ embeds: [errorEmbed(`Nation **${nationName}** not found.`)], ephemeral: true });
  }

  const resources = await getAllNonCurrencyResources();
  
  const embed = createEmbed({
    title: `${nation.name} - Resources`,
    color: config.colors.primary,
  });

  const lines = [];
  for (const resource of resources) {
    const amount = nation.resources?.get(resource.name) || 0;
    const income = nation.resourceIncome?.get(resource.name) || 0;
    
    if (amount !== 0 || income !== 0) {
      let line = `${resource.icon} **${resource.name}:** ${formatNumber(amount)}`;
      if (income !== 0) {
        line += ` (${income >= 0 ? '+' : ''}${formatNumber(income)}/turn)`;
      }
      lines.push(line);
    }
  }

  if (lines.length === 0) {
    embed.setDescription('No resources stockpiled.');
  } else {
    embed.setDescription(lines.join('\n'));
  }

  await interaction.reply({ embeds: [embed] });
}

async function handleAdd(interaction) {
  if (!requireGM(interaction)) return;

  const guildId = interaction.guildId;
  const nationName = interaction.options.getString('nation');
  const resourceName = interaction.options.getString('resource');
  const amountStr = interaction.options.getString('amount');

  const nation = await Nation.findOne({ guildId, name: { $regex: new RegExp(`^${nationName}$`, 'i') } });
  if (!nation) {
    return interaction.reply({ embeds: [errorEmbed(`Nation **${nationName}** not found.`)], ephemeral: true });
  }

  const amount = parseAbbreviatedNumber(amountStr);
  if (!nation.resources) nation.resources = new Map();
  
  const currentAmount = nation.resources.get(resourceName) || 0;
  const newAmount = currentAmount + amount;
  nation.resources.set(resourceName, newAmount);
  await nation.save();

  await createAuditLog({
    guildId,
    entityType: 'nation',
    entityId: nation._id,
    entityName: nation.name,
    action: 'update',
    field: `resources.${resourceName}`,
    oldValue: currentAmount,
    newValue: newAmount,
    description: `Added **${formatNumber(amount)}** ${resourceName} to **${nation.name}**`,
    performedBy: interaction.user.id,
    performedByTag: interaction.user.tag,
  });

  await interaction.reply({ embeds: [successEmbed(`Added **${formatNumber(amount)}** ${resourceName} to **${nation.name}**.\nNew total: **${formatNumber(newAmount)}**`)] });
}

async function handleRemove(interaction) {
  if (!requireGM(interaction)) return;

  const guildId = interaction.guildId;
  const nationName = interaction.options.getString('nation');
  const resourceName = interaction.options.getString('resource');
  const amountStr = interaction.options.getString('amount');

  const nation = await Nation.findOne({ guildId, name: { $regex: new RegExp(`^${nationName}$`, 'i') } });
  if (!nation) {
    return interaction.reply({ embeds: [errorEmbed(`Nation **${nationName}** not found.`)], ephemeral: true });
  }

  const amount = parseAbbreviatedNumber(amountStr);
  if (!nation.resources) nation.resources = new Map();
  
  const currentAmount = nation.resources.get(resourceName) || 0;
  const newAmount = currentAmount - amount;
  nation.resources.set(resourceName, newAmount);
  await nation.save();

  await createAuditLog({
    guildId,
    entityType: 'nation',
    entityId: nation._id,
    entityName: nation.name,
    action: 'update',
    field: `resources.${resourceName}`,
    oldValue: currentAmount,
    newValue: newAmount,
    description: `Removed **${formatNumber(amount)}** ${resourceName} from **${nation.name}**`,
    performedBy: interaction.user.id,
    performedByTag: interaction.user.tag,
  });

  await interaction.reply({ embeds: [successEmbed(`Removed **${formatNumber(amount)}** ${resourceName} from **${nation.name}**.\nNew total: **${formatNumber(newAmount)}**`)] });
}

async function handleSet(interaction) {
  if (!requireGM(interaction)) return;

  const guildId = interaction.guildId;
  const nationName = interaction.options.getString('nation');
  const resourceName = interaction.options.getString('resource');
  const amountStr = interaction.options.getString('amount');

  const nation = await Nation.findOne({ guildId, name: { $regex: new RegExp(`^${nationName}$`, 'i') } });
  if (!nation) {
    return interaction.reply({ embeds: [errorEmbed(`Nation **${nationName}** not found.`)], ephemeral: true });
  }

  const amount = parseAbbreviatedNumber(amountStr);
  if (!nation.resources) nation.resources = new Map();
  
  const oldAmount = nation.resources.get(resourceName) || 0;
  nation.resources.set(resourceName, amount);
  await nation.save();

  await createAuditLog({
    guildId,
    entityType: 'nation',
    entityId: nation._id,
    entityName: nation.name,
    action: 'update',
    field: `resources.${resourceName}`,
    oldValue: oldAmount,
    newValue: amount,
    description: `**${nation.name}** ${resourceName} set to **${formatNumber(amount)}**`,
    performedBy: interaction.user.id,
    performedByTag: interaction.user.tag,
  });

  await interaction.reply({ embeds: [successEmbed(`**${nation.name}**'s ${resourceName} set to **${formatNumber(amount)}**.`)] });
}

async function handleIncome(interaction) {
  if (!requireGM(interaction)) return;

  const guildId = interaction.guildId;
  const nationName = interaction.options.getString('nation');
  const resourceName = interaction.options.getString('resource');
  const amountStr = interaction.options.getString('amount');

  const nation = await Nation.findOne({ guildId, name: { $regex: new RegExp(`^${nationName}$`, 'i') } });
  if (!nation) {
    return interaction.reply({ embeds: [errorEmbed(`Nation **${nationName}** not found.`)], ephemeral: true });
  }

  const amount = parseAbbreviatedNumber(amountStr);
  if (!nation.resourceIncome) nation.resourceIncome = new Map();
  
  const oldIncome = nation.resourceIncome.get(resourceName) || 0;
  nation.resourceIncome.set(resourceName, amount);
  await nation.save();

  await createAuditLog({
    guildId,
    entityType: 'nation',
    entityId: nation._id,
    entityName: nation.name,
    action: 'update',
    field: `resourceIncome.${resourceName}`,
    oldValue: oldIncome,
    newValue: amount,
    description: `**${nation.name}** ${resourceName} income set to **${formatNumber(amount)}**/turn`,
    performedBy: interaction.user.id,
    performedByTag: interaction.user.tag,
  });

  const incomeText = amount >= 0 ? `+${formatNumber(amount)}` : formatNumber(amount);
  await interaction.reply({ embeds: [successEmbed(`**${nation.name}**'s ${resourceName} income set to **${incomeText}** per turn.`)] });
}

async function handleCreate(interaction) {
  if (!requireGM(interaction)) return;

  const guildId = interaction.guildId;
  const name = interaction.options.getString('name');
  const icon = interaction.options.getString('icon') || '📦';
  const type = interaction.options.getString('type') || 'resource';

  const existing = await Resource.findOne({ guildId, name: { $regex: new RegExp(`^${name}$`, 'i') } });
  if (existing) {
    return interaction.reply({ embeds: [errorEmbed(`A resource named **${name}** already exists.`)], ephemeral: true });
  }

  await Resource.create({
    guildId,
    name,
    icon,
    type,
    isDefault: false,
  });

  await createAuditLog({
    guildId,
    entityType: 'resource',
    entityName: name,
    action: 'create',
    description: `Custom ${type} **${name}** (${icon}) created`,
    performedBy: interaction.user.id,
    performedByTag: interaction.user.tag,
  });

  await interaction.reply({ embeds: [successEmbed(`Created custom ${type}: ${icon} **${name}**`)] });
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
  } else if (focusedOption.name === 'resource') {
    const resources = await getAllNonCurrencyResources();
    const filtered = resources.filter(r =>
      r.name.toLowerCase().includes(focusedOption.value.toLowerCase())
    ).slice(0, 25);
    await interaction.respond(filtered.map(r => ({ name: `${r.icon} ${r.name}`, value: r.name })));
  }
}
