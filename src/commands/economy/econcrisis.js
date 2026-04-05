import { SlashCommandBuilder } from 'discord.js';
import Nation from '../../database/models/Nation.js';
import { EconomicCrisis } from '../../database/models/Economy.js';
import { createAuditLog } from '../../database/models/AuditLog.js';
import { createHistoryEntry } from '../../database/models/HistoryEntry.js';
import { isGM, requireGM } from '../../utils/permissions.js';
import { createEmbed, errorEmbed, successEmbed } from '../../utils/embeds.js';
import config from '../../config.js';

const CRISIS_TYPES = {
  recession: { name: 'Recession', emoji: '📉', defaultEffects: { gdpModifier: -10, incomeModifier: -15, stabilityModifier: -5 } },
  depression: { name: 'Depression', emoji: '💀', defaultEffects: { gdpModifier: -25, incomeModifier: -30, stabilityModifier: -15 } },
  hyperinflation: { name: 'Hyperinflation', emoji: '💸', defaultEffects: { inflationChange: 50, incomeModifier: -20, stabilityModifier: -10 } },
  currency_crash: { name: 'Currency Crash', emoji: '💱', defaultEffects: { gdpModifier: -15, tradeModifier: -30, stabilityModifier: -10 } },
  bank_run: { name: 'Bank Run', emoji: '🏦', defaultEffects: { gdpModifier: -5, incomeModifier: -25, stabilityModifier: -15 } },
  debt_crisis: { name: 'Debt Crisis', emoji: '📜', defaultEffects: { incomeModifier: -20, stabilityModifier: -10, tradeModifier: -15 } },
  trade_war: { name: 'Trade War', emoji: '⚔️', defaultEffects: { tradeModifier: -40, gdpModifier: -10, incomeModifier: -10 } },
  oil_shock: { name: 'Oil Shock', emoji: '🛢️', defaultEffects: { gdpModifier: -15, incomeModifier: -20, inflationChange: 10 } },
  market_crash: { name: 'Market Crash', emoji: '📊', defaultEffects: { gdpModifier: -20, incomeModifier: -15, stabilityModifier: -10 } },
  custom: { name: 'Custom', emoji: '⚠️', defaultEffects: {} },
};

const SEVERITY_MULTIPLIERS = {
  minor: 0.5,
  moderate: 1.0,
  major: 1.5,
  catastrophic: 2.0,
};

