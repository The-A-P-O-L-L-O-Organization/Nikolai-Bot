import { SlashCommandBuilder } from 'discord.js';
import Nation from '../../database/models/Nation.js';
import Infrastructure, { InfrastructureTemplate } from '../../database/models/Infrastructure.js';
import { getGameState } from '../../database/models/GameState.js';
import { createHistoryEntry } from '../../database/models/HistoryEntry.js';
import { createAuditLog } from '../../database/models/AuditLog.js';
import { isGM, requireGM, canModifyNation } from '../../utils/permissions.js';
import { createEmbed, errorEmbed, successEmbed } from '../../utils/embeds.js';
import { formatNumber } from '../../utils/formatters.js';
import config from '../../config.js';

const CATEGORY_INFO = {
  economic: { emoji: '💰', label: 'Economic' },
  military: { emoji: '⚔️', label: 'Military' },
  civilian: { emoji: '🏠', label: 'Civilian' },
  industrial: { emoji: '🏭', label: 'Industrial' },
  transport: { emoji: '🚂', label: 'Transport' },
  special: { emoji: '⭐', label: 'Special' },
};

const STATUS_INFO = {
  constructing: { emoji: '🔨', label: 'Under Construction' },
  active: { emoji: '✅', label: 'Active' },
  damaged: { emoji: '⚠️', label: 'Damaged' },
  destroyed: { emoji: '💥', label: 'Destroyed' },
  mothballed: { emoji: '💤', label: 'Mothballed' },
};

