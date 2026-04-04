/**
 * Format a number with abbreviations (1M, 1B, 1T)
 */
export function formatNumber(num, decimals = 1) {
  if (num === null || num === undefined) return '0';
  if (typeof num === 'string') num = parseFloat(num);
  if (isNaN(num)) return '0';

  const absNum = Math.abs(num);
  const sign = num < 0 ? '-' : '';

  if (absNum >= 1e12) {
    return sign + (absNum / 1e12).toFixed(decimals).replace(/\.0+$/, '') + 'T';
  }
  if (absNum >= 1e9) {
    return sign + (absNum / 1e9).toFixed(decimals).replace(/\.0+$/, '') + 'B';
  }
  if (absNum >= 1e6) {
    return sign + (absNum / 1e6).toFixed(decimals).replace(/\.0+$/, '') + 'M';
  }
  if (absNum >= 1e3) {
    return sign + (absNum / 1e3).toFixed(decimals).replace(/\.0+$/, '') + 'K';
  }
  
  return sign + absNum.toLocaleString();
}

/**
 * Format a number with commas (1,000,000)
 */
export function formatNumberFull(num) {
  if (num === null || num === undefined) return '0';
  if (typeof num === 'string') num = parseFloat(num);
  if (isNaN(num)) return '0';
  
  return num.toLocaleString();
}

/**
 * Parse a string like "1M", "500K", "1.5B" to a number
 */
export function parseAbbreviatedNumber(str) {
  if (typeof str === 'number') return str;
  if (!str) return 0;
  
  str = str.toString().toUpperCase().trim().replace(/,/g, '');
  
  const multipliers = {
    'K': 1e3,
    'M': 1e6,
    'B': 1e9,
    'T': 1e12,
  };
  
  const match = str.match(/^(-?[\d.]+)\s*([KMBT])?$/);
  if (!match) return parseFloat(str) || 0;
  
  const value = parseFloat(match[1]);
  const multiplier = multipliers[match[2]] || 1;
  
  return value * multiplier;
}

/**
 * Format currency with symbol
 */
export function formatCurrency(amount, currency, icon = '') {
  const formatted = formatNumber(amount);
  if (icon) {
    return `${icon}${formatted}`;
  }
  return `${formatted} ${currency}`;
}

/**
 * Format percentage
 */
export function formatPercentage(value) {
  return `${value}%`;
}

/**
 * Format a date to a readable string
 */
export function formatDate(date) {
  if (!date) return 'N/A';
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format a date relative to now (e.g., "2 hours ago", "in 3 days")
 */
export function formatRelativeTime(date) {
  if (!date) return 'N/A';
  
  const now = new Date();
  const target = new Date(date);
  const diffMs = target - now;
  const diffSecs = Math.abs(diffMs / 1000);
  const diffMins = diffSecs / 60;
  const diffHours = diffMins / 60;
  const diffDays = diffHours / 24;
  
  const isFuture = diffMs > 0;
  const prefix = isFuture ? 'in ' : '';
  const suffix = isFuture ? '' : ' ago';
  
  if (diffSecs < 60) {
    return 'just now';
  } else if (diffMins < 60) {
    const mins = Math.floor(diffMins);
    return `${prefix}${mins} minute${mins !== 1 ? 's' : ''}${suffix}`;
  } else if (diffHours < 24) {
    const hours = Math.floor(diffHours);
    return `${prefix}${hours} hour${hours !== 1 ? 's' : ''}${suffix}`;
  } else {
    const days = Math.floor(diffDays);
    return `${prefix}${days} day${days !== 1 ? 's' : ''}${suffix}`;
  }
}

/**
 * Capitalize first letter of each word
 */
export function titleCase(str) {
  if (!str) return '';
  return str.replace(/\w\S*/g, txt => 
    txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );
}

/**
 * Truncate a string to a maximum length
 */
export function truncate(str, maxLength = 100) {
  if (!str) return '';
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - 3) + '...';
}

/**
 * Convert camelCase to Title Case
 */
export function camelToTitle(str) {
  if (!str) return '';
  return str
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, s => s.toUpperCase())
    .trim();
}

/**
 * Convert snake_case to Title Case
 */
export function snakeToTitle(str) {
  if (!str) return '';
  return str
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}
