import { SlashCommandBuilder } from 'discord.js';
import Nation from '../../database/models/Nation.js';
import Unit, { getAllUnits, getUnitsByCategory } from '../../database/models/Unit.js';
import { createAuditLog } from '../../database/models/AuditLog.js';
import { isGM, requireGM, canModifyNation } from '../../utils/permissions.js';
import { militaryEmbed, errorEmbed, successEmbed, createEmbed } from '../../utils/embeds.js';
import { formatNumber, parseAbbreviatedNumber, camelToTitle } from '../../utils/formatters.js';
import config from '../../config.js';

export const data = new SlashCommandBuilder()
  .setName('military')
  .setDescription('Military management commands')
  .addSubcommand(sub =>
    sub.setName('view')
      .setDescription('View a nation\'s military')
      .addStringOption(opt =>
        opt.setName('nation')
          .setDescription('Nation to view')
          .setRequired(true)
          .setAutocomplete(true)))
  .addSubcommand(sub =>
    sub.setName('set')
      .setDescription('Set a military unit count')
      .addStringOption(opt =>
        opt.setName('nation')
          .setDescription('Nation to modify')
          .setRequired(true)
          .setAutocomplete(true))
      .addStringOption(opt =>
        opt.setName('branch')
          .setDescription('Military branch')
          .setRequired(true)
          .addChoices(
            { name: 'Army', value: 'army' },
            { name: 'Airforce', value: 'airforce' },
            { name: 'Navy', value: 'navy' },
          ))
      .addStringOption(opt =>
        opt.setName('unit')
          .setDescription('Unit type')
          .setRequired(true)
          .setAutocomplete(true))
      .addStringOption(opt =>
        opt.setName('amount')
          .setDescription('New amount')
          .setRequired(true)))
  .addSubcommand(sub =>
    sub.setName('add')
      .setDescription('Add military units')
      .addStringOption(opt =>
        opt.setName('nation')
          .setDescription('Nation to modify')
          .setRequired(true)
          .setAutocomplete(true))
      .addStringOption(opt =>
        opt.setName('branch')
          .setDescription('Military branch')
          .setRequired(true)
          .addChoices(
            { name: 'Army', value: 'army' },
            { name: 'Airforce', value: 'airforce' },
            { name: 'Navy', value: 'navy' },
          ))
      .addStringOption(opt =>
        opt.setName('unit')
          .setDescription('Unit type')
          .setRequired(true)
          .setAutocomplete(true))
      .addStringOption(opt =>
        opt.setName('amount')
          .setDescription('Amount to add')
          .setRequired(true)))
  .addSubcommand(sub =>
    sub.setName('remove')
      .setDescription('Remove military units')
      .addStringOption(opt =>
        opt.setName('nation')
          .setDescription('Nation to modify')
          .setRequired(true)
          .setAutocomplete(true))
      .addStringOption(opt =>
        opt.setName('branch')
          .setDescription('Military branch')
          .setRequired(true)
          .addChoices(
            { name: 'Army', value: 'army' },
            { name: 'Airforce', value: 'airforce' },
            { name: 'Navy', value: 'navy' },
          ))
      .addStringOption(opt =>
        opt.setName('unit')
          .setDescription('Unit type')
          .setRequired(true)
          .setAutocomplete(true))
      .addStringOption(opt =>
        opt.setName('amount')
          .setDescription('Amount to remove')
          .setRequired(true)))
  .addSubcommand(sub =>
    sub.setName('produce')
      .setDescription('Queue unit production')
      .addStringOption(opt =>
        opt.setName('nation')
          .setDescription('Nation to produce for')
          .setRequired(true)
          .setAutocomplete(true))
      .addStringOption(opt =>
        opt.setName('unit')
          .setDescription('Unit type to produce')
          .setRequired(true)
          .setAutocomplete(true))
      .addIntegerOption(opt =>
        opt.setName('quantity')
          .setDescription('How many to produce')
          .setRequired(true)
          .setMinValue(1)))
  .addSubcommand(sub =>
    sub.setName('queue')
      .setDescription('View production queue')
      .addStringOption(opt =>
        opt.setName('nation')
          .setDescription('Nation to view')
          .setRequired(true)
          .setAutocomplete(true)))
  .addSubcommand(sub =>
    sub.setName('cancel')
      .setDescription('Cancel a production order')
      .addStringOption(opt =>
        opt.setName('nation')
          .setDescription('Nation')
          .setRequired(true)
          .setAutocomplete(true))
      .addIntegerOption(opt =>
        opt.setName('index')
          .setDescription('Queue position to cancel (1, 2, 3...)')
          .setRequired(true)
          .setMinValue(1)));

