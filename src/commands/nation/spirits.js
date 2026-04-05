import { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import Nation from '../../database/models/Nation.js';
import Spirit from '../../database/models/Spirit.js';
import { createAuditLog } from '../../database/models/AuditLog.js';
import { isGM, requireGM } from '../../utils/permissions.js';
import { createEmbed, errorEmbed, successEmbed } from '../../utils/embeds.js';
import config from '../../config.js';
import { defaultSpirits } from '../../presets/spirits.js';

// Effect types with their descriptions for help text
const EFFECT_TYPES = {
  income_modifier: { label: 'Income Modifier', unit: '%', example: '+10% income' },
  production_speed: { label: 'Production Speed', unit: '%', example: '+15% production speed' },
  research_speed: { label: 'Research Speed', unit: '%', example: '+20% research speed' },
  stability_modifier: { label: 'Stability Modifier', unit: '%', example: '+5% stability' },
  military_modifier: { label: 'Military Modifier', unit: '%', example: '+10% army effectiveness' },
  diplomacy_bonus: { label: 'Diplomacy Bonus', unit: '', example: '+15 diplomacy with democracies' },
  resource_income: { label: 'Resource Income', unit: '', example: '+200 Oil per turn' },
  maintenance_modifier: { label: 'Maintenance Modifier', unit: '%', example: '-10% maintenance costs' },
  population_growth: { label: 'Population Growth', unit: '%', example: '+2% population growth' },
  custom: { label: 'Custom Effect', unit: '', example: 'Custom description' },
};

export const data = new SlashCommandBuilder()
  .setName('spirits')
  .setDescription('Manage nation spirits (national traits/buffs)')
  .addSubcommand(sub =>
    sub.setName('view')
      .setDescription('View a nation\'s spirits')
      .addStringOption(opt =>
        opt.setName('nation')
          .setDescription('Nation to view')
          .setRequired(true)
          .setAutocomplete(true)))
  .addSubcommand(sub =>
    sub.setName('add')
      .setDescription('Add a spirit to a nation')
      .addStringOption(opt =>
        opt.setName('nation')
          .setDescription('Nation to modify')
          .setRequired(true)
          .setAutocomplete(true))
      .addStringOption(opt =>
        opt.setName('spirit')
          .setDescription('Spirit to add (preset or custom)')
          .setRequired(false)
          .setAutocomplete(true)))
  .addSubcommand(sub =>
    sub.setName('remove')
      .setDescription('Remove a spirit from a nation')
      .addStringOption(opt =>
        opt.setName('nation')
          .setDescription('Nation to modify')
          .setRequired(true)
          .setAutocomplete(true))
      .addStringOption(opt =>
        opt.setName('spirit')
          .setDescription('Spirit to remove')
          .setRequired(true)
          .setAutocomplete(true)))
  .addSubcommand(sub =>
    sub.setName('list')
      .setDescription('List all available spirits (presets and custom)'))
  .addSubcommandGroup(group =>
    group.setName('spirit')
      .setDescription('[GM] Custom spirit template management')
      .addSubcommand(sub =>
        sub.setName('create')
          .setDescription('Create a new custom spirit template')
          .addStringOption(opt =>
            opt.setName('name')
              .setDescription('Spirit name')
              .setRequired(true))
          .addStringOption(opt =>
            opt.setName('category')
              .setDescription('Spirit category')
              .setRequired(true)
              .addChoices(
                { name: 'Military', value: 'military' },
                { name: 'Economic', value: 'economic' },
                { name: 'Political', value: 'political' },
                { name: 'Research', value: 'research' },
                { name: 'Geographic', value: 'geographic' },
                { name: 'Custom', value: 'custom' },
              ))
          .addStringOption(opt =>
            opt.setName('description')
              .setDescription('Spirit description')
              .setRequired(false)))
      .addSubcommand(sub =>
        sub.setName('delete')
          .setDescription('Delete a custom spirit template')
          .addStringOption(opt =>
            opt.setName('spirit')
              .setDescription('Spirit to delete')
              .setRequired(true)
              .setAutocomplete(true)))
      .addSubcommand(sub =>
        sub.setName('edit')
          .setDescription('Edit a custom spirit template')
          .addStringOption(opt =>
            opt.setName('spirit')
              .setDescription('Spirit to edit')
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
              ))
          .addStringOption(opt =>
            opt.setName('value')
              .setDescription('New value')
              .setRequired(true)))
      .addSubcommand(sub =>
        sub.setName('addeffect')
          .setDescription('Add an effect to a custom spirit')
          .addStringOption(opt =>
            opt.setName('spirit')
              .setDescription('Spirit to modify')
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
                { name: 'Diplomacy Bonus', value: 'diplomacy_bonus' },
                { name: 'Resource Income (flat)', value: 'resource_income' },
                { name: 'Maintenance Modifier (%)', value: 'maintenance_modifier' },
                { name: 'Population Growth (%)', value: 'population_growth' },
                { name: 'Custom (text only)', value: 'custom' },
              ))
          .addNumberOption(opt =>
            opt.setName('value')
              .setDescription('Effect value (use negative for penalties)')
              .setRequired(true))
          .addStringOption(opt =>
            opt.setName('target')
              .setDescription('Target (e.g., "army", "Oil", "democracies")')
              .setRequired(false))
          .addStringOption(opt =>
            opt.setName('description')
              .setDescription('Human-readable description (e.g., "+10% army effectiveness")')
              .setRequired(false)))
      .addSubcommand(sub =>
        sub.setName('removeeffect')
          .setDescription('Remove an effect from a custom spirit')
          .addStringOption(opt =>
            opt.setName('spirit')
              .setDescription('Spirit to modify')
              .setRequired(true)
              .setAutocomplete(true))
          .addIntegerOption(opt =>
            opt.setName('index')
              .setDescription('Effect index to remove (1-based, see spirit view)')
              .setRequired(true)
              .setMinValue(1)))
      .addSubcommand(sub =>
        sub.setName('view')
          .setDescription('View details of a spirit template')
          .addStringOption(opt =>
            opt.setName('spirit')
              .setDescription('Spirit to view')
              .setRequired(true)
              .setAutocomplete(true))));

