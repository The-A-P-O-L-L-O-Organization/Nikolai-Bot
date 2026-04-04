import { Events } from 'discord.js';

export const name = Events.InteractionCreate;
export const once = false;

export async function execute(interaction) {
  // Handle slash commands
  if (interaction.isChatInputCommand()) {
    const command = interaction.client.commands.get(interaction.commandName);

    if (!command) {
      console.error(`No command matching ${interaction.commandName} was found.`);
      return;
    }

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(`Error executing ${interaction.commandName}:`, error);
      
      const errorMessage = {
        content: 'There was an error while executing this command!',
        ephemeral: true,
      };

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(errorMessage);
      } else {
        await interaction.reply(errorMessage);
      }
    }
  }
  
  // Handle autocomplete
  else if (interaction.isAutocomplete()) {
    const command = interaction.client.commands.get(interaction.commandName);

    if (!command || !command.autocomplete) {
      return;
    }

    try {
      await command.autocomplete(interaction);
    } catch (error) {
      console.error(`Error handling autocomplete for ${interaction.commandName}:`, error);
    }
  }
  
  // Handle button interactions
  else if (interaction.isButton()) {
    // Button handling will be implemented per-command
    // Commands can export a handleButton function
    const [commandName] = interaction.customId.split(':');
    const command = interaction.client.commands.get(commandName);
    
    if (command && command.handleButton) {
      try {
        await command.handleButton(interaction);
      } catch (error) {
        console.error(`Error handling button for ${commandName}:`, error);
      }
    }
  }
  
  // Handle select menu interactions
  else if (interaction.isStringSelectMenu()) {
    const [commandName] = interaction.customId.split(':');
    const command = interaction.client.commands.get(commandName);
    
    if (command && command.handleSelectMenu) {
      try {
        await command.handleSelectMenu(interaction);
      } catch (error) {
        console.error(`Error handling select menu for ${commandName}:`, error);
      }
    }
  }
  
  // Handle modal submissions
  else if (interaction.isModalSubmit()) {
    const [commandName] = interaction.customId.split(':');
    const command = interaction.client.commands.get(commandName);
    
    if (command && command.handleModal) {
      try {
        await command.handleModal(interaction);
      } catch (error) {
        console.error(`Error handling modal for ${commandName}:`, error);
      }
    }
  }
}
