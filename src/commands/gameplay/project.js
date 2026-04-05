import { SlashCommandBuilder } from 'discord.js';
import Nation from '../../database/models/Nation.js';
import Project, { ProjectTemplate } from '../../database/models/Project.js';
import { getGameState } from '../../database/models/GameState.js';
import { createHistoryEntry } from '../../database/models/HistoryEntry.js';
import { createAuditLog } from '../../database/models/AuditLog.js';
import { isGM, requireGM, canModifyNation } from '../../utils/permissions.js';
import { createEmbed, errorEmbed, successEmbed } from '../../utils/embeds.js';
import { formatNumber } from '../../utils/formatters.js';
import config from '../../config.js';

const TYPE_INFO = {
  wonder: { emoji: '🏛️', label: 'Wonder', color: 0xF1C40F },
  megaproject: { emoji: '🏗️', label: 'Megaproject', color: 0x3498DB },
  program: { emoji: '📋', label: 'Program', color: 0x9B59B6 },
  initiative: { emoji: '🚀', label: 'Initiative', color: 0x2ECC71 },
};

const CATEGORY_INFO = {
  military: { emoji: '⚔️', label: 'Military' },
  economic: { emoji: '💰', label: 'Economic' },
  scientific: { emoji: '🔬', label: 'Scientific' },
  cultural: { emoji: '🎭', label: 'Cultural' },
  infrastructure: { emoji: '🏗️', label: 'Infrastructure' },
  space: { emoji: '🚀', label: 'Space' },
  special: { emoji: '⭐', label: 'Special' },
};

const STATUS_INFO = {
  planning: { emoji: '📝', label: 'Planning' },
  in_progress: { emoji: '🔨', label: 'In Progress' },
  paused: { emoji: '⏸️', label: 'Paused' },
  completed: { emoji: '✅', label: 'Completed' },
  abandoned: { emoji: '❌', label: 'Abandoned' },
  destroyed: { emoji: '💥', label: 'Destroyed' },
};

