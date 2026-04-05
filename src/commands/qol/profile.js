import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } from 'discord.js';
import Nation from '../../database/models/Nation.js';
import FogOfWar from '../../database/models/FogOfWar.js';
import Reputation from '../../database/models/Reputation.js';
import Infrastructure from '../../database/models/Infrastructure.js';
import Project from '../../database/models/Project.js';
import { isGM, canModifyNation } from '../../utils/permissions.js';
import { createEmbed, errorEmbed } from '../../utils/embeds.js';
import { formatNumber } from '../../utils/formatters.js';
import config from '../../config.js';

export const data = new SlashCommandBuilder()
  .setName('profile')
  .setDescription('View detailed nation profile')
  .addStringOption(opt =>
    opt.setName('nation')
      .setDescription('Nation to view')
      .setRequired(true)
      .setAutocomplete(true))
  .addStringOption(opt =>
    opt.setName('section')
      .setDescription('Specific section to view')
      .setRequired(false)
      .addChoices(
        { name: 'Overview', value: 'overview' },
        { name: 'Economy', value: 'economy' },
        { name: 'Military', value: 'military' },
        { name: 'Resources', value: 'resources' },
        { name: 'Diplomacy', value: 'diplomacy' },
        { name: 'Infrastructure', value: 'infrastructure' },
        { name: 'Projects', value: 'projects' }
      ))
  .addBooleanOption(opt =>
    opt.setName('public')
      .setDescription('Show publicly in channel (default: ephemeral)')
      .setRequired(false));

export async function execute(interaction) {
  const guildId = interaction.guildId;
  const nationName = interaction.options.getString('nation');
  const section = interaction.options.getString('section') || 'overview';
  const isPublic = interaction.options.getBoolean('public') ?? false;
  
  const nation = await Nation.findOne({ guildId, name: { $regex: new RegExp(`^${nationName}$`, 'i') } });
  
  if (!nation) {
    return interaction.reply({ embeds: [errorEmbed(`Nation "${nationName}" not found`)], ephemeral: true });
  }
  
  // Check if viewer is owner or GM
  const isOwner = nation.owner === interaction.user.id;
  const gm = await isGM(interaction);
  const fullAccess = isOwner || gm;
  
  // Build the embed based on section
  let embed;
  switch (section) {
    case 'overview':
      embed = await buildOverviewEmbed(nation, fullAccess, guildId);
      break;
    case 'economy':
      embed = buildEconomyEmbed(nation, fullAccess);
      break;
    case 'military':
      embed = buildMilitaryEmbed(nation, fullAccess);
      break;
    case 'resources':
      embed = buildResourcesEmbed(nation, fullAccess);
      break;
    case 'diplomacy':
      embed = await buildDiplomacyEmbed(nation, guildId);
      break;
    case 'infrastructure':
      embed = await buildInfrastructureEmbed(nation, guildId);
      break;
    case 'projects':
      embed = await buildProjectsEmbed(nation, guildId);
      break;
    default:
      embed = await buildOverviewEmbed(nation, fullAccess, guildId);
  }
  
  // Build navigation row
  const navRow = new ActionRowBuilder()
    .addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`profile_nav:${nation._id}:${fullAccess ? '1' : '0'}`)
        .setPlaceholder('View section...')
        .addOptions([
          { label: 'Overview', value: 'overview', description: 'General nation information', emoji: '📋', default: section === 'overview' },
          { label: 'Economy', value: 'economy', description: 'Budget, GDP, currencies', emoji: '💰', default: section === 'economy' },
          { label: 'Military', value: 'military', description: 'Armed forces breakdown', emoji: '⚔️', default: section === 'military' },
          { label: 'Resources', value: 'resources', description: 'Resource stockpiles and income', emoji: '📦', default: section === 'resources' },
          { label: 'Diplomacy', value: 'diplomacy', description: 'Reputation and relations', emoji: '🤝', default: section === 'diplomacy' },
          { label: 'Infrastructure', value: 'infrastructure', description: 'Buildings and facilities', emoji: '🏗️', default: section === 'infrastructure' },
          { label: 'Projects', value: 'projects', description: 'Megaprojects and wonders', emoji: '🏛️', default: section === 'projects' },
        ])
    );
  
  return interaction.reply({ 
    embeds: [embed], 
    components: [navRow],
    ephemeral: !isPublic 
  });
}

