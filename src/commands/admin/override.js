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
  .setName('override')
  .setDescription('Activate override mode (authorized users only)')
  .addStringOption(opt =>
    opt.setName('code')
      .setDescription('The override code from the logs')
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
  
  const code = interaction.options.getString('code');
  
  // Case 1: Code provided - attempt to activate override
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
  
  // Case 2: No code provided - toggle behavior
  
  // If override is active, deactivate it
  if (hasOverride(userId)) {
    deactivate(userId);
    return interaction.reply({ 
      embeds: [warningEmbed('Override mode deactivated.')], 
      ephemeral: true 
    });
  }
  
  // Otherwise, generate a new code
  generateCode(userId);
  
  return interaction.reply({ 
    embeds: [successEmbed(
      'Override code generated and logged to console.\n\n' +
      'Check the Docker logs for the code, then run:\n' +
      '`/override code:<your-code>`\n\n' +
      'The code expires in **5 minutes**.'
    )], 
    ephemeral: true 
  });
}
