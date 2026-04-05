import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import Nation from '../../database/models/Nation.js';
import { createAuditLog } from '../../database/models/AuditLog.js';
import { createHistoryEntry } from '../../database/models/HistoryEntry.js';
import { isGM, requireGM } from '../../utils/permissions.js';
import { createEmbed, errorEmbed, successEmbed } from '../../utils/embeds.js';
import { formatNumber, parseNumber } from '../../utils/formatters.js';
import config from '../../config.js';

export const data = new SlashCommandBuilder()
  .setName('bulk')
  .setDescription('Perform bulk operations on multiple nations (GM only)')
  .addSubcommand(sub =>
    sub.setName('currency')
      .setDescription('Add/remove currency from multiple nations')
      .addStringOption(opt =>
        opt.setName('operation')
          .setDescription('Operation to perform')
          .setRequired(true)
          .addChoices(
            { name: 'Add', value: 'add' },
            { name: 'Remove', value: 'remove' },
            { name: 'Set', value: 'set' }
          ))
      .addStringOption(opt =>
        opt.setName('currency')
          .setDescription('Currency name')
          .setRequired(true))
      .addStringOption(opt =>
        opt.setName('amount')
          .setDescription('Amount (can use K, M, B suffixes)')
          .setRequired(true))
      .addStringOption(opt =>
        opt.setName('nations')
          .setDescription('Nations (comma-separated, or "all")')
          .setRequired(true))
      .addStringOption(opt =>
        opt.setName('reason')
          .setDescription('Reason for this change')
          .setRequired(false)))
  .addSubcommand(sub =>
    sub.setName('resource')
      .setDescription('Add/remove resources from multiple nations')
      .addStringOption(opt =>
        opt.setName('operation')
          .setDescription('Operation to perform')
          .setRequired(true)
          .addChoices(
            { name: 'Add', value: 'add' },
            { name: 'Remove', value: 'remove' },
            { name: 'Set', value: 'set' }
          ))
      .addStringOption(opt =>
        opt.setName('resource')
          .setDescription('Resource name')
          .setRequired(true))
      .addStringOption(opt =>
        opt.setName('amount')
          .setDescription('Amount (can use K, M, B suffixes)')
          .setRequired(true))
      .addStringOption(opt =>
        opt.setName('nations')
          .setDescription('Nations (comma-separated, or "all")')
          .setRequired(true))
      .addStringOption(opt =>
        opt.setName('reason')
          .setDescription('Reason for this change')
          .setRequired(false)))
  .addSubcommand(sub =>
    sub.setName('stability')
      .setDescription('Modify stability for multiple nations')
      .addStringOption(opt =>
        opt.setName('operation')
          .setDescription('Operation to perform')
          .setRequired(true)
          .addChoices(
            { name: 'Add', value: 'add' },
            { name: 'Remove', value: 'remove' },
            { name: 'Set', value: 'set' }
          ))
      .addIntegerOption(opt =>
        opt.setName('amount')
          .setDescription('Amount (percentage)')
          .setRequired(true)
          .setMinValue(0)
          .setMaxValue(100))
      .addStringOption(opt =>
        opt.setName('nations')
          .setDescription('Nations (comma-separated, or "all")')
          .setRequired(true))
      .addStringOption(opt =>
        opt.setName('reason')
          .setDescription('Reason for this change')
          .setRequired(false)))
  .addSubcommand(sub =>
    sub.setName('military')
      .setDescription('Modify military units for multiple nations')
      .addStringOption(opt =>
        opt.setName('operation')
          .setDescription('Operation to perform')
          .setRequired(true)
          .addChoices(
            { name: 'Add', value: 'add' },
            { name: 'Remove', value: 'remove' },
            { name: 'Set', value: 'set' }
          ))
      .addStringOption(opt =>
        opt.setName('branch')
          .setDescription('Military branch')
          .setRequired(true)
          .addChoices(
            { name: 'Army', value: 'army' },
            { name: 'Navy', value: 'navy' },
            { name: 'Air Force', value: 'airforce' }
          ))
      .addStringOption(opt =>
        opt.setName('unit')
          .setDescription('Unit type')
          .setRequired(true))
      .addStringOption(opt =>
        opt.setName('amount')
          .setDescription('Amount (can use K, M, B suffixes)')
          .setRequired(true))
      .addStringOption(opt =>
        opt.setName('nations')
          .setDescription('Nations (comma-separated, or "all")')
          .setRequired(true))
      .addStringOption(opt =>
        opt.setName('reason')
          .setDescription('Reason for this change')
          .setRequired(false)))
  .addSubcommand(sub =>
    sub.setName('preview')
      .setDescription('Preview a bulk operation before executing')
      .addStringOption(opt =>
        opt.setName('nations')
          .setDescription('Nations to preview (comma-separated, or "all")')
          .setRequired(true)))
  .addSubcommand(sub =>
    sub.setName('transfer')
      .setDescription('Transfer ownership of multiple nations')
      .addUserOption(opt =>
        opt.setName('user')
          .setDescription('New owner for the nations')
          .setRequired(true))
      .addStringOption(opt =>
        opt.setName('nations')
          .setDescription('Nations (comma-separated)')
          .setRequired(true)));

