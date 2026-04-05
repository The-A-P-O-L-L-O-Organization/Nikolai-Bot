import { SlashCommandBuilder } from 'discord.js';
import Nation from '../../database/models/Nation.js';
import Alliance from '../../database/models/Alliance.js';
import FogOfWar from '../../database/models/FogOfWar.js';
import { createAuditLog } from '../../database/models/AuditLog.js';
import { createHistoryEntry } from '../../database/models/HistoryEntry.js';
import { isGM, requireGM, canModifyNation } from '../../utils/permissions.js';
import { createEmbed, errorEmbed, successEmbed } from '../../utils/embeds.js';
import config from '../../config.js';

const ALLIANCE_TYPES = {
  military: { name: 'Military Alliance', emoji: '⚔️' },
  economic: { name: 'Economic Union', emoji: '💰' },
  defensive: { name: 'Defensive Pact', emoji: '🛡️' },
  offensive: { name: 'Offensive Alliance', emoji: '🗡️' },
  mutual_defense: { name: 'Mutual Defense Treaty', emoji: '🤝' },
  trade_bloc: { name: 'Trade Bloc', emoji: '📦' },
  political_union: { name: 'Political Union', emoji: '🏛️' },
  custom: { name: 'Custom Alliance', emoji: '⭐' },
};

export const data = new SlashCommandBuilder()
  .setName('alliance')
  .setDescription('Manage alliances between nations')
  .addSubcommand(sub =>
    sub.setName('create')
      .setDescription('Create a new alliance')
      .addStringOption(opt =>
        opt.setName('name')
          .setDescription('Alliance name')
          .setRequired(true))
      .addStringOption(opt =>
        opt.setName('leader')
          .setDescription('Founding nation (becomes leader)')
          .setRequired(true)
          .setAutocomplete(true))
      .addStringOption(opt =>
        opt.setName('type')
          .setDescription('Alliance type')
          .setRequired(true)
          .addChoices(
            { name: 'Military Alliance', value: 'military' },
            { name: 'Economic Union', value: 'economic' },
            { name: 'Defensive Pact', value: 'defensive' },
            { name: 'Mutual Defense Treaty', value: 'mutual_defense' },
            { name: 'Trade Bloc', value: 'trade_bloc' },
            { name: 'Political Union', value: 'political_union' },
            { name: 'Custom', value: 'custom' }
          ))
      .addStringOption(opt =>
        opt.setName('acronym')
          .setDescription('Short acronym (e.g., NATO)')
          .setRequired(false))
      .addStringOption(opt =>
        opt.setName('description')
          .setDescription('Alliance description')
          .setRequired(false)))
  .addSubcommand(sub =>
    sub.setName('invite')
      .setDescription('Invite a nation to an alliance')
      .addStringOption(opt =>
        opt.setName('alliance')
          .setDescription('Alliance name')
          .setRequired(true)
          .setAutocomplete(true))
      .addStringOption(opt =>
        opt.setName('nation')
          .setDescription('Nation to invite')
          .setRequired(true)
          .setAutocomplete(true)))
  .addSubcommand(sub =>
    sub.setName('join')
      .setDescription('Join an alliance (if invited)')
      .addStringOption(opt =>
        opt.setName('nation')
          .setDescription('Your nation')
          .setRequired(true)
          .setAutocomplete(true))
      .addStringOption(opt =>
        opt.setName('alliance')
          .setDescription('Alliance to join')
          .setRequired(true)
          .setAutocomplete(true)))
  .addSubcommand(sub =>
    sub.setName('leave')
      .setDescription('Leave an alliance')
      .addStringOption(opt =>
        opt.setName('nation')
          .setDescription('Your nation')
          .setRequired(true)
          .setAutocomplete(true))
      .addStringOption(opt =>
        opt.setName('alliance')
          .setDescription('Alliance to leave')
          .setRequired(true)
          .setAutocomplete(true)))
  .addSubcommand(sub =>
    sub.setName('kick')
      .setDescription('Remove a nation from alliance (leader only)')
      .addStringOption(opt =>
        opt.setName('alliance')
          .setDescription('Alliance name')
          .setRequired(true)
          .setAutocomplete(true))
      .addStringOption(opt =>
        opt.setName('nation')
          .setDescription('Nation to remove')
          .setRequired(true)
          .setAutocomplete(true)))
  .addSubcommand(sub =>
    sub.setName('view')
      .setDescription('View alliance details')
      .addStringOption(opt =>
        opt.setName('alliance')
          .setDescription('Alliance name')
          .setRequired(true)
          .setAutocomplete(true)))
  .addSubcommand(sub =>
    sub.setName('list')
      .setDescription('List all alliances'))
  .addSubcommand(sub =>
    sub.setName('dissolve')
      .setDescription('Dissolve an alliance (leader/GM only)')
      .addStringOption(opt =>
        opt.setName('alliance')
          .setDescription('Alliance to dissolve')
          .setRequired(true)
          .setAutocomplete(true)))
  .addSubcommand(sub =>
    sub.setName('terms')
      .setDescription('Set alliance terms (leader only)')
      .addStringOption(opt =>
        opt.setName('alliance')
          .setDescription('Alliance name')
          .setRequired(true)
          .setAutocomplete(true))
      .addBooleanOption(opt =>
        opt.setName('mutual_defense')
          .setDescription('Members must defend each other')
          .setRequired(false))
      .addBooleanOption(opt =>
        opt.setName('intel_sharing')
          .setDescription('Share intelligence between members')
          .setRequired(false))
      .addBooleanOption(opt =>
        opt.setName('military_access')
          .setDescription('Allow military access between members')
          .setRequired(false))
      .addBooleanOption(opt =>
        opt.setName('economic_cooperation')
          .setDescription('Economic cooperation between members')
          .setRequired(false)));

