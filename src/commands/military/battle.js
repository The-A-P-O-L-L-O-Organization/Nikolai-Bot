import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import Battle from '../../database/models/Battle.js';
import Nation from '../../database/models/Nation.js';
import Doctrine from '../../database/models/Doctrine.js';
import { requireGM, canModifyNation, isGM } from '../../utils/permissions.js';
import { createEmbed } from '../../utils/embeds.js';
import config from '../../config.js';
import { formatNumber, parseNumber } from '../../utils/formatters.js';

const data = new SlashCommandBuilder()
  .setName('battle')
  .setDescription('Simulate and manage military battles')
  .addSubcommand(sub =>
    sub
      .setName('create')
      .setDescription('[GM] Create a new battle simulation')
      .addStringOption(opt =>
        opt.setName('name').setDescription('Battle name').setRequired(true)
      )
      .addStringOption(opt =>
        opt.setName('attacker').setDescription('Attacking nation').setRequired(true)
      )
      .addStringOption(opt =>
        opt.setName('defender').setDescription('Defending nation').setRequired(true)
      )
      .addStringOption(opt =>
        opt.setName('type').setDescription('Type of battle')
          .addChoices(
            { name: 'Pitched Battle', value: 'pitched' },
            { name: 'Siege', value: 'siege' },
            { name: 'Ambush', value: 'ambush' },
            { name: 'Naval Battle', value: 'naval' },
            { name: 'Aerial Battle', value: 'aerial' },
            { name: 'Amphibious Assault', value: 'amphibious' },
            { name: 'Defensive Stand', value: 'defensive' },
            { name: 'Pursuit', value: 'pursuit' },
            { name: 'Skirmish', value: 'skirmish' }
          )
      )
      .addStringOption(opt =>
        opt.setName('terrain').setDescription('Terrain type')
          .addChoices(
            { name: 'Plains', value: 'plains' },
            { name: 'Forest', value: 'forest' },
            { name: 'Mountains', value: 'mountains' },
            { name: 'Urban', value: 'urban' },
            { name: 'Desert', value: 'desert' },
            { name: 'Jungle', value: 'jungle' },
            { name: 'Arctic', value: 'arctic' },
            { name: 'Coastal', value: 'coastal' },
            { name: 'River Crossing', value: 'river' },
            { name: 'Marsh/Swamp', value: 'marsh' },
            { name: 'Hills', value: 'hills' }
          )
      )
      .addStringOption(opt =>
        opt.setName('location').setDescription('Location/region name')
      )
  )
  .addSubcommand(sub =>
    sub
      .setName('forces')
      .setDescription('[GM] Set forces for a side in a battle')
      .addStringOption(opt =>
        opt.setName('battle').setDescription('Battle name').setRequired(true)
      )
      .addStringOption(opt =>
        opt.setName('side').setDescription('Which side')
          .setRequired(true)
          .addChoices(
            { name: 'Attacker', value: 'attacker' },
            { name: 'Defender', value: 'defender' }
          )
      )
      .addStringOption(opt =>
        opt.setName('unit_type').setDescription('Type of unit').setRequired(true)
      )
      .addStringOption(opt =>
        opt.setName('quantity').setDescription('Number of units').setRequired(true)
      )
      .addIntegerOption(opt =>
        opt.setName('quality').setDescription('Unit quality/experience (0-100)')
          .setMinValue(0).setMaxValue(100)
      )
  )
  .addSubcommand(sub =>
    sub
      .setName('modifiers')
      .setDescription('[GM] Set combat modifiers for a side')
      .addStringOption(opt =>
        opt.setName('battle').setDescription('Battle name').setRequired(true)
      )
      .addStringOption(opt =>
        opt.setName('side').setDescription('Which side')
          .setRequired(true)
          .addChoices(
            { name: 'Attacker', value: 'attacker' },
            { name: 'Defender', value: 'defender' }
          )
      )
      .addIntegerOption(opt =>
        opt.setName('terrain').setDescription('Terrain modifier').setMinValue(-50).setMaxValue(50)
      )
      .addIntegerOption(opt =>
        opt.setName('supply').setDescription('Supply modifier').setMinValue(-50).setMaxValue(50)
      )
      .addIntegerOption(opt =>
        opt.setName('morale').setDescription('Morale modifier').setMinValue(-50).setMaxValue(50)
      )
      .addIntegerOption(opt =>
        opt.setName('technology').setDescription('Technology modifier').setMinValue(-50).setMaxValue(50)
      )
      .addIntegerOption(opt =>
        opt.setName('fortifications').setDescription('Fortification modifier').setMinValue(-50).setMaxValue(50)
      )
      .addIntegerOption(opt =>
        opt.setName('air_support').setDescription('Air support modifier').setMinValue(-50).setMaxValue(50)
      )
      .addIntegerOption(opt =>
        opt.setName('naval_support').setDescription('Naval support modifier').setMinValue(-50).setMaxValue(50)
      )
      .addIntegerOption(opt =>
        opt.setName('surprise').setDescription('Surprise modifier').setMinValue(-50).setMaxValue(50)
      )
      .addIntegerOption(opt =>
        opt.setName('custom').setDescription('Custom modifier').setMinValue(-100).setMaxValue(100)
      )
  )
  .addSubcommand(sub =>
    sub
      .setName('commander')
      .setDescription('[GM] Set commander for a side')
      .addStringOption(opt =>
        opt.setName('battle').setDescription('Battle name').setRequired(true)
      )
      .addStringOption(opt =>
        opt.setName('side').setDescription('Which side')
          .setRequired(true)
          .addChoices(
            { name: 'Attacker', value: 'attacker' },
            { name: 'Defender', value: 'defender' }
          )
      )
      .addStringOption(opt =>
        opt.setName('name').setDescription('Commander name').setRequired(true)
      )
  )
  .addSubcommand(sub =>
    sub
      .setName('simulate')
      .setDescription('[GM] Run the battle simulation')
      .addStringOption(opt =>
        opt.setName('battle').setDescription('Battle name').setRequired(true)
      )
  )
  .addSubcommand(sub =>
    sub
      .setName('resolve')
      .setDescription('[GM] Manually resolve a battle with custom outcome')
      .addStringOption(opt =>
        opt.setName('battle').setDescription('Battle name').setRequired(true)
      )
      .addStringOption(opt =>
        opt.setName('victor').setDescription('Who won')
          .setRequired(true)
          .addChoices(
            { name: 'Attacker Victory', value: 'attacker' },
            { name: 'Defender Victory', value: 'defender' },
            { name: 'Draw', value: 'draw' },
            { name: 'Pyrrhic Attacker Victory', value: 'pyrrhic_attacker' },
            { name: 'Pyrrhic Defender Victory', value: 'pyrrhic_defender' }
          )
      )
      .addStringOption(opt =>
        opt.setName('decisiveness').setDescription('How decisive')
          .addChoices(
            { name: 'Decisive', value: 'decisive' },
            { name: 'Marginal', value: 'marginal' },
            { name: 'Pyrrhic', value: 'pyrrhic' },
            { name: 'Stalemate', value: 'stalemate' }
          )
      )
      .addIntegerOption(opt =>
        opt.setName('attacker_casualties').setDescription('Attacker casualty percentage')
          .setMinValue(0).setMaxValue(100)
      )
      .addIntegerOption(opt =>
        opt.setName('defender_casualties').setDescription('Defender casualty percentage')
          .setMinValue(0).setMaxValue(100)
      )
      .addStringOption(opt =>
        opt.setName('narrative').setDescription('Battle narrative/description')
      )
  )
  .addSubcommand(sub =>
    sub
      .setName('view')
      .setDescription('View battle details')
      .addStringOption(opt =>
        opt.setName('battle').setDescription('Battle name').setRequired(true)
      )
  )
  .addSubcommand(sub =>
    sub
      .setName('list')
      .setDescription('List battles')
      .addStringOption(opt =>
        opt.setName('status').setDescription('Filter by status')
          .addChoices(
            { name: 'Setup', value: 'setup' },
            { name: 'Simulated', value: 'simulated' },
            { name: 'Resolved', value: 'resolved' },
            { name: 'All', value: 'all' }
          )
      )
      .addStringOption(opt =>
        opt.setName('nation').setDescription('Filter by nation involvement')
      )
  )
  .addSubcommand(sub =>
    sub
      .setName('delete')
      .setDescription('[GM] Delete a battle')
      .addStringOption(opt =>
        opt.setName('battle').setDescription('Battle name').setRequired(true)
      )
  );

