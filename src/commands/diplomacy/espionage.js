import { SlashCommandBuilder } from 'discord.js';
import Nation from '../../database/models/Nation.js';
import EspionageOperation from '../../database/models/EspionageOperation.js';
import FogOfWar from '../../database/models/FogOfWar.js';
import { createAuditLog } from '../../database/models/AuditLog.js';
import { createHistoryEntry } from '../../database/models/HistoryEntry.js';
import { isGM, requireGM, canModifyNation } from '../../utils/permissions.js';
import { createEmbed, errorEmbed, successEmbed } from '../../utils/embeds.js';
import { formatNumber } from '../../utils/formatters.js';
import config from '../../config.js';

const OPERATION_TYPES = {
  reconnaissance: { name: 'Reconnaissance', emoji: '🔍', difficulty: 30, detectionRisk: 20, description: 'Gather general intelligence' },
  infiltration: { name: 'Infiltration', emoji: '🕵️', difficulty: 50, detectionRisk: 35, description: 'Plant long-term agents' },
  sabotage: { name: 'Sabotage', emoji: '💥', difficulty: 60, detectionRisk: 50, description: 'Damage infrastructure or military' },
  assassination: { name: 'Assassination', emoji: '🎯', difficulty: 80, detectionRisk: 70, description: 'Target key individuals' },
  theft: { name: 'Theft', emoji: '💰', difficulty: 55, detectionRisk: 45, description: 'Steal resources or technology' },
  counterintelligence: { name: 'Counterintelligence', emoji: '🛡️', difficulty: 40, detectionRisk: 10, description: 'Find and neutralize enemy spies' },
  propaganda: { name: 'Propaganda', emoji: '📢', difficulty: 35, detectionRisk: 25, description: 'Influence public opinion' },
  cyber: { name: 'Cyber Operations', emoji: '💻', difficulty: 45, detectionRisk: 30, description: 'Digital warfare and hacking' },
};

export const data = new SlashCommandBuilder()
  .setName('espionage')
  .setDescription('Conduct espionage operations')
  .addSubcommand(sub =>
    sub.setName('launch')
      .setDescription('Launch an espionage operation')
      .addStringOption(opt =>
        opt.setName('nation')
          .setDescription('Your nation')
          .setRequired(true)
          .setAutocomplete(true))
      .addStringOption(opt =>
        opt.setName('target')
          .setDescription('Target nation')
          .setRequired(true)
          .setAutocomplete(true))
      .addStringOption(opt =>
        opt.setName('type')
          .setDescription('Operation type')
          .setRequired(true)
          .addChoices(
            { name: 'Reconnaissance', value: 'reconnaissance' },
            { name: 'Infiltration', value: 'infiltration' },
            { name: 'Sabotage', value: 'sabotage' },
            { name: 'Assassination', value: 'assassination' },
            { name: 'Theft', value: 'theft' },
            { name: 'Counterintelligence', value: 'counterintelligence' },
            { name: 'Propaganda', value: 'propaganda' },
            { name: 'Cyber Operations', value: 'cyber' }
          ))
      .addIntegerOption(opt =>
        opt.setName('agents')
          .setDescription('Number of agents to commit (more = better chance)')
          .setRequired(false)
          .setMinValue(1)
          .setMaxValue(10))
      .addIntegerOption(opt =>
        opt.setName('funding')
          .setDescription('Funding to provide')
          .setRequired(false)
          .setMinValue(0)))
  .addSubcommand(sub =>
    sub.setName('view')
      .setDescription('View your active operations')
      .addStringOption(opt =>
        opt.setName('nation')
          .setDescription('Your nation')
          .setRequired(true)
          .setAutocomplete(true)))
  .addSubcommand(sub =>
    sub.setName('abort')
      .setDescription('Abort an operation')
      .addStringOption(opt =>
        opt.setName('operation_id')
          .setDescription('Operation ID')
          .setRequired(true)))
  .addSubcommand(sub =>
    sub.setName('resolve')
      .setDescription('Resolve an operation (GM only)')
      .addStringOption(opt =>
        opt.setName('operation_id')
          .setDescription('Operation ID')
          .setRequired(true))
      .addBooleanOption(opt =>
        opt.setName('success')
          .setDescription('Did operation succeed?')
          .setRequired(true))
      .addBooleanOption(opt =>
        opt.setName('detected')
          .setDescription('Was operation detected?')
          .setRequired(false))
      .addStringOption(opt =>
        opt.setName('result')
          .setDescription('Result description')
          .setRequired(false)))
  .addSubcommand(sub =>
    sub.setName('history')
      .setDescription('View espionage history')
      .addStringOption(opt =>
        opt.setName('nation')
          .setDescription('Nation to view history for')
          .setRequired(true)
          .setAutocomplete(true)));

