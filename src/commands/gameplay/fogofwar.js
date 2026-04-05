import { SlashCommandBuilder } from 'discord.js';
import Nation from '../../database/models/Nation.js';
import FogOfWar from '../../database/models/FogOfWar.js';
import { createAuditLog } from '../../database/models/AuditLog.js';
import { isGM, requireGM, canModifyNation } from '../../utils/permissions.js';
import { createEmbed, errorEmbed, successEmbed } from '../../utils/embeds.js';
import config from '../../config.js';

const INTEL_LEVELS = {
  0: { name: 'None', description: 'Only public information (name, flag, leader)' },
  1: { name: 'Basic', description: 'Population range, general economy status' },
  2: { name: 'Moderate', description: 'Approximate military strength, resources, stability' },
  3: { name: 'Detailed', description: 'Exact numbers for most statistics' },
  4: { name: 'Complete', description: 'Everything including production queue and research' },
};

const SOURCE_INFO = {
  default: 'Default',
  espionage: 'Espionage',
  treaty: 'Treaty',
  alliance: 'Alliance',
  gm_granted: 'GM Granted',
  border: 'Border Contact',
  trade: 'Trade Relations',
};

export const data = new SlashCommandBuilder()
  .setName('fogofwar')
  .setDescription('Manage intelligence and visibility between nations')
  .addSubcommand(sub =>
    sub.setName('set')
      .setDescription('Set intelligence level between nations (GM only)')
      .addStringOption(opt =>
        opt.setName('observer')
          .setDescription('Nation that gains intelligence')
          .setRequired(true)
          .setAutocomplete(true))
      .addStringOption(opt =>
        opt.setName('target')
          .setDescription('Nation being observed')
          .setRequired(true)
          .setAutocomplete(true))
      .addIntegerOption(opt =>
        opt.setName('level')
          .setDescription('Intelligence level (0-4)')
          .setRequired(true)
          .setMinValue(0)
          .setMaxValue(4))
      .addStringOption(opt =>
        opt.setName('source')
          .setDescription('How intelligence was gained')
          .setRequired(false)
          .addChoices(
            { name: 'Default', value: 'default' },
            { name: 'Espionage', value: 'espionage' },
            { name: 'Treaty', value: 'treaty' },
            { name: 'Alliance', value: 'alliance' },
            { name: 'GM Granted', value: 'gm_granted' },
            { name: 'Border Contact', value: 'border' },
            { name: 'Trade Relations', value: 'trade' }
          ))
      .addIntegerOption(opt =>
        opt.setName('duration')
          .setDescription('Duration in turns (empty = permanent)')
          .setRequired(false)
          .setMinValue(1)))
  .addSubcommand(sub =>
    sub.setName('view')
      .setDescription('View intelligence status for a nation')
      .addStringOption(opt =>
        opt.setName('nation')
          .setDescription('Nation to check intelligence for')
          .setRequired(true)
          .setAutocomplete(true))
      .addStringOption(opt =>
        opt.setName('target')
          .setDescription('Specific target nation (optional)')
          .setRequired(false)
          .setAutocomplete(true)))
  .addSubcommand(sub =>
    sub.setName('override')
      .setDescription('Override specific visibility for a field (GM only)')
      .addStringOption(opt =>
        opt.setName('observer')
          .setDescription('Nation that gains/loses visibility')
          .setRequired(true)
          .setAutocomplete(true))
      .addStringOption(opt =>
        opt.setName('target')
          .setDescription('Nation being observed')
          .setRequired(true)
          .setAutocomplete(true))
      .addStringOption(opt =>
        opt.setName('field')
          .setDescription('Field to override')
          .setRequired(true)
          .addChoices(
            { name: 'Population', value: 'population' },
            { name: 'Economy', value: 'economy' },
            { name: 'Military', value: 'military' },
            { name: 'Resources', value: 'resources' },
            { name: 'Stability', value: 'stability' },
            { name: 'Nukes', value: 'nukes' },
            { name: 'Production', value: 'production' },
            { name: 'Research', value: 'research' },
            { name: 'Loans', value: 'loans' },
            { name: 'Spirits', value: 'spirits' }
          ))
      .addStringOption(opt =>
        opt.setName('visibility')
          .setDescription('Override visibility')
          .setRequired(true)
          .addChoices(
            { name: 'Visible (always show)', value: 'visible' },
            { name: 'Hidden (always hide)', value: 'hidden' },
            { name: 'Default (use level)', value: 'default' }
          )))
  .addSubcommand(sub =>
    sub.setName('reveal')
      .setDescription('Grant full visibility to all nations for a specific nation (GM only)')
      .addStringOption(opt =>
        opt.setName('nation')
          .setDescription('Nation to reveal')
          .setRequired(true)
          .setAutocomplete(true)))
  .addSubcommand(sub =>
    sub.setName('hide')
      .setDescription('Remove all intelligence on a nation (GM only)')
      .addStringOption(opt =>
        opt.setName('nation')
          .setDescription('Nation to hide')
          .setRequired(true)
          .setAutocomplete(true)))
  .addSubcommand(sub =>
    sub.setName('mutual')
      .setDescription('Set mutual intelligence between two nations (GM only)')
      .addStringOption(opt =>
        opt.setName('nation1')
          .setDescription('First nation')
          .setRequired(true)
          .setAutocomplete(true))
      .addStringOption(opt =>
        opt.setName('nation2')
          .setDescription('Second nation')
          .setRequired(true)
          .setAutocomplete(true))
      .addIntegerOption(opt =>
        opt.setName('level')
          .setDescription('Intelligence level for both (0-4)')
          .setRequired(true)
          .setMinValue(0)
          .setMaxValue(4))
      .addStringOption(opt =>
        opt.setName('source')
          .setDescription('How intelligence was gained')
          .setRequired(false)
          .addChoices(
            { name: 'Default', value: 'default' },
            { name: 'Treaty', value: 'treaty' },
            { name: 'Alliance', value: 'alliance' },
            { name: 'Border Contact', value: 'border' },
            { name: 'Trade Relations', value: 'trade' }
          )))
  .addSubcommand(sub =>
    sub.setName('spy')
      .setDescription('View a nation through fog of war (filtered view)')
      .addStringOption(opt =>
        opt.setName('viewer')
          .setDescription('Your nation (who is viewing)')
          .setRequired(true)
          .setAutocomplete(true))
      .addStringOption(opt =>
        opt.setName('target')
          .setDescription('Nation to view')
          .setRequired(true)
          .setAutocomplete(true)))
  .addSubcommand(sub =>
    sub.setName('levels')
      .setDescription('Show information about intelligence levels'));

