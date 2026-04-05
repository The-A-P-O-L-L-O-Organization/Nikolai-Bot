import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import Doctrine from '../../database/models/Doctrine.js';
import Nation from '../../database/models/Nation.js';
import { requireGM, canModifyNation, isGM } from '../../utils/permissions.js';
import { createEmbed, Colors } from '../../utils/embeds.js';

const data = new SlashCommandBuilder()
  .setName('doctrine')
  .setDescription('Manage military doctrines')
  .addSubcommandGroup(group =>
    group
      .setName('template')
      .setDescription('Manage doctrine templates')
      .addSubcommand(sub =>
        sub
          .setName('create')
          .setDescription('[GM] Create a new doctrine template')
          .addStringOption(opt =>
            opt.setName('name').setDescription('Doctrine name').setRequired(true)
          )
          .addStringOption(opt =>
            opt.setName('category').setDescription('Doctrine category')
              .setRequired(true)
              .addChoices(
                { name: 'Offensive', value: 'offensive' },
                { name: 'Defensive', value: 'defensive' },
                { name: 'Mobile Warfare', value: 'mobile' },
                { name: 'Guerrilla', value: 'guerrilla' },
                { name: 'Combined Arms', value: 'combined_arms' },
                { name: 'Naval', value: 'naval' },
                { name: 'Aerial', value: 'aerial' },
                { name: 'Nuclear', value: 'nuclear' },
                { name: 'Irregular', value: 'irregular' },
                { name: 'Siege', value: 'siege' },
                { name: 'Custom', value: 'custom' }
              )
          )
          .addStringOption(opt =>
            opt.setName('description').setDescription('Doctrine description')
          )
      )
      .addSubcommand(sub =>
        sub
          .setName('delete')
          .setDescription('[GM] Delete a doctrine template')
          .addStringOption(opt =>
            opt.setName('name').setDescription('Template name').setRequired(true)
          )
      )
      .addSubcommand(sub =>
        sub
          .setName('list')
          .setDescription('List all doctrine templates')
      )
      .addSubcommand(sub =>
        sub
          .setName('view')
          .setDescription('View a doctrine template')
          .addStringOption(opt =>
            opt.setName('name').setDescription('Template name').setRequired(true)
          )
      )
  )
  .addSubcommandGroup(group =>
    group
      .setName('modifiers')
      .setDescription('Set doctrine modifiers')
      .addSubcommand(sub =>
        sub
          .setName('set')
          .setDescription('[GM] Set modifiers for a doctrine template')
          .addStringOption(opt =>
            opt.setName('template').setDescription('Template name').setRequired(true)
          )
          .addIntegerOption(opt =>
            opt.setName('attack').setDescription('Attack modifier').setMinValue(-50).setMaxValue(50)
          )
          .addIntegerOption(opt =>
            opt.setName('defense').setDescription('Defense modifier').setMinValue(-50).setMaxValue(50)
          )
          .addIntegerOption(opt =>
            opt.setName('mobility').setDescription('Mobility modifier').setMinValue(-50).setMaxValue(50)
          )
          .addIntegerOption(opt =>
            opt.setName('morale').setDescription('Morale modifier').setMinValue(-50).setMaxValue(50)
          )
          .addIntegerOption(opt =>
            opt.setName('logistics').setDescription('Logistics modifier').setMinValue(-50).setMaxValue(50)
          )
          .addIntegerOption(opt =>
            opt.setName('casualties').setDescription('Casualty rate modifier (negative = fewer)').setMinValue(-50).setMaxValue(50)
          )
          .addIntegerOption(opt =>
            opt.setName('siege').setDescription('Siege warfare modifier').setMinValue(-50).setMaxValue(50)
          )
          .addIntegerOption(opt =>
            opt.setName('naval').setDescription('Naval combat modifier').setMinValue(-50).setMaxValue(50)
          )
          .addIntegerOption(opt =>
            opt.setName('aerial').setDescription('Aerial combat modifier').setMinValue(-50).setMaxValue(50)
          )
          .addIntegerOption(opt =>
            opt.setName('urban').setDescription('Urban combat modifier').setMinValue(-50).setMaxValue(50)
          )
      )
  )
  .addSubcommand(sub =>
    sub
      .setName('assign')
      .setDescription('[GM] Assign a doctrine to a nation')
      .addStringOption(opt =>
        opt.setName('nation').setDescription('Nation to assign to').setRequired(true)
      )
      .addStringOption(opt =>
        opt.setName('template').setDescription('Doctrine template name').setRequired(true)
      )
  )
  .addSubcommand(sub =>
    sub
      .setName('remove')
      .setDescription('[GM] Remove doctrine from a nation')
      .addStringOption(opt =>
        opt.setName('nation').setDescription('Nation to remove from').setRequired(true)
      )
  )
  .addSubcommand(sub =>
    sub
      .setName('view')
      .setDescription('View a nation\'s doctrine')
      .addStringOption(opt =>
        opt.setName('nation').setDescription('Nation to view').setRequired(true)
      )
  )
  .addSubcommand(sub =>
    sub
      .setName('ability')
      .setDescription('[GM] Add a special ability to a doctrine template')
      .addStringOption(opt =>
        opt.setName('template').setDescription('Template name').setRequired(true)
      )
      .addStringOption(opt =>
        opt.setName('name').setDescription('Ability name').setRequired(true)
      )
      .addStringOption(opt =>
        opt.setName('description').setDescription('Ability description').setRequired(true)
      )
      .addStringOption(opt =>
        opt.setName('effect').setDescription('Mechanical effect')
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
      
      const existing = await Doctrine.findOne({ guildId, name, isTemplate: true });
      if (existing) {
        return interaction.reply({
          embeds: [createEmbed({ title: 'Error', description: `Template "${name}" already exists.`, color: Colors.ERROR })],
          ephemeral: true,
        });
      }
      
      const template = new Doctrine({
        guildId,
        name,
        category,
        description,
        isTemplate: true,
        createdBy: interaction.user.id,
      });
      
      await template.save();
      
      return interaction.reply({
        embeds: [createEmbed({
          title: 'Doctrine Template Created',
          description: `Created doctrine: **${name}**`,
          color: Colors.SUCCESS,
          fields: [
            { name: 'Category', value: formatCategory(category), inline: true },
            { name: 'Description', value: description || 'None', inline: false },
          ],
          footer: { text: 'Use /doctrine modifiers set to configure bonuses' },
        })],
      });
    }
    
    if (subcommand === 'delete') {
      if (!await requireGM(interaction)) return;
      
      const name = interaction.options.getString('name');
      
      const template = await Doctrine.findOneAndDelete({ guildId, name, isTemplate: true });
      if (!template) {
        return interaction.reply({
          embeds: [createEmbed({ title: 'Error', description: `Template "${name}" not found.`, color: Colors.ERROR })],
          ephemeral: true,
        });
      }
      
      return interaction.reply({
        embeds: [createEmbed({ title: 'Template Deleted', description: `Deleted: **${name}**`, color: Colors.SUCCESS })],
      });
    }
    
    if (subcommand === 'list') {
      const templates = await Doctrine.find({ guildId, isTemplate: true }).sort({ category: 1, name: 1 });
      
      if (templates.length === 0) {
        return interaction.reply({
          embeds: [createEmbed({ title: 'Doctrine Templates', description: 'No templates created yet.', color: Colors.INFO })],
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
        embeds: [createEmbed({ title: 'Doctrine Templates', fields, color: Colors.INFO })],
      });
    }
    
    if (subcommand === 'view') {
      const name = interaction.options.getString('name');
      
      const template = await Doctrine.findOne({ guildId, name, isTemplate: true });
      if (!template) {
        return interaction.reply({
          embeds: [createEmbed({ title: 'Error', description: `Template "${name}" not found.`, color: Colors.ERROR })],
          ephemeral: true,
        });
      }
      
      const fields = [
        { name: 'Category', value: formatCategory(template.category), inline: true },
        { name: '\u200B', value: '**Combat Modifiers:**', inline: false },
        { name: 'Attack', value: formatMod(template.modifiers.attack), inline: true },
        { name: 'Defense', value: formatMod(template.modifiers.defense), inline: true },
        { name: 'Mobility', value: formatMod(template.modifiers.mobility), inline: true },
        { name: 'Morale', value: formatMod(template.modifiers.morale), inline: true },
        { name: 'Logistics', value: formatMod(template.modifiers.logistics), inline: true },
        { name: 'Casualties', value: formatMod(template.modifiers.casualties), inline: true },
        { name: '\u200B', value: '**Specialized:**', inline: false },
        { name: 'Siege', value: formatMod(template.modifiers.siege), inline: true },
        { name: 'Naval', value: formatMod(template.modifiers.naval), inline: true },
        { name: 'Aerial', value: formatMod(template.modifiers.aerial), inline: true },
        { name: 'Urban', value: formatMod(template.modifiers.urbanCombat), inline: true },
      ];
      
      if (template.abilities.length > 0) {
        const abilitiesText = template.abilities.map(a => `**${a.name}**: ${a.description}`).join('\n');
        fields.push({ name: 'Special Abilities', value: abilitiesText, inline: false });
      }
      
      return interaction.reply({
        embeds: [createEmbed({
          title: `Doctrine: ${template.name}`,
          description: template.description || 'No description',
          color: Colors.INFO,
          fields,
        })],
      });
    }
  }
  
  // Modifier management
  if (subcommandGroup === 'modifiers') {
    if (subcommand === 'set') {
      if (!await requireGM(interaction)) return;
      
      const templateName = interaction.options.getString('template');
      
      const template = await Doctrine.findOne({ guildId, name: templateName, isTemplate: true });
      if (!template) {
        return interaction.reply({
          embeds: [createEmbed({ title: 'Error', description: `Template "${templateName}" not found.`, color: Colors.ERROR })],
          ephemeral: true,
        });
      }
      
      const changes = [];
      const mods = template.modifiers;
      
      const attack = interaction.options.getInteger('attack');
      const defense = interaction.options.getInteger('defense');
      const mobility = interaction.options.getInteger('mobility');
      const morale = interaction.options.getInteger('morale');
      const logistics = interaction.options.getInteger('logistics');
      const casualties = interaction.options.getInteger('casualties');
      const siege = interaction.options.getInteger('siege');
      const naval = interaction.options.getInteger('naval');
      const aerial = interaction.options.getInteger('aerial');
      const urban = interaction.options.getInteger('urban');
      
      if (attack !== null) { mods.attack = attack; changes.push(`Attack: ${formatMod(attack)}`); }
      if (defense !== null) { mods.defense = defense; changes.push(`Defense: ${formatMod(defense)}`); }
      if (mobility !== null) { mods.mobility = mobility; changes.push(`Mobility: ${formatMod(mobility)}`); }
      if (morale !== null) { mods.morale = morale; changes.push(`Morale: ${formatMod(morale)}`); }
      if (logistics !== null) { mods.logistics = logistics; changes.push(`Logistics: ${formatMod(logistics)}`); }
      if (casualties !== null) { mods.casualties = casualties; changes.push(`Casualties: ${formatMod(casualties)}`); }
      if (siege !== null) { mods.siege = siege; changes.push(`Siege: ${formatMod(siege)}`); }
      if (naval !== null) { mods.naval = naval; changes.push(`Naval: ${formatMod(naval)}`); }
      if (aerial !== null) { mods.aerial = aerial; changes.push(`Aerial: ${formatMod(aerial)}`); }
      if (urban !== null) { mods.urbanCombat = urban; changes.push(`Urban: ${formatMod(urban)}`); }
      
      if (changes.length === 0) {
        return interaction.reply({
          embeds: [createEmbed({ title: 'No Changes', description: 'No modifiers specified.', color: Colors.WARNING })],
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
  
  // Direct subcommands
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
    
    const template = await Doctrine.findOne({ guildId, name: templateName, isTemplate: true });
    if (!template) {
      return interaction.reply({
        embeds: [createEmbed({ title: 'Error', description: `Template "${templateName}" not found.`, color: Colors.ERROR })],
        ephemeral: true,
      });
    }
    
    // Remove existing doctrine
    await Doctrine.deleteMany({ guildId, assignedTo: nation._id, isTemplate: false });
    
    // Create assignment
    const assignment = new Doctrine({
      guildId,
      name: template.name,
      description: template.description,
      category: template.category,
      modifiers: { ...template.modifiers },
      abilities: [...template.abilities],
      isTemplate: false,
      assignedTo: nation._id,
      assignedToName: nation.name,
      adoptedAt: new Date(),
      trainingProgress: 100,
      createdBy: interaction.user.id,
    });
    
    await assignment.save();
    
    return interaction.reply({
      embeds: [createEmbed({
        title: 'Doctrine Assigned',
        description: `**${nation.name}** now follows the **${template.name}** doctrine.`,
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
    
    const deleted = await Doctrine.findOneAndDelete({ guildId, assignedTo: nation._id, isTemplate: false });
    if (!deleted) {
      return interaction.reply({
        embeds: [createEmbed({ title: 'Error', description: `${nation.name} has no assigned doctrine.`, color: Colors.ERROR })],
        ephemeral: true,
      });
    }
    
    return interaction.reply({
      embeds: [createEmbed({
        title: 'Doctrine Removed',
        description: `Removed **${deleted.name}** doctrine from **${nation.name}**`,
        color: Colors.SUCCESS,
      })],
    });
  }
  
  if (subcommand === 'view' && !subcommandGroup) {
    const nationName = interaction.options.getString('nation');
    
    const nation = await Nation.findOne({ guildId, name: new RegExp(`^${nationName}$`, 'i') });
    if (!nation) {
      return interaction.reply({
        embeds: [createEmbed({ title: 'Error', description: `Nation "${nationName}" not found.`, color: Colors.ERROR })],
        ephemeral: true,
      });
    }
    
    const doctrine = await Doctrine.findOne({ guildId, assignedTo: nation._id, isTemplate: false });
    if (!doctrine) {
      return interaction.reply({
        embeds: [createEmbed({
          title: `${nation.name} - Doctrine`,
          description: 'No military doctrine assigned.',
          color: Colors.INFO,
        })],
      });
    }
    
    const fields = [
      { name: 'Category', value: formatCategory(doctrine.category), inline: true },
      { name: 'Adopted', value: doctrine.adoptedAt?.toLocaleDateString() || 'Unknown', inline: true },
      { name: '\u200B', value: '**Combat Effects:**', inline: false },
      { name: 'Attack', value: formatMod(doctrine.modifiers.attack), inline: true },
      { name: 'Defense', value: formatMod(doctrine.modifiers.defense), inline: true },
      { name: 'Mobility', value: formatMod(doctrine.modifiers.mobility), inline: true },
      { name: 'Morale', value: formatMod(doctrine.modifiers.morale), inline: true },
    ];
    
    if (doctrine.abilities.length > 0) {
      const abilitiesText = doctrine.abilities.map(a => `**${a.name}**: ${a.description}`).join('\n');
      fields.push({ name: 'Special Abilities', value: abilitiesText, inline: false });
    }
    
    return interaction.reply({
      embeds: [createEmbed({
        title: `${nation.name} - ${doctrine.name} Doctrine`,
        description: doctrine.description || 'No description',
        color: Colors.INFO,
        fields,
      })],
    });
  }
  
  if (subcommand === 'ability') {
    if (!await requireGM(interaction)) return;
    
    const templateName = interaction.options.getString('template');
    const abilityName = interaction.options.getString('name');
    const description = interaction.options.getString('description');
    const effect = interaction.options.getString('effect') || '';
    
    const template = await Doctrine.findOne({ guildId, name: templateName, isTemplate: true });
    if (!template) {
      return interaction.reply({
        embeds: [createEmbed({ title: 'Error', description: `Template "${templateName}" not found.`, color: Colors.ERROR })],
        ephemeral: true,
      });
    }
    
    template.abilities.push({ name: abilityName, description, effect });
    await template.save();
    
    return interaction.reply({
      embeds: [createEmbed({
        title: 'Ability Added',
        description: `Added **${abilityName}** to **${templateName}**\n${description}`,
        color: Colors.SUCCESS,
      })],
    });
  }
}

function formatCategory(cat) {
  const map = {
    offensive: 'Offensive',
    defensive: 'Defensive',
    mobile: 'Mobile Warfare',
    guerrilla: 'Guerrilla',
    combined_arms: 'Combined Arms',
    naval: 'Naval',
    aerial: 'Aerial',
    nuclear: 'Nuclear',
    irregular: 'Irregular',
    siege: 'Siege',
    custom: 'Custom',
  };
  return map[cat] || cat;
}

function formatMod(value) {
  if (!value) return '+0';
  return value > 0 ? `+${value}` : `${value}`;
}

export default { data, execute };
