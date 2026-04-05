import { SlashCommandBuilder } from 'discord.js';
import Nation from '../../database/models/Nation.js';
import { WorldCouncil, Resolution } from '../../database/models/WorldCouncil.js';
import { createAuditLog } from '../../database/models/AuditLog.js';
import { createHistoryEntry } from '../../database/models/HistoryEntry.js';
import { isGM, requireGM, canModifyNation } from '../../utils/permissions.js';
import { createEmbed, errorEmbed, successEmbed } from '../../utils/embeds.js';
import config from '../../config.js';

export const data = new SlashCommandBuilder()
  .setName('council')
  .setDescription('World Council / UN operations')
  .addSubcommand(sub =>
    sub.setName('setup')
      .setDescription('Setup the World Council (GM only)')
      .addStringOption(opt =>
        opt.setName('name')
          .setDescription('Council name')
          .setRequired(false)))
  .addSubcommand(sub =>
    sub.setName('join')
      .setDescription('Join the World Council')
      .addStringOption(opt =>
        opt.setName('nation')
          .setDescription('Nation to join')
          .setRequired(true)
          .setAutocomplete(true)))
  .addSubcommand(sub =>
    sub.setName('propose')
      .setDescription('Propose a resolution')
      .addStringOption(opt =>
        opt.setName('sponsor')
          .setDescription('Sponsoring nation')
          .setRequired(true)
          .setAutocomplete(true))
      .addStringOption(opt =>
        opt.setName('title')
          .setDescription('Resolution title')
          .setRequired(true))
      .addStringOption(opt =>
        opt.setName('type')
          .setDescription('Resolution type')
          .setRequired(true)
          .addChoices(
            { name: 'General', value: 'general' },
            { name: 'Security', value: 'security' },
            { name: 'Economic', value: 'economic' },
            { name: 'Humanitarian', value: 'humanitarian' }
          ))
      .addStringOption(opt =>
        opt.setName('text')
          .setDescription('Resolution text')
          .setRequired(false)))
  .addSubcommand(sub =>
    sub.setName('vote')
      .setDescription('Vote on a resolution')
      .addStringOption(opt =>
        opt.setName('nation')
          .setDescription('Your nation')
          .setRequired(true)
          .setAutocomplete(true))
      .addIntegerOption(opt =>
        opt.setName('resolution')
          .setDescription('Resolution number')
          .setRequired(true))
      .addStringOption(opt =>
        opt.setName('vote')
          .setDescription('Your vote')
          .setRequired(true)
          .addChoices(
            { name: 'For', value: 'for' },
            { name: 'Against', value: 'against' },
            { name: 'Abstain', value: 'abstain' }
          )))
  .addSubcommand(sub =>
    sub.setName('veto')
      .setDescription('Veto a resolution (Security Council only)')
      .addStringOption(opt =>
        opt.setName('nation')
          .setDescription('Your nation')
          .setRequired(true)
          .setAutocomplete(true))
      .addIntegerOption(opt =>
        opt.setName('resolution')
          .setDescription('Resolution number')
          .setRequired(true)))
  .addSubcommand(sub =>
    sub.setName('view')
      .setDescription('View resolutions')
      .addIntegerOption(opt =>
        opt.setName('resolution')
          .setDescription('Resolution number (optional)')
          .setRequired(false)))
  .addSubcommand(sub =>
    sub.setName('close')
      .setDescription('Close voting on a resolution (GM only)')
      .addIntegerOption(opt =>
        opt.setName('resolution')
          .setDescription('Resolution number')
          .setRequired(true)))
  .addSubcommand(sub =>
    sub.setName('members')
      .setDescription('View council members'))
  .addSubcommand(sub =>
    sub.setName('security')
      .setDescription('Manage Security Council (GM only)')
      .addStringOption(opt =>
        opt.setName('action')
          .setDescription('Action')
          .setRequired(true)
          .addChoices(
            { name: 'Add permanent member', value: 'add' },
            { name: 'Remove permanent member', value: 'remove' }
          ))
      .addStringOption(opt =>
        opt.setName('nation')
          .setDescription('Nation')
          .setRequired(true)
          .setAutocomplete(true)));

