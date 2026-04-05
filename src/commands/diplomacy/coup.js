import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { CoupAttempt, GovernmentType } from '../../database/models/Government.js';
import Nation from '../../database/models/Nation.js';
import { requireGM, canModifyNation, isGM } from '../../utils/permissions.js';
import { createEmbed, Colors } from '../../utils/embeds.js';
import { formatNumber, parseNumber } from '../../utils/formatters.js';

const data = new SlashCommandBuilder()
  .setName('coup')
  .setDescription('Manage coup attempts and government overthrows')
  .addSubcommand(sub =>
    sub
      .setName('plan')
      .setDescription('[GM] Plan a new coup attempt against a nation')
      .addStringOption(opt =>
        opt.setName('target').setDescription('Target nation').setRequired(true)
      )
      .addStringOption(opt =>
        opt.setName('leader').setDescription('Name of the coup leader').setRequired(true)
      )
      .addStringOption(opt =>
        opt.setName('type').setDescription('Type of coup')
          .setRequired(true)
          .addChoices(
            { name: 'Military Coup', value: 'military' },
            { name: 'Political Coup', value: 'political' },
            { name: 'Popular Uprising', value: 'popular' },
            { name: 'Palace Coup', value: 'palace' },
            { name: 'Foreign-Backed', value: 'foreign_backed' },
            { name: 'Self-Coup (Autogolpe)', value: 'self_coup' }
          )
      )
      .addStringOption(opt =>
        opt.setName('backer').setDescription('Foreign nation backing the coup (if any)')
      )
  )
  .addSubcommand(sub =>
    sub
      .setName('factors')
      .setDescription('[GM] Set support factors for a coup')
      .addStringOption(opt =>
        opt.setName('target').setDescription('Target nation').setRequired(true)
      )
      .addIntegerOption(opt =>
        opt.setName('military').setDescription('Military support (0-100%)')
          .setMinValue(0).setMaxValue(100)
      )
      .addIntegerOption(opt =>
        opt.setName('popular').setDescription('Popular support (0-100%)')
          .setMinValue(0).setMaxValue(100)
      )
      .addIntegerOption(opt =>
        opt.setName('elite').setDescription('Elite support (0-100%)')
          .setMinValue(0).setMaxValue(100)
      )
      .addIntegerOption(opt =>
        opt.setName('foreign').setDescription('Foreign support bonus (0-50%)')
          .setMinValue(0).setMaxValue(50)
      )
      .addIntegerOption(opt =>
        opt.setName('weakness').setDescription('Government weakness (0-50%)')
          .setMinValue(0).setMaxValue(50)
      )
  )
  .addSubcommand(sub =>
    sub
      .setName('resources')
      .setDescription('[GM] Set resources committed to a coup')
      .addStringOption(opt =>
        opt.setName('target').setDescription('Target nation').setRequired(true)
      )
      .addStringOption(opt =>
        opt.setName('troops').setDescription('Number of troops committed')
      )
      .addStringOption(opt =>
        opt.setName('funding').setDescription('Funding amount')
      )
      .addStringOption(opt =>
        opt.setName('currency').setDescription('Currency name')
      )
  )
  .addSubcommand(sub =>
    sub
      .setName('execute')
      .setDescription('[GM] Execute a planned coup (roll for success)')
      .addStringOption(opt =>
        opt.setName('target').setDescription('Target nation').setRequired(true)
      )
  )
  .addSubcommand(sub =>
    sub
      .setName('resolve')
      .setDescription('[GM] Manually resolve a coup with custom outcome')
      .addStringOption(opt =>
        opt.setName('target').setDescription('Target nation').setRequired(true)
      )
      .addBooleanOption(opt =>
        opt.setName('success').setDescription('Did the coup succeed?').setRequired(true)
      )
      .addBooleanOption(opt =>
        opt.setName('leader_survived').setDescription('Did the coup leader survive?')
      )
      .addIntegerOption(opt =>
        opt.setName('civilian_casualties').setDescription('Civilian casualties')
      )
      .addIntegerOption(opt =>
        opt.setName('military_casualties').setDescription('Military casualties')
      )
      .addIntegerOption(opt =>
        opt.setName('stability_change').setDescription('Stability change (+/-)')
          .setMinValue(-100).setMaxValue(100)
      )
      .addStringOption(opt =>
        opt.setName('new_leader').setDescription('New leader (if successful)')
      )
      .addStringOption(opt =>
        opt.setName('new_government').setDescription('New government type template (if successful)')
      )
      .addStringOption(opt =>
        opt.setName('notes').setDescription('Additional notes about the outcome')
      )
  )
  .addSubcommand(sub =>
    sub
      .setName('cancel')
      .setDescription('[GM] Cancel a planned coup')
      .addStringOption(opt =>
        opt.setName('target').setDescription('Target nation').setRequired(true)
      )
  )
  .addSubcommand(sub =>
    sub
      .setName('view')
      .setDescription('View details of a coup attempt')
      .addStringOption(opt =>
        opt.setName('target').setDescription('Target nation').setRequired(true)
      )
      .addBooleanOption(opt =>
        opt.setName('history').setDescription('Show historical coups instead of active')
      )
  )
  .addSubcommand(sub =>
    sub
      .setName('list')
      .setDescription('List all active or historical coup attempts')
      .addBooleanOption(opt =>
        opt.setName('history').setDescription('Show historical coups')
      )
  );

