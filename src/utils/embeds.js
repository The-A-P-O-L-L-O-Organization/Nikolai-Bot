import { EmbedBuilder } from 'discord.js';
import config from '../config.js';
import { formatNumber, formatPercentage, formatCurrency, formatDate, formatRelativeTime } from './formatters.js';

/**
 * Create a standard embed with consistent styling
 */
export function createEmbed(options = {}) {
  const embed = new EmbedBuilder()
    .setColor(options.color || config.colors.primary)
    .setTimestamp();
  
  if (options.title) embed.setTitle(options.title);
  if (options.description) embed.setDescription(options.description);
  if (options.thumbnail) embed.setThumbnail(options.thumbnail);
  if (options.image) embed.setImage(options.image);
  if (options.footer) embed.setFooter({ text: options.footer });
  if (options.author) embed.setAuthor(options.author);
  if (options.fields) embed.addFields(options.fields);
  
  return embed;
}

/**
 * Create an error embed
 */
export function errorEmbed(message) {
  return createEmbed({
    title: 'Error',
    description: message,
    color: config.colors.error,
  });
}

/**
 * Create a success embed
 */
export function successEmbed(message) {
  return createEmbed({
    title: 'Success',
    description: message,
    color: config.colors.success,
  });
}

/**
 * Create a warning embed
 */
export function warningEmbed(message) {
  return createEmbed({
    title: 'Warning',
    description: message,
    color: config.colors.warning,
  });
}

/**
 * Create a nation overview embed
 */
export function nationEmbed(nation) {
  const embed = createEmbed({
    title: `${nation.name}`,
    color: config.colors.primary,
    thumbnail: nation.flag || null,
  });

  // Basic Info
  const basicInfo = [
    `**Leader:** ${nation.leader}`,
    `**Population:** ${nation.population}`,
    `**Stability:** ${formatPercentage(nation.stability)}`,
  ];
  if (nation.nukes > 0) {
    basicInfo.push(`**Nukes:** ${formatNumber(nation.nukes)}`);
  }
  embed.addFields({ name: 'Overview', value: basicInfo.join('\n'), inline: false });

  // Economy
  const primaryCurrency = nation.economy.primaryCurrency || 'Dollars';
  const currencyAmount = nation.economy.currencies?.get(primaryCurrency) || 0;
  const economyInfo = [
    `**GDP:** ${formatNumber(nation.economy.gdp)} ${primaryCurrency}`,
    `**Budget:** ${formatNumber(nation.economy.budget)} ${primaryCurrency}`,
    `**Treasury:** ${formatNumber(currencyAmount)} ${primaryCurrency}`,
    `**Inflation:** ${formatPercentage(nation.economy.inflation)}`,
  ];
  embed.addFields({ name: 'Economy', value: economyInfo.join('\n'), inline: true });

  // Army
  const army = nation.military?.army || {};
  const armyInfo = [];
  if (army.troops) armyInfo.push(`Troops: ${formatNumber(army.troops)}${army.reserves ? ` (${formatNumber(army.reserves)} reserves)` : ''}`);
  if (army.tanks) armyInfo.push(`Tanks: ${formatNumber(army.tanks)}`);
  if (army.artillery) armyInfo.push(`Artillery: ${formatNumber(army.artillery)}`);
  if (army.armoredVehicles) armyInfo.push(`Armored Vehicles: ${formatNumber(army.armoredVehicles)}`);
  if (army.specialForces) armyInfo.push(`Special Forces: ${formatNumber(army.specialForces)}`);
  
  if (armyInfo.length > 0) {
    embed.addFields({ name: 'Army', value: armyInfo.join('\n'), inline: true });
  }

  // Airforce
  const airforce = nation.military?.airforce || {};
  const airforceInfo = [];
  if (airforce.jets) airforceInfo.push(`Jet Fighters: ${formatNumber(airforce.jets)}`);
  if (airforce.bombers) airforceInfo.push(`Bombers: ${formatNumber(airforce.bombers)}`);
  if (airforce.reconPlanes) airforceInfo.push(`Recon Planes: ${formatNumber(airforce.reconPlanes)}`);
  if (airforce.transportPlanes) airforceInfo.push(`Transport Planes: ${formatNumber(airforce.transportPlanes)}`);
  if (airforce.helicopters) airforceInfo.push(`Helicopters: ${formatNumber(airforce.helicopters)}`);
  
  if (airforceInfo.length > 0) {
    embed.addFields({ name: 'Airforce', value: airforceInfo.join('\n'), inline: true });
  }

  // Navy
  const navy = nation.military?.navy || {};
  const navyInfo = [];
  if (navy.carriers) navyInfo.push(`Carriers: ${formatNumber(navy.carriers)}`);
  if (navy.submarines) navyInfo.push(`Submarines: ${formatNumber(navy.submarines)}`);
  if (navy.destroyers) navyInfo.push(`Destroyers: ${formatNumber(navy.destroyers)}`);
  if (navy.frigates) navyInfo.push(`Frigates: ${formatNumber(navy.frigates)}`);
  if (navy.corvettes) navyInfo.push(`Corvettes: ${formatNumber(navy.corvettes)}`);
  if (navy.battleships) navyInfo.push(`Battleships: ${formatNumber(navy.battleships)}`);
  
  if (navyInfo.length > 0) {
    embed.addFields({ name: 'Navy', value: navyInfo.join('\n'), inline: true });
  }

  // Spirits
  if (nation.spirits && nation.spirits.length > 0) {
    const spiritsText = nation.spirits.map(spirit => {
      let text = `**${spirit.name}**`;
      if (spirit.description) {
        text += `\n${spirit.description.substring(0, 200)}${spirit.description.length > 200 ? '...' : ''}`;
      }
      return text;
    }).join('\n\n');
    
    embed.addFields({ name: 'Spirits', value: spiritsText.substring(0, 1024), inline: false });
  }

  // Owner
  if (nation.owner) {
    embed.setFooter({ text: `Owned by: ${nation.owner}` });
  }

  return embed;
}

