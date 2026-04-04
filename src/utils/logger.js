/**
 * Logger utility for consistent logging throughout the application
 */

const LogLevel = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

const currentLevel = process.env.LOG_LEVEL 
  ? LogLevel[process.env.LOG_LEVEL.toUpperCase()] || LogLevel.INFO 
  : LogLevel.INFO;

function getTimestamp() {
  return new Date().toISOString();
}

function formatMessage(level, message, meta = null) {
  const timestamp = getTimestamp();
  let formatted = `[${timestamp}] [${level}] ${message}`;
  if (meta) {
    formatted += ` ${JSON.stringify(meta)}`;
  }
  return formatted;
}

export const logger = {
  debug(message, meta = null) {
    if (currentLevel <= LogLevel.DEBUG) {
      console.log(formatMessage('DEBUG', message, meta));
    }
  },

  info(message, meta = null) {
    if (currentLevel <= LogLevel.INFO) {
      console.log(formatMessage('INFO', message, meta));
    }
  },

  warn(message, meta = null) {
    if (currentLevel <= LogLevel.WARN) {
      console.warn(formatMessage('WARN', message, meta));
    }
  },

  error(message, meta = null) {
    if (currentLevel <= LogLevel.ERROR) {
      console.error(formatMessage('ERROR', message, meta));
    }
  },

  // Log command execution
  command(commandName, userId, guildId) {
    this.info(`Command executed: ${commandName}`, { userId, guildId });
  },

  // Log database operations
  db(operation, collection, details = null) {
    this.debug(`DB ${operation}: ${collection}`, details);
  },
};

export default logger;
