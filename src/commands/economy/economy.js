import { SlashCommandBuilder } from 'discord.js';
import Nation from '../../database/models/Nation.js';
import Resource, { getAllCurrencies } from '../../database/models/Resource.js';
import Transaction from '../../database/models/Transaction.js';
import { createAuditLog } from '../../database/models/AuditLog.js';
import { getGameState } from '../../database/models/GameState.js';
import { isGM, requireGM, canModifyNation } from '../../utils/permissions.js';
import { economyEmbed, errorEmbed, successEmbed, createEmbed, listEmbed } from '../../utils/embeds.js';
import { formatNumber, formatCurrency, parseAbbreviatedNumber } from '../../utils/formatters.js';
import config from '../../config.js';

export const data = new SlashCommandBuilder()
  .setName('economy')
  .setDescription('Economy management commands')
  .addSubcommand(sub =>
    sub.setName('view')
      .setDescription('View a nation\'s economy and resources')
      .addStringOption(opt =>
        opt.setName('nation')
          .setDescription('Nation to view')
          .setRequired(true)
          .setAutocomplete(true)))
  .addSubcommand(sub =>
    sub.setName('set')
      .setDescription('Set a nation\'s currency balance')
      .addStringOption(opt =>
        opt.setName('nation')
          .setDescription('Nation to modify')
          .setRequired(true)
          .setAutocomplete(true))
      .addStringOption(opt =>
        opt.setName('currency')
          .setDescription('Currency to set')
          .setRequired(true)
          .setAutocomplete(true))
      .addStringOption(opt =>
        opt.setName('amount')
          .setDescription('Amount (e.g., 1000000, 1M, 1.5B)')
          .setRequired(true)))
  .addSubcommand(sub =>
    sub.setName('add')
      .setDescription('Add currency to a nation')
      .addStringOption(opt =>
        opt.setName('nation')
          .setDescription('Nation to modify')
          .setRequired(true)
          .setAutocomplete(true))
      .addStringOption(opt =>
        opt.setName('currency')
          .setDescription('Currency to add')
          .setRequired(true)
          .setAutocomplete(true))
      .addStringOption(opt =>
        opt.setName('amount')
          .setDescription('Amount to add')
          .setRequired(true))
      .addStringOption(opt =>
        opt.setName('reason')
          .setDescription('Reason for addition')
          .setRequired(false)))
  .addSubcommand(sub =>
    sub.setName('remove')
      .setDescription('Remove currency from a nation')
      .addStringOption(opt =>
        opt.setName('nation')
          .setDescription('Nation to modify')
          .setRequired(true)
          .setAutocomplete(true))
      .addStringOption(opt =>
        opt.setName('currency')
          .setDescription('Currency to remove')
          .setRequired(true)
          .setAutocomplete(true))
      .addStringOption(opt =>
        opt.setName('amount')
          .setDescription('Amount to remove')
          .setRequired(true))
      .addStringOption(opt =>
        opt.setName('reason')
          .setDescription('Reason for removal')
          .setRequired(false)))
  .addSubcommand(sub =>
    sub.setName('income')
      .setDescription('Set per-turn currency income for a nation')
      .addStringOption(opt =>
        opt.setName('nation')
          .setDescription('Nation to modify')
          .setRequired(true)
          .setAutocomplete(true))
      .addStringOption(opt =>
        opt.setName('currency')
          .setDescription('Currency')
          .setRequired(true)
          .setAutocomplete(true))
      .addStringOption(opt =>
        opt.setName('amount')
          .setDescription('Amount per turn (use negative for expenses)')
          .setRequired(true)));

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
    case 'income':
      return handleIncome(interaction);
  }
}

async function handleView(interaction) {
  const nationName = interaction.options.getString('nation');
  const nation = await Nation.findOne({ name: { $regex: new RegExp(`^${nationName}$`, 'i') } });

  if (!nation) {
    return interaction.reply({ embeds: [errorEmbed(`Nation **${nationName}** not found.`)], ephemeral: true });
  }

  const resources = await Resource.find().sort({ type: 1, name: 1 });
  await interaction.reply({ embeds: [economyEmbed(nation, resources)] });
}

