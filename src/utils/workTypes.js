/**
 * Work Types & Calculation Mode Definitions
 */

export const TON_BASED_WORK_KEYWORDS = [
  'loading',
  'loading jumbo',
  'unloading',
  'unloading jumbo',
  'production'
];

/**
 * Check if the selected work type is ton-based
 * (Loading, Loading Jumbo, Unloading, Unloading Jumbo, Production)
 */
export function isTonBasedWork(workType) {
  if (!workType) return false;
  const normalized = String(workType).trim().toLowerCase();
  
  return TON_BASED_WORK_KEYWORDS.some(keyword => {
    if (normalized === keyword) return true;
    if (keyword.includes(' ') && normalized.includes(keyword)) return true;
    if (normalized.startsWith(keyword)) return true;
    return false;
  });
}

/**
 * Returns the unit label for the work type
 */
export function getWorkTypeUnit(workType) {
  return isTonBasedWork(workType) ? 'Tons' : 'Units';
}

/**
 * Compute total amount based on activity type:
 * - Ton-based: Qty (Tons) * Rate per Ton
 * - Person/Daily-based: Labour Count * Rate per Person
 */
export function calculateTotalAmount(workType, qty, rate, labourCount) {
  const q = Number(qty) || 0;
  const r = Number(rate) || 0;
  const count = Number(labourCount) || 1;

  if (isTonBasedWork(workType)) {
    return q * r;
  }
  return count * r;
}

/**
 * Robust total amount extractor for any entry object
 */
export function getEntryTotalAmount(entry) {
  if (!entry) return 0;
  const isTon = isTonBasedWork(entry.work);
  const qty = Number(entry.qty) || 0;
  const rate = Number(entry.rate) || 0;
  const count = Number(entry.labourCount) || (entry.labourNames ? entry.labourNames.length : 1);

  if (isTon && qty > 0 && rate > 0) {
    return qty * rate;
  }
  if (!isTon && count > 0 && rate > 0) {
    return count * rate;
  }
  return Number(entry.totalAmount) || (isTon ? qty * rate : count * rate);
}

export const DEFAULT_WORK_TYPES_LIST = [
  'Production',
  'Loading',
  'Loading Jumbo',
  'Unloading',
  'Unloading Jumbo',
  'Daily Wags',
  'Grinding',
  'Housekeeping',
  'Mechanical',
  'Crusing'
];