export async function execute(interaction) {
  const subcommandGroup = interaction.options.getSubcommandGroup(false);
  const subcommand = interaction.options.getSubcommand();

  if (subcommandGroup === 'spirit') {
    switch (subcommand) {
      case 'create':
        return handleSpiritCreate(interaction);
      case 'delete':
        return handleSpiritDelete(interaction);
      case 'edit':
        return handleSpiritEdit(interaction);
      case 'addeffect':
        return handleSpiritAddEffect(interaction);
      case 'removeeffect':
        return handleSpiritRemoveEffect(interaction);
      case 'view':
        return handleSpiritView(interaction);
    }
  }

  switch (subcommand) {
    case 'view':
      return handleView(interaction);
    case 'add':
      return handleAdd(interaction);
    case 'remove':
      return handleRemove(interaction);
    case 'list':
      return handleList(interaction);
  }
}

// Get all available spirits (presets + custom from database)
async function getAllSpirits(guildId) {
  const customSpirits = await Spirit.find({ 
    $or: [{ guildId }, { guildId: null, isDefault: true }] 
  });
  
  // Combine presets with custom spirits, custom spirits take precedence
  const allSpirits = [...defaultSpirits];
  for (const custom of customSpirits) {
    const existingIndex = allSpirits.findIndex(s => s.name.toLowerCase() === custom.name.toLowerCase());
    if (existingIndex >= 0) {
      allSpirits[existingIndex] = custom;
    } else {
      allSpirits.push(custom);
    }
  }
  return allSpirits;
}

