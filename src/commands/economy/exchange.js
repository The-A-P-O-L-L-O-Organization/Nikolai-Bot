import { SlashCommandBuilder } from 'discord.js';
import Nation from '../../database/models/Nation.js';
import { ExchangeRate, EconomicCrisis } from '../../database/models/Economy.js';
import { createAuditLog } from '../../database/models/AuditLog.js';
import { createHistoryEntry } from '../../database/models/HistoryEntry.js';
import { isGM, requireGM, canModifyNation } from '../../utils/permissions.js';
import { createEmbed, errorEmbed, successEmbed } from '../../utils/embeds.js';
import { formatNumber } from '../../utils/formatters.js';
import config from '../../config.js';

export const data = new SlashCommandBuilder()
  .setName('exchange')
  .setDescription('Currency exchange operations')
  .addSubcommand(sub =>
    sub.setName('rate')
      .setDescription('View or set exchange rates')
      .addStringOption(opt =>
        opt.setName('from')
          .setDescription('Base currency')
          .setRequired(true))
      .addStringOption(opt =>
        opt.setName('to')
          .setDescription('Target currency')
          .setRequired(true))
      .addNumberOption(opt =>
        opt.setName('rate')
          .setDescription('Set rate (GM only, 1 base = X target)')
          .setRequired(false)
          .setMinValue(0.0001)))
  .addSubcommand(sub =>
    sub.setName('convert')
      .setDescription('Convert currency for a nation')
      .addStringOption(opt =>
        opt.setName('nation')
          .setDescription('Nation exchanging currency')
          .setRequired(true)
          .setAutocomplete(true))
      .addStringOption(opt =>
        opt.setName('from')
          .setDescription('Currency to exchange from')
          .setRequired(true))
      .addStringOption(opt =>
        opt.setName('to')
          .setDescription('Currency to exchange to')
          .setRequired(true))
      .addStringOption(opt =>
        opt.setName('amount')
          .setDescription('Amount to exchange')
          .setRequired(true)))
  .addSubcommand(sub =>
    sub.setName('rates')
      .setDescription('View all exchange rates'))
  .addSubcommand(sub =>
    sub.setName('history')
      .setDescription('View rate change history')
      .addStringOption(opt =>
        opt.setName('currency')
          .setDescription('Currency to view history for')
          .setRequired(true)));

export async function execute(interaction) {
  const subcommand = interaction.options.getSubcommand();
  
  switch (subcommand) {
    case 'rate':
      return handleRate(interaction);
    case 'convert':
      return handleConvert(interaction);
    case 'rates':
      return handleRates(interaction);
    case 'history':
      return handleHistory(interaction);
    default:
      return interaction.reply({ embeds: [errorEmbed('Unknown subcommand')], ephemeral: true });
  }
}