export async function execute(interaction) {
  const subcommand = interaction.options.getSubcommand();
  
  switch (subcommand) {
    case 'create':
      return handleCreate(interaction);
    case 'invite':
      return handleInvite(interaction);
    case 'join':
      return handleJoin(interaction);
    case 'leave':
      return handleLeave(interaction);
    case 'kick':
      return handleKick(interaction);
    case 'view':
      return handleView(interaction);
    case 'list':
      return handleList(interaction);
    case 'dissolve':
      return handleDissolve(interaction);
    case 'terms':
      return handleTerms(interaction);
    default:
      return interaction.reply({ embeds: [errorEmbed('Unknown subcommand')], ephemeral: true });
  }
}

async function handleCreate(interaction) {
  const guildId = interaction.guildId;
  const name = interaction.options.getString('name');
  const leaderName = interaction.options.getString('leader');
  const type = interaction.options.getString('type');
  const acronym = interaction.options.getString('acronym');
  const description = interaction.options.getString('description') || '';
  
  const leader = await Nation.findOne({ guildId, name: { $regex: new RegExp(`^${leaderName}$`, 'i') } });
  if (!leader) {
    return interaction.reply({ embeds: [errorEmbed(`Nation "${leaderName}" not found`)], ephemeral: true });
  }
  
  const canModify = await canModifyNation(interaction, leader);
  if (!canModify) {
    return interaction.reply({ embeds: [errorEmbed('You can only create alliances with nations you own')], ephemeral: true });
  }
  
  // Check if alliance name exists
  const existing = await Alliance.findOne({ guildId, name: { $regex: new RegExp(`^${name}$`, 'i') } });
  if (existing) {
    return interaction.reply({ embeds: [errorEmbed(`Alliance "${name}" already exists`)], ephemeral: true });
  }
  
  const alliance = await Alliance.create({
    guildId,
    name,
    acronym,
    description,
    type,
    leader: leader._id,
    leaderName: leader.name,
    members: [{
      nation: leader._id,
      nationName: leader.name,
      role: 'leader',
      joinedAt: new Date(),
      votingPower: 2, // Leader has double voting power
    }],
    createdBy: interaction.user.id,
  });
  
  await createHistoryEntry({
    guildId,
    nation: leader._id,
    nationName: leader.name,
    type: 'diplomatic',
    title: 'Alliance Founded',
    description: `Founded ${name}`,
    performedBy: interaction.user.id,
  });
  
  await createAuditLog({
    guildId,
    action: 'alliance_create',
    performedBy: interaction.user.id,
    target: name,
    details: { allianceId: alliance._id.toString(), type, leader: leader.name },
  });
  
  const typeInfo = ALLIANCE_TYPES[type];
  const embed = successEmbed(`${typeInfo.emoji} Alliance Created: ${name}`)
    .setDescription(description || 'No description')
    .addFields(
      { name: 'Type', value: typeInfo.name, inline: true },
      { name: 'Leader', value: leader.name, inline: true },
      { name: 'Acronym', value: acronym || 'None', inline: true }
    );
  
  return interaction.reply({ embeds: [embed] });
}

