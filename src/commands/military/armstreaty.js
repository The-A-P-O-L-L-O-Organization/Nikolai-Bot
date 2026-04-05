import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import NuclearTreaty from '../../database/models/NuclearTreaty.js';
import Nation from '../../database/models/Nation.js';
import { requireGM, canModifyNation, isGM } from '../../utils/permissions.js';
import { createEmbed, Colors } from '../../utils/embeds.js';
import { formatNumber, parseNumber } from '../../utils/formatters.js';

const data = new SlashCommandBuilder()
  .setName('armstreaty')
  .setDescription('Manage arms control and nuclear treaties')
  .addSubcommand(sub =>
    sub
      .setName('create')
      .setDescription('[GM] Create a new arms control treaty')
      .addStringOption(opt =>
        opt.setName('name').setDescription('Treaty name').setRequired(true)
      )
      .addStringOption(opt =>
        opt.setName('type').setDescription('Treaty type')
          .setRequired(true)
          .addChoices(
            { name: 'Nuclear Non-Proliferation', value: 'nuclear_nonproliferation' },
            { name: 'Arms Limitation', value: 'arms_limitation' },
            { name: 'Test Ban', value: 'test_ban' },
            { name: 'Disarmament', value: 'disarmament' },
            { name: 'Demilitarization', value: 'demilitarization' },
            { name: 'Weapons Ban', value: 'weapons_ban' },
            { name: 'Custom', value: 'custom' }
          )
      )
      .addStringOption(opt =>
        opt.setName('description').setDescription('Treaty description')
      )
  )
  .addSubcommand(sub =>
    sub
      .setName('terms')
      .setDescription('[GM] Set treaty terms/restrictions')
      .addStringOption(opt =>
        opt.setName('treaty').setDescription('Treaty name').setRequired(true)
      )
      .addBooleanOption(opt =>
        opt.setName('nuclear_ban').setDescription('Ban nuclear weapons')
      )
      .addBooleanOption(opt =>
        opt.setName('test_ban').setDescription('Ban nuclear tests')
      )
      .addIntegerOption(opt =>
        opt.setName('max_warheads').setDescription('Maximum warheads allowed')
      )
      .addIntegerOption(opt =>
        opt.setName('max_troops').setDescription('Maximum troops allowed')
      )
      .addIntegerOption(opt =>
        opt.setName('max_tanks').setDescription('Maximum tanks allowed')
      )
      .addIntegerOption(opt =>
        opt.setName('max_aircraft').setDescription('Maximum aircraft allowed')
      )
      .addIntegerOption(opt =>
        opt.setName('max_ships').setDescription('Maximum naval vessels allowed')
      )
      .addBooleanOption(opt =>
        opt.setName('inspections').setDescription('Require inspections')
      )
  )
  .addSubcommand(sub =>
    sub
      .setName('ban')
      .setDescription('[GM] Add a banned weapon type to treaty')
      .addStringOption(opt =>
        opt.setName('treaty').setDescription('Treaty name').setRequired(true)
      )
      .addStringOption(opt =>
        opt.setName('weapon').setDescription('Weapon type to ban').setRequired(true)
      )
  )
  .addSubcommand(sub =>
    sub
      .setName('invite')
      .setDescription('[GM] Invite a nation to sign treaty')
      .addStringOption(opt =>
        opt.setName('treaty').setDescription('Treaty name').setRequired(true)
      )
      .addStringOption(opt =>
        opt.setName('nation').setDescription('Nation to invite').setRequired(true)
      )
  )
  .addSubcommand(sub =>
    sub
      .setName('sign')
      .setDescription('[GM] Record a nation signing the treaty')
      .addStringOption(opt =>
        opt.setName('treaty').setDescription('Treaty name').setRequired(true)
      )
      .addStringOption(opt =>
        opt.setName('nation').setDescription('Nation signing').setRequired(true)
      )
  )
  .addSubcommand(sub =>
    sub
      .setName('ratify')
      .setDescription('[GM] Record a nation ratifying the treaty')
      .addStringOption(opt =>
        opt.setName('treaty').setDescription('Treaty name').setRequired(true)
      )
      .addStringOption(opt =>
        opt.setName('nation').setDescription('Nation ratifying').setRequired(true)
      )
  )
  .addSubcommand(sub =>
    sub
      .setName('withdraw')
      .setDescription('[GM] Record a nation withdrawing from treaty')
      .addStringOption(opt =>
        opt.setName('treaty').setDescription('Treaty name').setRequired(true)
      )
      .addStringOption(opt =>
        opt.setName('nation').setDescription('Nation withdrawing').setRequired(true)
      )
  )
  .addSubcommand(sub =>
    sub
      .setName('violation')
      .setDescription('[GM] Record a treaty violation')
      .addStringOption(opt =>
        opt.setName('treaty').setDescription('Treaty name').setRequired(true)
      )
      .addStringOption(opt =>
        opt.setName('nation').setDescription('Violating nation').setRequired(true)
      )
      .addStringOption(opt =>
        opt.setName('description').setDescription('Violation description').setRequired(true)
      )
      .addStringOption(opt =>
        opt.setName('severity').setDescription('Violation severity')
          .addChoices(
            { name: 'Minor', value: 'minor' },
            { name: 'Moderate', value: 'moderate' },
            { name: 'Major', value: 'major' },
            { name: 'Critical', value: 'critical' }
          )
      )
      .addStringOption(opt =>
        opt.setName('response').setDescription('International response')
      )
  )
  .addSubcommand(sub =>
    sub
      .setName('activate')
      .setDescription('[GM] Activate a treaty')
      .addStringOption(opt =>
        opt.setName('treaty').setDescription('Treaty name').setRequired(true)
      )
  )
  .addSubcommand(sub =>
    sub
      .setName('collapse')
      .setDescription('[GM] Mark a treaty as collapsed')
      .addStringOption(opt =>
        opt.setName('treaty').setDescription('Treaty name').setRequired(true)
      )
  )
  .addSubcommand(sub =>
    sub
      .setName('view')
      .setDescription('View treaty details')
      .addStringOption(opt =>
        opt.setName('treaty').setDescription('Treaty name').setRequired(true)
      )
  )
  .addSubcommand(sub =>
    sub
      .setName('list')
      .setDescription('List all treaties')
      .addStringOption(opt =>
        opt.setName('status').setDescription('Filter by status')
          .addChoices(
            { name: 'Active', value: 'active' },
            { name: 'Draft/Proposed', value: 'draft' },
            { name: 'Collapsed', value: 'collapsed' },
            { name: 'All', value: 'all' }
          )
      )
  )
  .addSubcommand(sub =>
    sub
      .setName('delete')
      .setDescription('[GM] Delete a treaty')
      .addStringOption(opt =>
        opt.setName('treaty').setDescription('Treaty name').setRequired(true)
      )
  );