export async function execute(interaction) {
  const gmCheck = await requireGM(interaction);
  if (!gmCheck) return;
  
  const subcommand = interaction.options.getSubcommand();
  
  switch (subcommand) {
    case 'currency':
      return handleCurrency(interaction);
    case 'resource':
      return handleResource(interaction);
    case 'stability':
      return handleStability(interaction);
    case 'military':
      return handleMilitary(interaction);
    case 'preview':
      return handlePreview(interaction);
    case 'transfer':
      return handleTransfer(interaction);
    default:
      return interaction.reply({ embeds: [errorEmbed('Unknown subcommand')], ephemeral: true });
  }
}

async function resolveNations(guildId, nationsInput) {
  const input = nationsInput.trim().toLowerCase();
  
  if (input === 'all') {
    return await Nation.find({ guildId });
  }
  
  const nationNames = nationsInput.split(',').map(n => n.trim()).filter(n => n);
  const nations = [];
  const notFound = [];
  
  for (const name of nationNames) {
    const nation = await Nation.findOne({ guildId, name: { $regex: new RegExp(`^${name}$`, 'i') } });
    if (nation) {
      nations.push(nation);
    } else {
      notFound.push(name);
    }
  }
  
  return { nations, notFound };
}

async function handleCurrency(interaction) {
  const guildId = interaction.guildId;
  const operation = interaction.options.getString('operation');
  const currency = interaction.options.getString('currency');
  const amountStr = interaction.options.getString('amount');
  const nationsInput = interaction.options.getString('nations');
  const reason = interaction.options.getString('reason') || 'Bulk operation';
  
  const amount = parseNumber(amountStr);
  if (isNaN(amount)) {
    return interaction.reply({ embeds: [errorEmbed('Invalid amount format')], ephemeral: true });
  }
  
  const result = await resolveNations(guildId, nationsInput);
  const nations = Array.isArray(result) ? result : result.nations;
  const notFound = Array.isArray(result) ? [] : result.notFound;
  
  if (nations.length === 0) {
    return interaction.reply({ embeds: [errorEmbed('No nations found')], ephemeral: true });
  }
  
  await interaction.deferReply();
  
  const changes = [];
  
  for (const nation of nations) {
    const current = nation.economy.currencies?.get(currency) || 0;
    let newValue;
    
    switch (operation) {
      case 'add':
        newValue = current + amount;
        break;
      case 'remove':
        newValue = Math.max(0, current - amount);
        break;
      case 'set':
        newValue = amount;
        break;
    }
    
    if (!nation.economy.currencies) nation.economy.currencies = new Map();
    nation.economy.currencies.set(currency, newValue);
    await nation.save();
    
    changes.push({
      nation: nation.name,
      before: current,
      after: newValue,
      diff: newValue - current
    });
    
    await createHistoryEntry({
      guildId,
      nation: nation._id,
      nationName: nation.name,
      type: 'economic',
      title: `Bulk Currency ${operation}`,
      description: `${currency}: ${formatNumber(current)} → ${formatNumber(newValue)}`,
      details: { operation, currency, amount, reason },
      performedBy: interaction.user.id,
    });
  }
  
  await createAuditLog({
    guildId,
    action: 'bulk_currency',
    performedBy: interaction.user.id,
    target: `${nations.length} nations`,
    details: { operation, currency, amount, reason, affectedCount: nations.length },
  });
  
  const embed = successEmbed(`Bulk Currency ${operation.charAt(0).toUpperCase() + operation.slice(1)}`)
    .setDescription(`Modified **${currency}** for **${nations.length}** nation(s)`)
    .addFields(
      { name: 'Operation', value: `${operation} ${formatNumber(amount)}`, inline: true },
      { name: 'Currency', value: currency, inline: true },
      { name: 'Reason', value: reason, inline: false }
    );
  
  // Show sample changes
  const sampleChanges = changes.slice(0, 5).map(c => 
    `${c.nation}: ${formatNumber(c.before)} → ${formatNumber(c.after)} (${c.diff >= 0 ? '+' : ''}${formatNumber(c.diff)})`
  );
  if (changes.length > 5) {
    sampleChanges.push(`... and ${changes.length - 5} more`);
  }
  embed.addFields({ name: 'Changes', value: sampleChanges.join('\n'), inline: false });
  
  if (notFound.length > 0) {
    embed.addFields({ name: 'Not Found', value: notFound.join(', '), inline: false });
  }
  
  return interaction.editReply({ embeds: [embed] });
}