async function handleInvite(interaction) {
  const guildId = interaction.guildId;
  const allianceName = interaction.options.getString('alliance');
  const nationName = interaction.options.getString('nation');
  
  const alliance = await Alliance.findOne({ guildId, name: { $regex: new RegExp(`^${allianceName}$`, 'i') } });
  if (!alliance) {
    return interaction.reply({ embeds: [errorEmbed(`Alliance "${allianceName}" not found`)], ephemeral: true });
  }
  
  const nation = await Nation.findOne({ guildId, name: { $regex: new RegExp(`^${nationName}$`, 'i') } });
  if (!nation) {
    return interaction.reply({ embeds: [errorEmbed(`Nation "${nationName}" not found`)], ephemeral: true });
  }
  
  // Check if inviter is leader
  const leader = await Nation.findById(alliance.leader);
  if (leader) {
    const canModify = await canModifyNation(interaction, leader);
    if (!canModify) {
      const gm = await isGM(interaction);
      if (!gm) {
        return interaction.reply({ embeds: [errorEmbed('Only the alliance leader can invite nations')], ephemeral: true });
      }
    }
  }
  
  // Check if already member
  const isMember = alliance.members.some(m => m.nation.equals(nation._id));
  if (isMember) {
    return interaction.reply({ embeds: [errorEmbed(`${nation.name} is already a member`)], ephemeral: true });
  }
  
  // Add as applicant
  alliance.members.push({
    nation: nation._id,
    nationName: nation.name,
    role: 'applicant',
    joinedAt: new Date(),
    votingPower: 0,
  });
  await alliance.save();
  
  const embed = successEmbed(`Invitation Sent`)
    .setDescription(`**${nation.name}** has been invited to **${alliance.name}**`)
    .setFooter({ text: `${nation.name} must use /alliance join to accept` });
  
  return interaction.reply({ embeds: [embed] });
}

async function handleJoin(interaction) {
  const guildId = interaction.guildId;
  const nationName = interaction.options.getString('nation');
  const allianceName = interaction.options.getString('alliance');
  
  const nation = await Nation.findOne({ guildId, name: { $regex: new RegExp(`^${nationName}$`, 'i') } });
  if (!nation) {
    return interaction.reply({ embeds: [errorEmbed(`Nation "${nationName}" not found`)], ephemeral: true });
  }
  
  const canModify = await canModifyNation(interaction, nation);
  if (!canModify) {
    return interaction.reply({ embeds: [errorEmbed('You can only join alliances with nations you own')], ephemeral: true });
  }
  
  const alliance = await Alliance.findOne({ guildId, name: { $regex: new RegExp(`^${allianceName}$`, 'i') } });
  if (!alliance) {
    return interaction.reply({ embeds: [errorEmbed(`Alliance "${allianceName}" not found`)], ephemeral: true });
  }
  
  // Check if invited (applicant)
  const memberIndex = alliance.members.findIndex(m => m.nation.equals(nation._id));
  if (memberIndex === -1) {
    return interaction.reply({ embeds: [errorEmbed(`${nation.name} has not been invited to ${alliance.name}`)], ephemeral: true });
  }
  
  const member = alliance.members[memberIndex];
  if (member.role !== 'applicant') {
    return interaction.reply({ embeds: [errorEmbed(`${nation.name} is already a ${member.role}`)], ephemeral: true });
  }
  
  // Update to full member
  alliance.members[memberIndex].role = 'member';
  alliance.members[memberIndex].votingPower = 1;
  await alliance.save();
  
  // If alliance has intel sharing, update fog of war
  if (alliance.terms.intelligenceSharing) {
    for (const otherMember of alliance.members) {
      if (!otherMember.nation.equals(nation._id) && otherMember.role !== 'applicant') {
        // Grant mutual intel
        await FogOfWar.findOneAndUpdate(
          { guildId, observerNation: nation._id, targetNation: otherMember.nation },
          { intelligenceLevel: 3, source: 'alliance', observerNationName: nation.name, targetNationName: otherMember.nationName },
          { upsert: true }
        );
        await FogOfWar.findOneAndUpdate(
          { guildId, observerNation: otherMember.nation, targetNation: nation._id },
          { intelligenceLevel: 3, source: 'alliance', observerNationName: otherMember.nationName, targetNationName: nation.name },
          { upsert: true }
        );
      }
    }
  }
  
  await createHistoryEntry({
    guildId,
    nation: nation._id,
    nationName: nation.name,
    type: 'diplomatic',
    title: 'Joined Alliance',
    description: `Joined ${alliance.name}`,
    performedBy: interaction.user.id,
  });
  
  const embed = successEmbed('Joined Alliance')
    .setDescription(`**${nation.name}** has joined **${alliance.name}**`);
  
  return interaction.reply({ embeds: [embed] });
}

