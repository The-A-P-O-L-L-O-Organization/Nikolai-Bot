import { SlashCommandBuilder } from 'discord.js';
import Nation from '../../database/models/Nation.js';
import { createAuditLog } from '../../database/models/AuditLog.js';
import { getGameState } from '../../database/models/GameState.js';
import { getAllCurrencies } from '../../database/models/Resource.js';
import { isGM, requireGM } from '../../utils/permissions.js';
import { errorEmbed, successEmbed, createEmbed, listEmbed } from '../../utils/embeds.js';
import { formatNumber, parseAbbreviatedNumber, formatDate } from '../../utils/formatters.js';
import config from '../../config.js';

export const data = new SlashCommandBuilder()
  .setName('loan')
  .setDescription('Manage loans between nations')
  .addSubcommand(sub =>
    sub.setName('create')
      .setDescription('Create a new loan')
      .addStringOption(opt =>
        opt.setName('creditor')
          .setDescription('Nation giving the loan')
          .setRequired(true)
          .setAutocomplete(true))
      .addStringOption(opt =>
        opt.setName('debtor')
          .setDescription('Nation receiving the loan')
          .setRequired(true)
          .setAutocomplete(true))
      .addStringOption(opt =>
        opt.setName('amount')
          .setDescription('Loan amount')
          .setRequired(true))
      .addStringOption(opt =>
        opt.setName('currency')
          .setDescription('Currency')
          .setRequired(true)
          .setAutocomplete(true))
      .addNumberOption(opt =>
        opt.setName('interest')
          .setDescription('Interest rate per turn (default: 0%)')
          .setRequired(false)
          .setMinValue(0)
          .setMaxValue(100)))
  .addSubcommand(sub =>
    sub.setName('pay')
      .setDescription('Pay off a loan')
      .addStringOption(opt =>
        opt.setName('debtor')
          .setDescription('Nation paying the loan')
          .setRequired(true)
          .setAutocomplete(true))
      .addIntegerOption(opt =>
        opt.setName('loan_index')
          .setDescription('Which loan to pay (1, 2, 3, etc.)')
          .setRequired(true)
          .setMinValue(1))
      .addStringOption(opt =>
        opt.setName('amount')
          .setDescription('Amount to pay (leave empty to pay in full)')
          .setRequired(false)))
  .addSubcommand(sub =>
    sub.setName('list')
      .setDescription('List all loans for a nation')
      .addStringOption(opt =>
        opt.setName('nation')
          .setDescription('Nation to view')
          .setRequired(true)
          .setAutocomplete(true)))
  .addSubcommand(sub =>
    sub.setName('forgive')
      .setDescription('Forgive (cancel) a loan')
      .addStringOption(opt =>
        opt.setName('debtor')
          .setDescription('Nation with the loan')
          .setRequired(true)
          .setAutocomplete(true))
      .addIntegerOption(opt =>
        opt.setName('loan_index')
          .setDescription('Which loan to forgive')
          .setRequired(true)
          .setMinValue(1)));

export async function execute(interaction) {
  const subcommand = interaction.options.getSubcommand();

  switch (subcommand) {
    case 'create':
      return handleCreate(interaction);
    case 'pay':
      return handlePay(interaction);
    case 'list':
      return handleList(interaction);
    case 'forgive':
      return handleForgive(interaction);
  }
}