async function handleResource(interaction) {
  const guildId = interaction.guildId;
  const operation = interaction.options.getString('operation');
  const resource = interaction.options.getString('resource');
  const amountStr = interaction.options.getString('amount');
  const nationsInput = interaction.options.getString('nations');
  const reason = interaction.options.getString('reason') || 'Bulk operation';
  
  const amount = parseNumber(amountStr);
  if (isNaN(amount)) {
    return interaction.reply({ embeds: [errorEmbed('Invalid amount format')], ephemeral: true });
  }
  
  const result = await resolveNations(guildId, nationsInput);
  const nations = Array.isArray(result) ? result : result.nations;
  const notFound = Array.isArray(result) ? [] : result.notFound;
  
  if (nations.length === 0) {
    return interaction.reply({ embeds: [errorEmbed('No nations found')], ephemeral: true });
  }
  
  await interaction.deferReply();
  
  const changes = [];
  
  for (const nation of nations) {
    const current = nation.resources?.get(resource) || 0;
    let newValue;
    
    switch (operation) {
      case 'add':
        newValue = current + amount;
        break;
      case 'remove':
        newValue = Math.max(0, current - amount);
        break;
      case 'set':
        newValue = amount;
        break;
    }
    
    if (!nation.resources) nation.resources = new Map();
    nation.resources.set(resource, newValue);
    await nation.save();
    
    changes.push({
      nation: nation.name,
      before: current,
      after: newValue,
      diff: newValue - current
    });
    
    await createHistoryEntry({
      guildId,
      nation: nation._id,
      nationName: nation.name,
      type: 'resource',
      title: `Bulk Resource ${operation}`,
      description: `${resource}: ${formatNumber(current)} → ${formatNumber(newValue)}`,
      details: { operation, resource, amount, reason },
      performedBy: interaction.user.id,
    });
  }
  
  await createAuditLog({
    guildId,
    action: 'bulk_resource',
    performedBy: interaction.user.id,
    target: `${nations.length} nations`,
    details: { operation, resource, amount, reason, affectedCount: nations.length },
  });
  
  const embed = successEmbed(`Bulk Resource ${operation.charAt(0).toUpperCase() + operation.slice(1)}`)
    .setDescription(`Modified **${resource}** for **${nations.length}** nation(s)`)
    .addFields(
      { name: 'Operation', value: `${operation} ${formatNumber(amount)}`, inline: true },
      { name: 'Resource', value: resource, inline: true },
      { name: 'Reason', value: reason, inline: false }
    );
  
  const sampleChanges = changes.slice(0, 5).map(c => 
    `${c.nation}: ${formatNumber(c.before)} → ${formatNumber(c.after)}`
  );
  if (changes.length > 5) {
    sampleChanges.push(`... and ${changes.length - 5} more`);
  }
  embed.addFields({ name: 'Changes', value: sampleChanges.join('\n'), inline: false });
  
  if (notFound.length > 0) {
    embed.addFields({ name: 'Not Found', value: notFound.join(', '), inline: false });
  }
  
  return interaction.editReply({ embeds: [embed] });
}

