import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { MercenaryCompany, MercenaryContract } from '../../database/models/Mercenary.js';
import Nation from '../../database/models/Nation.js';
import { requireGM, canModifyNation, isGM } from '../../utils/permissions.js';
import { createEmbed, Colors } from '../../utils/embeds.js';
import { formatNumber, parseNumber } from '../../utils/formatters.js';

const data = new SlashCommandBuilder()
  .setName('mercenary')
  .setDescription('Manage mercenary companies and contracts')
  .addSubcommandGroup(group =>
    group
      .setName('company')
      .setDescription('Manage mercenary companies')
      .addSubcommand(sub =>
        sub
          .setName('create')
          .setDescription('[GM] Create a new mercenary company')
          .addStringOption(opt =>
            opt.setName('name').setDescription('Company name').setRequired(true)
          )
          .addStringOption(opt =>
            opt.setName('type').setDescription('Company type')
              .addChoices(
                { name: 'Private Military Company', value: 'private_military' },
                { name: 'Mercenary Band', value: 'mercenary_band' },
                { name: 'Security Contractor', value: 'security_contractor' },
                { name: 'Foreign Legion', value: 'foreign_legion' },
                { name: 'Volunteer Corps', value: 'volunteer_corps' },
                { name: 'Pirates', value: 'pirates' },
                { name: 'Rebel Fighters', value: 'rebel_fighters' },
                { name: 'Custom', value: 'custom' }
              )
          )
          .addStringOption(opt =>
            opt.setName('description').setDescription('Company description')
          )
          .addStringOption(opt =>
            opt.setName('motto').setDescription('Company motto')
          )
      )
      .addSubcommand(sub =>
        sub
          .setName('delete')
          .setDescription('[GM] Delete a mercenary company')
          .addStringOption(opt =>
            opt.setName('name').setDescription('Company name').setRequired(true)
          )
      )
      .addSubcommand(sub =>
        sub
          .setName('list')
          .setDescription('List all mercenary companies')
          .addBooleanOption(opt =>
            opt.setName('available').setDescription('Show only available companies')
          )
      )
      .addSubcommand(sub =>
        sub
          .setName('view')
          .setDescription('View mercenary company details')
          .addStringOption(opt =>
            opt.setName('name').setDescription('Company name').setRequired(true)
          )
      )
  )
  .addSubcommandGroup(group =>
    group
      .setName('forces')
      .setDescription('Manage company forces')
      .addSubcommand(sub =>
        sub
          .setName('set')
          .setDescription('[GM] Set company force composition')
          .addStringOption(opt =>
            opt.setName('company').setDescription('Company name').setRequired(true)
          )
          .addStringOption(opt =>
            opt.setName('infantry').setDescription('Infantry count')
          )
          .addStringOption(opt =>
            opt.setName('armor').setDescription('Armor/vehicle count')
          )
          .addStringOption(opt =>
            opt.setName('artillery').setDescription('Artillery count')
          )
          .addStringOption(opt =>
            opt.setName('aircraft').setDescription('Aircraft count')
          )
          .addStringOption(opt =>
            opt.setName('naval').setDescription('Naval vessel count')
          )
          .addStringOption(opt =>
            opt.setName('special').setDescription('Special forces count')
          )
      )
  )
  .addSubcommandGroup(group =>
    group
      .setName('ratings')
      .setDescription('Manage company ratings')
      .addSubcommand(sub =>
        sub
          .setName('set')
          .setDescription('[GM] Set company quality ratings')
          .addStringOption(opt =>
            opt.setName('company').setDescription('Company name').setRequired(true)
          )
          .addIntegerOption(opt =>
            opt.setName('combat').setDescription('Combat effectiveness (0-100)')
              .setMinValue(0).setMaxValue(100)
          )
          .addIntegerOption(opt =>
            opt.setName('discipline').setDescription('Discipline (0-100)')
              .setMinValue(0).setMaxValue(100)
          )
          .addIntegerOption(opt =>
            opt.setName('loyalty').setDescription('Loyalty (0-100)')
              .setMinValue(0).setMaxValue(100)
          )
          .addIntegerOption(opt =>
            opt.setName('morale').setDescription('Morale (0-100)')
              .setMinValue(0).setMaxValue(100)
          )
          .addIntegerOption(opt =>
            opt.setName('equipment').setDescription('Equipment quality (0-100)')
              .setMinValue(0).setMaxValue(100)
          )
      )
  )
  .addSubcommandGroup(group =>
    group
      .setName('pricing')
      .setDescription('Manage company pricing')
      .addSubcommand(sub =>
        sub
          .setName('set')
          .setDescription('[GM] Set company pricing')
          .addStringOption(opt =>
            opt.setName('company').setDescription('Company name').setRequired(true)
          )
          .addStringOption(opt =>
            opt.setName('hire_cost').setDescription('One-time hiring fee')
          )
          .addStringOption(opt =>
            opt.setName('monthly').setDescription('Monthly/per-turn cost')
          )
          .addStringOption(opt =>
            opt.setName('combat_bonus').setDescription('Combat bonus pay')
          )
          .addStringOption(opt =>
            opt.setName('currency').setDescription('Currency name')
          )
      )
  )
  .addSubcommand(sub =>
    sub
      .setName('hire')
      .setDescription('[GM] Hire a mercenary company for a nation')
      .addStringOption(opt =>
        opt.setName('company').setDescription('Company name').setRequired(true)
      )
      .addStringOption(opt =>
        opt.setName('nation').setDescription('Hiring nation').setRequired(true)
      )
      .addIntegerOption(opt =>
        opt.setName('duration').setDescription('Contract duration in turns')
      )
      .addStringOption(opt =>
        opt.setName('mission').setDescription('Contract mission/purpose')
      )
  )
  .addSubcommand(sub =>
    sub
      .setName('release')
      .setDescription('[GM] Release a mercenary company from contract')
      .addStringOption(opt =>
        opt.setName('company').setDescription('Company name').setRequired(true)
      )
      .addStringOption(opt =>
        opt.setName('reason').setDescription('Reason for release')
          .addChoices(
            { name: 'Contract Completed', value: 'completed' },
            { name: 'Terminated Early', value: 'terminated' },
            { name: 'Company Betrayed', value: 'betrayed' },
            { name: 'Company Destroyed', value: 'destroyed' }
          )
      )
  )
  .addSubcommand(sub =>
    sub
      .setName('commander')
      .setDescription('[GM] Set company commander')
      .addStringOption(opt =>
        opt.setName('company').setDescription('Company name').setRequired(true)
      )
      .addStringOption(opt =>
        opt.setName('name').setDescription('Commander name').setRequired(true)
      )
      .addStringOption(opt =>
        opt.setName('background').setDescription('Commander background')
      )
  )
  .addSubcommand(sub =>
    sub
      .setName('specialization')
      .setDescription('[GM] Add specialization to company')
      .addStringOption(opt =>
        opt.setName('company').setDescription('Company name').setRequired(true)
      )
      .addStringOption(opt =>
        opt.setName('spec').setDescription('Specialization')
          .setRequired(true)
          .addChoices(
            { name: 'Infantry', value: 'infantry' },
            { name: 'Armor', value: 'armor' },
            { name: 'Aerial', value: 'aerial' },
            { name: 'Naval', value: 'naval' },
            { name: 'Special Operations', value: 'special_ops' },
            { name: 'Urban Warfare', value: 'urban' },
            { name: 'Jungle Warfare', value: 'jungle' },
            { name: 'Desert Warfare', value: 'desert' },
            { name: 'Arctic Warfare', value: 'arctic' },
            { name: 'Mountain Warfare', value: 'mountain' },
            { name: 'Siege', value: 'siege' },
            { name: 'Counter-Insurgency', value: 'counter_insurgency' },
            { name: 'Assassination', value: 'assassination' },
            { name: 'Sabotage', value: 'sabotage' },
            { name: 'Training', value: 'training' },
            { name: 'Security', value: 'security' }
          )
      )
  )
  .addSubcommand(sub =>
    sub
      .setName('contracts')
      .setDescription('View contract history for a company or nation')
      .addStringOption(opt =>
        opt.setName('company').setDescription('Company name')
      )
      .addStringOption(opt =>
        opt.setName('nation').setDescription('Nation name')
      )
  );