async function handleSet(interaction) {
  if (!requireGM(interaction)) return;

  const nationName = interaction.options.getString('nation');
  const currencyName = interaction.options.getString('currency');
  const amountStr = interaction.options.getString('amount');

  const nation = await Nation.findOne({ name: { $regex: new RegExp(`^${nationName}$`, 'i') } });
  if (!nation) {
    return interaction.reply({ embeds: [errorEmbed(`Nation **${nationName}** not found.`)], ephemeral: true });
  }

  const amount = parseAbbreviatedNumber(amountStr);
  const oldAmount = nation.economy.currencies?.get(currencyName) || 0;

  if (!nation.economy.currencies) {
    nation.economy.currencies = new Map();
  }
  nation.economy.currencies.set(currencyName, amount);
  await nation.save();

  const gameState = await getGameState();

  // Log transaction
  await Transaction.create({
    type: 'adjustment',
    to: { nation: nation._id, nationName: nation.name },
    currency: currencyName,
    amount: amount - oldAmount,
    description: `Balance set to ${formatNumber(amount)}`,
    initiatedBy: interaction.user.id,
    turn: gameState?.turn?.current || 0,
  });

  // Audit log
  await createAuditLog({
    entityType: 'nation',
    entityId: nation._id,
    entityName: nation.name,
    action: 'update',
    field: `economy.currencies.${currencyName}`,
    oldValue: oldAmount,
    newValue: amount,
    description: `**${nation.name}** ${currencyName} set to **${formatNumber(amount)}** (was ${formatNumber(oldAmount)})`,
    performedBy: interaction.user.id,
    performedByTag: interaction.user.tag,
  });

  await interaction.reply({ embeds: [successEmbed(`**${nation.name}**'s ${currencyName} balance set to **${formatNumber(amount)}**.`)] });
}

async function handleAdd(interaction) {
  if (!requireGM(interaction)) return;

  const nationName = interaction.options.getString('nation');
  const currencyName = interaction.options.getString('currency');
  const amountStr = interaction.options.getString('amount');
  const reason = interaction.options.getString('reason') || 'Manual addition';

  const nation = await Nation.findOne({ name: { $regex: new RegExp(`^${nationName}$`, 'i') } });
  if (!nation) {
    return interaction.reply({ embeds: [errorEmbed(`Nation **${nationName}** not found.`)], ephemeral: true });
  }

  const amount = parseAbbreviatedNumber(amountStr);
  if (amount <= 0) {
    return interaction.reply({ embeds: [errorEmbed('Amount must be positive. Use `/economy remove` to subtract.')], ephemeral: true });
  }

  if (!nation.economy.currencies) {
    nation.economy.currencies = new Map();
  }
  const currentAmount = nation.economy.currencies.get(currencyName) || 0;
  const newAmount = currentAmount + amount;
  nation.economy.currencies.set(currencyName, newAmount);
  await nation.save();

  const gameState = await getGameState();

  // Log transaction
  await Transaction.create({
    type: 'adjustment',
    to: { nation: nation._id, nationName: nation.name },
    currency: currencyName,
    amount: amount,
    description: reason,
    initiatedBy: interaction.user.id,
    turn: gameState?.turn?.current || 0,
  });

  // Audit log
  await createAuditLog({
    entityType: 'nation',
    entityId: nation._id,
    entityName: nation.name,
    action: 'update',
    field: `economy.currencies.${currencyName}`,
    oldValue: currentAmount,
    newValue: newAmount,
    description: `Added **${formatNumber(amount)}** ${currencyName} to **${nation.name}** (${reason})`,
    performedBy: interaction.user.id,
    performedByTag: interaction.user.tag,
  });

  await interaction.reply({ embeds: [successEmbed(`Added **${formatNumber(amount)}** ${currencyName} to **${nation.name}**.\nNew balance: **${formatNumber(newAmount)}**`)] });
}