async function execute(interaction) {
  const guildId = interaction.guild.id;
  const subcommand = interaction.options.getSubcommand();

  if (subcommand === 'plan') {
    if (!await requireGM(interaction)) return;
    
    const targetName = interaction.options.getString('target');
    const leader = interaction.options.getString('leader');
    const type = interaction.options.getString('type');
    const backerName = interaction.options.getString('backer');
    
    const target = await Nation.findOne({ guildId, name: new RegExp(`^${targetName}$`, 'i') });
    if (!target) {
      return interaction.reply({
        embeds: [createEmbed({ title: 'Error', description: `Nation "${targetName}" not found.`, color: Colors.ERROR })],
        ephemeral: true,
      });
    }
    
    // Check for existing active coup
    const existing = await CoupAttempt.findOne({ guildId, target: target._id, status: { $in: ['planning', 'active'] } });
    if (existing) {
      return interaction.reply({
        embeds: [createEmbed({ title: 'Error', description: `There is already an active coup against ${target.name}.`, color: Colors.ERROR })],
        ephemeral: true,
      });
    }
    
    let backer = null;
    if (backerName) {
      backer = await Nation.findOne({ guildId, name: new RegExp(`^${backerName}$`, 'i') });
      if (!backer) {
        return interaction.reply({
          embeds: [createEmbed({ title: 'Error', description: `Backer nation "${backerName}" not found.`, color: Colors.ERROR })],
          ephemeral: true,
        });
      }
    }
    
    // Get government coup resistance
    const gov = await GovernmentType.findOne({ guildId, assignedTo: target._id, isTemplate: false });
    const coupResistance = gov?.modifiers?.coupResistance || 50;
    
    const coup = new CoupAttempt({
      guildId,
      target: target._id,
      targetName: target.name,
      leader,
      type,
      foreignBacker: backer?._id || null,
      foreignBackerName: backer?.name || null,
      status: 'planning',
      createdBy: interaction.user.id,
    });
    
    // Calculate initial success chance
    coup.successChance = calculateSuccessChance(coup.factors, coupResistance);
    
    await coup.save();
    
    const embed = createEmbed({
      title: 'Coup Planned',
      description: `A ${formatCoupType(type)} is being planned against **${target.name}**`,
      color: Colors.WARNING,
      fields: [
        { name: 'Coup Leader', value: leader, inline: true },
        { name: 'Type', value: formatCoupType(type), inline: true },
        { name: 'Foreign Backer', value: backer?.name || 'None', inline: true },
        { name: 'Initial Success Chance', value: `${coup.successChance}%`, inline: true },
        { name: 'Government Coup Resistance', value: `${coupResistance}%`, inline: true },
      ],
      footer: { text: 'Use /coup factors and /coup resources to adjust the coup parameters' },
    });
    
    return interaction.reply({ embeds: [embed] });
  }

  if (subcommand === 'factors') {
    if (!await requireGM(interaction)) return;
    
    const targetName = interaction.options.getString('target');
    
    const target = await Nation.findOne({ guildId, name: new RegExp(`^${targetName}$`, 'i') });
    if (!target) {
      return interaction.reply({
        embeds: [createEmbed({ title: 'Error', description: `Nation "${targetName}" not found.`, color: Colors.ERROR })],
        ephemeral: true,
      });
    }
    
    const coup = await CoupAttempt.findOne({ guildId, target: target._id, status: { $in: ['planning', 'active'] } });
    if (!coup) {
      return interaction.reply({
        embeds: [createEmbed({ title: 'Error', description: `No active coup against ${target.name}.`, color: Colors.ERROR })],
        ephemeral: true,
      });
    }
    
    const military = interaction.options.getInteger('military');
    const popular = interaction.options.getInteger('popular');
    const elite = interaction.options.getInteger('elite');
    const foreign = interaction.options.getInteger('foreign');
    const weakness = interaction.options.getInteger('weakness');
    
    const changes = [];
    if (military !== null) { coup.factors.militarySupport = military; changes.push(`Military Support: ${military}%`); }
    if (popular !== null) { coup.factors.popularSupport = popular; changes.push(`Popular Support: ${popular}%`); }
    if (elite !== null) { coup.factors.eliteSupport = elite; changes.push(`Elite Support: ${elite}%`); }
    if (foreign !== null) { coup.factors.foreignSupport = foreign; changes.push(`Foreign Support: ${foreign}%`); }
    if (weakness !== null) { coup.factors.governmentWeakness = weakness; changes.push(`Government Weakness: ${weakness}%`); }
    
    if (changes.length === 0) {
      return interaction.reply({
        embeds: [createEmbed({ title: 'No Changes', description: 'No factors specified.', color: Colors.WARNING })],
        ephemeral: true,
      });
    }
    
    // Recalculate success chance
    const gov = await GovernmentType.findOne({ guildId, assignedTo: target._id, isTemplate: false });
    const coupResistance = gov?.modifiers?.coupResistance || 50;
    coup.successChance = calculateSuccessChance(coup.factors, coupResistance);
    
    await coup.save();
    
    return interaction.reply({
      embeds: [createEmbed({
        title: 'Coup Factors Updated',
        description: `Updated factors for coup against **${target.name}**:\n${changes.join('\n')}\n\n**New Success Chance: ${coup.successChance}%**`,
        color: Colors.SUCCESS,
      })],
    });
  }

  if (subcommand === 'resources') {
    if (!await requireGM(interaction)) return;
    
    const targetName = interaction.options.getString('target');
    
    const target = await Nation.findOne({ guildId, name: new RegExp(`^${targetName}$`, 'i') });
    if (!target) {
      return interaction.reply({
        embeds: [createEmbed({ title: 'Error', description: `Nation "${targetName}" not found.`, color: Colors.ERROR })],
        ephemeral: true,
      });
    }
    
    const coup = await CoupAttempt.findOne({ guildId, target: target._id, status: { $in: ['planning', 'active'] } });
    if (!coup) {
      return interaction.reply({
        embeds: [createEmbed({ title: 'Error', description: `No active coup against ${target.name}.`, color: Colors.ERROR })],
        ephemeral: true,
      });
    }
    
    const troopsStr = interaction.options.getString('troops');
    const fundingStr = interaction.options.getString('funding');
    const currency = interaction.options.getString('currency');
    
    const changes = [];
    if (troopsStr) {
      const troops = parseNumber(troopsStr);
      if (troops !== null) {
        coup.resources.troops = troops;
        changes.push(`Troops: ${formatNumber(troops)}`);
      }
    }
    if (fundingStr) {
      const funding = parseNumber(fundingStr);
      if (funding !== null) {
        coup.resources.funding = funding;
        changes.push(`Funding: ${formatNumber(funding)}`);
      }
    }
    if (currency) {
      coup.resources.currency = currency;
      changes.push(`Currency: ${currency}`);
    }
    
    if (changes.length === 0) {
      return interaction.reply({
        embeds: [createEmbed({ title: 'No Changes', description: 'No valid resources specified.', color: Colors.WARNING })],
        ephemeral: true,
      });
    }
    
    await coup.save();
    
    return interaction.reply({
      embeds: [createEmbed({
        title: 'Coup Resources Updated',
        description: `Updated resources for coup against **${target.name}**:\n${changes.join('\n')}`,
        color: Colors.SUCCESS,
      })],
    });
  }

  if (subcommand === 'execute') {
    if (!await requireGM(interaction)) return;
    
    const targetName = interaction.options.getString('target');
    
    const target = await Nation.findOne({ guildId, name: new RegExp(`^${targetName}$`, 'i') });
    if (!target) {
      return interaction.reply({
        embeds: [createEmbed({ title: 'Error', description: `Nation "${targetName}" not found.`, color: Colors.ERROR })],
        ephemeral: true,
      });
    }
    
    const coup = await CoupAttempt.findOne({ guildId, target: target._id, status: { $in: ['planning', 'active'] } });
    if (!coup) {
      return interaction.reply({
        embeds: [createEmbed({ title: 'Error', description: `No active coup against ${target.name}.`, color: Colors.ERROR })],
        ephemeral: true,
      });
    }
    
    // Roll for success
    const roll = Math.floor(Math.random() * 100) + 1;
    const success = roll <= coup.successChance;
    
    // Determine outcomes
    coup.status = success ? 'succeeded' : 'failed';
    coup.result.success = success;
    coup.result.leaderSurvived = success ? true : Math.random() > 0.4; // 60% survival if failed
    
    // Calculate casualties (more if failed, less if succeeded quickly)
    const casualtyMultiplier = success ? 0.5 : 1.5;
    const baseCasualties = Math.floor(coup.resources.troops * 0.1 * casualtyMultiplier);
    coup.result.casualtiesMilitary = Math.floor(baseCasualties * (0.5 + Math.random() * 0.5));
    coup.result.casualtiesCivilian = Math.floor(baseCasualties * Math.random() * 2);
    
    // Stability always drops
    coup.result.stabilityChange = success ? -15 - Math.floor(Math.random() * 10) : -5 - Math.floor(Math.random() * 10);
    
    coup.resolvedAt = new Date();
    await coup.save();
    
    const resultEmoji = success ? '✅' : '❌';
    const embed = createEmbed({
      title: `${resultEmoji} Coup ${success ? 'Succeeded' : 'Failed'}!`,
      description: `The ${formatCoupType(coup.type)} against **${target.name}** has ${success ? 'succeeded' : 'failed'}!`,
      color: success ? Colors.SUCCESS : Colors.ERROR,
      fields: [
        { name: 'Roll', value: `${roll} vs ${coup.successChance}% needed`, inline: true },
        { name: 'Coup Leader', value: `${coup.leader} (${coup.result.leaderSurvived ? 'Survived' : 'Killed/Captured'})`, inline: true },
        { name: 'Military Casualties', value: formatNumber(coup.result.casualtiesMilitary), inline: true },
        { name: 'Civilian Casualties', value: formatNumber(coup.result.casualtiesCivilian), inline: true },
        { name: 'Stability Change', value: `${coup.result.stabilityChange}`, inline: true },
      ],
      footer: { text: success ? 'Use /coup resolve to set the new government' : 'The current government remains in power' },
    });
    
    return interaction.reply({ embeds: [embed] });
  }

  if (subcommand === 'resolve') {
    if (!await requireGM(interaction)) return;
    
    const targetName = interaction.options.getString('target');
    const success = interaction.options.getBoolean('success');
    
    const target = await Nation.findOne({ guildId, name: new RegExp(`^${targetName}$`, 'i') });
    if (!target) {
      return interaction.reply({
        embeds: [createEmbed({ title: 'Error', description: `Nation "${targetName}" not found.`, color: Colors.ERROR })],
        ephemeral: true,
      });
    }
    
    const coup = await CoupAttempt.findOne({ guildId, target: target._id, status: { $in: ['planning', 'active', 'succeeded', 'failed'] } })
      .sort({ createdAt: -1 });
    if (!coup) {
      return interaction.reply({
        embeds: [createEmbed({ title: 'Error', description: `No coup found for ${target.name}.`, color: Colors.ERROR })],
        ephemeral: true,
      });
    }
    
    const leaderSurvived = interaction.options.getBoolean('leader_survived');
    const civilianCasualties = interaction.options.getInteger('civilian_casualties');
    const militaryCasualties = interaction.options.getInteger('military_casualties');
    const stabilityChange = interaction.options.getInteger('stability_change');
    const newLeader = interaction.options.getString('new_leader');
    const newGovernmentName = interaction.options.getString('new_government');
    const notes = interaction.options.getString('notes');
    
    coup.status = success ? 'succeeded' : 'crushed';
    coup.result.success = success;
    if (leaderSurvived !== null) coup.result.leaderSurvived = leaderSurvived;
    if (civilianCasualties !== null) coup.result.casualtiesCivilian = civilianCasualties;
    if (militaryCasualties !== null) coup.result.casualtiesMilitary = militaryCasualties;
    if (stabilityChange !== null) coup.result.stabilityChange = stabilityChange;
    if (newLeader) coup.newLeader = newLeader;
    if (notes) coup.result.notes = notes;
    
    // Handle new government if successful
    if (success && newGovernmentName) {
      const template = await GovernmentType.findOne({ guildId, name: newGovernmentName, isTemplate: true });
      if (template) {
        // Remove old government
        await GovernmentType.deleteMany({ guildId, assignedTo: target._id, isTemplate: false });
        
        // Assign new government
        const newGov = new GovernmentType({
          guildId,
          name: template.name,
          description: template.description,
          category: template.category,
          modifiers: { ...template.modifiers },
          succession: template.succession,
          isTemplate: false,
          assignedTo: target._id,
          assignedToName: target.name,
          createdBy: interaction.user.id,
        });
        await newGov.save();
        
        coup.newGovernmentType = newGov._id;
        coup.result.newGovernment = template.name;
      }
    }
    
    coup.resolvedAt = new Date();
    await coup.save();
    
    const fields = [
      { name: 'Outcome', value: success ? 'Coup Succeeded' : 'Coup Crushed', inline: true },
      { name: 'Coup Leader', value: `${coup.leader} (${coup.result.leaderSurvived ? 'Survived' : 'Killed/Captured'})`, inline: true },
    ];
    
    if (coup.result.casualtiesMilitary || coup.result.casualtiesCivilian) {
      fields.push({ name: 'Casualties', value: `Military: ${formatNumber(coup.result.casualtiesMilitary)}\nCivilian: ${formatNumber(coup.result.casualtiesCivilian)}`, inline: true });
    }
    if (coup.result.stabilityChange) {
      fields.push({ name: 'Stability Change', value: `${coup.result.stabilityChange}`, inline: true });
    }
    if (success && coup.newLeader) {
      fields.push({ name: 'New Leader', value: coup.newLeader, inline: true });
    }
    if (success && coup.result.newGovernment) {
      fields.push({ name: 'New Government', value: coup.result.newGovernment, inline: true });
    }
    if (coup.result.notes) {
      fields.push({ name: 'Notes', value: coup.result.notes, inline: false });
    }
    
    const embed = createEmbed({
      title: `Coup Resolved: ${target.name}`,
      description: `The ${formatCoupType(coup.type)} has been resolved.`,
      color: success ? Colors.SUCCESS : Colors.ERROR,
      fields,
    });
    
    return interaction.reply({ embeds: [embed] });
  }

  if (subcommand === 'cancel') {
    if (!await requireGM(interaction)) return;
    
    const targetName = interaction.options.getString('target');
    
    const target = await Nation.findOne({ guildId, name: new RegExp(`^${targetName}$`, 'i') });
    if (!target) {
      return interaction.reply({
        embeds: [createEmbed({ title: 'Error', description: `Nation "${targetName}" not found.`, color: Colors.ERROR })],
        ephemeral: true,
      });
    }
    
    const coup = await CoupAttempt.findOneAndUpdate(
      { guildId, target: target._id, status: { $in: ['planning', 'active'] } },
      { status: 'cancelled', resolvedAt: new Date() },
      { new: true }
    );
    
    if (!coup) {
      return interaction.reply({
        embeds: [createEmbed({ title: 'Error', description: `No active coup against ${target.name}.`, color: Colors.ERROR })],
        ephemeral: true,
      });
    }
    
    return interaction.reply({
      embeds: [createEmbed({
        title: 'Coup Cancelled',
        description: `The planned ${formatCoupType(coup.type)} against **${target.name}** has been cancelled.`,
        color: Colors.SUCCESS,
      })],
    });
  }

  if (subcommand === 'view') {
    const targetName = interaction.options.getString('target');
    const showHistory = interaction.options.getBoolean('history') || false;
    
    const target = await Nation.findOne({ guildId, name: new RegExp(`^${targetName}$`, 'i') });
    if (!target) {
      return interaction.reply({
        embeds: [createEmbed({ title: 'Error', description: `Nation "${targetName}" not found.`, color: Colors.ERROR })],
        ephemeral: true,
      });
    }
    
    let coup;
    if (showHistory) {
      coup = await CoupAttempt.findOne({ guildId, target: target._id, status: { $in: ['succeeded', 'failed', 'crushed'] } })
        .sort({ resolvedAt: -1 });
    } else {
      coup = await CoupAttempt.findOne({ guildId, target: target._id, status: { $in: ['planning', 'active'] } });
    }
    
    if (!coup) {
      return interaction.reply({
        embeds: [createEmbed({
          title: `Coup Status: ${target.name}`,
          description: showHistory ? 'No historical coups found.' : 'No active coup against this nation.',
          color: Colors.INFO,
        })],
      });
    }
    
    const fields = [
      { name: 'Coup Leader', value: coup.leader, inline: true },
      { name: 'Type', value: formatCoupType(coup.type), inline: true },
      { name: 'Status', value: formatStatus(coup.status), inline: true },
      { name: 'Foreign Backer', value: coup.foreignBackerName || 'None', inline: true },
    ];
    
    if (coup.status === 'planning' || coup.status === 'active') {
      fields.push(
        { name: 'Success Chance', value: `${coup.successChance}%`, inline: true },
        { name: '\u200B', value: '**Support Factors:**', inline: false },
        { name: 'Military', value: `${coup.factors.militarySupport}%`, inline: true },
        { name: 'Popular', value: `${coup.factors.popularSupport}%`, inline: true },
        { name: 'Elite', value: `${coup.factors.eliteSupport}%`, inline: true },
        { name: 'Foreign', value: `${coup.factors.foreignSupport}%`, inline: true },
        { name: 'Gov Weakness', value: `${coup.factors.governmentWeakness}%`, inline: true },
      );
      if (coup.resources.troops || coup.resources.funding) {
        fields.push(
          { name: '\u200B', value: '**Resources:**', inline: false },
          { name: 'Troops', value: formatNumber(coup.resources.troops), inline: true },
          { name: 'Funding', value: `${formatNumber(coup.resources.funding)} ${coup.resources.currency}`, inline: true },
        );
      }
    } else {
      // Historical - show results
      fields.push(
        { name: 'Outcome', value: coup.result.success ? 'Succeeded' : 'Failed', inline: true },
        { name: 'Leader Fate', value: coup.result.leaderSurvived ? 'Survived' : 'Killed/Captured', inline: true },
        { name: 'Military Casualties', value: formatNumber(coup.result.casualtiesMilitary), inline: true },
        { name: 'Civilian Casualties', value: formatNumber(coup.result.casualtiesCivilian), inline: true },
        { name: 'Stability Change', value: `${coup.result.stabilityChange}`, inline: true },
      );
      if (coup.result.newGovernment) {
        fields.push({ name: 'New Government', value: coup.result.newGovernment, inline: true });
      }
      if (coup.newLeader) {
        fields.push({ name: 'New Leader', value: coup.newLeader, inline: true });
      }
      if (coup.result.notes) {
        fields.push({ name: 'Notes', value: coup.result.notes, inline: false });
      }
    }
    
    const embed = createEmbed({
      title: `Coup: ${target.name}`,
      description: `${formatCoupType(coup.type)} led by **${coup.leader}**`,
      color: coup.status === 'succeeded' ? Colors.SUCCESS : coup.status === 'failed' || coup.status === 'crushed' ? Colors.ERROR : Colors.WARNING,
      fields,
      footer: { text: `Started: ${coup.createdAt.toLocaleDateString()}${coup.resolvedAt ? ` | Resolved: ${coup.resolvedAt.toLocaleDateString()}` : ''}` },
    });
    
    return interaction.reply({ embeds: [embed] });
  }

  if (subcommand === 'list') {
    const showHistory = interaction.options.getBoolean('history') || false;
    
    const statusFilter = showHistory 
      ? { $in: ['succeeded', 'failed', 'crushed'] }
      : { $in: ['planning', 'active'] };
    
    const coups = await CoupAttempt.find({ guildId, status: statusFilter })
      .sort(showHistory ? { resolvedAt: -1 } : { createdAt: -1 })
      .limit(20);
    
    if (coups.length === 0) {
      return interaction.reply({
        embeds: [createEmbed({
          title: showHistory ? 'Historical Coups' : 'Active Coups',
          description: showHistory ? 'No historical coups recorded.' : 'No active coups in progress.',
          color: Colors.INFO,
        })],
      });
    }
    
    const lines = coups.map(c => {
      const status = formatStatus(c.status);
      const date = showHistory ? c.resolvedAt?.toLocaleDateString() : c.createdAt.toLocaleDateString();
      return `**${c.targetName}** - ${formatCoupType(c.type)} by ${c.leader}\n└ ${status} | ${c.successChance}% chance | ${date}`;
    });
    
    const embed = createEmbed({
      title: showHistory ? 'Historical Coups' : 'Active Coups',
      description: lines.join('\n\n'),
      color: Colors.INFO,
      footer: { text: `Showing ${coups.length} coup(s)` },
    });
    
    return interaction.reply({ embeds: [embed] });
  }
}