/**
 * Create an economy embed for a nation
 */
export function economyEmbed(nation, resources = []) {
  const embed = createEmbed({
    title: `${nation.name} - Economy`,
    color: config.colors.economy,
  });

  // Primary currency
  const primaryCurrency = nation.economy.primaryCurrency || 'Dollars';
  
  // Overview
  embed.addFields({
    name: 'Overview',
    value: [
      `**GDP:** ${formatNumber(nation.economy.gdp)} ${primaryCurrency}`,
      `**Budget:** ${formatNumber(nation.economy.budget)} ${primaryCurrency}`,
      `**Inflation:** ${formatPercentage(nation.economy.inflation)}`,
    ].join('\n'),
    inline: false,
  });

  // Currencies
  const currencies = [];
  const currencyResources = resources.filter(r => r.type === 'currency');
  
  for (const resource of currencyResources) {
    const amount = nation.economy.currencies?.get(resource.name) || 0;
    const income = nation.economy.income?.get(resource.name) || 0;
    let line = `${resource.icon} **${resource.name}:** ${formatNumber(amount)}`;
    if (income !== 0) {
      line += ` (${income >= 0 ? '+' : ''}${formatNumber(income)}/turn)`;
    }
    if (resource.name === primaryCurrency) {
      line += ' *(Primary)*';
    }
    currencies.push(line);
  }
  
  if (currencies.length > 0) {
    embed.addFields({ name: 'Currencies', value: currencies.join('\n'), inline: false });
  }

  // Resources
  const resourceItems = [];
  const nonCurrencyResources = resources.filter(r => r.type === 'resource');
  
  for (const resource of nonCurrencyResources) {
    const amount = nation.resources?.get(resource.name) || 0;
    const income = nation.resourceIncome?.get(resource.name) || 0;
    if (amount !== 0 || income !== 0) {
      let line = `${resource.icon} **${resource.name}:** ${formatNumber(amount)}`;
      if (income !== 0) {
        line += ` (${income >= 0 ? '+' : ''}${formatNumber(income)}/turn)`;
      }
      resourceItems.push(line);
    }
  }
  
  if (resourceItems.length > 0) {
    embed.addFields({ name: 'Resources', value: resourceItems.join('\n'), inline: false });
  }

  // Loans
  if (nation.loans && nation.loans.length > 0) {
    const loansText = nation.loans.map(loan => 
      `• ${formatNumber(loan.amount)} ${loan.currency} owed to ${loan.creditorName} (${loan.interestRate}% interest)`
    ).join('\n');
    embed.addFields({ name: 'Outstanding Loans', value: loansText, inline: false });
  }

  return embed;
}

