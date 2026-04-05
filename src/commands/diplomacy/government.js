import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { GovernmentType } from '../../database/models/Government.js';
import Nation from '../../database/models/Nation.js';
import { requireGM, canModifyNation, isGM } from '../../utils/permissions.js';
import { createEmbed, Colors } from '../../utils/embeds.js';

const data = new SlashCommandBuilder()
  .setName('government')
  .setDescription('Manage government types and systems')
  .addSubcommandGroup(group =>
    group
      .setName('template')
      .setDescription('Manage government type templates')
      .addSubcommand(sub =>
        sub
          .setName('create')
          .setDescription('[GM] Create a new government type template')
          .addStringOption(opt =>
            opt.setName('name').setDescription('Name of the government type').setRequired(true)
          )
          .addStringOption(opt =>
            opt.setName('category').setDescription('Category of government')
              .setRequired(true)
              .addChoices(
                { name: 'Democracy', value: 'democracy' },
                { name: 'Republic', value: 'republic' },
                { name: 'Monarchy', value: 'monarchy' },
                { name: 'Constitutional Monarchy', value: 'constitutional_monarchy' },
                { name: 'Dictatorship', value: 'dictatorship' },
                { name: 'Communist', value: 'communist' },
                { name: 'Fascist', value: 'fascist' },
                { name: 'Socialist', value: 'socialist' },
                { name: 'Theocracy', value: 'theocracy' },
                { name: 'Oligarchy', value: 'oligarchy' },
                { name: 'Military Junta', value: 'military_junta' },
                { name: 'Parliamentary', value: 'parliamentary' },
                { name: 'Presidential', value: 'presidential' },
                { name: 'Anarchy', value: 'anarchy' },
                { name: 'Custom', value: 'custom' }
              )
          )
          .addStringOption(opt =>
            opt.setName('description').setDescription('Description of this government type')
          )
          .addStringOption(opt =>
            opt.setName('succession').setDescription('How power is transferred')
              .addChoices(
                { name: 'Election', value: 'election' },
                { name: 'Hereditary', value: 'hereditary' },
                { name: 'Appointment', value: 'appointment' },
                { name: 'Military', value: 'military' },
                { name: 'Revolution', value: 'revolution' },
                { name: 'None', value: 'none' }
              )
          )
      )
      .addSubcommand(sub =>
        sub
          .setName('delete')
          .setDescription('[GM] Delete a government type template')
          .addStringOption(opt =>
            opt.setName('name').setDescription('Name of the template to delete').setRequired(true)
          )
      )
      .addSubcommand(sub =>
        sub
          .setName('list')
          .setDescription('List all government type templates')
      )
      .addSubcommand(sub =>
        sub
          .setName('view')
          .setDescription('View details of a government type template')
          .addStringOption(opt =>
            opt.setName('name').setDescription('Name of the template').setRequired(true)
          )
      )
  )
  .addSubcommandGroup(group =>
    group
      .setName('modifiers')
      .setDescription('Set modifiers for government templates')
      .addSubcommand(sub =>
        sub
          .setName('set')
          .setDescription('[GM] Set modifiers for a government template')
          .addStringOption(opt =>
            opt.setName('template').setDescription('Template name').setRequired(true)
          )
          .addIntegerOption(opt =>
            opt.setName('stability').setDescription('Stability modifier (+/-)')
              .setMinValue(-100).setMaxValue(100)
          )
          .addIntegerOption(opt =>
            opt.setName('economy_growth').setDescription('Economy growth % modifier')
              .setMinValue(-100).setMaxValue(100)
          )
          .addIntegerOption(opt =>
            opt.setName('military_morale').setDescription('Military morale % modifier')
              .setMinValue(-100).setMaxValue(100)
          )
          .addIntegerOption(opt =>
            opt.setName('research_speed').setDescription('Research speed % modifier')
              .setMinValue(-100).setMaxValue(100)
          )
          .addIntegerOption(opt =>
            opt.setName('diplomacy_bonus').setDescription('Diplomacy bonus (+/-)')
              .setMinValue(-50).setMaxValue(50)
          )
          .addIntegerOption(opt =>
            opt.setName('corruption').setDescription('Corruption level (0-100)')
              .setMinValue(0).setMaxValue(100)
          )
          .addIntegerOption(opt =>
            opt.setName('freedom').setDescription('Freedom index (0-100)')
              .setMinValue(0).setMaxValue(100)
          )
          .addIntegerOption(opt =>
            opt.setName('coup_resistance').setDescription('Coup resistance (0-100)')
              .setMinValue(0).setMaxValue(100)
          )
      )
  )
  .addSubcommand(sub =>
    sub
      .setName('assign')
      .setDescription('[GM] Assign a government type to a nation')
      .addStringOption(opt =>
        opt.setName('nation').setDescription('Nation to assign to').setRequired(true)
      )
      .addStringOption(opt =>
        opt.setName('template').setDescription('Government type template name').setRequired(true)
      )
  )
  .addSubcommand(sub =>
    sub
      .setName('remove')
      .setDescription('[GM] Remove government type from a nation')
      .addStringOption(opt =>
        opt.setName('nation').setDescription('Nation to remove from').setRequired(true)
      )
  )
  .addSubcommand(sub =>
    sub
      .setName('view')
      .setDescription('View a nation\'s government type')
      .addStringOption(opt =>
        opt.setName('nation').setDescription('Nation to view').setRequired(true)
      )
  );

