import { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import Nation from '../../database/models/Nation.js';
import { createAuditLog } from '../../database/models/AuditLog.js';
import { isGM, requireGM } from '../../utils/permissions.js';
import { createEmbed, errorEmbed, successEmbed } from '../../utils/embeds.js';
import config from '../../config.js';
import { defaultSpirits } from '../../presets/spirits.js';

export const data = new SlashCommandBuilder()
  .setName('spirits')
  .setDescription('Manage nation spirits (national traits/buffs)')
  .addSubcommand(sub =>
    sub.setName('view')
      .setDescription('View a nation\'s spirits')
      .addStringOption(opt =>
        opt.setName('nation')
          .setDescription('Nation to view')
          .setRequired(true)
          .setAutocomplete(true)))
  .addSubcommand(sub =>
    sub.setName('add')
      .setDescription('Add a spirit to a nation')
      .addStringOption(opt =>
        opt.setName('nation')
          .setDescription('Nation to modify')
          .setRequired(true)
          .setAutocomplete(true))
      .addStringOption(opt =>
        opt.setName('preset')
          .setDescription('Use a preset spirit')
          .setRequired(false)
          .setAutocomplete(true)))
  .addSubcommand(sub =>
    sub.setName('remove')
      .setDescription('Remove a spirit from a nation')
      .addStringOption(opt =>
        opt.setName('nation')
          .setDescription('Nation to modify')
          .setRequired(true)
          .setAutocomplete(true))
      .addStringOption(opt =>
        opt.setName('spirit')
          .setDescription('Spirit to remove')
          .setRequired(true)
          .setAutocomplete(true)))
  .addSubcommand(sub =>
    sub.setName('list')
      .setDescription('List all available preset spirits'));

export async function execute(interaction) {
  const subcommand = interaction.options.getSubcommand();

  switch (subcommand) {
    case 'view':
      return handleView(interaction);
    case 'add':
      return handleAdd(interaction);
    case 'remove':
      return handleRemove(interaction);
    case 'list':
      return handleList(interaction);
  }
}

async function handleView(interaction) {
  const nationName = interaction.options.getString('nation');
  const nation = await Nation.findOne({ name: { $regex: new RegExp(`^${nationName}$`, 'i') } });

  if (!nation) {
    return interaction.reply({ embeds: [errorEmbed(`Nation **${nationName}** not found.`)], ephemeral: true });
  }

  if (!nation.spirits || nation.spirits.length === 0) {
    return interaction.reply({ embeds: [errorEmbed(`**${nation.name}** has no spirits.`)] });
  }

  const embed = createEmbed({
    title: `${nation.name} - Spirits`,
    color: config.colors.primary,
  });

  for (const spirit of nation.spirits) {
    let effectsText = spirit.description || '';
    if (spirit.effects && spirit.effects.length > 0) {
      effectsText += '\n**Effects:**\n' + spirit.effects.map(e => `• ${e.description || `${e.type}: ${e.value}`}`).join('\n');
    }
    embed.addFields({ name: spirit.name, value: effectsText || 'No description', inline: false });
  }

  await interaction.reply({ embeds: [embed] });
}

async function handleAdd(interaction) {
  if (!requireGM(interaction)) return;

  const nationName = interaction.options.getString('nation');
  const presetName = interaction.options.getString('preset');

  const nation = await Nation.findOne({ name: { $regex: new RegExp(`^${nationName}$`, 'i') } });
  if (!nation) {
    return interaction.reply({ embeds: [errorEmbed(`Nation **${nationName}** not found.`)], ephemeral: true });
  }

  // If preset specified, add it directly
  if (presetName) {
    const preset = defaultSpirits.find(s => s.name.toLowerCase() === presetName.toLowerCase());
    if (!preset) {
      return interaction.reply({ embeds: [errorEmbed(`Preset spirit **${presetName}** not found.`)], ephemeral: true });
    }

    // Check if already has this spirit
    if (nation.spirits.some(s => s.name.toLowerCase() === preset.name.toLowerCase())) {
      return interaction.reply({ embeds: [errorEmbed(`**${nation.name}** already has the spirit **${preset.name}**.`)], ephemeral: true });
    }

    nation.spirits.push(preset);
    await nation.save();

    await createAuditLog({
      entityType: 'nation',
      entityId: nation._id,
      entityName: nation.name,
      action: 'update',
      field: 'spirits',
      newValue: preset.name,
      description: `Spirit **${preset.name}** added to **${nation.name}**`,
      performedBy: interaction.user.id,
      performedByTag: interaction.user.tag,
    });

    return interaction.reply({ embeds: [successEmbed(`Added spirit **${preset.name}** to **${nation.name}**.`)] });
  }

  // Otherwise show modal for custom spirit
  const modal = new ModalBuilder()
    .setCustomId(`spirits:add:${nation._id}`)
    .setTitle(`Add Spirit to ${nation.name}`);

  const nameInput = new TextInputBuilder()
    .setCustomId('name')
    .setLabel('Spirit Name')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(100);

  const descInput = new TextInputBuilder()
    .setCustomId('description')
    .setLabel('Description')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(false)
    .setMaxLength(500);

  const effectsInput = new TextInputBuilder()
    .setCustomId('effects')
    .setLabel('Effects (one per line, e.g. "+10% income")')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(false)
    .setMaxLength(500);

  modal.addComponents(
    new ActionRowBuilder().addComponents(nameInput),
    new ActionRowBuilder().addComponents(descInput),
    new ActionRowBuilder().addComponents(effectsInput),
  );

  await interaction.showModal(modal);
}

async function handleRemove(interaction) {
  if (!requireGM(interaction)) return;

  const nationName = interaction.options.getString('nation');
  const spiritName = interaction.options.getString('spirit');

  const nation = await Nation.findOne({ name: { $regex: new RegExp(`^${nationName}$`, 'i') } });
  if (!nation) {
    return interaction.reply({ embeds: [errorEmbed(`Nation **${nationName}** not found.`)], ephemeral: true });
  }

  const spiritIndex = nation.spirits.findIndex(s => s.name.toLowerCase() === spiritName.toLowerCase());
  if (spiritIndex === -1) {
    return interaction.reply({ embeds: [errorEmbed(`**${nation.name}** doesn't have a spirit named **${spiritName}**.`)], ephemeral: true });
  }

  const removedSpirit = nation.spirits[spiritIndex];
  nation.spirits.splice(spiritIndex, 1);
  await nation.save();

  await createAuditLog({
    entityType: 'nation',
    entityId: nation._id,
    entityName: nation.name,
    action: 'update',
    field: 'spirits',
    oldValue: removedSpirit.name,
    description: `Spirit **${removedSpirit.name}** removed from **${nation.name}**`,
    performedBy: interaction.user.id,
    performedByTag: interaction.user.tag,
  });

  await interaction.reply({ embeds: [successEmbed(`Removed spirit **${removedSpirit.name}** from **${nation.name}**.`)] });
}

async function handleList(interaction) {
  const embed = createEmbed({
    title: 'Available Spirit Presets',
    description: 'Use `/spirits add <nation> <preset>` to add one of these spirits.',
    color: config.colors.primary,
  });

  // Group by category (derived from effects)
  const military = defaultSpirits.filter(s => 
    s.effects.some(e => e.type === 'military_modifier') || s.name.includes('Military') || s.name.includes('Naval') || s.name.includes('Air')
  );
  const economic = defaultSpirits.filter(s => 
    s.effects.some(e => ['income_modifier', 'production_speed', 'resource_income'].includes(e.type))
  );
  const political = defaultSpirits.filter(s => 
    s.effects.some(e => ['stability_modifier', 'diplomacy_bonus'].includes(e.type))
  );
  const research = defaultSpirits.filter(s => 
    s.effects.some(e => e.type === 'research_speed')
  );

  if (military.length > 0) {
    embed.addFields({
      name: 'Military',
      value: military.map(s => `**${s.name}** - ${s.description.substring(0, 50)}...`).join('\n'),
      inline: false,
    });
  }

  if (economic.length > 0) {
    embed.addFields({
      name: 'Economic',
      value: economic.map(s => `**${s.name}** - ${s.description.substring(0, 50)}...`).join('\n'),
      inline: false,
    });
  }

  if (political.length > 0) {
    embed.addFields({
      name: 'Political/Social',
      value: political.map(s => `**${s.name}** - ${s.description.substring(0, 50)}...`).join('\n'),
      inline: false,
    });
  }

  if (research.length > 0) {
    embed.addFields({
      name: 'Research',
      value: research.map(s => `**${s.name}** - ${s.description.substring(0, 50)}...`).join('\n'),
      inline: false,
    });
  }

  await interaction.reply({ embeds: [embed] });
}

export async function handleModal(interaction) {
  const [, action, nationId] = interaction.customId.split(':');

  if (action === 'add') {
    const nation = await Nation.findById(nationId);
    if (!nation) {
      return interaction.reply({ embeds: [errorEmbed('Nation not found.')], ephemeral: true });
    }

    const name = interaction.fields.getTextInputValue('name');
    const description = interaction.fields.getTextInputValue('description');
    const effectsText = interaction.fields.getTextInputValue('effects');

    // Parse effects from text
    const effects = [];
    if (effectsText) {
      const lines = effectsText.split('\n').filter(l => l.trim());
      for (const line of lines) {
        effects.push({
          type: 'custom',
          description: line.trim(),
        });
      }
    }

    const spirit = { name, description, effects };
    nation.spirits.push(spirit);
    await nation.save();

    await createAuditLog({
      entityType: 'nation',
      entityId: nation._id,
      entityName: nation.name,
      action: 'update',
      field: 'spirits',
      newValue: name,
      description: `Custom spirit **${name}** added to **${nation.name}**`,
      performedBy: interaction.user.id,
      performedByTag: interaction.user.tag,
    });

    await interaction.reply({ embeds: [successEmbed(`Added custom spirit **${name}** to **${nation.name}**.`)] });
  }
}

export async function autocomplete(interaction) {
  const focusedOption = interaction.options.getFocused(true);

  if (focusedOption.name === 'nation') {
    const nations = await Nation.find({
      name: { $regex: focusedOption.value, $options: 'i' }
    }).limit(25);
    await interaction.respond(nations.map(n => ({ name: n.name, value: n.name })));
  } else if (focusedOption.name === 'preset') {
    const filtered = defaultSpirits.filter(s => 
      s.name.toLowerCase().includes(focusedOption.value.toLowerCase())
    ).slice(0, 25);
    await interaction.respond(filtered.map(s => ({ name: s.name, value: s.name })));
  } else if (focusedOption.name === 'spirit') {
    const nationName = interaction.options.getString('nation');
    const nation = await Nation.findOne({ name: { $regex: new RegExp(`^${nationName}$`, 'i') } });
    if (nation && nation.spirits) {
      const filtered = nation.spirits.filter(s =>
        s.name.toLowerCase().includes(focusedOption.value.toLowerCase())
      ).slice(0, 25);
      await interaction.respond(filtered.map(s => ({ name: s.name, value: s.name })));
    } else {
      await interaction.respond([]);
    }
  }
}