// Find a spirit by name (checks custom first, then presets)
async function findSpirit(guildId, name) {
  // Check custom spirits first
  const custom = await Spirit.findOne({ 
    $or: [{ guildId }, { guildId: null, isDefault: true }],
    name: { $regex: new RegExp(`^${name}$`, 'i') }
  });
  if (custom) return custom;
  
  // Fall back to presets
  return defaultSpirits.find(s => s.name.toLowerCase() === name.toLowerCase());
}

async function handleView(interaction) {
  const guildId = interaction.guildId;
  const nationName = interaction.options.getString('nation');
  const nation = await Nation.findOne({ guildId, name: { $regex: new RegExp(`^${nationName}$`, 'i') } });

  if (!nation) {
    return interaction.reply({ embeds: [errorEmbed(`Nation **${nationName}** not found.`)], ephemeral: true });
  }

  if (!nation.spirits || nation.spirits.length === 0) {
    return interaction.reply({ embeds: [errorEmbed(`**${nation.name}** has no spirits.`)] });
  }

  const embed = createEmbed({
    title: `${nation.name} - Spirits`,
    color: config.colors.primary,
  });

  for (const spirit of nation.spirits) {
    let effectsText = spirit.description || '';
    if (spirit.effects && spirit.effects.length > 0) {
      effectsText += '\n**Effects:**\n' + spirit.effects.map(e => `• ${e.description || formatEffect(e)}`).join('\n');
    }
    embed.addFields({ name: spirit.name, value: effectsText || 'No description', inline: false });
  }

  await interaction.reply({ embeds: [embed] });
}

async function handleAdd(interaction) {
  if (!requireGM(interaction)) return;

  const guildId = interaction.guildId;
  const nationName = interaction.options.getString('nation');
  const spiritName = interaction.options.getString('spirit');

  const nation = await Nation.findOne({ guildId, name: { $regex: new RegExp(`^${nationName}$`, 'i') } });
  if (!nation) {
    return interaction.reply({ embeds: [errorEmbed(`Nation **${nationName}** not found.`)], ephemeral: true });
  }

  // If spirit specified, add it directly
  if (spiritName) {
    const spirit = await findSpirit(guildId, spiritName);
    if (!spirit) {
      return interaction.reply({ embeds: [errorEmbed(`Spirit **${spiritName}** not found. Use \`/spirits list\` to see available spirits.`)], ephemeral: true });
    }

    // Check if already has this spirit
    if (nation.spirits.some(s => s.name.toLowerCase() === spirit.name.toLowerCase())) {
      return interaction.reply({ embeds: [errorEmbed(`**${nation.name}** already has the spirit **${spirit.name}**.`)], ephemeral: true });
    }

    // Convert to plain object if it's a Mongoose document
    const spiritData = spirit.toObject ? spirit.toObject() : { ...spirit };
    delete spiritData._id;
    delete spiritData.__v;
    delete spiritData.guildId;
    delete spiritData.createdAt;
    delete spiritData.createdBy;
    delete spiritData.isDefault;

    nation.spirits.push(spiritData);
    await nation.save();

    await createAuditLog({
      guildId,
      entityType: 'nation',
      entityId: nation._id,
      entityName: nation.name,
      action: 'update',
      field: 'spirits',
      newValue: spirit.name,
      description: `Spirit **${spirit.name}** added to **${nation.name}**`,
      performedBy: interaction.user.id,
      performedByTag: interaction.user.tag,
    });

    return interaction.reply({ embeds: [successEmbed(`Added spirit **${spirit.name}** to **${nation.name}**.`)] });
  }

  // Otherwise show modal for quick custom spirit
  const modal = new ModalBuilder()
    .setCustomId(`spirits:add:${nation._id}`)
    .setTitle(`Add Spirit to ${nation.name}`);

  const nameInput = new TextInputBuilder()
    .setCustomId('name')
    .setLabel('Spirit Name')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(100);

  const descInput = new TextInputBuilder()
    .setCustomId('description')
    .setLabel('Description')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(false)
    .setMaxLength(500);

  const effectsInput = new TextInputBuilder()
    .setCustomId('effects')
    .setLabel('Effects (one per line, e.g. "+10% income")')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(false)
    .setMaxLength(500)
    .setPlaceholder('+10% income\n+200 Oil per turn\n-5% stability');

  modal.addComponents(
    new ActionRowBuilder().addComponents(nameInput),
    new ActionRowBuilder().addComponents(descInput),
    new ActionRowBuilder().addComponents(effectsInput),
  );

  await interaction.showModal(modal);
}