export const data = new SlashCommandBuilder()
  .setName('infrastructure')
  .setDescription('Manage nation infrastructure')
  .addSubcommand(sub =>
    sub.setName('build')
      .setDescription('Start building infrastructure')
      .addStringOption(opt =>
        opt.setName('nation')
          .setDescription('Nation building the infrastructure')
          .setRequired(true)
          .setAutocomplete(true))
      .addStringOption(opt =>
        opt.setName('template')
          .setDescription('Infrastructure type to build')
          .setRequired(true)
          .setAutocomplete(true))
      .addStringOption(opt =>
        opt.setName('name')
          .setDescription('Custom name for this infrastructure')
          .setRequired(false)))
  .addSubcommand(sub =>
    sub.setName('view')
      .setDescription('View a nation\'s infrastructure')
      .addStringOption(opt =>
        opt.setName('nation')
          .setDescription('Nation to view')
          .setRequired(true)
          .setAutocomplete(true)))
  .addSubcommand(sub =>
    sub.setName('list')
      .setDescription('List available infrastructure templates')
      .addStringOption(opt =>
        opt.setName('category')
          .setDescription('Filter by category')
          .setRequired(false)
          .addChoices(
            { name: 'Economic', value: 'economic' },
            { name: 'Military', value: 'military' },
            { name: 'Civilian', value: 'civilian' },
            { name: 'Industrial', value: 'industrial' },
            { name: 'Transport', value: 'transport' },
            { name: 'Special', value: 'special' },
          )))
  .addSubcommand(sub =>
    sub.setName('status')
      .setDescription('[GM] Change infrastructure status')
      .addStringOption(opt =>
        opt.setName('nation')
          .setDescription('Nation owning the infrastructure')
          .setRequired(true)
          .setAutocomplete(true))
      .addStringOption(opt =>
        opt.setName('infrastructure')
          .setDescription('Infrastructure to modify')
          .setRequired(true)
          .setAutocomplete(true))
      .addStringOption(opt =>
        opt.setName('status')
          .setDescription('New status')
          .setRequired(true)
          .addChoices(
            { name: 'Active', value: 'active' },
            { name: 'Damaged', value: 'damaged' },
            { name: 'Destroyed', value: 'destroyed' },
            { name: 'Mothballed', value: 'mothballed' },
          )))
  .addSubcommand(sub =>
    sub.setName('demolish')
      .setDescription('Demolish infrastructure')
      .addStringOption(opt =>
        opt.setName('nation')
          .setDescription('Nation owning the infrastructure')
          .setRequired(true)
          .setAutocomplete(true))
      .addStringOption(opt =>
        opt.setName('infrastructure')
          .setDescription('Infrastructure to demolish')
          .setRequired(true)
          .setAutocomplete(true)))
  .addSubcommandGroup(group =>
    group.setName('template')
      .setDescription('[GM] Manage infrastructure templates')
      .addSubcommand(sub =>
        sub.setName('create')
          .setDescription('Create a new infrastructure template')
          .addStringOption(opt =>
            opt.setName('name')
              .setDescription('Template name')
              .setRequired(true))
          .addStringOption(opt =>
            opt.setName('category')
              .setDescription('Category')
              .setRequired(true)
              .addChoices(
                { name: 'Economic', value: 'economic' },
                { name: 'Military', value: 'military' },
                { name: 'Civilian', value: 'civilian' },
                { name: 'Industrial', value: 'industrial' },
                { name: 'Transport', value: 'transport' },
                { name: 'Special', value: 'special' },
              ))
          .addIntegerOption(opt =>
            opt.setName('build_time')
              .setDescription('Turns to build (default: 2)')
              .setRequired(false)
              .setMinValue(1))
          .addStringOption(opt =>
            opt.setName('description')
              .setDescription('Description')
              .setRequired(false)))
      .addSubcommand(sub =>
        sub.setName('delete')
          .setDescription('Delete an infrastructure template')
          .addStringOption(opt =>
            opt.setName('template')
              .setDescription('Template to delete')
              .setRequired(true)
              .setAutocomplete(true)))
      .addSubcommand(sub =>
        sub.setName('addeffect')
          .setDescription('Add an effect to a template')
          .addStringOption(opt =>
            opt.setName('template')
              .setDescription('Template to modify')
              .setRequired(true)
              .setAutocomplete(true))
          .addStringOption(opt =>
            opt.setName('type')
              .setDescription('Effect type')
              .setRequired(true)
              .addChoices(
                { name: 'Income Modifier (%)', value: 'income_modifier' },
                { name: 'Production Speed (%)', value: 'production_speed' },
                { name: 'Research Speed (%)', value: 'research_speed' },
                { name: 'Stability Modifier (%)', value: 'stability_modifier' },
                { name: 'Military Modifier (%)', value: 'military_modifier' },
                { name: 'Resource Income (flat)', value: 'resource_income' },
                { name: 'Resource Capacity', value: 'resource_capacity' },
                { name: 'Population Growth (%)', value: 'population_growth' },
                { name: 'Maintenance Reduction (%)', value: 'maintenance_reduction' },
                { name: 'Trade Bonus (%)', value: 'trade_bonus' },
                { name: 'Custom', value: 'custom' },
              ))
          .addNumberOption(opt =>
            opt.setName('value')
              .setDescription('Effect value')
              .setRequired(true))
          .addStringOption(opt =>
            opt.setName('target')
              .setDescription('Target (e.g., "Steel", "army")')
              .setRequired(false))
          .addStringOption(opt =>
            opt.setName('description')
              .setDescription('Human-readable description')
              .setRequired(false)))
      .addSubcommand(sub =>
        sub.setName('addcost')
          .setDescription('Add a construction cost to a template')
          .addStringOption(opt =>
            opt.setName('template')
              .setDescription('Template to modify')
              .setRequired(true)
              .setAutocomplete(true))
          .addStringOption(opt =>
            opt.setName('resource')
              .setDescription('Resource required')
              .setRequired(true))
          .addNumberOption(opt =>
            opt.setName('amount')
              .setDescription('Amount required')
              .setRequired(true)
              .setMinValue(1)))
      .addSubcommand(sub =>
        sub.setName('view')
          .setDescription('View details of an infrastructure template')
          .addStringOption(opt =>
            opt.setName('template')
              .setDescription('Template to view')
              .setRequired(true)
              .setAutocomplete(true))));

export async function execute(interaction) {
  const subcommandGroup = interaction.options.getSubcommandGroup(false);
  const subcommand = interaction.options.getSubcommand();

  if (subcommandGroup === 'template') {
    switch (subcommand) {
      case 'create': return handleTemplateCreate(interaction);
      case 'delete': return handleTemplateDelete(interaction);
      case 'addeffect': return handleTemplateAddEffect(interaction);
      case 'addcost': return handleTemplateAddCost(interaction);
      case 'view': return handleTemplateView(interaction);
    }
  }

  switch (subcommand) {
    case 'build': return handleBuild(interaction);
    case 'view': return handleView(interaction);
    case 'list': return handleList(interaction);
    case 'status': return handleStatus(interaction);
    case 'demolish': return handleDemolish(interaction);
  }
}