async function handleLeave(interaction) {
  const guildId = interaction.guildId;
  const nationName = interaction.options.getString('nation');
  const allianceName = interaction.options.getString('alliance');
  
  const nation = await Nation.findOne({ guildId, name: { $regex: new RegExp(`^${nationName}$`, 'i') } });
  if (!nation) {
    return interaction.reply({ embeds: [errorEmbed(`Nation "${nationName}" not found`)], ephemeral: true });
  }
  
  const canModify = await canModifyNation(interaction, nation);
  if (!canModify) {
    return interaction.reply({ embeds: [errorEmbed('You can only leave alliances with nations you own')], ephemeral: true });
  }
  
  const alliance = await Alliance.findOne({ guildId, name: { $regex: new RegExp(`^${allianceName}$`, 'i') } });
  if (!alliance) {
    return interaction.reply({ embeds: [errorEmbed(`Alliance "${allianceName}" not found`)], ephemeral: true });
  }
  
  const memberIndex = alliance.members.findIndex(m => m.nation.equals(nation._id));
  if (memberIndex === -1) {
    return interaction.reply({ embeds: [errorEmbed(`${nation.name} is not a member of ${alliance.name}`)], ephemeral: true });
  }
  
  // Check if leader
  if (alliance.leader && alliance.leader.equals(nation._id)) {
    return interaction.reply({ embeds: [errorEmbed('Leader cannot leave. Transfer leadership or dissolve the alliance.')], ephemeral: true });
  }
  
  alliance.members.splice(memberIndex, 1);
  await alliance.save();
  
  await createHistoryEntry({
    guildId,
    nation: nation._id,
    nationName: nation.name,
    type: 'diplomatic',
    title: 'Left Alliance',
    description: `Left ${alliance.name}`,
    performedBy: interaction.user.id,
  });
  
  const embed = createEmbed()
    .setTitle('Left Alliance')
    .setDescription(`**${nation.name}** has left **${alliance.name}**`)
    .setColor(0xffa500);
  
  return interaction.reply({ embeds: [embed] });
}

async function handleKick(interaction) {
  const guildId = interaction.guildId;
  const allianceName = interaction.options.getString('alliance');
  const nationName = interaction.options.getString('nation');
  
  const alliance = await Alliance.findOne({ guildId, name: { $regex: new RegExp(`^${allianceName}$`, 'i') } });
  if (!alliance) {
    return interaction.reply({ embeds: [errorEmbed(`Alliance "${allianceName}" not found`)], ephemeral: true });
  }
  
  // Check if requester is leader
  const leader = await Nation.findById(alliance.leader);
  if (leader) {
    const canModify = await canModifyNation(interaction, leader);
    if (!canModify) {
      const gm = await isGM(interaction);
      if (!gm) {
        return interaction.reply({ embeds: [errorEmbed('Only the alliance leader can kick nations')], ephemeral: true });
      }
    }
  }
  
  const nation = await Nation.findOne({ guildId, name: { $regex: new RegExp(`^${nationName}$`, 'i') } });
  if (!nation) {
    return interaction.reply({ embeds: [errorEmbed(`Nation "${nationName}" not found`)], ephemeral: true });
  }
  
  if (alliance.leader && alliance.leader.equals(nation._id)) {
    return interaction.reply({ embeds: [errorEmbed('Cannot kick the alliance leader')], ephemeral: true });
  }
  
  const memberIndex = alliance.members.findIndex(m => m.nation.equals(nation._id));
  if (memberIndex === -1) {
    return interaction.reply({ embeds: [errorEmbed(`${nation.name} is not a member`)], ephemeral: true });
  }
  
  alliance.members.splice(memberIndex, 1);
  await alliance.save();
  
  const embed = successEmbed('Member Removed')
    .setDescription(`**${nation.name}** has been removed from **${alliance.name}**`);
  
  return interaction.reply({ embeds: [embed] });
}