export async function execute(interaction) {
  const subcommand = interaction.options.getSubcommand();
  
  switch (subcommand) {
    case 'set':
      return handleSet(interaction);
    case 'view':
      return handleView(interaction);
    case 'override':
      return handleOverride(interaction);
    case 'reveal':
      return handleReveal(interaction);
    case 'hide':
      return handleHide(interaction);
    case 'mutual':
      return handleMutual(interaction);
    case 'spy':
      return handleSpy(interaction);
    case 'levels':
      return handleLevels(interaction);
    default:
      return interaction.reply({ embeds: [errorEmbed('Unknown subcommand')], ephemeral: true });
  }
}

async function handleSet(interaction) {
  const gmCheck = await requireGM(interaction);
  if (!gmCheck) return;
  
  const guildId = interaction.guildId;
  const observerName = interaction.options.getString('observer');
  const targetName = interaction.options.getString('target');
  const level = interaction.options.getInteger('level');
  const source = interaction.options.getString('source') || 'gm_granted';
  const duration = interaction.options.getInteger('duration');
  
  const observer = await Nation.findOne({ guildId, name: { $regex: new RegExp(`^${observerName}$`, 'i') } });
  const target = await Nation.findOne({ guildId, name: { $regex: new RegExp(`^${targetName}$`, 'i') } });
  
  if (!observer) {
    return interaction.reply({ embeds: [errorEmbed(`Observer nation "${observerName}" not found`)], ephemeral: true });
  }
  if (!target) {
    return interaction.reply({ embeds: [errorEmbed(`Target nation "${targetName}" not found`)], ephemeral: true });
  }
  if (observer._id.equals(target._id)) {
    return interaction.reply({ embeds: [errorEmbed('A nation cannot spy on itself')], ephemeral: true });
  }
  
  // Calculate expiration if duration specified
  let expiresAt = null;
  if (duration) {
    // Assume 1 turn = 1 day for simplicity, can be adjusted
    expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + duration);
  }
  
  // Upsert the fog of war record
  const fowRecord = await FogOfWar.findOneAndUpdate(
    { guildId, observerNation: observer._id, targetNation: target._id },
    {
      observerNationName: observer.name,
      targetNationName: target.name,
      intelligenceLevel: level,
      source,
      expiresAt,
      updatedBy: interaction.user.id,
    },
    { upsert: true, new: true }
  );
  
  await createAuditLog({
    guildId,
    action: 'fogofwar_set',
    performedBy: interaction.user.id,
    target: `${observer.name} -> ${target.name}`,
    details: { level, source, duration },
  });
  
  const levelInfo = INTEL_LEVELS[level];
  const embed = successEmbed(`Intelligence level set`)
    .addFields(
      { name: 'Observer', value: observer.name, inline: true },
      { name: 'Target', value: target.name, inline: true },
      { name: 'Level', value: `${level} - ${levelInfo.name}`, inline: true },
      { name: 'Description', value: levelInfo.description, inline: false },
      { name: 'Source', value: SOURCE_INFO[source], inline: true },
      { name: 'Duration', value: duration ? `${duration} turns` : 'Permanent', inline: true }
    );
  
  return interaction.reply({ embeds: [embed] });
}

