import { SlashCommandBuilder } from 'discord.js';
import { 
  isAuthorizedUser, 
  hasOverride, 
  generateCode, 
  validateCode, 
  deactivate 
} from '../../utils/override.js';
import { errorEmbed, successEmbed, warningEmbed } from '../../utils/embeds.js';

export const data = new SlashCommandBuilder()
  .setName('maintenance')
  .setDescription('Maintenance mode controls (authorized users only)')
  .addStringOption(opt =>
    opt.setName('mode')
      .setDescription('Turn maintenance mode on or off')
      .setRequired(true)
      .addChoices(
        { name: 'on', value: 'on' },
        { name: 'off', value: 'off' }
      ))
  .addStringOption(opt =>
    opt.setName('code')
      .setDescription('The maintenance code from the logs')
      .setRequired(false));

export async function execute(interaction) {
  const userId = interaction.user.id;
  
  // Check if user is authorized
  if (!isAuthorizedUser(userId)) {
    return interaction.reply({ 
      embeds: [errorEmbed('You are not authorized to use this command.')], 
      ephemeral: true 
    });
  }
  
  const mode = interaction.options.getString('mode');
  const code = interaction.options.getString('code');
  
  // Mode: OFF - deactivate override
  if (mode === 'off') {
    if (hasOverride(userId)) {
      deactivate(userId);
      return interaction.reply({ 
        embeds: [warningEmbed('Maintenance mode deactivated.')], 
        ephemeral: true 
      });
    } else {
      return interaction.reply({ 
        embeds: [errorEmbed('Maintenance mode is not currently active.')], 
        ephemeral: true 
      });
    }
  }
  
  // Mode: ON
  if (mode === 'on') {
    // If code provided, attempt to activate
    if (code) {
      const result = validateCode(userId, code);
      
      if (result.success) {
        return interaction.reply({ 
          embeds: [successEmbed(result.message)], 
          ephemeral: true 
        });
      } else {
        return interaction.reply({ 
          embeds: [errorEmbed(result.message)], 
          ephemeral: true 
        });
      }
    }
    
    // No code provided - generate a new code
    generateCode(userId);
    
    return interaction.reply({ 
      embeds: [successEmbed(
        'Maintenance code generated and logged to console.\n\n' +
        'Check the Docker logs for the code, then run:\n' +
        '`/maintenance mode:on code:<your-code>`\n\n' +
        'The code expires in **5 minutes**.'
      )], 
      ephemeral: true 
    });
  }
}
