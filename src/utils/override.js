/**
 * Override system for granting temporary elevated permissions
 * Only the authorized user can generate and activate override codes
 */

// The only user authorized to use override
const AUTHORIZED_USER_ID = '1068324046422413373';

// Code expiration time in milliseconds (5 minutes)
const CODE_EXPIRATION_MS = 5 * 60 * 1000;

// In-memory state
const state = {
  // Pending code awaiting validation: { code: string, expiresAt: number } | null
  pendingCode: null,
  // Set of user IDs with active override
  activeOverrides: new Set(),
};

/**
 * Generate a random alphanumeric code in format XXXX-XXXX-XXXX
 */
function generateRandomCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const segments = [];
  
  for (let i = 0; i < 3; i++) {
    let segment = '';
    for (let j = 0; j < 4; j++) {
      segment += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    segments.push(segment);
  }
  
  return segments.join('-');
}

/**
 * Check if a user is authorized to use override
 */
export function isAuthorizedUser(userId) {
  return userId === AUTHORIZED_USER_ID;
}

/**
 * Generate a new override code for the authorized user
 * Logs the code to console (Docker logs)
 * @returns {boolean} Whether code was generated successfully
 */
export function generateCode(userId) {
  if (!isAuthorizedUser(userId)) {
    return false;
  }
  
  const code = generateRandomCode();
  const expiresAt = Date.now() + CODE_EXPIRATION_MS;
  
  state.pendingCode = { code, expiresAt };
  
  // Log to console (appears in Docker logs)
  console.log(`[OVERRIDE] Code generated for user ${userId}: ${code}`);
  console.log(`[OVERRIDE] Code expires at: ${new Date(expiresAt).toISOString()}`);
  
  return true;
}

/**
 * Validate an override code and activate override if valid
 * @returns {{ success: boolean, message: string }}
 */
export function validateCode(userId, code) {
  if (!isAuthorizedUser(userId)) {
    return { success: false, message: 'You are not authorized to use override.' };
  }
  
  if (!state.pendingCode) {
    return { success: false, message: 'No pending override code. Run `/override` first to generate one.' };
  }
  
  if (Date.now() > state.pendingCode.expiresAt) {
    state.pendingCode = null;
    return { success: false, message: 'Override code has expired. Generate a new one with `/override`.' };
  }
  
  if (code.toUpperCase() !== state.pendingCode.code) {
    return { success: false, message: 'Invalid override code.' };
  }
  
  // Code is valid - activate override
  state.activeOverrides.add(userId);
  state.pendingCode = null;
  
  console.log(`[OVERRIDE] Override ACTIVATED for user ${userId}`);
  
  return { success: true, message: 'Override mode activated. You now have access to all commands.' };
}

/**
 * Deactivate override for a user
 * @returns {boolean} Whether override was deactivated (false if wasn't active)
 */
export function deactivate(userId) {
  if (!state.activeOverrides.has(userId)) {
    return false;
  }
  
  state.activeOverrides.delete(userId);
  console.log(`[OVERRIDE] Override DEACTIVATED for user ${userId}`);
  
  return true;
}

/**
 * Check if a user has active override
 */
export function hasOverride(userId) {
  return state.activeOverrides.has(userId);
}

/**
 * Check if there's a pending code for validation
 */
export function hasPendingCode() {
  if (!state.pendingCode) return false;
  
  // Check if expired
  if (Date.now() > state.pendingCode.expiresAt) {
    state.pendingCode = null;
    return false;
  }
  
  return true;
}

/**
 * Get the expiration time of the pending code (for display)
 */
export function getPendingCodeExpiration() {
  if (!state.pendingCode) return null;
  return state.pendingCode.expiresAt;
}