export async function execute(interaction) {
  const subcommand = interaction.options.getSubcommand();
  
  switch (subcommand) {
    case 'launch':
      return handleLaunch(interaction);
    case 'view':
      return handleView(interaction);
    case 'abort':
      return handleAbort(interaction);
    case 'resolve':
      return handleResolve(interaction);
    case 'history':
      return handleHistory(interaction);
    default:
      return interaction.reply({ embeds: [errorEmbed('Unknown subcommand')], ephemeral: true });
  }
}

async function handleLaunch(interaction) {
  const guildId = interaction.guildId;
  const nationName = interaction.options.getString('nation');
  const targetName = interaction.options.getString('target');
  const type = interaction.options.getString('type');
  const agents = interaction.options.getInteger('agents') || 1;
  const funding = interaction.options.getInteger('funding') || 0;
  
  const nation = await Nation.findOne({ guildId, name: { $regex: new RegExp(`^${nationName}$`, 'i') } });
  const target = await Nation.findOne({ guildId, name: { $regex: new RegExp(`^${targetName}$`, 'i') } });
  
  if (!nation) {
    return interaction.reply({ embeds: [errorEmbed(`Nation "${nationName}" not found`)], ephemeral: true });
  }
  if (!target) {
    return interaction.reply({ embeds: [errorEmbed(`Target nation "${targetName}" not found`)], ephemeral: true });
  }
  if (nation._id.equals(target._id)) {
    return interaction.reply({ embeds: [errorEmbed('Cannot conduct espionage on yourself')], ephemeral: true });
  }
  
  // Check permissions (counterintelligence is the only type that targets self)
  if (type !== 'counterintelligence') {
    const canModify = await canModifyNation(interaction.member, nation);
    if (!canModify) {
      return interaction.reply({ embeds: [errorEmbed('You can only launch operations from nations you own')], ephemeral: true });
    }
  }
  
  const typeInfo = OPERATION_TYPES[type];
  
  // Calculate success chance
  // Base: 50% - difficulty + (agents * 5) + (funding/10000)
  let successChance = 50 - typeInfo.difficulty + (agents * 5) + Math.min(funding / 10000, 20);
  
  // Modifier based on target stability (lower stability = easier to infiltrate)
  const stabilityMod = (50 - target.stability) / 5;
  successChance += stabilityMod;
  
  // Clamp between 5 and 95
  successChance = Math.max(5, Math.min(95, Math.round(successChance)));
  
  // Calculate detection risk
  let detectionRisk = typeInfo.detectionRisk - (agents * 2); // More agents = more risk actually
  detectionRisk = Math.max(5, Math.min(90, Math.round(detectionRisk + agents * 3)));
  
  // Check for funding
  if (funding > 0) {
    const primaryCurrency = nation.economy?.primaryCurrency || 'Dollars';
    const current = nation.economy.currencies?.get(primaryCurrency) || 0;
    if (current < funding) {
      return interaction.reply({ 
        embeds: [errorEmbed(`Insufficient funds. Have: ${formatNumber(current)}, need: ${formatNumber(funding)}`)], 
        ephemeral: true 
      });
    }
    
    // Deduct funding
    nation.economy.currencies.set(primaryCurrency, current - funding);
    await nation.save();
  }
  
  // Create operation
  const operation = await EspionageOperation.create({
    guildId,
    operator: nation._id,
    operatorName: nation.name,
    target: target._id,
    targetName: target.name,
    type,
    status: 'active',
    difficulty: typeInfo.difficulty,
    successChance,
    detectionRisk,
    resources: {
      agents,
      funding,
      currency: nation.economy?.primaryCurrency || 'Dollars',
    },
    turnsRequired: 1,
    turnsRemaining: 1,
    createdBy: interaction.user.id,
  });
  
  await createAuditLog({
    guildId,
    action: 'espionage_launch',
    performedBy: interaction.user.id,
    target: `${nation.name} -> ${target.name}`,
    details: { operationId: operation._id.toString(), type, agents, funding },
  });
  
  const embed = successEmbed(`${typeInfo.emoji} Operation Launched`)
    .setDescription(`**${typeInfo.name}** operation against **${target.name}**`)
    .addFields(
      { name: 'Type', value: typeInfo.name, inline: true },
      { name: 'Target', value: target.name, inline: true },
      { name: 'Agents', value: agents.toString(), inline: true },
      { name: 'Success Chance', value: `${successChance}%`, inline: true },
      { name: 'Detection Risk', value: `${detectionRisk}%`, inline: true },
      { name: 'Funding', value: funding > 0 ? formatNumber(funding) : 'None', inline: true },
      { name: 'Operation ID', value: `\`${operation._id}\``, inline: false }
    )
    .setFooter({ text: 'GM will resolve this operation' });
  
  return interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleView(interaction) {
  const guildId = interaction.guildId;
  const nationName = interaction.options.getString('nation');
  
  const nation = await Nation.findOne({ guildId, name: { $regex: new RegExp(`^${nationName}$`, 'i') } });
  if (!nation) {
    return interaction.reply({ embeds: [errorEmbed(`Nation "${nationName}" not found`)], ephemeral: true });
  }
  
  const canModify = await canModifyNation(interaction.member, nation);
  if (!canModify) {
    return interaction.reply({ embeds: [errorEmbed('You can only view operations for nations you own')], ephemeral: true });
  }
  
  const operations = await EspionageOperation.find({
    guildId,
    operator: nation._id,
    status: { $in: ['planning', 'active'] }
  }).sort({ createdAt: -1 });
  
  if (operations.length === 0) {
    return interaction.reply({ 
      embeds: [createEmbed()
        .setTitle(`Active Operations: ${nation.name}`)
        .setDescription('No active espionage operations.')
      ],
      ephemeral: true 
    });
  }
  
  const embed = createEmbed()
    .setTitle(`Active Operations: ${nation.name}`)
    .setDescription(`${operations.length} active operation(s)`);
  
  for (const op of operations) {
    const typeInfo = OPERATION_TYPES[op.type];
    embed.addFields({
      name: `${typeInfo.emoji} ${typeInfo.name} vs ${op.targetName}`,
      value: `Status: ${op.status} | Success: ${op.successChance}% | Detection: ${op.detectionRisk}%\nAgents: ${op.resources.agents} | ID: \`${op._id}\``,
      inline: false
    });
  }
  
  return interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleAbort(interaction) {
  const guildId = interaction.guildId;
  const operationId = interaction.options.getString('operation_id');
  
  const operation = await EspionageOperation.findById(operationId);
  if (!operation || operation.guildId !== guildId) {
    return interaction.reply({ embeds: [errorEmbed('Operation not found')], ephemeral: true });
  }
  
  // Check ownership
  const nation = await Nation.findById(operation.operator);
  if (nation) {
    const canModify = await canModifyNation(interaction.member, nation);
    if (!canModify) {
      return interaction.reply({ embeds: [errorEmbed('You can only abort your own operations')], ephemeral: true });
    }
  }
  
  if (operation.status !== 'planning' && operation.status !== 'active') {
    return interaction.reply({ embeds: [errorEmbed(`Cannot abort operation in ${operation.status} status`)], ephemeral: true });
  }
  
  operation.status = 'aborted';
  await operation.save();
  
  return interaction.reply({ embeds: [successEmbed('Operation aborted')], ephemeral: true });
}

async function handleResolve(interaction) {
  const gmCheck = await requireGM(interaction);
  if (!gmCheck) return;
  
  const guildId = interaction.guildId;
  const operationId = interaction.options.getString('operation_id');
  const success = interaction.options.getBoolean('success');
  const detected = interaction.options.getBoolean('detected') ?? false;
  const resultNotes = interaction.options.getString('result') || '';
  
  const operation = await EspionageOperation.findById(operationId);
  if (!operation || operation.guildId !== guildId) {
    return interaction.reply({ embeds: [errorEmbed('Operation not found')], ephemeral: true });
  }
  
  if (operation.status !== 'active') {
    return interaction.reply({ embeds: [errorEmbed(`Cannot resolve operation in ${operation.status} status`)], ephemeral: true });
  }
  
  // Update operation
  operation.status = success ? 'completed' : 'failed';
  operation.result.success = success;
  operation.result.detected = detected;
  operation.result.notes = resultNotes;
  operation.completedAt = new Date();
  
  // If reconnaissance succeeded, increase intel level
  if (success && operation.type === 'reconnaissance') {
    const currentIntel = await FogOfWar.getIntelligence(guildId, operation.operator, operation.target);
    const currentLevel = currentIntel?.intelligenceLevel ?? 0;
    
    if (currentLevel < 4) {
      await FogOfWar.findOneAndUpdate(
        { guildId, observerNation: operation.operator, targetNation: operation.target },
        {
          observerNationName: operation.operatorName,
          targetNationName: operation.targetName,
          intelligenceLevel: Math.min(currentLevel + 1, 4),
          source: 'espionage',
          updatedBy: interaction.user.id,
        },
        { upsert: true }
      );
      operation.result.intelGained = 1;
    }
  }
  
  await operation.save();
  
  // Create history entries
  await createHistoryEntry({
    guildId,
    nation: operation.operator,
    nationName: operation.operatorName,
    type: 'espionage',
    title: `${OPERATION_TYPES[operation.type].name} ${success ? 'Succeeded' : 'Failed'}`,
    description: `Operation against ${operation.targetName}${detected ? ' (DETECTED)' : ''}`,
    details: { success, detected },
    performedBy: interaction.user.id,
  });
  
  if (detected) {
    await createHistoryEntry({
      guildId,
      nation: operation.target,
      nationName: operation.targetName,
      type: 'espionage',
      title: 'Enemy Espionage Detected',
      description: `${operation.operatorName} attempted ${OPERATION_TYPES[operation.type].name}`,
      details: { operatorName: operation.operatorName, type: operation.type, success },
      performedBy: interaction.user.id,
    });
  }
  
  const typeInfo = OPERATION_TYPES[operation.type];
  const embed = createEmbed()
    .setTitle(`${typeInfo.emoji} Operation Resolved`)
    .setDescription(`**${operation.operatorName}** vs **${operation.targetName}**`)
    .addFields(
      { name: 'Type', value: typeInfo.name, inline: true },
      { name: 'Result', value: success ? '✅ Success' : '❌ Failed', inline: true },
      { name: 'Detected', value: detected ? '⚠️ Yes' : '✅ No', inline: true }
    )
    .setColor(success ? 0x2ecc71 : 0xe74c3c);
  
  if (resultNotes) {
    embed.addFields({ name: 'Notes', value: resultNotes, inline: false });
  }
  
  if (operation.result.intelGained) {
    embed.addFields({ name: 'Intel Gained', value: `+${operation.result.intelGained} level`, inline: true });
  }
  
  return interaction.reply({ embeds: [embed] });
}

async function handleHistory(interaction) {
  const guildId = interaction.guildId;
  const nationName = interaction.options.getString('nation');
  
  const nation = await Nation.findOne({ guildId, name: { $regex: new RegExp(`^${nationName}$`, 'i') } });
  if (!nation) {
    return interaction.reply({ embeds: [errorEmbed(`Nation "${nationName}" not found`)], ephemeral: true });
  }
  
  const canModify = await canModifyNation(interaction.member, nation);
  const gm = await isGM(interaction);
  
  if (!canModify && !gm) {
    return interaction.reply({ embeds: [errorEmbed('You can only view history for nations you own')], ephemeral: true });
  }
  
  const operations = await EspionageOperation.find({
    guildId,
    $or: [{ operator: nation._id }, { target: nation._id, 'result.detected': true }]
  }).sort({ createdAt: -1 }).limit(15);
  
  if (operations.length === 0) {
    return interaction.reply({ 
      embeds: [createEmbed()
        .setTitle(`Espionage History: ${nation.name}`)
        .setDescription('No espionage history.')
      ],
      ephemeral: true 
    });
  }
  
  const embed = createEmbed()
    .setTitle(`Espionage History: ${nation.name}`)
    .setDescription(`${operations.length} operation(s)`);
  
  for (const op of operations) {
    const typeInfo = OPERATION_TYPES[op.type];
    const isOperator = op.operator.equals(nation._id);
    const role = isOperator ? 'Conducted' : 'Targeted by';
    const other = isOperator ? op.targetName : op.operatorName;
    
    const statusEmoji = op.result.success === true ? '✅' : op.result.success === false ? '❌' : '⏳';
    const detectedText = op.result.detected ? ' (DETECTED)' : '';
    
    embed.addFields({
      name: `${typeInfo.emoji} ${role} ${other}`,
      value: `${statusEmoji} ${op.status}${detectedText}\n<t:${Math.floor(op.createdAt.getTime() / 1000)}:R>`,
      inline: true
    });
  }
  
  return interaction.reply({ embeds: [embed], ephemeral: true });
}

export async function autocomplete(interaction) {
  const focusedOption = interaction.options.getFocused(true);
  const guildId = interaction.guildId;
  
  if (['nation', 'target'].includes(focusedOption.name)) {
    const nations = await Nation.find({ 
      guildId,
      name: { $regex: focusedOption.value, $options: 'i' }
    }).limit(25).select('name');
    
    return interaction.respond(
      nations.map(n => ({ name: n.name, value: n.name }))
    );
  }
}
