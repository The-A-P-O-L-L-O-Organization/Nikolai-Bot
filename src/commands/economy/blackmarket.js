import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import Nation from '../../database/models/Nation.js';
import BlackMarketTransaction from '../../database/models/BlackMarketTransaction.js';
import Sanction from '../../database/models/Sanction.js';
import { createAuditLog } from '../../database/models/AuditLog.js';
import { createHistoryEntry } from '../../database/models/HistoryEntry.js';
import { isGM, requireGM, canModifyNation } from '../../utils/permissions.js';
import { createEmbed, errorEmbed, successEmbed } from '../../utils/embeds.js';
import { formatNumber } from '../../utils/formatters.js';
import config from '../../config.js';

const ITEM_TYPES = {
  arms: { name: 'Arms', emoji: '🔫', baseRisk: 60 },
  contraband: { name: 'Contraband', emoji: '📦', baseRisk: 40 },
  intelligence: { name: 'Intelligence', emoji: '🕵️', baseRisk: 70 },
  resources: { name: 'Resources', emoji: '⛏️', baseRisk: 30 },
  currency: { name: 'Currency', emoji: '💵', baseRisk: 25 },
  technology: { name: 'Technology', emoji: '💻', baseRisk: 50 },
  mercenaries: { name: 'Mercenaries', emoji: '💀', baseRisk: 65 },
};

export const data = new SlashCommandBuilder()
  .setName('blackmarket')
  .setDescription('Underground economy and illicit trade')
  .addSubcommand(sub =>
    sub.setName('list')
      .setDescription('List an item for sale on the black market')
      .addStringOption(opt =>
        opt.setName('seller')
          .setDescription('Your nation (or anonymous)')
          .setRequired(true)
          .setAutocomplete(true))
      .addStringOption(opt =>
        opt.setName('type')
          .setDescription('Type of item')
          .setRequired(true)
          .addChoices(
            { name: 'Arms', value: 'arms' },
            { name: 'Contraband', value: 'contraband' },
            { name: 'Intelligence', value: 'intelligence' },
            { name: 'Resources', value: 'resources' },
            { name: 'Currency', value: 'currency' },
            { name: 'Technology', value: 'technology' },
            { name: 'Mercenaries', value: 'mercenaries' }
          ))
      .addStringOption(opt =>
        opt.setName('item')
          .setDescription('Item name/description')
          .setRequired(true))
      .addIntegerOption(opt =>
        opt.setName('quantity')
          .setDescription('Quantity available')
          .setRequired(true)
          .setMinValue(1))
      .addIntegerOption(opt =>
        opt.setName('price')
          .setDescription('Price (total)')
          .setRequired(true)
          .setMinValue(1))
      .addStringOption(opt =>
        opt.setName('currency')
          .setDescription('Currency for price')
          .setRequired(false))
      .addBooleanOption(opt =>
        opt.setName('anonymous')
          .setDescription('List anonymously')
          .setRequired(false)))
  .addSubcommand(sub =>
    sub.setName('browse')
      .setDescription('Browse available black market listings')
      .addStringOption(opt =>
        opt.setName('type')
          .setDescription('Filter by type')
          .setRequired(false)
          .addChoices(
            { name: 'Arms', value: 'arms' },
            { name: 'Contraband', value: 'contraband' },
            { name: 'Intelligence', value: 'intelligence' },
            { name: 'Resources', value: 'resources' },
            { name: 'Currency', value: 'currency' },
            { name: 'Technology', value: 'technology' },
            { name: 'Mercenaries', value: 'mercenaries' }
          )))
  .addSubcommand(sub =>
    sub.setName('buy')
      .setDescription('Purchase from the black market')
      .addStringOption(opt =>
        opt.setName('buyer')
          .setDescription('Your nation')
          .setRequired(true)
          .setAutocomplete(true))
      .addStringOption(opt =>
        opt.setName('listing_id')
          .setDescription('Listing ID to purchase')
          .setRequired(true)))
  .addSubcommand(sub =>
    sub.setName('cancel')
      .setDescription('Cancel your listing')
      .addStringOption(opt =>
        opt.setName('listing_id')
          .setDescription('Listing ID to cancel')
          .setRequired(true)))
  .addSubcommand(sub =>
    sub.setName('history')
      .setDescription('View your black market history')
      .addStringOption(opt =>
        opt.setName('nation')
          .setDescription('Your nation')
          .setRequired(true)
          .setAutocomplete(true)))
  .addSubcommand(sub =>
    sub.setName('investigate')
      .setDescription('Investigate black market activity (GM only)')
      .addStringOption(opt =>
        opt.setName('nation')
          .setDescription('Nation to investigate (optional)')
          .setRequired(false)
          .setAutocomplete(true)))
  .addSubcommand(sub =>
    sub.setName('seize')
      .setDescription('Seize a black market transaction (GM only)')
      .addStringOption(opt =>
        opt.setName('transaction_id')
          .setDescription('Transaction ID to seize')
          .setRequired(true)));