async function handleView(interaction) {
  const guildId = interaction.guildId;
  const nationName = interaction.options.getString('nation');
  const targetName = interaction.options.getString('target');
  
  const nation = await Nation.findOne({ guildId, name: { $regex: new RegExp(`^${nationName}$`, 'i') } });
  if (!nation) {
    return interaction.reply({ embeds: [errorEmbed(`Nation "${nationName}" not found`)], ephemeral: true });
  }
  
  // Check permissions - only GM or nation owner can view full intelligence status
  const isOwner = nation.owner === interaction.user.id;
  const gm = await isGM(interaction);
  
  if (!isOwner && !gm) {
    return interaction.reply({ embeds: [errorEmbed('You can only view intelligence for nations you own')], ephemeral: true });
  }
  
  if (targetName) {
    // View specific target
    const target = await Nation.findOne({ guildId, name: { $regex: new RegExp(`^${targetName}$`, 'i') } });
    if (!target) {
      return interaction.reply({ embeds: [errorEmbed(`Target nation "${targetName}" not found`)], ephemeral: true });
    }
    
    const intel = await FogOfWar.getIntelligence(guildId, nation._id, target._id);
    const level = intel?.intelligenceLevel ?? 0;
    const levelInfo = INTEL_LEVELS[level];
    
    const embed = createEmbed()
      .setTitle(`Intelligence: ${nation.name} → ${target.name}`)
      .setDescription(`Level ${level}: **${levelInfo.name}**\n${levelInfo.description}`)
      .addFields(
        { name: 'Source', value: SOURCE_INFO[intel?.source ?? 'default'], inline: true },
        { name: 'Expires', value: intel?.expiresAt ? `<t:${Math.floor(intel.expiresAt.getTime() / 1000)}:R>` : 'Never', inline: true }
      );
    
    // Show overrides if any
    if (intel?.visibilityOverrides) {
      const overrides = [];
      for (const [field, value] of Object.entries(intel.visibilityOverrides.toObject ? intel.visibilityOverrides.toObject() : intel.visibilityOverrides)) {
        if (value !== null) {
          overrides.push(`${field}: ${value ? '✅ Visible' : '❌ Hidden'}`);
        }
      }
      if (overrides.length > 0) {
        embed.addFields({ name: 'Overrides', value: overrides.join('\n'), inline: false });
      }
    }
    
    return interaction.reply({ embeds: [embed] });
  } else {
    // View all intelligence for this nation
    const allIntel = await FogOfWar.find({ guildId, observerNation: nation._id }).sort({ intelligenceLevel: -1 });
    
    if (allIntel.length === 0) {
      return interaction.reply({ embeds: [createEmbed()
        .setTitle(`Intelligence: ${nation.name}`)
        .setDescription('No intelligence gathered on any nations.')
      ]});
    }
    
    const intelByLevel = {};
    for (let i = 0; i <= 4; i++) {
      intelByLevel[i] = [];
    }
    
    for (const intel of allIntel) {
      intelByLevel[intel.intelligenceLevel].push(intel.targetNationName);
    }
    
    const embed = createEmbed()
      .setTitle(`Intelligence: ${nation.name}`)
      .setDescription(`Intelligence gathered on ${allIntel.length} nation(s)`);
    
    for (let i = 4; i >= 0; i--) {
      if (intelByLevel[i].length > 0) {
        embed.addFields({
          name: `Level ${i}: ${INTEL_LEVELS[i].name}`,
          value: intelByLevel[i].join(', ') || 'None',
          inline: false
        });
      }
    }
    
    return interaction.reply({ embeds: [embed] });
  }
}