async function handleCreate(interaction) {
  if (!requireGM(interaction)) return;

  const creditorName = interaction.options.getString('creditor');
  const debtorName = interaction.options.getString('debtor');
  const amountStr = interaction.options.getString('amount');
  const currencyName = interaction.options.getString('currency');
  const interestRate = interaction.options.getNumber('interest') || 0;

  const creditor = await Nation.findOne({ name: { $regex: new RegExp(`^${creditorName}$`, 'i') } });
  const debtor = await Nation.findOne({ name: { $regex: new RegExp(`^${debtorName}$`, 'i') } });

  if (!creditor) {
    return interaction.reply({ embeds: [errorEmbed(`Creditor nation **${creditorName}** not found.`)], ephemeral: true });
  }
  if (!debtor) {
    return interaction.reply({ embeds: [errorEmbed(`Debtor nation **${debtorName}** not found.`)], ephemeral: true });
  }
  if (creditor._id.equals(debtor._id)) {
    return interaction.reply({ embeds: [errorEmbed('A nation cannot loan to itself.')], ephemeral: true });
  }

  const amount = parseAbbreviatedNumber(amountStr);
  if (amount <= 0) {
    return interaction.reply({ embeds: [errorEmbed('Loan amount must be positive.')], ephemeral: true });
  }

  // Create loan entry for debtor
  const loan = {
    creditor: creditor._id,
    creditorName: creditor.name,
    amount: amount,
    currency: currencyName,
    interestRate: interestRate,
  };

  if (!debtor.loans) debtor.loans = [];
  debtor.loans.push(loan);

  // Transfer funds
  if (!creditor.economy.currencies) creditor.economy.currencies = new Map();
  if (!debtor.economy.currencies) debtor.economy.currencies = new Map();

  const creditorBalance = creditor.economy.currencies.get(currencyName) || 0;
  const debtorBalance = debtor.economy.currencies.get(currencyName) || 0;

  creditor.economy.currencies.set(currencyName, creditorBalance - amount);
  debtor.economy.currencies.set(currencyName, debtorBalance + amount);

  await creditor.save();
  await debtor.save();

  // Audit log
  await createAuditLog({
    entityType: 'nation',
    entityId: debtor._id,
    entityName: debtor.name,
    action: 'update',
    field: 'loans',
    description: `Loan created: **${creditor.name}** loaned **${formatNumber(amount)}** ${currencyName} to **${debtor.name}** at ${interestRate}% interest`,
    performedBy: interaction.user.id,
    performedByTag: interaction.user.tag,
  });

  const embed = createEmbed({
    title: 'Loan Created',
    color: config.colors.economy,
    fields: [
      { name: 'Creditor', value: creditor.name, inline: true },
      { name: 'Debtor', value: debtor.name, inline: true },
      { name: 'Amount', value: `${formatNumber(amount)} ${currencyName}`, inline: true },
      { name: 'Interest Rate', value: `${interestRate}% per turn`, inline: true },
    ],
  });

  await interaction.reply({ embeds: [embed] });
}

async function handlePay(interaction) {
  if (!requireGM(interaction)) return;

  const debtorName = interaction.options.getString('debtor');
  const loanIndex = interaction.options.getInteger('loan_index') - 1;
  const amountStr = interaction.options.getString('amount');

  const debtor = await Nation.findOne({ name: { $regex: new RegExp(`^${debtorName}$`, 'i') } });
  if (!debtor) {
    return interaction.reply({ embeds: [errorEmbed(`Nation **${debtorName}** not found.`)], ephemeral: true });
  }

  if (!debtor.loans || debtor.loans.length === 0) {
    return interaction.reply({ embeds: [errorEmbed(`**${debtor.name}** has no outstanding loans.`)], ephemeral: true });
  }

  if (loanIndex < 0 || loanIndex >= debtor.loans.length) {
    return interaction.reply({ embeds: [errorEmbed(`Invalid loan index. **${debtor.name}** has ${debtor.loans.length} loan(s).`)], ephemeral: true });
  }

  const loan = debtor.loans[loanIndex];
  const creditor = await Nation.findById(loan.creditor);

  let paymentAmount = amountStr ? parseAbbreviatedNumber(amountStr) : loan.amount;
  paymentAmount = Math.min(paymentAmount, loan.amount); // Can't overpay

  // Deduct from debtor
  if (!debtor.economy.currencies) debtor.economy.currencies = new Map();
  const debtorBalance = debtor.economy.currencies.get(loan.currency) || 0;
  debtor.economy.currencies.set(loan.currency, debtorBalance - paymentAmount);

  // Add to creditor (if still exists)
  if (creditor) {
    if (!creditor.economy.currencies) creditor.economy.currencies = new Map();
    const creditorBalance = creditor.economy.currencies.get(loan.currency) || 0;
    creditor.economy.currencies.set(loan.currency, creditorBalance + paymentAmount);
    await creditor.save();
  }

  // Update or remove loan
  loan.amount -= paymentAmount;
  if (loan.amount <= 0) {
    debtor.loans.splice(loanIndex, 1);
  }

  await debtor.save();

  // Audit log
  await createAuditLog({
    entityType: 'nation',
    entityId: debtor._id,
    entityName: debtor.name,
    action: 'update',
    field: 'loans',
    description: `**${debtor.name}** paid **${formatNumber(paymentAmount)}** ${loan.currency} to **${loan.creditorName}**${loan.amount <= 0 ? ' (loan paid in full)' : ''}`,
    performedBy: interaction.user.id,
    performedByTag: interaction.user.tag,
  });

  const statusText = loan.amount <= 0 
    ? 'Loan paid in full!' 
    : `Remaining: ${formatNumber(loan.amount)} ${loan.currency}`;

  await interaction.reply({ embeds: [successEmbed(`**${debtor.name}** paid **${formatNumber(paymentAmount)}** ${loan.currency} to **${loan.creditorName}**.\n${statusText}`)] });
}