async function handleRemove(interaction) {
  if (!requireGM(interaction)) return;

  const guildId = interaction.guildId;
  const nationName = interaction.options.getString('nation');
  const spiritName = interaction.options.getString('spirit');

  const nation = await Nation.findOne({ guildId, name: { $regex: new RegExp(`^${nationName}$`, 'i') } });
  if (!nation) {
    return interaction.reply({ embeds: [errorEmbed(`Nation **${nationName}** not found.`)], ephemeral: true });
  }

  const spiritIndex = nation.spirits.findIndex(s => s.name.toLowerCase() === spiritName.toLowerCase());
  if (spiritIndex === -1) {
    return interaction.reply({ embeds: [errorEmbed(`**${nation.name}** doesn't have a spirit named **${spiritName}**.`)], ephemeral: true });
  }

  const removedSpirit = nation.spirits[spiritIndex];
  nation.spirits.splice(spiritIndex, 1);
  await nation.save();

  await createAuditLog({
    guildId,
    entityType: 'nation',
    entityId: nation._id,
    entityName: nation.name,
    action: 'update',
    field: 'spirits',
    oldValue: removedSpirit.name,
    description: `Spirit **${removedSpirit.name}** removed from **${nation.name}**`,
    performedBy: interaction.user.id,
    performedByTag: interaction.user.tag,
  });

  await interaction.reply({ embeds: [successEmbed(`Removed spirit **${removedSpirit.name}** from **${nation.name}**.`)] });
}

async function handleList(interaction) {
  const guildId = interaction.guildId;
  const allSpirits = await getAllSpirits(guildId);

  const embed = createEmbed({
    title: 'Available Spirits',
    description: 'Use `/spirits add <nation> <spirit>` to add a spirit.\nUse `/spirits spirit create` to create custom spirits.',
    color: config.colors.primary,
  });

  // Group by category
  const categories = {
    military: [],
    economic: [],
    political: [],
    research: [],
    geographic: [],
    custom: [],
  };

  for (const spirit of allSpirits) {
    const cat = spirit.category || categorizeSpirit(spirit);
    if (!categories[cat]) categories[cat] = [];
    categories[cat].push(spirit);
  }

  const categoryNames = {
    military: 'Military',
    economic: 'Economic',
    political: 'Political/Social',
    research: 'Research',
    geographic: 'Geographic',
    custom: 'Custom',
  };

  for (const [cat, spirits] of Object.entries(categories)) {
    if (spirits.length > 0) {
      const spiritList = spirits.map(s => {
        const desc = s.description ? s.description.substring(0, 40) + (s.description.length > 40 ? '...' : '') : 'No description';
        const isCustom = s._id ? ' *(custom)*' : '';
        return `**${s.name}**${isCustom} - ${desc}`;
      }).join('\n');
      
      embed.addFields({
        name: `${categoryNames[cat] || cat} (${spirits.length})`,
        value: spiritList.substring(0, 1024),
        inline: false,
      });
    }
  }

  await interaction.reply({ embeds: [embed] });
}

// Categorize a spirit based on its effects (for presets that don't have category)
function categorizeSpirit(spirit) {
  if (!spirit.effects || spirit.effects.length === 0) return 'custom';
  
  const types = spirit.effects.map(e => e.type);
  if (types.some(t => t === 'military_modifier')) return 'military';
  if (types.some(t => ['income_modifier', 'production_speed', 'resource_income', 'maintenance_modifier'].includes(t))) return 'economic';
  if (types.some(t => ['stability_modifier', 'diplomacy_bonus'].includes(t))) return 'political';
  if (types.some(t => t === 'research_speed')) return 'research';
  return 'custom';
}