async function execute(interaction) {
  const guildId = interaction.guild.id;
  const subcommand = interaction.options.getSubcommand();

  if (subcommand === 'create') {
    if (!await requireGM(interaction)) return;
    
    const name = interaction.options.getString('name');
    const attackerName = interaction.options.getString('attacker');
    const defenderName = interaction.options.getString('defender');
    const battleType = interaction.options.getString('type') || 'pitched';
    const terrain = interaction.options.getString('terrain') || 'plains';
    const location = interaction.options.getString('location');
    
    const attacker = await Nation.findOne({ guildId, name: new RegExp(`^${attackerName}$`, 'i') });
    if (!attacker) {
      return interaction.reply({
        embeds: [createEmbed({ title: 'Error', description: `Nation "${attackerName}" not found.`, color: config.colors.error })],
        ephemeral: true,
      });
    }
    
    const defender = await Nation.findOne({ guildId, name: new RegExp(`^${defenderName}$`, 'i') });
    if (!defender) {
      return interaction.reply({
        embeds: [createEmbed({ title: 'Error', description: `Nation "${defenderName}" not found.`, color: config.colors.error })],
        ephemeral: true,
      });
    }
    
    // Check for existing battle with same name
    const existing = await Battle.findOne({ guildId, name });
    if (existing) {
      return interaction.reply({
        embeds: [createEmbed({ title: 'Error', description: `Battle "${name}" already exists.`, color: config.colors.error })],
        ephemeral: true,
      });
    }
    
    // Apply doctrine bonuses
    const attackerDoctrine = await Doctrine.findOne({ guildId, assignedTo: attacker._id, isTemplate: false });
    const defenderDoctrine = await Doctrine.findOne({ guildId, assignedTo: defender._id, isTemplate: false });
    
    const battle = new Battle({
      guildId,
      name,
      battleType,
      terrain,
      location,
      attacker: {
        nation: attacker._id,
        nationName: attacker.name,
        modifiers: {
          doctrine: attackerDoctrine?.modifiers?.attack || 0,
        },
      },
      defender: {
        nation: defender._id,
        nationName: defender.name,
        modifiers: {
          doctrine: defenderDoctrine?.modifiers?.defense || 0,
        },
      },
      status: 'setup',
      createdBy: interaction.user.id,
    });
    
    await battle.save();
    
    const embed = createEmbed({
      title: 'Battle Created',
      description: `**${name}**\n${attacker.name} vs ${defender.name}`,
      color: config.colors.warning,
      fields: [
        { name: 'Type', value: formatBattleType(battleType), inline: true },
        { name: 'Terrain', value: formatTerrain(terrain), inline: true },
        { name: 'Location', value: location || 'Unspecified', inline: true },
      ],
      footer: { text: 'Use /battle forces and /battle modifiers to set up the battle' },
    });
    
    return interaction.reply({ embeds: [embed] });
  }

  if (subcommand === 'forces') {
    if (!await requireGM(interaction)) return;
    
    const battleName = interaction.options.getString('battle');
    const side = interaction.options.getString('side');
    const unitType = interaction.options.getString('unit_type');
    const quantityStr = interaction.options.getString('quantity');
    const quality = interaction.options.getInteger('quality') || 50;
    
    const quantity = parseNumber(quantityStr);
    if (quantity === null || quantity <= 0) {
      return interaction.reply({
        embeds: [createEmbed({ title: 'Error', description: 'Invalid quantity.', color: config.colors.error })],
        ephemeral: true,
      });
    }
    
    const battle = await Battle.findOne({ guildId, name: battleName, status: 'setup' });
    if (!battle) {
      return interaction.reply({
        embeds: [createEmbed({ title: 'Error', description: `Battle "${battleName}" not found or already simulated.`, color: config.colors.error })],
        ephemeral: true,
      });
    }
    
    // Check if unit type already exists
    const existingIndex = battle[side].forces.findIndex(f => f.unitType.toLowerCase() === unitType.toLowerCase());
    if (existingIndex >= 0) {
      battle[side].forces[existingIndex].quantity = quantity;
      battle[side].forces[existingIndex].quality = quality;
    } else {
      battle[side].forces.push({ unitType, quantity, quality });
    }
    
    await battle.save();
    
    return interaction.reply({
      embeds: [createEmbed({
        title: 'Forces Updated',
        description: `**${battle.name}** - ${side === 'attacker' ? battle.attacker.nationName : battle.defender.nationName}\nAdded ${formatNumber(quantity)} ${unitType} (Quality: ${quality}%)`,
        color: config.colors.success,
      })],
    });
  }

  if (subcommand === 'modifiers') {
    if (!await requireGM(interaction)) return;
    
    const battleName = interaction.options.getString('battle');
    const side = interaction.options.getString('side');
    
    const battle = await Battle.findOne({ guildId, name: battleName, status: 'setup' });
    if (!battle) {
      return interaction.reply({
        embeds: [createEmbed({ title: 'Error', description: `Battle "${battleName}" not found or already simulated.`, color: config.colors.error })],
        ephemeral: true,
      });
    }
    
    const changes = [];
    const mods = battle[side].modifiers;
    
    const terrain = interaction.options.getInteger('terrain');
    const supply = interaction.options.getInteger('supply');
    const morale = interaction.options.getInteger('morale');
    const technology = interaction.options.getInteger('technology');
    const fortifications = interaction.options.getInteger('fortifications');
    const airSupport = interaction.options.getInteger('air_support');
    const navalSupport = interaction.options.getInteger('naval_support');
    const surprise = interaction.options.getInteger('surprise');
    const custom = interaction.options.getInteger('custom');
    
    if (terrain !== null) { mods.terrain = terrain; changes.push(`Terrain: ${terrain}`); }
    if (supply !== null) { mods.supply = supply; changes.push(`Supply: ${supply}`); }
    if (morale !== null) { mods.morale = morale; changes.push(`Morale: ${morale}`); }
    if (technology !== null) { mods.technology = technology; changes.push(`Technology: ${technology}`); }
    if (fortifications !== null) { mods.fortifications = fortifications; changes.push(`Fortifications: ${fortifications}`); }
    if (airSupport !== null) { mods.airSupport = airSupport; changes.push(`Air Support: ${airSupport}`); }
    if (navalSupport !== null) { mods.navalSupport = navalSupport; changes.push(`Naval Support: ${navalSupport}`); }
    if (surprise !== null) { mods.surprise = surprise; changes.push(`Surprise: ${surprise}`); }
    if (custom !== null) { mods.custom = custom; changes.push(`Custom: ${custom}`); }
    
    if (changes.length === 0) {
      return interaction.reply({
        embeds: [createEmbed({ title: 'No Changes', description: 'No modifiers specified.', color: config.colors.warning })],
        ephemeral: true,
      });
    }
    
    await battle.save();
    
    return interaction.reply({
      embeds: [createEmbed({
        title: 'Modifiers Updated',
        description: `**${battle.name}** - ${side === 'attacker' ? battle.attacker.nationName : battle.defender.nationName}\n${changes.join('\n')}`,
        color: config.colors.success,
      })],
    });
  }

  if (subcommand === 'commander') {
    if (!await requireGM(interaction)) return;
    
    const battleName = interaction.options.getString('battle');
    const side = interaction.options.getString('side');
    const commanderName = interaction.options.getString('name');
    
    const battle = await Battle.findOne({ guildId, name: battleName });
    if (!battle) {
      return interaction.reply({
        embeds: [createEmbed({ title: 'Error', description: `Battle "${battleName}" not found.`, color: config.colors.error })],
        ephemeral: true,
      });
    }
    
    battle[side].commander = commanderName;
    await battle.save();
    
    return interaction.reply({
      embeds: [createEmbed({
        title: 'Commander Set',
        description: `**${battle.name}** - ${side === 'attacker' ? battle.attacker.nationName : battle.defender.nationName}\nCommander: ${commanderName}`,
        color: config.colors.success,
      })],
    });
  }

  if (subcommand === 'simulate') {
    if (!await requireGM(interaction)) return;
    
    const battleName = interaction.options.getString('battle');
    
    const battle = await Battle.findOne({ guildId, name: battleName, status: 'setup' });
    if (!battle) {
      return interaction.reply({
        embeds: [createEmbed({ title: 'Error', description: `Battle "${battleName}" not found or already simulated.`, color: config.colors.error })],
        ephemeral: true,
      });
    }
    
    // Calculate forces strength
    const attackerStrength = calculateForceStrength(battle.attacker.forces);
    const defenderStrength = calculateForceStrength(battle.defender.forces);
    
    // Calculate modifier totals
    const attackerMods = sumModifiers(battle.attacker.modifiers);
    const defenderMods = sumModifiers(battle.defender.modifiers);
    
    // Roll dice (d100 for each side)
    const attackerRoll = Math.floor(Math.random() * 100) + 1;
    const defenderRoll = Math.floor(Math.random() * 100) + 1;
    
    // Calculate final scores
    const attackerScore = attackerStrength + attackerMods + attackerRoll;
    const defenderScore = defenderStrength + defenderMods + defenderRoll + 10; // Defender bonus
    
    battle.rolls = [
      { description: 'Attacker Roll', roll: attackerRoll, modifier: attackerMods, result: attackerScore },
      { description: 'Defender Roll', roll: defenderRoll, modifier: defenderMods, result: defenderScore },
    ];
    
    // Determine victor
    const scoreDiff = attackerScore - defenderScore;
    let victor, decisiveness;
    
    if (Math.abs(scoreDiff) < 10) {
      victor = 'draw';
      decisiveness = 'stalemate';
    } else if (scoreDiff >= 50) {
      victor = 'attacker';
      decisiveness = 'decisive';
    } else if (scoreDiff >= 10) {
      victor = 'attacker';
      decisiveness = 'marginal';
    } else if (scoreDiff <= -50) {
      victor = 'defender';
      decisiveness = 'decisive';
    } else {
      victor = 'defender';
      decisiveness = 'marginal';
    }
    
    // Calculate casualties
    const baseCasualties = 10 + Math.floor(Math.random() * 20);
    let attackerCasualtyRate, defenderCasualtyRate;
    
    if (victor === 'attacker') {
      attackerCasualtyRate = Math.max(5, baseCasualties - 10);
      defenderCasualtyRate = baseCasualties + (decisiveness === 'decisive' ? 20 : 10);
    } else if (victor === 'defender') {
      attackerCasualtyRate = baseCasualties + (decisiveness === 'decisive' ? 20 : 10);
      defenderCasualtyRate = Math.max(5, baseCasualties - 10);
    } else {
      attackerCasualtyRate = baseCasualties;
      defenderCasualtyRate = baseCasualties;
    }
    
    // Check for pyrrhic victory
    if (victor !== 'draw' && (victor === 'attacker' ? attackerCasualtyRate : defenderCasualtyRate) > 40) {
      victor = victor === 'attacker' ? 'pyrrhic_attacker' : 'pyrrhic_defender';
      decisiveness = 'pyrrhic';
    }
    
    // Apply casualties
    const attackerTotalForces = battle.attacker.forces.reduce((sum, f) => sum + f.quantity, 0);
    const defenderTotalForces = battle.defender.forces.reduce((sum, f) => sum + f.quantity, 0);
    
    battle.attacker.casualtyPercent = attackerCasualtyRate;
    battle.attacker.casualties = Math.floor(attackerTotalForces * attackerCasualtyRate / 100);
    battle.defender.casualtyPercent = defenderCasualtyRate;
    battle.defender.casualties = Math.floor(defenderTotalForces * defenderCasualtyRate / 100);
    
    // Set result
    battle.result = {
      victor,
      victorNation: victor.includes('attacker') ? battle.attacker.nationName : victor.includes('defender') ? battle.defender.nationName : 'None',
      decisiveness,
      attackerScore,
      defenderScore,
    };
    
    battle.status = 'simulated';
    battle.resolvedAt = new Date();
    await battle.save();
    
    const victorEmoji = victor.includes('attacker') ? '⚔️' : victor.includes('defender') ? '🛡️' : '🤝';
    
    const embed = createEmbed({
      title: `${victorEmoji} Battle Result: ${battle.name}`,
      description: generateBattleNarrative(battle),
      color: victor.includes('attacker') ? config.colors.error : victor.includes('defender') ? config.colors.success : config.colors.warning,
      fields: [
        { name: `${battle.attacker.nationName} (Attacker)`, value: `Score: ${attackerScore}\nCasualties: ${formatNumber(battle.attacker.casualties)} (${attackerCasualtyRate}%)`, inline: true },
        { name: `${battle.defender.nationName} (Defender)`, value: `Score: ${defenderScore}\nCasualties: ${formatNumber(battle.defender.casualties)} (${defenderCasualtyRate}%)`, inline: true },
        { name: 'Outcome', value: `**${formatVictor(victor)}**\n${formatDecisiveness(decisiveness)} victory`, inline: false },
      ],
      footer: { text: `Rolls: Attacker ${attackerRoll} + ${attackerMods} | Defender ${defenderRoll} + ${defenderMods}` },
    });
    
    return interaction.reply({ embeds: [embed] });
  }

  if (subcommand === 'resolve') {
    if (!await requireGM(interaction)) return;
    
    const battleName = interaction.options.getString('battle');
    const victor = interaction.options.getString('victor');
    const decisiveness = interaction.options.getString('decisiveness') || 'marginal';
    const attackerCasualties = interaction.options.getInteger('attacker_casualties') || 15;
    const defenderCasualties = interaction.options.getInteger('defender_casualties') || 15;
    const narrative = interaction.options.getString('narrative') || '';
    
    const battle = await Battle.findOne({ guildId, name: battleName });
    if (!battle) {
      return interaction.reply({
        embeds: [createEmbed({ title: 'Error', description: `Battle "${battleName}" not found.`, color: config.colors.error })],
        ephemeral: true,
      });
    }
    
    const attackerTotalForces = battle.attacker.forces.reduce((sum, f) => sum + f.quantity, 0);
    const defenderTotalForces = battle.defender.forces.reduce((sum, f) => sum + f.quantity, 0);
    
    battle.attacker.casualtyPercent = attackerCasualties;
    battle.attacker.casualties = Math.floor(attackerTotalForces * attackerCasualties / 100);
    battle.defender.casualtyPercent = defenderCasualties;
    battle.defender.casualties = Math.floor(defenderTotalForces * defenderCasualties / 100);
    
    battle.result = {
      victor,
      victorNation: victor.includes('attacker') ? battle.attacker.nationName : victor.includes('defender') ? battle.defender.nationName : 'None',
      decisiveness,
      narrative,
    };
    
    battle.status = 'resolved';
    battle.resolvedAt = new Date();
    await battle.save();
    
    const embed = createEmbed({
      title: `Battle Resolved: ${battle.name}`,
      description: narrative || `${battle.attacker.nationName} vs ${battle.defender.nationName}`,
      color: config.colors.success,
      fields: [
        { name: 'Victor', value: formatVictor(victor), inline: true },
        { name: 'Decisiveness', value: formatDecisiveness(decisiveness), inline: true },
        { name: `${battle.attacker.nationName} Casualties`, value: `${formatNumber(battle.attacker.casualties)} (${attackerCasualties}%)`, inline: true },
        { name: `${battle.defender.nationName} Casualties`, value: `${formatNumber(battle.defender.casualties)} (${defenderCasualties}%)`, inline: true },
      ],
    });
    
    return interaction.reply({ embeds: [embed] });
  }

  if (subcommand === 'view') {
    const battleName = interaction.options.getString('battle');
    
    const battle = await Battle.findOne({ guildId, name: battleName });
    if (!battle) {
      return interaction.reply({
        embeds: [createEmbed({ title: 'Error', description: `Battle "${battleName}" not found.`, color: config.colors.error })],
        ephemeral: true,
      });
    }
    
    const attackerForces = battle.attacker.forces.map(f => `${formatNumber(f.quantity)} ${f.unitType} (${f.quality}%)`).join('\n') || 'None set';
    const defenderForces = battle.defender.forces.map(f => `${formatNumber(f.quantity)} ${f.unitType} (${f.quality}%)`).join('\n') || 'None set';
    
    const fields = [
      { name: 'Type', value: formatBattleType(battle.battleType), inline: true },
      { name: 'Terrain', value: formatTerrain(battle.terrain), inline: true },
      { name: 'Status', value: battle.status.charAt(0).toUpperCase() + battle.status.slice(1), inline: true },
      { name: `${battle.attacker.nationName} (Attacker)`, value: `Commander: ${battle.attacker.commander || 'Unknown'}\n${attackerForces}`, inline: true },
      { name: `${battle.defender.nationName} (Defender)`, value: `Commander: ${battle.defender.commander || 'Unknown'}\n${defenderForces}`, inline: true },
    ];
    
    if (battle.status !== 'setup') {
      fields.push(
        { name: 'Result', value: `**${formatVictor(battle.result.victor)}**\n${formatDecisiveness(battle.result.decisiveness)}`, inline: false },
        { name: 'Attacker Casualties', value: `${formatNumber(battle.attacker.casualties)} (${battle.attacker.casualtyPercent}%)`, inline: true },
        { name: 'Defender Casualties', value: `${formatNumber(battle.defender.casualties)} (${battle.defender.casualtyPercent}%)`, inline: true },
      );
      if (battle.result.narrative) {
        fields.push({ name: 'Narrative', value: battle.result.narrative, inline: false });
      }
    }
    
    const embed = createEmbed({
      title: `Battle: ${battle.name}`,
      description: battle.location ? `Location: ${battle.location}` : '',
      color: battle.status === 'setup' ? config.colors.warning : config.colors.primary,
      fields,
      footer: { text: `Created: ${battle.createdAt.toLocaleDateString()}${battle.resolvedAt ? ` | Resolved: ${battle.resolvedAt.toLocaleDateString()}` : ''}` },
    });
    
    return interaction.reply({ embeds: [embed] });
  }

  if (subcommand === 'list') {
    const statusFilter = interaction.options.getString('status') || 'all';
    const nationName = interaction.options.getString('nation');
    
    const query = { guildId };
    if (statusFilter !== 'all') {
      query.status = statusFilter;
    }
    
    if (nationName) {
      const nation = await Nation.findOne({ guildId, name: new RegExp(`^${nationName}$`, 'i') });
      if (nation) {
        query.$or = [{ 'attacker.nation': nation._id }, { 'defender.nation': nation._id }];
      }
    }
    
    const battles = await Battle.find(query).sort({ createdAt: -1 }).limit(20);
    
    if (battles.length === 0) {
      return interaction.reply({
        embeds: [createEmbed({ title: 'Battles', description: 'No battles found.', color: config.colors.primary })],
      });
    }
    
    const lines = battles.map(b => {
      const status = b.status === 'setup' ? '📋' : b.status === 'simulated' ? '⚔️' : '✅';
      const result = b.result.victor ? ` - ${formatVictor(b.result.victor)}` : '';
      return `${status} **${b.name}**\n└ ${b.attacker.nationName} vs ${b.defender.nationName}${result}`;
    });
    
    const embed = createEmbed({
      title: 'Battles',
      description: lines.join('\n\n'),
      color: config.colors.primary,
      footer: { text: `Showing ${battles.length} battle(s)` },
    });
    
    return interaction.reply({ embeds: [embed] });
  }

  if (subcommand === 'delete') {
    if (!await requireGM(interaction)) return;
    
    const battleName = interaction.options.getString('battle');
    
    const battle = await Battle.findOneAndDelete({ guildId, name: battleName });
    if (!battle) {
      return interaction.reply({
        embeds: [createEmbed({ title: 'Error', description: `Battle "${battleName}" not found.`, color: config.colors.error })],
        ephemeral: true,
      });
    }
    
    return interaction.reply({
      embeds: [createEmbed({ title: 'Battle Deleted', description: `Deleted battle: **${battleName}**`, color: config.colors.success })],
    });
  }
}

