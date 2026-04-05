import { SlashCommandBuilder } from 'discord.js';
import Nation from '../../database/models/Nation.js';
import { errorEmbed, createEmbed } from '../../utils/embeds.js';
import { formatNumber } from '../../utils/formatters.js';
import config from '../../config.js';

// Leaderboard type configurations
const LEADERBOARD_TYPES = {
  gdp: {
    name: 'GDP',
    emoji: '💰',
    field: 'economy.gdp',
    format: (val) => `$${formatNumber(val)}`,
    description: 'Ranked by Gross Domestic Product',
  },
  population: {
    name: 'Population',
    emoji: '👥',
    field: 'populationNumber',
    format: (val) => formatNumber(val),
    description: 'Ranked by total population',
  },
  military: {
    name: 'Military Power',
    emoji: '⚔️',
    field: null, // Calculated
    format: (val) => formatNumber(val),
    description: 'Ranked by total military strength',
  },
  army: {
    name: 'Army Size',
    emoji: '🪖',
    field: null, // Calculated
    format: (val) => formatNumber(val),
    description: 'Ranked by total army personnel and equipment',
  },
  navy: {
    name: 'Naval Power',
    emoji: '🚢',
    field: null, // Calculated
    format: (val) => formatNumber(val),
    description: 'Ranked by total naval vessels',
  },
  airforce: {
    name: 'Air Force',
    emoji: '✈️',
    field: null, // Calculated
    format: (val) => formatNumber(val),
    description: 'Ranked by total aircraft',
  },
  nukes: {
    name: 'Nuclear Arsenal',
    emoji: '☢️',
    field: 'nukes',
    format: (val) => formatNumber(val),
    description: 'Ranked by nuclear warheads',
  },
  stability: {
    name: 'Stability',
    emoji: '⚖️',
    field: 'stability',
    format: (val) => `${val}%`,
    description: 'Ranked by national stability',
  },
  research: {
    name: 'Research',
    emoji: '🔬',
    field: null, // Calculated from completed.length
    format: (val) => `${val} completed`,
    description: 'Ranked by completed research projects',
  },
};

export const data = new SlashCommandBuilder()
  .setName('leaderboard')
  .setDescription('View nation rankings')
  .addStringOption(opt =>
    opt.setName('type')
      .setDescription('Ranking type')
      .setRequired(false)
      .addChoices(
        { name: 'GDP (Economy)', value: 'gdp' },
        { name: 'Population', value: 'population' },
        { name: 'Military Power (Overall)', value: 'military' },
        { name: 'Army', value: 'army' },
        { name: 'Navy', value: 'navy' },
        { name: 'Air Force', value: 'airforce' },
        { name: 'Nuclear Arsenal', value: 'nukes' },
        { name: 'Stability', value: 'stability' },
        { name: 'Research', value: 'research' },
      ))
  .addIntegerOption(opt =>
    opt.setName('limit')
      .setDescription('Number of nations to show (default: 10)')
      .setRequired(false)
      .setMinValue(1)
      .setMaxValue(25));