async function handleOverride(interaction) {
  const gmCheck = await requireGM(interaction);
  if (!gmCheck) return;
  
  const guildId = interaction.guildId;
  const observerName = interaction.options.getString('observer');
  const targetName = interaction.options.getString('target');
  const field = interaction.options.getString('field');
  const visibility = interaction.options.getString('visibility');
  
  const observer = await Nation.findOne({ guildId, name: { $regex: new RegExp(`^${observerName}$`, 'i') } });
  const target = await Nation.findOne({ guildId, name: { $regex: new RegExp(`^${targetName}$`, 'i') } });
  
  if (!observer) {
    return interaction.reply({ embeds: [errorEmbed(`Observer nation "${observerName}" not found`)], ephemeral: true });
  }
  if (!target) {
    return interaction.reply({ embeds: [errorEmbed(`Target nation "${targetName}" not found`)], ephemeral: true });
  }
  
  // Determine override value
  let overrideValue = null;
  if (visibility === 'visible') overrideValue = true;
  else if (visibility === 'hidden') overrideValue = false;
  // 'default' leaves it as null
  
  // Update or create FOW record
  const updatePath = `visibilityOverrides.${field}`;
  await FogOfWar.findOneAndUpdate(
    { guildId, observerNation: observer._id, targetNation: target._id },
    {
      $set: {
        [updatePath]: overrideValue,
        observerNationName: observer.name,
        targetNationName: target.name,
        updatedBy: interaction.user.id,
      }
    },
    { upsert: true }
  );
  
  await createAuditLog({
    guildId,
    action: 'fogofwar_override',
    performedBy: interaction.user.id,
    target: `${observer.name} -> ${target.name}`,
    details: { field, visibility },
  });
  
  const visibilityText = visibility === 'visible' ? 'always visible' : visibility === 'hidden' ? 'always hidden' : 'using default level';
  const embed = successEmbed(`Visibility override set`)
    .addFields(
      { name: 'Observer', value: observer.name, inline: true },
      { name: 'Target', value: target.name, inline: true },
      { name: 'Field', value: field, inline: true },
      { name: 'Visibility', value: visibilityText, inline: false }
    );
  
  return interaction.reply({ embeds: [embed] });
}

