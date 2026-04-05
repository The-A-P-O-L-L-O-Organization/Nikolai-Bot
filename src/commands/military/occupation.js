import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import Occupation from '../../database/models/Occupation.js';
import Nation from '../../database/models/Nation.js';
import { requireGM, canModifyNation, isGM } from '../../utils/permissions.js';
import { createEmbed } from '../../utils/embeds.js';
import config from '../../config.js';
import { formatNumber, parseNumber } from '../../utils/formatters.js';

const data = new SlashCommandBuilder()
  .setName('occupation')
  .setDescription('Manage military occupations of territories')
  .addSubcommand(sub =>
    sub
      .setName('create')
      .setDescription('[GM] Create a new occupation')
      .addStringOption(opt =>
        opt.setName('occupier').setDescription('Occupying nation').setRequired(true)
      )
      .addStringOption(opt =>
        opt.setName('occupied').setDescription('Occupied nation/territory name').setRequired(true)
      )
      .addStringOption(opt =>
        opt.setName('type').setDescription('Occupation type')
          .addChoices(
            { name: 'Military', value: 'military' },
            { name: 'Administrative', value: 'administrative' },
            { name: 'Colonial', value: 'colonial' },
            { name: 'Protective', value: 'protective' },
            { name: 'Peacekeeping', value: 'peacekeeping' },
            { name: 'Annexation', value: 'annexation' }
          )
      )
      .addStringOption(opt =>
        opt.setName('territory').setDescription('Specific territory/region name')
      )
      .addStringOption(opt =>
        opt.setName('size').setDescription('Size of occupation')
          .addChoices(
            { name: 'Full Country', value: 'full' },
            { name: 'Partial', value: 'partial' },
            { name: 'Minor Region', value: 'minor' }
          )
      )
  )
  .addSubcommand(sub =>
    sub
      .setName('garrison')
      .setDescription('[GM] Set garrison details for an occupation')
      .addStringOption(opt =>
        opt.setName('occupier').setDescription('Occupying nation').setRequired(true)
      )
      .addStringOption(opt =>
        opt.setName('occupied').setDescription('Occupied territory').setRequired(true)
      )
      .addStringOption(opt =>
        opt.setName('troops').setDescription('Number of garrison troops')
      )
      .addIntegerOption(opt =>
        opt.setName('quality').setDescription('Troop quality (0-100)')
          .setMinValue(0).setMaxValue(100)
      )
      .addStringOption(opt =>
        opt.setName('maintenance').setDescription('Monthly maintenance cost')
      )
      .addStringOption(opt =>
        opt.setName('currency').setDescription('Currency name')
      )
  )
  .addSubcommand(sub =>
    sub
      .setName('resistance')
      .setDescription('[GM] Set resistance levels for an occupation')
      .addStringOption(opt =>
        opt.setName('occupier').setDescription('Occupying nation').setRequired(true)
      )
      .addStringOption(opt =>
        opt.setName('occupied').setDescription('Occupied territory').setRequired(true)
      )
      .addIntegerOption(opt =>
        opt.setName('level').setDescription('Resistance intensity (0-100)')
          .setMinValue(0).setMaxValue(100)
      )
      .addStringOption(opt =>
        opt.setName('type').setDescription('Resistance type')
          .addChoices(
            { name: 'None', value: 'none' },
            { name: 'Passive', value: 'passive' },
            { name: 'Active', value: 'active' },
            { name: 'Armed', value: 'armed' },
            { name: 'Full Insurgency', value: 'insurgency' }
          )
      )
      .addStringOption(opt =>
        opt.setName('partisans').setDescription('Number of active partisans/fighters')
      )
      .addIntegerOption(opt =>
        opt.setName('support').setDescription('Civilian support for resistance (0-100%)')
          .setMinValue(0).setMaxValue(100)
      )
  )
  .addSubcommand(sub =>
    sub
      .setName('policy')
      .setDescription('[GM] Set occupation policies')
      .addStringOption(opt =>
        opt.setName('occupier').setDescription('Occupying nation').setRequired(true)
      )
      .addStringOption(opt =>
        opt.setName('occupied').setDescription('Occupied territory').setRequired(true)
      )
      .addStringOption(opt =>
        opt.setName('governance').setDescription('Governance style')
          .addChoices(
            { name: 'Martial Law', value: 'martial_law' },
            { name: 'Military Administration', value: 'military_admin' },
            { name: 'Puppet Government', value: 'puppet_govt' },
            { name: 'Direct Rule', value: 'direct_rule' },
            { name: 'Autonomy', value: 'autonomy' }
          )
      )
      .addStringOption(opt =>
        opt.setName('civilian').setDescription('Civilian treatment')
          .addChoices(
            { name: 'Harsh', value: 'harsh' },
            { name: 'Strict', value: 'strict' },
            { name: 'Neutral', value: 'neutral' },
            { name: 'Lenient', value: 'lenient' },
            { name: 'Hearts & Minds', value: 'hearts_minds' }
          )
      )
      .addStringOption(opt =>
        opt.setName('economic').setDescription('Economic policy')
          .addChoices(
            { name: 'Exploitation', value: 'exploitation' },
            { name: 'Integration', value: 'integration' },
            { name: 'Development', value: 'development' },
            { name: 'Neglect', value: 'neglect' }
          )
      )
  )
  .addSubcommand(sub =>
    sub
      .setName('extraction')
      .setDescription('[GM] Set resource extraction rates')
      .addStringOption(opt =>
        opt.setName('occupier').setDescription('Occupying nation').setRequired(true)
      )
      .addStringOption(opt =>
        opt.setName('occupied').setDescription('Occupied territory').setRequired(true)
      )
      .addStringOption(opt =>
        opt.setName('resources').setDescription('Resources extracted per turn')
      )
      .addStringOption(opt =>
        opt.setName('wealth').setDescription('Wealth extracted per turn')
      )
      .addStringOption(opt =>
        opt.setName('labor').setDescription('Forced labor force size')
      )
      .addStringOption(opt =>
        opt.setName('level').setDescription('Exploitation level')
          .addChoices(
            { name: 'Minimal', value: 'minimal' },
            { name: 'Moderate', value: 'moderate' },
            { name: 'Heavy', value: 'heavy' },
            { name: 'Total', value: 'total' }
          )
      )
  )
  .addSubcommand(sub =>
    sub
      .setName('event')
      .setDescription('[GM] Record an event during occupation')
      .addStringOption(opt =>
        opt.setName('occupier').setDescription('Occupying nation').setRequired(true)
      )
      .addStringOption(opt =>
        opt.setName('occupied').setDescription('Occupied territory').setRequired(true)
      )
      .addStringOption(opt =>
        opt.setName('type').setDescription('Event type').setRequired(true)
      )
      .addStringOption(opt =>
        opt.setName('description').setDescription('Event description').setRequired(true)
      )
      .addIntegerOption(opt =>
        opt.setName('civilian_casualties').setDescription('Civilian casualties')
      )
      .addIntegerOption(opt =>
        opt.setName('military_casualties').setDescription('Military casualties')
      )
      .addStringOption(opt =>
        opt.setName('response').setDescription('International response')
      )
  )
  .addSubcommand(sub =>
    sub
      .setName('end')
      .setDescription('[GM] End an occupation')
      .addStringOption(opt =>
        opt.setName('occupier').setDescription('Occupying nation').setRequired(true)
      )
      .addStringOption(opt =>
        opt.setName('occupied').setDescription('Occupied territory').setRequired(true)
      )
  )
  .addSubcommand(sub =>
    sub
      .setName('view')
      .setDescription('View occupation details')
      .addStringOption(opt =>
        opt.setName('occupier').setDescription('Occupying nation').setRequired(true)
      )
      .addStringOption(opt =>
        opt.setName('occupied').setDescription('Occupied territory').setRequired(true)
      )
  )
  .addSubcommand(sub =>
    sub
      .setName('list')
      .setDescription('List all occupations')
      .addStringOption(opt =>
        opt.setName('nation').setDescription('Filter by nation (as occupier or occupied)')
      )
      .addBooleanOption(opt =>
        opt.setName('history').setDescription('Show ended occupations')
      )
  );