/**
 * Create a military embed for a nation
 */
export function militaryEmbed(nation) {
  const embed = createEmbed({
    title: `${nation.name} - Military`,
    color: config.colors.military,
  });

  // Nukes
  if (nation.nukes > 0) {
    embed.addFields({
      name: 'Nuclear Arsenal',
      value: `**${formatNumber(nation.nukes)}** nuclear weapons`,
      inline: false,
    });
  }

  // Army
  const army = nation.military?.army || {};
  const armyLines = [];
  if (army.troops) armyLines.push(`**Troops:** ${formatNumber(army.troops)}${army.reserves ? ` (${formatNumber(army.reserves)} in reserve)` : ''}`);
  if (army.tanks) armyLines.push(`**Tanks:** ${formatNumber(army.tanks)}`);
  if (army.artillery) armyLines.push(`**Artillery:** ${formatNumber(army.artillery)}`);
  if (army.armoredVehicles) armyLines.push(`**Armored Vehicles:** ${formatNumber(army.armoredVehicles)}`);
  if (army.specialForces) armyLines.push(`**Special Forces:** ${formatNumber(army.specialForces)}`);
  
  // Custom army units
  if (army.custom) {
    for (const [name, count] of army.custom.entries()) {
      if (count > 0) armyLines.push(`**${name}:** ${formatNumber(count)}`);
    }
  }
  
  if (armyLines.length > 0) {
    embed.addFields({ name: 'Army', value: armyLines.join('\n'), inline: true });
  }

  // Airforce
  const airforce = nation.military?.airforce || {};
  const airLines = [];
  if (airforce.jets) airLines.push(`**Jet Fighters:** ${formatNumber(airforce.jets)}`);
  if (airforce.bombers) airLines.push(`**Bombers:** ${formatNumber(airforce.bombers)}`);
  if (airforce.reconPlanes) airLines.push(`**Recon Planes:** ${formatNumber(airforce.reconPlanes)}`);
  if (airforce.transportPlanes) airLines.push(`**Transport Planes:** ${formatNumber(airforce.transportPlanes)}`);
  if (airforce.helicopters) airLines.push(`**Helicopters:** ${formatNumber(airforce.helicopters)}`);
  
  if (airforce.custom) {
    for (const [name, count] of airforce.custom.entries()) {
      if (count > 0) airLines.push(`**${name}:** ${formatNumber(count)}`);
    }
  }
  
  if (airLines.length > 0) {
    embed.addFields({ name: 'Airforce', value: airLines.join('\n'), inline: true });
  }

  // Navy
  const navy = nation.military?.navy || {};
  const navyLines = [];
  if (navy.carriers) navyLines.push(`**Carriers:** ${formatNumber(navy.carriers)}`);
  if (navy.submarines) navyLines.push(`**Submarines:** ${formatNumber(navy.submarines)}`);
  if (navy.destroyers) navyLines.push(`**Destroyers:** ${formatNumber(navy.destroyers)}`);
  if (navy.frigates) navyLines.push(`**Frigates:** ${formatNumber(navy.frigates)}`);
  if (navy.corvettes) navyLines.push(`**Corvettes:** ${formatNumber(navy.corvettes)}`);
  if (navy.battleships) navyLines.push(`**Battleships:** ${formatNumber(navy.battleships)}`);
  
  if (navy.custom) {
    for (const [name, count] of navy.custom.entries()) {
      if (count > 0) navyLines.push(`**${name}:** ${formatNumber(count)}`);
    }
  }
  
  if (navyLines.length > 0) {
    embed.addFields({ name: 'Navy', value: navyLines.join('\n'), inline: true });
  }

  // Production Queue
  if (nation.productionQueue && nation.productionQueue.length > 0) {
    const queueText = nation.productionQueue.map((item, index) => 
      `${index + 1}. **${item.unitType}** x${formatNumber(item.quantity)} (${item.turnsRemaining} turns remaining)`
    ).join('\n');
    embed.addFields({ name: 'Production Queue', value: queueText, inline: false });
  }

  return embed;
}