function calculateSuccessChance(factors, coupResistance) {
  // Base chance from support factors (weighted average)
  const baseChance = (
    factors.militarySupport * 0.35 +    // Military is most important
    factors.popularSupport * 0.25 +      // Popular support matters
    factors.eliteSupport * 0.20 +        // Elite backing helps
    factors.foreignSupport * 0.10 +      // Foreign support bonus
    factors.governmentWeakness * 0.10    // Weak governments are easier to topple
  );
  
  // Apply coup resistance
  const resistancePenalty = coupResistance * 0.5; // 50% of resistance value is subtracted
  
  const finalChance = Math.max(5, Math.min(95, Math.round(baseChance - resistancePenalty + 25)));
  return finalChance;
}

function formatCoupType(type) {
  const map = {
    military: 'Military Coup',
    political: 'Political Coup',
    popular: 'Popular Uprising',
    palace: 'Palace Coup',
    foreign_backed: 'Foreign-Backed Coup',
    self_coup: 'Self-Coup (Autogolpe)',
  };
  return map[type] || type;
}

function formatStatus(status) {
  const map = {
    planning: '📋 Planning',
    active: '⚔️ Active',
    succeeded: '✅ Succeeded',
    failed: '❌ Failed',
    crushed: '💀 Crushed',
    cancelled: '🚫 Cancelled',
  };
  return map[status] || status;
}

export default { data, execute };