async function execute(interaction) {
  const guildId = interaction.guild.id;
  const subcommand = interaction.options.getSubcommand();

  // Helper to find occupation
  async function findOccupation(occupierName, occupiedName, activeOnly = true) {
    const occupier = await Nation.findOne({ guildId, name: new RegExp(`^${occupierName}$`, 'i') });
    if (!occupier) return { error: `Nation "${occupierName}" not found.` };
    
    const query = { guildId, occupier: occupier._id, occupiedName: new RegExp(`^${occupiedName}$`, 'i') };
    if (activeOnly) {
      query.status = { $in: ['active', 'resisted', 'stable'] };
    }
    
    const occupation = await Occupation.findOne(query);
    if (!occupation) return { error: `No ${activeOnly ? 'active ' : ''}occupation of "${occupiedName}" by ${occupier.name} found.` };
    
    return { occupation, occupier };
  }

  if (subcommand === 'create') {
    if (!await requireGM(interaction)) return;
    
    const occupierName = interaction.options.getString('occupier');
    const occupiedName = interaction.options.getString('occupied');
    const type = interaction.options.getString('type') || 'military';
    const territoryName = interaction.options.getString('territory');
    const size = interaction.options.getString('size') || 'partial';
    
    const occupier = await Nation.findOne({ guildId, name: new RegExp(`^${occupierName}$`, 'i') });
    if (!occupier) {
      return interaction.reply({
        embeds: [createEmbed({ title: 'Error', description: `Nation "${occupierName}" not found.`, color: config.colors.error })],
        ephemeral: true,
      });
    }
    
    // Check if occupied is a nation
    const occupiedNation = await Nation.findOne({ guildId, name: new RegExp(`^${occupiedName}$`, 'i') });
    
    // Check for existing occupation
    const existing = await Occupation.findOne({
      guildId,
      occupier: occupier._id,
      occupiedName: new RegExp(`^${occupiedName}$`, 'i'),
      status: { $in: ['active', 'resisted', 'stable'] },
    });
    
    if (existing) {
      return interaction.reply({
        embeds: [createEmbed({ title: 'Error', description: `${occupier.name} already occupies ${occupiedName}.`, color: config.colors.error })],
        ephemeral: true,
      });
    }
    
    const occupation = new Occupation({
      guildId,
      occupier: occupier._id,
      occupierName: occupier.name,
      occupied: occupiedNation?._id || null,
      occupiedName: occupiedNation?.name || occupiedName,
      territory: {
        name: territoryName,
        size,
      },
      type,
      status: 'active',
      createdBy: interaction.user.id,
    });
    
    await occupation.save();
    
    return interaction.reply({
      embeds: [createEmbed({
        title: 'Occupation Created',
        description: `**${occupier.name}** now occupies **${occupation.occupiedName}**`,
        color: config.colors.warning,
        fields: [
          { name: 'Type', value: formatOccupationType(type), inline: true },
          { name: 'Size', value: formatSize(size), inline: true },
          { name: 'Territory', value: territoryName || 'General', inline: true },
        ],
        footer: { text: 'Use /occupation garrison, resistance, and policy to configure' },
      })],
    });
  }

  if (subcommand === 'garrison') {
    if (!await requireGM(interaction)) return;
    
    const occupierName = interaction.options.getString('occupier');
    const occupiedName = interaction.options.getString('occupied');
    
    const result = await findOccupation(occupierName, occupiedName);
    if (result.error) {
      return interaction.reply({
        embeds: [createEmbed({ title: 'Error', description: result.error, color: config.colors.error })],
        ephemeral: true,
      });
    }
    
    const { occupation } = result;
    const changes = [];
    
    const troopsStr = interaction.options.getString('troops');
    const quality = interaction.options.getInteger('quality');
    const maintenanceStr = interaction.options.getString('maintenance');
    const currency = interaction.options.getString('currency');
    
    if (troopsStr) {
      const troops = parseNumber(troopsStr);
      if (troops !== null) {
        occupation.garrison.troops = troops;
        changes.push(`Troops: ${formatNumber(troops)}`);
      }
    }
    if (quality !== null) {
      occupation.garrison.quality = quality;
      changes.push(`Quality: ${quality}%`);
    }
    if (maintenanceStr) {
      const maintenance = parseNumber(maintenanceStr);
      if (maintenance !== null) {
        occupation.garrison.monthlyMaintenance = maintenance;
        changes.push(`Maintenance: ${formatNumber(maintenance)}/turn`);
      }
    }
    if (currency) {
      occupation.garrison.currency = currency;
      changes.push(`Currency: ${currency}`);
    }
    
    if (changes.length === 0) {
      return interaction.reply({
        embeds: [createEmbed({ title: 'No Changes', description: 'No garrison settings specified.', color: config.colors.warning })],
        ephemeral: true,
      });
    }
    
    await occupation.save();
    
    return interaction.reply({
      embeds: [createEmbed({
        title: 'Garrison Updated',
        description: `**${occupation.occupierName}** occupation of **${occupation.occupiedName}**\n${changes.join('\n')}`,
        color: config.colors.success,
      })],
    });
  }

  if (subcommand === 'resistance') {
    if (!await requireGM(interaction)) return;
    
    const occupierName = interaction.options.getString('occupier');
    const occupiedName = interaction.options.getString('occupied');
    
    const result = await findOccupation(occupierName, occupiedName);
    if (result.error) {
      return interaction.reply({
        embeds: [createEmbed({ title: 'Error', description: result.error, color: config.colors.error })],
        ephemeral: true,
      });
    }
    
    const { occupation } = result;
    const changes = [];
    
    const level = interaction.options.getInteger('level');
    const type = interaction.options.getString('type');
    const partisansStr = interaction.options.getString('partisans');
    const support = interaction.options.getInteger('support');
    
    if (level !== null) {
      occupation.resistance.level = level;
      changes.push(`Resistance Level: ${level}%`);
    }
    if (type) {
      occupation.resistance.type = type;
      changes.push(`Resistance Type: ${formatResistanceType(type)}`);
    }
    if (partisansStr) {
      const partisans = parseNumber(partisansStr);
      if (partisans !== null) {
        occupation.resistance.partisanStrength = partisans;
        changes.push(`Partisans: ${formatNumber(partisans)}`);
      }
    }
    if (support !== null) {
      occupation.resistance.civilianSupport = support;
      changes.push(`Civilian Support: ${support}%`);
    }
    
    // Update status based on resistance
    if (occupation.resistance.level > 70 || occupation.resistance.type === 'insurgency') {
      occupation.status = 'resisted';
    } else if (occupation.resistance.level < 20) {
      occupation.status = 'stable';
    }
    
    if (changes.length === 0) {
      return interaction.reply({
        embeds: [createEmbed({ title: 'No Changes', description: 'No resistance settings specified.', color: config.colors.warning })],
        ephemeral: true,
      });
    }
    
    await occupation.save();
    
    return interaction.reply({
      embeds: [createEmbed({
        title: 'Resistance Updated',
        description: `**${occupation.occupiedName}** resistance:\n${changes.join('\n')}`,
        color: config.colors.success,
      })],
    });
  }

  if (subcommand === 'policy') {
    if (!await requireGM(interaction)) return;
    
    const occupierName = interaction.options.getString('occupier');
    const occupiedName = interaction.options.getString('occupied');
    
    const result = await findOccupation(occupierName, occupiedName);
    if (result.error) {
      return interaction.reply({
        embeds: [createEmbed({ title: 'Error', description: result.error, color: config.colors.error })],
        ephemeral: true,
      });
    }
    
    const { occupation } = result;
    const changes = [];
    
    const governance = interaction.options.getString('governance');
    const civilian = interaction.options.getString('civilian');
    const economic = interaction.options.getString('economic');
    
    if (governance) {
      occupation.policies.governance = governance;
      changes.push(`Governance: ${formatGovernance(governance)}`);
    }
    if (civilian) {
      occupation.policies.civilianTreatment = civilian;
      changes.push(`Civilian Treatment: ${formatCivilianTreatment(civilian)}`);
    }
    if (economic) {
      occupation.policies.economicPolicy = economic;
      changes.push(`Economic Policy: ${formatEconomicPolicy(economic)}`);
    }
    
    if (changes.length === 0) {
      return interaction.reply({
        embeds: [createEmbed({ title: 'No Changes', description: 'No policies specified.', color: config.colors.warning })],
        ephemeral: true,
      });
    }
    
    await occupation.save();
    
    return interaction.reply({
      embeds: [createEmbed({
        title: 'Policies Updated',
        description: `**${occupation.occupierName}** occupation of **${occupation.occupiedName}**:\n${changes.join('\n')}`,
        color: config.colors.success,
      })],
    });
  }

  if (subcommand === 'extraction') {
    if (!await requireGM(interaction)) return;
    
    const occupierName = interaction.options.getString('occupier');
    const occupiedName = interaction.options.getString('occupied');
    
    const result = await findOccupation(occupierName, occupiedName);
    if (result.error) {
      return interaction.reply({
        embeds: [createEmbed({ title: 'Error', description: result.error, color: config.colors.error })],
        ephemeral: true,
      });
    }
    
    const { occupation } = result;
    const changes = [];
    
    const resourcesStr = interaction.options.getString('resources');
    const wealthStr = interaction.options.getString('wealth');
    const laborStr = interaction.options.getString('labor');
    const level = interaction.options.getString('level');
    
    if (resourcesStr) {
      const resources = parseNumber(resourcesStr);
      if (resources !== null) {
        occupation.extraction.resourcesPerTurn = resources;
        changes.push(`Resources/Turn: ${formatNumber(resources)}`);
      }
    }
    if (wealthStr) {
      const wealth = parseNumber(wealthStr);
      if (wealth !== null) {
        occupation.extraction.wealthPerTurn = wealth;
        changes.push(`Wealth/Turn: ${formatNumber(wealth)}`);
      }
    }
    if (laborStr) {
      const labor = parseNumber(laborStr);
      if (labor !== null) {
        occupation.extraction.laborForce = labor;
        changes.push(`Labor Force: ${formatNumber(labor)}`);
      }
    }
    if (level) {
      occupation.extraction.exploitationLevel = level;
      changes.push(`Exploitation: ${level.charAt(0).toUpperCase() + level.slice(1)}`);
    }
    
    if (changes.length === 0) {
      return interaction.reply({
        embeds: [createEmbed({ title: 'No Changes', description: 'No extraction settings specified.', color: config.colors.warning })],
        ephemeral: true,
      });
    }
    
    await occupation.save();
    
    return interaction.reply({
      embeds: [createEmbed({
        title: 'Extraction Updated',
        description: `**${occupation.occupiedName}** extraction:\n${changes.join('\n')}`,
        color: config.colors.success,
      })],
    });
  }

  if (subcommand === 'event') {
    if (!await requireGM(interaction)) return;
    
    const occupierName = interaction.options.getString('occupier');
    const occupiedName = interaction.options.getString('occupied');
    const eventType = interaction.options.getString('type');
    const description = interaction.options.getString('description');
    const civilianCasualties = interaction.options.getInteger('civilian_casualties') || 0;
    const militaryCasualties = interaction.options.getInteger('military_casualties') || 0;
    const response = interaction.options.getString('response') || '';
    
    const result = await findOccupation(occupierName, occupiedName);
    if (result.error) {
      return interaction.reply({
        embeds: [createEmbed({ title: 'Error', description: result.error, color: config.colors.error })],
        ephemeral: true,
      });
    }
    
    const { occupation } = result;
    
    occupation.events.push({
      type: eventType,
      description,
      casualtiesCivilian: civilianCasualties,
      casualtiesMilitary: militaryCasualties,
      internationalResponse: response,
    });
    
    // Increase international pressure for atrocities
    if (civilianCasualties > 100) {
      occupation.internationalPressure = Math.min(100, occupation.internationalPressure + 10);
    }
    
    await occupation.save();
    
    const fields = [
      { name: 'Event Type', value: eventType, inline: true },
      { name: 'Description', value: description, inline: false },
    ];
    
    if (civilianCasualties || militaryCasualties) {
      fields.push({ name: 'Casualties', value: `Civilian: ${formatNumber(civilianCasualties)}\nMilitary: ${formatNumber(militaryCasualties)}`, inline: true });
    }
    if (response) {
      fields.push({ name: 'International Response', value: response, inline: false });
    }
    
    return interaction.reply({
      embeds: [createEmbed({
        title: 'Event Recorded',
        description: `Event in **${occupation.occupiedName}**`,
        color: config.colors.warning,
        fields,
      })],
    });
  }

  if (subcommand === 'end') {
    if (!await requireGM(interaction)) return;
    
    const occupierName = interaction.options.getString('occupier');
    const occupiedName = interaction.options.getString('occupied');
    
    const result = await findOccupation(occupierName, occupiedName);
    if (result.error) {
      return interaction.reply({
        embeds: [createEmbed({ title: 'Error', description: result.error, color: config.colors.error })],
        ephemeral: true,
      });
    }
    
    const { occupation } = result;
    
    occupation.status = 'ended';
    occupation.endDate = new Date();
    await occupation.save();
    
    return interaction.reply({
      embeds: [createEmbed({
        title: 'Occupation Ended',
        description: `**${occupation.occupierName}** has ended their occupation of **${occupation.occupiedName}**`,
        color: config.colors.success,
      })],
    });
  }

  if (subcommand === 'view') {
    const occupierName = interaction.options.getString('occupier');
    const occupiedName = interaction.options.getString('occupied');
    
    const result = await findOccupation(occupierName, occupiedName, false);
    if (result.error) {
      return interaction.reply({
        embeds: [createEmbed({ title: 'Error', description: result.error, color: config.colors.error })],
        ephemeral: true,
      });
    }
    
    const { occupation } = result;
    
    const fields = [
      { name: 'Type', value: formatOccupationType(occupation.type), inline: true },
      { name: 'Status', value: formatStatus(occupation.status), inline: true },
      { name: 'Duration', value: getDuration(occupation.startDate, occupation.endDate), inline: true },
      { name: '\u200B', value: '**Garrison:**', inline: false },
      { name: 'Troops', value: formatNumber(occupation.garrison.troops), inline: true },
      { name: 'Quality', value: `${occupation.garrison.quality}%`, inline: true },
      { name: 'Maintenance', value: `${formatNumber(occupation.garrison.monthlyMaintenance)} ${occupation.garrison.currency}/turn`, inline: true },
      { name: '\u200B', value: '**Resistance:**', inline: false },
      { name: 'Level', value: `${occupation.resistance.level}%`, inline: true },
      { name: 'Type', value: formatResistanceType(occupation.resistance.type), inline: true },
      { name: 'Partisans', value: formatNumber(occupation.resistance.partisanStrength), inline: true },
      { name: '\u200B', value: '**Policies:**', inline: false },
      { name: 'Governance', value: formatGovernance(occupation.policies.governance), inline: true },
      { name: 'Civilian Treatment', value: formatCivilianTreatment(occupation.policies.civilianTreatment), inline: true },
      { name: 'Economic', value: formatEconomicPolicy(occupation.policies.economicPolicy), inline: true },
    ];
    
    if (occupation.extraction.resourcesPerTurn || occupation.extraction.wealthPerTurn) {
      fields.push(
        { name: '\u200B', value: '**Extraction:**', inline: false },
        { name: 'Resources/Turn', value: formatNumber(occupation.extraction.resourcesPerTurn), inline: true },
        { name: 'Wealth/Turn', value: formatNumber(occupation.extraction.wealthPerTurn), inline: true },
        { name: 'Exploitation', value: occupation.extraction.exploitationLevel.charAt(0).toUpperCase() + occupation.extraction.exploitationLevel.slice(1), inline: true },
      );
    }
    
    if (occupation.internationalPressure > 0) {
      fields.push({ name: 'International Pressure', value: `${occupation.internationalPressure}%`, inline: true });
    }
    
    return interaction.reply({
      embeds: [createEmbed({
        title: `Occupation: ${occupation.occupiedName}`,
        description: `Occupied by **${occupation.occupierName}**`,
        color: occupation.status === 'ended' ? config.colors.primary : config.colors.warning,
        fields,
      })],
    });
  }

  if (subcommand === 'list') {
    const nationName = interaction.options.getString('nation');
    const showHistory = interaction.options.getBoolean('history') || false;
    
    const query = { guildId };
    
    if (!showHistory) {
      query.status = { $in: ['active', 'resisted', 'stable'] };
    }
    
    if (nationName) {
      const nation = await Nation.findOne({ guildId, name: new RegExp(`^${nationName}$`, 'i') });
      if (nation) {
        query.$or = [
          { occupier: nation._id },
          { occupied: nation._id },
          { occupiedName: new RegExp(`^${nationName}$`, 'i') },
        ];
      }
    }
    
    const occupations = await Occupation.find(query).sort({ startDate: -1 }).limit(20);
    
    if (occupations.length === 0) {
      return interaction.reply({
        embeds: [createEmbed({
          title: showHistory ? 'Occupation History' : 'Active Occupations',
          description: 'No occupations found.',
          color: config.colors.primary,
        })],
      });
    }
    
    const lines = occupations.map(o => {
      const status = formatStatusEmoji(o.status);
      const resistance = o.resistance.level > 50 ? ' (High Resistance)' : '';
      return `${status} **${o.occupierName}** → **${o.occupiedName}**${resistance}\n└ ${formatOccupationType(o.type)} | ${getDuration(o.startDate, o.endDate)}`;
    });
    
    return interaction.reply({
      embeds: [createEmbed({
        title: showHistory ? 'Occupation History' : 'Active Occupations',
        description: lines.join('\n\n'),
        color: config.colors.primary,
        footer: { text: `Showing ${occupations.length} occupation(s)` },
      })],
    });
  }
}