async function handleRate(interaction) {
  const guildId = interaction.guildId;
  const fromCurrency = interaction.options.getString('from');
  const toCurrency = interaction.options.getString('to');
  const newRate = interaction.options.getNumber('rate');
  
  if (newRate !== null) {
    // Setting rate - GM only
    const gmCheck = await requireGM(interaction);
    if (!gmCheck) return;
    
    // Update or create rate
    const existingRate = await ExchangeRate.findOne({
      guildId,
      baseCurrency: fromCurrency,
      targetCurrency: toCurrency
    });
    
    if (existingRate) {
      existingRate.previousRate = existingRate.rate;
      existingRate.rate = newRate;
      existingRate.lastUpdated = new Date();
      existingRate.updatedBy = interaction.user.id;
      await existingRate.save();
    } else {
      await ExchangeRate.create({
        guildId,
        baseCurrency: fromCurrency,
        targetCurrency: toCurrency,
        rate: newRate,
        updatedBy: interaction.user.id,
      });
      
      // Also create inverse rate
      await ExchangeRate.findOneAndUpdate(
        { guildId, baseCurrency: toCurrency, targetCurrency: fromCurrency },
        {
          rate: 1 / newRate,
          updatedBy: interaction.user.id,
          lastUpdated: new Date(),
        },
        { upsert: true }
      );
    }
    
    await createAuditLog({
      guildId,
      action: 'exchange_rate_set',
      performedBy: interaction.user.id,
      target: `${fromCurrency} -> ${toCurrency}`,
      details: { rate: newRate },
    });
    
    const embed = successEmbed('Exchange Rate Set')
      .addFields(
        { name: 'From', value: fromCurrency, inline: true },
        { name: 'To', value: toCurrency, inline: true },
        { name: 'Rate', value: `1 ${fromCurrency} = ${newRate} ${toCurrency}`, inline: true }
      );
    
    return interaction.reply({ embeds: [embed] });
  } else {
    // Viewing rate
    const rate = await ExchangeRate.findOne({
      guildId,
      baseCurrency: fromCurrency,
      targetCurrency: toCurrency
    });
    
    if (!rate) {
      return interaction.reply({ 
        embeds: [errorEmbed(`No exchange rate set for ${fromCurrency} to ${toCurrency}`)], 
        ephemeral: true 
      });
    }
    
    const changeText = rate.previousRate 
      ? `Previous: ${rate.previousRate.toFixed(4)} (${((rate.rate - rate.previousRate) / rate.previousRate * 100).toFixed(2)}% change)`
      : 'No previous rate';
    
    const embed = createEmbed()
      .setTitle('Exchange Rate')
      .addFields(
        { name: 'Rate', value: `1 ${fromCurrency} = ${rate.rate.toFixed(4)} ${toCurrency}`, inline: false },
        { name: 'History', value: changeText, inline: false },
        { name: 'Last Updated', value: `<t:${Math.floor(rate.lastUpdated.getTime() / 1000)}:R>`, inline: true }
      );
    
    return interaction.reply({ embeds: [embed] });
  }
}

async function handleConvert(interaction) {
  const guildId = interaction.guildId;
  const nationName = interaction.options.getString('nation');
  const fromCurrency = interaction.options.getString('from');
  const toCurrency = interaction.options.getString('to');
  const amountStr = interaction.options.getString('amount');
  
  const nation = await Nation.findOne({ guildId, name: { $regex: new RegExp(`^${nationName}$`, 'i') } });
  if (!nation) {
    return interaction.reply({ embeds: [errorEmbed(`Nation "${nationName}" not found`)], ephemeral: true });
  }
  
  const canModify = await canModifyNation(interaction, nation);
  if (!canModify) {
    return interaction.reply({ embeds: [errorEmbed('You can only convert currency for nations you own')], ephemeral: true });
  }
  
  // Parse amount
  const amount = parseFloat(amountStr.replace(/[^0-9.-]/g, ''));
  if (isNaN(amount) || amount <= 0) {
    return interaction.reply({ embeds: [errorEmbed('Invalid amount')], ephemeral: true });
  }
  
  // Get exchange rate
  const rate = await ExchangeRate.findOne({
    guildId,
    baseCurrency: fromCurrency,
    targetCurrency: toCurrency
  });
  
  if (!rate) {
    return interaction.reply({ 
      embeds: [errorEmbed(`No exchange rate set for ${fromCurrency} to ${toCurrency}. Ask a GM to set one.`)], 
      ephemeral: true 
    });
  }
  
  // Check if nation has enough currency
  const currentFrom = nation.economy.currencies?.get(fromCurrency) || 0;
  if (currentFrom < amount) {
    return interaction.reply({ 
      embeds: [errorEmbed(`Insufficient ${fromCurrency}. Have: ${formatNumber(currentFrom)}, need: ${formatNumber(amount)}`)], 
      ephemeral: true 
    });
  }
  
  // Calculate conversion (with small exchange fee of 2%)
  const exchangeFee = 0.02;
  const convertedAmount = amount * rate.rate * (1 - exchangeFee);
  
  // Update nation currencies
  if (!nation.economy.currencies) nation.economy.currencies = new Map();
  nation.economy.currencies.set(fromCurrency, currentFrom - amount);
  const currentTo = nation.economy.currencies.get(toCurrency) || 0;
  nation.economy.currencies.set(toCurrency, currentTo + convertedAmount);
  await nation.save();
  
  await createHistoryEntry({
    guildId,
    nation: nation._id,
    nationName: nation.name,
    type: 'economic',
    title: 'Currency Exchange',
    description: `Exchanged ${formatNumber(amount)} ${fromCurrency} for ${formatNumber(convertedAmount)} ${toCurrency}`,
    details: { from: fromCurrency, to: toCurrency, amount, converted: convertedAmount, rate: rate.rate },
    performedBy: interaction.user.id,
  });
  
  const embed = successEmbed('Currency Exchanged')
    .addFields(
      { name: 'From', value: `${formatNumber(amount)} ${fromCurrency}`, inline: true },
      { name: 'To', value: `${formatNumber(convertedAmount)} ${toCurrency}`, inline: true },
      { name: 'Rate', value: `1:${rate.rate.toFixed(4)}`, inline: true },
      { name: 'Fee', value: `${(exchangeFee * 100).toFixed(1)}%`, inline: true },
      { name: 'New Balance', value: `${formatNumber(nation.economy.currencies.get(toCurrency))} ${toCurrency}`, inline: true }
    );
  
  return interaction.reply({ embeds: [embed] });
}