export const data = new SlashCommandBuilder()
  .setName('crisis')
  .setDescription('Manage economic crises (GM only)')
  .addSubcommand(sub =>
    sub.setName('start')
      .setDescription('Start an economic crisis')
      .addStringOption(opt =>
        opt.setName('name')
          .setDescription('Crisis name')
          .setRequired(true))
      .addStringOption(opt =>
        opt.setName('type')
          .setDescription('Crisis type')
          .setRequired(true)
          .addChoices(
            { name: 'Recession', value: 'recession' },
            { name: 'Depression', value: 'depression' },
            { name: 'Hyperinflation', value: 'hyperinflation' },
            { name: 'Currency Crash', value: 'currency_crash' },
            { name: 'Bank Run', value: 'bank_run' },
            { name: 'Debt Crisis', value: 'debt_crisis' },
            { name: 'Trade War', value: 'trade_war' },
            { name: 'Oil Shock', value: 'oil_shock' },
            { name: 'Market Crash', value: 'market_crash' },
            { name: 'Custom', value: 'custom' }
          ))
      .addStringOption(opt =>
        opt.setName('severity')
          .setDescription('Crisis severity')
          .setRequired(true)
          .addChoices(
            { name: 'Minor', value: 'minor' },
            { name: 'Moderate', value: 'moderate' },
            { name: 'Major', value: 'major' },
            { name: 'Catastrophic', value: 'catastrophic' }
          ))
      .addStringOption(opt =>
        opt.setName('scope')
          .setDescription('Crisis scope')
          .setRequired(true)
          .addChoices(
            { name: 'National (specific nations)', value: 'national' },
            { name: 'Regional (some nations)', value: 'regional' },
            { name: 'Global (all nations)', value: 'global' }
          ))
      .addStringOption(opt =>
        opt.setName('nations')
          .setDescription('Affected nations (comma-separated, or "all" for global)')
          .setRequired(false))
      .addIntegerOption(opt =>
        opt.setName('duration')
          .setDescription('Duration in turns')
          .setRequired(false)
          .setMinValue(1)
          .setMaxValue(50))
      .addStringOption(opt =>
        opt.setName('description')
          .setDescription('Crisis description')
          .setRequired(false)))
  .addSubcommand(sub =>
    sub.setName('view')
      .setDescription('View active crises'))
  .addSubcommand(sub =>
    sub.setName('details')
      .setDescription('View crisis details')
      .addStringOption(opt =>
        opt.setName('crisis_id')
          .setDescription('Crisis ID')
          .setRequired(true)))
  .addSubcommand(sub =>
    sub.setName('resolve')
      .setDescription('Resolve/end a crisis')
      .addStringOption(opt =>
        opt.setName('crisis_id')
          .setDescription('Crisis ID')
          .setRequired(true)))
  .addSubcommand(sub =>
    sub.setName('modify')
      .setDescription('Modify crisis effects')
      .addStringOption(opt =>
        opt.setName('crisis_id')
          .setDescription('Crisis ID')
          .setRequired(true))
      .addIntegerOption(opt =>
        opt.setName('gdp')
          .setDescription('GDP modifier (%)')
          .setRequired(false))
      .addIntegerOption(opt =>
        opt.setName('income')
          .setDescription('Income modifier (%)')
          .setRequired(false))
      .addIntegerOption(opt =>
        opt.setName('inflation')
          .setDescription('Inflation change')
          .setRequired(false))
      .addIntegerOption(opt =>
        opt.setName('stability')
          .setDescription('Stability modifier (%)')
          .setRequired(false))
      .addIntegerOption(opt =>
        opt.setName('trade')
          .setDescription('Trade modifier (%)')
          .setRequired(false)))
  .addSubcommand(sub =>
    sub.setName('history')
      .setDescription('View past crises'));

export async function execute(interaction) {
  const gmCheck = await requireGM(interaction);
  if (!gmCheck) return;
  
  const subcommand = interaction.options.getSubcommand();
  
  switch (subcommand) {
    case 'start':
      return handleStart(interaction);
    case 'view':
      return handleView(interaction);
    case 'details':
      return handleDetails(interaction);
    case 'resolve':
      return handleResolve(interaction);
    case 'modify':
      return handleModify(interaction);
    case 'history':
      return handleHistory(interaction);
    default:
      return interaction.reply({ embeds: [errorEmbed('Unknown subcommand')], ephemeral: true });
  }
}