// Format an effect object into human-readable text
function formatEffect(effect) {
  const sign = effect.value >= 0 ? '+' : '';
  const typeInfo = EFFECT_TYPES[effect.type] || { label: effect.type, unit: '' };
  
  if (effect.type === 'custom') {
    return effect.description || 'Custom effect';
  }
  
  let text = `${sign}${effect.value}${typeInfo.unit} ${typeInfo.label.toLowerCase()}`;
  if (effect.target) {
    text += ` (${effect.target})`;
  }
  return text;
}

// Parse effect text like "+10% income" into an effect object
function parseEffectText(text) {
  const trimmed = text.trim();
  
  // Try to match patterns like "+10% income", "-5 stability", "+200 Oil per turn"
  const percentMatch = trimmed.match(/^([+-]?\d+(?:\.\d+)?)\s*%\s*(.+)$/i);
  const flatMatch = trimmed.match(/^([+-]?\d+(?:\.\d+)?)\s+(.+)$/i);
  
  if (percentMatch) {
    const value = parseFloat(percentMatch[1]);
    const rest = percentMatch[2].toLowerCase();
    
    if (rest.includes('income')) return { type: 'income_modifier', value, description: trimmed };
    if (rest.includes('production')) return { type: 'production_speed', value, description: trimmed };
    if (rest.includes('research')) return { type: 'research_speed', value, description: trimmed };
    if (rest.includes('stability')) return { type: 'stability_modifier', value, description: trimmed };
    if (rest.includes('military') || rest.includes('army') || rest.includes('navy') || rest.includes('airforce')) {
      const target = rest.includes('army') ? 'army' : rest.includes('navy') ? 'navy' : rest.includes('airforce') ? 'airforce' : 'all';
      return { type: 'military_modifier', value, target, description: trimmed };
    }
    if (rest.includes('maintenance')) return { type: 'maintenance_modifier', value, description: trimmed };
    if (rest.includes('population') || rest.includes('growth')) return { type: 'population_growth', value, description: trimmed };
  }
  
  if (flatMatch) {
    const value = parseFloat(flatMatch[1]);
    const rest = flatMatch[2].toLowerCase();
    
    if (rest.includes('diplomacy') || rest.includes('relations')) {
      const targetMatch = rest.match(/with\s+(\w+)/i);
      return { type: 'diplomacy_bonus', value, target: targetMatch ? targetMatch[1] : 'all', description: trimmed };
    }
    
    // Resource income (e.g., "+200 Oil per turn")
    const resourceMatch = rest.match(/^(\w+)/);
    if (resourceMatch) {
      return { type: 'resource_income', value, target: resourceMatch[1].charAt(0).toUpperCase() + resourceMatch[1].slice(1), description: trimmed };
    }
  }
  
  // Default to custom effect
  return { type: 'custom', description: trimmed };
}

// Spirit template management handlers
async function handleSpiritCreate(interaction) {
  if (!requireGM(interaction)) return;

  const guildId = interaction.guildId;
  const name = interaction.options.getString('name');
  const category = interaction.options.getString('category');
  const description = interaction.options.getString('description') || '';

  // Check for duplicate
  const existing = await Spirit.findOne({ 
    guildId, 
    name: { $regex: new RegExp(`^${name}$`, 'i') } 
  });
  if (existing) {
    return interaction.reply({
      embeds: [errorEmbed(`A custom spirit named **${name}** already exists.`)],
      ephemeral: true,
    });
  }

  // Also check presets
  const preset = defaultSpirits.find(s => s.name.toLowerCase() === name.toLowerCase());
  if (preset) {
    return interaction.reply({
      embeds: [errorEmbed(`**${name}** is already a preset spirit. Choose a different name.`)],
      ephemeral: true,
    });
  }

  const spirit = await Spirit.create({
    guildId,
    name,
    category,
    description,
    effects: [],
    createdBy: interaction.user.id,
  });

  await createAuditLog({
    guildId,
    entityType: 'spirit',
    entityId: spirit._id,
    entityName: spirit.name,
    action: 'create',
    description: `Created custom spirit **${spirit.name}** (${category})`,
    performedBy: interaction.user.id,
    performedByTag: interaction.user.tag,
  });

  const embed = createEmbed({
    title: 'Spirit Created',
    description: `**${spirit.name}** has been created.\n\nUse \`/spirits spirit addeffect\` to add effects to this spirit.`,
    color: config.colors.success,
    fields: [
      { name: 'Category', value: category.charAt(0).toUpperCase() + category.slice(1), inline: true },
    ],
  });

  if (description) {
    embed.addFields({ name: 'Description', value: description, inline: false });
  }

  await interaction.reply({ embeds: [embed] });
}

