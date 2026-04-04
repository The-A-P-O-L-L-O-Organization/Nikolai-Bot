import { SlashCommandBuilder } from 'discord.js';
import Nation from '../../database/models/Nation.js';
import Technology from '../../database/models/Technology.js';
import { createAuditLog } from '../../database/models/AuditLog.js';
import { getGameState } from '../../database/models/GameState.js';
import { isGM, requireGM, canModifyNation, requireNationAccess } from '../../utils/permissions.js';
import { createEmbed, errorEmbed, successEmbed, listEmbed } from '../../utils/embeds.js';
import { formatNumber } from '../../utils/formatters.js';
import config from '../../config.js';

export const data = new SlashCommandBuilder()
  .setName('research')
  .setDescription('Research and technology management')
  .addSubcommand(sub =>
    sub.setName('start')
      .setDescription('Start researching a technology')
      .addStringOption(opt =>
        opt.setName('nation')
          .setDescription('Nation to research for')
          .setRequired(true)
          .setAutocomplete(true))
      .addStringOption(opt =>
        opt.setName('technology')
          .setDescription('Technology to research')
          .setRequired(true)
          .setAutocomplete(true)))
  .addSubcommand(sub =>
    sub.setName('cancel')
      .setDescription('Cancel current research')
      .addStringOption(opt =>
        opt.setName('nation')
          .setDescription('Nation to cancel research for')
          .setRequired(true)
          .setAutocomplete(true)))
  .addSubcommand(sub =>
    sub.setName('status')
      .setDescription('View research status for a nation')
      .addStringOption(opt =>
        opt.setName('nation')
          .setDescription('Nation to view')
          .setRequired(true)
          .setAutocomplete(true)))
  .addSubcommand(sub =>
    sub.setName('list')
      .setDescription('List available technologies')
      .addStringOption(opt =>
        opt.setName('category')
          .setDescription('Filter by category')
          .setRequired(false)
          .addChoices(
            { name: 'Military', value: 'military' },
            { name: 'Economy', value: 'economy' },
            { name: 'Infrastructure', value: 'infrastructure' },
            { name: 'Science', value: 'science' },
            { name: 'Social', value: 'social' },
            { name: 'Special', value: 'special' },
          )))
  .addSubcommand(sub =>
    sub.setName('view')
      .setDescription('View details of a specific technology')
      .addStringOption(opt =>
        opt.setName('technology')
          .setDescription('Technology to view')
          .setRequired(true)
          .setAutocomplete(true)))
  .addSubcommand(sub =>
    sub.setName('grant')
      .setDescription('[GM] Grant a technology to a nation without research time')
      .addStringOption(opt =>
        opt.setName('nation')
          .setDescription('Nation to grant tech to')
          .setRequired(true)
          .setAutocomplete(true))
      .addStringOption(opt =>
        opt.setName('technology')
          .setDescription('Technology to grant')
          .setRequired(true)
          .setAutocomplete(true)))
  .addSubcommand(sub =>
    sub.setName('revoke')
      .setDescription('[GM] Revoke a technology from a nation')
      .addStringOption(opt =>
        opt.setName('nation')
          .setDescription('Nation to revoke tech from')
          .setRequired(true)
          .setAutocomplete(true))
      .addStringOption(opt =>
        opt.setName('technology')
          .setDescription('Technology to revoke')
          .setRequired(true)
          .setAutocomplete(true)))
  .addSubcommandGroup(group =>
    group.setName('tech')
      .setDescription('[GM] Technology template management')
      .addSubcommand(sub =>
        sub.setName('create')
          .setDescription('Create a new technology')
          .addStringOption(opt =>
            opt.setName('name')
              .setDescription('Technology name')
              .setRequired(true))
          .addStringOption(opt =>
            opt.setName('category')
              .setDescription('Technology category')
              .setRequired(true)
              .addChoices(
                { name: 'Military', value: 'military' },
                { name: 'Economy', value: 'economy' },
                { name: 'Infrastructure', value: 'infrastructure' },
                { name: 'Science', value: 'science' },
                { name: 'Social', value: 'social' },
                { name: 'Special', value: 'special' },
              ))
          .addIntegerOption(opt =>
            opt.setName('research_time')
              .setDescription('Turns to research (default: 3)')
              .setRequired(false)
              .setMinValue(1))
          .addStringOption(opt =>
            opt.setName('description')
              .setDescription('Technology description')
              .setRequired(false))
          .addStringOption(opt =>
            opt.setName('prerequisites')
              .setDescription('Required techs (comma-separated)')
              .setRequired(false)))
      .addSubcommand(sub =>
        sub.setName('delete')
          .setDescription('Delete a technology')
          .addStringOption(opt =>
            opt.setName('technology')
              .setDescription('Technology to delete')
              .setRequired(true)
              .setAutocomplete(true)))
      .addSubcommand(sub =>
        sub.setName('edit')
          .setDescription('Edit a technology')
          .addStringOption(opt =>
            opt.setName('technology')
              .setDescription('Technology to edit')
              .setRequired(true)
              .setAutocomplete(true))
          .addStringOption(opt =>
            opt.setName('field')
              .setDescription('Field to edit')
              .setRequired(true)
              .addChoices(
                { name: 'Name', value: 'name' },
                { name: 'Description', value: 'description' },
                { name: 'Category', value: 'category' },
                { name: 'Research Time', value: 'researchTime' },
                { name: 'Prerequisites', value: 'prerequisites' },
              ))
          .addStringOption(opt =>
            opt.setName('value')
              .setDescription('New value')
              .setRequired(true))));