function formatOccupationType(type) {
  const map = {
    military: 'Military Occupation',
    administrative: 'Administrative Control',
    colonial: 'Colonial Rule',
    protective: 'Protectorate',
    peacekeeping: 'Peacekeeping Mission',
    annexation: 'Annexation',
  };
  return map[type] || type;
}

function formatSize(size) {
  const map = {
    full: 'Full Country',
    partial: 'Partial Territory',
    minor: 'Minor Region',
  };
  return map[size] || size;
}

function formatResistanceType(type) {
  const map = {
    none: 'None',
    passive: 'Passive Resistance',
    active: 'Active Resistance',
    armed: 'Armed Resistance',
    insurgency: 'Full Insurgency',
  };
  return map[type] || type;
}

function formatGovernance(gov) {
  const map = {
    martial_law: 'Martial Law',
    military_admin: 'Military Administration',
    puppet_govt: 'Puppet Government',
    direct_rule: 'Direct Rule',
    autonomy: 'Autonomy',
  };
  return map[gov] || gov;
}

function formatCivilianTreatment(treatment) {
  const map = {
    harsh: 'Harsh',
    strict: 'Strict',
    neutral: 'Neutral',
    lenient: 'Lenient',
    hearts_minds: 'Hearts & Minds',
  };
  return map[treatment] || treatment;
}

function formatEconomicPolicy(policy) {
  const map = {
    exploitation: 'Exploitation',
    integration: 'Integration',
    development: 'Development',
    neglect: 'Neglect',
  };
  return map[policy] || policy;
}

function formatStatus(status) {
  const map = {
    active: 'Active',
    resisted: 'Under Resistance',
    stable: 'Stable',
    ending: 'Ending',
    ended: 'Ended',
  };
  return map[status] || status;
}

function formatStatusEmoji(status) {
  const map = {
    active: '⚔️',
    resisted: '🔥',
    stable: '✅',
    ending: '🏳️',
    ended: '📜',
  };
  return map[status] || '❓';
}

function getDuration(start, end) {
  const endDate = end || new Date();
  const days = Math.floor((endDate - start) / (1000 * 60 * 60 * 24));
  if (days < 30) return `${days} days`;
  const months = Math.floor(days / 30);
  return `${months} month${months !== 1 ? 's' : ''}`;
}

export default { data, execute };