async function handleReveal(interaction) {
  const gmCheck = await requireGM(interaction);
  if (!gmCheck) return;
  
  const guildId = interaction.guildId;
  const nationName = interaction.options.getString('nation');
  
  const target = await Nation.findOne({ guildId, name: { $regex: new RegExp(`^${nationName}$`, 'i') } });
  if (!target) {
    return interaction.reply({ embeds: [errorEmbed(`Nation "${nationName}" not found`)], ephemeral: true });
  }
  
  // Get all other nations
  const allNations = await Nation.find({ guildId, _id: { $ne: target._id } });
  
  if (allNations.length === 0) {
    return interaction.reply({ embeds: [errorEmbed('No other nations to grant intelligence to')], ephemeral: true });
  }
  
  // Grant level 4 intel to all nations for this target
  const operations = allNations.map(observer => ({
    updateOne: {
      filter: { guildId, observerNation: observer._id, targetNation: target._id },
      update: {
        $set: {
          observerNationName: observer.name,
          targetNationName: target.name,
          intelligenceLevel: 4,
          source: 'gm_granted',
          updatedBy: interaction.user.id,
        }
      },
      upsert: true
    }
  }));
  
  await FogOfWar.bulkWrite(operations);
  
  await createAuditLog({
    guildId,
    action: 'fogofwar_reveal',
    performedBy: interaction.user.id,
    target: target.name,
    details: { affectedNations: allNations.length },
  });
  
  const embed = successEmbed(`Nation revealed`)
    .setDescription(`**${target.name}** is now fully visible to all ${allNations.length} other nation(s).`);
  
  return interaction.reply({ embeds: [embed] });
}

async function handleHide(interaction) {
  const gmCheck = await requireGM(interaction);
  if (!gmCheck) return;
  
  const guildId = interaction.guildId;
  const nationName = interaction.options.getString('nation');
  
  const target = await Nation.findOne({ guildId, name: { $regex: new RegExp(`^${nationName}$`, 'i') } });
  if (!target) {
    return interaction.reply({ embeds: [errorEmbed(`Nation "${nationName}" not found`)], ephemeral: true });
  }
  
  // Remove all intel on this nation
  const result = await FogOfWar.deleteMany({ guildId, targetNation: target._id });
  
  await createAuditLog({
    guildId,
    action: 'fogofwar_hide',
    performedBy: interaction.user.id,
    target: target.name,
    details: { deletedRecords: result.deletedCount },
  });
  
  const embed = successEmbed(`Nation hidden`)
    .setDescription(`All intelligence on **${target.name}** has been removed (${result.deletedCount} records deleted).`);
  
  return interaction.reply({ embeds: [embed] });
}

async function handleMutual(interaction) {
  const gmCheck = await requireGM(interaction);
  if (!gmCheck) return;
  
  const guildId = interaction.guildId;
  const nation1Name = interaction.options.getString('nation1');
  const nation2Name = interaction.options.getString('nation2');
  const level = interaction.options.getInteger('level');
  const source = interaction.options.getString('source') || 'treaty';
  
  const nation1 = await Nation.findOne({ guildId, name: { $regex: new RegExp(`^${nation1Name}$`, 'i') } });
  const nation2 = await Nation.findOne({ guildId, name: { $regex: new RegExp(`^${nation2Name}$`, 'i') } });
  
  if (!nation1) {
    return interaction.reply({ embeds: [errorEmbed(`Nation "${nation1Name}" not found`)], ephemeral: true });
  }
  if (!nation2) {
    return interaction.reply({ embeds: [errorEmbed(`Nation "${nation2Name}" not found`)], ephemeral: true });
  }
  if (nation1._id.equals(nation2._id)) {
    return interaction.reply({ embeds: [errorEmbed('Cannot set mutual intelligence with same nation')], ephemeral: true });
  }
  
  // Create both directions
  await FogOfWar.findOneAndUpdate(
    { guildId, observerNation: nation1._id, targetNation: nation2._id },
    {
      observerNationName: nation1.name,
      targetNationName: nation2.name,
      intelligenceLevel: level,
      source,
      updatedBy: interaction.user.id,
    },
    { upsert: true }
  );
  
  await FogOfWar.findOneAndUpdate(
    { guildId, observerNation: nation2._id, targetNation: nation1._id },
    {
      observerNationName: nation2.name,
      targetNationName: nation1.name,
      intelligenceLevel: level,
      source,
      updatedBy: interaction.user.id,
    },
    { upsert: true }
  );
  
  await createAuditLog({
    guildId,
    action: 'fogofwar_mutual',
    performedBy: interaction.user.id,
    target: `${nation1.name} <-> ${nation2.name}`,
    details: { level, source },
  });
  
  const levelInfo = INTEL_LEVELS[level];
  const embed = successEmbed(`Mutual intelligence established`)
    .addFields(
      { name: 'Nations', value: `${nation1.name} ↔ ${nation2.name}`, inline: false },
      { name: 'Level', value: `${level} - ${levelInfo.name}`, inline: true },
      { name: 'Source', value: SOURCE_INFO[source], inline: true }
    );
  
  return interaction.reply({ embeds: [embed] });
}