async function handleRates(interaction) {
  const guildId = interaction.guildId;
  
  const rates = await ExchangeRate.find({ guildId }).sort({ baseCurrency: 1 });
  
  if (rates.length === 0) {
    return interaction.reply({ 
      embeds: [createEmbed()
        .setTitle('Exchange Rates')
        .setDescription('No exchange rates have been set.')
      ] 
    });
  }
  
  // Group by base currency
  const grouped = {};
  for (const rate of rates) {
    if (!grouped[rate.baseCurrency]) {
      grouped[rate.baseCurrency] = [];
    }
    grouped[rate.baseCurrency].push(rate);
  }
  
  const embed = createEmbed()
    .setTitle('Exchange Rates')
    .setDescription(`${rates.length} exchange rate(s) configured`);
  
  for (const [baseCurrency, currencyRates] of Object.entries(grouped)) {
    const rateList = currencyRates.map(r => {
      const trend = r.previousRate 
        ? (r.rate > r.previousRate ? '📈' : r.rate < r.previousRate ? '📉' : '➡️')
        : '➡️';
      return `${trend} → ${r.targetCurrency}: ${r.rate.toFixed(4)}`;
    }).join('\n');
    
    embed.addFields({
      name: `1 ${baseCurrency} =`,
      value: rateList,
      inline: true
    });
  }
  
  return interaction.reply({ embeds: [embed] });
}

async function handleHistory(interaction) {
  const guildId = interaction.guildId;
  const currency = interaction.options.getString('currency');
  
  const rates = await ExchangeRate.find({
    guildId,
    $or: [{ baseCurrency: currency }, { targetCurrency: currency }]
  });
  
  if (rates.length === 0) {
    return interaction.reply({ 
      embeds: [createEmbed()
        .setTitle(`Exchange History: ${currency}`)
        .setDescription('No exchange rates involving this currency.')
      ] 
    });
  }
  
  const embed = createEmbed()
    .setTitle(`Exchange History: ${currency}`)
    .setDescription(`Rates involving ${currency}`);
  
  for (const rate of rates.slice(0, 15)) {
    const changeText = rate.previousRate
      ? `${rate.previousRate.toFixed(4)} → ${rate.rate.toFixed(4)} (${((rate.rate - rate.previousRate) / rate.previousRate * 100).toFixed(2)}%)`
      : `${rate.rate.toFixed(4)} (initial)`;
    
    embed.addFields({
      name: `${rate.baseCurrency} → ${rate.targetCurrency}`,
      value: `${changeText}\nUpdated: <t:${Math.floor(rate.lastUpdated.getTime() / 1000)}:R>`,
      inline: true
    });
  }
  
  return interaction.reply({ embeds: [embed] });
}

export async function autocomplete(interaction) {
  const focusedOption = interaction.options.getFocused(true);
  const guildId = interaction.guildId;
  
  if (focusedOption.name === 'nation') {
    const nations = await Nation.find({ 
      guildId,
      name: { $regex: focusedOption.value, $options: 'i' }
    }).limit(25).select('name');
    
    return interaction.respond(
      nations.map(n => ({ name: n.name, value: n.name }))
    );
  }
}