export async function execute(interaction) {
  const subcommand = interaction.options.getSubcommand();
  
  switch (subcommand) {
    case 'list':
      return handleList(interaction);
    case 'browse':
      return handleBrowse(interaction);
    case 'buy':
      return handleBuy(interaction);
    case 'cancel':
      return handleCancel(interaction);
    case 'history':
      return handleHistory(interaction);
    case 'investigate':
      return handleInvestigate(interaction);
    case 'seize':
      return handleSeize(interaction);
    default:
      return interaction.reply({ embeds: [errorEmbed('Unknown subcommand')], ephemeral: true });
  }
}

async function handleList(interaction) {
  const guildId = interaction.guildId;
  const sellerName = interaction.options.getString('seller');
  const type = interaction.options.getString('type');
  const itemName = interaction.options.getString('item');
  const quantity = interaction.options.getInteger('quantity');
  const price = interaction.options.getInteger('price');
  const currency = interaction.options.getString('currency') || 'Dollars';
  const anonymous = interaction.options.getBoolean('anonymous') ?? false;
  
  const seller = await Nation.findOne({ guildId, name: { $regex: new RegExp(`^${sellerName}$`, 'i') } });
  if (!seller) {
    return interaction.reply({ embeds: [errorEmbed(`Nation "${sellerName}" not found`)], ephemeral: true });
  }
  
  const canModify = await canModifyNation(interaction.member, seller);
  if (!canModify) {
    return interaction.reply({ embeds: [errorEmbed('You can only list items from nations you own')], ephemeral: true });
  }
  
  const typeInfo = ITEM_TYPES[type];
  const risk = typeInfo.baseRisk + Math.floor(Math.random() * 20) - 10; // +/- 10%
  
  // Set expiration (7 days)
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);
  
  const listing = await BlackMarketTransaction.create({
    guildId,
    seller: seller._id,
    sellerName: anonymous ? 'Anonymous' : seller.name,
    type,
    item: {
      name: itemName,
      quantity,
      description: '',
    },
    price: {
      amount: price,
      currency,
    },
    risk,
    status: 'listed',
    expiresAt,
    createdBy: interaction.user.id,
  });
  
  await createAuditLog({
    guildId,
    action: 'blackmarket_list',
    performedBy: interaction.user.id,
    target: seller.name,
    details: { listingId: listing._id.toString(), type, item: itemName, quantity, price, anonymous },
  });
  
  const embed = successEmbed('Listed on Black Market')
    .setDescription(`${typeInfo.emoji} Your item has been listed`)
    .addFields(
      { name: 'Item', value: `${quantity}x ${itemName}`, inline: true },
      { name: 'Type', value: typeInfo.name, inline: true },
      { name: 'Price', value: `${formatNumber(price)} ${currency}`, inline: true },
      { name: 'Seller', value: anonymous ? 'Anonymous' : seller.name, inline: true },
      { name: 'Detection Risk', value: `${risk}%`, inline: true },
      { name: 'Expires', value: `<t:${Math.floor(expiresAt.getTime() / 1000)}:R>`, inline: true },
      { name: 'Listing ID', value: `\`${listing._id}\``, inline: false }
    );
  
  return interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleBrowse(interaction) {
  const guildId = interaction.guildId;
  const typeFilter = interaction.options.getString('type');
  
  let query = { guildId, status: 'listed' };
  if (typeFilter) {
    query.type = typeFilter;
  }
  
  const listings = await BlackMarketTransaction.find(query)
    .sort({ createdAt: -1 })
    .limit(15);
  
  if (listings.length === 0) {
    return interaction.reply({ 
      embeds: [createEmbed()
        .setTitle('🏴 Black Market')
        .setDescription('No items currently available.')
        .setColor(0x2f3136)
      ],
      ephemeral: true 
    });
  }
  
  const embed = createEmbed()
    .setTitle('🏴 Black Market')
    .setDescription(`${listings.length} item(s) available`)
    .setColor(0x2f3136);
  
  for (const listing of listings.slice(0, 10)) {
    const typeInfo = ITEM_TYPES[listing.type];
    embed.addFields({
      name: `${typeInfo.emoji} ${listing.item.name}`,
      value: `Qty: ${listing.item.quantity} | Price: ${formatNumber(listing.price.amount)} ${listing.price.currency}\nSeller: ${listing.sellerName} | Risk: ${listing.risk}%\nID: \`${listing._id}\``,
      inline: true
    });
  }
  
  embed.setFooter({ text: 'Use /blackmarket buy to purchase' });
  
  return interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleBuy(interaction) {
  const guildId = interaction.guildId;
  const buyerName = interaction.options.getString('buyer');
  const listingId = interaction.options.getString('listing_id');
  
  const buyer = await Nation.findOne({ guildId, name: { $regex: new RegExp(`^${buyerName}$`, 'i') } });
  if (!buyer) {
    return interaction.reply({ embeds: [errorEmbed(`Nation "${buyerName}" not found`)], ephemeral: true });
  }
  
  const canModify = await canModifyNation(interaction.member, buyer);
  if (!canModify) {
    return interaction.reply({ embeds: [errorEmbed('You can only buy with nations you own')], ephemeral: true });
  }
  
  const listing = await BlackMarketTransaction.findById(listingId);
  if (!listing || listing.guildId !== guildId) {
    return interaction.reply({ embeds: [errorEmbed('Listing not found')], ephemeral: true });
  }
  
  if (listing.status !== 'listed') {
    return interaction.reply({ embeds: [errorEmbed(`This listing is ${listing.status}`)], ephemeral: true });
  }
  
  if (listing.seller && listing.seller.equals(buyer._id)) {
    return interaction.reply({ embeds: [errorEmbed('Cannot buy your own listing')], ephemeral: true });
  }
  
  // Check if buyer has enough currency
  const buyerCurrency = buyer.economy.currencies?.get(listing.price.currency) || 0;
  if (buyerCurrency < listing.price.amount) {
    return interaction.reply({ 
      embeds: [errorEmbed(`Insufficient funds. Need ${formatNumber(listing.price.amount)} ${listing.price.currency}, have ${formatNumber(buyerCurrency)}`)], 
      ephemeral: true 
    });
  }
  
  // Check for detection (roll against risk)
  const detectionRoll = Math.random() * 100;
  const detected = detectionRoll < listing.risk;
  
  // Process transaction
  buyer.economy.currencies.set(listing.price.currency, buyerCurrency - listing.price.amount);
  await buyer.save();
  
  // If seller exists, pay them
  if (listing.seller) {
    const seller = await Nation.findById(listing.seller);
    if (seller) {
      const sellerCurrency = seller.economy.currencies?.get(listing.price.currency) || 0;
      if (!seller.economy.currencies) seller.economy.currencies = new Map();
      seller.economy.currencies.set(listing.price.currency, sellerCurrency + listing.price.amount);
      await seller.save();
    }
  }
  
  // Update listing
  listing.status = 'completed';
  listing.buyer = buyer._id;
  listing.buyerName = buyer.name;
  listing.completedAt = new Date();
  listing.detected = detected;
  await listing.save();
  
  await createHistoryEntry({
    guildId,
    nation: buyer._id,
    nationName: buyer.name,
    type: 'economic',
    title: 'Black Market Purchase',
    description: `Purchased ${listing.item.quantity}x ${listing.item.name} for ${formatNumber(listing.price.amount)} ${listing.price.currency}`,
    details: { detected },
    performedBy: interaction.user.id,
  });
  
  const typeInfo = ITEM_TYPES[listing.type];
  const embed = successEmbed('Black Market Purchase Complete')
    .setDescription(`${typeInfo.emoji} You purchased **${listing.item.quantity}x ${listing.item.name}**`)
    .addFields(
      { name: 'Price Paid', value: `${formatNumber(listing.price.amount)} ${listing.price.currency}`, inline: true },
      { name: 'Seller', value: listing.sellerName, inline: true }
    )
    .setColor(0x2f3136);
  
  if (detected) {
    embed.addFields({
      name: '⚠️ Detected!',
      value: 'This transaction has been detected by authorities. There may be consequences.',
      inline: false
    });
    embed.setColor(0xe74c3c);
  }
  
  return interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleCancel(interaction) {
  const guildId = interaction.guildId;
  const listingId = interaction.options.getString('listing_id');
  
  const listing = await BlackMarketTransaction.findById(listingId);
  if (!listing || listing.guildId !== guildId) {
    return interaction.reply({ embeds: [errorEmbed('Listing not found')], ephemeral: true });
  }
  
  // Check ownership
  if (listing.seller) {
    const seller = await Nation.findById(listing.seller);
    if (seller) {
      const canModify = await canModifyNation(interaction.member, seller);
      if (!canModify) {
        const gm = await isGM(interaction);
        if (!gm) {
          return interaction.reply({ embeds: [errorEmbed('You can only cancel your own listings')], ephemeral: true });
        }
      }
    }
  }
  
  if (listing.status !== 'listed') {
    return interaction.reply({ embeds: [errorEmbed(`Cannot cancel - listing is ${listing.status}`)], ephemeral: true });
  }
  
  listing.status = 'cancelled';
  await listing.save();
  
  return interaction.reply({ embeds: [successEmbed('Listing cancelled')], ephemeral: true });
}

async function handleHistory(interaction) {
  const guildId = interaction.guildId;
  const nationName = interaction.options.getString('nation');
  
  const nation = await Nation.findOne({ guildId, name: { $regex: new RegExp(`^${nationName}$`, 'i') } });
  if (!nation) {
    return interaction.reply({ embeds: [errorEmbed(`Nation "${nationName}" not found`)], ephemeral: true });
  }
  
  const canModify = await canModifyNation(interaction.member, nation);
  if (!canModify) {
    return interaction.reply({ embeds: [errorEmbed('You can only view history for nations you own')], ephemeral: true });
  }
  
  const transactions = await BlackMarketTransaction.find({
    guildId,
    $or: [{ seller: nation._id }, { buyer: nation._id }]
  }).sort({ createdAt: -1 }).limit(15);
  
  if (transactions.length === 0) {
    return interaction.reply({ 
      embeds: [createEmbed()
        .setTitle(`Black Market History: ${nation.name}`)
        .setDescription('No black market activity.')
      ],
      ephemeral: true 
    });
  }
  
  const embed = createEmbed()
    .setTitle(`Black Market History: ${nation.name}`)
    .setDescription(`${transactions.length} transaction(s)`)
    .setColor(0x2f3136);
  
  for (const tx of transactions.slice(0, 10)) {
    const role = tx.seller?.equals(nation._id) ? 'Sold' : 'Bought';
    const typeInfo = ITEM_TYPES[tx.type];
    const detectedText = tx.detected ? ' ⚠️ DETECTED' : '';
    
    embed.addFields({
      name: `${typeInfo.emoji} ${role}: ${tx.item.name}`,
      value: `Qty: ${tx.item.quantity} | ${formatNumber(tx.price.amount)} ${tx.price.currency}\nStatus: ${tx.status}${detectedText}`,
      inline: true
    });
  }
  
  return interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleInvestigate(interaction) {
  const gmCheck = await requireGM(interaction);
  if (!gmCheck) return;
  
  const guildId = interaction.guildId;
  const nationName = interaction.options.getString('nation');
  
  let query = { guildId, detected: true };
  let title = 'Detected Black Market Activity';
  
  if (nationName) {
    const nation = await Nation.findOne({ guildId, name: { $regex: new RegExp(`^${nationName}$`, 'i') } });
    if (!nation) {
      return interaction.reply({ embeds: [errorEmbed(`Nation "${nationName}" not found`)], ephemeral: true });
    }
    query.$or = [{ seller: nation._id }, { buyer: nation._id }];
    title = `Black Market Investigation: ${nation.name}`;
    delete query.detected; // Show all activity for specific nation
  }
  
  const transactions = await BlackMarketTransaction.find(query)
    .sort({ createdAt: -1 })
    .limit(20);
  
  if (transactions.length === 0) {
    return interaction.reply({ 
      embeds: [createEmbed()
        .setTitle(title)
        .setDescription('No suspicious activity found.')
      ],
      ephemeral: true 
    });
  }
  
  const embed = createEmbed()
    .setTitle(title)
    .setDescription(`${transactions.length} transaction(s) found`)
    .setColor(0xe74c3c);
  
  for (const tx of transactions.slice(0, 10)) {
    const typeInfo = ITEM_TYPES[tx.type];
    const detectedEmoji = tx.detected ? '🚨' : '✅';
    
    embed.addFields({
      name: `${detectedEmoji} ${typeInfo.emoji} ${tx.item.name}`,
      value: `Seller: ${tx.sellerName || 'Unknown'}\nBuyer: ${tx.buyerName || 'None'}\nPrice: ${formatNumber(tx.price.amount)} ${tx.price.currency}\nStatus: ${tx.status}\nID: \`${tx._id}\``,
      inline: true
    });
  }
  
  return interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleSeize(interaction) {
  const gmCheck = await requireGM(interaction);
  if (!gmCheck) return;
  
  const guildId = interaction.guildId;
  const transactionId = interaction.options.getString('transaction_id');
  
  const transaction = await BlackMarketTransaction.findById(transactionId);
  if (!transaction || transaction.guildId !== guildId) {
    return interaction.reply({ embeds: [errorEmbed('Transaction not found')], ephemeral: true });
  }
  
  if (transaction.status === 'seized') {
    return interaction.reply({ embeds: [errorEmbed('Transaction already seized')], ephemeral: true });
  }
  
  transaction.status = 'seized';
  await transaction.save();
  
  // Record in history if buyer exists
  if (transaction.buyer) {
    await createHistoryEntry({
      guildId,
      nation: transaction.buyer,
      nationName: transaction.buyerName,
      type: 'administrative',
      title: 'Black Market Transaction Seized',
      description: `${transaction.item.name} transaction was seized by authorities`,
      performedBy: interaction.user.id,
    });
  }
  
  const embed = successEmbed('Transaction Seized')
    .setDescription(`Black market transaction has been seized.`)
    .addFields(
      { name: 'Item', value: `${transaction.item.quantity}x ${transaction.item.name}`, inline: true },
      { name: 'Seller', value: transaction.sellerName || 'Unknown', inline: true },
      { name: 'Buyer', value: transaction.buyerName || 'None', inline: true }
    );
  
  return interaction.reply({ embeds: [embed] });
}

export async function autocomplete(interaction) {
  const focusedOption = interaction.options.getFocused(true);
  const guildId = interaction.guildId;
  
  if (['nation', 'seller', 'buyer'].includes(focusedOption.name)) {
    const nations = await Nation.find({ 
      guildId,
      name: { $regex: focusedOption.value, $options: 'i' }
    }).limit(25).select('name');
    
    return interaction.respond(
      nations.map(n => ({ name: n.name, value: n.name }))
    );
  }
}
