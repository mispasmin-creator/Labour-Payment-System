import React, { useState, useMemo } from 'react';
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
  Layers
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatINR, formatDate, parseDate } from '../utils/dateUtils';
import { exportToCSV } from '../utils/exportUtils';
import { getWorkTypeUnit, isTonBasedWork } from '../utils/workTypes';

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

export function PaymentReportPage() {
  const { entries, currentUser } = useApp();

  // Default to Current Week (Monday to Sunday)
  const initialMonday = useMemo(() => getMondayOfDate(new Date()), []);
  const initialSunday = useMemo(() => getSundayOfDate(initialMonday), [initialMonday]);

  const [dateFrom, setDateFrom] = useState(toISODate(initialMonday));
  const [dateTo, setDateTo] = useState(toISODate(initialSunday));
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPreset, setSelectedPreset] = useState('This Week');
  const [activeReportTab, setActiveReportTab] = useState('all'); // 'all' | 'work_type' | 'labour_wise'

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

  // Check if entry is verified (must have recorded verification timestamp)
  const isEntryVerified = (e) => {
    if (!e) return false;
    return Boolean(
      e.verificationActual &&
      e.verificationActual !== '-' &&
      e.verificationActual !== 'null' &&
      String(e.verificationActual).trim() !== ''
    );
  };

  // Filtered Verified Entries according to Week Range and Search
  const verifiedEntries = useMemo(() => {
    return (entries || []).filter(entry => {
      if (!isEntryVerified(entry)) return false;

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
          ? entry.labourNames.some(n => n.toLowerCase().includes(q))
          : String(entry.labourNames || '').toLowerCase().includes(q);
        if (!matchesWork && !matchesIncharge && !matchesWorkId && !matchesLabour) {
          return false;
        }
      }

      return true;
    });
  }, [entries, dateFrom, dateTo, searchTerm]);

  // 1. Table 1: Work Type Aggregated Report
  const workTypeReport = useMemo(() => {
    const map = {};

    verifiedEntries.forEach(entry => {
      const workType = (entry.work || 'General Work').trim();
      if (!map[workType]) {
        map[workType] = {
          workType,
          totalQty: 0,
          totalAmount: 0,
          count: 0,
          unit: getWorkTypeUnit(workType)
        };
      }

      const qty = Number(entry.qty) || Number(entry.qtyMade) || 0;
      const amount = Number(entry.totalAmount) || 0;

      map[workType].totalQty += qty;
      map[workType].totalAmount += amount;
      map[workType].count += 1;
    });

    return Object.values(map).sort((a, b) => b.totalAmount - a.totalAmount);
  }, [verifiedEntries]);

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
        <div className="max-w-[1200px] mx-auto px-1 pb-10 space-y-5">
          {/* ============================================================
              CLEAN SCREEN HEADER (Title + Actions)
              ============================================================ */}
          <div className="no-print">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 shadow-2xs flex items-center justify-center p-1.5 shrink-0">
                  <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-slate-800">Payment Report</h1>
                  <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                    <CheckCircle2 size={14} className="text-emerald-600" />
                    <span>Verified Data &bull; {formattedPeriod} &bull; {verifiedEntries.length} Records</span>
                  </div>
                </div>
              </div>

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
                  className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg shadow-sm px-4 py-1.5 transition-colors"
                >
                  <Printer size={14} />
                  <span>Print / PDF</span>
                </button>
              </div>
            </div>

            {/* ============================================================
                COMPACT & SLEEK FILTER TOOLBAR
                ============================================================ */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3 mt-3.5">
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
              </div>
            </div>

            {/* View / Print Selection Tabs */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-2 mt-3 gap-2 flex-wrap no-print">
              <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setActiveReportTab('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                    activeReportTab === 'all'
                      ? 'bg-white text-indigo-700 shadow-xs border border-slate-200 font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Layers size={13} />
                  <span>Dono Reports (Alag Alag Page)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveReportTab('work_type')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                    activeReportTab === 'work_type'
                      ? 'bg-white text-indigo-700 shadow-xs border border-slate-200 font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Briefcase size={13} />
                  <span>Sirf Work Type</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveReportTab('labour_wise')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                    activeReportTab === 'labour_wise'
                      ? 'bg-white text-indigo-700 shadow-xs border border-slate-200 font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Users size={13} />
                  <span>Sirf Labour Wise</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveReportTab('date_wise')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                    activeReportTab === 'date_wise'
                      ? 'bg-white text-indigo-700 shadow-xs border border-slate-200 font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Calendar size={13} />
                  <span>Sirf Date Wise</span>
                </button>
              </div>

              <div className="text-[11px] text-slate-500 font-medium">
                {activeReportTab === 'all' && '🖨️ Print: Page 1 = Work Type, Page 2 = Labour Wise'}
                {activeReportTab === 'work_type' && '🖨️ Print: Sirf Work Type Report print hoga'}
                {activeReportTab === 'labour_wise' && '🖨️ Print: Sirf Labour Wise Report print hoga'}
                {activeReportTab === 'date_wise' && '🖨️ Print: Sirf Date Wise Report print hoga'}
              </div>
            </div>
          </div>

          {/* ============================================================
              SHEET 1: WORK TYPE REPORT
              ============================================================ */}
          {showWorkType && (
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
                                <div className={`inline-flex items-center gap-1 text-[10px] font-bold mt-0.5 ${isTon ? 'text-emerald-600' : 'text-indigo-600'}`}>
                                  {isTon ? <Scale size={10} /> : <User size={10} />}
                                  <span>{isTon ? 'Per Ton' : 'Per Person'}</span>
                                </div>
                              </td>
                              <td className="text-right px-3.5 py-2.5 text-xs">
                                {row.totalQty > 0 ? (
                                  <span className="font-semibold text-slate-700 tabular-nums">
                                    {row.totalQty.toLocaleString('en-IN')} <span className="text-[11px] font-normal text-slate-500">{row.unit}</span>
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
                          {workTypeTotals.totalQty > 0 ? workTypeTotals.totalQty.toLocaleString('en-IN') : '-'}
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
          {showLabourWise && (
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
          {showDateWise && (
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
        </div>
      </div>
    </div>
  );
}
