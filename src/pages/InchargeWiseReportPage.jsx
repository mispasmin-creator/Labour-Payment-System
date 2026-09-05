import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  Filter,
  Users,
  IndianRupee,
  Briefcase,
  Layers,
  Sparkles,
  RefreshCw,
  Download,
  Printer,
  Search,
  ChevronDown,
  TrendingUp,
  BarChart3,
  UserCheck,
  CheckCircle2,
  Clock,
  Building2,
  CalendarDays,
  FileSpreadsheet,
  RotateCcw,
  ArrowUpDown,
  FileText,
  Boxes,
  User
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { StatusBadge } from '../components/common/StatusBadge';
import { formatDate } from '../utils/dateUtils';
import {
  exportToCSV,
  formatInchargeWiseForExport,
  printInchargeWiseReport
} from '../utils/exportUtils';

export function InchargeWiseReportPage() {
  const navigate = useNavigate();
  const { entries, masterData, refreshData, syncing, loading } = useApp();

  // Top Filter state
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [inchargeFilter, setInchargeFilter] = useState('');
  const [shiftFilter, setShiftFilter] = useState('');
  const [firmFilter, setFirmFilter] = useState('');
  const [workTypeFilter, setWorkTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Section-Level Dedicated Labour Selection (affects ONLY Labour Wise Summary section)
  const [selectedSectionLabour, setSelectedSectionLabour] = useState('');

  // Active section tab / view filter for tables
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'incharge', 'labour', 'workType', 'dateShift', 'detailed'
  
  // Table search & sorting & pagination for main detailed table
  const [searchDetailed, setSearchDetailed] = useState('');
  const [sortField, setSortField] = useState('date');
  const [sortAsc, setSortAsc] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // Quick Date Range Handler
  const handleQuickDate = range => {
    const now = new Date();
    const formatYMD = d => d.toISOString().slice(0, 10);

    if (range === 'today') {
      const t = formatYMD(now);
      setDateFrom(t);
      setDateTo(t);
    } else if (range === 'yesterday') {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      const yStr = formatYMD(y);
      setDateFrom(yStr);
      setDateTo(yStr);
    } else if (range === 'this_week') {
      const start = new Date(now);
      const day = start.getDay() || 7; // Get Monday
      start.setDate(start.getDate() - day + 1);
      setDateFrom(formatYMD(start));
      setDateTo(formatYMD(now));
    } else if (range === 'this_month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      setDateFrom(formatYMD(start));
      setDateTo(formatYMD(now));
    } else if (range === 'all') {
      setDateFrom('');
      setDateTo('');
    }
  };

  // 1. Flatten work entries into individual Labour Record rows
  const allLabourRecords = useMemo(() => {
    const records = [];
    entries.forEach(entry => {
      // Extract labour names
      let names = [];
      if (Array.isArray(entry.labourNames) && entry.labourNames.length > 0) {
        names = entry.labourNames.filter(Boolean);
      } else if (typeof entry.labourNames === 'string' && entry.labourNames.trim()) {
        names = entry.labourNames.split(/[,;\n]+/).map(s => s.trim()).filter(Boolean);
      }

      // Check dynamic labour properties if still empty
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
      const rate = Number(entry.rate) || (entry.totalAmount ? Number(entry.totalAmount) / count : 0);
      const days = entry.days !== undefined && !isNaN(Number(entry.days)) ? Number(entry.days) : 1;
      const qtyMade = entry.qty !== undefined && !isNaN(Number(entry.qty)) ? Number(entry.qty) : (entry.qtyMade ? Number(entry.qtyMade) : 0);

      if (names.length === 0) {
        records.push({
          workId: entry.workId,
          date: entry.date,
          shift: entry.shift || 'General',
          incharge: entry.incharge || 'Unassigned',
          firmName: entry.firmName || entry.firm || '-',
          work: entry.work || 'General Work',
          workRemark: entry.workRemark || '',
          labourName: `Labourer (Count ${count})`,
          rate: rate,
          amount: Number(entry.totalAmount) || (count * rate),
          days: days,
          qtyMade: qtyMade,
          status: entry.status || 'Pending Verification',
          rawEntry: entry
        });
      } else {
        names.forEach(name => {
          records.push({
            workId: entry.workId,
            date: entry.date,
            shift: entry.shift || 'General',
            incharge: entry.incharge || 'Unassigned',
            firmName: entry.firmName || entry.firm || '-',
            work: entry.work || 'General Work',
            workRemark: entry.workRemark || '',
            labourName: name,
            rate: rate,
            amount: rate, // Per labour amount
            days: days,
            qtyMade: qtyMade,
            status: entry.status || 'Pending Verification',
            rawEntry: entry
          });
        });
      }
    });
    return records;
  }, [entries]);

  // Master option sets
  const dynamicIncharges = useMemo(() => {
    const fromRecords = Array.from(new Set(allLabourRecords.map(r => r.incharge).filter(Boolean)));
    const fromMaster = (masterData.incharges || []).filter(Boolean);
    return Array.from(new Set([...fromRecords, ...fromMaster])).sort();
  }, [allLabourRecords, masterData]);

  const dynamicShifts = useMemo(() => {
    const fromRecords = Array.from(new Set(allLabourRecords.map(r => r.shift).filter(Boolean)));
    const fromMaster = (masterData.shifts || []).filter(Boolean);
    return Array.from(new Set([...fromRecords, ...fromMaster, 'Shift 1', 'Shift 2', 'Shift 3', 'General'])).sort();
  }, [allLabourRecords, masterData]);

  const dynamicFirms = useMemo(() => {
    const fromRecords = Array.from(new Set(allLabourRecords.map(r => r.firmName).filter(f => f && f !== '-')));
    const fromMaster = (masterData.firmNames || []).filter(f => f && !f.toLowerCase().startsWith('firm '));
    return Array.from(new Set([...fromRecords, ...fromMaster])).sort();
  }, [allLabourRecords, masterData]);

  const dynamicWorkTypes = useMemo(() => {
    const fromRecords = Array.from(new Set(allLabourRecords.map(r => r.work).filter(Boolean)));
    const fromMaster = (masterData.workTypes || []).map(w => (typeof w === 'string' ? w : w.name)).filter(Boolean);
    return Array.from(new Set([...fromRecords, ...fromMaster])).sort();
  }, [allLabourRecords, masterData]);

  // Filtered Labour Records based on Top Filters
  const filteredRecords = useMemo(() => {
    return allLabourRecords.filter(r => {
      if (dateFrom && new Date(r.date) < new Date(dateFrom)) return false;
      if (dateTo && new Date(r.date) > new Date(dateTo)) return false;
      if (inchargeFilter && r.incharge !== inchargeFilter) return false;
      if (shiftFilter && r.shift !== shiftFilter) return false;
      if (firmFilter && r.firmName !== firmFilter) return false;
      if (workTypeFilter && r.work !== workTypeFilter) return false;
      if (statusFilter && r.status !== statusFilter) return false;
      return true;
    });
  }, [allLabourRecords, dateFrom, dateTo, inchargeFilter, shiftFilter, firmFilter, workTypeFilter, statusFilter]);

  // Unique Labourers in current filtered records (for Labour Wise Summary dropdown)
  const availableLabourNames = useMemo(() => {
    return Array.from(new Set(filteredRecords.map(r => r.labourName).filter(Boolean))).sort();
  }, [filteredRecords]);

  // 2. High Level KPI Summary Calculations (Page Level)
  const summaryKPI = useMemo(() => {
    const uniqueLabourNames = new Set(filteredRecords.map(r => r.labourName).filter(Boolean));
    const uniqueLabourers = uniqueLabourNames.size;
    const totalDays = filteredRecords.reduce((sum, r) => sum + (Number(r.days) || 1), 0);
    const totalAmount = filteredRecords.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    const avgPerLabour = uniqueLabourers > 0 ? Math.round(totalAmount / uniqueLabourers) : 0;
    const avgPerDay = totalDays > 0 ? Math.round(totalAmount / totalDays) : 0;
    
    // Distinct work entries
    const distinctWorkIds = new Set(filteredRecords.map(r => r.workId));
    const totalWorkEntries = distinctWorkIds.size;

    // Total Qty Made
    const workIdQtyMap = {};
    filteredRecords.forEach(r => {
      if (r.workId && workIdQtyMap[r.workId] === undefined) {
        workIdQtyMap[r.workId] = Number(r.qtyMade) || 0;
      }
    });
    const totalProductionQty = Object.values(workIdQtyMap).reduce((sum, q) => sum + q, 0);

    return {
      uniqueLabourers,
      totalDays,
      totalAmount,
      avgPerLabour,
      avgPerDay,
      totalWorkEntries,
      totalProductionQty
    };
  }, [filteredRecords]);

  // 3. Incharge Summary Table Aggregation
  const inchargeSummary = useMemo(() => {
    const map = {};
    filteredRecords.forEach(r => {
      const inc = r.incharge || 'Unassigned';
      if (!map[inc]) {
        map[inc] = {
          incharge: inc,
          labourersSet: new Set(),
          totalDays: 0,
          totalAmount: 0,
          workEntriesSet: new Set()
        };
      }
      map[inc].labourersSet.add(r.labourName);
      map[inc].totalDays += (Number(r.days) || 1);
      map[inc].totalAmount += (Number(r.amount) || 0);
      map[inc].workEntriesSet.add(r.workId);
    });

    return Object.values(map).map(item => {
      const uniqueLabourers = item.labourersSet.size;
      return {
        incharge: item.incharge,
        uniqueLabourers,
        totalDays: item.totalDays,
        totalAmount: item.totalAmount,
        avgPerLabour: uniqueLabourers > 0 ? Math.round(item.totalAmount / uniqueLabourers) : 0,
        avgPerDay: item.totalDays > 0 ? Math.round(item.totalAmount / item.totalDays) : 0,
        workEntries: item.workEntriesSet.size
      };
    }).sort((a, b) => b.totalAmount - a.totalAmount);
  }, [filteredRecords]);

  // 4. Labour Wise Summary Aggregation
  const labourSummary = useMemo(() => {
    const map = {};
    filteredRecords.forEach(r => {
      const name = r.labourName;
      if (!map[name]) {
        map[name] = {
          labourName: name,
          inchargesSet: new Set(),
          totalDays: 0,
          totalAmount: 0,
          workEntriesCount: 0,
          workTypesSet: new Set(),
          totalQty: 0
        };
      }
      if (r.incharge) map[name].inchargesSet.add(r.incharge);
      map[name].totalDays += (Number(r.days) || 1);
      map[name].totalAmount += (Number(r.amount) || 0);
      map[name].workEntriesCount += 1;
      map[name].totalQty += (Number(r.qtyMade) || 0);
      if (r.work) map[name].workTypesSet.add(r.work);
    });

    return Object.values(map).map(item => ({
      labourName: item.labourName,
      incharges: Array.from(item.inchargesSet),
      totalDays: item.totalDays,
      totalAmount: item.totalAmount,
      avgAmountPerDay: item.totalDays > 0 ? (item.totalAmount / item.totalDays).toFixed(2) : '0',
      workEntries: item.workEntriesCount,
      totalQty: item.totalQty,
      workTypes: Array.from(item.workTypesSet)
    })).sort((a, b) => b.totalAmount - a.totalAmount);
  }, [filteredRecords]);

  // Records specific to the selected labour in Labour Wise Summary section
  const selectedLabourDetailedRecords = useMemo(() => {
    if (!selectedSectionLabour) return [];
    return filteredRecords
      .filter(r => r.labourName === selectedSectionLabour)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [filteredRecords, selectedSectionLabour]);

  // Stats for selected labour in Labour Wise Summary section
  const selectedLabourStats = useMemo(() => {
    if (!selectedSectionLabour) return null;
    const records = selectedLabourDetailedRecords;
    const totalDays = records.reduce((sum, r) => sum + (Number(r.days) || 1), 0);
    const totalAmount = records.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    const totalQtyMade = records.reduce((sum, r) => sum + (Number(r.qtyMade) || 0), 0);
    const avgPerDay = totalDays > 0 ? (totalAmount / totalDays).toFixed(2) : '0';
    const distinctIncharges = Array.from(new Set(records.map(r => r.incharge).filter(Boolean)));
    const distinctWorkTypes = Array.from(new Set(records.map(r => r.work).filter(Boolean)));

    return {
      labourName: selectedSectionLabour,
      totalDays,
      totalAmount,
      avgPerDay,
      totalWorkEntries: records.length,
      totalQtyMade,
      incharges: distinctIncharges,
      workTypes: distinctWorkTypes
    };
  }, [selectedSectionLabour, selectedLabourDetailedRecords]);

  // 5. Date Wise Labour Summary Aggregation
  const dateWiseSummary = useMemo(() => {
    const map = {};
    filteredRecords.forEach(r => {
      const key = `${r.date}_${r.shift}`;
      if (!map[key]) {
        map[key] = {
          date: r.date,
          shift: r.shift,
          labourersSet: new Set(),
          totalDays: 0,
          totalAmount: 0,
          workIds: new Set(),
          workIdQty: {}
        };
      }
      map[key].labourersSet.add(r.labourName);
      map[key].totalDays += (Number(r.days) || 1);
      map[key].totalAmount += (Number(r.amount) || 0);
      map[key].workIds.add(r.workId);
      if (map[key].workIdQty[r.workId] === undefined) {
        map[key].workIdQty[r.workId] = Number(r.qtyMade) || 0;
      }
    });

    return Object.values(map).map(item => {
      const qtyMade = Object.values(item.workIdQty).reduce((sum, q) => sum + q, 0);
      return {
        date: item.date,
        shift: item.shift,
        uniqueLabourers: item.labourersSet.size,
        totalDays: item.totalDays,
        totalAmount: item.totalAmount,
        qtyMade,
        workEntries: item.workIds.size
      };
    }).sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [filteredRecords]);

  // 6. Shift Wise Labour Summary Aggregation
  const shiftWiseSummary = useMemo(() => {
    const map = {};
    filteredRecords.forEach(r => {
      const shift = r.shift || 'General';
      if (!map[shift]) {
        map[shift] = {
          shift,
          labourersSet: new Set(),
          totalDays: 0,
          totalAmount: 0,
          workIdQty: {}
        };
      }
      map[shift].labourersSet.add(r.labourName);
      map[shift].totalDays += (Number(r.days) || 1);
      map[shift].totalAmount += (Number(r.amount) || 0);
      if (map[shift].workIdQty[r.workId] === undefined) {
        map[shift].workIdQty[r.workId] = Number(r.qtyMade) || 0;
      }
    });

    return Object.values(map).map(item => {
      const uniqueLabourers = item.labourersSet.size;
      const qtyMade = Object.values(item.workIdQty).reduce((sum, q) => sum + q, 0);
      return {
        shift: item.shift,
        uniqueLabourers,
        totalDays: item.totalDays,
        totalAmount: item.totalAmount,
        qtyMade,
        avgAmountPerLabour: uniqueLabourers > 0 ? Math.round(item.totalAmount / uniqueLabourers) : 0
      };
    }).sort((a, b) => b.totalAmount - a.totalAmount);
  }, [filteredRecords]);

  // 7. Type of Work Analysis Aggregation
  const workTypeAnalysis = useMemo(() => {
    const map = {};
    filteredRecords.forEach(r => {
      const work = r.work || 'General';
      if (!map[work]) {
        map[work] = {
          workType: work,
          labourersSet: new Set(),
          totalDays: 0,
          totalAmount: 0,
          workIdQty: {}
        };
      }
      map[work].labourersSet.add(r.labourName);
      map[work].totalDays += (Number(r.days) || 1);
      map[work].totalAmount += (Number(r.amount) || 0);
      if (map[work].workIdQty[r.workId] === undefined) {
        map[work].workIdQty[r.workId] = Number(r.qtyMade) || 0;
      }
    });

    return Object.values(map).map(item => {
      const labourCount = item.labourersSet.size;
      const qtyMade = Object.values(item.workIdQty).reduce((sum, q) => sum + q, 0);
      return {
        workType: item.workType,
        labourCount,
        totalDays: item.totalDays,
        totalAmount: item.totalAmount,
        qtyMade,
        avgQtyPerLabour: labourCount > 0 ? (qtyMade / labourCount).toFixed(1) : '0',
        avgAmountPerLabour: labourCount > 0 ? Math.round(item.totalAmount / labourCount) : 0
      };
    }).sort((a, b) => b.totalAmount - a.totalAmount);
  }, [filteredRecords]);

  // 8. Work Type + Date Analysis Aggregation
  const workTypeDateAnalysis = useMemo(() => {
    const map = {};
    filteredRecords.forEach(r => {
      const key = `${r.date}_${r.shift}_${r.work}`;
      if (!map[key]) {
        map[key] = {
          date: r.date,
          shift: r.shift,
          workType: r.work,
          labourersSet: new Set(),
          totalDays: 0,
          totalAmount: 0,
          workIdQty: {}
        };
      }
      map[key].labourersSet.add(r.labourName);
      map[key].totalDays += (Number(r.days) || 1);
      map[key].totalAmount += (Number(r.amount) || 0);
      if (map[key].workIdQty[r.workId] === undefined) {
        map[key].workIdQty[r.workId] = Number(r.qtyMade) || 0;
      }
    });

    return Object.values(map).map(item => {
      const qtyMade = Object.values(item.workIdQty).reduce((sum, q) => sum + q, 0);
      return {
        date: item.date,
        shift: item.shift,
        workType: item.workType,
        labourCount: item.labourersSet.size,
        totalDays: item.totalDays,
        qtyMade,
        totalAmount: item.totalAmount
      };
    }).sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [filteredRecords]);

  // 9. Sorted & Paginated Detailed Table Records
  const searchedAndSortedDetailedRecords = useMemo(() => {
    let list = [...filteredRecords];
    if (searchDetailed.trim()) {
      const q = searchDetailed.toLowerCase().trim();
      list = list.filter(r =>
        r.labourName.toLowerCase().includes(q) ||
        r.incharge.toLowerCase().includes(q) ||
        r.firmName.toLowerCase().includes(q) ||
        r.work.toLowerCase().includes(q) ||
        (r.workRemark && r.workRemark.toLowerCase().includes(q)) ||
        (r.workId && r.workId.toLowerCase().includes(q))
      );
    }

    list.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];
      if (sortField === 'date') {
        valA = new Date(valA).getTime();
        valB = new Date(valB).getTime();
      } else if (typeof valA === 'string') {
        valA = valA.toLowerCase();
        valB = String(valB || '').toLowerCase();
      }
      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });

    return list;
  }, [filteredRecords, searchDetailed, sortField, sortAsc]);

  const totalPages = Math.ceil(searchedAndSortedDetailedRecords.length / pageSize) || 1;
  const paginatedDetailedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return searchedAndSortedDetailedRecords.slice(start, start + pageSize);
  }, [searchedAndSortedDetailedRecords, currentPage]);

  const handleSort = field => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  // Export handlers
  const handleExportDetailedCSV = () => {
    const formatted = formatInchargeWiseForExport(filteredRecords);
    exportToCSV('Incharge_Wise_Labour_Detailed_Report', formatted);
  };

  const handleExportLabourSummaryCSV = () => {
    if (selectedSectionLabour) {
      const formatted = selectedLabourDetailedRecords.map((r, idx) => ({
        'Sr No': idx + 1,
        'Date': r.date,
        'Labour Name': r.labourName,
        'Incharge': r.incharge,
        'Shift': r.shift,
        'Firm': r.firmName,
        'Work Type': r.work,
        'Work Remark': r.workRemark || '—',
        'Days': r.days,
        'Amount (₹)': r.amount,
        'Qty Made': r.qtyMade || 0,
        'Status': r.status
      }));
      exportToCSV(`${selectedSectionLabour}_DateWise_Report`, formatted);
    } else {
      const formatted = labourSummary.map((l, idx) => ({
        'Sr No': idx + 1,
        'Labour Name': l.labourName,
        'Total Days': l.totalDays,
        'Total Amount (₹)': l.totalAmount,
        'Avg Amount / Day (₹)': l.avgAmountPerDay,
        'Work Entries': l.workEntries,
        'Work Types': l.workTypes.join('; ')
      }));
      exportToCSV('Labour_Summary_Report', formatted);
    }
  };

  const handleExportInchargeSummaryCSV = () => {
    const formatted = inchargeSummary.map((inc, idx) => ({
      'Sr No': idx + 1,
      'Incharge': inc.incharge,
      'Unique Labourers': inc.uniqueLabourers,
      'Total Days': inc.totalDays,
      'Total Amount (₹)': inc.totalAmount,
      'Avg Amount / Labour (₹)': inc.avgPerLabour,
      'Avg Amount / Day (₹)': inc.avgPerDay,
      'Work Entries': inc.workEntries
    }));
    exportToCSV('Incharge_Summary_Report', formatted);
  };

  const handleExportWorkTypeSummaryCSV = () => {
    const formatted = workTypeAnalysis.map((w, idx) => ({
      'Sr No': idx + 1,
      'Work Type': w.workType,
      'Labour Count': w.labourCount,
      'Total Days': w.totalDays,
      'Total Amount (₹)': w.totalAmount,
      'Qty Made': w.qtyMade,
      'Avg Qty / Labour': w.avgQtyPerLabour,
      'Avg Amount / Labour (₹)': w.avgAmountPerLabour
    }));
    exportToCSV('Work_Type_Analysis_Report', formatted);
  };

  const handlePrint = () => {
    printInchargeWiseReport({
      filters: {
        dateFrom,
        dateTo,
        incharge: inchargeFilter,
        shift: shiftFilter,
        firm: firmFilter,
        labour: selectedSectionLabour,
        workType: workTypeFilter
      },
      summary: summaryKPI,
      inchargeSummary,
      labourSummary,
      workTypeSummary: workTypeAnalysis,
      detailedRows: filteredRecords
    });
  };

  const clearAllFilters = () => {
    setDateFrom('');
    setDateTo('');
    setInchargeFilter('');
    setShiftFilter('');
    setFirmFilter('');
    setWorkTypeFilter('');
    setStatusFilter('');
    setSelectedSectionLabour('');
    setSearchDetailed('');
    setCurrentPage(1);
  };

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', paddingBottom: 40 }}>
      {/* Top Header Row */}
      <div style={{
        marginBottom: 20,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 14
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button
            onClick={() => navigate('/reports')}
            className="btn btn-secondary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
          >
            <ArrowLeft size={16} />
            <span>Back to Reports & Export</span>
          </button>
          <div>
            <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 10, margin: 0 }}>
              <span>Incharge Wise Labour Report</span>
              <span className="badge badge-emerald" style={{ fontSize: '0.8rem', padding: '4px 10px' }}>
                MIS Analytics
              </span>
            </h1>
            <p style={{ fontSize: '0.82rem', color: '#64748B', margin: '4px 0 0 0' }}>
              Supervisor-wise labour deployments, working days, production output & payroll payments
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            onClick={refreshData}
            disabled={syncing}
            className="btn btn-outline-green btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            title="Refresh & Synchronize Live Google Sheet Data"
          >
            <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
            <span>{syncing ? 'Syncing...' : 'Sync Data'}</span>
          </button>

          <button
            onClick={handleExportDetailedCSV}
            className="btn btn-outline-green btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            title="Export Current Filtered Detailed Records to CSV"
          >
            <Download size={14} />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handlePrint}
            className="btn btn-primary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            title="Print Ready A4 Report or Download PDF"
          >
            <Printer size={14} />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Top Filter Control Box */}
      <div className="card" style={{ marginBottom: 20, padding: '18px 20px', background: '#FFFFFF', border: '1px solid #E2E8F0', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: '0.92rem', color: '#0F172A' }}>
            <Filter size={16} color="#059669" />
            <span>Filter Controls</span>
          </div>

          {/* Quick Date Range Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 600 }}>Quick Range:</span>
            {['today', 'yesterday', 'this_week', 'this_month', 'all'].map(r => (
              <button
                key={r}
                onClick={() => handleQuickDate(r)}
                className="btn btn-secondary btn-sm"
                style={{
                  fontSize: '0.75rem',
                  padding: '4px 10px',
                  borderRadius: 6,
                  textTransform: 'capitalize'
                }}
              >
                {r.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Filter Form Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
          gap: 12,
          alignItems: 'flex-end'
        }}>
          <div>
            <label className="form-label" style={{ fontSize: '0.78rem' }}>Date From</label>
            <input
              type="date"
              className="form-input"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
            />
          </div>

          <div>
            <label className="form-label" style={{ fontSize: '0.78rem' }}>Date To</label>
            <input
              type="date"
              className="form-input"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
            />
          </div>

          <div>
            <label className="form-label" style={{ fontSize: '0.78rem' }}>Supervisor / Incharge</label>
            <select
              className="form-select"
              value={inchargeFilter}
              onChange={e => setInchargeFilter(e.target.value)}
            >
              <option value="">All Incharges</option>
              {dynamicIncharges.map(inc => (
                <option key={inc} value={inc}>{inc}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label" style={{ fontSize: '0.78rem' }}>Shift</label>
            <select
              className="form-select"
              value={shiftFilter}
              onChange={e => setShiftFilter(e.target.value)}
            >
              <option value="">All Shifts</option>
              {dynamicShifts.map(sh => (
                <option key={sh} value={sh}>{sh}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label" style={{ fontSize: '0.78rem' }}>Firm Name</label>
            <select
              className="form-select"
              value={firmFilter}
              onChange={e => setFirmFilter(e.target.value)}
            >
              <option value="">All Firms</option>
              {dynamicFirms.map(firm => (
                <option key={firm} value={firm}>{firm}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label" style={{ fontSize: '0.78rem' }}>Type of Work</label>
            <select
              className="form-select"
              value={workTypeFilter}
              onChange={e => setWorkTypeFilter(e.target.value)}
            >
              <option value="">All Work Types</option>
              {dynamicWorkTypes.map(work => (
                <option key={work} value={work}>{work}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label" style={{ fontSize: '0.78rem' }}>Status / Stage</label>
            <select
              className="form-select"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="">All Stages</option>
              <option value="Pending Verification">Pending Verification</option>
              <option value="Verified (Pending Approval)">Verified (Pending Approval)</option>
              <option value="Approved (Pending Payment)">Approved (Pending Payment)</option>
              <option value="Paid (Pending Tally)">Paid (Pending Tally)</option>
              <option value="Tally Complete">Tally Complete</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={clearAllFilters}
              className="btn btn-secondary"
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              title="Reset all active filters"
            >
              <RotateCcw size={14} />
              <span>Reset</span>
            </button>
          </div>
        </div>
      </div>

      {/* Summary KPI Ribbon */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
        gap: 12,
        marginBottom: 24
      }}>
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: '14px 16px', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Total Labourers</span>
            <Users size={16} color="#059669" />
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0F172A', marginTop: 4 }}>
            {summaryKPI.uniqueLabourers} <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748B' }}>unique</span>
          </div>
        </div>

        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: '14px 16px', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Total Labour Days</span>
            <CalendarDays size={16} color="#059669" />
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0F172A', marginTop: 4 }}>
            {summaryKPI.totalDays} <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748B' }}>days</span>
          </div>
        </div>

        <div style={{ background: '#FFFFFF', border: '1px solid #BBF7D0', borderRadius: 12, padding: '14px 16px', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#065F46', textTransform: 'uppercase' }}>Total Amount</span>
            <IndianRupee size={16} color="#059669" />
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#059669', marginTop: 4 }}>
            ₹{summaryKPI.totalAmount.toLocaleString('en-IN')}
          </div>
        </div>

        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: '14px 16px', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Avg / Labour</span>
            <UserCheck size={16} color="#059669" />
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#047857', marginTop: 4 }}>
            ₹{summaryKPI.avgPerLabour.toLocaleString('en-IN')}
          </div>
        </div>

        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: '14px 16px', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Avg / Day</span>
            <TrendingUp size={16} color="#059669" />
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#047857', marginTop: 4 }}>
            ₹{summaryKPI.avgPerDay.toLocaleString('en-IN')}
          </div>
        </div>

        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: '14px 16px', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Work Orders</span>
            <Briefcase size={16} color="#059669" />
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0F172A', marginTop: 4 }}>
            {summaryKPI.totalWorkEntries} <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748B' }}>entries</span>
          </div>
        </div>

        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: '14px 16px', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Production Qty</span>
            <Boxes size={16} color="#059669" />
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0F172A', marginTop: 4 }}>
            {summaryKPI.totalProductionQty.toLocaleString('en-IN')} <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748B' }}>units</span>
          </div>
        </div>
      </div>

      {/* Visual Analytics Charts Section */}
      <div className="card" style={{ marginBottom: 24, padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, fontSize: '1.05rem', color: '#0F172A' }}>
            <BarChart3 size={18} color="#059669" />
            <span>Interactive Visual Analytics</span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 18 }}>
          {/* Chart 1: Labour Payment by Incharge */}
          <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: '16px' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1E293B', marginBottom: 12, display: 'flex', justifyContent: 'space-between' }}>
              <span>Labour Payment by Incharge (₹)</span>
              <span style={{ color: '#059669', fontSize: '0.75rem' }}>Top Supervisors</span>
            </div>
            {inchargeSummary.length === 0 ? (
              <div style={{ color: '#94A3B8', fontSize: '0.82rem', padding: '20px 0', textAlign: 'center' }}>No incharge data available</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {inchargeSummary.slice(0, 5).map(inc => {
                  const maxVal = inchargeSummary[0]?.totalAmount || 1;
                  const pct = Math.min(100, Math.round((inc.totalAmount / maxVal) * 100));
                  return (
                    <div key={inc.incharge}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: 3 }}>
                        <span style={{ fontWeight: 600, color: '#334155' }}>{inc.incharge}</span>
                        <span style={{ fontWeight: 700, color: '#059669' }}>₹{inc.totalAmount.toLocaleString('en-IN')}</span>
                      </div>
                      <div style={{ background: '#E2E8F0', height: 8, borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg, #10B981, #059669)', borderRadius: 4 }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Chart 2: Labour Count by Work Type */}
          <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: '16px' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1E293B', marginBottom: 12, display: 'flex', justifyContent: 'space-between' }}>
              <span>Labour Count by Work Activity</span>
              <span style={{ color: '#047857', fontSize: '0.75rem' }}>Unique Workers</span>
            </div>
            {workTypeAnalysis.length === 0 ? (
              <div style={{ color: '#94A3B8', fontSize: '0.82rem', padding: '20px 0', textAlign: 'center' }}>No work type data available</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {workTypeAnalysis.slice(0, 5).map(w => {
                  const maxCount = Math.max(...workTypeAnalysis.map(x => x.labourCount), 1);
                  const pct = Math.min(100, Math.round((w.labourCount / maxCount) * 100));
                  return (
                    <div key={w.workType}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: 3 }}>
                        <span style={{ fontWeight: 600, color: '#334155' }}>{w.workType}</span>
                        <span style={{ fontWeight: 700, color: '#047857' }}>{w.labourCount} persons ({w.totalDays} days)</span>
                      </div>
                      <div style={{ background: '#E2E8F0', height: 8, borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg, #34D399, #059669)', borderRadius: 4 }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Chart 3: Production Qty by Work Type */}
          <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: '16px' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1E293B', marginBottom: 12, display: 'flex', justifyContent: 'space-between' }}>
              <span>Production Quantity by Work Type</span>
              <span style={{ color: '#059669', fontSize: '0.75rem' }}>Output Volume</span>
            </div>
            {workTypeAnalysis.filter(w => w.qtyMade > 0).length === 0 ? (
              <div style={{ color: '#94A3B8', fontSize: '0.82rem', padding: '20px 0', textAlign: 'center' }}>No quantity records in selection</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {workTypeAnalysis.filter(w => w.qtyMade > 0).slice(0, 5).map(w => {
                  const maxQty = Math.max(...workTypeAnalysis.map(x => x.qtyMade), 1);
                  const pct = Math.min(100, Math.round((w.qtyMade / maxQty) * 100));
                  return (
                    <div key={w.workType}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: 3 }}>
                        <span style={{ fontWeight: 600, color: '#334155' }}>{w.workType}</span>
                        <span style={{ fontWeight: 700, color: '#047857' }}>{w.qtyMade} units</span>
                      </div>
                      <div style={{ background: '#E2E8F0', height: 8, borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg, #6EE7B7, #047857)', borderRadius: 4 }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Chart 4: Daily Labour Payment Trend */}
          <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: '16px' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1E293B', marginBottom: 12, display: 'flex', justifyContent: 'space-between' }}>
              <span>Daily Payment Breakdown</span>
              <span style={{ color: '#059669', fontSize: '0.75rem' }}>Timeline</span>
            </div>
            {dateWiseSummary.length === 0 ? (
              <div style={{ color: '#94A3B8', fontSize: '0.82rem', padding: '20px 0', textAlign: 'center' }}>No daily records available</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {dateWiseSummary.slice(0, 5).map(d => {
                  const maxAmt = Math.max(...dateWiseSummary.map(x => x.totalAmount), 1);
                  const pct = Math.min(100, Math.round((d.totalAmount / maxAmt) * 100));
                  return (
                    <div key={`${d.date}_${d.shift}`}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: 3 }}>
                        <span style={{ fontWeight: 600, color: '#334155' }}>{formatDate(d.date)} ({d.shift})</span>
                        <span style={{ fontWeight: 700, color: '#059669' }}>₹{d.totalAmount.toLocaleString('en-IN')}</span>
                      </div>
                      <div style={{ background: '#E2E8F0', height: 8, borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg, #10B981, #065F46)', borderRadius: 4 }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Tab Bar for Reporting Tables */}
      <div style={{
        display: 'flex',
        gap: 8,
        borderBottom: '2px solid #E2E8F0',
        paddingBottom: 4,
        marginBottom: 20,
        overflowX: 'auto'
      }}>
        {[
          { id: 'all', label: 'All Modules' },
          { id: 'incharge', label: `Incharge Summary (${inchargeSummary.length})` },
          { id: 'labour', label: `Labour Wise Summary (${labourSummary.length})` },
          { id: 'workType', label: `Type of Work Analysis (${workTypeAnalysis.length})` },
          { id: 'dateShift', label: `Date & Shift Analysis (${dateWiseSummary.length})` },
          { id: 'detailed', label: `Detailed Entries (${filteredRecords.length})` }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '8px 16px',
              border: 'none',
              background: activeTab === tab.id ? '#ECFDF5' : 'transparent',
              color: activeTab === tab.id ? '#047857' : '#64748B',
              fontWeight: 700,
              fontSize: '0.86rem',
              borderRadius: '8px 8px 0 0',
              borderBottom: activeTab === tab.id ? '2px solid #059669' : '2px solid transparent',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Loading Skeleton Indicator */}
      {loading && (
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <div className="animate-spin" style={{ display: 'inline-block', marginBottom: 12 }}>
            <RefreshCw size={28} color="#059669" />
          </div>
          <div style={{ color: '#64748B', fontWeight: 600 }}>Loading and reconciling labour payment records...</div>
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredRecords.length === 0 && (
        <div className="empty-state" style={{ background: '#FFFFFF', padding: '48px 24px', borderRadius: 12, border: '1px solid #E2E8F0', textAlign: 'center' }}>
          <div className="empty-state-icon" style={{ display: 'inline-flex', padding: 16, borderRadius: '50%', background: '#F1F5F9', color: '#64748B', marginBottom: 12 }}>
            <Users size={36} />
          </div>
          <h3 className="empty-state-title" style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0F172A' }}>No Labour Records Found</h3>
          <p className="empty-state-desc" style={{ color: '#64748B', maxWidth: 460, margin: '8px auto 16px' }}>
            No records matched your selected filter combination. Try adjusting the date range, Incharge, Shift or Work Type filter.
          </p>
          <button onClick={clearAllFilters} className="btn btn-outline-green btn-sm">
            Reset All Filters
          </button>
        </div>
      )}

      {!loading && filteredRecords.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Section 1: Incharge Summary Table */}
          {(activeTab === 'all' || activeTab === 'incharge') && (
            <div className="card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                    1. Incharge Summary
                  </h3>
                  <div style={{ fontSize: '0.78rem', color: '#64748B' }}>
                    Deployment metrics and total payment aggregated by Supervisor / Incharge
                  </div>
                </div>
                <button onClick={handleExportInchargeSummaryCSV} className="btn btn-secondary btn-sm">
                  <Download size={14} />
                  <span>Export Incharge CSV</span>
                </button>
              </div>

              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Incharge / Supervisor</th>
                      <th style={{ textAlign: 'right' }}>Total Labourers</th>
                      <th style={{ textAlign: 'right' }}>Total Days</th>
                      <th style={{ textAlign: 'right' }}>Total Amount</th>
                      <th style={{ textAlign: 'right' }}>Avg Amount / Labour</th>
                      <th style={{ textAlign: 'right' }}>Avg Amount / Day</th>
                      <th style={{ textAlign: 'right' }}>Work Orders</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inchargeSummary.map(inc => (
                      <tr key={inc.incharge} style={{ cursor: 'pointer' }} onClick={() => setInchargeFilter(inc.incharge)}>
                        <td style={{ fontWeight: 700, color: '#0F172A' }}>
                          <span style={{ color: '#059669', marginRight: 6 }}>●</span>
                          {inc.incharge}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>{inc.uniqueLabourers}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>{inc.totalDays}</td>
                        <td style={{ textAlign: 'right', fontWeight: 800, color: '#059669' }}>
                          ₹{inc.totalAmount.toLocaleString('en-IN')}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>
                          ₹{inc.avgPerLabour.toLocaleString('en-IN')}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>
                          ₹{inc.avgPerDay.toLocaleString('en-IN')}
                        </td>
                        <td style={{ textAlign: 'right', color: '#64748B' }}>{inc.workEntries}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: '#F8FAFC', fontWeight: 800 }}>
                      <td>Grand Total</td>
                      <td style={{ textAlign: 'right' }}>{summaryKPI.uniqueLabourers}</td>
                      <td style={{ textAlign: 'right' }}>{summaryKPI.totalDays}</td>
                      <td style={{ textAlign: 'right', color: '#059669' }}>₹{summaryKPI.totalAmount.toLocaleString('en-IN')}</td>
                      <td style={{ textAlign: 'right' }}>₹{summaryKPI.avgPerLabour.toLocaleString('en-IN')}</td>
                      <td style={{ textAlign: 'right' }}>₹{summaryKPI.avgPerDay.toLocaleString('en-IN')}</td>
                      <td style={{ textAlign: 'right' }}>{summaryKPI.totalWorkEntries}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* Section 2: Labour Wise Summary Section (UPDATED with Dedicated Labour Dropdown & Detailed History) */}
          {(activeTab === 'all' || activeTab === 'labour') && (
            <div className="card" style={{ padding: '20px', border: selectedSectionLabour ? '1.5px solid #10B981' : '1px solid #E2E8F0' }}>
              {/* Section Header with Dedicated Labour Dropdown */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 16,
                flexWrap: 'wrap',
                gap: 12
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                      2. Labour Wise Summary
                    </h3>
                    {selectedSectionLabour && (
                      <span className="badge badge-emerald" style={{ fontSize: '0.75rem', padding: '3px 8px' }}>
                        Single Worker Detailed View
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: 2 }}>
                    {selectedSectionLabour
                      ? `Complete date-wise working history and payments for ${selectedSectionLabour}`
                      : 'Earnings and working days per individual labourer (Select from dropdown or click any row)'}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  {/* Select Labour Dropdown (Local to Labour Wise Summary) */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1E293B', whiteSpace: 'nowrap' }}>
                      Select Labour:
                    </label>
                    <select
                      className="form-select"
                      style={{
                        minWidth: 180,
                        maxWidth: 240,
                        padding: '6px 12px',
                        fontSize: '0.84rem',
                        fontWeight: selectedSectionLabour ? 700 : 500,
                        borderColor: selectedSectionLabour ? '#059669' : '#CBD5E1',
                        background: selectedSectionLabour ? '#F0FDF4' : '#FFFFFF'
                      }}
                      value={selectedSectionLabour}
                      onChange={e => setSelectedSectionLabour(e.target.value)}
                    >
                      <option value="">All Labourers ({availableLabourNames.length})</option>
                      {availableLabourNames.map(name => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                    </select>
                  </div>

                  {selectedSectionLabour && (
                    <button
                      onClick={() => setSelectedSectionLabour('')}
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '0.75rem' }}
                      title="Return to full summary of all labourers"
                    >
                      ← View All Labourers
                    </button>
                  )}

                  <button onClick={handleExportLabourSummaryCSV} className="btn btn-secondary btn-sm">
                    <Download size={14} />
                    <span>{selectedSectionLabour ? 'Export Date-wise CSV' : 'Export Labour CSV'}</span>
                  </button>
                </div>
              </div>

              {/* View A: Single Selected Labour Detailed View */}
              {selectedSectionLabour && selectedLabourStats ? (
                <div>
                  {/* Compact Profile Header Card */}
                  <div style={{
                    marginBottom: 16,
                    padding: '16px 20px',
                    background: 'linear-gradient(135deg, #ECFDF5 0%, #FFFFFF 100%)',
                    border: '1px solid #A7F3D0',
                    borderRadius: 10,
                    boxShadow: 'var(--shadow-sm)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                          width: 44,
                          height: 44,
                          borderRadius: '50%',
                          background: '#059669',
                          color: '#FFFFFF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 800,
                          fontSize: '1.2rem'
                        }}>
                          {selectedLabourStats.labourName.charAt(0)}
                        </div>
                        <div>
                          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#064E3B' }}>
                            Labour: {selectedLabourStats.labourName}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: '#047857', fontWeight: 600 }}>
                            Supervising Incharge(s): {selectedLabourStats.incharges.join(', ') || 'N/A'} • Works: {selectedLabourStats.workTypes.join(', ') || 'N/A'}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                        <div style={{ textAlign: 'center', background: '#FFFFFF', padding: '6px 14px', borderRadius: 8, border: '1px solid #BBF7D0' }}>
                          <div style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Total Days</div>
                          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A' }}>{selectedLabourStats.totalDays} Days</div>
                        </div>

                        <div style={{ textAlign: 'center', background: '#FFFFFF', padding: '6px 14px', borderRadius: 8, border: '1px solid #BBF7D0' }}>
                          <div style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Total Amount</div>
                          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#059669' }}>₹{Number(selectedLabourStats.totalAmount).toLocaleString('en-IN')}</div>
                        </div>

                        <div style={{ textAlign: 'center', background: '#FFFFFF', padding: '6px 14px', borderRadius: 8, border: '1px solid #BBF7D0' }}>
                          <div style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Avg Amount / Day</div>
                          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#047857' }}>₹{selectedLabourStats.avgPerDay}</div>
                        </div>

                        <div style={{ textAlign: 'center', background: '#FFFFFF', padding: '6px 14px', borderRadius: 8, border: '1px solid #BBF7D0' }}>
                          <div style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Work Entries</div>
                          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A' }}>{selectedLabourStats.totalWorkEntries}</div>
                        </div>

                        <div style={{ textAlign: 'center', background: '#FFFFFF', padding: '6px 14px', borderRadius: 8, border: '1px solid #BBF7D0' }}>
                          <div style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Total Qty Made</div>
                          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A' }}>{selectedLabourStats.totalQtyMade}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Selected Labour Date-wise Detailed Table */}
                  <div className="table-container">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Incharge</th>
                          <th>Shift</th>
                          <th>Firm</th>
                          <th>Work Type</th>
                          <th>Work Remark</th>
                          <th style={{ textAlign: 'right' }}>Days</th>
                          <th style={{ textAlign: 'right' }}>Amount</th>
                          <th style={{ textAlign: 'right' }}>Qty Made</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedLabourDetailedRecords.map((r, idx) => (
                          <tr key={`${r.workId}_${idx}`}>
                            <td style={{ fontWeight: 700, color: '#0F172A' }}>
                              {formatDate(r.date)}
                            </td>
                            <td style={{ fontWeight: 600, color: '#065F46' }}>
                              <span style={{ color: '#059669', marginRight: 4 }}>●</span>
                              {r.incharge}
                            </td>
                            <td>{r.shift || '-'}</td>
                            <td>
                              <span className="badge" style={{ background: '#F1F5F9', color: '#334155', fontSize: '0.75rem' }}>
                                {r.firmName || '-'}
                              </span>
                            </td>
                            <td>
                              <span className="badge" style={{ background: '#ECFDF5', color: '#065F46', fontSize: '0.75rem', fontWeight: 600 }}>
                                {r.work}
                              </span>
                            </td>
                            <td>
                              <div
                                style={{
                                  maxWidth: 180,
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  color: r.workRemark ? '#334155' : '#94A3B8',
                                  fontStyle: r.workRemark ? 'normal' : 'italic'
                                }}
                                title={r.workRemark || 'No remark'}
                              >
                                {r.workRemark || '—'}
                              </div>
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: 600 }}>{r.days}</td>
                            <td style={{ textAlign: 'right', fontWeight: 800, color: '#059669' }}>
                              ₹{Number(r.amount).toLocaleString('en-IN')}
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: 600 }}>{r.qtyMade || 0}</td>
                            <td>
                              <StatusBadge status={r.status} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr style={{ background: '#F8FAFC', fontWeight: 800 }}>
                          <td colSpan={6}>Total for {selectedLabourStats.labourName}</td>
                          <td style={{ textAlign: 'right' }}>{selectedLabourStats.totalDays}</td>
                          <td style={{ textAlign: 'right', color: '#059669' }}>₹{Number(selectedLabourStats.totalAmount).toLocaleString('en-IN')}</td>
                          <td style={{ textAlign: 'right' }}>{selectedLabourStats.totalQtyMade}</td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              ) : (
                /* View B: All Labourers Normal Summary Table */
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th style={{ width: 50 }}>Sr. No.</th>
                        <th>Labour Name</th>
                        <th style={{ textAlign: 'right' }}>Total Days</th>
                        <th style={{ textAlign: 'right' }}>Total Amount</th>
                        <th style={{ textAlign: 'right' }}>Avg Amount / Day</th>
                        <th style={{ textAlign: 'right' }}>Work Entries</th>
                      </tr>
                    </thead>
                    <tbody>
                      {labourSummary.map((l, idx) => (
                        <tr
                          key={l.labourName}
                          onClick={() => setSelectedSectionLabour(l.labourName)}
                          style={{ cursor: 'pointer' }}
                          title={`Click to view date-wise history for ${l.labourName}`}
                        >
                          <td style={{ color: '#64748B', fontWeight: 600 }}>{idx + 1}</td>
                          <td style={{ fontWeight: 700, color: '#0F172A' }}>
                            <span style={{ color: '#059669', textDecoration: 'underline' }}>
                              {l.labourName}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>{l.totalDays}</td>
                          <td style={{ textAlign: 'right', fontWeight: 800, color: '#059669' }}>
                            ₹{Number(l.totalAmount).toLocaleString('en-IN')}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>
                            ₹{Number(l.avgAmountPerDay).toLocaleString('en-IN')}
                          </td>
                          <td style={{ textAlign: 'right', color: '#64748B' }}>{l.workEntries}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ background: '#F8FAFC', fontWeight: 800 }}>
                        <td colSpan={2}>Grand Total ({labourSummary.length} Labourers)</td>
                        <td style={{ textAlign: 'right' }}>{summaryKPI.totalDays}</td>
                        <td style={{ textAlign: 'right', color: '#059669' }}>₹{summaryKPI.totalAmount.toLocaleString('en-IN')}</td>
                        <td style={{ textAlign: 'right' }}>₹{summaryKPI.avgPerDay.toLocaleString('en-IN')}</td>
                        <td style={{ textAlign: 'right' }}>{filteredRecords.length}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Section 3: Type of Work Analysis */}
          {(activeTab === 'all' || activeTab === 'workType') && (
            <div className="card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                    3. Type of Work Analysis
                  </h3>
                  <div style={{ fontSize: '0.78rem', color: '#64748B' }}>
                    Labour count, production volume, days and payment per work activity
                  </div>
                </div>
                <button onClick={handleExportWorkTypeSummaryCSV} className="btn btn-secondary btn-sm">
                  <Download size={14} />
                  <span>Export Work Type CSV</span>
                </button>
              </div>

              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Work Type</th>
                      <th style={{ textAlign: 'right' }}>Labour Count</th>
                      <th style={{ textAlign: 'right' }}>Total Days</th>
                      <th style={{ textAlign: 'right' }}>Total Amount</th>
                      <th style={{ textAlign: 'right' }}>Qty Made</th>
                      <th style={{ textAlign: 'right' }}>Avg Qty / Labour</th>
                      <th style={{ textAlign: 'right' }}>Avg Amount / Labour</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workTypeAnalysis.map(w => (
                      <tr key={w.workType} style={{ cursor: 'pointer' }} onClick={() => setWorkTypeFilter(w.workType)}>
                        <td style={{ fontWeight: 700, color: '#0F172A' }}>
                          <span className="badge" style={{ background: '#F0FDF4', color: '#047857', fontWeight: 700 }}>
                            {w.workType}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>{w.labourCount}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>{w.totalDays}</td>
                        <td style={{ textAlign: 'right', fontWeight: 800, color: '#059669' }}>
                          ₹{w.totalAmount.toLocaleString('en-IN')}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>{w.qtyMade}</td>
                        <td style={{ textAlign: 'right', color: '#64748B' }}>{w.avgQtyPerLabour}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>
                          ₹{w.avgAmountPerLabour.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Section 4: Date Wise & Shift Wise Summary */}
          {(activeTab === 'all' || activeTab === 'dateShift') && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 20 }}>
              {/* Date Wise Table */}
              <div className="card" style={{ padding: '20px' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', marginBottom: 12 }}>
                  4A. Date Wise Labour Summary
                </h3>
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Shift</th>
                        <th style={{ textAlign: 'right' }}>Labourers</th>
                        <th style={{ textAlign: 'right' }}>Days</th>
                        <th style={{ textAlign: 'right' }}>Total Amount</th>
                        <th style={{ textAlign: 'right' }}>Qty Made</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dateWiseSummary.map(d => (
                        <tr key={`${d.date}_${d.shift}`}>
                          <td style={{ fontWeight: 700 }}>{formatDate(d.date)}</td>
                          <td>{d.shift}</td>
                          <td style={{ textAlign: 'right' }}>{d.uniqueLabourers}</td>
                          <td style={{ textAlign: 'right' }}>{d.totalDays}</td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: '#059669' }}>
                            ₹{d.totalAmount.toLocaleString('en-IN')}
                          </td>
                          <td style={{ textAlign: 'right' }}>{d.qtyMade}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Shift Wise Table */}
              <div className="card" style={{ padding: '20px' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', marginBottom: 12 }}>
                  4B. Shift Wise Labour Summary
                </h3>
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Shift</th>
                        <th style={{ textAlign: 'right' }}>Labourers</th>
                        <th style={{ textAlign: 'right' }}>Days</th>
                        <th style={{ textAlign: 'right' }}>Total Amount</th>
                        <th style={{ textAlign: 'right' }}>Qty Made</th>
                        <th style={{ textAlign: 'right' }}>Avg / Labour</th>
                      </tr>
                    </thead>
                    <tbody>
                      {shiftWiseSummary.map(s => (
                        <tr key={s.shift}>
                          <td style={{ fontWeight: 700, color: '#0F172A' }}>{s.shift}</td>
                          <td style={{ textAlign: 'right' }}>{s.uniqueLabourers}</td>
                          <td style={{ textAlign: 'right' }}>{s.totalDays}</td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: '#059669' }}>
                            ₹{s.totalAmount.toLocaleString('en-IN')}
                          </td>
                          <td style={{ textAlign: 'right' }}>{s.qtyMade}</td>
                          <td style={{ textAlign: 'right' }}>₹{s.avgAmountPerLabour.toLocaleString('en-IN')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Section 5: Work Type + Date Detailed Breakdown */}
          {(activeTab === 'all' || activeTab === 'workType') && (
            <div className="card" style={{ padding: '20px' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', marginBottom: 12 }}>
                5. Work Type + Date Daily Analysis
              </h3>
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Shift</th>
                      <th>Work Type</th>
                      <th style={{ textAlign: 'right' }}>Labour Count</th>
                      <th style={{ textAlign: 'right' }}>Total Days</th>
                      <th style={{ textAlign: 'right' }}>Qty Made</th>
                      <th style={{ textAlign: 'right' }}>Total Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workTypeDateAnalysis.slice(0, 25).map((w, idx) => (
                      <tr key={idx}>
                        <td>{formatDate(w.date)}</td>
                        <td>{w.shift}</td>
                        <td style={{ fontWeight: 700, color: '#0F172A' }}>{w.workType}</td>
                        <td style={{ textAlign: 'right' }}>{w.labourCount}</td>
                        <td style={{ textAlign: 'right' }}>{w.totalDays}</td>
                        <td style={{ textAlign: 'right' }}>{w.qtyMade}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: '#059669' }}>
                          ₹{w.totalAmount.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Section 6: Main Detailed Incharge Wise Labour Records Table */}
          {(activeTab === 'all' || activeTab === 'detailed') && (
            <div className="card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                    6. Detailed Incharge Wise Labour Entries
                  </h3>
                  <div style={{ fontSize: '0.78rem', color: '#64748B' }}>
                    Showing {searchedAndSortedDetailedRecords.length} individual labour deployment records
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                  <div className="search-input-wrap" style={{ minWidth: 260 }}>
                    <Search size={16} />
                    <input
                      type="text"
                      className="form-input"
                      style={{ padding: '6px 10px 6px 34px', fontSize: '0.84rem' }}
                      placeholder="Search worker, incharge, work, remark..."
                      value={searchDetailed}
                      onChange={e => {
                        setSearchDetailed(e.target.value);
                        setCurrentPage(1);
                      }}
                    />
                  </div>

                  <button onClick={handleExportDetailedCSV} className="btn btn-outline-green btn-sm">
                    <Download size={14} />
                    <span>Export Records ({filteredRecords.length})</span>
                  </button>
                </div>
              </div>

              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: 50 }}>Sr. No.</th>
                      <th onClick={() => handleSort('labourName')} style={{ cursor: 'pointer' }}>
                        Labour Name <ArrowUpDown size={12} style={{ display: 'inline', marginLeft: 4 }} />
                      </th>
                      <th onClick={() => handleSort('incharge')} style={{ cursor: 'pointer' }}>
                        Incharge <ArrowUpDown size={12} style={{ display: 'inline', marginLeft: 4 }} />
                      </th>
                      <th>Firm</th>
                      <th onClick={() => handleSort('date')} style={{ cursor: 'pointer' }}>
                        Date <ArrowUpDown size={12} style={{ display: 'inline', marginLeft: 4 }} />
                      </th>
                      <th>Shift</th>
                      <th onClick={() => handleSort('work')} style={{ cursor: 'pointer' }}>
                        Work Type <ArrowUpDown size={12} style={{ display: 'inline', marginLeft: 4 }} />
                      </th>
                      <th>Work Remark</th>
                      <th style={{ textAlign: 'right' }}>Days</th>
                      <th style={{ textAlign: 'right' }} onClick={() => handleSort('amount')}>
                        Amount <ArrowUpDown size={12} style={{ display: 'inline', marginLeft: 4 }} />
                      </th>
                      <th style={{ textAlign: 'right' }}>Qty Made</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedDetailedRecords.map((r, idx) => (
                      <tr key={`${r.workId}_${idx}`}>
                        <td style={{ color: '#64748B', fontWeight: 600 }}>
                          {(currentPage - 1) * pageSize + idx + 1}
                        </td>
                        <td style={{ fontWeight: 700, color: '#0F172A' }}>
                          {r.labourName}
                        </td>
                        <td>{r.incharge}</td>
                        <td>
                          <span className="badge" style={{ background: '#F1F5F9', color: '#334155', fontSize: '0.75rem' }}>
                            {r.firmName}
                          </span>
                        </td>
                        <td>{formatDate(r.date)}</td>
                        <td>{r.shift}</td>
                        <td>
                          <span className="badge" style={{ background: '#ECFDF5', color: '#065F46', fontSize: '0.75rem', fontWeight: 600 }}>
                            {r.work}
                          </span>
                        </td>
                        <td>
                          <div
                            style={{
                              maxWidth: 160,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              color: r.workRemark ? '#334155' : '#94A3B8',
                              fontStyle: r.workRemark ? 'normal' : 'italic'
                            }}
                            title={r.workRemark || 'No remark'}
                          >
                            {r.workRemark || '—'}
                          </div>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>{r.days}</td>
                        <td style={{ textAlign: 'right', fontWeight: 800, color: '#059669' }}>
                          ₹{Number(r.amount).toLocaleString('en-IN')}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>{r.qtyMade || 0}</td>
                        <td>
                          <StatusBadge status={r.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: 16,
                  paddingTop: 12,
                  borderTop: '1px solid #E2E8F0',
                  flexWrap: 'wrap',
                  gap: 10
                }}>
                  <div style={{ fontSize: '0.82rem', color: '#64748B' }}>
                    Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, searchedAndSortedDetailedRecords.length)} of {searchedAndSortedDetailedRecords.length} records
                  </div>

                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="btn btn-secondary btn-sm"
                    >
                      Previous
                    </button>
                    <span style={{ display: 'flex', alignItems: 'center', padding: '0 10px', fontSize: '0.85rem', fontWeight: 700 }}>
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="btn btn-secondary btn-sm"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
