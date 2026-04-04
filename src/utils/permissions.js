import config from '../config.js';

/**
 * Check if a member has the GM role
 */
export function isGM(member) {
  if (!member) return false;
  
  // Check by role name
  const hasGMRole = member.roles.cache.some(
    role => role.name.toLowerCase() === config.bot.gmRoleName.toLowerCase()
  );
  
  // Also allow server administrators
  const isAdmin = member.permissions.has('Administrator');
  
  return hasGMRole || isAdmin;
}

/**
 * Check if a user owns a nation
 */
export function ownsNation(userId, nation) {
  if (!nation || !userId) return false;
  return nation.owner === userId;
}

/**
 * Check if user has permission to modify a nation
 * Returns true if user is GM or owns the nation
 */
export function canModifyNation(member, nation) {
  if (!member || !nation) return false;
  return isGM(member) || ownsNation(member.id, nation);
}

/**
 * Get permission level string for display
 */
export function getPermissionLevel(member) {
  if (!member) return 'None';
  if (member.permissions.has('Administrator')) return 'Administrator';
  if (isGM(member)) return 'Game Master';
  return 'Player';
}

/**
 * Create a permission check middleware for commands
 */
export function requireGM(interaction) {
  if (!isGM(interaction.member)) {
    interaction.reply({
      content: `You need the **@${config.bot.gmRoleName}** role to use this command.`,
      ephemeral: true,
    });
    return false;
  }
  return true;
}

/**
 * Check if user can modify nation, with error response
 */
export async function requireNationAccess(interaction, nation) {
  if (!nation) {
    await interaction.reply({
      content: 'Nation not found.',
      ephemeral: true,
    });
    return false;
  }
  
  if (!canModifyNation(interaction.member, nation)) {
    await interaction.reply({
      content: `You don't have permission to modify **${nation.name}**. You must be the nation owner or have the @${config.bot.gmRoleName} role.`,
      ephemeral: true,
    });
    return false;
  }
  
  return true;
}