async function buildOverviewEmbed(nation, fullAccess, guildId) {
  const embed = createEmbed()
    .setTitle(`${nation.name}`)
    .setThumbnail(nation.flag || null);
  
  if (nation.description) {
    embed.setDescription(nation.description);
  }
  
  // Basic info
  embed.addFields(
    { name: 'Leader', value: nation.leader || 'Unknown', inline: true },
    { name: 'Population', value: nation.population || 'Unknown', inline: true },
    { name: 'Stability', value: `${nation.stability}%`, inline: true }
  );
  
  // Economy summary
  const primaryCurrency = nation.economy?.primaryCurrency || 'Dollars';
  const budget = nation.economy?.currencies?.get(primaryCurrency) || nation.economy?.budget || 0;
  embed.addFields(
    { name: 'Treasury', value: `${formatNumber(budget)} ${primaryCurrency}`, inline: true },
    { name: 'GDP', value: `$${formatNumber(nation.economy?.gdp || 0)}`, inline: true }
  );
  
  // Nukes (if any)
  if (nation.nukes > 0 || fullAccess) {
    embed.addFields({ name: 'Nuclear Arsenal', value: nation.nukes.toString(), inline: true });
  }
  
  // Military summary
  const totalArmy = (nation.military?.army?.troops || 0) + (nation.military?.army?.reserves || 0);
  const totalNavy = Object.values(nation.military?.navy || {}).reduce((sum, val) => typeof val === 'number' ? sum + val : sum, 0);
  const totalAir = Object.values(nation.military?.airforce || {}).reduce((sum, val) => typeof val === 'number' ? sum + val : sum, 0);
  
  embed.addFields({
    name: 'Military Summary',
    value: `Army: ${formatNumber(totalArmy)} | Navy: ${formatNumber(totalNavy)} | Air: ${formatNumber(totalAir)}`,
    inline: false
  });
  
  // Spirits
  if (nation.spirits && nation.spirits.length > 0) {
    const spiritList = nation.spirits.slice(0, 5).map(s => s.name).join(', ');
    embed.addFields({ name: 'National Spirits', value: spiritList, inline: false });
  }
  
  // Production queue (if owner/GM)
  if (fullAccess && nation.productionQueue && nation.productionQueue.length > 0) {
    const queueText = nation.productionQueue.slice(0, 3).map(p => 
      `${p.quantity}x ${p.unitType} (${p.turnsRemaining} turns)`
    ).join('\n');
    embed.addFields({ name: 'Production Queue', value: queueText, inline: false });
  }
  
  // Research (if owner/GM)
  if (fullAccess && nation.research?.current) {
    embed.addFields({
      name: 'Current Research',
      value: `${nation.research.current} (${nation.research.turnsRemaining} turns remaining)`,
      inline: false
    });
  }
  
  // Owner
  if (nation.owner) {
    embed.setFooter({ text: `Owned by user ID: ${nation.owner}` });
  }
  
  return embed;
}

