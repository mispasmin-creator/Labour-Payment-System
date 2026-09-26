import { parseDate } from './dateUtils';

export const DASHBOARD_FIRM = 'Pmmpl';

function toISODate(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const isFirm = (name, firm) =>
  String(name || '').trim().toLowerCase() === String(firm).trim().toLowerCase();

function inDateRange(item, dateFrom, dateTo) {
  if (!dateFrom && !dateTo) return true;
  const parsed = parseDate(item['Date Of Production'] || item.Timestamp);
  if (!parsed) return false;
  const iso = toISODate(parsed);
  if (dateFrom && iso < dateFrom) return false;
  if (dateTo && iso > dateTo) return false;
  return true;
}

const sfKey = (v) => String(v || '').trim().toUpperCase();
const productKey = (v) => String(v || '').toUpperCase().replace(/[^A-Z0-9%]/g, '');
const firmOf = (r) => r['Firm name'] || r['Firm Name'] || '';

/**
 * Each firm runs its own SF-No series (SF-1, SF-2... exist for Pmmpl, Purab and Rkl),
 * so SF-No alone can't identify the firm. Returns a resolver that narrows the
 * semi_production candidates by SF-No, then product name, then the latest plan
 * raised on/before the production date.
 */
export function buildSemiFirmResolver(semiProductions) {
  const bySf = {};
  (semiProductions || []).forEach((r) => {
    const k = sfKey(r['SF-Sr No.']);
    if (k) (bySf[k] = bySf[k] || []).push(r);
  });

  const pickLatestBefore = (cands, item) => {
    const prodDate = parseDate(item['Date Of Production'] || item.Timestamp);
    const eligible = cands
      .map((c) => ({ c, t: parseDate(c.Timestamp) }))
      .filter(({ t }) => t && (!prodDate || toISODate(t) <= toISODate(prodDate)))
      .sort((a, b) => b.t - a.t);
    return eligible.length ? eligible[0].c : null;
  };

  return (item) => {
    if (item['Firm Name']) return item['Firm Name'];
    const cands = (bySf[sfKey(item['Semi Finished Production No.'])] || []).filter((c) => firmOf(c));
    if (cands.length === 0) return 'Pmmpl';

    const firms = new Set(cands.map(firmOf));
    if (firms.size === 1) return firmOf(cands[0]);

    const pk = productKey(item['Product Name']);
    const byProduct = cands.filter((c) => productKey(c['Name Of Semi Finished Good']) === pk);
    const productFirms = new Set(byProduct.map(firmOf));
    if (productFirms.size === 1) return firmOf(byProduct[0]);

    const pool = byProduct.length ? byProduct : cands;
    const picked = pickLatestBefore(pool, item) || pickLatestBefore(cands, item);
    return picked ? firmOf(picked) : 'Pmmpl';
  };
}

function summarize(rows, qtyKey) {
  const byProduct = {};
  let qty = 0;
  rows.forEach((r) => {
    const q = Number(r[qtyKey]) || 0;
    qty += q;
    const p = r['Product Name'] || r['Crushing Product Name'] || 'Other';
    byProduct[p] = (byProduct[p] || 0) + q;
  });
  const topProducts = Object.entries(byProduct)
    .map(([name, value]) => ({ name, qty: value }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 3);
  return { qty, count: rows.length, topProducts };
}

/**
 * Grinding = Actual Production Entry (semi_actual, excluding CR- rows),
 * Crushing = Crushing Department (crushing_actual). Both filtered to one firm and date range.
 */
export function getFirmProductionSummary({
  semiActuals,
  crushingActuals,
  semiProductions,
  firm = DASHBOARD_FIRM,
  dateFrom,
  dateTo
}) {
  const resolveFirm = buildSemiFirmResolver(semiProductions);

  const grindingRows = (semiActuals || []).filter((item) => {
    const sNo = String(item['S No.'] || '').trim().toUpperCase();
    if (sNo.startsWith('CR-')) return false;
    return isFirm(resolveFirm(item), firm) && inDateRange(item, dateFrom, dateTo);
  });

  const crushingRows = (crushingActuals || []).filter(
    (item) => isFirm(item['Firm Name'], firm) && inDateRange(item, dateFrom, dateTo)
  );

  return {
    grinding: summarize(grindingRows, 'Qty Of Semi Finished Good'),
    crushing: summarize(crushingRows, 'Qty Of Crushing Product')
  };
}