async function handleSpiritDelete(interaction) {
  if (!requireGM(interaction)) return;

  const guildId = interaction.guildId;
  const spiritName = interaction.options.getString('spirit');

  const spirit = await Spirit.findOne({ 
    guildId, 
    name: { $regex: new RegExp(`^${spiritName}$`, 'i') } 
  });
  
  if (!spirit) {
    // Check if it's a preset
    const preset = defaultSpirits.find(s => s.name.toLowerCase() === spiritName.toLowerCase());
    if (preset) {
      return interaction.reply({
        embeds: [errorEmbed(`**${spiritName}** is a preset spirit and cannot be deleted.`)],
        ephemeral: true,
      });
    }
    return interaction.reply({ embeds: [errorEmbed(`Custom spirit **${spiritName}** not found.`)], ephemeral: true });
  }

  await Spirit.deleteOne({ _id: spirit._id });

  await createAuditLog({
    guildId,
    entityType: 'spirit',
    entityId: spirit._id,
    entityName: spirit.name,
    action: 'delete',
    description: `Deleted custom spirit **${spirit.name}**`,
    performedBy: interaction.user.id,
    performedByTag: interaction.user.tag,
  });

  await interaction.reply({
    embeds: [successEmbed(`Custom spirit **${spirit.name}** has been deleted.`)],
  });
}

async function handleSpiritEdit(interaction) {
  if (!requireGM(interaction)) return;

  const guildId = interaction.guildId;
  const spiritName = interaction.options.getString('spirit');
  const field = interaction.options.getString('field');
  const value = interaction.options.getString('value');

  const spirit = await Spirit.findOne({ 
    guildId, 
    name: { $regex: new RegExp(`^${spiritName}$`, 'i') } 
  });
  
  if (!spirit) {
    const preset = defaultSpirits.find(s => s.name.toLowerCase() === spiritName.toLowerCase());
    if (preset) {
      return interaction.reply({
        embeds: [errorEmbed(`**${spiritName}** is a preset spirit and cannot be edited. Create a custom spirit with a different name instead.`)],
        ephemeral: true,
      });
    }
    return interaction.reply({ embeds: [errorEmbed(`Custom spirit **${spiritName}** not found.`)], ephemeral: true });
  }

  const oldValue = spirit[field];
  spirit[field] = value;
  await spirit.save();

  await createAuditLog({
    guildId,
    entityType: 'spirit',
    entityId: spirit._id,
    entityName: spirit.name,
    action: 'update',
    field,
    oldValue,
    newValue: value,
    description: `Updated **${spirit.name}** ${field} to **${value}**`,
    performedBy: interaction.user.id,
    performedByTag: interaction.user.tag,
  });

  await interaction.reply({
    embeds: [successEmbed(`Updated **${spirit.name}**'s ${field} to **${value}**.`)],
  });
}