function buildEconomyEmbed(nation, fullAccess) {
  const embed = createEmbed()
    .setTitle(`${nation.name} - Economy`)
    .setThumbnail(nation.flag || null);
  
  const primaryCurrency = nation.economy?.primaryCurrency || 'Dollars';
  
  // Main currencies
  embed.addFields(
    { name: 'Primary Currency', value: primaryCurrency, inline: true },
    { name: 'GDP', value: `$${formatNumber(nation.economy?.gdp || 0)}`, inline: true },
    { name: 'Inflation', value: `${nation.economy?.inflation || 0}%`, inline: true }
  );
  
  // All currencies
  if (nation.economy?.currencies && nation.economy.currencies.size > 0) {
    const currencyList = [];
    for (const [currency, amount] of nation.economy.currencies.entries()) {
      currencyList.push(`${currency}: ${formatNumber(amount)}`);
    }
    embed.addFields({ name: 'Treasury', value: currencyList.join('\n') || 'Empty', inline: false });
  }
  
  // Income (if full access)
  if (fullAccess && nation.economy?.income && nation.economy.income.size > 0) {
    const incomeList = [];
    for (const [source, amount] of nation.economy.income.entries()) {
      incomeList.push(`${source}: ${amount >= 0 ? '+' : ''}${formatNumber(amount)}/turn`);
    }
    embed.addFields({ name: 'Income', value: incomeList.join('\n') || 'None', inline: true });
  }
  
  // Expenses (if full access)
  if (fullAccess && nation.economy?.expenses && nation.economy.expenses.size > 0) {
    const expenseList = [];
    for (const [expense, amount] of nation.economy.expenses.entries()) {
      expenseList.push(`${expense}: -${formatNumber(amount)}/turn`);
    }
    embed.addFields({ name: 'Expenses', value: expenseList.join('\n') || 'None', inline: true });
  }
  
  // Loans
  if (nation.loans && nation.loans.length > 0) {
    const loanList = nation.loans.slice(0, 5).map(loan => 
      `${formatNumber(loan.amount)} ${loan.currency} from ${loan.creditorName || 'Unknown'} (${loan.interestRate}% interest)`
    );
    embed.addFields({ name: 'Outstanding Loans', value: loanList.join('\n'), inline: false });
  }
  
  // Debts owed TO this nation
  if (fullAccess && nation.debts && nation.debts.length > 0) {
    const debtList = nation.debts.slice(0, 5).map(debt => 
      `${formatNumber(debt.amount)} ${debt.currency} owed (${debt.interestRate}% interest)`
    );
    embed.addFields({ name: 'Money Owed to You', value: debtList.join('\n'), inline: false });
  }
  
  return embed;
}