// Unit type to field mapping
const unitFieldMap = {
  // Army
  'troops': 'troops',
  'reserves': 'reserves',
  'tanks': 'tanks',
  'artillery': 'artillery',
  'armored vehicles': 'armoredVehicles',
  'special forces': 'specialForces',
  // Airforce
  'jet fighters': 'jets',
  'jets': 'jets',
  'bombers': 'bombers',
  'recon planes': 'reconPlanes',
  'transport planes': 'transportPlanes',
  'helicopters': 'helicopters',
  // Navy
  'carriers': 'carriers',
  'submarines': 'submarines',
  'destroyers': 'destroyers',
  'frigates': 'frigates',
  'corvettes': 'corvettes',
  'battleships': 'battleships',
};

export async function execute(interaction) {
  const subcommand = interaction.options.getSubcommand();

  switch (subcommand) {
    case 'view':
      return handleView(interaction);
    case 'set':
      return handleSet(interaction);
    case 'add':
      return handleAdd(interaction);
    case 'remove':
      return handleRemove(interaction);
    case 'produce':
      return handleProduce(interaction);
    case 'queue':
      return handleQueue(interaction);
    case 'cancel':
      return handleCancel(interaction);
  }
}

async function handleView(interaction) {
  const nationName = interaction.options.getString('nation');
  const nation = await Nation.findOne({ name: { $regex: new RegExp(`^${nationName}$`, 'i') } });

  if (!nation) {
    return interaction.reply({ embeds: [errorEmbed(`Nation **${nationName}** not found.`)], ephemeral: true });
  }

  await interaction.reply({ embeds: [militaryEmbed(nation)] });
}

async function handleSet(interaction) {
  if (!requireGM(interaction)) return;

  const nationName = interaction.options.getString('nation');
  const branch = interaction.options.getString('branch');
  const unitName = interaction.options.getString('unit');
  const amountStr = interaction.options.getString('amount');

  const nation = await Nation.findOne({ name: { $regex: new RegExp(`^${nationName}$`, 'i') } });
  if (!nation) {
    return interaction.reply({ embeds: [errorEmbed(`Nation **${nationName}** not found.`)], ephemeral: true });
  }

  const amount = parseAbbreviatedNumber(amountStr);
  const fieldName = unitFieldMap[unitName.toLowerCase()] || null;

  if (!nation.military) nation.military = { army: {}, airforce: {}, navy: {} };
  if (!nation.military[branch]) nation.military[branch] = {};

  let oldValue;
  if (fieldName && nation.military[branch][fieldName] !== undefined) {
    oldValue = nation.military[branch][fieldName] || 0;
    nation.military[branch][fieldName] = amount;
  } else {
    // Custom unit
    if (!nation.military[branch].custom) nation.military[branch].custom = new Map();
    oldValue = nation.military[branch].custom.get(unitName) || 0;
    nation.military[branch].custom.set(unitName, amount);
  }

  nation.markModified('military');
  await nation.save();

  await createAuditLog({
    entityType: 'nation',
    entityId: nation._id,
    entityName: nation.name,
    action: 'update',
    field: `military.${branch}.${unitName}`,
    oldValue,
    newValue: amount,
    description: `**${nation.name}** ${unitName} set to **${formatNumber(amount)}**`,
    performedBy: interaction.user.id,
    performedByTag: interaction.user.tag,
  });

  await interaction.reply({ embeds: [successEmbed(`**${nation.name}**'s ${unitName} set to **${formatNumber(amount)}**.`)] });
}