async function handleView(interaction) {
  const guildId = interaction.guildId;
  const allianceName = interaction.options.getString('alliance');
  
  const alliance = await Alliance.findOne({ guildId, name: { $regex: new RegExp(`^${allianceName}$`, 'i') } });
  if (!alliance) {
    return interaction.reply({ embeds: [errorEmbed(`Alliance "${allianceName}" not found`)], ephemeral: true });
  }
  
  const typeInfo = ALLIANCE_TYPES[alliance.type];
  const activeMembers = alliance.members.filter(m => m.role !== 'applicant');
  const applicants = alliance.members.filter(m => m.role === 'applicant');
  
  const embed = createEmbed()
    .setTitle(`${typeInfo.emoji} ${alliance.name}${alliance.acronym ? ` (${alliance.acronym})` : ''}`)
    .setDescription(alliance.description || 'No description')
    .setThumbnail(alliance.flag || null)
    .addFields(
      { name: 'Type', value: typeInfo.name, inline: true },
      { name: 'Leader', value: alliance.leaderName || 'None', inline: true },
      { name: 'Members', value: activeMembers.length.toString(), inline: true }
    );
  
  // Member list
  const memberList = activeMembers.map(m => {
    const roleEmoji = m.role === 'leader' ? '👑' : m.role === 'founder' ? '⭐' : '';
    return `${roleEmoji} ${m.nationName}`;
  }).join('\n');
  
  embed.addFields({ name: 'Member Nations', value: memberList || 'None', inline: false });
  
  // Terms
  const terms = [];
  if (alliance.terms.mutualDefense) terms.push('🛡️ Mutual Defense');
  if (alliance.terms.intelligenceSharing) terms.push('🕵️ Intelligence Sharing');
  if (alliance.terms.militaryAccess) terms.push('⚔️ Military Access');
  if (alliance.terms.economicCooperation) terms.push('💰 Economic Cooperation');
  if (alliance.terms.collectiveSanctions) terms.push('🚫 Collective Sanctions');
  
  if (terms.length > 0) {
    embed.addFields({ name: 'Alliance Terms', value: terms.join('\n'), inline: false });
  }
  
  if (applicants.length > 0) {
    embed.addFields({ 
      name: 'Pending Applications', 
      value: applicants.map(a => a.nationName).join(', '), 
      inline: false 
    });
  }
  
  embed.setFooter({ text: `Founded: ${alliance.createdAt.toLocaleDateString()}` });
  
  return interaction.reply({ embeds: [embed] });
}

async function handleList(interaction) {
  const guildId = interaction.guildId;
  
  const alliances = await Alliance.find({ guildId, status: 'active' }).sort({ createdAt: -1 });
  
  if (alliances.length === 0) {
    return interaction.reply({ 
      embeds: [createEmbed()
        .setTitle('Alliances')
        .setDescription('No active alliances.')
      ] 
    });
  }
  
  const embed = createEmbed()
    .setTitle('Active Alliances')
    .setDescription(`${alliances.length} alliance(s)`);
  
  for (const alliance of alliances.slice(0, 15)) {
    const typeInfo = ALLIANCE_TYPES[alliance.type];
    const activeMembers = alliance.members.filter(m => m.role !== 'applicant').length;
    
    embed.addFields({
      name: `${typeInfo.emoji} ${alliance.name}${alliance.acronym ? ` (${alliance.acronym})` : ''}`,
      value: `${typeInfo.name} | ${activeMembers} members\nLeader: ${alliance.leaderName || 'None'}`,
      inline: true
    });
  }
  
  return interaction.reply({ embeds: [embed] });
}

