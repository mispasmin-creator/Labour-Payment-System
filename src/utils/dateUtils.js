/**
 * Date and Workflow Delay Calculation Utilities
 */

/**
 * Robust date parser supporting ISO, M/d/yyyy H:mm:ss, d-m-yyyy, etc.
 */
export function parseDate(dateInput) {
  if (!dateInput) return null;
  if (dateInput instanceof Date) return isNaN(dateInput.getTime()) ? null : dateInput;
  
  const str = String(dateInput).trim();
  if (!str || str === '-' || str.toLowerCase() === 'what' || str.toLowerCase() === 'who') return null;

  // Try direct date constructor
  const d = new Date(str);
  if (!isNaN(d.getTime())) return d;

  // Handle M/d/yyyy H:m:s or M/d/yyyy, H:m:s
  const match = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (match) {
    const month = parseInt(match[1], 10) - 1;
    const day = parseInt(match[2], 10);
    const year = parseInt(match[3], 10);
    const hour = match[4] ? parseInt(match[4], 10) : 0;
    const minute = match[5] ? parseInt(match[5], 10) : 0;
    const second = match[6] ? parseInt(match[6], 10) : 0;
    const parsed = new Date(year, month, day, hour, minute, second);
    if (!isNaN(parsed.getTime())) return parsed;
  }

  return null;
}

/**
 * Format a Date or string into a readable date (e.g., "25 Aug 2026")
 */
export function formatDate(dateInput) {
  if (!dateInput) return '-';
  const d = parseDate(dateInput);
  if (!d) return String(dateInput);
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

/**
 * Format a Date or string into readable date & time (e.g., "25 Aug 2026, 02:45 PM")
 */
export function formatDateTime(dateInput) {
  if (!dateInput) return '-';
  const d = parseDate(dateInput);
  if (!d) return String(dateInput);
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

/**
 * Format current timestamp for Google Sheets format (e.g. "8/26/2026 0:31:13")
 */
export function getNowTimestamp(d = new Date()) {
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const year = d.getFullYear();
  const hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  return `${month}/${day}/${year} ${hours}:${minutes}:${seconds}`;
}

/**
 * Calculate delay between plannedDate and actualDate.
 * Returns delay details including formatted string and severity for visual badges.
 */
export function calculateWorkflowDelay(plannedDate, actualDate) {
  if (!plannedDate || !actualDate) {
    return {
      diffMs: 0,
      diffHours: 0,
      diffDays: 0,
      formatted: 'Pending',
      severity: 'ontime',
      isDelayed: false
    };
  }

  const planned = parseDate(plannedDate);
  const actual = parseDate(actualDate);

  if (!planned || !actual) {
    return {
      diffMs: 0,
      diffHours: 0,
      diffDays: 0,
      formatted: '-',
      severity: 'ontime',
      isDelayed: false
    };
  }

  const diffMs = actual.getTime() - planned.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = (diffMs / (1000 * 60 * 60)).toFixed(1);
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMs <= 0) {
    return {
      diffMs,
      diffHours: 0,
      diffDays: 0,
      formatted: 'On Time',
      severity: 'ontime',
      isDelayed: false
    };
  }

  // Formatting delayed time
  let formatted = '';
  if (diffMinutes < 60) {
    formatted = `${diffMinutes}m delay`;
  } else if (diffMinutes < 1440) {
    const hrs = Math.floor(diffMinutes / 60);
    const mins = diffMinutes % 60;
    formatted = mins > 0 ? `${hrs}h ${mins}m delay` : `${hrs}h delay`;
  } else {
    const days = diffDays;
    const remainingHrs = Math.floor((diffMinutes % 1440) / 60);
    formatted = remainingHrs > 0 ? `${days}d ${remainingHrs}h delay` : `${days}d delay`;
  }

  const severity = diffMinutes > 240 ? 'severe' : diffMinutes > 60 ? 'moderate' : 'ontime';

  return {
    diffMs,
    diffHours: Number(diffHours),
    diffDays,
    formatted,
    severity,
    isDelayed: true
  };
}

/**
 * Format currency in Indian format (₹ 12,500)
 */
export function formatINR(amount) {
  const num = Number(amount) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(num);
}