async function handleStability(interaction) {
  const guildId = interaction.guildId;
  const operation = interaction.options.getString('operation');
  const amount = interaction.options.getInteger('amount');
  const nationsInput = interaction.options.getString('nations');
  const reason = interaction.options.getString('reason') || 'Bulk operation';
  
  const result = await resolveNations(guildId, nationsInput);
  const nations = Array.isArray(result) ? result : result.nations;
  const notFound = Array.isArray(result) ? [] : result.notFound;
  
  if (nations.length === 0) {
    return interaction.reply({ embeds: [errorEmbed('No nations found')], ephemeral: true });
  }
  
  await interaction.deferReply();
  
  const changes = [];
  
  for (const nation of nations) {
    const current = nation.stability;
    let newValue;
    
    switch (operation) {
      case 'add':
        newValue = Math.min(100, current + amount);
        break;
      case 'remove':
        newValue = Math.max(0, current - amount);
        break;
      case 'set':
        newValue = Math.min(100, Math.max(0, amount));
        break;
    }
    
    nation.stability = newValue;
    await nation.save();
    
    changes.push({
      nation: nation.name,
      before: current,
      after: newValue,
      diff: newValue - current
    });
    
    await createHistoryEntry({
      guildId,
      nation: nation._id,
      nationName: nation.name,
      type: 'stability',
      title: `Bulk Stability ${operation}`,
      description: `Stability: ${current}% → ${newValue}%`,
      details: { operation, amount, reason },
      performedBy: interaction.user.id,
    });
  }
  
  await createAuditLog({
    guildId,
    action: 'bulk_stability',
    performedBy: interaction.user.id,
    target: `${nations.length} nations`,
    details: { operation, amount, reason, affectedCount: nations.length },
  });
  
  const embed = successEmbed(`Bulk Stability ${operation.charAt(0).toUpperCase() + operation.slice(1)}`)
    .setDescription(`Modified stability for **${nations.length}** nation(s)`)
    .addFields(
      { name: 'Operation', value: `${operation} ${amount}%`, inline: true },
      { name: 'Reason', value: reason, inline: false }
    );
  
  const sampleChanges = changes.slice(0, 5).map(c => 
    `${c.nation}: ${c.before}% → ${c.after}% (${c.diff >= 0 ? '+' : ''}${c.diff}%)`
  );
  if (changes.length > 5) {
    sampleChanges.push(`... and ${changes.length - 5} more`);
  }
  embed.addFields({ name: 'Changes', value: sampleChanges.join('\n'), inline: false });
  
  if (notFound.length > 0) {
    embed.addFields({ name: 'Not Found', value: notFound.join(', '), inline: false });
  }
  
  return interaction.editReply({ embeds: [embed] });
}

async function handleMilitary(interaction) {
  const guildId = interaction.guildId;
  const operation = interaction.options.getString('operation');
  const branch = interaction.options.getString('branch');
  const unit = interaction.options.getString('unit').toLowerCase();
  const amountStr = interaction.options.getString('amount');
  const nationsInput = interaction.options.getString('nations');
  const reason = interaction.options.getString('reason') || 'Bulk operation';
  
  const amount = parseNumber(amountStr);
  if (isNaN(amount)) {
    return interaction.reply({ embeds: [errorEmbed('Invalid amount format')], ephemeral: true });
  }
  
  // Validate unit type
  const standardUnits = {
    army: ['troops', 'reserves', 'tanks', 'artillery', 'armoredvehicles', 'specialforces'],
    navy: ['carriers', 'submarines', 'destroyers', 'frigates', 'corvettes', 'battleships'],
    airforce: ['jets', 'bombers', 'reconplanes', 'transportplanes', 'helicopters']
  };
  
  const isStandardUnit = standardUnits[branch]?.includes(unit.replace(/\s+/g, '').toLowerCase());
  
  const result = await resolveNations(guildId, nationsInput);
  const nations = Array.isArray(result) ? result : result.nations;
  const notFound = Array.isArray(result) ? [] : result.notFound;
  
  if (nations.length === 0) {
    return interaction.reply({ embeds: [errorEmbed('No nations found')], ephemeral: true });
  }
  
  await interaction.deferReply();
  
  const changes = [];
  
  for (const nation of nations) {
    let current, newValue;
    const branchData = nation.military[branch];
    
    if (isStandardUnit) {
      const unitKey = unit.replace(/\s+/g, '').toLowerCase();
      // Map to actual field name
      const fieldMap = {
        armoredvehicles: 'armoredVehicles',
        specialforces: 'specialForces',
        reconplanes: 'reconPlanes',
        transportplanes: 'transportPlanes'
      };
      const actualField = fieldMap[unitKey] || unitKey;
      current = branchData[actualField] || 0;
      
      switch (operation) {
        case 'add':
          newValue = current + amount;
          break;
        case 'remove':
          newValue = Math.max(0, current - amount);
          break;
        case 'set':
          newValue = amount;
          break;
      }
      
      branchData[actualField] = newValue;
    } else {
      // Custom unit
      if (!branchData.custom) branchData.custom = new Map();
      current = branchData.custom.get(unit) || 0;
      
      switch (operation) {
        case 'add':
          newValue = current + amount;
          break;
        case 'remove':
          newValue = Math.max(0, current - amount);
          break;
        case 'set':
          newValue = amount;
          break;
      }
      
      branchData.custom.set(unit, newValue);
    }
    
    nation.markModified('military');
    await nation.save();
    
    changes.push({
      nation: nation.name,
      before: current,
      after: newValue,
      diff: newValue - current
    });
    
    await createHistoryEntry({
      guildId,
      nation: nation._id,
      nationName: nation.name,
      type: 'military',
      title: `Bulk Military ${operation}`,
      description: `${branch}/${unit}: ${formatNumber(current)} → ${formatNumber(newValue)}`,
      details: { operation, branch, unit, amount, reason },
      performedBy: interaction.user.id,
    });
  }
  
  await createAuditLog({
    guildId,
    action: 'bulk_military',
    performedBy: interaction.user.id,
    target: `${nations.length} nations`,
    details: { operation, branch, unit, amount, reason, affectedCount: nations.length },
  });
  
  const embed = successEmbed(`Bulk Military ${operation.charAt(0).toUpperCase() + operation.slice(1)}`)
    .setDescription(`Modified **${branch}/${unit}** for **${nations.length}** nation(s)`)
    .addFields(
      { name: 'Operation', value: `${operation} ${formatNumber(amount)}`, inline: true },
      { name: 'Branch/Unit', value: `${branch}/${unit}`, inline: true },
      { name: 'Reason', value: reason, inline: false }
    );
  
  const sampleChanges = changes.slice(0, 5).map(c => 
    `${c.nation}: ${formatNumber(c.before)} → ${formatNumber(c.after)}`
  );
  if (changes.length > 5) {
    sampleChanges.push(`... and ${changes.length - 5} more`);
  }
  embed.addFields({ name: 'Changes', value: sampleChanges.join('\n'), inline: false });
  
  if (notFound.length > 0) {
    embed.addFields({ name: 'Not Found', value: notFound.join(', '), inline: false });
  }
  
  return interaction.editReply({ embeds: [embed] });
}