async function handleSpiritAddEffect(interaction) {
  if (!requireGM(interaction)) return;

  const guildId = interaction.guildId;
  const spiritName = interaction.options.getString('spirit');
  const type = interaction.options.getString('type');
  const value = interaction.options.getNumber('value');
  const target = interaction.options.getString('target');
  const description = interaction.options.getString('description');

  const spirit = await Spirit.findOne({ 
    guildId, 
    name: { $regex: new RegExp(`^${spiritName}$`, 'i') } 
  });
  
  if (!spirit) {
    const preset = defaultSpirits.find(s => s.name.toLowerCase() === spiritName.toLowerCase());
    if (preset) {
      return interaction.reply({
        embeds: [errorEmbed(`**${spiritName}** is a preset spirit. Create a custom spirit to add effects.`)],
        ephemeral: true,
      });
    }
    return interaction.reply({ embeds: [errorEmbed(`Custom spirit **${spiritName}** not found.`)], ephemeral: true });
  }

  const effect = {
    type,
    value,
    target: target || undefined,
    description: description || formatEffect({ type, value, target }),
  };

  spirit.effects.push(effect);
  await spirit.save();

  await createAuditLog({
    guildId,
    entityType: 'spirit',
    entityId: spirit._id,
    entityName: spirit.name,
    action: 'update',
    field: 'effects',
    newValue: effect.description,
    description: `Added effect "${effect.description}" to **${spirit.name}**`,
    performedBy: interaction.user.id,
    performedByTag: interaction.user.tag,
  });

  await interaction.reply({
    embeds: [successEmbed(`Added effect to **${spirit.name}**:\n• ${effect.description}`)],
  });
}

async function handleSpiritRemoveEffect(interaction) {
  if (!requireGM(interaction)) return;

  const guildId = interaction.guildId;
  const spiritName = interaction.options.getString('spirit');
  const index = interaction.options.getInteger('index') - 1; // Convert to 0-based

  const spirit = await Spirit.findOne({ 
    guildId, 
    name: { $regex: new RegExp(`^${spiritName}$`, 'i') } 
  });
  
  if (!spirit) {
    return interaction.reply({ embeds: [errorEmbed(`Custom spirit **${spiritName}** not found.`)], ephemeral: true });
  }

  if (index < 0 || index >= spirit.effects.length) {
    return interaction.reply({
      embeds: [errorEmbed(`Invalid effect index. **${spirit.name}** has ${spirit.effects.length} effect(s).`)],
      ephemeral: true,
    });
  }

  const removed = spirit.effects[index];
  spirit.effects.splice(index, 1);
  await spirit.save();

  await createAuditLog({
    guildId,
    entityType: 'spirit',
    entityId: spirit._id,
    entityName: spirit.name,
    action: 'update',
    field: 'effects',
    oldValue: removed.description,
    description: `Removed effect "${removed.description}" from **${spirit.name}**`,
    performedBy: interaction.user.id,
    performedByTag: interaction.user.tag,
  });

  await interaction.reply({
    embeds: [successEmbed(`Removed effect from **${spirit.name}**:\n• ${removed.description}`)],
  });
}

async function handleSpiritView(interaction) {
  const guildId = interaction.guildId;
  const spiritName = interaction.options.getString('spirit');

  const spirit = await findSpirit(guildId, spiritName);
  if (!spirit) {
    return interaction.reply({ embeds: [errorEmbed(`Spirit **${spiritName}** not found.`)], ephemeral: true });
  }

  const isCustom = spirit._id !== undefined;
  const embed = createEmbed({
    title: spirit.name + (isCustom ? ' (Custom)' : ' (Preset)'),
    description: spirit.description || '*No description*',
    color: config.colors.primary,
  });

  if (spirit.category) {
    embed.addFields({ 
      name: 'Category', 
      value: spirit.category.charAt(0).toUpperCase() + spirit.category.slice(1), 
      inline: true 
    });
  }

  if (spirit.effects && spirit.effects.length > 0) {
    const effectsList = spirit.effects.map((e, i) => 
      `${i + 1}. ${e.description || formatEffect(e)}`
    ).join('\n');
    embed.addFields({ name: 'Effects', value: effectsList, inline: false });
  } else {
    embed.addFields({ name: 'Effects', value: '*No effects defined*', inline: false });
  }

  await interaction.reply({ embeds: [embed] });
}

