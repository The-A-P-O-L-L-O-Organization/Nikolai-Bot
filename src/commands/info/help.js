import { SlashCommandBuilder } from 'discord.js';
import { createEmbed } from '../../utils/embeds.js';
import config from '../../config.js';

export const data = new SlashCommandBuilder()
  .setName('help')
  .setDescription('Get help with bot commands')
  .addStringOption(opt =>
    opt.setName('category')
      .setDescription('Command category to get help with')
      .setRequired(false)
      .addChoices(
        { name: 'Nation', value: 'nation' },
        { name: 'Economy', value: 'economy' },
        { name: 'Military', value: 'military' },
        { name: 'Diplomacy', value: 'diplomacy' },
        { name: 'Research', value: 'research' },
        { name: 'Time & Turns', value: 'time' },
        { name: 'Admin', value: 'admin' },
      ));

export async function execute(interaction) {
  const category = interaction.options.getString('category');

  if (category) {
    return showCategoryHelp(interaction, category);
  }

  const embed = createEmbed({
    title: 'Nikolai Bot - Help',
    description: 'A comprehensive Nation Roleplay (NRP) management bot for Discord.',
    color: config.colors.primary,
  });

  embed.addFields(
    {
      name: 'Nation Commands',
      value: [
        '`/nation create` - Create a new nation',
        '`/nation view` - View nation details',
        '`/nation edit` - Edit nation properties',
        '`/nation list` - List all nations',
        '`/nation stats` - Detailed nation statistics',
        '`/spirits` - Manage national spirits',
      ].join('\n'),
      inline: false,
    },
    {
      name: 'Economy Commands',
      value: [
        '`/economy view` - View economic data',
        '`/economy set/add/remove` - Manage currency',
        '`/transfer` - Transfer resources between nations',
        '`/loan` - Manage loans',
        '`/transactions` - View transaction history',
      ].join('\n'),
      inline: false,
    },
    {
      name: 'Military Commands',
      value: [
        '`/military view` - View military forces',
        '`/military set` - Set unit counts',
        '`/unit produce` - Start unit production',
        '`/unit cancel` - Cancel production',
      ].join('\n'),
      inline: false,
    },
    {
      name: 'Diplomacy Commands',
      value: [
        '`/war declare/end/view/list` - War management',
        '`/treaty create/sign/view/list` - Treaty management',
      ].join('\n'),
      inline: false,
    },
    {
      name: 'Research Commands',
      value: [
        '`/research start` - Start researching a technology',
        '`/research status` - View research progress',
        '`/research list` - List available technologies',
      ].join('\n'),
      inline: false,
    },
    {
      name: 'Time & Turn Commands',
      value: [
        '`/year view/set` - View or set game year',
        '`/turn info/process/settings` - Turn management',
      ].join('\n'),
      inline: false,
    },
    {
      name: 'Getting Started',
      value: 'Use `/help category:Nation` for detailed help on each category.\nGMs can use `/nation create` to set up nations from templates.',
      inline: false,
    },
  );

  embed.setFooter({ text: 'Use /about for bot information' });

  await interaction.reply({ embeds: [embed] });
}