async function handleAdd(interaction) {
  if (!requireGM(interaction)) return;

  const nationName = interaction.options.getString('nation');
  const branch = interaction.options.getString('branch');
  const unitName = interaction.options.getString('unit');
  const amountStr = interaction.options.getString('amount');

  const nation = await Nation.findOne({ name: { $regex: new RegExp(`^${nationName}$`, 'i') } });
  if (!nation) {
    return interaction.reply({ embeds: [errorEmbed(`Nation **${nationName}** not found.`)], ephemeral: true });
  }

  const amount = parseAbbreviatedNumber(amountStr);
  const fieldName = unitFieldMap[unitName.toLowerCase()] || null;

  if (!nation.military) nation.military = { army: {}, airforce: {}, navy: {} };
  if (!nation.military[branch]) nation.military[branch] = {};

  let oldValue, newValue;
  if (fieldName) {
    oldValue = nation.military[branch][fieldName] || 0;
    newValue = oldValue + amount;
    nation.military[branch][fieldName] = newValue;
  } else {
    if (!nation.military[branch].custom) nation.military[branch].custom = new Map();
    oldValue = nation.military[branch].custom.get(unitName) || 0;
    newValue = oldValue + amount;
    nation.military[branch].custom.set(unitName, newValue);
  }

  nation.markModified('military');
  await nation.save();

  await createAuditLog({
    entityType: 'nation',
    entityId: nation._id,
    entityName: nation.name,
    action: 'update',
    field: `military.${branch}.${unitName}`,
    oldValue,
    newValue,
    description: `Added **${formatNumber(amount)}** ${unitName} to **${nation.name}**`,
    performedBy: interaction.user.id,
    performedByTag: interaction.user.tag,
  });

  await interaction.reply({ embeds: [successEmbed(`Added **${formatNumber(amount)}** ${unitName} to **${nation.name}**.\nNew total: **${formatNumber(newValue)}**`)] });
}

async function handleRemove(interaction) {
  if (!requireGM(interaction)) return;

  const nationName = interaction.options.getString('nation');
  const branch = interaction.options.getString('branch');
  const unitName = interaction.options.getString('unit');
  const amountStr = interaction.options.getString('amount');

  const nation = await Nation.findOne({ name: { $regex: new RegExp(`^${nationName}$`, 'i') } });
  if (!nation) {
    return interaction.reply({ embeds: [errorEmbed(`Nation **${nationName}** not found.`)], ephemeral: true });
  }

  const amount = parseAbbreviatedNumber(amountStr);
  const fieldName = unitFieldMap[unitName.toLowerCase()] || null;

  if (!nation.military) nation.military = { army: {}, airforce: {}, navy: {} };
  if (!nation.military[branch]) nation.military[branch] = {};

  let oldValue, newValue;
  if (fieldName) {
    oldValue = nation.military[branch][fieldName] || 0;
    newValue = Math.max(0, oldValue - amount);
    nation.military[branch][fieldName] = newValue;
  } else {
    if (!nation.military[branch].custom) nation.military[branch].custom = new Map();
    oldValue = nation.military[branch].custom.get(unitName) || 0;
    newValue = Math.max(0, oldValue - amount);
    nation.military[branch].custom.set(unitName, newValue);
  }

  nation.markModified('military');
  await nation.save();

  await createAuditLog({
    entityType: 'nation',
    entityId: nation._id,
    entityName: nation.name,
    action: 'update',
    field: `military.${branch}.${unitName}`,
    oldValue,
    newValue,
    description: `Removed **${formatNumber(amount)}** ${unitName} from **${nation.name}**`,
    performedBy: interaction.user.id,
    performedByTag: interaction.user.tag,
  });

  await interaction.reply({ embeds: [successEmbed(`Removed **${formatNumber(amount)}** ${unitName} from **${nation.name}**.\nNew total: **${formatNumber(newValue)}**`)] });
}