export const data = new SlashCommandBuilder()
  .setName('project')
  .setDescription('Manage nation projects and wonders')
  .addSubcommand(sub =>
    sub.setName('start')
      .setDescription('Start a new project')
      .addStringOption(opt =>
        opt.setName('nation')
          .setDescription('Nation starting the project')
          .setRequired(true)
          .setAutocomplete(true))
      .addStringOption(opt =>
        opt.setName('template')
          .setDescription('Project to start')
          .setRequired(true)
          .setAutocomplete(true))
      .addStringOption(opt =>
        opt.setName('name')
          .setDescription('Custom name for this project')
          .setRequired(false)))
  .addSubcommand(sub =>
    sub.setName('view')
      .setDescription('View a nation\'s projects')
      .addStringOption(opt =>
        opt.setName('nation')
          .setDescription('Nation to view')
          .setRequired(true)
          .setAutocomplete(true)))
  .addSubcommand(sub =>
    sub.setName('list')
      .setDescription('List available project templates')
      .addStringOption(opt =>
        opt.setName('type')
          .setDescription('Filter by type')
          .setRequired(false)
          .addChoices(
            { name: 'Wonder', value: 'wonder' },
            { name: 'Megaproject', value: 'megaproject' },
            { name: 'Program', value: 'program' },
            { name: 'Initiative', value: 'initiative' },
          )))
  .addSubcommand(sub =>
    sub.setName('progress')
      .setDescription('View detailed progress of a specific project')
      .addStringOption(opt =>
        opt.setName('nation')
          .setDescription('Nation owning the project')
          .setRequired(true)
          .setAutocomplete(true))
      .addStringOption(opt =>
        opt.setName('project')
          .setDescription('Project to view')
          .setRequired(true)
          .setAutocomplete(true)))
  .addSubcommand(sub =>
    sub.setName('pause')
      .setDescription('Pause or resume a project')
      .addStringOption(opt =>
        opt.setName('nation')
          .setDescription('Nation owning the project')
          .setRequired(true)
          .setAutocomplete(true))
      .addStringOption(opt =>
        opt.setName('project')
          .setDescription('Project to pause/resume')
          .setRequired(true)
          .setAutocomplete(true)))
  .addSubcommand(sub =>
    sub.setName('abandon')
      .setDescription('Abandon a project (partial refund)')
      .addStringOption(opt =>
        opt.setName('nation')
          .setDescription('Nation owning the project')
          .setRequired(true)
          .setAutocomplete(true))
      .addStringOption(opt =>
        opt.setName('project')
          .setDescription('Project to abandon')
          .setRequired(true)
          .setAutocomplete(true)))
  .addSubcommand(sub =>
    sub.setName('complete')
      .setDescription('[GM] Force complete a project')
      .addStringOption(opt =>
        opt.setName('nation')
          .setDescription('Nation owning the project')
          .setRequired(true)
          .setAutocomplete(true))
      .addStringOption(opt =>
        opt.setName('project')
          .setDescription('Project to complete')
          .setRequired(true)
          .setAutocomplete(true)))
  .addSubcommandGroup(group =>
    group.setName('template')
      .setDescription('[GM] Manage project templates')
      .addSubcommand(sub =>
        sub.setName('create')
          .setDescription('Create a new project template')
          .addStringOption(opt =>
            opt.setName('name')
              .setDescription('Project name')
              .setRequired(true))
          .addStringOption(opt =>
            opt.setName('type')
              .setDescription('Project type')
              .setRequired(true)
              .addChoices(
                { name: 'Wonder (unique)', value: 'wonder' },
                { name: 'Megaproject', value: 'megaproject' },
                { name: 'Program', value: 'program' },
                { name: 'Initiative', value: 'initiative' },
              ))
          .addStringOption(opt =>
            opt.setName('category')
              .setDescription('Category')
              .setRequired(true)
              .addChoices(
                { name: 'Military', value: 'military' },
                { name: 'Economic', value: 'economic' },
                { name: 'Scientific', value: 'scientific' },
                { name: 'Cultural', value: 'cultural' },
                { name: 'Infrastructure', value: 'infrastructure' },
                { name: 'Space', value: 'space' },
                { name: 'Special', value: 'special' },
              ))
          .addIntegerOption(opt =>
            opt.setName('turns')
              .setDescription('Total turns to complete')
              .setRequired(true)
              .setMinValue(1))
          .addBooleanOption(opt =>
            opt.setName('unique')
              .setDescription('Only one nation can build this (default: true for wonders)')
              .setRequired(false))
          .addStringOption(opt =>
            opt.setName('description')
              .setDescription('Project description')
              .setRequired(false)))
      .addSubcommand(sub =>
        sub.setName('delete')
          .setDescription('Delete a project template')
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
                { name: 'Prestige', value: 'prestige' },
                { name: 'Unique Ability', value: 'unique_ability' },
                { name: 'Custom', value: 'custom' },
              ))
          .addNumberOption(opt =>
            opt.setName('value')
              .setDescription('Effect value')
              .setRequired(true))
          .addStringOption(opt =>
            opt.setName('description')
              .setDescription('Human-readable description')
              .setRequired(false)))
      .addSubcommand(sub =>
        sub.setName('addcost')
          .setDescription('Add a cost to a template')
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
          .setDescription('View details of a project template')
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
    case 'start': return handleStart(interaction);
    case 'view': return handleView(interaction);
    case 'list': return handleList(interaction);
    case 'progress': return handleProgress(interaction);
    case 'pause': return handlePause(interaction);
    case 'abandon': return handleAbandon(interaction);
    case 'complete': return handleComplete(interaction);
  }
}