export async function handleModal(interaction) {
  const [, action, nationId] = interaction.customId.split(':');
  const guildId = interaction.guildId;

  if (action === 'add') {
    const nation = await Nation.findOne({ _id: nationId, guildId });
    if (!nation) {
      return interaction.reply({ embeds: [errorEmbed('Nation not found.')], ephemeral: true });
    }

    const name = interaction.fields.getTextInputValue('name');
    const description = interaction.fields.getTextInputValue('description');
    const effectsText = interaction.fields.getTextInputValue('effects');

    // Parse effects from text with mechanical recognition
    const effects = [];
    if (effectsText) {
      const lines = effectsText.split('\n').filter(l => l.trim());
      for (const line of lines) {
        effects.push(parseEffectText(line));
      }
    }

    const spirit = { name, description, effects };
    nation.spirits.push(spirit);
    await nation.save();

    await createAuditLog({
      guildId,
      entityType: 'nation',
      entityId: nation._id,
      entityName: nation.name,
      action: 'update',
      field: 'spirits',
      newValue: name,
      description: `Custom spirit **${name}** added to **${nation.name}**`,
      performedBy: interaction.user.id,
      performedByTag: interaction.user.tag,
    });

    let replyText = `Added custom spirit **${name}** to **${nation.name}**.`;
    if (effects.length > 0) {
      const mechanicalEffects = effects.filter(e => e.type !== 'custom');
      if (mechanicalEffects.length > 0) {
        replyText += `\n\n**Parsed ${mechanicalEffects.length} mechanical effect(s)** that will apply during turn processing.`;
      }
    }

    await interaction.reply({ embeds: [successEmbed(replyText)] });
  }
}

export async function autocomplete(interaction) {
  const focusedOption = interaction.options.getFocused(true);
  const guildId = interaction.guildId;
  const subcommandGroup = interaction.options.getSubcommandGroup(false);
  const subcommand = interaction.options.getSubcommand();

  if (focusedOption.name === 'nation') {
    const nations = await Nation.find({
      guildId,
      name: { $regex: focusedOption.value, $options: 'i' }
    }).limit(25);
    await interaction.respond(nations.map(n => ({ name: n.name, value: n.name })));
  } else if (focusedOption.name === 'spirit') {
    // For spirit template management, only show custom spirits
    if (subcommandGroup === 'spirit' && ['delete', 'edit', 'addeffect', 'removeeffect'].includes(subcommand)) {
      const customSpirits = await Spirit.find({
        guildId,
        name: { $regex: focusedOption.value, $options: 'i' }
      }).limit(25);
      await interaction.respond(customSpirits.map(s => ({ name: `${s.name} (custom)`, value: s.name })));
    } 
    // For adding to nations or viewing, show all spirits
    else if (subcommand === 'add' || (subcommandGroup === 'spirit' && subcommand === 'view')) {
      const allSpirits = await getAllSpirits(guildId);
      const filtered = allSpirits.filter(s => 
        s.name.toLowerCase().includes(focusedOption.value.toLowerCase())
      ).slice(0, 25);
      await interaction.respond(filtered.map(s => ({ 
        name: s._id ? `${s.name} (custom)` : s.name, 
        value: s.name 
      })));
    }
    // For removing from nation, show that nation's spirits
    else if (subcommand === 'remove') {
      const nationName = interaction.options.getString('nation');
      const nation = await Nation.findOne({ guildId, name: { $regex: new RegExp(`^${nationName}$`, 'i') } });
      if (nation && nation.spirits) {
        const filtered = nation.spirits.filter(s =>
          s.name.toLowerCase().includes(focusedOption.value.toLowerCase())
        ).slice(0, 25);
        await interaction.respond(filtered.map(s => ({ name: s.name, value: s.name })));
      } else {
        await interaction.respond([]);
      }
    }
  }
}