export async function execute(interaction) {
  const subcommandGroup = interaction.options.getSubcommandGroup(false);
  const subcommand = interaction.options.getSubcommand();

  if (subcommandGroup === 'tech') {
    switch (subcommand) {
      case 'create':
        return handleTechCreate(interaction);
      case 'delete':
        return handleTechDelete(interaction);
      case 'edit':
        return handleTechEdit(interaction);
    }
  }

  switch (subcommand) {
    case 'start':
      return handleStart(interaction);
    case 'cancel':
      return handleCancel(interaction);
    case 'status':
      return handleStatus(interaction);
    case 'list':
      return handleList(interaction);
    case 'view':
      return handleView(interaction);
    case 'grant':
      return handleGrant(interaction);
    case 'revoke':
      return handleRevoke(interaction);
  }
}

async function handleStart(interaction) {
  const nationName = interaction.options.getString('nation');
  const techName = interaction.options.getString('technology');

  const nation = await Nation.findOne({ name: { $regex: new RegExp(`^${nationName}$`, 'i') } });
  if (!nation) {
    return interaction.reply({ embeds: [errorEmbed(`Nation **${nationName}** not found.`)], ephemeral: true });
  }

  // Check permission (nation owner or GM)
  if (!canModifyNation(interaction.member, nation)) {
    return interaction.reply({
      embeds: [errorEmbed(`You don't have permission to manage research for **${nation.name}**.`)],
      ephemeral: true,
    });
  }

  // Check if already researching
  if (nation.research.current) {
    return interaction.reply({
      embeds: [errorEmbed(`**${nation.name}** is already researching **${nation.research.current}** (${nation.research.turnsRemaining} turns remaining). Cancel it first to start a new research.`)],
      ephemeral: true,
    });
  }

  // Find the technology
  const tech = await Technology.findOne({ name: { $regex: new RegExp(`^${techName}$`, 'i') } });
  if (!tech) {
    return interaction.reply({ embeds: [errorEmbed(`Technology **${techName}** not found.`)], ephemeral: true });
  }

  // Check if already researched
  if (nation.research.completed.includes(tech.name)) {
    return interaction.reply({
      embeds: [errorEmbed(`**${nation.name}** has already researched **${tech.name}**.`)],
      ephemeral: true,
    });
  }

  // Check prerequisites
  if (tech.prerequisites && tech.prerequisites.length > 0) {
    const missingPrereqs = tech.prerequisites.filter(prereq => !nation.research.completed.includes(prereq));
    if (missingPrereqs.length > 0) {
      return interaction.reply({
        embeds: [errorEmbed(`**${nation.name}** is missing required technologies: ${missingPrereqs.join(', ')}`)],
        ephemeral: true,
      });
    }
  }

  // Check resource costs (if any)
  if (tech.costs && tech.costs.length > 0) {
    const insufficientResources = [];
    for (const cost of tech.costs) {
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
    for (const cost of tech.costs) {
      // Try resources first, then currencies
      if (nation.resources?.has(cost.resource)) {
        const current = nation.resources.get(cost.resource);
        nation.resources.set(cost.resource, current - cost.amount);
      } else if (nation.economy.currencies?.has(cost.resource)) {
        const current = nation.economy.currencies.get(cost.resource);
        nation.economy.currencies.set(cost.resource, current - cost.amount);
      }
    }
  }

  // Start research
  nation.research.current = tech.name;
  nation.research.turnsRemaining = tech.researchTime;
  await nation.save();

  // Audit log
  await createAuditLog({
    entityType: 'nation',
    entityId: nation._id,
    entityName: nation.name,
    action: 'update',
    field: 'research.current',
    oldValue: null,
    newValue: tech.name,
    description: `**${nation.name}** started researching **${tech.name}** (${tech.researchTime} turns)`,
    performedBy: interaction.user.id,
    performedByTag: interaction.user.tag,
  });

  const embed = createEmbed({
    title: 'Research Started',
    description: `**${nation.name}** has begun researching **${tech.name}**`,
    color: config.colors.success,
    fields: [
      { name: 'Category', value: tech.category.charAt(0).toUpperCase() + tech.category.slice(1), inline: true },
      { name: 'Time Required', value: `${tech.researchTime} turns`, inline: true },
    ],
  });

  if (tech.description) {
    embed.addFields({ name: 'Description', value: tech.description, inline: false });
  }

  await interaction.reply({ embeds: [embed] });
}

async function handleCancel(interaction) {
  const nationName = interaction.options.getString('nation');

  const nation = await Nation.findOne({ name: { $regex: new RegExp(`^${nationName}$`, 'i') } });
  if (!nation) {
    return interaction.reply({ embeds: [errorEmbed(`Nation **${nationName}** not found.`)], ephemeral: true });
  }

  // Check permission
  if (!canModifyNation(interaction.member, nation)) {
    return interaction.reply({
      embeds: [errorEmbed(`You don't have permission to manage research for **${nation.name}**.`)],
      ephemeral: true,
    });
  }

  if (!nation.research.current) {
    return interaction.reply({
      embeds: [errorEmbed(`**${nation.name}** is not currently researching anything.`)],
      ephemeral: true,
    });
  }

  const cancelledTech = nation.research.current;
  nation.research.current = null;
  nation.research.turnsRemaining = 0;
  await nation.save();

  // Audit log
  await createAuditLog({
    entityType: 'nation',
    entityId: nation._id,
    entityName: nation.name,
    action: 'update',
    field: 'research.current',
    oldValue: cancelledTech,
    newValue: null,
    description: `**${nation.name}** cancelled research on **${cancelledTech}**`,
    performedBy: interaction.user.id,
    performedByTag: interaction.user.tag,
  });

  await interaction.reply({
    embeds: [successEmbed(`**${nation.name}** has cancelled research on **${cancelledTech}**.\n\n*Note: Research costs are not refunded.*`)],
  });
}

async function handleStatus(interaction) {
  const nationName = interaction.options.getString('nation');

  const nation = await Nation.findOne({ name: { $regex: new RegExp(`^${nationName}$`, 'i') } });
  if (!nation) {
    return interaction.reply({ embeds: [errorEmbed(`Nation **${nationName}** not found.`)], ephemeral: true });
  }

  const embed = createEmbed({
    title: `${nation.name} - Research Status`,
    color: config.colors.primary,
  });

  // Current research
  if (nation.research.current) {
    const tech = await Technology.findOne({ name: nation.research.current });
    let currentText = `**${nation.research.current}**\n${nation.research.turnsRemaining} turns remaining`;
    if (tech?.description) {
      currentText += `\n*${tech.description.substring(0, 200)}${tech.description.length > 200 ? '...' : ''}*`;
    }
    embed.addFields({ name: 'Currently Researching', value: currentText, inline: false });
  } else {
    embed.addFields({ name: 'Currently Researching', value: '*None - use `/research start` to begin*', inline: false });
  }

  // Completed research
  if (nation.research.completed && nation.research.completed.length > 0) {
    const completedText = nation.research.completed.map(t => `• ${t}`).join('\n');
    embed.addFields({
      name: `Completed Technologies (${nation.research.completed.length})`,
      value: completedText.substring(0, 1024),
      inline: false,
    });
  } else {
    embed.addFields({ name: 'Completed Technologies', value: '*None*', inline: false });
  }

  // Available to research
  const allTechs = await Technology.find();
  const availableTechs = allTechs.filter(tech => {
    if (nation.research.completed.includes(tech.name)) return false;
    if (tech.name === nation.research.current) return false;
    if (tech.prerequisites && tech.prerequisites.length > 0) {
      return tech.prerequisites.every(prereq => nation.research.completed.includes(prereq));
    }
    return true;
  });

  if (availableTechs.length > 0) {
    const availableText = availableTechs.slice(0, 10).map(t => `• ${t.name} (${t.researchTime} turns)`).join('\n');
    embed.addFields({
      name: `Available to Research (${availableTechs.length})`,
      value: availableText + (availableTechs.length > 10 ? `\n...and ${availableTechs.length - 10} more` : ''),
      inline: false,
    });
  }

  await interaction.reply({ embeds: [embed] });
}

async function handleList(interaction) {
  const category = interaction.options.getString('category');

  const query = category ? { category } : {};
  const technologies = await Technology.find(query).sort({ category: 1, name: 1 });

  if (technologies.length === 0) {
    return interaction.reply({
      embeds: [errorEmbed(category ? `No technologies found in category **${category}**.` : 'No technologies have been created yet.')],
      ephemeral: true,
    });
  }

  const grouped = {};
  for (const tech of technologies) {
    if (!grouped[tech.category]) grouped[tech.category] = [];
    grouped[tech.category].push(tech);
  }

  const embed = createEmbed({
    title: category ? `Technologies - ${category.charAt(0).toUpperCase() + category.slice(1)}` : 'All Technologies',
    color: config.colors.primary,
  });

  for (const [cat, techs] of Object.entries(grouped)) {
    const techList = techs.map(t => `• **${t.name}** (${t.researchTime} turns)`).join('\n');
    embed.addFields({
      name: `${cat.charAt(0).toUpperCase() + cat.slice(1)} (${techs.length})`,
      value: techList.substring(0, 1024),
      inline: false,
    });
  }

  await interaction.reply({ embeds: [embed] });
}

async function handleView(interaction) {
  const techName = interaction.options.getString('technology');

  const tech = await Technology.findOne({ name: { $regex: new RegExp(`^${techName}$`, 'i') } });
  if (!tech) {
    return interaction.reply({ embeds: [errorEmbed(`Technology **${techName}** not found.`)], ephemeral: true });
  }

  const embed = createEmbed({
    title: tech.name,
    description: tech.description || '*No description*',
    color: config.colors.primary,
  });

  embed.addFields(
    { name: 'Category', value: tech.category.charAt(0).toUpperCase() + tech.category.slice(1), inline: true },
    { name: 'Research Time', value: `${tech.researchTime} turns`, inline: true },
  );

  if (tech.prerequisites && tech.prerequisites.length > 0) {
    embed.addFields({
      name: 'Prerequisites',
      value: tech.prerequisites.map(p => `• ${p}`).join('\n'),
      inline: false,
    });
  }

  if (tech.costs && tech.costs.length > 0) {
    embed.addFields({
      name: 'Costs',
      value: tech.costs.map(c => `• ${formatNumber(c.amount)} ${c.resource}`).join('\n'),
      inline: false,
    });
  }

  if (tech.effects && tech.effects.length > 0) {
    embed.addFields({
      name: 'Effects',
      value: tech.effects.map(e => `• ${e.description || `${e.type}: ${e.target} ${e.value > 0 ? '+' : ''}${e.value}`}`).join('\n'),
      inline: false,
    });
  }

  if (tech.unlocks && tech.unlocks.length > 0) {
    embed.addFields({
      name: 'Unlocks',
      value: tech.unlocks.map(u => `• ${u}`).join('\n'),
      inline: false,
    });
  }

  await interaction.reply({ embeds: [embed] });
}

async function handleGrant(interaction) {
  if (!requireGM(interaction)) return;

  const nationName = interaction.options.getString('nation');
  const techName = interaction.options.getString('technology');

  const nation = await Nation.findOne({ name: { $regex: new RegExp(`^${nationName}$`, 'i') } });
  if (!nation) {
    return interaction.reply({ embeds: [errorEmbed(`Nation **${nationName}** not found.`)], ephemeral: true });
  }

  const tech = await Technology.findOne({ name: { $regex: new RegExp(`^${techName}$`, 'i') } });
  if (!tech) {
    return interaction.reply({ embeds: [errorEmbed(`Technology **${techName}** not found.`)], ephemeral: true });
  }

  if (nation.research.completed.includes(tech.name)) {
    return interaction.reply({
      embeds: [errorEmbed(`**${nation.name}** already has **${tech.name}**.`)],
      ephemeral: true,
    });
  }

  nation.research.completed.push(tech.name);
  await nation.save();

  // Audit log
  await createAuditLog({
    entityType: 'nation',
    entityId: nation._id,
    entityName: nation.name,
    action: 'update',
    field: 'research.completed',
    newValue: tech.name,
    description: `GM granted **${tech.name}** to **${nation.name}**`,
    performedBy: interaction.user.id,
    performedByTag: interaction.user.tag,
  });

  await interaction.reply({
    embeds: [successEmbed(`Granted **${tech.name}** to **${nation.name}**.`)],
  });
}

async function handleRevoke(interaction) {
  if (!requireGM(interaction)) return;

  const nationName = interaction.options.getString('nation');
  const techName = interaction.options.getString('technology');

  const nation = await Nation.findOne({ name: { $regex: new RegExp(`^${nationName}$`, 'i') } });
  if (!nation) {
    return interaction.reply({ embeds: [errorEmbed(`Nation **${nationName}** not found.`)], ephemeral: true });
  }

  const techIndex = nation.research.completed.findIndex(
    t => t.toLowerCase() === techName.toLowerCase()
  );
  
  if (techIndex === -1) {
    return interaction.reply({
      embeds: [errorEmbed(`**${nation.name}** doesn't have **${techName}**.`)],
      ephemeral: true,
    });
  }

  const removedTech = nation.research.completed[techIndex];
  nation.research.completed.splice(techIndex, 1);
  await nation.save();

  // Audit log
  await createAuditLog({
    entityType: 'nation',
    entityId: nation._id,
    entityName: nation.name,
    action: 'update',
    field: 'research.completed',
    oldValue: removedTech,
    description: `GM revoked **${removedTech}** from **${nation.name}**`,
    performedBy: interaction.user.id,
    performedByTag: interaction.user.tag,
  });

  await interaction.reply({
    embeds: [successEmbed(`Revoked **${removedTech}** from **${nation.name}**.`)],
  });
}

// GM: Tech template management
async function handleTechCreate(interaction) {
  if (!requireGM(interaction)) return;

  const name = interaction.options.getString('name');
  const category = interaction.options.getString('category');
  const researchTime = interaction.options.getInteger('research_time') || 3;
  const description = interaction.options.getString('description') || '';
  const prerequisitesStr = interaction.options.getString('prerequisites');
  const prerequisites = prerequisitesStr ? prerequisitesStr.split(',').map(p => p.trim()) : [];

  // Check for duplicate
  const existing = await Technology.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
  if (existing) {
    return interaction.reply({
      embeds: [errorEmbed(`A technology named **${name}** already exists.`)],
      ephemeral: true,
    });
  }

  const tech = await Technology.create({
    name,
    category,
    description,
    researchTime,
    prerequisites,
  });

  // Audit log
  await createAuditLog({
    entityType: 'technology',
    entityId: tech._id,
    entityName: tech.name,
    action: 'create',
    description: `Created technology **${tech.name}** (${category}, ${researchTime} turns)`,
    performedBy: interaction.user.id,
    performedByTag: interaction.user.tag,
  });

  const embed = createEmbed({
    title: 'Technology Created',
    description: `**${tech.name}** has been created.`,
    color: config.colors.success,
    fields: [
      { name: 'Category', value: category.charAt(0).toUpperCase() + category.slice(1), inline: true },
      { name: 'Research Time', value: `${researchTime} turns`, inline: true },
    ],
  });

  if (description) {
    embed.addFields({ name: 'Description', value: description, inline: false });
  }

  if (prerequisites.length > 0) {
    embed.addFields({ name: 'Prerequisites', value: prerequisites.join(', '), inline: false });
  }

  await interaction.reply({ embeds: [embed] });
}

async function handleTechDelete(interaction) {
  if (!requireGM(interaction)) return;

  const techName = interaction.options.getString('technology');

  const tech = await Technology.findOne({ name: { $regex: new RegExp(`^${techName}$`, 'i') } });
  if (!tech) {
    return interaction.reply({ embeds: [errorEmbed(`Technology **${techName}** not found.`)], ephemeral: true });
  }

  await Technology.deleteOne({ _id: tech._id });

  // Audit log
  await createAuditLog({
    entityType: 'technology',
    entityId: tech._id,
    entityName: tech.name,
    action: 'delete',
    description: `Deleted technology **${tech.name}**`,
    performedBy: interaction.user.id,
    performedByTag: interaction.user.tag,
  });

  await interaction.reply({
    embeds: [successEmbed(`Technology **${tech.name}** has been deleted.`)],
  });
}

async function handleTechEdit(interaction) {
  if (!requireGM(interaction)) return;

  const techName = interaction.options.getString('technology');
  const field = interaction.options.getString('field');
  const value = interaction.options.getString('value');

  const tech = await Technology.findOne({ name: { $regex: new RegExp(`^${techName}$`, 'i') } });
  if (!tech) {
    return interaction.reply({ embeds: [errorEmbed(`Technology **${techName}** not found.`)], ephemeral: true });
  }

  const oldValue = tech[field];
  let newValue = value;

  // Parse value based on field type
  if (field === 'researchTime') {
    newValue = parseInt(value);
    if (isNaN(newValue) || newValue < 1) {
      return interaction.reply({
        embeds: [errorEmbed('Research time must be a positive number.')],
        ephemeral: true,
      });
    }
  } else if (field === 'prerequisites') {
    newValue = value.split(',').map(p => p.trim()).filter(p => p);
  }

  tech[field] = newValue;
  await tech.save();

  // Audit log
  await createAuditLog({
    entityType: 'technology',
    entityId: tech._id,
    entityName: tech.name,
    action: 'update',
    field,
    oldValue,
    newValue,
    description: `Updated **${tech.name}** ${field} to **${Array.isArray(newValue) ? newValue.join(', ') : newValue}**`,
    performedBy: interaction.user.id,
    performedByTag: interaction.user.tag,
  });

  await interaction.reply({
    embeds: [successEmbed(`Updated **${tech.name}**'s ${field} to **${Array.isArray(newValue) ? newValue.join(', ') : newValue}**.`)],
  });
}

export async function autocomplete(interaction) {
  const focusedOption = interaction.options.getFocused(true);

  if (focusedOption.name === 'nation') {
    const nations = await Nation.find({
      name: { $regex: focusedOption.value, $options: 'i' },
    }).limit(25);
    await interaction.respond(nations.map(n => ({ name: n.name, value: n.name })));
  } else if (focusedOption.name === 'technology') {
    const technologies = await Technology.find({
      name: { $regex: focusedOption.value, $options: 'i' },
    }).limit(25);
    await interaction.respond(technologies.map(t => ({ name: `${t.name} (${t.category})`, value: t.name })));
  }
}