async function handleBuild(interaction) {
  const guildId = interaction.guildId;
  const nationName = interaction.options.getString('nation');
  const templateName = interaction.options.getString('template');
  const customName = interaction.options.getString('name');

  const nation = await Nation.findOne({ guildId, name: { $regex: new RegExp(`^${nationName}$`, 'i') } });
  if (!nation) {
    return interaction.reply({ embeds: [errorEmbed(`Nation **${nationName}** not found.`)], ephemeral: true });
  }

  if (!canModifyNation(interaction.member, nation)) {
    return interaction.reply({
      embeds: [errorEmbed(`You don't have permission to build for **${nation.name}**.`)],
      ephemeral: true,
    });
  }

  const template = await InfrastructureTemplate.findOne({
    $or: [{ guildId }, { guildId: null }],
    name: { $regex: new RegExp(`^${templateName}$`, 'i') },
  });

  if (!template) {
    return interaction.reply({ embeds: [errorEmbed(`Infrastructure template **${templateName}** not found.`)], ephemeral: true });
  }

  // Check max per nation limit
  if (template.maxPerNation > 0) {
    const existingCount = await Infrastructure.countDocuments({
      guildId,
      nationId: nation._id,
      templateName: template.name,
      status: { $nin: ['destroyed'] },
    });
    if (existingCount >= template.maxPerNation) {
      return interaction.reply({
        embeds: [errorEmbed(`**${nation.name}** already has the maximum (${template.maxPerNation}) of **${template.name}**.`)],
        ephemeral: true,
      });
    }
  }

  // Check and deduct costs
  if (template.costs && template.costs.length > 0) {
    const insufficientResources = [];
    for (const cost of template.costs) {
      const available = nation.resources?.get(cost.resource) || nation.economy.currencies?.get(cost.resource) || 0;
      if (available < cost.amount) {
        insufficientResources.push(`${cost.resource}: need ${formatNumber(cost.amount)}, have ${formatNumber(available)}`);
      }
    }
    if (insufficientResources.length > 0) {
      return interaction.reply({
        embeds: [errorEmbed(`Insufficient resources:\n${insufficientResources.join('\n')}`)],
        ephemeral: true,
      });
    }

    // Deduct costs
    for (const cost of template.costs) {
      if (nation.resources?.has(cost.resource)) {
        const current = nation.resources.get(cost.resource);
        nation.resources.set(cost.resource, current - cost.amount);
      } else if (nation.economy.currencies?.has(cost.resource)) {
        const current = nation.economy.currencies.get(cost.resource);
        nation.economy.currencies.set(cost.resource, current - cost.amount);
      }
    }
    await nation.save();
  }

  // Create infrastructure instance
  const infra = await Infrastructure.create({
    guildId,
    nationId: nation._id,
    nationName: nation.name,
    templateId: template._id,
    templateName: template.name,
    customName,
    status: 'constructing',
    turnsRemaining: template.buildTime,
  });

  await createAuditLog({
    guildId,
    entityType: 'infrastructure',
    entityId: infra._id,
    entityName: customName || template.name,
    action: 'create',
    description: `**${nation.name}** started building **${template.name}**`,
    performedBy: interaction.user.id,
    performedByTag: interaction.user.tag,
  });

  const catInfo = CATEGORY_INFO[template.category];
  const embed = createEmbed({
    title: `${catInfo.emoji} Construction Started`,
    description: `**${nation.name}** has begun construction of **${customName || template.name}**`,
    color: config.colors.success,
    fields: [
      { name: 'Type', value: template.name, inline: true },
      { name: 'Time Required', value: `${template.buildTime} turns`, inline: true },
    ],
  });

  if (template.effects && template.effects.length > 0) {
    const effectsText = template.effects.map(e => `• ${e.description || `${e.type}: ${e.value}`}`).join('\n');
    embed.addFields({ name: 'Effects When Complete', value: effectsText, inline: false });
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

  const infrastructure = await Infrastructure.find({ guildId, nationId: nation._id }).sort({ status: 1, createdAt: -1 });

  if (infrastructure.length === 0) {
    return interaction.reply({
      embeds: [createEmbed({
        title: `${nation.name} - Infrastructure`,
        description: 'No infrastructure built yet.',
        color: config.colors.primary,
      })],
    });
  }

  const embed = createEmbed({
    title: `${nation.name} - Infrastructure`,
    color: config.colors.primary,
  });

  // Group by status
  const grouped = {};
  for (const infra of infrastructure) {
    if (!grouped[infra.status]) grouped[infra.status] = [];
    grouped[infra.status].push(infra);
  }

  for (const [status, items] of Object.entries(grouped)) {
    const statusInfo = STATUS_INFO[status];
    const itemList = items.map(i => {
      const name = i.customName ? `${i.customName} (${i.templateName})` : i.templateName;
      if (status === 'constructing') {
        return `${name} - ${i.turnsRemaining} turns remaining`;
      }
      return name;
    }).join('\n');

    embed.addFields({
      name: `${statusInfo.emoji} ${statusInfo.label} (${items.length})`,
      value: itemList,
      inline: false,
    });
  }

  await interaction.reply({ embeds: [embed] });
}

async function handleList(interaction) {
  const guildId = interaction.guildId;
  const category = interaction.options.getString('category');

  const query = { $or: [{ guildId }, { guildId: null }] };
  if (category) query.category = category;

  const templates = await InfrastructureTemplate.find(query).sort({ category: 1, name: 1 });

  if (templates.length === 0) {
    return interaction.reply({
      embeds: [errorEmbed('No infrastructure templates found. Use `/infrastructure template create` to create one.')],
      ephemeral: true,
    });
  }

  const embed = createEmbed({
    title: category ? `Infrastructure - ${CATEGORY_INFO[category].label}` : 'Available Infrastructure',
    color: config.colors.primary,
  });

  const grouped = {};
  for (const t of templates) {
    if (!grouped[t.category]) grouped[t.category] = [];
    grouped[t.category].push(t);
  }

  for (const [cat, items] of Object.entries(grouped)) {
    const catInfo = CATEGORY_INFO[cat];
    const itemList = items.map(t => {
      const costText = t.costs?.length > 0 
        ? t.costs.map(c => `${formatNumber(c.amount)} ${c.resource}`).join(', ')
        : 'Free';
      return `**${t.name}** (${t.buildTime} turns) - ${costText}`;
    }).join('\n');

    embed.addFields({
      name: `${catInfo.emoji} ${catInfo.label}`,
      value: itemList || 'None',
      inline: false,
    });
  }

  await interaction.reply({ embeds: [embed] });
}

async function handleStatus(interaction) {
  if (!requireGM(interaction)) return;

  const guildId = interaction.guildId;
  const nationName = interaction.options.getString('nation');
  const infraName = interaction.options.getString('infrastructure');
  const newStatus = interaction.options.getString('status');

  const nation = await Nation.findOne({ guildId, name: { $regex: new RegExp(`^${nationName}$`, 'i') } });
  if (!nation) {
    return interaction.reply({ embeds: [errorEmbed(`Nation **${nationName}** not found.`)], ephemeral: true });
  }

  const infra = await Infrastructure.findOne({
    guildId,
    nationId: nation._id,
    $or: [
      { customName: { $regex: new RegExp(`^${infraName}$`, 'i') } },
      { templateName: { $regex: new RegExp(`^${infraName}$`, 'i') } },
    ],
  });

  if (!infra) {
    return interaction.reply({ embeds: [errorEmbed(`Infrastructure **${infraName}** not found for **${nation.name}**.`)], ephemeral: true });
  }

  const oldStatus = infra.status;
  infra.status = newStatus;
  if (newStatus === 'active' && oldStatus === 'constructing') {
    infra.builtAt = new Date();
    infra.turnsRemaining = 0;
  }
  await infra.save();

  await createAuditLog({
    guildId,
    entityType: 'infrastructure',
    entityId: infra._id,
    entityName: infra.customName || infra.templateName,
    action: 'update',
    field: 'status',
    oldValue: oldStatus,
    newValue: newStatus,
    description: `Changed **${infra.templateName}** status from ${oldStatus} to ${newStatus}`,
    performedBy: interaction.user.id,
    performedByTag: interaction.user.tag,
  });

  const statusInfo = STATUS_INFO[newStatus];
  await interaction.reply({
    embeds: [successEmbed(`${statusInfo.emoji} **${infra.customName || infra.templateName}** is now **${statusInfo.label}**.`)],
  });
}

async function handleDemolish(interaction) {
  const guildId = interaction.guildId;
  const nationName = interaction.options.getString('nation');
  const infraName = interaction.options.getString('infrastructure');

  const nation = await Nation.findOne({ guildId, name: { $regex: new RegExp(`^${nationName}$`, 'i') } });
  if (!nation) {
    return interaction.reply({ embeds: [errorEmbed(`Nation **${nationName}** not found.`)], ephemeral: true });
  }

  if (!canModifyNation(interaction.member, nation) && !isGM(interaction.member)) {
    return interaction.reply({
      embeds: [errorEmbed(`You don't have permission to demolish infrastructure for **${nation.name}**.`)],
      ephemeral: true,
    });
  }

  const infra = await Infrastructure.findOne({
    guildId,
    nationId: nation._id,
    $or: [
      { customName: { $regex: new RegExp(`^${infraName}$`, 'i') } },
      { templateName: { $regex: new RegExp(`^${infraName}$`, 'i') } },
    ],
  });

  if (!infra) {
    return interaction.reply({ embeds: [errorEmbed(`Infrastructure **${infraName}** not found for **${nation.name}**.`)], ephemeral: true });
  }

  await Infrastructure.deleteOne({ _id: infra._id });

  await createAuditLog({
    guildId,
    entityType: 'infrastructure',
    entityId: infra._id,
    entityName: infra.customName || infra.templateName,
    action: 'delete',
    description: `**${nation.name}** demolished **${infra.templateName}**`,
    performedBy: interaction.user.id,
    performedByTag: interaction.user.tag,
  });

  await interaction.reply({
    embeds: [successEmbed(`**${infra.customName || infra.templateName}** has been demolished.`)],
  });
}

// Template management
async function handleTemplateCreate(interaction) {
  if (!requireGM(interaction)) return;

  const guildId = interaction.guildId;
  const name = interaction.options.getString('name');
  const category = interaction.options.getString('category');
  const buildTime = interaction.options.getInteger('build_time') || 2;
  const description = interaction.options.getString('description') || '';

  const existing = await InfrastructureTemplate.findOne({
    guildId,
    name: { $regex: new RegExp(`^${name}$`, 'i') },
  });

  if (existing) {
    return interaction.reply({
      embeds: [errorEmbed(`Infrastructure template **${name}** already exists.`)],
      ephemeral: true,
    });
  }

  const template = await InfrastructureTemplate.create({
    guildId,
    name,
    category,
    buildTime,
    description,
    effects: [],
    costs: [],
  });

  await createAuditLog({
    guildId,
    entityType: 'infrastructure_template',
    entityId: template._id,
    entityName: name,
    action: 'create',
    description: `Created infrastructure template: ${name}`,
    performedBy: interaction.user.id,
    performedByTag: interaction.user.tag,
  });

  const catInfo = CATEGORY_INFO[category];
  await interaction.reply({
    embeds: [successEmbed(`Created infrastructure template **${name}** (${catInfo.emoji} ${catInfo.label}, ${buildTime} turns)\n\nUse \`/infrastructure template addeffect\` and \`/infrastructure template addcost\` to configure it.`)],
  });
}

async function handleTemplateDelete(interaction) {
  if (!requireGM(interaction)) return;

  const guildId = interaction.guildId;
  const templateName = interaction.options.getString('template');

  const template = await InfrastructureTemplate.findOne({
    guildId,
    name: { $regex: new RegExp(`^${templateName}$`, 'i') },
  });

  if (!template) {
    return interaction.reply({ embeds: [errorEmbed(`Template **${templateName}** not found.`)], ephemeral: true });
  }

  await InfrastructureTemplate.deleteOne({ _id: template._id });

  await interaction.reply({
    embeds: [successEmbed(`Deleted infrastructure template **${template.name}**.`)],
  });
}

async function handleTemplateAddEffect(interaction) {
  if (!requireGM(interaction)) return;

  const guildId = interaction.guildId;
  const templateName = interaction.options.getString('template');
  const type = interaction.options.getString('type');
  const value = interaction.options.getNumber('value');
  const target = interaction.options.getString('target');
  const description = interaction.options.getString('description');

  const template = await InfrastructureTemplate.findOne({
    guildId,
    name: { $regex: new RegExp(`^${templateName}$`, 'i') },
  });

  if (!template) {
    return interaction.reply({ embeds: [errorEmbed(`Template **${templateName}** not found.`)], ephemeral: true });
  }

  const effect = {
    type,
    value,
    target: target || undefined,
    description: description || `${type}: ${value}${target ? ` (${target})` : ''}`,
  };

  template.effects.push(effect);
  await template.save();

  await interaction.reply({
    embeds: [successEmbed(`Added effect to **${template.name}**:\n• ${effect.description}`)],
  });
}

async function handleTemplateAddCost(interaction) {
  if (!requireGM(interaction)) return;

  const guildId = interaction.guildId;
  const templateName = interaction.options.getString('template');
  const resource = interaction.options.getString('resource');
  const amount = interaction.options.getNumber('amount');

  const template = await InfrastructureTemplate.findOne({
    guildId,
    name: { $regex: new RegExp(`^${templateName}$`, 'i') },
  });

  if (!template) {
    return interaction.reply({ embeds: [errorEmbed(`Template **${templateName}** not found.`)], ephemeral: true });
  }

  // Update existing cost or add new
  const existingIndex = template.costs.findIndex(c => c.resource.toLowerCase() === resource.toLowerCase());
  if (existingIndex >= 0) {
    template.costs[existingIndex].amount = amount;
  } else {
    template.costs.push({ resource, amount });
  }
  await template.save();

  await interaction.reply({
    embeds: [successEmbed(`Set cost for **${template.name}**: ${formatNumber(amount)} ${resource}`)],
  });
}

async function handleTemplateView(interaction) {
  const guildId = interaction.guildId;
  const templateName = interaction.options.getString('template');

  const template = await InfrastructureTemplate.findOne({
    $or: [{ guildId }, { guildId: null }],
    name: { $regex: new RegExp(`^${templateName}$`, 'i') },
  });

  if (!template) {
    return interaction.reply({ embeds: [errorEmbed(`Template **${templateName}** not found.`)], ephemeral: true });
  }

  const catInfo = CATEGORY_INFO[template.category];
  const embed = createEmbed({
    title: `${catInfo.emoji} ${template.name}`,
    description: template.description || 'No description',
    color: config.colors.primary,
    fields: [
      { name: 'Category', value: catInfo.label, inline: true },
      { name: 'Build Time', value: `${template.buildTime} turns`, inline: true },
    ],
  });

  if (template.costs && template.costs.length > 0) {
    const costText = template.costs.map(c => `• ${formatNumber(c.amount)} ${c.resource}`).join('\n');
    embed.addFields({ name: 'Costs', value: costText, inline: false });
  }

  if (template.effects && template.effects.length > 0) {
    const effectText = template.effects.map(e => `• ${e.description}`).join('\n');
    embed.addFields({ name: 'Effects', value: effectText, inline: false });
  }

  if (template.maxPerNation > 0) {
    embed.addFields({ name: 'Limit', value: `${template.maxPerNation} per nation`, inline: true });
  }

  await interaction.reply({ embeds: [embed] });
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
  } else if (focusedOption.name === 'template') {
    const templates = await InfrastructureTemplate.find({
      $or: [{ guildId }, { guildId: null }],
      name: { $regex: focusedOption.value, $options: 'i' },
    }).limit(25);
    await interaction.respond(templates.map(t => ({ name: t.name, value: t.name })));
  } else if (focusedOption.name === 'infrastructure') {
    const nationName = interaction.options.getString('nation');
    const nation = await Nation.findOne({ guildId, name: { $regex: new RegExp(`^${nationName}$`, 'i') } });
    if (nation) {
      const infra = await Infrastructure.find({
        guildId,
        nationId: nation._id,
        $or: [
          { customName: { $regex: focusedOption.value, $options: 'i' } },
          { templateName: { $regex: focusedOption.value, $options: 'i' } },
        ],
      }).limit(25);
      await interaction.respond(infra.map(i => ({
        name: i.customName ? `${i.customName} (${i.templateName})` : i.templateName,
        value: i.customName || i.templateName,
      })));
    } else {
      await interaction.respond([]);
    }
  }
}