async function execute(interaction) {
  const guildId = interaction.guild.id;
  const subcommand = interaction.options.getSubcommand();

  if (subcommand === 'create') {
    if (!await requireGM(interaction)) return;
    
    const name = interaction.options.getString('name');
    const type = interaction.options.getString('type');
    const description = interaction.options.getString('description') || '';
    
    const existing = await NuclearTreaty.findOne({ guildId, name });
    if (existing) {
      return interaction.reply({
        embeds: [createEmbed({ title: 'Error', description: `Treaty "${name}" already exists.`, color: Colors.ERROR })],
        ephemeral: true,
      });
    }
    
    const treaty = new NuclearTreaty({
      guildId,
      name,
      type,
      description,
      status: 'draft',
      createdBy: interaction.user.id,
    });
    
    await treaty.save();
    
    return interaction.reply({
      embeds: [createEmbed({
        title: 'Treaty Created',
        description: `Created treaty: **${name}**`,
        color: Colors.SUCCESS,
        fields: [
          { name: 'Type', value: formatTreatyType(type), inline: true },
          { name: 'Status', value: 'Draft', inline: true },
        ],
        footer: { text: 'Use /armstreaty terms to set restrictions, then /armstreaty invite to add signatories' },
      })],
    });
  }

  if (subcommand === 'terms') {
    if (!await requireGM(interaction)) return;
    
    const treatyName = interaction.options.getString('treaty');
    
    const treaty = await NuclearTreaty.findOne({ guildId, name: treatyName });
    if (!treaty) {
      return interaction.reply({
        embeds: [createEmbed({ title: 'Error', description: `Treaty "${treatyName}" not found.`, color: Colors.ERROR })],
        ephemeral: true,
      });
    }
    
    const changes = [];
    
    const nuclearBan = interaction.options.getBoolean('nuclear_ban');
    const testBan = interaction.options.getBoolean('test_ban');
    const maxWarheads = interaction.options.getInteger('max_warheads');
    const maxTroops = interaction.options.getInteger('max_troops');
    const maxTanks = interaction.options.getInteger('max_tanks');
    const maxAircraft = interaction.options.getInteger('max_aircraft');
    const maxShips = interaction.options.getInteger('max_ships');
    const inspections = interaction.options.getBoolean('inspections');
    
    if (nuclearBan !== null) { treaty.terms.nuclearWeaponsBan = nuclearBan; changes.push(`Nuclear Weapons Ban: ${nuclearBan ? 'Yes' : 'No'}`); }
    if (testBan !== null) { treaty.terms.nuclearTestsBan = testBan; changes.push(`Nuclear Tests Ban: ${testBan ? 'Yes' : 'No'}`); }
    if (maxWarheads !== null) { treaty.terms.maxWarheads = maxWarheads; changes.push(`Max Warheads: ${formatNumber(maxWarheads)}`); }
    if (maxTroops !== null) { treaty.terms.maxTroops = maxTroops; changes.push(`Max Troops: ${formatNumber(maxTroops)}`); }
    if (maxTanks !== null) { treaty.terms.maxTanks = maxTanks; changes.push(`Max Tanks: ${formatNumber(maxTanks)}`); }
    if (maxAircraft !== null) { treaty.terms.maxAircraft = maxAircraft; changes.push(`Max Aircraft: ${formatNumber(maxAircraft)}`); }
    if (maxShips !== null) { treaty.terms.maxNavalVessels = maxShips; changes.push(`Max Naval Vessels: ${formatNumber(maxShips)}`); }
    if (inspections !== null) { treaty.terms.inspectionsRequired = inspections; changes.push(`Inspections Required: ${inspections ? 'Yes' : 'No'}`); }
    
    if (changes.length === 0) {
      return interaction.reply({
        embeds: [createEmbed({ title: 'No Changes', description: 'No terms specified.', color: Colors.WARNING })],
        ephemeral: true,
      });
    }
    
    await treaty.save();
    
    return interaction.reply({
      embeds: [createEmbed({
        title: 'Treaty Terms Updated',
        description: `**${treatyName}**:\n${changes.join('\n')}`,
        color: Colors.SUCCESS,
      })],
    });
  }

  if (subcommand === 'ban') {
    if (!await requireGM(interaction)) return;
    
    const treatyName = interaction.options.getString('treaty');
    const weapon = interaction.options.getString('weapon');
    
    const treaty = await NuclearTreaty.findOne({ guildId, name: treatyName });
    if (!treaty) {
      return interaction.reply({
        embeds: [createEmbed({ title: 'Error', description: `Treaty "${treatyName}" not found.`, color: Colors.ERROR })],
        ephemeral: true,
      });
    }
    
    if (!treaty.terms.bannedWeapons.includes(weapon)) {
      treaty.terms.bannedWeapons.push(weapon);
      await treaty.save();
    }
    
    return interaction.reply({
      embeds: [createEmbed({
        title: 'Weapon Banned',
        description: `**${weapon}** added to banned weapons list in **${treatyName}**`,
        color: Colors.SUCCESS,
      })],
    });
  }

  if (subcommand === 'invite') {
    if (!await requireGM(interaction)) return;
    
    const treatyName = interaction.options.getString('treaty');
    const nationName = interaction.options.getString('nation');
    
    const treaty = await NuclearTreaty.findOne({ guildId, name: treatyName });
    if (!treaty) {
      return interaction.reply({
        embeds: [createEmbed({ title: 'Error', description: `Treaty "${treatyName}" not found.`, color: Colors.ERROR })],
        ephemeral: true,
      });
    }
    
    const nation = await Nation.findOne({ guildId, name: new RegExp(`^${nationName}$`, 'i') });
    if (!nation) {
      return interaction.reply({
        embeds: [createEmbed({ title: 'Error', description: `Nation "${nationName}" not found.`, color: Colors.ERROR })],
        ephemeral: true,
      });
    }
    
    // Check if already a signatory
    const existing = treaty.signatories.find(s => s.nation?.equals(nation._id));
    if (existing) {
      return interaction.reply({
        embeds: [createEmbed({ title: 'Error', description: `${nation.name} is already a signatory.`, color: Colors.ERROR })],
        ephemeral: true,
      });
    }
    
    treaty.signatories.push({
      nation: nation._id,
      nationName: nation.name,
      status: 'invited',
    });
    
    if (treaty.status === 'draft') {
      treaty.status = 'proposed';
    }
    
    await treaty.save();
    
    return interaction.reply({
      embeds: [createEmbed({
        title: 'Nation Invited',
        description: `**${nation.name}** has been invited to join **${treatyName}**`,
        color: Colors.SUCCESS,
      })],
    });
  }

  if (subcommand === 'sign') {
    if (!await requireGM(interaction)) return;
    
    const treatyName = interaction.options.getString('treaty');
    const nationName = interaction.options.getString('nation');
    
    const treaty = await NuclearTreaty.findOne({ guildId, name: treatyName });
    if (!treaty) {
      return interaction.reply({
        embeds: [createEmbed({ title: 'Error', description: `Treaty "${treatyName}" not found.`, color: Colors.ERROR })],
        ephemeral: true,
      });
    }
    
    const nation = await Nation.findOne({ guildId, name: new RegExp(`^${nationName}$`, 'i') });
    if (!nation) {
      return interaction.reply({
        embeds: [createEmbed({ title: 'Error', description: `Nation "${nationName}" not found.`, color: Colors.ERROR })],
        ephemeral: true,
      });
    }
    
    const signatory = treaty.signatories.find(s => s.nation?.equals(nation._id));
    if (!signatory) {
      // Add them if not invited
      treaty.signatories.push({
        nation: nation._id,
        nationName: nation.name,
        status: 'signed',
        signedAt: new Date(),
      });
    } else {
      signatory.status = 'signed';
      signatory.signedAt = new Date();
    }
    
    if (treaty.status === 'draft') {
      treaty.status = 'proposed';
    }
    
    await treaty.save();
    
    return interaction.reply({
      embeds: [createEmbed({
        title: 'Treaty Signed',
        description: `**${nation.name}** has signed **${treatyName}**`,
        color: Colors.SUCCESS,
      })],
    });
  }

  if (subcommand === 'ratify') {
    if (!await requireGM(interaction)) return;
    
    const treatyName = interaction.options.getString('treaty');
    const nationName = interaction.options.getString('nation');
    
    const treaty = await NuclearTreaty.findOne({ guildId, name: treatyName });
    if (!treaty) {
      return interaction.reply({
        embeds: [createEmbed({ title: 'Error', description: `Treaty "${treatyName}" not found.`, color: Colors.ERROR })],
        ephemeral: true,
      });
    }
    
    const nation = await Nation.findOne({ guildId, name: new RegExp(`^${nationName}$`, 'i') });
    if (!nation) {
      return interaction.reply({
        embeds: [createEmbed({ title: 'Error', description: `Nation "${nationName}" not found.`, color: Colors.ERROR })],
        ephemeral: true,
      });
    }
    
    const signatory = treaty.signatories.find(s => s.nation?.equals(nation._id));
    if (!signatory) {
      return interaction.reply({
        embeds: [createEmbed({ title: 'Error', description: `${nation.name} is not a signatory of this treaty.`, color: Colors.ERROR })],
        ephemeral: true,
      });
    }
    
    signatory.status = 'ratified';
    signatory.ratifiedAt = new Date();
    await treaty.save();
    
    return interaction.reply({
      embeds: [createEmbed({
        title: 'Treaty Ratified',
        description: `**${nation.name}** has ratified **${treatyName}**`,
        color: Colors.SUCCESS,
      })],
    });
  }

  if (subcommand === 'withdraw') {
    if (!await requireGM(interaction)) return;
    
    const treatyName = interaction.options.getString('treaty');
    const nationName = interaction.options.getString('nation');
    
    const treaty = await NuclearTreaty.findOne({ guildId, name: treatyName });
    if (!treaty) {
      return interaction.reply({
        embeds: [createEmbed({ title: 'Error', description: `Treaty "${treatyName}" not found.`, color: Colors.ERROR })],
        ephemeral: true,
      });
    }
    
    const nation = await Nation.findOne({ guildId, name: new RegExp(`^${nationName}$`, 'i') });
    if (!nation) {
      return interaction.reply({
        embeds: [createEmbed({ title: 'Error', description: `Nation "${nationName}" not found.`, color: Colors.ERROR })],
        ephemeral: true,
      });
    }
    
    const signatory = treaty.signatories.find(s => s.nation?.equals(nation._id));
    if (!signatory) {
      return interaction.reply({
        embeds: [createEmbed({ title: 'Error', description: `${nation.name} is not a signatory.`, color: Colors.ERROR })],
        ephemeral: true,
      });
    }
    
    signatory.status = 'withdrawn';
    signatory.withdrawnAt = new Date();
    await treaty.save();
    
    return interaction.reply({
      embeds: [createEmbed({
        title: 'Treaty Withdrawal',
        description: `**${nation.name}** has withdrawn from **${treatyName}**`,
        color: Colors.WARNING,
      })],
    });
  }

  if (subcommand === 'violation') {
    if (!await requireGM(interaction)) return;
    
    const treatyName = interaction.options.getString('treaty');
    const nationName = interaction.options.getString('nation');
    const description = interaction.options.getString('description');
    const severity = interaction.options.getString('severity') || 'minor';
    const response = interaction.options.getString('response') || '';
    
    const treaty = await NuclearTreaty.findOne({ guildId, name: treatyName });
    if (!treaty) {
      return interaction.reply({
        embeds: [createEmbed({ title: 'Error', description: `Treaty "${treatyName}" not found.`, color: Colors.ERROR })],
        ephemeral: true,
      });
    }
    
    const nation = await Nation.findOne({ guildId, name: new RegExp(`^${nationName}$`, 'i') });
    if (!nation) {
      return interaction.reply({
        embeds: [createEmbed({ title: 'Error', description: `Nation "${nationName}" not found.`, color: Colors.ERROR })],
        ephemeral: true,
      });
    }
    
    treaty.violations.push({
      violator: nation._id,
      violatorName: nation.name,
      description,
      severity,
      response,
    });
    
    // Update compliance status
    if (severity === 'critical' || severity === 'major') {
      treaty.verification.complianceStatus = 'major_violations';
      treaty.status = 'violated';
    } else {
      treaty.verification.complianceStatus = 'minor_violations';
    }
    
    await treaty.save();
    
    return interaction.reply({
      embeds: [createEmbed({
        title: 'Violation Recorded',
        description: `**${nation.name}** has violated **${treatyName}**`,
        color: Colors.ERROR,
        fields: [
          { name: 'Violation', value: description, inline: false },
          { name: 'Severity', value: severity.charAt(0).toUpperCase() + severity.slice(1), inline: true },
          { name: 'Response', value: response || 'None', inline: true },
        ],
      })],
    });
  }

  if (subcommand === 'activate') {
    if (!await requireGM(interaction)) return;
    
    const treatyName = interaction.options.getString('treaty');
    
    const treaty = await NuclearTreaty.findOne({ guildId, name: treatyName });
    if (!treaty) {
      return interaction.reply({
        embeds: [createEmbed({ title: 'Error', description: `Treaty "${treatyName}" not found.`, color: Colors.ERROR })],
        ephemeral: true,
      });
    }
    
    treaty.status = 'active';
    treaty.effectiveDate = new Date();
    await treaty.save();
    
    const ratifiedCount = treaty.signatories.filter(s => s.status === 'ratified').length;
    
    return interaction.reply({
      embeds: [createEmbed({
        title: 'Treaty Activated',
        description: `**${treatyName}** is now in effect`,
        color: Colors.SUCCESS,
        fields: [
          { name: 'Ratified By', value: `${ratifiedCount} nation(s)`, inline: true },
          { name: 'Effective Date', value: new Date().toLocaleDateString(), inline: true },
        ],
      })],
    });
  }

  if (subcommand === 'collapse') {
    if (!await requireGM(interaction)) return;
    
    const treatyName = interaction.options.getString('treaty');
    
    const treaty = await NuclearTreaty.findOne({ guildId, name: treatyName });
    if (!treaty) {
      return interaction.reply({
        embeds: [createEmbed({ title: 'Error', description: `Treaty "${treatyName}" not found.`, color: Colors.ERROR })],
        ephemeral: true,
      });
    }
    
    treaty.status = 'collapsed';
    await treaty.save();
    
    return interaction.reply({
      embeds: [createEmbed({
        title: 'Treaty Collapsed',
        description: `**${treatyName}** has collapsed and is no longer in effect`,
        color: Colors.ERROR,
      })],
    });
  }

  if (subcommand === 'view') {
    const treatyName = interaction.options.getString('treaty');
    
    const treaty = await NuclearTreaty.findOne({ guildId, name: treatyName });
    if (!treaty) {
      return interaction.reply({
        embeds: [createEmbed({ title: 'Error', description: `Treaty "${treatyName}" not found.`, color: Colors.ERROR })],
        ephemeral: true,
      });
    }
    
    const fields = [
      { name: 'Type', value: formatTreatyType(treaty.type), inline: true },
      { name: 'Status', value: formatStatus(treaty.status), inline: true },
    ];
    
    // Terms
    const termsList = [];
    if (treaty.terms.nuclearWeaponsBan) termsList.push('Nuclear weapons banned');
    if (treaty.terms.nuclearTestsBan) termsList.push('Nuclear tests banned');
    if (treaty.terms.maxWarheads) termsList.push(`Max warheads: ${formatNumber(treaty.terms.maxWarheads)}`);
    if (treaty.terms.maxTroops) termsList.push(`Max troops: ${formatNumber(treaty.terms.maxTroops)}`);
    if (treaty.terms.maxTanks) termsList.push(`Max tanks: ${formatNumber(treaty.terms.maxTanks)}`);
    if (treaty.terms.maxAircraft) termsList.push(`Max aircraft: ${formatNumber(treaty.terms.maxAircraft)}`);
    if (treaty.terms.maxNavalVessels) termsList.push(`Max ships: ${formatNumber(treaty.terms.maxNavalVessels)}`);
    if (treaty.terms.inspectionsRequired) termsList.push('Inspections required');
    if (treaty.terms.bannedWeapons.length > 0) termsList.push(`Banned: ${treaty.terms.bannedWeapons.join(', ')}`);
    
    if (termsList.length > 0) {
      fields.push({ name: 'Terms', value: termsList.join('\n'), inline: false });
    }
    
    // Signatories
    const ratified = treaty.signatories.filter(s => s.status === 'ratified').map(s => s.nationName);
    const signed = treaty.signatories.filter(s => s.status === 'signed').map(s => s.nationName);
    const invited = treaty.signatories.filter(s => s.status === 'invited').map(s => s.nationName);
    const withdrawn = treaty.signatories.filter(s => s.status === 'withdrawn').map(s => s.nationName);
    
    if (ratified.length > 0) fields.push({ name: 'Ratified', value: ratified.join(', '), inline: true });
    if (signed.length > 0) fields.push({ name: 'Signed', value: signed.join(', '), inline: true });
    if (invited.length > 0) fields.push({ name: 'Invited', value: invited.join(', '), inline: true });
    if (withdrawn.length > 0) fields.push({ name: 'Withdrawn', value: withdrawn.join(', '), inline: true });
    
    // Violations
    if (treaty.violations.length > 0) {
      const recentViolations = treaty.violations.slice(-3).map(v => 
        `${v.violatorName}: ${v.description} (${v.severity})`
      ).join('\n');
      fields.push({ name: `Violations (${treaty.violations.length})`, value: recentViolations, inline: false });
    }
    
    const embed = createEmbed({
      title: `Treaty: ${treaty.name}`,
      description: treaty.description || 'No description',
      color: treaty.status === 'active' ? Colors.SUCCESS : treaty.status === 'collapsed' ? Colors.ERROR : Colors.INFO,
      fields,
      footer: { text: `Created: ${treaty.createdAt.toLocaleDateString()}${treaty.effectiveDate ? ` | Effective: ${treaty.effectiveDate.toLocaleDateString()}` : ''}` },
    });
    
    return interaction.reply({ embeds: [embed] });
  }

  if (subcommand === 'list') {
    const statusFilter = interaction.options.getString('status') || 'all';
    
    const query = { guildId };
    if (statusFilter === 'active') {
      query.status = 'active';
    } else if (statusFilter === 'draft') {
      query.status = { $in: ['draft', 'proposed', 'ratifying'] };
    } else if (statusFilter === 'collapsed') {
      query.status = { $in: ['collapsed', 'violated', 'expired'] };
    }
    
    const treaties = await NuclearTreaty.find(query).sort({ createdAt: -1 });
    
    if (treaties.length === 0) {
      return interaction.reply({
        embeds: [createEmbed({ title: 'Arms Treaties', description: 'No treaties found.', color: Colors.INFO })],
      });
    }
    
    const lines = treaties.map(t => {
      const status = formatStatusEmoji(t.status);
      const sigCount = t.signatories.filter(s => s.status === 'ratified').length;
      return `${status} **${t.name}**\n└ ${formatTreatyType(t.type)} | ${sigCount} ratified`;
    });
    
    return interaction.reply({
      embeds: [createEmbed({
        title: 'Arms Control Treaties',
        description: lines.join('\n\n'),
        color: Colors.INFO,
        footer: { text: `Showing ${treaties.length} treaty/treaties` },
      })],
    });
  }

  if (subcommand === 'delete') {
    if (!await requireGM(interaction)) return;
    
    const treatyName = interaction.options.getString('treaty');
    
    const treaty = await NuclearTreaty.findOneAndDelete({ guildId, name: treatyName });
    if (!treaty) {
      return interaction.reply({
        embeds: [createEmbed({ title: 'Error', description: `Treaty "${treatyName}" not found.`, color: Colors.ERROR })],
        ephemeral: true,
      });
    }
    
    return interaction.reply({
      embeds: [createEmbed({ title: 'Treaty Deleted', description: `Deleted: **${treatyName}**`, color: Colors.SUCCESS })],
    });
  }
}

function formatTreatyType(type) {
  const map = {
    nuclear_nonproliferation: 'Nuclear Non-Proliferation',
    arms_limitation: 'Arms Limitation',
    test_ban: 'Test Ban',
    disarmament: 'Disarmament',
    demilitarization: 'Demilitarization',
    weapons_ban: 'Weapons Ban',
    custom: 'Custom',
  };
  return map[type] || type;
}

function formatStatus(status) {
  const map = {
    draft: 'Draft',
    proposed: 'Proposed',
    ratifying: 'Ratifying',
    active: 'Active',
    violated: 'Violated',
    expired: 'Expired',
    withdrawn: 'Withdrawn',
    collapsed: 'Collapsed',
  };
  return map[status] || status;
}

function formatStatusEmoji(status) {
  const map = {
    draft: '📝',
    proposed: '📋',
    ratifying: '🔄',
    active: '✅',
    violated: '⚠️',
    expired: '⏰',
    withdrawn: '🚪',
    collapsed: '💔',
  };
  return map[status] || '❓';
}

export default { data, execute };