async function execute(interaction) {
  const guildId = interaction.guild.id;
  const subcommandGroup = interaction.options.getSubcommandGroup(false);
  const subcommand = interaction.options.getSubcommand();

  // Template management
  if (subcommandGroup === 'template') {
    if (subcommand === 'create') {
      if (!await requireGM(interaction)) return;
      
      const name = interaction.options.getString('name');
      const category = interaction.options.getString('category');
      const description = interaction.options.getString('description') || '';
      const succession = interaction.options.getString('succession') || 'election';
      
      // Check if template already exists
      const existing = await GovernmentType.findOne({ guildId, name, isTemplate: true });
      if (existing) {
        return interaction.reply({
          embeds: [createEmbed({ title: 'Error', description: `Template "${name}" already exists.`, color: Colors.ERROR })],
          ephemeral: true,
        });
      }
      
      const template = new GovernmentType({
        guildId,
        name,
        category,
        description,
        succession,
        isTemplate: true,
        createdBy: interaction.user.id,
      });
      
      await template.save();
      
      const embed = createEmbed({
        title: 'Government Template Created',
        description: `Created government type template: **${name}**`,
        color: Colors.SUCCESS,
        fields: [
          { name: 'Category', value: formatCategory(category), inline: true },
          { name: 'Succession', value: formatSuccession(succession), inline: true },
          { name: 'Description', value: description || 'None', inline: false },
        ],
      });
      
      return interaction.reply({ embeds: [embed] });
    }
    
    if (subcommand === 'delete') {
      if (!await requireGM(interaction)) return;
      
      const name = interaction.options.getString('name');
      
      const template = await GovernmentType.findOneAndDelete({ guildId, name, isTemplate: true });
      if (!template) {
        return interaction.reply({
          embeds: [createEmbed({ title: 'Error', description: `Template "${name}" not found.`, color: Colors.ERROR })],
          ephemeral: true,
        });
      }
      
      return interaction.reply({
        embeds: [createEmbed({ title: 'Template Deleted', description: `Deleted template: **${name}**`, color: Colors.SUCCESS })],
      });
    }
    
    if (subcommand === 'list') {
      const templates = await GovernmentType.find({ guildId, isTemplate: true }).sort({ category: 1, name: 1 });
      
      if (templates.length === 0) {
        return interaction.reply({
          embeds: [createEmbed({ title: 'Government Templates', description: 'No templates created yet.', color: Colors.INFO })],
        });
      }
      
      const grouped = {};
      for (const t of templates) {
        const cat = formatCategory(t.category);
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(t.name);
      }
      
      const fields = Object.entries(grouped).map(([cat, names]) => ({
        name: cat,
        value: names.join(', '),
        inline: false,
      }));
      
      return interaction.reply({
        embeds: [createEmbed({ title: 'Government Templates', fields, color: Colors.INFO })],
      });
    }
    
    if (subcommand === 'view') {
      const name = interaction.options.getString('name');
      
      const template = await GovernmentType.findOne({ guildId, name, isTemplate: true });
      if (!template) {
        return interaction.reply({
          embeds: [createEmbed({ title: 'Error', description: `Template "${name}" not found.`, color: Colors.ERROR })],
          ephemeral: true,
        });
      }
      
      const embed = createEmbed({
        title: `Government Type: ${template.name}`,
        description: template.description || 'No description',
        color: Colors.INFO,
        fields: [
          { name: 'Category', value: formatCategory(template.category), inline: true },
          { name: 'Succession', value: formatSuccession(template.succession), inline: true },
          { name: '\u200B', value: '**Modifiers:**', inline: false },
          { name: 'Stability', value: formatModifier(template.modifiers.stability), inline: true },
          { name: 'Economy Growth', value: `${template.modifiers.economyGrowth}%`, inline: true },
          { name: 'Military Morale', value: `${template.modifiers.militaryMorale}%`, inline: true },
          { name: 'Research Speed', value: `${template.modifiers.researchSpeed}%`, inline: true },
          { name: 'Diplomacy', value: formatModifier(template.modifiers.diplomacyBonus), inline: true },
          { name: 'Corruption', value: `${template.modifiers.corruptionLevel}%`, inline: true },
          { name: 'Freedom Index', value: `${template.modifiers.freedomIndex}/100`, inline: true },
          { name: 'Coup Resistance', value: `${template.modifiers.coupResistance}%`, inline: true },
        ],
      });
      
      return interaction.reply({ embeds: [embed] });
    }
  }
  
  // Modifier management
  if (subcommandGroup === 'modifiers') {
    if (subcommand === 'set') {
      if (!await requireGM(interaction)) return;
      
      const templateName = interaction.options.getString('template');
      
      const template = await GovernmentType.findOne({ guildId, name: templateName, isTemplate: true });
      if (!template) {
        return interaction.reply({
          embeds: [createEmbed({ title: 'Error', description: `Template "${templateName}" not found.`, color: Colors.ERROR })],
          ephemeral: true,
        });
      }
      
      const stability = interaction.options.getInteger('stability');
      const economyGrowth = interaction.options.getInteger('economy_growth');
      const militaryMorale = interaction.options.getInteger('military_morale');
      const researchSpeed = interaction.options.getInteger('research_speed');
      const diplomacyBonus = interaction.options.getInteger('diplomacy_bonus');
      const corruption = interaction.options.getInteger('corruption');
      const freedom = interaction.options.getInteger('freedom');
      const coupResistance = interaction.options.getInteger('coup_resistance');
      
      const changes = [];
      if (stability !== null) { template.modifiers.stability = stability; changes.push(`Stability: ${formatModifier(stability)}`); }
      if (economyGrowth !== null) { template.modifiers.economyGrowth = economyGrowth; changes.push(`Economy Growth: ${economyGrowth}%`); }
      if (militaryMorale !== null) { template.modifiers.militaryMorale = militaryMorale; changes.push(`Military Morale: ${militaryMorale}%`); }
      if (researchSpeed !== null) { template.modifiers.researchSpeed = researchSpeed; changes.push(`Research Speed: ${researchSpeed}%`); }
      if (diplomacyBonus !== null) { template.modifiers.diplomacyBonus = diplomacyBonus; changes.push(`Diplomacy: ${formatModifier(diplomacyBonus)}`); }
      if (corruption !== null) { template.modifiers.corruptionLevel = corruption; changes.push(`Corruption: ${corruption}%`); }
      if (freedom !== null) { template.modifiers.freedomIndex = freedom; changes.push(`Freedom Index: ${freedom}/100`); }
      if (coupResistance !== null) { template.modifiers.coupResistance = coupResistance; changes.push(`Coup Resistance: ${coupResistance}%`); }
      
      if (changes.length === 0) {
        return interaction.reply({
          embeds: [createEmbed({ title: 'No Changes', description: 'No modifiers were specified.', color: Colors.WARNING })],
          ephemeral: true,
        });
      }
      
      await template.save();
      
      return interaction.reply({
        embeds: [createEmbed({
          title: 'Modifiers Updated',
          description: `Updated **${templateName}**:\n${changes.join('\n')}`,
          color: Colors.SUCCESS,
        })],
      });
    }
  }
  
  // Direct subcommands (assign, remove, view)
  if (subcommand === 'assign') {
    if (!await requireGM(interaction)) return;
    
    const nationName = interaction.options.getString('nation');
    const templateName = interaction.options.getString('template');
    
    const nation = await Nation.findOne({ guildId, name: new RegExp(`^${nationName}$`, 'i') });
    if (!nation) {
      return interaction.reply({
        embeds: [createEmbed({ title: 'Error', description: `Nation "${nationName}" not found.`, color: Colors.ERROR })],
        ephemeral: true,
      });
    }
    
    const template = await GovernmentType.findOne({ guildId, name: templateName, isTemplate: true });
    if (!template) {
      return interaction.reply({
        embeds: [createEmbed({ title: 'Error', description: `Template "${templateName}" not found.`, color: Colors.ERROR })],
        ephemeral: true,
      });
    }
    
    // Remove any existing assignment for this nation
    await GovernmentType.deleteMany({ guildId, assignedTo: nation._id, isTemplate: false });
    
    // Create a new assignment (copy of template)
    const assignment = new GovernmentType({
      guildId,
      name: template.name,
      description: template.description,
      category: template.category,
      modifiers: { ...template.modifiers },
      succession: template.succession,
      isTemplate: false,
      assignedTo: nation._id,
      assignedToName: nation.name,
      createdBy: interaction.user.id,
    });
    
    await assignment.save();
    
    return interaction.reply({
      embeds: [createEmbed({
        title: 'Government Assigned',
        description: `**${nation.name}** now has government type: **${template.name}** (${formatCategory(template.category)})`,
        color: Colors.SUCCESS,
      })],
    });
  }
  
  if (subcommand === 'remove') {
    if (!await requireGM(interaction)) return;
    
    const nationName = interaction.options.getString('nation');
    
    const nation = await Nation.findOne({ guildId, name: new RegExp(`^${nationName}$`, 'i') });
    if (!nation) {
      return interaction.reply({
        embeds: [createEmbed({ title: 'Error', description: `Nation "${nationName}" not found.`, color: Colors.ERROR })],
        ephemeral: true,
      });
    }
    
    const deleted = await GovernmentType.findOneAndDelete({ guildId, assignedTo: nation._id, isTemplate: false });
    if (!deleted) {
      return interaction.reply({
        embeds: [createEmbed({ title: 'Error', description: `${nation.name} has no assigned government type.`, color: Colors.ERROR })],
        ephemeral: true,
      });
    }
    
    return interaction.reply({
      embeds: [createEmbed({
        title: 'Government Removed',
        description: `Removed **${deleted.name}** government type from **${nation.name}**`,
        color: Colors.SUCCESS,
      })],
    });
  }
  
  if (subcommand === 'view') {
    const nationName = interaction.options.getString('nation');
    
    const nation = await Nation.findOne({ guildId, name: new RegExp(`^${nationName}$`, 'i') });
    if (!nation) {
      return interaction.reply({
        embeds: [createEmbed({ title: 'Error', description: `Nation "${nationName}" not found.`, color: Colors.ERROR })],
        ephemeral: true,
      });
    }
    
    const gov = await GovernmentType.findOne({ guildId, assignedTo: nation._id, isTemplate: false });
    if (!gov) {
      return interaction.reply({
        embeds: [createEmbed({
          title: `${nation.name} - Government`,
          description: 'No government type assigned.',
          color: Colors.INFO,
        })],
      });
    }
    
    const embed = createEmbed({
      title: `${nation.name} - Government`,
      description: `**${gov.name}**\n${gov.description || 'No description'}`,
      color: Colors.INFO,
      fields: [
        { name: 'Category', value: formatCategory(gov.category), inline: true },
        { name: 'Succession', value: formatSuccession(gov.succession), inline: true },
        { name: '\u200B', value: '**Effects:**', inline: false },
        { name: 'Stability', value: formatModifier(gov.modifiers.stability), inline: true },
        { name: 'Economy Growth', value: `${gov.modifiers.economyGrowth}%`, inline: true },
        { name: 'Military Morale', value: `${gov.modifiers.militaryMorale}%`, inline: true },
        { name: 'Research Speed', value: `${gov.modifiers.researchSpeed}%`, inline: true },
        { name: 'Diplomacy', value: formatModifier(gov.modifiers.diplomacyBonus), inline: true },
        { name: 'Corruption', value: `${gov.modifiers.corruptionLevel}%`, inline: true },
        { name: 'Freedom Index', value: `${gov.modifiers.freedomIndex}/100`, inline: true },
        { name: 'Coup Resistance', value: `${gov.modifiers.coupResistance}%`, inline: true },
      ],
    });
    
    return interaction.reply({ embeds: [embed] });
  }
}

function formatCategory(category) {
  const map = {
    democracy: 'Democracy',
    republic: 'Republic',
    monarchy: 'Monarchy',
    constitutional_monarchy: 'Constitutional Monarchy',
    dictatorship: 'Dictatorship',
    communist: 'Communist State',
    fascist: 'Fascist State',
    socialist: 'Socialist State',
    theocracy: 'Theocracy',
    oligarchy: 'Oligarchy',
    military_junta: 'Military Junta',
    parliamentary: 'Parliamentary System',
    presidential: 'Presidential System',
    anarchy: 'Anarchy',
    custom: 'Custom',
  };
  return map[category] || category;
}

function formatSuccession(succession) {
  const map = {
    election: 'Election',
    hereditary: 'Hereditary',
    appointment: 'Appointment',
    military: 'Military Takeover',
    revolution: 'Revolution',
    none: 'None',
  };
  return map[succession] || succession;
}

function formatModifier(value) {
  if (value > 0) return `+${value}`;
  return `${value}`;
}

export default { data, execute };