async function handleStart(interaction) {
  const guildId = interaction.guildId;
  const name = interaction.options.getString('name');
  const type = interaction.options.getString('type');
  const severity = interaction.options.getString('severity');
  const scope = interaction.options.getString('scope');
  const nationsInput = interaction.options.getString('nations');
  const duration = interaction.options.getInteger('duration') || 5;
  const description = interaction.options.getString('description') || '';
  
  // Get affected nations
  const affectedNations = [];
  
  if (scope === 'global' || nationsInput?.toLowerCase() === 'all') {
    const allNations = await Nation.find({ guildId });
    for (const nation of allNations) {
      affectedNations.push({
        nation: nation._id,
        nationName: nation.name,
        impact: 100
      });
    }
  } else if (nationsInput) {
    const nationNames = nationsInput.split(',').map(n => n.trim()).filter(n => n);
    for (const nationName of nationNames) {
      const nation = await Nation.findOne({ guildId, name: { $regex: new RegExp(`^${nationName}$`, 'i') } });
      if (nation) {
        affectedNations.push({
          nation: nation._id,
          nationName: nation.name,
          impact: 100
        });
      }
    }
  }
  
  if (scope !== 'global' && affectedNations.length === 0) {
    return interaction.reply({ embeds: [errorEmbed('No valid nations specified')], ephemeral: true });
  }
  
  // Calculate effects based on type and severity
  const typeInfo = CRISIS_TYPES[type];
  const multiplier = SEVERITY_MULTIPLIERS[severity];
  
  const effects = {
    gdpModifier: Math.round((typeInfo.defaultEffects.gdpModifier || 0) * multiplier),
    incomeModifier: Math.round((typeInfo.defaultEffects.incomeModifier || 0) * multiplier),
    inflationChange: Math.round((typeInfo.defaultEffects.inflationChange || 0) * multiplier),
    stabilityModifier: Math.round((typeInfo.defaultEffects.stabilityModifier || 0) * multiplier),
    tradeModifier: Math.round((typeInfo.defaultEffects.tradeModifier || 0) * multiplier),
    customEffects: [],
  };
  
  // Create crisis
  const crisis = await EconomicCrisis.create({
    guildId,
    name,
    description,
    type,
    severity,
    scope,
    affectedNations,
    effects,
    duration,
    turnsRemaining: duration,
    status: 'active',
    createdBy: interaction.user.id,
  });
  
  // Log history for affected nations
  for (const affected of affectedNations) {
    await createHistoryEntry({
      guildId,
      nation: affected.nation,
      nationName: affected.nationName,
      type: 'economic',
      title: 'Economic Crisis',
      description: `${typeInfo.emoji} ${name} - ${severity} ${typeInfo.name}`,
      performedBy: interaction.user.id,
    });
  }
  
  await createAuditLog({
    guildId,
    action: 'crisis_start',
    performedBy: interaction.user.id,
    target: name,
    details: { crisisId: crisis._id.toString(), type, severity, scope, affectedCount: affectedNations.length },
  });
  
  const embed = successEmbed(`${typeInfo.emoji} Crisis Started: ${name}`)
    .setDescription(description || typeInfo.name)
    .addFields(
      { name: 'Type', value: typeInfo.name, inline: true },
      { name: 'Severity', value: severity.charAt(0).toUpperCase() + severity.slice(1), inline: true },
      { name: 'Scope', value: scope.charAt(0).toUpperCase() + scope.slice(1), inline: true },
      { name: 'Duration', value: `${duration} turns`, inline: true },
      { name: 'Affected Nations', value: affectedNations.length.toString(), inline: true }
    );
  
  // Add effects
  const effectsList = [];
  if (effects.gdpModifier) effectsList.push(`GDP: ${effects.gdpModifier > 0 ? '+' : ''}${effects.gdpModifier}%`);
  if (effects.incomeModifier) effectsList.push(`Income: ${effects.incomeModifier > 0 ? '+' : ''}${effects.incomeModifier}%`);
  if (effects.inflationChange) effectsList.push(`Inflation: ${effects.inflationChange > 0 ? '+' : ''}${effects.inflationChange}`);
  if (effects.stabilityModifier) effectsList.push(`Stability: ${effects.stabilityModifier > 0 ? '+' : ''}${effects.stabilityModifier}%`);
  if (effects.tradeModifier) effectsList.push(`Trade: ${effects.tradeModifier > 0 ? '+' : ''}${effects.tradeModifier}%`);
  
  if (effectsList.length > 0) {
    embed.addFields({ name: 'Effects', value: effectsList.join('\n'), inline: false });
  }
  
  embed.addFields({ name: 'Crisis ID', value: `\`${crisis._id}\``, inline: false });
  
  return interaction.reply({ embeds: [embed] });
}

