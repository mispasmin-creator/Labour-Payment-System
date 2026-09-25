import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Printer,
  Download,
  CheckCircle2,
  Users,
  User,
  Scale,
  Briefcase,
  Search,
  ReceiptText,
  Layers,
  Clock,
  Eye,
  RefreshCw,
  CheckCheck,
  Building2,
  Check,
  ListFilter,
  History
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatINR, formatDate, parseDate, formatDateTime } from '../utils/dateUtils';
import { exportToCSV } from '../utils/exportUtils';
import { getWorkTypeUnit, isTonBasedWork } from '../utils/workTypes';
import { StatusBadge } from '../components/common/StatusBadge';
import { WorkDetailModal } from './WorkDetailModal';
import {
  fetchSemiActualEntries,
  fetchCrushingActualEntries
} from '../services/supabaseClient';

export const isGrindingWork = (work) => {
  if (!work) return false;
  const s = String(work).trim().toLowerCase();
  return s === 'grinding' || s.includes('grind');
};

export const isCrushingWork = (work) => {
  if (!work) return false;
  const s = String(work).trim().toLowerCase();
  return s === 'crushing' || s === 'crusing' || s.includes('crush');
};

// Date Helpers for Week Range
function getMondayOfDate(d) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - (day === 0 ? 6 : day - 1);
  const monday = new Date(date.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function getSundayOfDate(monday) {
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return sunday;
}

function toISODate(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Verification & Payment Checkers
export const isEntryVerified = (e) => {
  if (!e) return false;
  const actual = String(e.verificationActual || '').trim();
  const hasActual = Boolean(
    actual &&
    actual !== '-' &&
    actual !== 'null' &&
    actual !== 'undefined'
  );
  const statusLower = String(e.status || '').toLowerCase();
  return hasActual || ['verified', 'approved', 'paid', 'tally'].some(s => statusLower.includes(s));
};

export const isEntryPaid = (e) => {
  if (!e) return false;
  const actual = String(e.paymentActual || '').trim();
  return Boolean(
    actual &&
    actual !== '-' &&
    actual !== 'null' &&
    actual !== 'undefined'
  );
};

export function PaymentReportPage() {
  const { entries, payEntry, syncing, refreshData, currentUser } = useApp();

  // Supabase Production Datasets for Grinding & Crushing Qty calculation
  const [semiActuals, setSemiActuals] = useState([]);
  const [crushingActuals, setCrushingActuals] = useState([]);
  const [loadingProduction, setLoadingProduction] = useState(false);

  const loadProductionData = async () => {
    try {
      setLoadingProduction(true);
      const [semi, crushing] = await Promise.all([
        fetchSemiActualEntries().catch(() => []),
        fetchCrushingActualEntries().catch(() => [])
      ]);
      setSemiActuals(semi);
      setCrushingActuals(crushing);
    } catch (err) {
      console.error('Error fetching production data for Payment Report:', err);
    } finally {
      setLoadingProduction(false);
    }
  };

  useEffect(() => {
    loadProductionData();
  }, []);

  const handleRefreshAll = () => {
    refreshData();
    loadProductionData();
  };

  // Primary Tab: 'pending' (Verification Queue waiting for mark done) vs 'report' (Payment Report)
  const [mainTab, setMainTab] = useState('pending');
  const [processingId, setProcessingId] = useState(null);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [timelineWorkId, setTimelineWorkId] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);

  // Filters for Pending Tab
  const [pendingSearch, setPendingSearch] = useState('');
  const [pendingFirm, setPendingFirm] = useState('');
  const [pendingIncharge, setPendingIncharge] = useState('');

  // Default to Current Week (Monday to Sunday) for Report
  const initialMonday = useMemo(() => getMondayOfDate(new Date()), []);
  const initialSunday = useMemo(() => getSundayOfDate(initialMonday), [initialMonday]);

  const [dateFrom, setDateFrom] = useState(toISODate(initialMonday));
  const [dateTo, setDateTo] = useState(toISODate(initialSunday));
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPreset, setSelectedPreset] = useState('This Week');
  const [activeReportTab, setActiveReportTab] = useState('all'); // 'all' | 'work_type' | 'labour_wise' | 'date_wise'

  // Navigate Weeks (Previous / Next)
  const handleShiftWeek = (offsetWeeks) => {
    const currentFrom = parseDate(dateFrom) || new Date();
    const newFrom = new Date(currentFrom);
    newFrom.setDate(newFrom.getDate() + (offsetWeeks * 7));
    const monday = getMondayOfDate(newFrom);
    const sunday = getSundayOfDate(monday);

    setDateFrom(toISODate(monday));
    setDateTo(toISODate(sunday));
    setSelectedPreset('');
  };

  const handleSetPreset = (preset) => {
    setSelectedPreset(preset);
    const now = new Date();

    if (preset === 'This Week') {
      const mon = getMondayOfDate(now);
      const sun = getSundayOfDate(mon);
      setDateFrom(toISODate(mon));
      setDateTo(toISODate(sun));
    } else if (preset === 'Last Week') {
      const lastMon = new Date(now);
      lastMon.setDate(now.getDate() - 7);
      const mon = getMondayOfDate(lastMon);
      const sun = getSundayOfDate(mon);
      setDateFrom(toISODate(mon));
      setDateTo(toISODate(sun));
    } else if (preset === 'This Month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setDateFrom(toISODate(start));
      setDateTo(toISODate(end));
    } else if (preset === 'All Time') {
      setDateFrom('');
      setDateTo('');
    }
  };

  // 1. Pending Verification Data (Waiting for Payment Mark Done)
  const pendingPaymentEntries = useMemo(() => {
    return (entries || []).filter(e => isEntryVerified(e) && !isEntryPaid(e));
  }, [entries]);

  // 2. Completed / Marked Done Payments
  const completedPaymentEntries = useMemo(() => {
    return (entries || []).filter(e => isEntryVerified(e) && isEntryPaid(e));
  }, [entries]);

  // Total amounts for header stats
  const totalPendingAllAmount = useMemo(() => {
    return pendingPaymentEntries.reduce((sum, e) => sum + (Number(e.totalAmount) || 0), 0);
  }, [pendingPaymentEntries]);

  const totalCompletedAllAmount = useMemo(() => {
    return completedPaymentEntries.reduce((sum, e) => sum + (Number(e.totalAmount) || 0), 0);
  }, [completedPaymentEntries]);

  // Unique filters for Pending
  const uniquePendingFirms = useMemo(() => {
    return Array.from(new Set(pendingPaymentEntries.map(e => e.firmName).filter(Boolean)));
  }, [pendingPaymentEntries]);

  const uniquePendingIncharges = useMemo(() => {
    return Array.from(new Set(pendingPaymentEntries.map(e => e.incharge).filter(Boolean)));
  }, [pendingPaymentEntries]);

  // Filtered Pending Entries
  const filteredPendingEntries = useMemo(() => {
    return pendingPaymentEntries.filter(item => {
      const q = (pendingSearch || '').toLowerCase();
      const matchesSearch = !q ||
        (item.workId || '').toLowerCase().includes(q) ||
        (item.work || '').toLowerCase().includes(q) ||
        (item.incharge || '').toLowerCase().includes(q) ||
        (item.firmName || '').toLowerCase().includes(q) ||
        (Array.isArray(item.labourNames)
          ? item.labourNames.some(n => String(n).toLowerCase().includes(q))
          : String(item.labourNames || '').toLowerCase().includes(q));

      const matchesFirm = !pendingFirm || item.firmName === pendingFirm;
      const matchesIncharge = !pendingIncharge || item.incharge === pendingIncharge;

      return matchesSearch && matchesFirm && matchesIncharge;
    });
  }, [pendingPaymentEntries, pendingSearch, pendingFirm, pendingIncharge]);

  const pendingTotalAmount = useMemo(() => {
    return filteredPendingEntries.reduce((sum, e) => sum + (Number(e.totalAmount) || 0), 0);
  }, [filteredPendingEntries]);

  const pendingTotalLabour = useMemo(() => {
    return filteredPendingEntries.reduce((sum, e) => sum + (Number(e.labourCount) || 1), 0);
  }, [filteredPendingEntries]);

  // Checkbox Selection Helpers
  const toggleSelect = (workId) => {
    setSelectedIds(prev =>
      prev.includes(workId) ? prev.filter(id => id !== workId) : [...prev, workId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredPendingEntries.length && filteredPendingEntries.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredPendingEntries.map(e => e.workId));
    }
  };

  // Mark Done Action for Single Item
  const handleMarkDone = async (workId) => {
    if (!workId) return;
    setProcessingId(workId);
    try {
      await payEntry(workId, 'Direct Payment', '');
      setSelectedIds(prev => prev.filter(id => id !== workId));
    } finally {
      setProcessingId(null);
    }
  };

  // Bulk / Selected Mark Done Action
  const handleBatchMarkDone = async () => {
    if (selectedIds.length === 0) return;
    const ok = window.confirm(
      `Kya aap selected ${selectedIds.length} entries ko 'Payment Done' mark karna chahte hain?\n\nYe turant Payment Report me add ho jayengi.`
    );
    if (!ok) return;

    setIsBulkProcessing(true);
    try {
      for (const id of selectedIds) {
        await payEntry(id, 'Direct Payment', '');
      }
      setSelectedIds([]);
    } finally {
      setIsBulkProcessing(false);
    }
  };

  // Bulk Mark All Done Action (all filtered items)
  const handleMarkAllDone = async () => {
    if (filteredPendingEntries.length === 0) return;
    const ok = window.confirm(
      `Kya aap sabhi ${filteredPendingEntries.length} verified entries ko 'Payment Done' mark karna chahte hain?\n\nYe turant Payment Report me add ho jayengi.`
    );
    if (!ok) return;

    setIsBulkProcessing(true);
    try {
      for (const item of filteredPendingEntries) {
        await payEntry(item.workId, 'Direct Payment', '');
      }
      setSelectedIds([]);
    } finally {
      setIsBulkProcessing(false);
    }
  };

  // Filtered Completed Entries for Payment Report (Week Range and Search)
  const verifiedEntries = useMemo(() => {
    return completedPaymentEntries.filter(entry => {
      // Date Range Filter
      if (dateFrom || dateTo) {
        const entryDateStr = entry.date;
        if (dateFrom && entryDateStr < dateFrom) return false;
        if (dateTo && entryDateStr > dateTo) return false;
      }

      // Search Filter
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const matchesWork = (entry.work || '').toLowerCase().includes(q);
        const matchesIncharge = (entry.incharge || '').toLowerCase().includes(q);
        const matchesWorkId = (entry.workId || '').toLowerCase().includes(q);
        const matchesLabour = Array.isArray(entry.labourNames)
          ? entry.labourNames.some(n => String(n).toLowerCase().includes(q))
          : String(entry.labourNames || '').toLowerCase().includes(q);
        if (!matchesWork && !matchesIncharge && !matchesWorkId && !matchesLabour) {
          return false;
        }
      }

      return true;
    });
  }, [completedPaymentEntries, dateFrom, dateTo, searchTerm]);

  // Filter Production Grinding (Actual Production Entry - Test History) by Date Range
  const productionGrindingQty = useMemo(() => {
    const filtered = semiActuals.filter((item) => {
      const sNo = String(item['S No.'] || '').trim().toUpperCase();
      if (sNo.startsWith('CR-')) return false;

      const recordDate = item['Date Of Production'] || item.Timestamp;
      if (dateFrom || dateTo) {
        if (!recordDate) return false;
        const parsed = parseDate(recordDate);
        if (!parsed) return false;
        const iso = toISODate(parsed);
        if (dateFrom && iso < dateFrom) return false;
        if (dateTo && iso > dateTo) return false;
      }
      return true;
    });

    return filtered.reduce((sum, item) => {
      return sum + (Number(item['Qty Of Semi Finished Good']) || 0);
    }, 0);
  }, [semiActuals, dateFrom, dateTo]);

  // Filter Production Crushing (Crushing Department) by Date Range
  const productionCrushingQty = useMemo(() => {
    const filtered = crushingActuals.filter((item) => {
      const recordDate = item['Date Of Production'] || item.Timestamp;
      if (dateFrom || dateTo) {
        if (!recordDate) return false;
        const parsed = parseDate(recordDate);
        if (!parsed) return false;
        const iso = toISODate(parsed);
        if (dateFrom && iso < dateFrom) return false;
        if (dateTo && iso > dateTo) return false;
      }
      return true;
    });

    return filtered.reduce((sum, item) => {
      return sum + (Number(item['Qty Of Crushing Product']) || 0);
    }, 0);
  }, [crushingActuals, dateFrom, dateTo]);

  // 1. Table 1: Work Type Aggregated Report
  const workTypeReport = useMemo(() => {
    const map = {};

    // First pass: aggregate verified labour entries
    verifiedEntries.forEach((entry) => {
      const workType = (entry.work || 'General Work').trim();
      if (!map[workType]) {
        map[workType] = {
          workType,
          totalQty: 0,
          totalAmount: 0,
          count: 0,
          unit: getWorkTypeUnit(workType),
          isProductionLinked: isGrindingWork(workType) || isCrushingWork(workType),
          sourceLabel: isGrindingWork(workType)
            ? 'Production (Actual Entry)'
            : isCrushingWork(workType)
            ? 'Production (Crushing Dept)'
            : 'Labour Entry'
        };
      }

      const amount = Number(entry.totalAmount) || 0;
      map[workType].totalAmount += amount;
      map[workType].count += 1;

      // For all works OTHER than Grinding & Crushing, sum labour qty as normal
      if (!isGrindingWork(workType) && !isCrushingWork(workType)) {
        const qty = Number(entry.qty) || Number(entry.qtyMade) || 0;
        map[workType].totalQty += qty;
      }
    });

    // Assign Production Grinding Qty to Grinding work type
    let foundGrinding = false;
    Object.keys(map).forEach((key) => {
      if (isGrindingWork(key)) {
        foundGrinding = true;
        map[key].totalQty = productionGrindingQty;
        map[key].unit = 'Tons';
        map[key].isProductionLinked = true;
        map[key].sourceLabel = 'Production (Actual Entry)';
      }
    });

    // If Grinding has production qty in date range but no labour entries, show it
    if (!foundGrinding && productionGrindingQty > 0) {
      map['Grinding'] = {
        workType: 'Grinding',
        totalQty: productionGrindingQty,
        totalAmount: 0,
        count: 0,
        unit: 'Tons',
        isProductionLinked: true,
        sourceLabel: 'Production (Actual Entry)'
      };
    }

    // Assign Production Crushing Qty to Crushing work type
    let foundCrushing = false;
    Object.keys(map).forEach((key) => {
      if (isCrushingWork(key)) {
        foundCrushing = true;
        map[key].totalQty = productionCrushingQty;
        map[key].unit = 'Tons';
        map[key].isProductionLinked = true;
        map[key].sourceLabel = 'Production (Crushing Dept)';
      }
    });

    // If Crushing has production qty in date range but no labour entries, show it
    if (!foundCrushing && productionCrushingQty > 0) {
      map['Crushing'] = {
        workType: 'Crushing',
        totalQty: productionCrushingQty,
        totalAmount: 0,
        count: 0,
        unit: 'Tons',
        isProductionLinked: true,
        sourceLabel: 'Production (Crushing Dept)'
      };
    }

    return Object.values(map).sort((a, b) => b.totalAmount - a.totalAmount || b.totalQty - a.totalQty);
  }, [verifiedEntries, productionGrindingQty, productionCrushingQty]);

  // Work Type Totals
  const workTypeTotals = useMemo(() => {
    return workTypeReport.reduce(
      (acc, curr) => {
        acc.totalQty += curr.totalQty;
        acc.totalAmount += curr.totalAmount;
        return acc;
      },
      { totalQty: 0, totalAmount: 0 }
    );
  }, [workTypeReport]);

  // 2. Table 2: Labour Wise Report
  const labourWiseReport = useMemo(() => {
    const map = {};

    verifiedEntries.forEach(entry => {
      let names = [];
      if (Array.isArray(entry.labourNames)) {
        names = entry.labourNames.map(n => (n ? String(n).trim() : '')).filter(Boolean);
      } else if (typeof entry.labourNames === 'string' && entry.labourNames.trim()) {
        names = entry.labourNames.split(/[,;\n]+/).map(s => s.trim()).filter(Boolean);
      }

      if (names.length === 0) {
        Object.keys(entry).forEach(k => {
          const lower = k.toLowerCase();
          if (lower.startsWith('labour') && lower !== 'labourcount' && lower !== 'labournames') {
            if (entry[k] && typeof entry[k] === 'string' && entry[k].trim()) {
              names.push(entry[k].trim());
            }
          }
        });
      }

      const count = Number(entry.labourCount) || (names.length > 0 ? names.length : 1);
      const days = entry.days !== undefined && !isNaN(Number(entry.days)) ? Number(entry.days) : 1;
      const totalAmt = Number(entry.totalAmount) || 0;
      const perLabourAmount = count > 0 ? (totalAmt / count) : totalAmt;

      if (names.length === 0) {
        const defaultName = `Labourer (Count ${count})`;
        if (!map[defaultName]) {
          map[defaultName] = {
            labourName: defaultName,
            dayOfWork: 0,
            totalAmount: 0
          };
        }
        map[defaultName].dayOfWork += days;
        map[defaultName].totalAmount += totalAmt;
      } else {
        names.forEach(name => {
          if (!map[name]) {
            map[name] = {
              labourName: name,
              dayOfWork: 0,
              totalAmount: 0
            };
          }
          map[name].dayOfWork += days;
          map[name].totalAmount += perLabourAmount;
        });
      }
    });

    return Object.values(map).sort((a, b) => b.totalAmount - a.totalAmount || a.labourName.localeCompare(b.labourName));
  }, [verifiedEntries]);

  // Labour Wise Totals
  const labourTotals = useMemo(() => {
    return labourWiseReport.reduce(
      (acc, curr) => {
        acc.totalDays += curr.dayOfWork;
        acc.totalAmount += curr.totalAmount;
        return acc;
      },
      { totalDays: 0, totalAmount: 0 }
    );
  }, [labourWiseReport]);

  // 3. Table 3: Date Wise Report
  const dateWiseReport = useMemo(() => {
    const map = {};

    verifiedEntries.forEach(entry => {
      const dateKey = entry.date;
      if (!dateKey) return;

      if (!map[dateKey]) {
        map[dateKey] = {
          date: dateKey,
          workOrders: 0,
          totalLabour: 0,
          totalAmount: 0
        };
      }

      map[dateKey].workOrders += 1;
      map[dateKey].totalLabour += Number(entry.labourCount) || 0;
      map[dateKey].totalAmount += Number(entry.totalAmount) || 0;
    });

    return Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
  }, [verifiedEntries]);

  // Date Wise Totals
  const dateWiseTotals = useMemo(() => {
    return dateWiseReport.reduce(
      (acc, curr) => {
        acc.workOrders += curr.workOrders;
        acc.totalLabour += curr.totalLabour;
        acc.totalAmount += curr.totalAmount;
        return acc;
      },
      { workOrders: 0, totalLabour: 0, totalAmount: 0 }
    );
  }, [dateWiseReport]);

  // Formatted Date Period
  const formattedPeriod = useMemo(() => {
    if (!dateFrom && !dateTo) return 'All Records';
    if (dateFrom && dateTo) {
      return `${formatDate(dateFrom)} – ${formatDate(dateTo)}`;
    }
    return dateFrom ? `From ${formatDate(dateFrom)}` : `Up to ${formatDate(dateTo)}`;
  }, [dateFrom, dateTo]);

  // Print Handler
  const handlePrint = () => {
    window.print();
  };

  // CSV Export
  const handleExportCSV = () => {
    const formattedDateRange = `${dateFrom || 'Start'}_to_${dateTo || 'End'}`;

    if (activeReportTab === 'work_type' || activeReportTab === 'all') {
      const workTypeRows = workTypeReport.map((w, idx) => ({
        'Sr. No.': idx + 1,
        'Work Type': w.workType,
        'Total Qty': w.totalQty,
        'Unit': w.unit,
        'Total Amount': Math.round(w.totalAmount)
      }));
      workTypeRows.push({
        'Sr. No.': 'TOTAL',
        'Work Type': 'Grand Total',
        'Total Qty': workTypeTotals.totalQty,
        'Unit': '',
        'Total Amount': Math.round(workTypeTotals.totalAmount)
      });
      exportToCSV(`Work_Type_Payment_Report_${formattedDateRange}`, workTypeRows);
    }

    if (activeReportTab === 'labour_wise' || activeReportTab === 'all') {
      setTimeout(() => {
        const labourRows = labourWiseReport.map((l, idx) => ({
          'Sr. No.': idx + 1,
          'Labour Name': l.labourName,
          'Day Of Work': l.dayOfWork,
          'Total Amount': Math.round(l.totalAmount)
        }));
        labourRows.push({
          'Sr. No.': 'TOTAL',
          'Labour Name': `Total Labourers: ${labourWiseReport.length}`,
          'Day Of Work': labourTotals.totalDays,
          'Total Amount': Math.round(labourTotals.totalAmount)
        });
        exportToCSV(`Labour_Wise_Payment_Report_${formattedDateRange}`, labourRows);
      }, activeReportTab === 'all' ? 400 : 0);
    }

    if (activeReportTab === 'date_wise' || activeReportTab === 'all') {
      setTimeout(() => {
        const dateRows = dateWiseReport.map((d, idx) => ({
          'Sr. No.': idx + 1,
          'Date': formatDate(d.date),
          'Work Orders': d.workOrders,
          'Labourers': d.totalLabour,
          'Total Amount': Math.round(d.totalAmount)
        }));
        dateRows.push({
          'Sr. No.': 'TOTAL',
          'Date': 'Grand Total',
          'Work Orders': dateWiseTotals.workOrders,
          'Labourers': dateWiseTotals.totalLabour,
          'Total Amount': Math.round(dateWiseTotals.totalAmount)
        });
        exportToCSV(`Date_Wise_Payment_Report_${formattedDateRange}`, dateRows);
      }, activeReportTab === 'all' ? 800 : 0);
    }
  };

  const showWorkType = activeReportTab === 'all' || activeReportTab === 'work_type';
  const showLabourWise = activeReportTab === 'all' || activeReportTab === 'labour_wise';
  const showDateWise = activeReportTab === 'all' || activeReportTab === 'date_wise';

  return (
    <div className="payment-report-container h-full flex flex-col bg-slate-50">
      <div className="flex-1 overflow-y-auto">
        <div className="w-full max-w-[1440px] mx-auto px-4 pb-10 space-y-4">
          {/* ============================================================
              HEADER (Matching Verification & Payment Pages Theme)
              ============================================================ */}
          <div className="no-print space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <ReceiptText className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-slate-800">Payment Report</h1>
                  <p className="text-xs text-slate-500">
                    {mainTab === 'pending'
                      ? `${pendingPaymentEntries.length} verified order${pendingPaymentEntries.length === 1 ? '' : 's'} pending payment`
                      : `${completedPaymentEntries.length} verified &amp; paid record${completedPaymentEntries.length === 1 ? '' : 's'} (${formattedPeriod})`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <button
                  type="button"
                  onClick={handleRefreshAll}
                  className="bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg text-xs font-semibold px-3.5 py-2.5 inline-flex items-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                  title="Sync latest data from Google Sheet & Production Supabase"
                  disabled={syncing || loadingProduction}
                >
                  <RefreshCw size={15} className={syncing || loadingProduction ? 'animate-spin' : ''} />
                  <span>{syncing || loadingProduction ? 'Syncing...' : 'Sync Sheet & Prod'}</span>
                </button>

                <div className="bg-white rounded-xl border border-slate-200 shadow-2xs px-4 py-2 text-right">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Pending Payment</div>
                  <div className="text-lg font-extrabold text-amber-600 leading-tight">
                    ₹{totalPendingAllAmount.toLocaleString('en-IN')}{' '}
                    <span className="text-xs font-medium text-slate-500">({pendingPaymentEntries.length})</span>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 shadow-2xs px-4 py-2 text-right">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Completed Report</div>
                  <div className="text-lg font-extrabold text-emerald-600 leading-tight">
                    ₹{totalCompletedAllAmount.toLocaleString('en-IN')}{' '}
                    <span className="text-xs font-medium text-slate-500">({completedPaymentEntries.length})</span>
                  </div>
                </div>

                {mainTab === 'report' && (
                  <div className="bg-white rounded-xl border border-slate-200 shadow-2xs px-4 py-2 text-right">
                    <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Quantity</div>
                    <div className="text-lg font-extrabold text-indigo-600 leading-tight">
                      {workTypeTotals.totalQty > 0
                        ? Number(workTypeTotals.totalQty.toFixed(3)).toLocaleString('en-IN')
                        : '0'}{' '}
                      <span className="text-xs font-medium text-slate-500">Tons</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ============================================================
                PRIMARY TABS (Matching Verification / Payment Pages)
                ============================================================ */}
            <div className="flex items-center gap-2 border-b border-slate-200 pb-3 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setMainTab('pending');
                  setSelectedIds([]);
                }}
                className={`inline-flex items-center gap-1.5 rounded-lg text-xs font-semibold px-3.5 py-2 transition-colors ${
                  mainTab === 'pending'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <ListFilter size={15} />
                <span>Pending Verification Queue ({pendingPaymentEntries.length})</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMainTab('report');
                  setSelectedIds([]);
                }}
                className={`inline-flex items-center gap-1.5 rounded-lg text-xs font-semibold px-3.5 py-2 transition-colors ${
                  mainTab === 'report'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <History size={15} />
                <span>Payment Report ({completedPaymentEntries.length})</span>
              </button>
            </div>

            {/* ============================================================
                PENDING TAB CONTENT (Verification History waiting for Mark Done)
                ============================================================ */}
            {mainTab === 'pending' && (
              <div className="space-y-4">
                {/* Pending Filter Toolbar */}
                <div className="bg-white rounded-xl border border-slate-200 p-3.5 flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-2xs">
                  <div className="relative flex-1 min-w-[240px] max-w-md">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white transition-all"
                      placeholder="Search pending entries by Work ID, Supervisor, Firm, Labour..."
                      value={pendingSearch}
                      onChange={e => setPendingSearch(e.target.value)}
                    />
                  </div>

                  <div className="flex items-center gap-3 flex-wrap">
                    <select
                      className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all min-w-[140px]"
                      value={pendingFirm}
                      onChange={e => setPendingFirm(e.target.value)}
                    >
                      <option value="">All Firms</option>
                      {uniquePendingFirms.map(f => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>

                    <select
                      className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all min-w-[160px]"
                      value={pendingIncharge}
                      onChange={e => setPendingIncharge(e.target.value)}
                    >
                      <option value="">All Supervisors</option>
                      {uniquePendingIncharges.map(inc => (
                        <option key={inc} value={inc}>{inc}</option>
                      ))}
                    </select>

                    {/* Batch Mark Done Action Button */}
                    {selectedIds.length > 0 && (
                      <button
                        type="button"
                        onClick={handleBatchMarkDone}
                        disabled={isBulkProcessing}
                        className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg shadow-sm px-4 py-2 transition-colors disabled:opacity-60 cursor-pointer"
                      >
                        {isBulkProcessing ? (
                          <>
                            <RefreshCw size={14} className="animate-spin" />
                            <span>Marking Done ({selectedIds.length})...</span>
                          </>
                        ) : (
                          <>
                            <CheckCheck size={15} />
                            <span>Mark Done Selected ({selectedIds.length})</span>
                          </>
                        )}
                      </button>
                    )}

                    {/* Select All Toggle Button */}
                    {selectedIds.length === 0 && filteredPendingEntries.length > 0 && (
                      <button
                        type="button"
                        onClick={toggleSelectAll}
                        className="inline-flex items-center gap-1.5 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold text-xs rounded-lg px-3.5 py-2 transition-colors cursor-pointer"
                      >
                        <CheckCheck size={14} />
                        <span>Select All ({filteredPendingEntries.length})</span>
                      </button>
                    )}

                    {(pendingSearch || pendingFirm || pendingIncharge) && (
                      <button
                        type="button"
                        onClick={() => {
                          setPendingSearch('');
                          setPendingFirm('');
                          setPendingIncharge('');
                        }}
                        className="text-xs text-rose-600 hover:text-rose-800 font-semibold px-2 py-1"
                      >
                        Reset Filters
                      </button>
                    )}
                  </div>
                </div>

                {/* Pending Table */}
                {filteredPendingEntries.length === 0 ? (
                  <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-12 text-center flex flex-col items-center justify-center">
                    <div className="w-16 h-16 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
                      <CheckCircle2 size={32} />
                    </div>
                    <h3 className="text-base font-bold text-slate-800 mb-1">
                      {pendingPaymentEntries.length === 0
                        ? 'No Entries Pending Payment'
                        : 'No Pending Entries Match Filter'}
                    </h3>
                    <p className="text-sm text-slate-500 max-w-sm mb-4">
                      {pendingPaymentEntries.length === 0
                        ? 'All verified entries have been marked as done and moved to the Payment Report.'
                        : 'Please clear or adjust your search filter.'}
                    </p>
                    {pendingPaymentEntries.length === 0 && (
                      <button
                        type="button"
                        onClick={() => setMainTab('report')}
                        className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-4 py-2.5 rounded-lg shadow-sm transition-colors cursor-pointer"
                      >
                        <History size={15} />
                        <span>View Payment Report ({completedPaymentEntries.length})</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col">
                    <div className="overflow-x-auto max-h-[640px] overflow-y-auto">
                      <table className="w-full border-collapse text-left">
                        <thead className="sticky top-0 bg-slate-100 z-20 shadow-xs border-b border-slate-300">
                          <tr>
                            {/* Checkbox Column Header */}
                            <th className="px-3 py-2.5 w-10 text-center sticky left-0 bg-slate-100 z-30 border-r border-slate-200">
                              <div className="flex items-center justify-center">
                                <input
                                  type="checkbox"
                                  className="w-4 h-4 rounded text-indigo-600 accent-indigo-600 cursor-pointer"
                                  checked={selectedIds.length === filteredPendingEntries.length && filteredPendingEntries.length > 0}
                                  onChange={toggleSelectAll}
                                  title={selectedIds.length === filteredPendingEntries.length ? 'Deselect All' : 'Select All'}
                                />
                              </div>
                            </th>
                            <th className="px-3 py-2.5 text-center font-semibold text-slate-700 uppercase tracking-wider text-[11px] whitespace-nowrap w-12">
                              S.No.
                            </th>
                            <th className="px-3.5 py-2.5 text-left font-semibold text-slate-700 uppercase tracking-wider text-[11px] whitespace-nowrap">
                              Action
                            </th>
                            <th className="px-3.5 py-2.5 text-left font-semibold text-slate-700 uppercase tracking-wider text-[11px] whitespace-nowrap">
                              Work ID
                            </th>
                            <th className="px-3.5 py-2.5 text-left font-semibold text-slate-700 uppercase tracking-wider text-[11px] whitespace-nowrap">
                              Planned Date
                            </th>
                            <th className="px-3.5 py-2.5 text-left font-semibold text-slate-700 uppercase tracking-wider text-[11px] whitespace-nowrap">
                              Date
                            </th>
                            <th className="px-3.5 py-2.5 text-left font-semibold text-slate-700 uppercase tracking-wider text-[11px] whitespace-nowrap">
                              Shift
                            </th>
                            <th className="px-3.5 py-2.5 text-left font-semibold text-slate-700 uppercase tracking-wider text-[11px] whitespace-nowrap">
                              Firm
                            </th>
                            <th className="px-3.5 py-2.5 text-left font-semibold text-slate-700 uppercase tracking-wider text-[11px] whitespace-nowrap">
                              Supervisor
                            </th>
                            <th className="px-3.5 py-2.5 text-left font-semibold text-slate-700 uppercase tracking-wider text-[11px] whitespace-nowrap">
                              Work Activity
                            </th>
                            <th className="px-3.5 py-2.5 text-right font-semibold text-slate-700 uppercase tracking-wider text-[11px] whitespace-nowrap">
                              Work Hours
                            </th>
                            <th className="px-3.5 py-2.5 text-right font-semibold text-slate-700 uppercase tracking-wider text-[11px] whitespace-nowrap">
                              Qty / Output
                            </th>
                            <th className="px-3.5 py-2.5 text-right font-semibold text-slate-700 uppercase tracking-wider text-[11px] whitespace-nowrap">
                              Labourers
                            </th>
                            <th className="px-3.5 py-2.5 text-right font-semibold text-slate-700 uppercase tracking-wider text-[11px] whitespace-nowrap">
                              Per Person Amount
                            </th>
                            <th className="px-3.5 py-2.5 text-right font-semibold text-slate-700 uppercase tracking-wider text-[11px] whitespace-nowrap">
                              Total Amount
                            </th>
                            <th className="px-3.5 py-2.5 text-left font-semibold text-slate-700 uppercase tracking-wider text-[11px] whitespace-nowrap">
                              Work Remark
                            </th>
                            <th className="px-3.5 py-2.5 text-left font-semibold text-slate-700 uppercase tracking-wider text-[11px] whitespace-nowrap">
                              Current Status
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredPendingEntries.map((entry, idx) => {
                            const count = Number(entry.labourCount) || 1;
                            const total = Number(entry.totalAmount) || 0;
                            const perPerson = count > 0 ? total / count : 0;
                            const isTon = isTonBasedWork(entry.work);
                            const isSelected = selectedIds.includes(entry.workId);

                            let labourNames = [];
                            if (Array.isArray(entry.labourNames)) {
                              labourNames = entry.labourNames.filter(Boolean);
                            } else if (typeof entry.labourNames === 'string' && entry.labourNames.trim()) {
                              labourNames = entry.labourNames.split(/[,;\n]+/).map(s => s.trim()).filter(Boolean);
                            }

                            return (
                              <tr
                                key={entry.workId || `pending_${idx}`}
                                className={`${isSelected ? 'bg-indigo-50/70' : 'hover:bg-slate-50/80'} transition-colors`}
                              >
                                {/* Checkbox Column */}
                                <td className="px-3 py-2.5 text-center sticky left-0 bg-white z-10 border-r border-slate-200">
                                  <div className="flex items-center justify-center">
                                    <input
                                      type="checkbox"
                                      className="w-4 h-4 rounded text-indigo-600 accent-indigo-600 cursor-pointer"
                                      checked={isSelected}
                                      onChange={() => toggleSelect(entry.workId)}
                                    />
                                  </div>
                                </td>

                                <td className="px-3 py-2.5 text-center text-xs font-semibold text-slate-500">
                                  {idx + 1}
                                </td>

                                <td className="px-3.5 py-2.5 whitespace-nowrap">
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => handleMarkDone(entry.workId)}
                                      disabled={processingId === entry.workId || isBulkProcessing}
                                      className="inline-flex items-center gap-1 px-3 py-1.5 text-[11px] font-semibold rounded-lg shadow-sm hover:shadow-md transition-all bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 cursor-pointer whitespace-nowrap"
                                      title="Mark Done &amp; Add to Payment Report"
                                    >
                                      {processingId === entry.workId ? (
                                        <RefreshCw size={13} className="animate-spin" />
                                      ) : (
                                        <CheckCircle2 size={13} />
                                      )}
                                      <span>Mark Done</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setTimelineWorkId(entry.workId)}
                                      className="bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg text-xs font-semibold p-1.5 inline-flex items-center cursor-pointer transition-colors"
                                      title="View Details"
                                    >
                                      <Eye size={13} />
                                    </button>
                                  </div>
                                </td>

                                <td className="px-3.5 py-2.5 whitespace-nowrap">
                                  <button
                                    type="button"
                                    onClick={() => setTimelineWorkId(entry.workId)}
                                    className="font-mono font-bold text-indigo-600 hover:underline text-xs"
                                  >
                                    {entry.workId}
                                  </button>
                                </td>

                                <td className="px-3.5 py-2.5 whitespace-nowrap">
                                  <div className="font-semibold text-slate-800 text-xs">{formatDate(entry.paymentPlanned)}</div>
                                </td>

                                <td className="px-3.5 py-2.5 whitespace-nowrap">
                                  <div className="font-semibold text-slate-800 text-xs">{formatDate(entry.date)}</div>
                                </td>

                                <td className="px-3.5 py-2.5 whitespace-nowrap">
                                  <span className="text-xs text-slate-600 font-medium">{entry.shift || '-'}</span>
                                </td>

                                <td className="px-3.5 py-2.5 whitespace-nowrap">
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700">
                                    {entry.firmName || '-'}
                                  </span>
                                </td>

                                <td className="px-3.5 py-2.5 whitespace-nowrap">
                                  <div className="text-xs text-slate-600 font-medium">{entry.incharge}</div>
                                </td>

                                <td className="px-3.5 py-2.5">
                                  <div className="max-w-[200px]">
                                    <div className="font-bold text-slate-800 text-xs">{entry.work}</div>
                                    <div
                                      className={`inline-flex items-center gap-1 text-[11px] font-bold mt-0.5 ${
                                        isTon ? 'text-emerald-600' : 'text-indigo-600'
                                      }`}
                                    >
                                      {isTon ? <Scale size={11} /> : <User size={11} />}
                                      <span>{isTon ? 'Per Ton' : 'Per Person'}</span>
                                    </div>
                                  </div>
                                </td>

                                <td className="px-3.5 py-2.5 text-right whitespace-nowrap">
                                  <div className="font-semibold text-slate-700 text-xs">
                                    {entry.hours ? `${entry.hours} hrs` : '-'}
                                  </div>
                                </td>

                                <td className="px-3.5 py-2.5 text-right whitespace-nowrap">
                                  <div className="font-bold text-slate-800 text-xs">
                                    {entry.qty !== undefined && entry.qty !== '' ? `${entry.qty} ${isTon ? 'MT' : 'units'}` : '-'}
                                  </div>
                                </td>

                                <td className="px-3.5 py-2.5 text-right whitespace-nowrap">
                                  <div className="flex items-center justify-end gap-1.5 font-bold text-xs text-slate-800">
                                    <Users size={14} className="text-emerald-600" />
                                    <span>{entry.labourCount}</span>
                                  </div>
                                  {labourNames.length > 0 && (
                                    <div
                                      className="text-[10px] text-slate-500 truncate max-w-[130px] text-right"
                                      title={labourNames.join(', ')}
                                    >
                                      {labourNames.slice(0, 2).join(', ')}
                                      {labourNames.length > 2 ? ` +${labourNames.length - 2}` : ''}
                                    </div>
                                  )}
                                </td>

                                <td className="px-3.5 py-2.5 text-right whitespace-nowrap">
                                  <div className="font-bold text-emerald-600 text-xs">
                                    ₹{perPerson.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                                  </div>
                                </td>

                                <td className="px-3.5 py-2.5 text-right whitespace-nowrap">
                                  <div className="font-extrabold text-slate-800 text-sm">
                                    ₹{total.toLocaleString('en-IN')}
                                  </div>
                                </td>

                                <td className="px-3.5 py-2.5">
                                  <div
                                    className="max-w-[150px] truncate text-xs text-slate-600"
                                    title={entry.workRemark || '-'}
                                  >
                                    {entry.workRemark || '-'}
                                  </div>
                                </td>

                                <td className="px-3.5 py-2.5 whitespace-nowrap">
                                  <StatusBadge status="Verified" />
                                  {entry.verificationActual && (
                                    <div className="text-[10px] text-slate-400 mt-0.5">
                                      {formatDate(entry.verificationActual)}
                                    </div>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot className="sticky bottom-0 bg-slate-100 z-20 border-t-2 border-slate-300 font-bold text-xs">
                          <tr>
                            <td colSpan={2} className="px-3.5 py-2.5 text-center text-slate-500">
                              Total
                            </td>
                            <td colSpan={9} className="px-3.5 py-2.5 text-slate-800">
                              {selectedIds.length > 0
                                ? `${selectedIds.length} of ${filteredPendingEntries.length} Records Selected`
                                : `${filteredPendingEntries.length} Pending Records`}
                            </td>
                            <td className="px-3.5 py-2.5 text-right text-slate-800">
                              {pendingTotalLabour}
                            </td>
                            <td></td>
                            <td className="px-3.5 py-2.5 text-right font-extrabold text-emerald-700 text-sm">
                              ₹{pendingTotalAmount.toLocaleString('en-IN')}
                            </td>
                            <td colSpan={2}></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ============================================================
                REPORT TAB TOOLBAR & PRESETS (Active only in Report Mode)
                ============================================================ */}
            {mainTab === 'report' && (
              <>
                <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
                  {/* Week Presets & Navigation */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden">
                      <button
                        type="button"
                        onClick={() => handleShiftWeek(-1)}
                        title="Previous Week"
                        className="bg-slate-50 hover:bg-slate-100 border-r border-slate-200 px-2.5 py-1.5 text-slate-500 flex items-center transition-colors"
                      >
                        <ChevronLeft size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleShiftWeek(1)}
                        title="Next Week"
                        className="bg-slate-50 hover:bg-slate-100 px-2.5 py-1.5 text-slate-500 flex items-center transition-colors"
                      >
                        <ChevronRight size={15} />
                      </button>
                    </div>

                    {['This Week', 'Last Week', 'This Month', 'All Time'].map(preset => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => handleSetPreset(preset)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                          selectedPreset === preset
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>

                  {/* Date Pickers & Quick Search */}
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <div className="flex items-center gap-1.5 text-xs text-slate-600 whitespace-nowrap">
                      <span className="font-semibold">From:</span>
                      <input
                        type="date"
                        value={dateFrom}
                        onChange={e => {
                          setDateFrom(e.target.value);
                          setSelectedPreset('');
                        }}
                        className="px-2 py-1.5 rounded-lg border border-slate-200 text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                      <span className="font-semibold">To:</span>
                      <input
                        type="date"
                        value={dateTo}
                        onChange={e => {
                          setDateTo(e.target.value);
                          setSelectedPreset('');
                        }}
                        className="px-2 py-1.5 rounded-lg border border-slate-200 text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>

                    <div className="relative flex items-center">
                      <Search size={14} className="absolute left-2.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-[140px] pl-8 pr-2.5 py-1.5 rounded-lg border border-slate-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>

                    {/* Actions: Export CSV and Print */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleExportCSV}
                        title="Export as CSV"
                        className="inline-flex items-center gap-1.5 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg text-xs font-semibold px-3 py-1.5 transition-colors"
                      >
                        <Download size={14} />
                        <span>Export CSV</span>
                      </button>

                      <button
                        type="button"
                        onClick={handlePrint}
                        title="Print or Save PDF"
                        className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg shadow-sm px-4 py-1.5 transition-colors cursor-pointer"
                      >
                        <Printer size={14} />
                        <span>Print / PDF</span>
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* ============================================================
              SHEET 1: WORK TYPE REPORT (Report Mode or Printing)
              ============================================================ */}
          {(mainTab === 'report' || typeof window === 'undefined') && showWorkType && (
            <div className={`report-sheet work-type-sheet ${showLabourWise || showDateWise ? 'sheet-page-break-after' : ''}`}>
              {/* Print Header for Sheet 1 */}
              <div className="print-document-header hidden mb-2.5">
                <div className="flex items-center justify-between border-b-2 border-slate-900 pb-2 mb-2.5">
                  {/* Left Side: Logo + Brand + Report Title + Period */}
                  <div className="flex items-center gap-3">
                    <img
                      src="/logo.png"
                      alt="Company Logo"
                      className="w-[42px] h-[42px] object-contain rounded-md border border-slate-300 p-0.5 bg-white"
                    />
                    <div>
                      <div className="text-[10pt] font-extrabold text-emerald-600 uppercase tracking-wide leading-tight">
                        Labour Payment System
                      </div>
                      <div className="text-[14pt] font-extrabold text-slate-900 leading-tight mt-px">
                        WORK TYPE PAYMENT REPORT
                      </div>
                      <div className="text-[8.5pt] text-slate-600 mt-0.5">
                        <strong>Period:</strong> {formattedPeriod}
                      </div>
                    </div>
                  </div>

                  {/* Right Side: Metadata */}
                  <div className="text-right text-[8pt] text-slate-500 whitespace-nowrap leading-relaxed">
                    <div><strong>Date:</strong> {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                    <div><strong>Generated By:</strong> {currentUser?.displayName || 'Authorized Official'}</div>
                  </div>
                </div>
              </div>

              {/* Table 1 Card */}
              <div className="report-table-card bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
                <div className="no-print flex items-center justify-between px-4 py-2.5 border-b border-slate-200 bg-slate-50">
                  <div className="flex items-center gap-1.5">
                    <Briefcase size={13} className="text-slate-500" />
                    <h2 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                      Work Type Report
                    </h2>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-semibold text-slate-500">
                      {workTypeReport.length} Work Types
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveReportTab('work_type');
                        setTimeout(() => window.print(), 80);
                      }}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-700 bg-white border border-slate-200 px-2 py-1 rounded-md shadow-2xs transition-colors"
                      title="Sirf Work Type Report print karein"
                    >
                      <Printer size={12} />
                      <span>Print This Page</span>
                    </button>
                  </div>
                </div>

                <div className="table-responsive report-scroll-container overflow-x-auto overflow-y-auto max-h-[560px]">
                  <table className="report-table w-full text-left border-collapse text-sm">
                    <thead className="sticky top-0 z-20 bg-slate-100 shadow-xs border-b border-slate-300">
                      <tr>
                        <th className="w-[60px] text-center px-3 py-2 font-semibold text-slate-700 uppercase tracking-wider text-[11px]">S.No.</th>
                        <th className="text-left px-4 py-2 font-semibold text-slate-700 uppercase tracking-wider text-[11px]">Work Type</th>
                        <th className="w-[150px] text-right px-3.5 py-2 font-semibold text-slate-700 uppercase tracking-wider text-[11px]">Total Qty</th>
                        <th className="w-[160px] text-right px-4 py-2 font-semibold text-slate-700 uppercase tracking-wider text-[11px]">Total Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {workTypeReport.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-4 py-9 text-center text-slate-400 bg-white text-xs">
                            No verified work records found for this period.
                          </td>
                        </tr>
                      ) : (
                        workTypeReport.map((row, index) => {
                          const isTon = isTonBasedWork(row.workType);
                          return (
                            <tr key={row.workType} className="bg-white hover:bg-slate-50/80 transition-colors">
                              <td className="px-3 py-2.5 text-center">
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-500 text-[11px] font-bold">
                                  {index + 1}
                                </span>
                              </td>
                              <td className="px-4 py-2.5">
                                <div className="font-semibold text-slate-800 text-xs">{row.workType}</div>
                                <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                                  <div
                                    className={`inline-flex items-center gap-1 text-[10px] font-bold ${
                                      isTon ? 'text-emerald-600' : 'text-indigo-600'
                                    }`}
                                  >
                                    {isTon ? <Scale size={10} /> : <User size={10} />}
                                    <span>{isTon ? 'Per Ton' : 'Per Person'}</span>
                                  </div>
                                  {row.isProductionLinked && (
                                    <span className="px-1.5 py-0.2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded font-semibold text-[9px]">
                                      {row.sourceLabel}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="text-right px-3.5 py-2.5 text-xs">
                                {row.totalQty > 0 ? (
                                  <span className="font-semibold text-slate-700 tabular-nums">
                                    {Number(row.totalQty.toFixed(3)).toLocaleString('en-IN')}{' '}
                                    <span className="text-[11px] font-normal text-slate-500">{row.unit}</span>
                                  </span>
                                ) : (
                                  <span className="text-slate-400">-</span>
                                )}
                              </td>
                              <td className="text-right px-4 py-2.5 font-bold text-emerald-700 tabular-nums text-xs">
                                {formatINR(row.totalAmount)}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                    <tfoot>
                      {/* GRAND TOTAL ROW (FROZEN / STICKY AT BOTTOM) */}
                      <tr className="report-total-row sticky bottom-0 z-[15] bg-slate-50 border-t-2 border-slate-300">
                        <td className="text-center px-3 py-3 text-slate-500 font-bold text-xs">
                          &mdash;
                        </td>
                        <td className="text-left px-4 py-3 font-bold text-slate-900 text-sm">
                          Grand Total
                        </td>
                        <td className="text-right px-3.5 py-3 font-bold text-slate-900 tabular-nums text-sm">
                          {workTypeTotals.totalQty > 0
                            ? Number(workTypeTotals.totalQty.toFixed(3)).toLocaleString('en-IN')
                            : '-'}
                        </td>
                        <td className="text-right px-4 py-3 font-extrabold text-emerald-700 tabular-nums text-base">
                          {formatINR(workTypeTotals.totalAmount)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Signature Block for Sheet 1 */}
              <div className="print-signature-block hidden mt-4 pt-1.5">
                <div className="grid grid-cols-3 gap-8 text-center">
                  <div className="border-t border-slate-400 pt-1">
                    <div className="font-bold text-[8.5pt] text-slate-900">Prepared By</div>
                    <div className="text-[7.5pt] text-slate-500">Supervisor / Incharge</div>
                  </div>
                  <div className="border-t border-slate-400 pt-1.5">
                    <div className="font-bold text-[9pt] text-slate-900">Verified By</div>
                    <div className="text-[8pt] text-slate-500">Operations Head</div>
                  </div>
                  <div className="border-t border-slate-400 pt-1.5">
                    <div className="font-bold text-[9pt] text-slate-900">Approved By</div>
                    <div className="text-[8pt] text-slate-500">Accounts &amp; Finance</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================
              SHEET 2: LABOUR WISE REPORT (FORCED PAGE BREAK IN PRINT)
              ============================================================ */}
          {(mainTab === 'report' || typeof window === 'undefined') && showLabourWise && (
            <div className={`report-sheet labour-sheet ${showWorkType ? 'sheet-page-break' : ''}`}>
              {/* Print Header for Sheet 2 */}
              <div className="print-document-header hidden mb-2.5">
                <div className="flex items-center justify-between border-b-2 border-slate-900 pb-2 mb-2.5">
                  {/* Left Side: Logo + Brand + Report Title + Period */}
                  <div className="flex items-center gap-3">
                    <img
                      src="/logo.png"
                      alt="Company Logo"
                      className="w-[42px] h-[42px] object-contain rounded-md border border-slate-300 p-0.5 bg-white"
                    />
                    <div>
                      <div className="text-[10pt] font-extrabold text-emerald-600 uppercase tracking-wide leading-tight">
                        Labour Payment System
                      </div>
                      <div className="text-[14pt] font-extrabold text-slate-900 leading-tight mt-px">
                        LABOUR WISE PAYMENT REPORT
                      </div>
                      <div className="text-[8.5pt] text-slate-600 mt-0.5">
                        <strong>Period:</strong> {formattedPeriod}
                      </div>
                    </div>
                  </div>

                  {/* Right Side: Metadata */}
                  <div className="text-right text-[8pt] text-slate-500 whitespace-nowrap leading-relaxed">
                    <div><strong>Date:</strong> {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                    <div><strong>Generated By:</strong> {currentUser?.displayName || 'Authorized Official'}</div>
                  </div>
                </div>
              </div>

              {/* Table 2 Card */}
              <div className="report-table-card bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
                <div className="no-print flex items-center justify-between px-4 py-2.5 border-b border-slate-200 bg-slate-50">
                  <div className="flex items-center gap-1.5">
                    <Users size={13} className="text-slate-500" />
                    <h2 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                      Labour Wise Report
                    </h2>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-semibold text-slate-500">
                      {labourWiseReport.length} Labourers
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveReportTab('labour_wise');
                        setTimeout(() => window.print(), 80);
                      }}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-700 bg-white border border-slate-200 px-2 py-1 rounded-md shadow-2xs transition-colors"
                      title="Sirf Labour Wise Report print karein"
                    >
                      <Printer size={12} />
                      <span>Print This Page</span>
                    </button>
                  </div>
                </div>

                <div className="table-responsive report-scroll-container overflow-x-auto overflow-y-auto max-h-[560px]">
                  <table className="report-table w-full text-left border-collapse text-sm">
                    <thead className="sticky top-0 z-20 bg-slate-100 shadow-xs border-b border-slate-300">
                      <tr>
                        <th className="w-[60px] text-center px-3 py-2 font-semibold text-slate-700 uppercase tracking-wider text-[11px]">S.No.</th>
                        <th className="text-left px-4 py-2 font-semibold text-slate-700 uppercase tracking-wider text-[11px]">Labour Name</th>
                        <th className="w-[140px] text-right px-3.5 py-2 font-semibold text-slate-700 uppercase tracking-wider text-[11px]">Day Of Work</th>
                        <th className="w-[160px] text-right px-4 py-2 font-semibold text-slate-700 uppercase tracking-wider text-[11px]">Total Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {labourWiseReport.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-4 py-9 text-center text-slate-400 bg-white text-xs">
                            No labour records found for this period.
                          </td>
                        </tr>
                      ) : (
                        labourWiseReport.map((row, index) => (
                          <tr key={row.labourName} className="bg-white hover:bg-slate-50/80 transition-colors">
                            <td className="px-3 py-2.5 text-center">
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-500 text-[11px] font-bold">
                                {index + 1}
                              </span>
                            </td>
                            <td className="px-4 py-2.5">
                              <div className="flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                                  <User size={12} />
                                </span>
                                <span className="font-semibold text-slate-800 text-xs">{row.labourName}</span>
                              </div>
                            </td>
                            <td className="text-right px-3.5 py-2.5 font-semibold text-slate-700 tabular-nums text-xs">
                              {row.dayOfWork} {row.dayOfWork === 1 ? 'day' : 'days'}
                            </td>
                            <td className="text-right px-4 py-2.5 font-bold text-emerald-700 tabular-nums text-xs">
                              {formatINR(row.totalAmount)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    <tfoot>
                      {/* GRAND TOTAL ROW (FROZEN / STICKY AT BOTTOM) */}
                      <tr className="report-total-row sticky bottom-0 z-[15] bg-slate-50 border-t-2 border-slate-300">
                        <td className="text-center px-3 py-3 text-slate-500 font-bold text-xs">
                          &mdash;
                        </td>
                        <td className="text-left px-4 py-3 font-bold text-slate-900 text-sm">
                          Grand Total &bull; {labourWiseReport.length} Labourers
                        </td>
                        <td className="text-right px-3.5 py-3 font-bold text-slate-900 tabular-nums text-sm">
                          {labourTotals.totalDays} Days
                        </td>
                        <td className="text-right px-4 py-3 font-extrabold text-emerald-700 tabular-nums text-base">
                          {formatINR(labourTotals.totalAmount)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Signature Block for Sheet 2 */}
              <div className="print-signature-block hidden mt-4 pt-1.5">
                <div className="grid grid-cols-3 gap-8 text-center">
                  <div className="border-t border-slate-400 pt-1">
                    <div className="font-bold text-[8.5pt] text-slate-900">Prepared By</div>
                    <div className="text-[7.5pt] text-slate-500">Supervisor / Incharge</div>
                  </div>
                  <div className="border-t border-slate-400 pt-1.5">
                    <div className="font-bold text-[9pt] text-slate-900">Verified By</div>
                    <div className="text-[8pt] text-slate-500">Operations Head</div>
                  </div>
                  <div className="border-t border-slate-400 pt-1.5">
                    <div className="font-bold text-[9pt] text-slate-900">Approved By</div>
                    <div className="text-[8pt] text-slate-500">Accounts &amp; Finance</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================
              SHEET 3: DATE WISE REPORT (FORCED PAGE BREAK IN PRINT)
              ============================================================ */}
          {(mainTab === 'report' || typeof window === 'undefined') && showDateWise && (
            <div className={`report-sheet date-sheet ${(showWorkType || showLabourWise) ? 'sheet-page-break' : ''}`}>
              {/* Print Header for Sheet 3 */}
              <div className="print-document-header hidden mb-2.5">
                <div className="flex items-center justify-between border-b-2 border-slate-900 pb-2 mb-2.5">
                  {/* Left Side: Logo + Brand + Report Title + Period */}
                  <div className="flex items-center gap-3">
                    <img
                      src="/logo.png"
                      alt="Company Logo"
                      className="w-[42px] h-[42px] object-contain rounded-md border border-slate-300 p-0.5 bg-white"
                    />
                    <div>
                      <div className="text-[10pt] font-extrabold text-emerald-600 uppercase tracking-wide leading-tight">
                        Labour Payment System
                      </div>
                      <div className="text-[14pt] font-extrabold text-slate-900 leading-tight mt-px">
                        DATE WISE PAYMENT REPORT
                      </div>
                      <div className="text-[8.5pt] text-slate-600 mt-0.5">
                        <strong>Period:</strong> {formattedPeriod}
                      </div>
                    </div>
                  </div>

                  {/* Right Side: Metadata */}
                  <div className="text-right text-[8pt] text-slate-500 whitespace-nowrap leading-relaxed">
                    <div><strong>Date:</strong> {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                    <div><strong>Generated By:</strong> {currentUser?.displayName || 'Authorized Official'}</div>
                  </div>
                </div>
              </div>

              {/* Table 3 Card */}
              <div className="report-table-card bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
                <div className="no-print flex items-center justify-between px-4 py-2.5 border-b border-slate-200 bg-slate-50">
                  <div className="flex items-center gap-1.5">
                    <Calendar size={13} className="text-slate-500" />
                    <h2 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                      Date Wise Report
                    </h2>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-semibold text-slate-500">
                      {dateWiseReport.length} {dateWiseReport.length === 1 ? 'Day' : 'Days'}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveReportTab('date_wise');
                        setTimeout(() => window.print(), 80);
                      }}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-700 bg-white border border-slate-200 px-2 py-1 rounded-md shadow-2xs transition-colors"
                      title="Sirf Date Wise Report print karein"
                    >
                      <Printer size={12} />
                      <span>Print This Page</span>
                    </button>
                  </div>
                </div>

                <div className="table-responsive report-scroll-container overflow-x-auto overflow-y-auto max-h-[560px]">
                  <table className="report-table w-full text-left border-collapse text-sm">
                    <thead className="sticky top-0 z-20 bg-slate-100 shadow-xs border-b border-slate-300">
                      <tr>
                        <th className="w-[60px] text-center px-3 py-2 font-semibold text-slate-700 uppercase tracking-wider text-[11px]">S.No.</th>
                        <th className="text-left px-4 py-2 font-semibold text-slate-700 uppercase tracking-wider text-[11px]">Date</th>
                        <th className="w-[130px] text-right px-3.5 py-2 font-semibold text-slate-700 uppercase tracking-wider text-[11px]">Work Orders</th>
                        <th className="w-[130px] text-right px-3.5 py-2 font-semibold text-slate-700 uppercase tracking-wider text-[11px]">Labourers</th>
                        <th className="w-[160px] text-right px-4 py-2 font-semibold text-slate-700 uppercase tracking-wider text-[11px]">Total Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {dateWiseReport.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-9 text-center text-slate-400 bg-white text-xs">
                            No verified work records found for this period.
                          </td>
                        </tr>
                      ) : (
                        dateWiseReport.map((row, index) => {
                          const parsed = parseDate(row.date);
                          const weekday = parsed ? parsed.toLocaleDateString('en-GB', { weekday: 'short' }) : '';
                          return (
                            <tr key={row.date} className="bg-white hover:bg-slate-50/80 transition-colors">
                              <td className="px-3 py-2.5 text-center">
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-500 text-[11px] font-bold">
                                  {index + 1}
                                </span>
                              </td>
                              <td className="px-4 py-2.5">
                                <div className="flex items-center gap-2">
                                  <span className="w-6 h-6 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
                                    <Calendar size={12} />
                                  </span>
                                  <div>
                                    <div className="font-semibold text-slate-800 text-xs">{formatDate(row.date)}</div>
                                    {weekday && <div className="text-[10px] text-slate-400 font-medium">{weekday}</div>}
                                  </div>
                                </div>
                              </td>
                              <td className="text-right px-3.5 py-2.5 font-semibold text-slate-700 tabular-nums text-xs">
                                {row.workOrders}
                              </td>
                              <td className="text-right px-3.5 py-2.5 font-semibold text-slate-700 tabular-nums text-xs">
                                {row.totalLabour}
                              </td>
                              <td className="text-right px-4 py-2.5 font-bold text-emerald-700 tabular-nums text-xs">
                                {formatINR(row.totalAmount)}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                    <tfoot>
                      {/* GRAND TOTAL ROW (FROZEN / STICKY AT BOTTOM) */}
                      <tr className="report-total-row sticky bottom-0 z-[15] bg-slate-50 border-t-2 border-slate-300">
                        <td className="text-center px-3 py-3 text-slate-500 font-bold text-xs">
                          &mdash;
                        </td>
                        <td className="text-left px-4 py-3 font-bold text-slate-900 text-sm">
                          Grand Total &bull; {dateWiseReport.length} Days
                        </td>
                        <td className="text-right px-3.5 py-3 font-bold text-slate-900 tabular-nums text-sm">
                          {dateWiseTotals.workOrders}
                        </td>
                        <td className="text-right px-3.5 py-3 font-bold text-slate-900 tabular-nums text-sm">
                          {dateWiseTotals.totalLabour}
                        </td>
                        <td className="text-right px-4 py-3 font-extrabold text-emerald-700 tabular-nums text-base">
                          {formatINR(dateWiseTotals.totalAmount)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Signature Block for Sheet 3 */}
              <div className="print-signature-block hidden mt-4 pt-1.5">
                <div className="grid grid-cols-3 gap-8 text-center">
                  <div className="border-t border-slate-400 pt-1">
                    <div className="font-bold text-[8.5pt] text-slate-900">Prepared By</div>
                    <div className="text-[7.5pt] text-slate-500">Supervisor / Incharge</div>
                  </div>
                  <div className="border-t border-slate-400 pt-1.5">
                    <div className="font-bold text-[9pt] text-slate-900">Verified By</div>
                    <div className="text-[8pt] text-slate-500">Operations Head</div>
                  </div>
                  <div className="border-t border-slate-400 pt-1.5">
                    <div className="font-bold text-[9pt] text-slate-900">Approved By</div>
                    <div className="text-[8pt] text-slate-500">Accounts &amp; Finance</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Work Detail Modal for Timeline / Details */}
          {timelineWorkId && (
            <WorkDetailModal
              workId={timelineWorkId}
              onClose={() => setTimelineWorkId(null)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