function calculateForceStrength(forces) {
  return forces.reduce((total, force) => {
    const baseStrength = Math.log10(force.quantity + 1) * 10;
    const qualityMultiplier = force.quality / 50;
    return total + baseStrength * qualityMultiplier;
  }, 0);
}

function sumModifiers(mods) {
  return Object.values(mods).reduce((sum, val) => sum + (val || 0), 0);
}

function generateBattleNarrative(battle) {
  const attacker = battle.attacker.nationName;
  const defender = battle.defender.nationName;
  const terrain = formatTerrain(battle.terrain);
  const type = formatBattleType(battle.battleType);
  
  if (battle.result.victor.includes('attacker')) {
    return `In a ${type.toLowerCase()} across ${terrain.toLowerCase()} terrain, **${attacker}** emerged victorious against **${defender}**.`;
  } else if (battle.result.victor.includes('defender')) {
    return `**${defender}** successfully defended against **${attacker}'s** ${type.toLowerCase()} in ${terrain.toLowerCase()} terrain.`;
  } else {
    return `The ${type.toLowerCase()} between **${attacker}** and **${defender}** in ${terrain.toLowerCase()} terrain ended in a stalemate.`;
  }
}

function formatBattleType(type) {
  const map = {
    pitched: 'Pitched Battle',
    siege: 'Siege',
    ambush: 'Ambush',
    naval: 'Naval Battle',
    aerial: 'Aerial Battle',
    amphibious: 'Amphibious Assault',
    defensive: 'Defensive Stand',
    pursuit: 'Pursuit',
    skirmish: 'Skirmish',
  };
  return map[type] || type;
}

function formatTerrain(terrain) {
  const map = {
    plains: 'Plains',
    forest: 'Forest',
    mountains: 'Mountains',
    urban: 'Urban',
    desert: 'Desert',
    jungle: 'Jungle',
    arctic: 'Arctic',
    coastal: 'Coastal',
    river: 'River Crossing',
    marsh: 'Marsh/Swamp',
    hills: 'Hills',
  };
  return map[terrain] || terrain;
}

function formatVictor(victor) {
  const map = {
    attacker: 'Attacker Victory',
    defender: 'Defender Victory',
    draw: 'Draw',
    pyrrhic_attacker: 'Pyrrhic Attacker Victory',
    pyrrhic_defender: 'Pyrrhic Defender Victory',
  };
  return map[victor] || victor;
}

function formatDecisiveness(d) {
  const map = {
    decisive: 'Decisive',
    marginal: 'Marginal',
    pyrrhic: 'Pyrrhic',
    stalemate: 'Stalemate',
  };
  return map[d] || d;
}

export default { data, execute };