export async function execute(interaction) {
  await interaction.deferReply();
  
  const guildId = interaction.guildId;
  const type = interaction.options.getString('type') || 'gdp';
  const limit = interaction.options.getInteger('limit') || 10;

  try {
    const nations = await Nation.find({ guildId });

    if (nations.length === 0) {
      return interaction.editReply({ 
        embeds: [errorEmbed('No nations exist yet. Use `/nation create` to create one.')] 
      });
    }

    const typeConfig = LEADERBOARD_TYPES[type];
    if (!typeConfig) {
      return interaction.editReply({ embeds: [errorEmbed('Invalid leaderboard type.')] });
    }

    // Calculate values and sort
    const ranked = nations.map(nation => ({
      name: nation.name,
      owner: nation.owner,
      value: calculateValue(nation, type),
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);

    // Build leaderboard display
    const medals = ['🥇', '🥈', '🥉'];
    const lines = ranked.map((entry, index) => {
      const position = index < 3 ? medals[index] : `**${index + 1}.**`;
      const ownerStr = entry.owner ? ` (<@${entry.owner}>)` : '';
      return `${position} **${entry.name}**${ownerStr}\n    ${typeConfig.format(entry.value)}`;
    });

    const embed = createEmbed({
      title: `${typeConfig.emoji} ${typeConfig.name} Leaderboard`,
      description: `${typeConfig.description}\n\n${lines.join('\n\n')}`,
      color: config.colors.primary,
      footer: `Showing top ${ranked.length} of ${nations.length} nations`,
    });

    await interaction.editReply({ embeds: [embed] });

  } catch (error) {
    console.error('Leaderboard error:', error);
    await interaction.editReply({ embeds: [errorEmbed(`Failed to load leaderboard: ${error.message}`)] });
  }
}

/**
 * Calculate the value for a nation based on leaderboard type
 */
function calculateValue(nation, type) {
  switch (type) {
    case 'gdp':
      return nation.economy?.gdp || 0;
    
    case 'population':
      return nation.populationNumber || 0;
    
    case 'nukes':
      return nation.nukes || 0;
    
    case 'stability':
      return nation.stability || 0;
    
    case 'research':
      return nation.research?.completed?.length || 0;
    
    case 'army':
      return calculateArmyPower(nation);
    
    case 'navy':
      return calculateNavyPower(nation);
    
    case 'airforce':
      return calculateAirforcePower(nation);
    
    case 'military':
      return calculateMilitaryPower(nation);
    
    default:
      return 0;
  }
}

/**
 * Calculate total army power
 */
function calculateArmyPower(nation) {
  const army = nation.military?.army || {};
  let total = 0;
  
  // Standard units
  total += army.troops || 0;
  total += army.reserves || 0;
  total += (army.tanks || 0) * 10;           // Tanks worth more
  total += (army.artillery || 0) * 5;
  total += (army.armoredVehicles || 0) * 3;
  total += (army.specialForces || 0) * 20;   // Elite units
  
  // Custom units
  if (army.custom instanceof Map) {
    for (const count of army.custom.values()) {
      total += count || 0;
    }
  }
  
  return total;
}

/**
 * Calculate total naval power
 */
function calculateNavyPower(nation) {
  const navy = nation.military?.navy || {};
  let total = 0;
  
  total += (navy.carriers || 0) * 100;       // Carriers are major assets
  total += (navy.submarines || 0) * 30;
  total += (navy.destroyers || 0) * 20;
  total += (navy.frigates || 0) * 15;
  total += (navy.corvettes || 0) * 10;
  total += (navy.battleships || 0) * 50;
  
  // Custom units
  if (navy.custom instanceof Map) {
    for (const count of navy.custom.values()) {
      total += (count || 0) * 10;
    }
  }
  
  return total;
}

/**
 * Calculate total airforce power
 */
function calculateAirforcePower(nation) {
  const airforce = nation.military?.airforce || {};
  let total = 0;
  
  total += (airforce.jets || 0) * 10;
  total += (airforce.bombers || 0) * 20;
  total += (airforce.reconPlanes || 0) * 5;
  total += (airforce.transportPlanes || 0) * 3;
  total += (airforce.helicopters || 0) * 8;
  
  // Custom units
  if (airforce.custom instanceof Map) {
    for (const count of airforce.custom.values()) {
      total += (count || 0) * 5;
    }
  }
  
  return total;
}

/**
 * Calculate overall military power
 */
function calculateMilitaryPower(nation) {
  const army = calculateArmyPower(nation);
  const navy = calculateNavyPower(nation);
  const airforce = calculateAirforcePower(nation);
  const nukes = (nation.nukes || 0) * 1000;  // Nukes are major deterrents
  
  return army + navy + airforce + nukes;
}