async function showCategoryHelp(interaction, category) {
  const helpData = {
    nation: {
      title: 'Nation Commands',
      description: 'Commands for managing nations in the roleplay.',
      commands: [
        { cmd: '/nation create', desc: '[GM] Create a new nation from scratch or template', usage: '/nation create name:Germany template:Great Power' },
        { cmd: '/nation view', desc: 'View detailed information about a nation', usage: '/nation view nation:Germany' },
        { cmd: '/nation edit', desc: '[GM] Edit a nation\'s properties', usage: '/nation edit nation:Germany field:leader value:Chancellor' },
        { cmd: '/nation delete', desc: '[GM] Delete a nation', usage: '/nation delete nation:Germany' },
        { cmd: '/nation assign', desc: '[GM] Assign a nation to a player', usage: '/nation assign nation:Germany player:@User' },
        { cmd: '/nation list', desc: 'List all nations', usage: '/nation list' },
        { cmd: '/nation stats', desc: 'View detailed nation statistics', usage: '/nation stats nation:Germany' },
        { cmd: '/spirits add', desc: '[GM] Add a national spirit', usage: '/spirits add nation:Germany spirit:Militarism' },
        { cmd: '/spirits remove', desc: '[GM] Remove a national spirit', usage: '/spirits remove nation:Germany spirit:Militarism' },
        { cmd: '/spirits list', desc: 'View available preset spirits', usage: '/spirits list' },
      ],
    },
    economy: {
      title: 'Economy Commands',
      description: 'Commands for managing national economies, currencies, and resources.',
      commands: [
        { cmd: '/economy view', desc: 'View a nation\'s economic status', usage: '/economy view nation:Germany' },
        { cmd: '/economy set', desc: '[GM] Set currency balance', usage: '/economy set nation:Germany currency:Reichsmarks amount:1B' },
        { cmd: '/economy add', desc: '[GM] Add currency to a nation', usage: '/economy add nation:Germany currency:Reichsmarks amount:100M' },
        { cmd: '/economy remove', desc: '[GM] Remove currency from a nation', usage: '/economy remove nation:Germany currency:Reichsmarks amount:50M' },
        { cmd: '/economy income', desc: '[GM] Set per-turn income', usage: '/economy income nation:Germany currency:Reichsmarks amount:10M' },
        { cmd: '/transfer', desc: 'Transfer resources between nations', usage: '/transfer from:Germany to:Italy type:currency name:Reichsmarks amount:50M' },
        { cmd: '/loan give', desc: 'Give a loan to another nation', usage: '/loan give from:Germany to:Italy amount:100M currency:Reichsmarks interest:5' },
        { cmd: '/loan repay', desc: 'Repay a loan', usage: '/loan repay nation:Italy creditor:Germany amount:50M' },
        { cmd: '/transactions', desc: 'View transaction history', usage: '/transactions nation:Germany' },
      ],
    },
    military: {
      title: 'Military Commands',
      description: 'Commands for managing military forces and production.',
      commands: [
        { cmd: '/military view', desc: 'View a nation\'s military forces', usage: '/military view nation:Germany' },
        { cmd: '/military set', desc: '[GM] Set unit counts', usage: '/military set nation:Germany branch:army unit:tanks amount:500' },
        { cmd: '/military add', desc: '[GM] Add units to a nation', usage: '/military add nation:Germany branch:army unit:tanks amount:100' },
        { cmd: '/military remove', desc: '[GM] Remove units from a nation', usage: '/military remove nation:Germany branch:army unit:tanks amount:50' },
        { cmd: '/unit produce', desc: 'Start production of units', usage: '/unit produce nation:Germany unit:tanks quantity:100 turns:3' },
        { cmd: '/unit cancel', desc: 'Cancel a production order', usage: '/unit cancel nation:Germany index:1' },
        { cmd: '/unit queue', desc: 'View production queue', usage: '/unit queue nation:Germany' },
        { cmd: '/resources view', desc: 'View resources', usage: '/resources view nation:Germany' },
        { cmd: '/resources set', desc: '[GM] Set resource amounts', usage: '/resources set nation:Germany resource:Oil amount:1000' },
      ],
    },
    diplomacy: {
      title: 'Diplomacy Commands',
      description: 'Commands for managing wars and treaties between nations.',
      commands: [
        { cmd: '/war declare', desc: '[GM] Declare war between nations', usage: '/war declare name:"Great War" aggressor:Germany defender:France reason:Conquest' },
        { cmd: '/war join', desc: '[GM] Add a nation to an existing war', usage: '/war join war:"Great War" nation:Italy side:aggressor' },
        { cmd: '/war end', desc: '[GM] End a war', usage: '/war end war:"Great War" outcome:aggressor_victory' },
        { cmd: '/war view', desc: 'View war details', usage: '/war view war:"Great War"' },
        { cmd: '/war list', desc: 'List all wars', usage: '/war list status:active' },
        { cmd: '/treaty create', desc: '[GM] Create a treaty', usage: '/treaty create name:"Munich Pact" type:non_aggression' },
        { cmd: '/treaty sign', desc: '[GM] Add a nation to a treaty', usage: '/treaty sign treaty:"Munich Pact" nation:Germany' },
        { cmd: '/treaty dissolve', desc: '[GM] End a treaty', usage: '/treaty dissolve treaty:"Munich Pact"' },
        { cmd: '/treaty view', desc: 'View treaty details', usage: '/treaty view treaty:"Munich Pact"' },
        { cmd: '/treaty list', desc: 'List all treaties', usage: '/treaty list' },
      ],
    },
    research: {
      title: 'Research Commands',
      description: 'Commands for managing technology research.',
      commands: [
        { cmd: '/research start', desc: 'Start researching a technology', usage: '/research start nation:Germany technology:Rocketry' },
        { cmd: '/research cancel', desc: 'Cancel current research', usage: '/research cancel nation:Germany' },
        { cmd: '/research status', desc: 'View research status', usage: '/research status nation:Germany' },
        { cmd: '/research list', desc: 'List available technologies', usage: '/research list category:military' },
        { cmd: '/research view', desc: 'View technology details', usage: '/research view technology:Rocketry' },
        { cmd: '/research grant', desc: '[GM] Grant technology instantly', usage: '/research grant nation:Germany technology:Rocketry' },
        { cmd: '/research revoke', desc: '[GM] Revoke a technology', usage: '/research revoke nation:Germany technology:Rocketry' },
        { cmd: '/research tech create', desc: '[GM] Create a new technology', usage: '/research tech create name:Rocketry category:military research_time:4' },
      ],
    },
    time: {
      title: 'Time & Turn Commands',
      description: 'Commands for managing game time and automatic turn processing.',
      commands: [
        { cmd: '/year view', desc: 'View current game year', usage: '/year view' },
        { cmd: '/year set', desc: '[GM] Set game year', usage: '/year set year:1939' },
        { cmd: '/year advance', desc: '[GM] Advance year manually', usage: '/year advance amount:1' },
        { cmd: '/turn info', desc: 'View turn information', usage: '/turn info' },
        { cmd: '/turn process', desc: '[GM] Manually process a turn', usage: '/turn process' },
        { cmd: '/turn settings', desc: '[GM] Configure turn settings', usage: '/turn settings interval:12 auto_year:true' },
        { cmd: '/turn channel', desc: '[GM] Set announcement channel', usage: '/turn channel channel:#game-updates' },
      ],
    },
    admin: {
      title: 'Admin Commands',
      description: 'Administrative commands for Game Masters.',
      commands: [
        { cmd: '/audit view', desc: '[GM] View audit log', usage: '/audit view nation:Germany' },
        { cmd: '/audit search', desc: '[GM] Search audit logs', usage: '/audit search action:update' },
        { cmd: '/backup create', desc: '[GM] Create database backup', usage: '/backup create' },
        { cmd: '/backup restore', desc: '[GM] Restore from backup', usage: '/backup restore' },
        { cmd: '/settings view', desc: 'View game settings', usage: '/settings view' },
        { cmd: '/settings set', desc: '[GM] Change game settings', usage: '/settings set setting:auto_advance_year value:true' },
      ],
    },
  };

  const data = helpData[category];
  if (!data) {
    return interaction.reply({ content: 'Invalid category.', ephemeral: true });
  }

  const embed = createEmbed({
    title: data.title,
    description: data.description,
    color: config.colors.primary,
  });

  for (const cmd of data.commands) {
    embed.addFields({
      name: cmd.cmd,
      value: `${cmd.desc}\n\`${cmd.usage}\``,
      inline: false,
    });
  }

  embed.setFooter({ text: '[GM] = Requires @GM role | Use /help for overview' });

  await interaction.reply({ embeds: [embed] });
}