async function handleDissolve(interaction) {
  const guildId = interaction.guildId;
  const allianceName = interaction.options.getString('alliance');
  
  const alliance = await Alliance.findOne({ guildId, name: { $regex: new RegExp(`^${allianceName}$`, 'i') } });
  if (!alliance) {
    return interaction.reply({ embeds: [errorEmbed(`Alliance "${allianceName}" not found`)], ephemeral: true });
  }
  
  // Check if requester is leader or GM
  let authorized = false;
  if (alliance.leader) {
    const leader = await Nation.findById(alliance.leader);
    if (leader) {
      authorized = await canModifyNation(interaction, leader);
    }
  }
  
  if (!authorized) {
    const gm = await isGM(interaction);
    if (!gm) {
      return interaction.reply({ embeds: [errorEmbed('Only the alliance leader or GM can dissolve an alliance')], ephemeral: true });
    }
  }
  
  alliance.status = 'dissolved';
  alliance.dissolvedAt = new Date();
  await alliance.save();
  
  // Create history for all members
  for (const member of alliance.members) {
    await createHistoryEntry({
      guildId,
      nation: member.nation,
      nationName: member.nationName,
      type: 'diplomatic',
      title: 'Alliance Dissolved',
      description: `${alliance.name} has been dissolved`,
      performedBy: interaction.user.id,
    });
  }
  
  await createAuditLog({
    guildId,
    action: 'alliance_dissolve',
    performedBy: interaction.user.id,
    target: alliance.name,
    details: { memberCount: alliance.members.length },
  });
  
  const embed = createEmbed()
    .setTitle('Alliance Dissolved')
    .setDescription(`**${alliance.name}** has been dissolved.`)
    .setColor(0xe74c3c);
  
  return interaction.reply({ embeds: [embed] });
}

async function handleTerms(interaction) {
  const guildId = interaction.guildId;
  const allianceName = interaction.options.getString('alliance');
  const mutualDefense = interaction.options.getBoolean('mutual_defense');
  const intelSharing = interaction.options.getBoolean('intel_sharing');
  const militaryAccess = interaction.options.getBoolean('military_access');
  const economicCoop = interaction.options.getBoolean('economic_cooperation');
  
  const alliance = await Alliance.findOne({ guildId, name: { $regex: new RegExp(`^${allianceName}$`, 'i') } });
  if (!alliance) {
    return interaction.reply({ embeds: [errorEmbed(`Alliance "${allianceName}" not found`)], ephemeral: true });
  }
  
  // Check if leader
  const leader = await Nation.findById(alliance.leader);
  if (leader) {
    const canModify = await canModifyNation(interaction, leader);
    if (!canModify) {
      const gm = await isGM(interaction);
      if (!gm) {
        return interaction.reply({ embeds: [errorEmbed('Only the alliance leader can modify terms')], ephemeral: true });
      }
    }
  }
  
  // Update terms
  if (mutualDefense !== null) alliance.terms.mutualDefense = mutualDefense;
  if (intelSharing !== null) alliance.terms.intelligenceSharing = intelSharing;
  if (militaryAccess !== null) alliance.terms.militaryAccess = militaryAccess;
  if (economicCoop !== null) alliance.terms.economicCooperation = economicCoop;
  
  await alliance.save();
  
  const embed = successEmbed('Alliance Terms Updated')
    .setDescription(`Terms for **${alliance.name}** have been updated`)
    .addFields(
      { name: 'Mutual Defense', value: alliance.terms.mutualDefense ? '✅' : '❌', inline: true },
      { name: 'Intel Sharing', value: alliance.terms.intelligenceSharing ? '✅' : '❌', inline: true },
      { name: 'Military Access', value: alliance.terms.militaryAccess ? '✅' : '❌', inline: true },
      { name: 'Economic Coop', value: alliance.terms.economicCooperation ? '✅' : '❌', inline: true }
    );
  
  return interaction.reply({ embeds: [embed] });
}

export async function autocomplete(interaction) {
  const focusedOption = interaction.options.getFocused(true);
  const guildId = interaction.guildId;
  
  if (['nation', 'leader'].includes(focusedOption.name)) {
    const nations = await Nation.find({ 
      guildId,
      name: { $regex: focusedOption.value, $options: 'i' }
    }).limit(25).select('name');
    
    return interaction.respond(
      nations.map(n => ({ name: n.name, value: n.name }))
    );
  }
  
  if (focusedOption.name === 'alliance') {
    const alliances = await Alliance.find({ 
      guildId,
      status: 'active',
      name: { $regex: focusedOption.value, $options: 'i' }
    }).limit(25).select('name acronym');
    
    return interaction.respond(
      alliances.map(a => ({ 
        name: a.acronym ? `${a.name} (${a.acronym})` : a.name, 
        value: a.name 
      }))
    );
  }
}