async function execute(interaction) {
  const guildId = interaction.guild.id;
  const subcommandGroup = interaction.options.getSubcommandGroup(false);
  const subcommand = interaction.options.getSubcommand();

  // Company management
  if (subcommandGroup === 'company') {
    if (subcommand === 'create') {
      if (!await requireGM(interaction)) return;
      
      const name = interaction.options.getString('name');
      const type = interaction.options.getString('type') || 'private_military';
      const description = interaction.options.getString('description') || '';
      const motto = interaction.options.getString('motto');
      
      const existing = await MercenaryCompany.findOne({ guildId, name });
      if (existing) {
        return interaction.reply({
          embeds: [createEmbed({ title: 'Error', description: `Company "${name}" already exists.`, color: Colors.ERROR })],
          ephemeral: true,
        });
      }
      
      const company = new MercenaryCompany({
        guildId,
        name,
        type,
        description,
        motto,
        status: 'available',
        createdBy: interaction.user.id,
      });
      
      await company.save();
      
      return interaction.reply({
        embeds: [createEmbed({
          title: 'Mercenary Company Created',
          description: `Created: **${name}**${motto ? `\n*"${motto}"*` : ''}`,
          color: Colors.SUCCESS,
          fields: [
            { name: 'Type', value: formatCompanyType(type), inline: true },
            { name: 'Status', value: 'Available for hire', inline: true },
          ],
          footer: { text: 'Use /mercenary forces, ratings, and pricing to configure' },
        })],
      });
    }
    
    if (subcommand === 'delete') {
      if (!await requireGM(interaction)) return;
      
      const name = interaction.options.getString('name');
      
      const company = await MercenaryCompany.findOneAndDelete({ guildId, name });
      if (!company) {
        return interaction.reply({
          embeds: [createEmbed({ title: 'Error', description: `Company "${name}" not found.`, color: Colors.ERROR })],
          ephemeral: true,
        });
      }
      
      return interaction.reply({
        embeds: [createEmbed({ title: 'Company Deleted', description: `Deleted: **${name}**`, color: Colors.SUCCESS })],
      });
    }
    
    if (subcommand === 'list') {
      const availableOnly = interaction.options.getBoolean('available') || false;
      
      const query = { guildId };
      if (availableOnly) {
        query.status = 'available';
      }
      
      const companies = await MercenaryCompany.find(query).sort({ name: 1 });
      
      if (companies.length === 0) {
        return interaction.reply({
          embeds: [createEmbed({
            title: 'Mercenary Companies',
            description: availableOnly ? 'No available companies.' : 'No companies registered.',
            color: Colors.INFO,
          })],
        });
      }
      
      const lines = companies.map(c => {
        const status = c.status === 'available' ? '✅' : c.status === 'contracted' ? '📋' : '❌';
        const employer = c.employerName ? ` (${c.employerName})` : '';
        const troops = c.forces.total || (c.forces.infantry + c.forces.armor + c.forces.special);
        return `${status} **${c.name}**${employer}\n└ ${formatCompanyType(c.type)} | ${formatNumber(troops)} troops | ${formatNumber(c.pricing.monthlyCost)} ${c.pricing.currency}/turn`;
      });
      
      return interaction.reply({
        embeds: [createEmbed({
          title: 'Mercenary Companies',
          description: lines.join('\n\n'),
          color: Colors.INFO,
          footer: { text: `Showing ${companies.length} company/companies` },
        })],
      });
    }
    
    if (subcommand === 'view') {
      const name = interaction.options.getString('name');
      
      const company = await MercenaryCompany.findOne({ guildId, name });
      if (!company) {
        return interaction.reply({
          embeds: [createEmbed({ title: 'Error', description: `Company "${name}" not found.`, color: Colors.ERROR })],
          ephemeral: true,
        });
      }
      
      const fields = [
        { name: 'Type', value: formatCompanyType(company.type), inline: true },
        { name: 'Status', value: formatStatus(company.status), inline: true },
        { name: 'Employer', value: company.employerName || 'None', inline: true },
        { name: '\u200B', value: '**Forces:**', inline: false },
        { name: 'Infantry', value: formatNumber(company.forces.infantry), inline: true },
        { name: 'Armor', value: formatNumber(company.forces.armor), inline: true },
        { name: 'Artillery', value: formatNumber(company.forces.artillery), inline: true },
        { name: 'Aircraft', value: formatNumber(company.forces.aircraft), inline: true },
        { name: 'Naval', value: formatNumber(company.forces.naval), inline: true },
        { name: 'Special', value: formatNumber(company.forces.special), inline: true },
        { name: '\u200B', value: '**Ratings:**', inline: false },
        { name: 'Combat', value: `${company.ratings.combat}%`, inline: true },
        { name: 'Discipline', value: `${company.ratings.discipline}%`, inline: true },
        { name: 'Loyalty', value: `${company.ratings.loyalty}%`, inline: true },
        { name: 'Morale', value: `${company.ratings.morale}%`, inline: true },
        { name: 'Equipment', value: `${company.ratings.equipment}%`, inline: true },
        { name: '\u200B', value: '**Pricing:**', inline: false },
        { name: 'Hire Cost', value: `${formatNumber(company.pricing.hireCost)} ${company.pricing.currency}`, inline: true },
        { name: 'Monthly', value: `${formatNumber(company.pricing.monthlyCost)} ${company.pricing.currency}`, inline: true },
        { name: 'Combat Bonus', value: `${formatNumber(company.pricing.combatBonus)} ${company.pricing.currency}`, inline: true },
      ];
      
      if (company.specializations.length > 0) {
        fields.push({ name: 'Specializations', value: company.specializations.map(formatSpecialization).join(', '), inline: false });
      }
      
      if (company.commander.name) {
        fields.push({ name: 'Commander', value: `${company.commander.name}${company.commander.background ? `\n${company.commander.background}` : ''}`, inline: false });
      }
      
      // History stats
      if (company.history.battlesWon || company.history.battlesLost || company.history.contractsCompleted) {
        fields.push(
          { name: '\u200B', value: '**History:**', inline: false },
          { name: 'Battles', value: `${company.history.battlesWon}W / ${company.history.battlesLost}L`, inline: true },
          { name: 'Contracts', value: `${company.history.contractsCompleted} completed, ${company.history.contractsBroken} broken`, inline: true },
        );
      }
      
      const embed = createEmbed({
        title: company.name,
        description: `${company.description || 'No description'}${company.motto ? `\n*"${company.motto}"*` : ''}`,
        color: company.status === 'available' ? Colors.SUCCESS : Colors.INFO,
        fields,
      });
      
      return interaction.reply({ embeds: [embed] });
    }
  }
  
  // Forces management
  if (subcommandGroup === 'forces') {
    if (subcommand === 'set') {
      if (!await requireGM(interaction)) return;
      
      const companyName = interaction.options.getString('company');
      
      const company = await MercenaryCompany.findOne({ guildId, name: companyName });
      if (!company) {
        return interaction.reply({
          embeds: [createEmbed({ title: 'Error', description: `Company "${companyName}" not found.`, color: Colors.ERROR })],
          ephemeral: true,
        });
      }
      
      const changes = [];
      
      const infantryStr = interaction.options.getString('infantry');
      const armorStr = interaction.options.getString('armor');
      const artilleryStr = interaction.options.getString('artillery');
      const aircraftStr = interaction.options.getString('aircraft');
      const navalStr = interaction.options.getString('naval');
      const specialStr = interaction.options.getString('special');
      
      if (infantryStr) {
        const val = parseNumber(infantryStr);
        if (val !== null) { company.forces.infantry = val; changes.push(`Infantry: ${formatNumber(val)}`); }
      }
      if (armorStr) {
        const val = parseNumber(armorStr);
        if (val !== null) { company.forces.armor = val; changes.push(`Armor: ${formatNumber(val)}`); }
      }
      if (artilleryStr) {
        const val = parseNumber(artilleryStr);
        if (val !== null) { company.forces.artillery = val; changes.push(`Artillery: ${formatNumber(val)}`); }
      }
      if (aircraftStr) {
        const val = parseNumber(aircraftStr);
        if (val !== null) { company.forces.aircraft = val; changes.push(`Aircraft: ${formatNumber(val)}`); }
      }
      if (navalStr) {
        const val = parseNumber(navalStr);
        if (val !== null) { company.forces.naval = val; changes.push(`Naval: ${formatNumber(val)}`); }
      }
      if (specialStr) {
        const val = parseNumber(specialStr);
        if (val !== null) { company.forces.special = val; changes.push(`Special: ${formatNumber(val)}`); }
      }
      
      // Update total
      company.forces.total = company.forces.infantry + company.forces.armor + company.forces.artillery + 
                             company.forces.aircraft + company.forces.naval + company.forces.special;
      
      if (changes.length === 0) {
        return interaction.reply({
          embeds: [createEmbed({ title: 'No Changes', description: 'No force values specified.', color: Colors.WARNING })],
          ephemeral: true,
        });
      }
      
      await company.save();
      
      return interaction.reply({
        embeds: [createEmbed({
          title: 'Forces Updated',
          description: `**${companyName}**:\n${changes.join('\n')}\n\n**Total: ${formatNumber(company.forces.total)}**`,
          color: Colors.SUCCESS,
        })],
      });
    }
  }
  
  // Ratings management
  if (subcommandGroup === 'ratings') {
    if (subcommand === 'set') {
      if (!await requireGM(interaction)) return;
      
      const companyName = interaction.options.getString('company');
      
      const company = await MercenaryCompany.findOne({ guildId, name: companyName });
      if (!company) {
        return interaction.reply({
          embeds: [createEmbed({ title: 'Error', description: `Company "${companyName}" not found.`, color: Colors.ERROR })],
          ephemeral: true,
        });
      }
      
      const changes = [];
      
      const combat = interaction.options.getInteger('combat');
      const discipline = interaction.options.getInteger('discipline');
      const loyalty = interaction.options.getInteger('loyalty');
      const morale = interaction.options.getInteger('morale');
      const equipment = interaction.options.getInteger('equipment');
      
      if (combat !== null) { company.ratings.combat = combat; changes.push(`Combat: ${combat}%`); }
      if (discipline !== null) { company.ratings.discipline = discipline; changes.push(`Discipline: ${discipline}%`); }
      if (loyalty !== null) { company.ratings.loyalty = loyalty; changes.push(`Loyalty: ${loyalty}%`); }
      if (morale !== null) { company.ratings.morale = morale; changes.push(`Morale: ${morale}%`); }
      if (equipment !== null) { company.ratings.equipment = equipment; changes.push(`Equipment: ${equipment}%`); }
      
      if (changes.length === 0) {
        return interaction.reply({
          embeds: [createEmbed({ title: 'No Changes', description: 'No ratings specified.', color: Colors.WARNING })],
          ephemeral: true,
        });
      }
      
      await company.save();
      
      return interaction.reply({
        embeds: [createEmbed({
          title: 'Ratings Updated',
          description: `**${companyName}**:\n${changes.join('\n')}`,
          color: Colors.SUCCESS,
        })],
      });
    }
  }
  
  // Pricing management
  if (subcommandGroup === 'pricing') {
    if (subcommand === 'set') {
      if (!await requireGM(interaction)) return;
      
      const companyName = interaction.options.getString('company');
      
      const company = await MercenaryCompany.findOne({ guildId, name: companyName });
      if (!company) {
        return interaction.reply({
          embeds: [createEmbed({ title: 'Error', description: `Company "${companyName}" not found.`, color: Colors.ERROR })],
          ephemeral: true,
        });
      }
      
      const changes = [];
      
      const hireCostStr = interaction.options.getString('hire_cost');
      const monthlyStr = interaction.options.getString('monthly');
      const combatBonusStr = interaction.options.getString('combat_bonus');
      const currency = interaction.options.getString('currency');
      
      if (hireCostStr) {
        const val = parseNumber(hireCostStr);
        if (val !== null) { company.pricing.hireCost = val; changes.push(`Hire Cost: ${formatNumber(val)}`); }
      }
      if (monthlyStr) {
        const val = parseNumber(monthlyStr);
        if (val !== null) { company.pricing.monthlyCost = val; changes.push(`Monthly: ${formatNumber(val)}`); }
      }
      if (combatBonusStr) {
        const val = parseNumber(combatBonusStr);
        if (val !== null) { company.pricing.combatBonus = val; changes.push(`Combat Bonus: ${formatNumber(val)}`); }
      }
      if (currency) {
        company.pricing.currency = currency;
        changes.push(`Currency: ${currency}`);
      }
      
      if (changes.length === 0) {
        return interaction.reply({
          embeds: [createEmbed({ title: 'No Changes', description: 'No pricing specified.', color: Colors.WARNING })],
          ephemeral: true,
        });
      }
      
      await company.save();
      
      return interaction.reply({
        embeds: [createEmbed({
          title: 'Pricing Updated',
          description: `**${companyName}**:\n${changes.join('\n')}`,
          color: Colors.SUCCESS,
        })],
      });
    }
  }
  
  // Direct subcommands
  if (subcommand === 'hire') {
    if (!await requireGM(interaction)) return;
    
    const companyName = interaction.options.getString('company');
    const nationName = interaction.options.getString('nation');
    const duration = interaction.options.getInteger('duration') || 3;
    const mission = interaction.options.getString('mission') || '';
    
    const company = await MercenaryCompany.findOne({ guildId, name: companyName });
    if (!company) {
      return interaction.reply({
        embeds: [createEmbed({ title: 'Error', description: `Company "${companyName}" not found.`, color: Colors.ERROR })],
        ephemeral: true,
      });
    }
    
    if (company.status !== 'available') {
      return interaction.reply({
        embeds: [createEmbed({ title: 'Error', description: `${companyName} is not available for hire.`, color: Colors.ERROR })],
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
    
    // Create contract
    const contract = new MercenaryContract({
      guildId,
      company: company._id,
      companyName: company.name,
      employer: nation._id,
      employerName: nation.name,
      terms: {
        mission,
        duration,
        hireCost: company.pricing.hireCost,
        monthlyCost: company.pricing.monthlyCost,
        combatBonus: company.pricing.combatBonus,
        currency: company.pricing.currency,
      },
      status: 'active',
      createdBy: interaction.user.id,
    });
    
    await contract.save();
    
    // Update company
    company.status = 'contracted';
    company.employer = nation._id;
    company.employerName = nation.name;
    company.contract = {
      startDate: new Date(),
      terms: mission,
    };
    await company.save();
    
    const totalCost = company.pricing.hireCost + (company.pricing.monthlyCost * duration);
    
    return interaction.reply({
      embeds: [createEmbed({
        title: 'Mercenary Company Hired',
        description: `**${nation.name}** has hired **${company.name}**`,
        color: Colors.SUCCESS,
        fields: [
          { name: 'Mission', value: mission || 'General service', inline: false },
          { name: 'Duration', value: `${duration} turns`, inline: true },
          { name: 'Hire Cost', value: `${formatNumber(company.pricing.hireCost)} ${company.pricing.currency}`, inline: true },
          { name: 'Monthly Cost', value: `${formatNumber(company.pricing.monthlyCost)} ${company.pricing.currency}`, inline: true },
          { name: 'Est. Total', value: `${formatNumber(totalCost)} ${company.pricing.currency}`, inline: true },
        ],
      })],
    });
  }
  
  if (subcommand === 'release') {
    if (!await requireGM(interaction)) return;
    
    const companyName = interaction.options.getString('company');
    const reason = interaction.options.getString('reason') || 'completed';
    
    const company = await MercenaryCompany.findOne({ guildId, name: companyName });
    if (!company) {
      return interaction.reply({
        embeds: [createEmbed({ title: 'Error', description: `Company "${companyName}" not found.`, color: Colors.ERROR })],
        ephemeral: true,
      });
    }
    
    if (company.status !== 'contracted') {
      return interaction.reply({
        embeds: [createEmbed({ title: 'Error', description: `${companyName} is not under contract.`, color: Colors.ERROR })],
        ephemeral: true,
      });
    }
    
    // Update active contract
    const activeContract = await MercenaryContract.findOne({
      guildId,
      company: company._id,
      status: 'active',
    });
    
    if (activeContract) {
      activeContract.status = reason;
      activeContract.endDate = new Date();
      await activeContract.save();
    }
    
    // Update company history
    if (reason === 'completed') {
      company.history.contractsCompleted++;
    } else if (reason === 'betrayed') {
      company.history.contractsBroken++;
      company.reputation.reliability = Math.max(0, company.reputation.reliability - 20);
    }
    
    const previousEmployer = company.employerName;
    
    // Reset company status
    if (reason === 'destroyed') {
      company.status = 'destroyed';
    } else {
      company.status = 'available';
    }
    company.employer = null;
    company.employerName = null;
    company.contract = {};
    
    await company.save();
    
    return interaction.reply({
      embeds: [createEmbed({
        title: 'Contract Ended',
        description: `**${company.name}** released from service with **${previousEmployer}**`,
        color: Colors.SUCCESS,
        fields: [
          { name: 'Reason', value: formatReleaseReason(reason), inline: true },
          { name: 'Status', value: formatStatus(company.status), inline: true },
        ],
      })],
    });
  }
  
  if (subcommand === 'commander') {
    if (!await requireGM(interaction)) return;
    
    const companyName = interaction.options.getString('company');
    const commanderName = interaction.options.getString('name');
    const background = interaction.options.getString('background') || '';
    
    const company = await MercenaryCompany.findOne({ guildId, name: companyName });
    if (!company) {
      return interaction.reply({
        embeds: [createEmbed({ title: 'Error', description: `Company "${companyName}" not found.`, color: Colors.ERROR })],
        ephemeral: true,
      });
    }
    
    company.commander.name = commanderName;
    company.commander.background = background;
    await company.save();
    
    return interaction.reply({
      embeds: [createEmbed({
        title: 'Commander Set',
        description: `**${company.name}** commander: **${commanderName}**${background ? `\n${background}` : ''}`,
        color: Colors.SUCCESS,
      })],
    });
  }
  
  if (subcommand === 'specialization') {
    if (!await requireGM(interaction)) return;
    
    const companyName = interaction.options.getString('company');
    const spec = interaction.options.getString('spec');
    
    const company = await MercenaryCompany.findOne({ guildId, name: companyName });
    if (!company) {
      return interaction.reply({
        embeds: [createEmbed({ title: 'Error', description: `Company "${companyName}" not found.`, color: Colors.ERROR })],
        ephemeral: true,
      });
    }
    
    if (!company.specializations.includes(spec)) {
      company.specializations.push(spec);
      await company.save();
    }
    
    return interaction.reply({
      embeds: [createEmbed({
        title: 'Specialization Added',
        description: `**${company.name}** now specializes in: **${formatSpecialization(spec)}**`,
        color: Colors.SUCCESS,
      })],
    });
  }
  
  if (subcommand === 'contracts') {
    const companyName = interaction.options.getString('company');
    const nationName = interaction.options.getString('nation');
    
    if (!companyName && !nationName) {
      return interaction.reply({
        embeds: [createEmbed({ title: 'Error', description: 'Specify either a company or nation.', color: Colors.ERROR })],
        ephemeral: true,
      });
    }
    
    const query = { guildId };
    let title = 'Contract History';
    
    if (companyName) {
      const company = await MercenaryCompany.findOne({ guildId, name: companyName });
      if (!company) {
        return interaction.reply({
          embeds: [createEmbed({ title: 'Error', description: `Company "${companyName}" not found.`, color: Colors.ERROR })],
          ephemeral: true,
        });
      }
      query.company = company._id;
      title = `${company.name} - Contract History`;
    }
    
    if (nationName) {
      const nation = await Nation.findOne({ guildId, name: new RegExp(`^${nationName}$`, 'i') });
      if (!nation) {
        return interaction.reply({
          embeds: [createEmbed({ title: 'Error', description: `Nation "${nationName}" not found.`, color: Colors.ERROR })],
          ephemeral: true,
        });
      }
      query.employer = nation._id;
      title = `${nation.name} - Mercenary Contracts`;
    }
    
    const contracts = await MercenaryContract.find(query).sort({ startDate: -1 }).limit(15);
    
    if (contracts.length === 0) {
      return interaction.reply({
        embeds: [createEmbed({ title, description: 'No contracts found.', color: Colors.INFO })],
      });
    }
    
    const lines = contracts.map(c => {
      const status = c.status === 'active' ? '✅' : c.status === 'completed' ? '📋' : '❌';
      const duration = c.endDate ? 
        `${Math.ceil((c.endDate - c.startDate) / (1000 * 60 * 60 * 24))} days` : 
        'Ongoing';
      return `${status} **${c.companyName}** → ${c.employerName}\n└ ${c.terms.mission || 'General'} | ${duration} | ${formatNumber(c.totalPaid)} ${c.terms.currency}`;
    });
    
    return interaction.reply({
      embeds: [createEmbed({
        title,
        description: lines.join('\n\n'),
        color: Colors.INFO,
        footer: { text: `Showing ${contracts.length} contract(s)` },
      })],
    });
  }
}

function formatCompanyType(type) {
  const map = {
    private_military: 'Private Military Company',
    mercenary_band: 'Mercenary Band',
    security_contractor: 'Security Contractor',
    foreign_legion: 'Foreign Legion',
    volunteer_corps: 'Volunteer Corps',
    pirates: 'Pirates',
    rebel_fighters: 'Rebel Fighters',
    custom: 'Custom',
  };
  return map[type] || type;
}

function formatStatus(status) {
  const map = {
    available: 'Available',
    contracted: 'Under Contract',
    disbanded: 'Disbanded',
    destroyed: 'Destroyed',
  };
  return map[status] || status;
}

function formatSpecialization(spec) {
  const map = {
    infantry: 'Infantry',
    armor: 'Armor',
    aerial: 'Aerial',
    naval: 'Naval',
    special_ops: 'Special Operations',
    urban: 'Urban Warfare',
    jungle: 'Jungle Warfare',
    desert: 'Desert Warfare',
    arctic: 'Arctic Warfare',
    mountain: 'Mountain Warfare',
    siege: 'Siege',
    counter_insurgency: 'Counter-Insurgency',
    assassination: 'Assassination',
    sabotage: 'Sabotage',
    training: 'Training',
    security: 'Security',
  };
  return map[spec] || spec;
}

function formatReleaseReason(reason) {
  const map = {
    completed: 'Contract Completed',
    terminated: 'Terminated Early',
    betrayed: 'Company Betrayed',
    destroyed: 'Company Destroyed',
  };
  return map[reason] || reason;
}

export default { data, execute };
