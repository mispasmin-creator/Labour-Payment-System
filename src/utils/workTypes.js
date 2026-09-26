/**
 * Work Types & Calculation Mode Definitions
 */

export const TON_BASED_WORK_KEYWORDS = [
  'loading',
  'loading jumbo',
  'unloading',
  'unloading jumbo',
  'production',
  'grinding',
  'crushing',
  'crusing'
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
 * Total amount = Amount per person (sheet Col K) x Labour count, for every work type.
 * Qty (Tons) is recorded for ton-based work but does not drive the amount.
 */
export function calculateTotalAmount(workType, qty, rate, labourCount) {
  const r = Number(rate) || 0;
  const count = Number(labourCount) || 1;
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

  if (Number(entry.totalAmount) > 0) return Number(entry.totalAmount);
  return count * rate;
}

/**
 * Amount per person (sheet Col K): stored rate, else Total / Labour count.
 */
export function getEntryPerPersonAmount(entry) {
  if (!entry) return 0;
  const rate = Number(entry.rate) || 0;
  if (rate > 0) return rate;
  const count = Number(entry.labourCount) || (entry.labourNames ? entry.labourNames.length : 1);
  return count > 0 ? getEntryTotalAmount(entry) / count : 0;
}

export function formatEntryRate(entry) {
  const amount = getEntryPerPersonAmount(entry);
  return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}/person`;
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