async function handlePreview(interaction) {
  const guildId = interaction.guildId;
  const nationsInput = interaction.options.getString('nations');
  
  const result = await resolveNations(guildId, nationsInput);
  const nations = Array.isArray(result) ? result : result.nations;
  const notFound = Array.isArray(result) ? [] : result.notFound;
  
  if (nations.length === 0) {
    return interaction.reply({ embeds: [errorEmbed('No nations found')], ephemeral: true });
  }
  
  const embed = createEmbed()
    .setTitle('Bulk Operation Preview')
    .setDescription(`Found **${nations.length}** nation(s) matching your criteria`)
    .addFields({
      name: 'Nations',
      value: nations.slice(0, 20).map(n => n.name).join(', ') + (nations.length > 20 ? `\n... and ${nations.length - 20} more` : ''),
      inline: false
    });
  
  if (notFound.length > 0) {
    embed.addFields({ name: 'Not Found', value: notFound.join(', '), inline: false });
  }
  
  return interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleTransfer(interaction) {
  const guildId = interaction.guildId;
  const newOwner = interaction.options.getUser('user');
  const nationsInput = interaction.options.getString('nations');
  
  const result = await resolveNations(guildId, nationsInput);
  const nations = Array.isArray(result) ? result : result.nations;
  const notFound = Array.isArray(result) ? [] : result.notFound;
  
  if (nations.length === 0) {
    return interaction.reply({ embeds: [errorEmbed('No nations found')], ephemeral: true });
  }
  
  await interaction.deferReply();
  
  for (const nation of nations) {
    const previousOwner = nation.owner;
    nation.owner = newOwner.id;
    await nation.save();
    
    await createHistoryEntry({
      guildId,
      nation: nation._id,
      nationName: nation.name,
      type: 'administrative',
      title: 'Ownership Transfer',
      description: `Ownership transferred to ${newOwner.tag}`,
      details: { previousOwner, newOwner: newOwner.id },
      performedBy: interaction.user.id,
    });
  }
  
  await createAuditLog({
    guildId,
    action: 'bulk_transfer',
    performedBy: interaction.user.id,
    target: `${nations.length} nations to ${newOwner.tag}`,
    details: { newOwner: newOwner.id, nationCount: nations.length, nations: nations.map(n => n.name) },
  });
  
  const embed = successEmbed('Bulk Ownership Transfer')
    .setDescription(`Transferred **${nations.length}** nation(s) to ${newOwner}`)
    .addFields({
      name: 'Nations',
      value: nations.map(n => n.name).join(', '),
      inline: false
    });
  
  if (notFound.length > 0) {
    embed.addFields({ name: 'Not Found', value: notFound.join(', '), inline: false });
  }
  
  return interaction.editReply({ embeds: [embed] });
}