async function handleRemove(interaction) {
  if (!requireGM(interaction)) return;

  const nationName = interaction.options.getString('nation');
  const currencyName = interaction.options.getString('currency');
  const amountStr = interaction.options.getString('amount');
  const reason = interaction.options.getString('reason') || 'Manual removal';

  const nation = await Nation.findOne({ name: { $regex: new RegExp(`^${nationName}$`, 'i') } });
  if (!nation) {
    return interaction.reply({ embeds: [errorEmbed(`Nation **${nationName}** not found.`)], ephemeral: true });
  }

  const amount = parseAbbreviatedNumber(amountStr);
  if (amount <= 0) {
    return interaction.reply({ embeds: [errorEmbed('Amount must be positive.')], ephemeral: true });
  }

  if (!nation.economy.currencies) {
    nation.economy.currencies = new Map();
  }
  const currentAmount = nation.economy.currencies.get(currencyName) || 0;
  const newAmount = currentAmount - amount;
  nation.economy.currencies.set(currencyName, newAmount);
  await nation.save();

  const gameState = await getGameState();

  // Log transaction
  await Transaction.create({
    type: 'expense',
    from: { nation: nation._id, nationName: nation.name },
    currency: currencyName,
    amount: amount,
    description: reason,
    initiatedBy: interaction.user.id,
    turn: gameState?.turn?.current || 0,
  });

  // Audit log
  await createAuditLog({
    entityType: 'nation',
    entityId: nation._id,
    entityName: nation.name,
    action: 'update',
    field: `economy.currencies.${currencyName}`,
    oldValue: currentAmount,
    newValue: newAmount,
    description: `Removed **${formatNumber(amount)}** ${currencyName} from **${nation.name}** (${reason})`,
    performedBy: interaction.user.id,
    performedByTag: interaction.user.tag,
  });

  const balanceText = newAmount < 0 ? `**${formatNumber(newAmount)}** (in debt!)` : `**${formatNumber(newAmount)}**`;
  await interaction.reply({ embeds: [successEmbed(`Removed **${formatNumber(amount)}** ${currencyName} from **${nation.name}**.\nNew balance: ${balanceText}`)] });
}

async function handleIncome(interaction) {
  if (!requireGM(interaction)) return;

  const nationName = interaction.options.getString('nation');
  const currencyName = interaction.options.getString('currency');
  const amountStr = interaction.options.getString('amount');

  const nation = await Nation.findOne({ name: { $regex: new RegExp(`^${nationName}$`, 'i') } });
  if (!nation) {
    return interaction.reply({ embeds: [errorEmbed(`Nation **${nationName}** not found.`)], ephemeral: true });
  }

  const amount = parseAbbreviatedNumber(amountStr);

  if (!nation.economy.income) {
    nation.economy.income = new Map();
  }
  const oldIncome = nation.economy.income.get(currencyName) || 0;
  nation.economy.income.set(currencyName, amount);
  await nation.save();

  // Audit log
  await createAuditLog({
    entityType: 'nation',
    entityId: nation._id,
    entityName: nation.name,
    action: 'update',
    field: `economy.income.${currencyName}`,
    oldValue: oldIncome,
    newValue: amount,
    description: `**${nation.name}** ${currencyName} income set to **${formatNumber(amount)}**/turn`,
    performedBy: interaction.user.id,
    performedByTag: interaction.user.tag,
  });

  const incomeText = amount >= 0 ? `+${formatNumber(amount)}` : formatNumber(amount);
  await interaction.reply({ embeds: [successEmbed(`**${nation.name}**'s ${currencyName} income set to **${incomeText}** per turn.`)] });
}

export async function autocomplete(interaction) {
  const focusedOption = interaction.options.getFocused(true);

  if (focusedOption.name === 'nation') {
    const nations = await Nation.find({
      name: { $regex: focusedOption.value, $options: 'i' }
    }).limit(25);
    await interaction.respond(nations.map(n => ({ name: n.name, value: n.name })));
  } else if (focusedOption.name === 'currency') {
    const currencies = await getAllCurrencies();
    const filtered = currencies.filter(c =>
      c.name.toLowerCase().includes(focusedOption.value.toLowerCase())
    ).slice(0, 25);
    await interaction.respond(filtered.map(c => ({ name: `${c.icon} ${c.name}`, value: c.name })));
  }
}