async function handleProduce(interaction) {
  const nationName = interaction.options.getString('nation');
  const unitName = interaction.options.getString('unit');
  const quantity = interaction.options.getInteger('quantity');

  const nation = await Nation.findOne({ name: { $regex: new RegExp(`^${nationName}$`, 'i') } });
  if (!nation) {
    return interaction.reply({ embeds: [errorEmbed(`Nation **${nationName}** not found.`)], ephemeral: true });
  }

  // Check permission
  if (!canModifyNation(interaction.member, nation)) {
    return interaction.reply({
      embeds: [errorEmbed(`You don't have permission to produce for **${nation.name}**.`)],
      ephemeral: true,
    });
  }

  // Get unit info
  const unit = await Unit.findOne({ name: { $regex: new RegExp(`^${unitName}$`, 'i') } });
  const productionTime = unit?.productionTime || 1;

  if (!nation.productionQueue) nation.productionQueue = [];

  nation.productionQueue.push({
    unitType: unitName,
    quantity,
    turnsRemaining: productionTime,
    totalTurns: productionTime,
  });

  await nation.save();

  await createAuditLog({
    entityType: 'nation',
    entityId: nation._id,
    entityName: nation.name,
    action: 'production',
    description: `**${nation.name}** queued production of **${formatNumber(quantity)} ${unitName}** (${productionTime} turns)`,
    performedBy: interaction.user.id,
    performedByTag: interaction.user.tag,
  });

  await interaction.reply({ 
    embeds: [successEmbed(`Queued production of **${formatNumber(quantity)} ${unitName}** for **${nation.name}**.\nEstimated completion: **${productionTime} turn(s)**`)] 
  });
}

async function handleQueue(interaction) {
  const nationName = interaction.options.getString('nation');
  const nation = await Nation.findOne({ name: { $regex: new RegExp(`^${nationName}$`, 'i') } });

  if (!nation) {
    return interaction.reply({ embeds: [errorEmbed(`Nation **${nationName}** not found.`)], ephemeral: true });
  }

  if (!nation.productionQueue || nation.productionQueue.length === 0) {
    return interaction.reply({ content: `**${nation.name}** has no units in production.` });
  }

  const embed = createEmbed({
    title: `${nation.name} - Production Queue`,
    color: config.colors.military,
  });

  const lines = nation.productionQueue.map((item, i) => {
    const progress = Math.round((1 - item.turnsRemaining / item.totalTurns) * 100);
    return `**${i + 1}.** ${item.unitType} x${formatNumber(item.quantity)}\n   ${item.turnsRemaining}/${item.totalTurns} turns remaining (${progress}% complete)`;
  });

  embed.setDescription(lines.join('\n\n'));

  await interaction.reply({ embeds: [embed] });
}

async function handleCancel(interaction) {
  const nationName = interaction.options.getString('nation');
  const index = interaction.options.getInteger('index') - 1;

  const nation = await Nation.findOne({ name: { $regex: new RegExp(`^${nationName}$`, 'i') } });
  if (!nation) {
    return interaction.reply({ embeds: [errorEmbed(`Nation **${nationName}** not found.`)], ephemeral: true });
  }

  if (!canModifyNation(interaction.member, nation)) {
    return interaction.reply({
      embeds: [errorEmbed(`You don't have permission to modify **${nation.name}**'s production.`)],
      ephemeral: true,
    });
  }

  if (!nation.productionQueue || index < 0 || index >= nation.productionQueue.length) {
    return interaction.reply({ embeds: [errorEmbed('Invalid queue position.')], ephemeral: true });
  }

  const cancelled = nation.productionQueue.splice(index, 1)[0];
  await nation.save();

  await createAuditLog({
    entityType: 'nation',
    entityId: nation._id,
    entityName: nation.name,
    action: 'production',
    description: `**${nation.name}** cancelled production of **${formatNumber(cancelled.quantity)} ${cancelled.unitType}**`,
    performedBy: interaction.user.id,
    performedByTag: interaction.user.tag,
  });

  await interaction.reply({ embeds: [successEmbed(`Cancelled production of **${formatNumber(cancelled.quantity)} ${cancelled.unitType}**.`)] });
}

export async function autocomplete(interaction) {
  const focusedOption = interaction.options.getFocused(true);

  if (focusedOption.name === 'nation') {
    const nations = await Nation.find({
      name: { $regex: focusedOption.value, $options: 'i' }
    }).limit(25);
    await interaction.respond(nations.map(n => ({ name: n.name, value: n.name })));
  } else if (focusedOption.name === 'unit') {
    const branch = interaction.options.getString('branch');
    let units;
    
    if (branch) {
      units = await getUnitsByCategory(branch);
    } else {
      units = await getAllUnits();
    }
    
    const filtered = units.filter(u =>
      u.name.toLowerCase().includes(focusedOption.value.toLowerCase())
    ).slice(0, 25);
    
    await interaction.respond(filtered.map(u => ({ name: u.name, value: u.name })));
  }
}
