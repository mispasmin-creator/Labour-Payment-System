import React, { useState, useMemo } from 'react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Printer,
  Download,
  CheckCircle2,
  Users,
  Briefcase,
  Search,
  ReceiptText,
  Layers
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatINR, formatDate, parseDate } from '../utils/dateUtils';
import { exportToCSV } from '../utils/exportUtils';
import { getWorkTypeUnit } from '../utils/workTypes';

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
  };

  const showWorkType = activeReportTab === 'all' || activeReportTab === 'work_type';
  const showLabourWise = activeReportTab === 'all' || activeReportTab === 'labour_wise';

  return (
    <div className="payment-report-container" style={{ maxWidth: 1200, margin: '0 auto', paddingBottom: 40 }}>
      {/* ============================================================
          CLEAN SCREEN HEADER (Title + Actions)
          ============================================================ */}
      <div className="no-print" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 42,
              height: 42,
              borderRadius: 8,
              background: '#FFFFFF',
              border: '1px solid #CBD5E1',
              padding: 3,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}>
              <img src="/logo.png" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                Payment Report
              </h1>
              <div style={{ fontSize: '0.84rem', color: '#64748B', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                <CheckCircle2 size={14} color="#16A34A" />
                <span>Verified Data &bull; {formattedPeriod} &bull; {verifiedEntries.length} Records</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleExportCSV}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', fontSize: '0.84rem', fontWeight: 600 }}
              title="Export as CSV"
            >
              <Download size={15} />
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              className="btn btn-primary"
              onClick={handlePrint}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '7px 16px',
                fontSize: '0.84rem',
                fontWeight: 700,
                background: '#0F172A',
                borderColor: '#0F172A',
                color: '#FFFFFF'
              }}
              title="Print or Save PDF"
            >
              <Printer size={15} />
              <span>Print / PDF</span>
            </button>
          </div>
        </div>

        {/* ============================================================
            COMPACT & SLEEK FILTER TOOLBAR
            ============================================================ */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: 10,
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          padding: '10px 16px',
          marginTop: 14,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12
        }}>
          {/* Week Presets & Navigation */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #CBD5E1', borderRadius: 6, overflow: 'hidden' }}>
              <button
                type="button"
                onClick={() => handleShiftWeek(-1)}
                title="Previous Week"
                style={{
                  background: '#F8FAFC',
                  border: 'none',
                  borderRight: '1px solid #CBD5E1',
                  padding: '6px 10px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  color: '#475569'
                }}
              >
                <ChevronLeft size={15} />
              </button>
              <button
                type="button"
                onClick={() => handleShiftWeek(1)}
                title="Next Week"
                style={{
                  background: '#F8FAFC',
                  border: 'none',
                  padding: '6px 10px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  color: '#475569'
                }}
              >
                <ChevronRight size={15} />
              </button>
            </div>

            {['This Week', 'Last Week', 'This Month', 'All Time'].map(preset => (
              <button
                key={preset}
                type="button"
                onClick={() => handleSetPreset(preset)}
                style={{
                  padding: '5px 12px',
                  borderRadius: 6,
                  fontSize: '0.8rem',
                  fontWeight: selectedPreset === preset ? 700 : 500,
                  background: selectedPreset === preset ? '#0F172A' : '#F1F5F9',
                  color: selectedPreset === preset ? '#FFFFFF' : '#475569',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {preset}
              </button>
            ))}
          </div>

          {/* Date Pickers & Quick Search */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', color: '#475569' }}>
              <span style={{ fontWeight: 600 }}>From:</span>
              <input
                type="date"
                value={dateFrom}
                onChange={e => {
                  setDateFrom(e.target.value);
                  setSelectedPreset('');
                }}
                style={{
                  padding: '4px 8px',
                  borderRadius: 6,
                  border: '1px solid #CBD5E1',
                  fontSize: '0.82rem',
                  background: '#FFFFFF',
                  color: '#0F172A'
                }}
              />
              <span style={{ fontWeight: 600, marginLeft: 4 }}>To:</span>
              <input
                type="date"
                value={dateTo}
                onChange={e => {
                  setDateTo(e.target.value);
                  setSelectedPreset('');
                }}
                style={{
                  padding: '4px 8px',
                  borderRadius: 6,
                  border: '1px solid #CBD5E1',
                  fontSize: '0.82rem',
                  background: '#FFFFFF',
                  color: '#0F172A'
                }}
              />
            </div>

            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{
                  width: 140,
                  padding: '4px 8px 4px 26px',
                  borderRadius: 6,
                  border: '1px solid #CBD5E1',
                  fontSize: '0.82rem'
                }}
              />
            </div>
          </div>
        </div>

      </div>

      {/* ============================================================
          SHEET 1: WORK TYPE REPORT
          ============================================================ */}
      {showWorkType && (
        <div className="report-sheet work-type-sheet" style={{ marginBottom: 28 }}>
          {/* Print Header for Sheet 1 */}
          <div className="print-document-header" style={{ marginBottom: 10 }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '2px solid #0F172A',
              paddingBottom: 8,
              marginBottom: 10
            }}>
              {/* Left Side: Logo + Brand + Report Title + Period */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <img
                  src="/logo.png"
                  alt="Company Logo"
                  style={{
                    width: 42,
                    height: 42,
                    objectFit: 'contain',
                    borderRadius: 6,
                    border: '1px solid #CBD5E1',
                    padding: 2,
                    background: '#FFFFFF'
                  }}
                />
                <div>
                  <div style={{
                    fontSize: '10pt',
                    fontWeight: 800,
                    color: '#059669',
                    letterSpacing: '0.4px',
                    textTransform: 'uppercase',
                    lineHeight: 1.15
                  }}>
                    Labour Payment System
                  </div>
                  <div style={{
                    fontSize: '14pt',
                    fontWeight: 800,
                    color: '#0F172A',
                    letterSpacing: '-0.2px',
                    lineHeight: 1.15,
                    marginTop: 1
                  }}>
                    WORK TYPE PAYMENT REPORT
                  </div>
                  <div style={{ fontSize: '8.5pt', color: '#475569', marginTop: 2 }}>
                    <strong>Period:</strong> {formattedPeriod}
                  </div>
                </div>
              </div>

              {/* Right Side: Metadata */}
              <div style={{ textAlign: 'right', fontSize: '8pt', color: '#64748B', whiteSpace: 'nowrap', lineHeight: 1.4 }}>
                <div><strong>Date:</strong> {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                <div><strong>Generated By:</strong> {currentUser?.displayName || 'Authorized Official'}</div>
              </div>
            </div>
          </div>

          {/* Table 1 Card */}
          <div className="report-table-card" style={{
            background: '#FFFFFF',
            borderRadius: 10,
            border: '1px solid #CBD5E1',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            overflow: 'hidden'
          }}>
            <div className="no-print" style={{
              padding: '12px 18px',
              borderBottom: '1px solid #E2E8F0',
              background: '#F8FAFC',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Briefcase size={16} color="#0F172A" />
                <h2 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0F172A', margin: 0, textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                  Work Type Report
                </h2>
              </div>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748B' }}>
                {workTypeReport.length} Work Types
              </span>
            </div>

            <div className="table-responsive report-scroll-container" style={{ overflowX: 'auto', maxHeight: '560px', overflowY: 'auto' }}>
              <table className="report-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ color: '#0F172A' }}>
                    <th style={{ position: 'sticky', top: 0, zIndex: 20, padding: '9px 12px', fontWeight: 700, width: 60, textAlign: 'center', background: '#F1F5F9', borderBottom: '2px solid #0F172A', borderRight: '1px solid #CBD5E1', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>S.No.</th>
                    <th style={{ position: 'sticky', top: 0, zIndex: 20, padding: '9px 16px', fontWeight: 700, textAlign: 'left', background: '#F1F5F9', borderBottom: '2px solid #0F172A', borderRight: '1px solid #CBD5E1', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>Work Type</th>
                    <th style={{ position: 'sticky', top: 0, zIndex: 20, padding: '9px 14px', fontWeight: 700, width: 140, textAlign: 'center', background: '#F1F5F9', borderBottom: '2px solid #0F172A', borderRight: '1px solid #CBD5E1', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>Total Qty</th>
                    <th style={{ position: 'sticky', top: 0, zIndex: 20, padding: '9px 16px', fontWeight: 700, width: 160, textAlign: 'right', background: '#F1F5F9', borderBottom: '2px solid #0F172A', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>Total Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {workTypeReport.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ padding: '28px 16px', textAlign: 'center', color: '#94A3B8', background: '#FFFFFF' }}>
                        No verified work records found for this period.
                      </td>
                    </tr>
                  ) : (
                    workTypeReport.map((row, index) => {
                      const bg = index % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
                      return (
                        <tr key={row.workType}>
                          <td style={{ padding: '8px 12px', textAlign: 'center', color: '#64748B', fontWeight: 500, background: bg, borderBottom: '1px solid #E2E8F0', borderRight: '1px solid #E2E8F0' }}>
                            {index + 1}
                          </td>
                          <td style={{ padding: '8px 16px', textAlign: 'left', fontWeight: 600, color: '#0F172A', background: bg, borderBottom: '1px solid #E2E8F0', borderRight: '1px solid #E2E8F0' }}>
                            {row.workType}
                          </td>
                          <td style={{ padding: '8px 14px', textAlign: 'center', fontWeight: 500, color: '#334155', background: bg, borderBottom: '1px solid #E2E8F0', borderRight: '1px solid #E2E8F0' }}>
                            {row.totalQty > 0 ? (
                              <span>
                                {row.totalQty.toLocaleString('en-IN')} <span style={{ fontSize: '0.78rem', color: '#64748B' }}>{row.unit}</span>
                              </span>
                            ) : (
                              '-'
                            )}
                          </td>
                          <td style={{ padding: '8px 16px', textAlign: 'right', fontWeight: 700, color: '#0F172A', fontVariantNumeric: 'tabular-nums', background: bg, borderBottom: '1px solid #E2E8F0' }}>
                            {formatINR(row.totalAmount)}
                          </td>
                        </tr>
                      );
                    })
                  )}

                  {/* GRAND TOTAL ROW (FROZEN / STICKY AT BOTTOM) */}
                  <tr className="report-total-row" style={{ fontWeight: 800, color: '#0F172A', background: '#F1F5F9' }}>
                    <td style={{ position: 'sticky', bottom: 0, zIndex: 15, padding: '10px 12px', textAlign: 'center', color: '#64748B', background: '#F1F5F9', borderTop: '2px solid #0F172A', borderBottom: '2px solid #0F172A', borderRight: '1px solid #CBD5E1', boxShadow: '0 -3px 6px rgba(0,0,0,0.08)' }}>
                      Total
                    </td>
                    <td style={{ position: 'sticky', bottom: 0, zIndex: 15, padding: '10px 16px', textAlign: 'left', fontSize: '0.92rem', background: '#F1F5F9', borderTop: '2px solid #0F172A', borderBottom: '2px solid #0F172A', borderRight: '1px solid #CBD5E1', boxShadow: '0 -3px 6px rgba(0,0,0,0.08)' }}>
                      Grand Total
                    </td>
                    <td style={{ position: 'sticky', bottom: 0, zIndex: 15, padding: '10px 14px', textAlign: 'center', fontSize: '0.92rem', background: '#F1F5F9', borderTop: '2px solid #0F172A', borderBottom: '2px solid #0F172A', borderRight: '1px solid #CBD5E1', boxShadow: '0 -3px 6px rgba(0,0,0,0.08)' }}>
                      {workTypeTotals.totalQty > 0 ? workTypeTotals.totalQty.toLocaleString('en-IN') : '-'}
                    </td>
                    <td style={{ position: 'sticky', bottom: 0, zIndex: 15, padding: '10px 16px', textAlign: 'right', fontSize: '1.05rem', color: '#15803D', fontVariantNumeric: 'tabular-nums', background: '#F1F5F9', borderTop: '2px solid #0F172A', borderBottom: '2px solid #0F172A', boxShadow: '0 -3px 6px rgba(0,0,0,0.08)' }}>
                      {formatINR(workTypeTotals.totalAmount)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Signature Block for Sheet 1 */}
          <div className="print-signature-block" style={{ marginTop: 16, paddingTop: 6 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 30, textAlign: 'center' }}>
              <div style={{ borderTop: '1px solid #94A3B8', paddingTop: 4 }}>
                <div style={{ fontWeight: 700, fontSize: '8.5pt', color: '#0F172A' }}>Prepared By</div>
                <div style={{ fontSize: '7.5pt', color: '#64748B' }}>Supervisor / Incharge</div>
              </div>
              <div style={{ borderTop: '1px solid #94A3B8', paddingTop: 6 }}>
                <div style={{ fontWeight: 700, fontSize: '9pt', color: '#0F172A' }}>Verified By</div>
                <div style={{ fontSize: '8pt', color: '#64748B' }}>Operations Head</div>
              </div>
              <div style={{ borderTop: '1px solid #94A3B8', paddingTop: 6 }}>
                <div style={{ fontWeight: 700, fontSize: '9pt', color: '#0F172A' }}>Approved By</div>
                <div style={{ fontSize: '8pt', color: '#64748B' }}>Accounts &amp; Finance</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          SHEET 2: LABOUR WISE REPORT (FORCED PAGE BREAK IN PRINT)
          ============================================================ */}
      {showLabourWise && (
        <div className={`report-sheet labour-sheet ${activeReportTab === 'all' ? 'sheet-page-break' : ''}`}>
          {/* Print Header for Sheet 2 */}
          <div className="print-document-header" style={{ marginBottom: 10 }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '2px solid #0F172A',
              paddingBottom: 8,
              marginBottom: 10
            }}>
              {/* Left Side: Logo + Brand + Report Title + Period */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <img
                  src="/logo.png"
                  alt="Company Logo"
                  style={{
                    width: 42,
                    height: 42,
                    objectFit: 'contain',
                    borderRadius: 6,
                    border: '1px solid #CBD5E1',
                    padding: 2,
                    background: '#FFFFFF'
                  }}
                />
                <div>
                  <div style={{
                    fontSize: '10pt',
                    fontWeight: 800,
                    color: '#059669',
                    letterSpacing: '0.4px',
                    textTransform: 'uppercase',
                    lineHeight: 1.15
                  }}>
                    Labour Payment System
                  </div>
                  <div style={{
                    fontSize: '14pt',
                    fontWeight: 800,
                    color: '#0F172A',
                    letterSpacing: '-0.2px',
                    lineHeight: 1.15,
                    marginTop: 1
                  }}>
                    LABOUR WISE PAYMENT REPORT
                  </div>
                  <div style={{ fontSize: '8.5pt', color: '#475569', marginTop: 2 }}>
                    <strong>Period:</strong> {formattedPeriod}
                  </div>
                </div>
              </div>

              {/* Right Side: Metadata */}
              <div style={{ textAlign: 'right', fontSize: '8pt', color: '#64748B', whiteSpace: 'nowrap', lineHeight: 1.4 }}>
                <div><strong>Date:</strong> {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                <div><strong>Generated By:</strong> {currentUser?.displayName || 'Authorized Official'}</div>
              </div>
            </div>
          </div>

          {/* Table 2 Card */}
          <div className="report-table-card" style={{
            background: '#FFFFFF',
            borderRadius: 10,
            border: '1px solid #CBD5E1',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            overflow: 'hidden'
          }}>
            <div className="no-print" style={{
              padding: '12px 18px',
              borderBottom: '1px solid #E2E8F0',
              background: '#F8FAFC',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Users size={16} color="#0F172A" />
                <h2 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0F172A', margin: 0, textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                  Labour Wise Report
                </h2>
              </div>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748B' }}>
                {labourWiseReport.length} Labourers
              </span>
            </div>

            <div className="table-responsive report-scroll-container" style={{ overflowX: 'auto', maxHeight: '560px', overflowY: 'auto' }}>
              <table className="report-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ color: '#0F172A' }}>
                    <th style={{ position: 'sticky', top: 0, zIndex: 20, padding: '9px 12px', fontWeight: 700, width: 60, textAlign: 'center', background: '#F1F5F9', borderBottom: '2px solid #0F172A', borderRight: '1px solid #CBD5E1', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>S.No.</th>
                    <th style={{ position: 'sticky', top: 0, zIndex: 20, padding: '9px 16px', fontWeight: 700, textAlign: 'left', background: '#F1F5F9', borderBottom: '2px solid #0F172A', borderRight: '1px solid #CBD5E1', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>Labour Name</th>
                    <th style={{ position: 'sticky', top: 0, zIndex: 20, padding: '9px 14px', fontWeight: 700, width: 140, textAlign: 'center', background: '#F1F5F9', borderBottom: '2px solid #0F172A', borderRight: '1px solid #CBD5E1', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>Day Of Work</th>
                    <th style={{ position: 'sticky', top: 0, zIndex: 20, padding: '9px 16px', fontWeight: 700, width: 160, textAlign: 'right', background: '#F1F5F9', borderBottom: '2px solid #0F172A', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>Total Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {labourWiseReport.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ padding: '28px 16px', textAlign: 'center', color: '#94A3B8', background: '#FFFFFF' }}>
                        No labour records found for this period.
                      </td>
                    </tr>
                  ) : (
                    labourWiseReport.map((row, index) => {
                      const bg = index % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
                      return (
                        <tr key={row.labourName}>
                          <td style={{ padding: '8px 12px', textAlign: 'center', color: '#64748B', fontWeight: 500, background: bg, borderBottom: '1px solid #E2E8F0', borderRight: '1px solid #E2E8F0' }}>
                            {index + 1}
                          </td>
                          <td style={{ padding: '8px 16px', textAlign: 'left', fontWeight: 600, color: '#0F172A', background: bg, borderBottom: '1px solid #E2E8F0', borderRight: '1px solid #E2E8F0' }}>
                            {row.labourName}
                          </td>
                          <td style={{ padding: '8px 14px', textAlign: 'center', fontWeight: 600, color: '#334155', background: bg, borderBottom: '1px solid #E2E8F0', borderRight: '1px solid #E2E8F0' }}>
                            {row.dayOfWork}
                          </td>
                          <td style={{ padding: '8px 16px', textAlign: 'right', fontWeight: 700, color: '#0F172A', fontVariantNumeric: 'tabular-nums', background: bg, borderBottom: '1px solid #E2E8F0' }}>
                            {formatINR(row.totalAmount)}
                          </td>
                        </tr>
                      );
                    })
                  )}

                  {/* GRAND TOTAL ROW (FROZEN / STICKY AT BOTTOM) */}
                  <tr className="report-total-row" style={{ fontWeight: 800, color: '#0F172A', background: '#F1F5F9' }}>
                    <td style={{ position: 'sticky', bottom: 0, zIndex: 15, padding: '10px 12px', textAlign: 'center', color: '#64748B', background: '#F1F5F9', borderTop: '2px solid #0F172A', borderBottom: '2px solid #0F172A', borderRight: '1px solid #CBD5E1', boxShadow: '0 -3px 6px rgba(0,0,0,0.08)' }}>
                      Total
                    </td>
                    <td style={{ position: 'sticky', bottom: 0, zIndex: 15, padding: '10px 16px', textAlign: 'left', fontSize: '0.92rem', background: '#F1F5F9', borderTop: '2px solid #0F172A', borderBottom: '2px solid #0F172A', borderRight: '1px solid #CBD5E1', boxShadow: '0 -3px 6px rgba(0,0,0,0.08)' }}>
                      Grand Total
                    </td>
                    <td style={{ position: 'sticky', bottom: 0, zIndex: 15, padding: '10px 14px', textAlign: 'center', fontSize: '0.92rem', background: '#F1F5F9', borderTop: '2px solid #0F172A', borderBottom: '2px solid #0F172A', borderRight: '1px solid #CBD5E1', boxShadow: '0 -3px 6px rgba(0,0,0,0.08)' }}>
                      {labourTotals.totalDays} Days
                    </td>
                    <td style={{ position: 'sticky', bottom: 0, zIndex: 15, padding: '10px 16px', textAlign: 'right', fontSize: '1.05rem', color: '#15803D', fontVariantNumeric: 'tabular-nums', background: '#F1F5F9', borderTop: '2px solid #0F172A', borderBottom: '2px solid #0F172A', boxShadow: '0 -3px 6px rgba(0,0,0,0.08)' }}>
                      {formatINR(labourTotals.totalAmount)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Signature Block for Sheet 2 */}
          <div className="print-signature-block" style={{ marginTop: 16, paddingTop: 6 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 30, textAlign: 'center' }}>
              <div style={{ borderTop: '1px solid #94A3B8', paddingTop: 4 }}>
                <div style={{ fontWeight: 700, fontSize: '8.5pt', color: '#0F172A' }}>Prepared By</div>
                <div style={{ fontSize: '7.5pt', color: '#64748B' }}>Supervisor / Incharge</div>
              </div>
              <div style={{ borderTop: '1px solid #94A3B8', paddingTop: 6 }}>
                <div style={{ fontWeight: 700, fontSize: '9pt', color: '#0F172A' }}>Verified By</div>
                <div style={{ fontSize: '8pt', color: '#64748B' }}>Operations Head</div>
              </div>
              <div style={{ borderTop: '1px solid #94A3B8', paddingTop: 6 }}>
                <div style={{ fontWeight: 700, fontSize: '9pt', color: '#0F172A' }}>Approved By</div>
                <div style={{ fontSize: '8pt', color: '#64748B' }}>Accounts &amp; Finance</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Print Specific CSS */}
      <style dangerouslySetInnerHTML={{
        __html: `
        .print-document-header { display: none; }
        .print-signature-block { display: none; }

        /* Screen Sticky / Freeze Styles */
        .report-table thead th {
          position: sticky;
          top: 0;
          z-index: 20;
          background-color: #F1F5F9 !important;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        }

        .report-table .report-total-row td {
          position: sticky;
          bottom: 0;
          z-index: 15;
          background-color: #F1F5F9 !important;
          box-shadow: 0 -3px 6px rgba(0, 0, 0, 0.08);
          border-top: 2px solid #0F172A !important;
          border-bottom: 2px solid #0F172A !important;
        }

        @media print {
          @page {
            size: auto;
            margin: 6mm 8mm;
          }
          html, body {
            background: #FFFFFF !important;
            color: #0F172A !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            font-size: 8.5pt !important;
            width: 100% !important;
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .report-sheet {
            padding: 0 !important;
            box-sizing: border-box !important;
          }
          a::after {
            display: none !important;
            content: "" !important;
          }
          .no-print, .sidebar, .sidebar-overlay, .navbar, nav, header, aside, .toast-container, button {
            display: none !important;
            visibility: hidden !important;
          }
          .app-layout, .main-wrapper, .main-wrapper.collapsed, .main-content, .payment-report-container {
            margin: 0 !important;
            margin-left: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            box-shadow: none !important;
            border: none !important;
            background: #FFFFFF !important;
            display: block !important;
          }
          .table-responsive,
          .report-scroll-container {
            max-height: none !important;
            height: auto !important;
            overflow: visible !important;
            overflow-x: visible !important;
            overflow-y: visible !important;
            display: block !important;
          }
          .sheet-page-break {
            page-break-before: always !important;
            break-before: page !important;
          }
          .print-document-header {
            display: block !important;
            margin-bottom: 6px !important;
          }
          .print-signature-block {
            display: block !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            margin-top: 10px !important;
            padding-top: 4px !important;
          }
          .report-table-card {
            box-shadow: none !important;
            border: 1px solid #CBD5E1 !important;
            border-radius: 4px !important;
            margin-bottom: 4px !important;
            page-break-inside: auto !important;
            break-inside: auto !important;
            overflow: visible !important;
            background: #FFFFFF !important;
          }
          .report-table {
            width: 100% !important;
            border-collapse: collapse !important;
            border: 1px solid #94A3B8 !important;
          }
          .report-table thead {
            display: table-header-group !important;
          }
          .report-table thead th {
            position: static !important;
            box-shadow: none !important;
            background-color: #F1F5F9 !important;
            color: #0F172A !important;
            font-weight: 700 !important;
            border: 1px solid #CBD5E1 !important;
            border-bottom: 2px solid #0F172A !important;
            padding: 3.5px 6px !important;
            font-size: 8pt !important;
            text-transform: uppercase !important;
            letter-spacing: 0.3px !important;
            line-height: 1.15 !important;
          }
          .report-table td {
            background-color: #FFFFFF !important;
            color: #0F172A !important;
            border: 1px solid #E2E8F0 !important;
            padding: 3px 6px !important;
            font-size: 8pt !important;
            line-height: 1.15 !important;
          }
          .report-table tr:nth-child(even) td {
            background-color: #F8FAFC !important;
          }
          .report-table .report-total-row td {
            position: static !important;
            box-shadow: none !important;
            background-color: #F1F5F9 !important;
            color: #0F172A !important;
            font-weight: 800 !important;
            border-top: 2px solid #0F172A !important;
            border-bottom: 2px solid #0F172A !important;
            padding: 3.5px 6px !important;
            font-size: 8pt !important;
            line-height: 1.15 !important;
          }
          .report-table tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          /* Landscape Specific: ultra-compact row heights to fit on 210mm paper */
          @media (orientation: landscape) {
            .print-document-header {
              margin-bottom: 4px !important;
              padding-bottom: 4px !important;
            }
            .print-signature-block {
              margin-top: 8px !important;
              padding-top: 2px !important;
            }
            .report-table thead th {
              padding: 2.5px 6px !important;
              font-size: 7.5pt !important;
              line-height: 1.1 !important;
            }
            .report-table td {
              padding: 2px 6px !important;
              font-size: 7.5pt !important;
              line-height: 1.1 !important;
            }
            .report-table .report-total-row td {
              padding: 2.5px 6px !important;
              font-size: 8pt !important;
              line-height: 1.1 !important;
            }
          }
        }
      `}} />
    </div>
  );
}