async function handleSpy(interaction) {
  const guildId = interaction.guildId;
  const viewerName = interaction.options.getString('viewer');
  const targetName = interaction.options.getString('target');
  
  const viewer = await Nation.findOne({ guildId, name: { $regex: new RegExp(`^${viewerName}$`, 'i') } });
  const target = await Nation.findOne({ guildId, name: { $regex: new RegExp(`^${targetName}$`, 'i') } });
  
  if (!viewer) {
    return interaction.reply({ embeds: [errorEmbed(`Viewer nation "${viewerName}" not found`)], ephemeral: true });
  }
  if (!target) {
    return interaction.reply({ embeds: [errorEmbed(`Target nation "${targetName}" not found`)], ephemeral: true });
  }
  
  // Check permissions - viewer must be owned by user or user is GM
  const isOwner = viewer.owner === interaction.user.id;
  const gm = await isGM(interaction);
  
  if (!isOwner && !gm) {
    return interaction.reply({ embeds: [errorEmbed('You can only use nations you own as viewers')], ephemeral: true });
  }
  
  // Get filtered data
  const filteredData = await FogOfWar.filterNationData(guildId, viewer._id, target);
  const intel = await FogOfWar.getIntelligence(guildId, viewer._id, target._id);
  const level = intel?.intelligenceLevel ?? 0;
  const levelInfo = INTEL_LEVELS[level];
  
  const embed = createEmbed()
    .setTitle(`Intelligence Report: ${target.name}`)
    .setDescription(`Viewed by: **${viewer.name}**\nIntelligence Level: **${level} (${levelInfo.name})**`)
    .setThumbnail(filteredData.flag || null);
  
  // Basic info (always visible)
  embed.addFields(
    { name: 'Leader', value: filteredData.leader || 'Unknown', inline: true },
    { name: 'Population', value: filteredData.population?.toString() || 'Unknown', inline: true }
  );
  
  // Stability
  if (filteredData.stability !== undefined) {
    const stabDisplay = typeof filteredData.stability === 'number' ? `${filteredData.stability}%` : filteredData.stability;
    embed.addFields({ name: 'Stability', value: stabDisplay, inline: true });
  }
  
  // Economy
  if (filteredData.economy) {
    if (filteredData.economy.gdp !== undefined) {
      embed.addFields({ name: 'GDP', value: `$${filteredData.economy.gdp.toLocaleString()}`, inline: true });
    } else if (filteredData.economy.gdpEstimate) {
      embed.addFields({ name: 'Economy', value: filteredData.economy.gdpEstimate, inline: true });
    }
  }
  
  // Military
  if (filteredData.military) {
    if (filteredData.military.army) {
      // Detailed military
      const armyParts = [];
      if (filteredData.military.army.troops) armyParts.push(`Troops: ${filteredData.military.army.troops.toLocaleString()}`);
      if (filteredData.military.army.tanks) armyParts.push(`Tanks: ${filteredData.military.army.tanks.toLocaleString()}`);
      if (armyParts.length > 0) {
        embed.addFields({ name: 'Army', value: armyParts.join('\n'), inline: true });
      }
    } else if (filteredData.military.armyStrength) {
      // Approximate military
      embed.addFields({
        name: 'Military Estimate',
        value: `Army: ${filteredData.military.armyStrength}\nNavy: ${filteredData.military.navalStrength}\nAir: ${filteredData.military.airStrength}`,
        inline: true
      });
    }
  }
  
  // Resources
  if (filteredData.resources) {
    if (Array.isArray(filteredData.resources)) {
      // Just resource types
      embed.addFields({ name: 'Known Resources', value: filteredData.resources.length > 0 ? filteredData.resources.join(', ') : 'None detected', inline: false });
    } else if (filteredData.resources.size > 0 || Object.keys(filteredData.resources).length > 0) {
      // Detailed resources
      const resourceMap = filteredData.resources instanceof Map ? filteredData.resources : new Map(Object.entries(filteredData.resources));
      const resourceList = [];
      for (const [key, value] of resourceMap) {
        resourceList.push(`${key}: ${value.toLocaleString()}`);
      }
      if (resourceList.length > 0) {
        embed.addFields({ name: 'Resources', value: resourceList.slice(0, 10).join('\n'), inline: false });
      }
    }
  }
  
  // Nukes
  if (filteredData.nukes !== undefined) {
    embed.addFields({ name: 'Nuclear Arsenal', value: filteredData.nukes.toString(), inline: true });
  }
  
  // Spirits
  if (filteredData.spirits && filteredData.spirits.length > 0) {
    const spiritNames = filteredData.spirits.map(s => s.name).join(', ');
    embed.addFields({ name: 'National Spirits', value: spiritNames, inline: false });
  }
  
  // Production (level 4 only)
  if (filteredData.productionQueue && filteredData.productionQueue.length > 0) {
    const queueDisplay = filteredData.productionQueue.slice(0, 5).map(p => 
      `${p.quantity}x ${p.unitType} (${p.turnsRemaining} turns)`
    ).join('\n');
    embed.addFields({ name: 'Production Queue', value: queueDisplay, inline: false });
  }
  
  // Research (level 4 only)
  if (filteredData.research?.current) {
    embed.addFields({ 
      name: 'Current Research', 
      value: `${filteredData.research.current} (${filteredData.research.turnsRemaining} turns)`, 
      inline: true 
    });
  }
  
  return interaction.reply({ embeds: [embed] });
}