/**
 * Create a war status embed
 */
export function warEmbed(war) {
  const embed = createEmbed({
    title: war.name,
    color: war.status === 'active' ? config.colors.error : config.colors.primary,
  });

  // Aggressors
  const aggressorNames = war.aggressors.map(a => a.nationName).join(', ');
  embed.addFields({ name: 'Aggressors', value: aggressorNames || 'None', inline: true });

  // Defenders
  const defenderNames = war.defenders.map(d => d.nationName).join(', ');
  embed.addFields({ name: 'Defenders', value: defenderNames || 'None', inline: true });

  // Status
  embed.addFields({ name: 'Status', value: war.status.toUpperCase(), inline: true });

  // Reason
  if (war.reason) {
    embed.addFields({ name: 'Casus Belli', value: war.reason, inline: false });
  }

  // Dates
  embed.addFields({ 
    name: 'Started', 
    value: formatDate(war.startedAt), 
    inline: true 
  });
  
  if (war.endedAt) {
    embed.addFields({ 
      name: 'Ended', 
      value: formatDate(war.endedAt), 
      inline: true 
    });
  }

  // Outcome
  if (war.outcome) {
    embed.addFields({ name: 'Outcome', value: war.outcome.replace(/_/g, ' ').toUpperCase(), inline: false });
  }

  return embed;
}

/**
 * Create a treaty embed
 */
export function treatyEmbed(treaty) {
  const embed = createEmbed({
    title: treaty.name,
    description: treaty.description || null,
    color: config.colors.diplomacy,
  });

  // Type
  embed.addFields({ 
    name: 'Type', 
    value: treaty.type.replace(/_/g, ' ').toUpperCase(), 
    inline: true 
  });

  // Status
  embed.addFields({ 
    name: 'Status', 
    value: treaty.status.toUpperCase(), 
    inline: true 
  });

  // Members
  const memberList = treaty.members.map(m => 
    `• ${m.nationName}${m.role !== 'member' ? ` (${m.role})` : ''}`
  ).join('\n');
  embed.addFields({ name: 'Signatories', value: memberList || 'None', inline: false });

  // Terms
  if (treaty.terms && treaty.terms.length > 0) {
    const termsText = treaty.terms.map((t, i) => `${i + 1}. ${t}`).join('\n');
    embed.addFields({ name: 'Terms', value: termsText.substring(0, 1024), inline: false });
  }

  // Dates
  embed.addFields({ name: 'Signed', value: formatDate(treaty.signedAt), inline: true });
  if (treaty.expiresAt) {
    embed.addFields({ name: 'Expires', value: formatDate(treaty.expiresAt), inline: true });
  }

  return embed;
}

/**
 * Create a turn summary embed
 */
export function turnSummaryEmbed(turnNumber, year, changes) {
  const embed = createEmbed({
    title: `Turn ${turnNumber} Processed`,
    description: `**Year:** ${year}`,
    color: config.colors.success,
  });

  if (changes.income && changes.income.length > 0) {
    embed.addFields({
      name: 'Income Processed',
      value: changes.income.slice(0, 10).join('\n') + (changes.income.length > 10 ? `\n...and ${changes.income.length - 10} more` : ''),
      inline: false,
    });
  }

  if (changes.production && changes.production.length > 0) {
    embed.addFields({
      name: 'Production Completed',
      value: changes.production.slice(0, 10).join('\n'),
      inline: false,
    });
  }

  if (changes.research && changes.research.length > 0) {
    embed.addFields({
      name: 'Research Completed',
      value: changes.research.join('\n'),
      inline: false,
    });
  }

  if (changes.events && changes.events.length > 0) {
    embed.addFields({
      name: 'Events',
      value: changes.events.join('\n'),
      inline: false,
    });
  }

  return embed;
}

/**
 * Create a paginated list embed
 */
export function listEmbed(title, items, page = 1, perPage = 10) {
  const totalPages = Math.ceil(items.length / perPage);
  const start = (page - 1) * perPage;
  const pageItems = items.slice(start, start + perPage);
  
  const embed = createEmbed({
    title: title,
    description: pageItems.join('\n') || 'No items',
    footer: `Page ${page}/${totalPages} • ${items.length} total`,
  });
  
  return embed;
}