async function handleView(interaction) {
  const guildId = interaction.guildId;
  
  const crises = await EconomicCrisis.find({ 
    guildId, 
    status: { $in: ['building', 'active', 'recovering'] } 
  }).sort({ createdAt: -1 });
  
  if (crises.length === 0) {
    return interaction.reply({ 
      embeds: [createEmbed()
        .setTitle('Economic Crises')
        .setDescription('No active economic crises.')
        .setColor(0x2ecc71)
      ] 
    });
  }
  
  const embed = createEmbed()
    .setTitle('Active Economic Crises')
    .setDescription(`${crises.length} crisis(es) currently active`)
    .setColor(0xe74c3c);
  
  for (const crisis of crises.slice(0, 10)) {
    const typeInfo = CRISIS_TYPES[crisis.type];
    const statusEmoji = crisis.status === 'recovering' ? '📈' : '🔴';
    
    embed.addFields({
      name: `${typeInfo.emoji} ${crisis.name}`,
      value: `${statusEmoji} ${crisis.status.charAt(0).toUpperCase() + crisis.status.slice(1)} | ${crisis.severity}\n${crisis.turnsRemaining} turns remaining | ${crisis.affectedNations.length} nations\nID: \`${crisis._id}\``,
      inline: true
    });
  }
  
  return interaction.reply({ embeds: [embed] });
}

async function handleDetails(interaction) {
  const guildId = interaction.guildId;
  const crisisId = interaction.options.getString('crisis_id');
  
  const crisis = await EconomicCrisis.findById(crisisId);
  if (!crisis || crisis.guildId !== guildId) {
    return interaction.reply({ embeds: [errorEmbed('Crisis not found')], ephemeral: true });
  }
  
  const typeInfo = CRISIS_TYPES[crisis.type];
  
  const embed = createEmbed()
    .setTitle(`${typeInfo.emoji} ${crisis.name}`)
    .setDescription(crisis.description || 'No description')
    .setColor(crisis.status === 'resolved' ? 0x2ecc71 : 0xe74c3c);
  
  embed.addFields(
    { name: 'Type', value: typeInfo.name, inline: true },
    { name: 'Severity', value: crisis.severity.charAt(0).toUpperCase() + crisis.severity.slice(1), inline: true },
    { name: 'Status', value: crisis.status.charAt(0).toUpperCase() + crisis.status.slice(1), inline: true },
    { name: 'Scope', value: crisis.scope.charAt(0).toUpperCase() + crisis.scope.slice(1), inline: true },
    { name: 'Duration', value: `${crisis.turnsRemaining}/${crisis.duration} turns`, inline: true },
    { name: 'Started', value: `<t:${Math.floor(crisis.createdAt.getTime() / 1000)}:R>`, inline: true }
  );
  
  // Effects
  const effectsList = [];
  const e = crisis.effects;
  if (e.gdpModifier) effectsList.push(`GDP: ${e.gdpModifier > 0 ? '+' : ''}${e.gdpModifier}%`);
  if (e.incomeModifier) effectsList.push(`Income: ${e.incomeModifier > 0 ? '+' : ''}${e.incomeModifier}%`);
  if (e.inflationChange) effectsList.push(`Inflation: ${e.inflationChange > 0 ? '+' : ''}${e.inflationChange}`);
  if (e.stabilityModifier) effectsList.push(`Stability: ${e.stabilityModifier > 0 ? '+' : ''}${e.stabilityModifier}%`);
  if (e.tradeModifier) effectsList.push(`Trade: ${e.tradeModifier > 0 ? '+' : ''}${e.tradeModifier}%`);
  
  embed.addFields({ name: 'Effects', value: effectsList.length > 0 ? effectsList.join('\n') : 'None', inline: false });
  
  // Affected nations
  const nationNames = crisis.affectedNations.slice(0, 10).map(n => n.nationName).join(', ');
  embed.addFields({ 
    name: `Affected Nations (${crisis.affectedNations.length})`, 
    value: nationNames + (crisis.affectedNations.length > 10 ? ` +${crisis.affectedNations.length - 10} more` : ''),
    inline: false 
  });
  
  return interaction.reply({ embeds: [embed] });
}