async function handleLevels(interaction) {
  const embed = createEmbed()
    .setTitle('Intelligence Levels')
    .setDescription('Information visibility is based on intelligence level:');
  
  for (let i = 0; i <= 4; i++) {
    const info = INTEL_LEVELS[i];
    embed.addFields({
      name: `Level ${i}: ${info.name}`,
      value: info.description,
      inline: false
    });
  }
  
  embed.addFields({
    name: 'How to gain intelligence',
    value: '• **Espionage** - Send spies to gather information\n• **Treaties** - Diplomatic agreements can include intelligence sharing\n• **Alliances** - Allied nations typically share intelligence\n• **Trade** - Regular trade can provide economic insights\n• **Border Contact** - Neighboring nations learn about each other',
    inline: false
  });
  
  return interaction.reply({ embeds: [embed] });
}

export async function autocomplete(interaction) {
  const focusedOption = interaction.options.getFocused(true);
  const guildId = interaction.guildId;
  
  if (['nation', 'observer', 'target', 'viewer', 'nation1', 'nation2'].includes(focusedOption.name)) {
    const nations = await Nation.find({ 
      guildId,
      name: { $regex: focusedOption.value, $options: 'i' }
    }).limit(25).select('name');
    
    return interaction.respond(
      nations.map(n => ({ name: n.name, value: n.name }))
    );
  }
}