async function handleStart(interaction) {
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
      embeds: [errorEmbed(`You don't have permission to start projects for **${nation.name}**.`)],
      ephemeral: true,
    });
  }

  const template = await ProjectTemplate.findOne({
    $or: [{ guildId }, { guildId: null }],
    name: { $regex: new RegExp(`^${templateName}$`, 'i') },
  });

  if (!template) {
    return interaction.reply({ embeds: [errorEmbed(`Project template **${templateName}** not found.`)], ephemeral: true });
  }

  // Check if unique and already built/being built
  if (template.isUnique) {
    const existing = await Project.findOne({
      guildId,
      templateName: template.name,
      status: { $in: ['planning', 'in_progress', 'paused', 'completed'] },
    });
    if (existing) {
      return interaction.reply({
        embeds: [errorEmbed(`**${template.name}** is unique and has already been ${existing.status === 'completed' ? 'completed by' : 'claimed by'} **${existing.nationName}**.`)],
        ephemeral: true,
      });
    }
  }

  // Check if nation already has this project
  const nationHas = await Project.findOne({
    guildId,
    nationId: nation._id,
    templateName: template.name,
    status: { $in: ['planning', 'in_progress', 'paused', 'completed'] },
  });
  if (nationHas) {
    return interaction.reply({
      embeds: [errorEmbed(`**${nation.name}** already has **${template.name}** (${nationHas.status}).`)],
      ephemeral: true,
    });
  }

  // Check and deduct costs
  if (template.totalCosts && template.totalCosts.length > 0) {
    const insufficientResources = [];
    for (const cost of template.totalCosts) {
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
    for (const cost of template.totalCosts) {
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

  // Create project instance
  const project = await Project.create({
    guildId,
    nationId: nation._id,
    nationName: nation.name,
    templateId: template._id,
    templateName: template.name,
    customName,
    status: 'in_progress',
    currentStage: 0,
    turnsRemainingInStage: template.totalTurns,
    invested: template.totalCosts || [],
    startedAt: new Date(),
  });

  const gameState = await getGameState(guildId);

  await createHistoryEntry({
    guildId,
    turn: gameState?.turn?.current || 0,
    year: gameState?.year || 1960,
    title: `Project Started: ${template.name}`,
    description: `**${nation.name}** has begun work on **${customName || template.name}**, a ${template.type}.`,
    category: template.category === 'military' ? 'military' : 'economy',
    nations: [nation.name],
    isAutoGenerated: true,
  });

  await createAuditLog({
    guildId,
    entityType: 'project',
    entityId: project._id,
    entityName: customName || template.name,
    action: 'create',
    description: `**${nation.name}** started project **${template.name}**`,
    performedBy: interaction.user.id,
    performedByTag: interaction.user.tag,
  });

  const typeInfo = TYPE_INFO[template.type];
  const embed = createEmbed({
    title: `${typeInfo.emoji} Project Started: ${customName || template.name}`,
    description: template.description || `**${nation.name}** has begun this ambitious ${template.type}!`,
    color: typeInfo.color,
    fields: [
      { name: 'Type', value: `${typeInfo.emoji} ${typeInfo.label}`, inline: true },
      { name: 'Time Required', value: `${template.totalTurns} turns`, inline: true },
    ],
  });

  if (template.isUnique) {
    embed.addFields({ name: 'Unique', value: 'Only one nation can complete this!', inline: true });
  }

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

  const projects = await Project.find({ guildId, nationId: nation._id }).sort({ status: 1, createdAt: -1 });

  if (projects.length === 0) {
    return interaction.reply({
      embeds: [createEmbed({
        title: `${nation.name} - Projects`,
        description: 'No projects started yet.',
        color: config.colors.primary,
      })],
    });
  }

  const embed = createEmbed({
    title: `${nation.name} - Projects`,
    color: config.colors.primary,
  });

  const grouped = {};
  for (const proj of projects) {
    if (!grouped[proj.status]) grouped[proj.status] = [];
    grouped[proj.status].push(proj);
  }

  for (const [status, items] of Object.entries(grouped)) {
    const statusInfo = STATUS_INFO[status];
    const itemList = items.map(p => {
      const name = p.customName ? `${p.customName} (${p.templateName})` : p.templateName;
      if (status === 'in_progress') {
        return `${name} - ${p.turnsRemainingInStage} turns remaining`;
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
  const type = interaction.options.getString('type');

  const query = { $or: [{ guildId }, { guildId: null }] };
  if (type) query.type = type;

  const templates = await ProjectTemplate.find(query).sort({ type: 1, name: 1 });

  if (templates.length === 0) {
    return interaction.reply({
      embeds: [errorEmbed('No project templates found. Use `/project template create` to create one.')],
      ephemeral: true,
    });
  }

  const embed = createEmbed({
    title: type ? `Projects - ${TYPE_INFO[type].label}s` : 'Available Projects',
    color: config.colors.primary,
  });

  const grouped = {};
  for (const t of templates) {
    if (!grouped[t.type]) grouped[t.type] = [];
    grouped[t.type].push(t);
  }

  for (const [projType, items] of Object.entries(grouped)) {
    const typeInfo = TYPE_INFO[projType];
    const itemList = items.map(t => {
      const unique = t.isUnique ? ' *(unique)*' : '';
      return `**${t.name}**${unique} (${t.totalTurns} turns)`;
    }).join('\n');

    embed.addFields({
      name: `${typeInfo.emoji} ${typeInfo.label}s`,
      value: itemList || 'None',
      inline: false,
    });
  }

  await interaction.reply({ embeds: [embed] });
}

async function handleProgress(interaction) {
  const guildId = interaction.guildId;
  const nationName = interaction.options.getString('nation');
  const projectName = interaction.options.getString('project');

  const nation = await Nation.findOne({ guildId, name: { $regex: new RegExp(`^${nationName}$`, 'i') } });
  if (!nation) {
    return interaction.reply({ embeds: [errorEmbed(`Nation **${nationName}** not found.`)], ephemeral: true });
  }

  const project = await Project.findOne({
    guildId,
    nationId: nation._id,
    $or: [
      { customName: { $regex: new RegExp(`^${projectName}$`, 'i') } },
      { templateName: { $regex: new RegExp(`^${projectName}$`, 'i') } },
    ],
  });

  if (!project) {
    return interaction.reply({ embeds: [errorEmbed(`Project **${projectName}** not found for **${nation.name}**.`)], ephemeral: true });
  }

  const template = await ProjectTemplate.findOne({ _id: project.templateId });
  const typeInfo = TYPE_INFO[template?.type || 'megaproject'];
  const statusInfo = STATUS_INFO[project.status];

  const embed = createEmbed({
    title: `${typeInfo.emoji} ${project.customName || project.templateName}`,
    description: template?.description || '',
    color: typeInfo.color,
    fields: [
      { name: 'Status', value: `${statusInfo.emoji} ${statusInfo.label}`, inline: true },
      { name: 'Turns Remaining', value: `${project.turnsRemainingInStage}`, inline: true },
    ],
  });

  if (template?.effects && template.effects.length > 0) {
    const effectsText = template.effects.map(e => `• ${e.description}`).join('\n');
    embed.addFields({ name: 'Effects When Complete', value: effectsText, inline: false });
  }

  if (project.invested && project.invested.length > 0) {
    const investedText = project.invested.map(i => `• ${formatNumber(i.amount)} ${i.resource}`).join('\n');
    embed.addFields({ name: 'Resources Invested', value: investedText, inline: false });
  }

  await interaction.reply({ embeds: [embed] });
}

async function handlePause(interaction) {
  const guildId = interaction.guildId;
  const nationName = interaction.options.getString('nation');
  const projectName = interaction.options.getString('project');

  const nation = await Nation.findOne({ guildId, name: { $regex: new RegExp(`^${nationName}$`, 'i') } });
  if (!nation) {
    return interaction.reply({ embeds: [errorEmbed(`Nation **${nationName}** not found.`)], ephemeral: true });
  }

  if (!canModifyNation(interaction.member, nation)) {
    return interaction.reply({
      embeds: [errorEmbed(`You don't have permission to manage projects for **${nation.name}**.`)],
      ephemeral: true,
    });
  }

  const project = await Project.findOne({
    guildId,
    nationId: nation._id,
    $or: [
      { customName: { $regex: new RegExp(`^${projectName}$`, 'i') } },
      { templateName: { $regex: new RegExp(`^${projectName}$`, 'i') } },
    ],
  });

  if (!project) {
    return interaction.reply({ embeds: [errorEmbed(`Project **${projectName}** not found.`)], ephemeral: true });
  }

  if (project.status === 'completed' || project.status === 'abandoned') {
    return interaction.reply({ embeds: [errorEmbed(`Cannot pause a ${project.status} project.`)], ephemeral: true });
  }

  const newStatus = project.status === 'paused' ? 'in_progress' : 'paused';
  project.status = newStatus;
  await project.save();

  const statusInfo = STATUS_INFO[newStatus];
  await interaction.reply({
    embeds: [successEmbed(`${statusInfo.emoji} **${project.customName || project.templateName}** is now **${statusInfo.label}**.`)],
  });
}

async function handleAbandon(interaction) {
  const guildId = interaction.guildId;
  const nationName = interaction.options.getString('nation');
  const projectName = interaction.options.getString('project');

  const nation = await Nation.findOne({ guildId, name: { $regex: new RegExp(`^${nationName}$`, 'i') } });
  if (!nation) {
    return interaction.reply({ embeds: [errorEmbed(`Nation **${nationName}** not found.`)], ephemeral: true });
  }

  if (!canModifyNation(interaction.member, nation) && !isGM(interaction.member)) {
    return interaction.reply({
      embeds: [errorEmbed(`You don't have permission to abandon projects for **${nation.name}**.`)],
      ephemeral: true,
    });
  }

  const project = await Project.findOne({
    guildId,
    nationId: nation._id,
    status: { $in: ['planning', 'in_progress', 'paused'] },
    $or: [
      { customName: { $regex: new RegExp(`^${projectName}$`, 'i') } },
      { templateName: { $regex: new RegExp(`^${projectName}$`, 'i') } },
    ],
  });

  if (!project) {
    return interaction.reply({ embeds: [errorEmbed(`Active project **${projectName}** not found.`)], ephemeral: true });
  }

  // 25% refund
  const refunds = [];
  if (project.invested && project.invested.length > 0) {
    for (const inv of project.invested) {
      const refund = Math.floor(inv.amount * 0.25);
      if (refund > 0) {
        if (nation.resources?.has(inv.resource)) {
          const current = nation.resources.get(inv.resource);
          nation.resources.set(inv.resource, current + refund);
        } else if (nation.economy.currencies?.has(inv.resource)) {
          const current = nation.economy.currencies.get(inv.resource) || 0;
          nation.economy.currencies.set(inv.resource, current + refund);
        }
        refunds.push(`${formatNumber(refund)} ${inv.resource}`);
      }
    }
    await nation.save();
  }

  project.status = 'abandoned';
  await project.save();

  let msg = `**${project.customName || project.templateName}** has been abandoned.`;
  if (refunds.length > 0) {
    msg += `\n\n**Salvaged (25%):** ${refunds.join(', ')}`;
  }

  await interaction.reply({ embeds: [successEmbed(msg)] });
}

async function handleComplete(interaction) {
  if (!requireGM(interaction)) return;

  const guildId = interaction.guildId;
  const nationName = interaction.options.getString('nation');
  const projectName = interaction.options.getString('project');

  const nation = await Nation.findOne({ guildId, name: { $regex: new RegExp(`^${nationName}$`, 'i') } });
  if (!nation) {
    return interaction.reply({ embeds: [errorEmbed(`Nation **${nationName}** not found.`)], ephemeral: true });
  }

  const project = await Project.findOne({
    guildId,
    nationId: nation._id,
    status: { $in: ['planning', 'in_progress', 'paused'] },
    $or: [
      { customName: { $regex: new RegExp(`^${projectName}$`, 'i') } },
      { templateName: { $regex: new RegExp(`^${projectName}$`, 'i') } },
    ],
  });

  if (!project) {
    return interaction.reply({ embeds: [errorEmbed(`Active project **${projectName}** not found.`)], ephemeral: true });
  }

  const template = await ProjectTemplate.findOne({ _id: project.templateId });

  project.status = 'completed';
  project.completedAt = new Date();
  project.turnsRemainingInStage = 0;
  await project.save();

  const gameState = await getGameState(guildId);

  await createHistoryEntry({
    guildId,
    turn: gameState?.turn?.current || 0,
    year: gameState?.year || 1960,
    title: `${template?.type === 'wonder' ? 'Wonder' : 'Project'} Completed: ${project.templateName}`,
    description: `**${nation.name}** has completed **${project.customName || project.templateName}**!${template?.completionMessage ? ` ${template.completionMessage}` : ''}`,
    category: 'discovery',
    nations: [nation.name],
    isAutoGenerated: true,
  });

  const typeInfo = TYPE_INFO[template?.type || 'megaproject'];
  const embed = createEmbed({
    title: `${typeInfo.emoji} Project Completed!`,
    description: `**${nation.name}** has completed **${project.customName || project.templateName}**!`,
    color: config.colors.success,
  });

  if (template?.effects && template.effects.length > 0) {
    const effectsText = template.effects.map(e => `• ${e.description}`).join('\n');
    embed.addFields({ name: 'Effects Now Active', value: effectsText, inline: false });
  }

  await interaction.reply({ embeds: [embed] });
}

// Template management
async function handleTemplateCreate(interaction) {
  if (!requireGM(interaction)) return;

  const guildId = interaction.guildId;
  const name = interaction.options.getString('name');
  const type = interaction.options.getString('type');
  const category = interaction.options.getString('category');
  const totalTurns = interaction.options.getInteger('turns');
  const isUnique = interaction.options.getBoolean('unique') ?? (type === 'wonder');
  const description = interaction.options.getString('description') || '';

  const existing = await ProjectTemplate.findOne({
    guildId,
    name: { $regex: new RegExp(`^${name}$`, 'i') },
  });

  if (existing) {
    return interaction.reply({
      embeds: [errorEmbed(`Project template **${name}** already exists.`)],
      ephemeral: true,
    });
  }

  const template = await ProjectTemplate.create({
    guildId,
    name,
    type,
    category,
    totalTurns,
    isUnique,
    description,
    effects: [],
    totalCosts: [],
  });

  await createAuditLog({
    guildId,
    entityType: 'project_template',
    entityId: template._id,
    entityName: name,
    action: 'create',
    description: `Created project template: ${name}`,
    performedBy: interaction.user.id,
    performedByTag: interaction.user.tag,
  });

  const typeInfo = TYPE_INFO[type];
  await interaction.reply({
    embeds: [successEmbed(`Created project template **${name}** (${typeInfo.emoji} ${typeInfo.label}, ${totalTurns} turns)${isUnique ? ' *(unique)*' : ''}\n\nUse \`/project template addeffect\` and \`/project template addcost\` to configure it.`)],
  });
}

async function handleTemplateDelete(interaction) {
  if (!requireGM(interaction)) return;

  const guildId = interaction.guildId;
  const templateName = interaction.options.getString('template');

  const template = await ProjectTemplate.findOne({
    guildId,
    name: { $regex: new RegExp(`^${templateName}$`, 'i') },
  });

  if (!template) {
    return interaction.reply({ embeds: [errorEmbed(`Template **${templateName}** not found.`)], ephemeral: true });
  }

  await ProjectTemplate.deleteOne({ _id: template._id });

  await interaction.reply({
    embeds: [successEmbed(`Deleted project template **${template.name}**.`)],
  });
}

async function handleTemplateAddEffect(interaction) {
  if (!requireGM(interaction)) return;

  const guildId = interaction.guildId;
  const templateName = interaction.options.getString('template');
  const type = interaction.options.getString('type');
  const value = interaction.options.getNumber('value');
  const description = interaction.options.getString('description');

  const template = await ProjectTemplate.findOne({
    guildId,
    name: { $regex: new RegExp(`^${templateName}$`, 'i') },
  });

  if (!template) {
    return interaction.reply({ embeds: [errorEmbed(`Template **${templateName}** not found.`)], ephemeral: true });
  }

  const effect = {
    type,
    value,
    description: description || `${type}: ${value}`,
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

  const template = await ProjectTemplate.findOne({
    guildId,
    name: { $regex: new RegExp(`^${templateName}$`, 'i') },
  });

  if (!template) {
    return interaction.reply({ embeds: [errorEmbed(`Template **${templateName}** not found.`)], ephemeral: true });
  }

  const existingIndex = template.totalCosts.findIndex(c => c.resource.toLowerCase() === resource.toLowerCase());
  if (existingIndex >= 0) {
    template.totalCosts[existingIndex].amount = amount;
  } else {
    template.totalCosts.push({ resource, amount });
  }
  await template.save();

  await interaction.reply({
    embeds: [successEmbed(`Set cost for **${template.name}**: ${formatNumber(amount)} ${resource}`)],
  });
}

async function handleTemplateView(interaction) {
  const guildId = interaction.guildId;
  const templateName = interaction.options.getString('template');

  const template = await ProjectTemplate.findOne({
    $or: [{ guildId }, { guildId: null }],
    name: { $regex: new RegExp(`^${templateName}$`, 'i') },
  });

  if (!template) {
    return interaction.reply({ embeds: [errorEmbed(`Template **${templateName}** not found.`)], ephemeral: true });
  }

  const typeInfo = TYPE_INFO[template.type];
  const catInfo = CATEGORY_INFO[template.category];
  const embed = createEmbed({
    title: `${typeInfo.emoji} ${template.name}`,
    description: template.description || 'No description',
    color: typeInfo.color,
    fields: [
      { name: 'Type', value: `${typeInfo.emoji} ${typeInfo.label}`, inline: true },
      { name: 'Category', value: `${catInfo.emoji} ${catInfo.label}`, inline: true },
      { name: 'Time', value: `${template.totalTurns} turns`, inline: true },
    ],
  });

  if (template.isUnique) {
    embed.addFields({ name: 'Unique', value: 'Only one nation can build this', inline: true });
  }

  if (template.totalCosts && template.totalCosts.length > 0) {
    const costText = template.totalCosts.map(c => `• ${formatNumber(c.amount)} ${c.resource}`).join('\n');
    embed.addFields({ name: 'Costs', value: costText, inline: false });
  }

  if (template.effects && template.effects.length > 0) {
    const effectText = template.effects.map(e => `• ${e.description}`).join('\n');
    embed.addFields({ name: 'Effects', value: effectText, inline: false });
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
    const templates = await ProjectTemplate.find({
      $or: [{ guildId }, { guildId: null }],
      name: { $regex: focusedOption.value, $options: 'i' },
    }).limit(25);
    await interaction.respond(templates.map(t => ({ name: `${t.name} (${t.type})`, value: t.name })));
  } else if (focusedOption.name === 'project') {
    const nationName = interaction.options.getString('nation');
    const nation = await Nation.findOne({ guildId, name: { $regex: new RegExp(`^${nationName}$`, 'i') } });
    if (nation) {
      const projects = await Project.find({
        guildId,
        nationId: nation._id,
        $or: [
          { customName: { $regex: focusedOption.value, $options: 'i' } },
          { templateName: { $regex: focusedOption.value, $options: 'i' } },
        ],
      }).limit(25);
      await interaction.respond(projects.map(p => ({
        name: p.customName ? `${p.customName} (${p.templateName})` : p.templateName,
        value: p.customName || p.templateName,
      })));
    } else {
      await interaction.respond([]);
    }
  }
}