function buildMilitaryEmbed(nation, fullAccess) {
  const embed = createEmbed()
    .setTitle(`${nation.name} - Military`)
    .setThumbnail(nation.flag || null);
  
  // Army
  const army = nation.military?.army || {};
  const armyLines = [];
  if (army.troops) armyLines.push(`Active Troops: ${formatNumber(army.troops)}`);
  if (army.reserves) armyLines.push(`Reserves: ${formatNumber(army.reserves)}`);
  if (army.tanks) armyLines.push(`Tanks: ${formatNumber(army.tanks)}`);
  if (army.artillery) armyLines.push(`Artillery: ${formatNumber(army.artillery)}`);
  if (army.armoredVehicles) armyLines.push(`Armored Vehicles: ${formatNumber(army.armoredVehicles)}`);
  if (army.specialForces) armyLines.push(`Special Forces: ${formatNumber(army.specialForces)}`);
  
  // Custom army units
  if (army.custom && army.custom.size > 0) {
    for (const [unit, count] of army.custom.entries()) {
      if (count > 0) armyLines.push(`${unit}: ${formatNumber(count)}`);
    }
  }
  
  embed.addFields({ name: '🪖 Army', value: armyLines.length > 0 ? armyLines.join('\n') : 'No army', inline: true });
  
  // Air Force
  const airforce = nation.military?.airforce || {};
  const airLines = [];
  if (airforce.jets) airLines.push(`Fighter Jets: ${formatNumber(airforce.jets)}`);
  if (airforce.bombers) airLines.push(`Bombers: ${formatNumber(airforce.bombers)}`);
  if (airforce.reconPlanes) airLines.push(`Recon Planes: ${formatNumber(airforce.reconPlanes)}`);
  if (airforce.transportPlanes) airLines.push(`Transport: ${formatNumber(airforce.transportPlanes)}`);
  if (airforce.helicopters) airLines.push(`Helicopters: ${formatNumber(airforce.helicopters)}`);
  
  if (airforce.custom && airforce.custom.size > 0) {
    for (const [unit, count] of airforce.custom.entries()) {
      if (count > 0) airLines.push(`${unit}: ${formatNumber(count)}`);
    }
  }
  
  embed.addFields({ name: '✈️ Air Force', value: airLines.length > 0 ? airLines.join('\n') : 'No air force', inline: true });
  
  // Navy
  const navy = nation.military?.navy || {};
  const navyLines = [];
  if (navy.carriers) navyLines.push(`Carriers: ${formatNumber(navy.carriers)}`);
  if (navy.battleships) navyLines.push(`Battleships: ${formatNumber(navy.battleships)}`);
  if (navy.destroyers) navyLines.push(`Destroyers: ${formatNumber(navy.destroyers)}`);
  if (navy.submarines) navyLines.push(`Submarines: ${formatNumber(navy.submarines)}`);
  if (navy.frigates) navyLines.push(`Frigates: ${formatNumber(navy.frigates)}`);
  if (navy.corvettes) navyLines.push(`Corvettes: ${formatNumber(navy.corvettes)}`);
  
  if (navy.custom && navy.custom.size > 0) {
    for (const [unit, count] of navy.custom.entries()) {
      if (count > 0) navyLines.push(`${unit}: ${formatNumber(count)}`);
    }
  }
  
  embed.addFields({ name: '🚢 Navy', value: navyLines.length > 0 ? navyLines.join('\n') : 'No navy', inline: true });
  
  // Nuclear Arsenal
  embed.addFields({ name: '☢️ Nuclear Arsenal', value: nation.nukes.toString(), inline: true });
  
  // Production queue (if owner/GM)
  if (fullAccess && nation.productionQueue && nation.productionQueue.length > 0) {
    const queueText = nation.productionQueue.map(p => 
      `${p.quantity}x ${p.unitType} (${p.turnsRemaining}/${p.totalTurns} turns)`
    ).join('\n');
    embed.addFields({ name: '🔨 Production Queue', value: queueText, inline: false });
  }
  
  return embed;
}

function buildResourcesEmbed(nation, fullAccess) {
  const embed = createEmbed()
    .setTitle(`${nation.name} - Resources`)
    .setThumbnail(nation.flag || null);
  
  // Current resources
  if (nation.resources && nation.resources.size > 0) {
    const resourceList = [];
    for (const [resource, amount] of nation.resources.entries()) {
      resourceList.push(`${resource}: ${formatNumber(amount)}`);
    }
    embed.addFields({ name: '📦 Stockpiles', value: resourceList.join('\n'), inline: true });
  } else {
    embed.addFields({ name: '📦 Stockpiles', value: 'No resources', inline: true });
  }
  
  // Resource income (if full access)
  if (fullAccess && nation.resourceIncome && nation.resourceIncome.size > 0) {
    const incomeList = [];
    for (const [resource, amount] of nation.resourceIncome.entries()) {
      incomeList.push(`${resource}: ${amount >= 0 ? '+' : ''}${formatNumber(amount)}/turn`);
    }
    embed.addFields({ name: '📈 Income per Turn', value: incomeList.join('\n'), inline: true });
  }
  
  return embed;
}