async function handleList(interaction) {
  const nationName = interaction.options.getString('nation');
  const nation = await Nation.findOne({ name: { $regex: new RegExp(`^${nationName}$`, 'i') } });

  if (!nation) {
    return interaction.reply({ embeds: [errorEmbed(`Nation **${nationName}** not found.`)], ephemeral: true });
  }

  if (!nation.loans || nation.loans.length === 0) {
    return interaction.reply({ content: `**${nation.name}** has no outstanding loans.` });
  }

  const embed = createEmbed({
    title: `${nation.name} - Outstanding Loans`,
    color: config.colors.economy,
  });

  const lines = nation.loans.map((loan, i) => {
    let line = `**${i + 1}.** ${formatNumber(loan.amount)} ${loan.currency} owed to **${loan.creditorName}**`;
    if (loan.interestRate > 0) {
      line += ` (${loan.interestRate}% interest/turn)`;
    }
    line += `\n   *Since ${formatDate(loan.createdAt)}*`;
    return line;
  });

  embed.setDescription(lines.join('\n\n'));

  const totalDebt = nation.loans.reduce((sum, loan) => {
    return sum + loan.amount;
  }, 0);
  embed.setFooter({ text: `Total loans: ${nation.loans.length}` });

  await interaction.reply({ embeds: [embed] });
}

async function handleForgive(interaction) {
  if (!requireGM(interaction)) return;

  const debtorName = interaction.options.getString('debtor');
  const loanIndex = interaction.options.getInteger('loan_index') - 1;

  const debtor = await Nation.findOne({ name: { $regex: new RegExp(`^${debtorName}$`, 'i') } });
  if (!debtor) {
    return interaction.reply({ embeds: [errorEmbed(`Nation **${debtorName}** not found.`)], ephemeral: true });
  }

  if (!debtor.loans || loanIndex < 0 || loanIndex >= debtor.loans.length) {
    return interaction.reply({ embeds: [errorEmbed(`Invalid loan index.`)], ephemeral: true });
  }

  const loan = debtor.loans[loanIndex];
  debtor.loans.splice(loanIndex, 1);
  await debtor.save();

  // Audit log
  await createAuditLog({
    entityType: 'nation',
    entityId: debtor._id,
    entityName: debtor.name,
    action: 'update',
    field: 'loans',
    description: `Loan forgiven: **${debtor.name}**'s debt of **${formatNumber(loan.amount)}** ${loan.currency} to **${loan.creditorName}** was cancelled`,
    performedBy: interaction.user.id,
    performedByTag: interaction.user.tag,
  });

  await interaction.reply({ embeds: [successEmbed(`Loan of **${formatNumber(loan.amount)}** ${loan.currency} from **${loan.creditorName}** has been forgiven.`)] });
}

export async function autocomplete(interaction) {
  const focusedOption = interaction.options.getFocused(true);

  if (focusedOption.name === 'creditor' || focusedOption.name === 'debtor' || focusedOption.name === 'nation') {
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