export async function execute(interaction) {
  const subcommand = interaction.options.getSubcommand();
  const guildId = interaction.guildId;
  
  // Get or create council
  let council = await WorldCouncil.findOne({ guildId });
  
  switch (subcommand) {
    case 'setup': {
      const gmCheck = await requireGM(interaction);
      if (!gmCheck) return;
      
      const name = interaction.options.getString('name') || 'World Council';
      
      if (council) {
        council.name = name;
        await council.save();
      } else {
        council = await WorldCouncil.create({ guildId, name, createdBy: interaction.user.id });
      }
      
      return interaction.reply({ embeds: [successEmbed(`${name} has been established`)] });
    }
    
    case 'join': {
      if (!council) {
        return interaction.reply({ embeds: [errorEmbed('World Council has not been established')], ephemeral: true });
      }
      
      const nationName = interaction.options.getString('nation');
      const nation = await Nation.findOne({ guildId, name: { $regex: new RegExp(`^${nationName}$`, 'i') } });
      if (!nation) return interaction.reply({ embeds: [errorEmbed('Nation not found')], ephemeral: true });
      
      const canModify = await canModifyNation(interaction.member, nation);
      if (!canModify) return interaction.reply({ embeds: [errorEmbed('You can only join with nations you own')], ephemeral: true });
      
      const isMember = council.members.some(m => m.nation.equals(nation._id));
      if (isMember) return interaction.reply({ embeds: [errorEmbed('Already a member')], ephemeral: true });
      
      council.members.push({ nation: nation._id, nationName: nation.name, role: 'rotating' });
      await council.save();
      
      return interaction.reply({ embeds: [successEmbed(`${nation.name} has joined the ${council.name}`)] });
    }
    
    case 'propose': {
      if (!council) return interaction.reply({ embeds: [errorEmbed('World Council not established')], ephemeral: true });
      
      const sponsorName = interaction.options.getString('sponsor');
      const title = interaction.options.getString('title');
      const type = interaction.options.getString('type');
      const text = interaction.options.getString('text') || '';
      
      const sponsor = await Nation.findOne({ guildId, name: { $regex: new RegExp(`^${sponsorName}$`, 'i') } });
      if (!sponsor) return interaction.reply({ embeds: [errorEmbed('Sponsor nation not found')], ephemeral: true });
      
      const canModify = await canModifyNation(interaction.member, sponsor);
      if (!canModify) return interaction.reply({ embeds: [errorEmbed('You can only sponsor resolutions with nations you own')], ephemeral: true });
      
      const isMember = council.members.some(m => m.nation.equals(sponsor._id));
      if (!isMember) return interaction.reply({ embeds: [errorEmbed('Only council members can propose resolutions')], ephemeral: true });
      
      const lastResolution = await Resolution.findOne({ guildId }).sort({ number: -1 });
      const newNumber = (lastResolution?.number || 0) + 1;
      
      const resolution = await Resolution.create({
        guildId,
        number: newNumber,
        title,
        type,
        fullText: text,
        sponsor: sponsor._id,
        sponsorName: sponsor.name,
        status: 'voting',
        createdBy: interaction.user.id,
      });
      
      const embed = successEmbed(`Resolution ${newNumber} Proposed`)
        .addFields(
          { name: 'Title', value: title, inline: false },
          { name: 'Type', value: type, inline: true },
          { name: 'Sponsor', value: sponsor.name, inline: true }
        )
        .setFooter({ text: 'Members can now vote using /council vote' });
      
      return interaction.reply({ embeds: [embed] });
    }
    
    case 'vote': {
      if (!council) return interaction.reply({ embeds: [errorEmbed('World Council not established')], ephemeral: true });
      
      const nationName = interaction.options.getString('nation');
      const resNumber = interaction.options.getInteger('resolution');
      const vote = interaction.options.getString('vote');
      
      const nation = await Nation.findOne({ guildId, name: { $regex: new RegExp(`^${nationName}$`, 'i') } });
      if (!nation) return interaction.reply({ embeds: [errorEmbed('Nation not found')], ephemeral: true });
      
      const canModify = await canModifyNation(interaction.member, nation);
      if (!canModify) return interaction.reply({ embeds: [errorEmbed('You can only vote with nations you own')], ephemeral: true });
      
      const isMember = council.members.some(m => m.nation.equals(nation._id) && m.role !== 'suspended');
      if (!isMember) return interaction.reply({ embeds: [errorEmbed('Only council members can vote')], ephemeral: true });
      
      const resolution = await Resolution.findOne({ guildId, number: resNumber });
      if (!resolution) return interaction.reply({ embeds: [errorEmbed('Resolution not found')], ephemeral: true });
      if (resolution.status !== 'voting') return interaction.reply({ embeds: [errorEmbed(`Resolution is ${resolution.status}, not open for voting`)], ephemeral: true });
      
      // Remove existing vote if any
      resolution.votes = resolution.votes.filter(v => !v.nation.equals(nation._id));
      resolution.votes.push({ nation: nation._id, nationName: nation.name, vote });
      
      // Update counts
      resolution.results.votesFor = resolution.votes.filter(v => v.vote === 'for').length;
      resolution.results.votesAgainst = resolution.votes.filter(v => v.vote === 'against').length;
      resolution.results.abstentions = resolution.votes.filter(v => v.vote === 'abstain').length;
      
      await resolution.save();
      
      const voteEmoji = vote === 'for' ? '✅' : vote === 'against' ? '❌' : '⬜';
      return interaction.reply({ embeds: [successEmbed(`${voteEmoji} ${nation.name} voted ${vote} on Resolution ${resNumber}`)] });
    }
    
    case 'veto': {
      if (!council) return interaction.reply({ embeds: [errorEmbed('World Council not established')], ephemeral: true });
      
      const nationName = interaction.options.getString('nation');
      const resNumber = interaction.options.getInteger('resolution');
      
      const nation = await Nation.findOne({ guildId, name: { $regex: new RegExp(`^${nationName}$`, 'i') } });
      if (!nation) return interaction.reply({ embeds: [errorEmbed('Nation not found')], ephemeral: true });
      
      // Check if security council member
      const isSecurityMember = council.securityCouncil.some(s => s.nation.equals(nation._id));
      if (!isSecurityMember) return interaction.reply({ embeds: [errorEmbed('Only Security Council permanent members can veto')], ephemeral: true });
      
      const canModify = await canModifyNation(interaction.member, nation);
      if (!canModify) return interaction.reply({ embeds: [errorEmbed('You can only veto with nations you own')], ephemeral: true });
      
      const resolution = await Resolution.findOne({ guildId, number: resNumber });
      if (!resolution) return interaction.reply({ embeds: [errorEmbed('Resolution not found')], ephemeral: true });
      if (resolution.status !== 'voting') return interaction.reply({ embeds: [errorEmbed('Resolution not open for voting')], ephemeral: true });
      
      resolution.status = 'vetoed';
      resolution.vetoed = true;
      resolution.vetoedBy = nation._id;
      resolution.vetoedByName = nation.name;
      resolution.resolvedAt = new Date();
      await resolution.save();
      
      return interaction.reply({ embeds: [createEmbed().setTitle('🚫 Resolution Vetoed').setDescription(`**${nation.name}** has vetoed Resolution ${resNumber}`).setColor(0xe74c3c)] });
    }
    
    case 'view': {
      const resNumber = interaction.options.getInteger('resolution');
      
      if (resNumber) {
        const resolution = await Resolution.findOne({ guildId, number: resNumber });
        if (!resolution) return interaction.reply({ embeds: [errorEmbed('Resolution not found')], ephemeral: true });
        
        const statusEmoji = { voting: '🗳️', passed: '✅', failed: '❌', vetoed: '🚫' };
        const embed = createEmbed()
          .setTitle(`${statusEmoji[resolution.status] || '📜'} Resolution ${resolution.number}: ${resolution.title}`)
          .setDescription(resolution.fullText || 'No text')
          .addFields(
            { name: 'Status', value: resolution.status, inline: true },
            { name: 'Type', value: resolution.type, inline: true },
            { name: 'Sponsor', value: resolution.sponsorName, inline: true },
            { name: 'Votes For', value: resolution.results.votesFor.toString(), inline: true },
            { name: 'Votes Against', value: resolution.results.votesAgainst.toString(), inline: true },
            { name: 'Abstentions', value: resolution.results.abstentions.toString(), inline: true }
          );
        
        if (resolution.vetoed) {
          embed.addFields({ name: 'Vetoed By', value: resolution.vetoedByName, inline: false });
        }
        
        return interaction.reply({ embeds: [embed] });
      } else {
        const resolutions = await Resolution.find({ guildId }).sort({ number: -1 }).limit(10);
        
        if (resolutions.length === 0) {
          return interaction.reply({ embeds: [createEmbed().setTitle('Resolutions').setDescription('No resolutions on record.')] });
        }
        
        const embed = createEmbed().setTitle(`${council?.name || 'World Council'} Resolutions`);
        for (const res of resolutions) {
          const statusEmoji = { voting: '🗳️', passed: '✅', failed: '❌', vetoed: '🚫' };
          embed.addFields({
            name: `${statusEmoji[res.status] || '📜'} Resolution ${res.number}`,
            value: `${res.title}\n${res.status} | Sponsor: ${res.sponsorName}`,
            inline: true
          });
        }
        return interaction.reply({ embeds: [embed] });
      }
    }
    
    case 'close': {
      const gmCheck = await requireGM(interaction);
      if (!gmCheck) return;
      
      const resNumber = interaction.options.getInteger('resolution');
      const resolution = await Resolution.findOne({ guildId, number: resNumber });
      if (!resolution) return interaction.reply({ embeds: [errorEmbed('Resolution not found')], ephemeral: true });
      if (resolution.status !== 'voting') return interaction.reply({ embeds: [errorEmbed('Resolution not open for voting')], ephemeral: true });
      
      const totalVotes = resolution.results.votesFor + resolution.results.votesAgainst;
      const percentFor = totalVotes > 0 ? (resolution.results.votesFor / totalVotes) * 100 : 0;
      const threshold = resolution.type === 'security' ? council?.settings?.securityThreshold || 60 : council?.settings?.resolutionThreshold || 50;
      
      resolution.results.percentageFor = percentFor;
      resolution.status = percentFor >= threshold ? 'passed' : 'failed';
      resolution.resolvedAt = new Date();
      await resolution.save();
      
      const statusEmoji = resolution.status === 'passed' ? '✅' : '❌';
      return interaction.reply({ embeds: [createEmbed().setTitle(`${statusEmoji} Resolution ${resNumber} ${resolution.status.toUpperCase()}`).setDescription(`${resolution.results.votesFor} for, ${resolution.results.votesAgainst} against (${percentFor.toFixed(1)}%, needed ${threshold}%)`).setColor(resolution.status === 'passed' ? 0x2ecc71 : 0xe74c3c)] });
    }
    
    case 'members': {
      if (!council) return interaction.reply({ embeds: [errorEmbed('World Council not established')], ephemeral: true });
      
      const embed = createEmbed().setTitle(`${council.name} Members`).setDescription(`${council.members.length} member nation(s)`);
      
      // Security Council
      if (council.securityCouncil.length > 0) {
        const scMembers = council.securityCouncil.map(s => `🔒 ${s.nationName}`).join('\n');
        embed.addFields({ name: 'Security Council (Veto Power)', value: scMembers, inline: false });
      }
      
      // Regular members
      const regularMembers = council.members.filter(m => m.role !== 'suspended').map(m => m.nationName).join(', ');
      embed.addFields({ name: 'Members', value: regularMembers || 'None', inline: false });
      
      return interaction.reply({ embeds: [embed] });
    }
    
    case 'security': {
      const gmCheck = await requireGM(interaction);
      if (!gmCheck) return;
      
      if (!council) return interaction.reply({ embeds: [errorEmbed('World Council not established')], ephemeral: true });
      
      const action = interaction.options.getString('action');
      const nationName = interaction.options.getString('nation');
      
      const nation = await Nation.findOne({ guildId, name: { $regex: new RegExp(`^${nationName}$`, 'i') } });
      if (!nation) return interaction.reply({ embeds: [errorEmbed('Nation not found')], ephemeral: true });
      
      if (action === 'add') {
        const exists = council.securityCouncil.some(s => s.nation.equals(nation._id));
        if (exists) return interaction.reply({ embeds: [errorEmbed('Already a Security Council member')], ephemeral: true });
        
        council.securityCouncil.push({ nation: nation._id, nationName: nation.name });
        await council.save();
        return interaction.reply({ embeds: [successEmbed(`${nation.name} added to Security Council`)] });
      } else {
        council.securityCouncil = council.securityCouncil.filter(s => !s.nation.equals(nation._id));
        await council.save();
        return interaction.reply({ embeds: [successEmbed(`${nation.name} removed from Security Council`)] });
      }
    }
    
    default:
      return interaction.reply({ embeds: [errorEmbed('Unknown subcommand')], ephemeral: true });
  }
}

export async function autocomplete(interaction) {
  const focusedOption = interaction.options.getFocused(true);
  const guildId = interaction.guildId;
  
  if (['nation', 'sponsor'].includes(focusedOption.name)) {
    const nations = await Nation.find({ guildId, name: { $regex: focusedOption.value, $options: 'i' } }).limit(25).select('name');
    return interaction.respond(nations.map(n => ({ name: n.name, value: n.name })));
  }
}