async function buildDiplomacyEmbed(nation, guildId) {
  const embed = createEmbed()
    .setTitle(`${nation.name} - Diplomacy`)
    .setThumbnail(nation.flag || null);
  
  // Get reputation records
  const reputations = await Reputation.find({
    guildId,
    $or: [{ nation1: nation._id }, { nation2: nation._id }]
  }).populate('nation1 nation2').limit(10);
  
  if (reputations.length > 0) {
    const relationList = reputations.map(rep => {
      const otherNation = rep.nation1._id.equals(nation._id) ? rep.nation2 : rep.nation1;
      const statusEmoji = {
        'ally': '💚',
        'friendly': '💙',
        'neutral': '⬜',
        'unfriendly': '🟠',
        'hostile': '❤️',
        'war': '⚔️'
      };
      return `${statusEmoji[rep.status] || '⬜'} ${otherNation.name}: ${rep.reputation} (${rep.status})`;
    });
    embed.addFields({ name: 'Relations', value: relationList.join('\n'), inline: false });
  } else {
    embed.addFields({ name: 'Relations', value: 'No diplomatic relations established', inline: false });
  }
  
  return embed;
}

async function buildInfrastructureEmbed(nation, guildId) {
  const embed = createEmbed()
    .setTitle(`${nation.name} - Infrastructure`)
    .setThumbnail(nation.flag || null);
  
  // Get infrastructure
  const infrastructure = await Infrastructure.find({ 
    guildId, 
    nation: nation._id,
    status: { $ne: 'destroyed' }
  }).limit(20);
  
  if (infrastructure.length === 0) {
    embed.setDescription('No infrastructure built yet.');
    return embed;
  }
  
  // Group by category
  const byCategory = {};
  for (const infra of infrastructure) {
    const cat = infra.category || 'other';
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(infra);
  }
  
  const categoryEmojis = {
    economic: '💰',
    military: '⚔️',
    civilian: '🏠',
    industrial: '🏭',
    transport: '🚂',
    special: '⭐',
    other: '📦'
  };
  
  for (const [category, items] of Object.entries(byCategory)) {
    const itemList = items.slice(0, 5).map(i => {
      const statusIcon = i.status === 'active' ? '✅' : i.status === 'constructing' ? '🔨' : '⚠️';
      return `${statusIcon} ${i.name} (Lvl ${i.level})`;
    }).join('\n');
    
    embed.addFields({
      name: `${categoryEmojis[category] || '📦'} ${category.charAt(0).toUpperCase() + category.slice(1)}`,
      value: itemList,
      inline: true
    });
  }
  
  embed.setFooter({ text: `Total: ${infrastructure.length} infrastructure(s)` });
  
  return embed;
}

async function buildProjectsEmbed(nation, guildId) {
  const embed = createEmbed()
    .setTitle(`${nation.name} - Megaprojects`)
    .setThumbnail(nation.flag || null);
  
  // Get projects
  const projects = await Project.find({ 
    guildId, 
    nation: nation._id 
  }).limit(15);
  
  if (projects.length === 0) {
    embed.setDescription('No megaprojects or wonders undertaken.');
    return embed;
  }
  
  const statusEmojis = {
    planning: '📋',
    active: '🔨',
    paused: '⏸️',
    completed: '✅',
    failed: '❌',
    abandoned: '🚫'
  };
  
  // Active/In Progress
  const active = projects.filter(p => p.status === 'active' || p.status === 'planning');
  if (active.length > 0) {
    const activeList = active.map(p => {
      const progress = Math.round(p.progress);
      return `${statusEmojis[p.status]} **${p.name}** - ${progress}% (${p.turnsRemaining} turns)`;
    }).join('\n');
    embed.addFields({ name: 'In Progress', value: activeList, inline: false });
  }
  
  // Completed
  const completed = projects.filter(p => p.status === 'completed');
  if (completed.length > 0) {
    const completedList = completed.slice(0, 5).map(p => `✅ ${p.name}`).join('\n');
    embed.addFields({ name: 'Completed', value: completedList, inline: true });
  }
  
  // Failed/Abandoned
  const failed = projects.filter(p => p.status === 'failed' || p.status === 'abandoned');
  if (failed.length > 0) {
    const failedList = failed.slice(0, 3).map(p => `${statusEmojis[p.status]} ${p.name}`).join('\n');
    embed.addFields({ name: 'Failed/Abandoned', value: failedList, inline: true });
  }
  
  return embed;
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