async function handleResolve(interaction) {
  const guildId = interaction.guildId;
  const crisisId = interaction.options.getString('crisis_id');
  
  const crisis = await EconomicCrisis.findById(crisisId);
  if (!crisis || crisis.guildId !== guildId) {
    return interaction.reply({ embeds: [errorEmbed('Crisis not found')], ephemeral: true });
  }
  
  if (crisis.status === 'resolved') {
    return interaction.reply({ embeds: [errorEmbed('Crisis is already resolved')], ephemeral: true });
  }
  
  crisis.status = 'resolved';
  crisis.resolvedAt = new Date();
  await crisis.save();
  
  // Log resolution for affected nations
  for (const affected of crisis.affectedNations) {
    await createHistoryEntry({
      guildId,
      nation: affected.nation,
      nationName: affected.nationName,
      type: 'economic',
      title: 'Crisis Resolved',
      description: `${crisis.name} has been resolved`,
      performedBy: interaction.user.id,
    });
  }
  
  await createAuditLog({
    guildId,
    action: 'crisis_resolve',
    performedBy: interaction.user.id,
    target: crisis.name,
    details: { crisisId: crisis._id.toString() },
  });
  
  const embed = successEmbed(`Crisis Resolved: ${crisis.name}`)
    .setDescription(`The ${CRISIS_TYPES[crisis.type].name} has ended.`)
    .addFields(
      { name: 'Duration', value: `${crisis.duration - crisis.turnsRemaining} turns`, inline: true },
      { name: 'Affected', value: `${crisis.affectedNations.length} nations`, inline: true }
    );
  
  return interaction.reply({ embeds: [embed] });
}

async function handleModify(interaction) {
  const guildId = interaction.guildId;
  const crisisId = interaction.options.getString('crisis_id');
  const gdp = interaction.options.getInteger('gdp');
  const income = interaction.options.getInteger('income');
  const inflation = interaction.options.getInteger('inflation');
  const stability = interaction.options.getInteger('stability');
  const trade = interaction.options.getInteger('trade');
  
  const crisis = await EconomicCrisis.findById(crisisId);
  if (!crisis || crisis.guildId !== guildId) {
    return interaction.reply({ embeds: [errorEmbed('Crisis not found')], ephemeral: true });
  }
  
  // Update effects
  if (gdp !== null) crisis.effects.gdpModifier = gdp;
  if (income !== null) crisis.effects.incomeModifier = income;
  if (inflation !== null) crisis.effects.inflationChange = inflation;
  if (stability !== null) crisis.effects.stabilityModifier = stability;
  if (trade !== null) crisis.effects.tradeModifier = trade;
  
  await crisis.save();
  
  const embed = successEmbed(`Crisis Modified: ${crisis.name}`)
    .addFields(
      { name: 'GDP Modifier', value: `${crisis.effects.gdpModifier}%`, inline: true },
      { name: 'Income Modifier', value: `${crisis.effects.incomeModifier}%`, inline: true },
      { name: 'Inflation Change', value: crisis.effects.inflationChange.toString(), inline: true },
      { name: 'Stability Modifier', value: `${crisis.effects.stabilityModifier}%`, inline: true },
      { name: 'Trade Modifier', value: `${crisis.effects.tradeModifier}%`, inline: true }
    );
  
  return interaction.reply({ embeds: [embed] });
}

async function handleHistory(interaction) {
  const guildId = interaction.guildId;
  
  const crises = await EconomicCrisis.find({ 
    guildId, 
    status: 'resolved' 
  }).sort({ resolvedAt: -1 }).limit(15);
  
  if (crises.length === 0) {
    return interaction.reply({ 
      embeds: [createEmbed()
        .setTitle('Crisis History')
        .setDescription('No resolved crises on record.')
      ] 
    });
  }
  
  const embed = createEmbed()
    .setTitle('Economic Crisis History')
    .setDescription(`${crises.length} past crisis(es)`);
  
  for (const crisis of crises) {
    const typeInfo = CRISIS_TYPES[crisis.type];
    const duration = crisis.duration - (crisis.turnsRemaining || 0);
    
    embed.addFields({
      name: `${typeInfo.emoji} ${crisis.name}`,
      value: `${crisis.severity} ${typeInfo.name}\nLasted ${duration} turns | ${crisis.affectedNations.length} nations affected\nResolved: <t:${Math.floor(crisis.resolvedAt.getTime() / 1000)}:R>`,
      inline: true
    });
  }
  
  return interaction.reply({ embeds: [embed] });
}
