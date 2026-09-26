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
  RefreshCw,
  Download,
  Printer,
  Search,
  ChevronDown,
  TrendingUp,
  UserCheck,
  Building2,
  CalendarDays,
  FileSpreadsheet,
  RotateCcw,
  ArrowUpDown,
  Boxes,
  User,
  Scale,
  Eye,
  CheckCircle2
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { StatusBadge } from '../components/common/StatusBadge';
import { MetricCard } from '../components/common/MetricCard';
import { formatDate } from '../utils/dateUtils';
import {
  exportToCSV,
  formatInchargeWiseForExport,
  printInchargeWiseReport
} from '../utils/exportUtils';
import { isTonBasedWork } from '../utils/workTypes';

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

  // Section-Level Dedicated Labour Selection (for drill-down)
  const [selectedSectionLabour, setSelectedSectionLabour] = useState('');

  // Active Report Requirement / Mode:
  // 'incharge' = Incharge Summary
  // 'labour'   = Labour Wise Payout
  // 'workType' = Work Activity & Output
  // 'dateShift'= Date & Shift Analysis
  // 'detailed' = Master Detailed Ledger
  const [reportMode, setReportMode] = useState('incharge');

  // Table search & sorting & pagination for tables
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('totalAmount');
  const [sortAsc, setSortAsc] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  // Quick Date Range Handler
  const handleQuickDate = range => {
    const now = new Date();
    const formatYMD = d => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

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
    setCurrentPage(1);
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

      const perLabourAmount = entry.totalAmount !== undefined && !isNaN(Number(entry.totalAmount))
        ? (Number(entry.totalAmount) / count)
        : rate;

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
            amount: perLabourAmount,
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

  // Unique Labourers in current filtered records
  const availableLabourNames = useMemo(() => {
    return Array.from(new Set(filteredRecords.map(r => r.labourName).filter(Boolean))).sort();
  }, [filteredRecords]);

  // 2. High Level KPI Summary Calculations
  const summaryKPI = useMemo(() => {
    const uniqueLabourNames = new Set(filteredRecords.map(r => r.labourName).filter(Boolean));
    const uniqueLabourers = uniqueLabourNames.size;
    const totalAmount = filteredRecords.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    const avgPerLabour = uniqueLabourers > 0 ? Math.round(totalAmount / uniqueLabourers) : 0;

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
      totalAmount,
      avgPerLabour,
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
          totalAmount: 0,
          workEntriesSet: new Set(),
          workIdQty: {}
        };
      }
      map[inc].labourersSet.add(r.labourName);
      map[inc].totalAmount += (Number(r.amount) || 0);
      map[inc].workEntriesSet.add(r.workId);
      if (map[inc].workIdQty[r.workId] === undefined) {
        map[inc].workIdQty[r.workId] = Number(r.qtyMade) || 0;
      }
    });

    return Object.values(map).map(item => {
      const uniqueLabourers = item.labourersSet.size;
      const qtyMade = Object.values(item.workIdQty).reduce((sum, q) => sum + q, 0);
      return {
        incharge: item.incharge,
        uniqueLabourers,
        qtyMade,
        totalAmount: item.totalAmount,
        avgPerLabour: uniqueLabourers > 0 ? Math.round(item.totalAmount / uniqueLabourers) : 0,
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

  // Records specific to the selected labour
  const selectedLabourDetailedRecords = useMemo(() => {
    if (!selectedSectionLabour) return [];
    return filteredRecords
      .filter(r => r.labourName === selectedSectionLabour)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [filteredRecords, selectedSectionLabour]);

  // Stats for selected labour
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

  // 5. Work Type Analysis Aggregation
  const workTypeAnalysis = useMemo(() => {
    const map = {};
    filteredRecords.forEach(r => {
      const work = r.work || 'General';
      if (!map[work]) {
        map[work] = {
          workType: work,
          labourersSet: new Set(),
          totalAmount: 0,
          workEntriesSet: new Set(),
          workIdQty: {}
        };
      }
      map[work].labourersSet.add(r.labourName);
      map[work].totalAmount += (Number(r.amount) || 0);
      map[work].workEntriesSet.add(r.workId);
      if (map[work].workIdQty[r.workId] === undefined) {
        map[work].workIdQty[r.workId] = Number(r.qtyMade) || 0;
      }
    });

    return Object.values(map).map(item => {
      const labourCount = item.labourersSet.size;
      const qtyMade = Object.values(item.workIdQty).reduce((sum, q) => sum + q, 0);
      const isTon = isTonBasedWork(item.workType);
      return {
        workType: item.workType,
        isTon,
        labourCount,
        totalAmount: item.totalAmount,
        qtyMade,
        workEntries: item.workEntriesSet.size,
        avgAmountPerLabour: labourCount > 0 ? Math.round(item.totalAmount / labourCount) : 0
      };
    }).sort((a, b) => b.totalAmount - a.totalAmount);
  }, [filteredRecords]);

  // 6. Date & Shift Wise Summary Aggregation
  const dateWiseSummary = useMemo(() => {
    const map = {};
    filteredRecords.forEach(r => {
      const key = `${r.date}_${r.shift}`;
      if (!map[key]) {
        map[key] = {
          date: r.date,
          shift: r.shift,
          labourersSet: new Set(),
          totalAmount: 0,
          workIds: new Set(),
          workIdQty: {}
        };
      }
      map[key].labourersSet.add(r.labourName);
      map[key].totalAmount += (Number(r.amount) || 0);
      map[key].workIds.add(r.workId);
      if (map[key].workIdQty[r.workId] === undefined) {
        map[key].workIdQty[r.workId] = Number(r.qtyMade) || 0;
      }
    });

    return Object.values(map).map(item => {
      const qtyMade = Object.values(item.workIdQty).reduce((sum, q) => sum + q, 0);
      const uniqueLabourers = item.labourersSet.size;
      return {
        date: item.date,
        shift: item.shift,
        uniqueLabourers,
        totalAmount: item.totalAmount,
        qtyMade,
        workEntries: item.workIds.size,
        avgPerLabour: uniqueLabourers > 0 ? Math.round(item.totalAmount / uniqueLabourers) : 0
      };
    }).sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [filteredRecords]);

  // Dynamic filter and search on currently active report view
  const currentViewData = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();

    if (reportMode === 'incharge') {
      let list = inchargeSummary;
      if (q) {
        list = list.filter(item => item.incharge.toLowerCase().includes(q));
      }
      list = [...list].sort((a, b) => {
        let valA = a[sortField] !== undefined ? a[sortField] : a.totalAmount;
        let valB = b[sortField] !== undefined ? b[sortField] : b.totalAmount;
        if (typeof valA === 'string') {
          valA = valA.toLowerCase();
          valB = String(valB || '').toLowerCase();
        }
        if (valA < valB) return sortAsc ? -1 : 1;
        if (valA > valB) return sortAsc ? 1 : -1;
        return 0;
      });
      return list;
    }

    if (reportMode === 'labour') {
      if (selectedSectionLabour) {
        let list = selectedLabourDetailedRecords;
        if (q) {
          list = list.filter(r =>
            r.incharge.toLowerCase().includes(q) ||
            r.work.toLowerCase().includes(q) ||
            (r.workRemark && r.workRemark.toLowerCase().includes(q))
          );
        }
        return list;
      } else {
        let list = labourSummary;
        if (q) {
          list = list.filter(item =>
            item.labourName.toLowerCase().includes(q) ||
            item.incharges.some(inc => inc.toLowerCase().includes(q)) ||
            item.workTypes.some(w => w.toLowerCase().includes(q))
          );
        }
        list = [...list].sort((a, b) => {
          let valA = a[sortField] !== undefined ? a[sortField] : a.totalAmount;
          let valB = b[sortField] !== undefined ? b[sortField] : b.totalAmount;
          if (typeof valA === 'string') {
            valA = valA.toLowerCase();
            valB = String(valB || '').toLowerCase();
          }
          if (valA < valB) return sortAsc ? -1 : 1;
          if (valA > valB) return sortAsc ? 1 : -1;
          return 0;
        });
        return list;
      }
    }

    if (reportMode === 'workType') {
      let list = workTypeAnalysis;
      if (q) {
        list = list.filter(item => item.workType.toLowerCase().includes(q));
      }
      list = [...list].sort((a, b) => {
        let valA = a[sortField] !== undefined ? a[sortField] : a.totalAmount;
        let valB = b[sortField] !== undefined ? b[sortField] : b.totalAmount;
        if (typeof valA === 'string') {
          valA = valA.toLowerCase();
          valB = String(valB || '').toLowerCase();
        }
        if (valA < valB) return sortAsc ? -1 : 1;
        if (valA > valB) return sortAsc ? 1 : -1;
        return 0;
      });
      return list;
    }

    if (reportMode === 'dateShift') {
      let list = dateWiseSummary;
      if (q) {
        list = list.filter(item =>
          item.date.toLowerCase().includes(q) ||
          item.shift.toLowerCase().includes(q)
        );
      }
      list = [...list].sort((a, b) => {
        let valA = a[sortField] !== undefined ? a[sortField] : a.date;
        let valB = b[sortField] !== undefined ? b[sortField] : b.date;
        if (sortField === 'date') {
          valA = new Date(valA).getTime();
          valB = new Date(valB).getTime();
        }
        if (valA < valB) return sortAsc ? -1 : 1;
        if (valA > valB) return sortAsc ? 1 : -1;
        return 0;
      });
      return list;
    }

    // Default: 'detailed'
    let list = filteredRecords;
    if (q) {
      list = list.filter(r =>
        r.labourName.toLowerCase().includes(q) ||
        r.incharge.toLowerCase().includes(q) ||
        r.firmName.toLowerCase().includes(q) ||
        r.work.toLowerCase().includes(q) ||
        (r.workRemark && r.workRemark.toLowerCase().includes(q)) ||
        (r.workId && r.workId.toLowerCase().includes(q))
      );
    }
    list = [...list].sort((a, b) => {
      let valA = a[sortField] !== undefined ? a[sortField] : a.date;
      let valB = b[sortField] !== undefined ? b[sortField] : b.date;
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
  }, [
    reportMode,
    searchTerm,
    sortField,
    sortAsc,
    inchargeSummary,
    labourSummary,
    selectedSectionLabour,
    selectedLabourDetailedRecords,
    workTypeAnalysis,
    dateWiseSummary,
    filteredRecords
  ]);

  const totalPages = Math.ceil(currentViewData.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return currentViewData.slice(start, start + pageSize);
  }, [currentViewData, currentPage, pageSize]);

  const handleSort = field => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false); // Default descending for amounts/metrics
    }
  };

  // Export handlers
  const handleExportCurrentCSV = () => {
    if (reportMode === 'incharge') {
      const formatted = inchargeSummary.map((inc, idx) => ({
        'Sr No': idx + 1,
        'Incharge / Supervisor': inc.incharge,
        'Work Orders': inc.workEntries,
        'Labourers (Count)': inc.uniqueLabourers,
        'Production Output (Tons/Units)': inc.qtyMade,
        'Per Person Amount (₹)': inc.avgPerLabour,
        'Total Amount (₹)': inc.totalAmount
      }));
      exportToCSV('Incharge_Wise_Summary_Report', formatted);
    } else if (reportMode === 'labour') {
      if (selectedSectionLabour) {
        const formatted = selectedLabourDetailedRecords.map((r, idx) => ({
          'Sr No': idx + 1,
          'Date': formatDateTime(r.date),
          'Labour Name': r.labourName,
          'Incharge': r.incharge,
          'Shift': r.shift,
          'Firm': r.firmName,
          'Work Type': r.work,
          'Work Remark': r.workRemark || '—',
          'Days': r.days,
          'Amount (₹)': r.amount,
          'Qty / Output': r.qtyMade || 0,
          'Status': r.status
        }));
        exportToCSV(`${selectedSectionLabour}_Attendance_Ledger`, formatted);
      } else {
        const formatted = labourSummary.map((l, idx) => ({
          'Sr No': idx + 1,
          'Labour Name': l.labourName,
          'Supervisors': l.incharges.join(', '),
          'Work Types': l.workTypes.join(', '),
          'Total Days': l.totalDays,
          'Total Output': l.totalQty,
          'Total Amount (₹)': l.totalAmount,
          'Daily Avg (₹)': l.avgAmountPerDay,
          'Work Entries': l.workEntries
        }));
        exportToCSV('Labour_Wise_Payout_Report', formatted);
      }
    } else if (reportMode === 'workType') {
      const formatted = workTypeAnalysis.map((w, idx) => ({
        'Sr No': idx + 1,
        'Work Activity': w.workType,
        'Rate Basis': 'Per Person',
        'Labour Count': w.labourCount,
        'Production Output': w.qtyMade,
        'Per Person Avg (₹)': w.avgAmountPerLabour,
        'Total Amount (₹)': w.totalAmount,
        'Work Orders': w.workEntries
      }));
      exportToCSV('Work_Activity_Analysis_Report', formatted);
    } else if (reportMode === 'dateShift') {
      const formatted = dateWiseSummary.map((d, idx) => ({
        'Sr No': idx + 1,
        'Date': formatDate(d.date),
        'Shift': d.shift,
        'Labourers': d.uniqueLabourers,
        'Production Output': d.qtyMade,
        'Per Person Avg (₹)': d.avgPerLabour,
        'Total Amount (₹)': d.totalAmount,
        'Work Entries': d.workEntries
      }));
      exportToCSV('Date_Shift_Labour_Report', formatted);
    } else {
      const formatted = formatInchargeWiseForExport(filteredRecords);
      exportToCSV('Master_Detailed_Labour_Report', formatted);
    }
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
        workType: workTypeFilter,
        reportMode
      },
      summary: summaryKPI,
      inchargeSummary,
      labourSummary,
      workTypeSummary: workTypeAnalysis,
      dateWiseSummary,
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
    setSearchTerm('');
    setCurrentPage(1);
  };

  const hasActiveFilters = Boolean(
    dateFrom || dateTo || inchargeFilter || shiftFilter || firmFilter || workTypeFilter || statusFilter || selectedSectionLabour
  );

  // Presentational helper for sortable/plain table headers (keeps the 5 report tables consistent)
  const Th = ({ children, field, align = 'left', width }) => (
    <th
      onClick={field ? () => handleSort(field) : undefined}
      style={width ? { width } : undefined}
      className={`px-3 py-2.5 font-semibold text-slate-700 uppercase tracking-wider text-[11px] whitespace-nowrap ${
        align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'
      } ${field ? 'cursor-pointer select-none hover:text-indigo-600' : ''}`}
    >
      {children}
      {field && <ArrowUpDown size={11} className="inline ml-1" />}
    </th>
  );

  const inputClass = 'w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white transition-all';
  const labelClass = 'block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5';
  const secondaryBtn = 'inline-flex items-center gap-1.5 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg text-xs font-semibold px-3 py-1.5 transition-colors disabled:opacity-60 disabled:cursor-not-allowed';
  const badgeSlate = 'inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border bg-slate-100 text-slate-600 border-slate-200';
  const badgeEmerald = 'inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border bg-emerald-50 text-emerald-700 border-emerald-200';

  const modeTabs = [
    { id: 'incharge', label: 'Incharge Summary', count: inchargeSummary.length, icon: Users },
    { id: 'labour', label: selectedSectionLabour ? `Labour: ${selectedSectionLabour}` : `Labour Wise Payout`, count: labourSummary.length, icon: User },
    { id: 'workType', label: 'Work Activity & Output', count: workTypeAnalysis.length, icon: Briefcase },
    { id: 'dateShift', label: 'Date & Shift Matrix', count: dateWiseSummary.length, icon: CalendarDays },
    { id: 'detailed', label: 'Master Detailed Ledger', count: filteredRecords.length, icon: FileSpreadsheet }
  ];

  return (
    <div className="h-full flex flex-col bg-slate-50 space-y-4">
      {/* 1. Executive Top Header */}
      <div className="flex items-center justify-between flex-wrap gap-3.5 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className={secondaryBtn}
          >
            <ArrowLeft size={14} />
            <span>Dashboard</span>
          </button>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Users size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-800">Report</h1>
              <span className={badgeEmerald}>MIS Analytics</span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Supervisor-wise labour deployments, working days, production output &amp; payroll payments
            </p>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap items-center">
          <button
            onClick={refreshData}
            disabled={syncing}
            title="Refresh & Synchronize Live Google Sheet Data"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
            <span>{syncing ? 'Syncing...' : 'Sync Live'}</span>
          </button>

          <button
            onClick={handleExportCurrentCSV}
            title="Export Current View Data to Excel CSV"
            className={secondaryBtn}
          >
            <Download size={14} />
            <span>Export Excel</span>
          </button>

          <button
            onClick={handlePrint}
            title="Print Ready A4 Report or Download PDF"
            className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-lg shadow-sm px-4 py-2 transition-colors"
          >
            <Printer size={14} />
            <span>Print Report Sheet</span>
          </button>
        </div>
      </div>

      {/* 2. Professional Filter & Requirement Selector Panel */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4 shrink-0">
        {/* Row 1: Report Requirement Mode Selector */}
        <div className="flex items-center justify-between flex-wrap gap-3 pb-3.5 mb-3.5 border-b border-slate-100">
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Select Report Requirement:
          </span>

          {/* Segmented Mode Tabs */}
          <div className="inline-flex flex-wrap gap-1 bg-slate-100 rounded-lg p-1">
            {modeTabs.map(tab => {
              const active = reportMode === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setReportMode(tab.id);
                    setCurrentPage(1);
                    setSearchTerm('');
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                    active ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-white/70'
                  }`}
                >
                  <Icon size={13} />
                  <span>{tab.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${active ? 'bg-white/25 text-white' : 'bg-slate-200 text-slate-600'}`}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Row 2: Comprehensive Filters Grid */}
        <div>
          <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
              <Filter size={14} className="text-indigo-600" />
              <span>Data Scope &amp; Date Filters:</span>
            </div>

            {/* Quick Date Presets */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs text-slate-500 font-semibold">Quick:</span>
              {[
                { key: 'today', label: 'Today' },
                { key: 'yesterday', label: 'Yesterday' },
                { key: 'this_week', label: 'This Week' },
                { key: 'this_month', label: 'This Month' },
                { key: 'all', label: 'All Dates' }
              ].map(r => (
                <button
                  key={r.key}
                  onClick={() => handleQuickDate(r.key)}
                  className="bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-md text-[11px] font-semibold px-2 py-1 transition-colors"
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-2.5 items-end">
            <div>
              <label className={labelClass}>Date From</label>
              <input
                type="date"
                className={inputClass}
                value={dateFrom}
                onChange={e => {
                  setDateFrom(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>

            <div>
              <label className={labelClass}>Date To</label>
              <input
                type="date"
                className={inputClass}
                value={dateTo}
                onChange={e => {
                  setDateTo(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>

            <div>
              <label className={labelClass}>Supervisor / Incharge</label>
              <select
                className={inputClass}
                value={inchargeFilter}
                onChange={e => {
                  setInchargeFilter(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="">All Incharges ({dynamicIncharges.length})</option>
                {dynamicIncharges.map(inc => (
                  <option key={inc} value={inc}>{inc}</option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>Shift</label>
              <select
                className={inputClass}
                value={shiftFilter}
                onChange={e => {
                  setShiftFilter(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="">All Shifts</option>
                {dynamicShifts.map(sh => (
                  <option key={sh} value={sh}>{sh}</option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>Firm Name</label>
              <select
                className={inputClass}
                value={firmFilter}
                onChange={e => {
                  setFirmFilter(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="">All Firms</option>
                {dynamicFirms.map(firm => (
                  <option key={firm} value={firm}>{firm}</option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>Type of Work</label>
              <select
                className={inputClass}
                value={workTypeFilter}
                onChange={e => {
                  setWorkTypeFilter(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="">All Work Types</option>
                {dynamicWorkTypes.map(work => (
                  <option key={work} value={work}>{work}</option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>Status</label>
              <select
                className={inputClass}
                value={statusFilter}
                onChange={e => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="">All Statuses</option>
                <option value="Pending Verification">Pending Verification</option>
                <option value="Verified (Pending Approval)">Verified (Pending Approval)</option>
                <option value="Approved (Pending Payment)">Approved (Pending Payment)</option>
                <option value="Paid (Pending Tally)">Paid (Pending Tally)</option>
                <option value="Tally Complete">Tally Complete</option>
              </select>
            </div>

            <div>
              <button
                onClick={clearAllFilters}
                disabled={!hasActiveFilters}
                title="Reset all active filters"
                className={`w-full justify-center ${secondaryBtn} py-2.5`}
              >
                <RotateCcw size={13} />
                <span>Reset Filters</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Executive Financial Metrics Strip */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3 shrink-0">
        <MetricCard
          title="Total Reconciled Payout"
          value={`₹${summaryKPI.totalAmount.toLocaleString('en-IN')}`}
          subtitle="Scope Total Payroll Amount"
          icon={IndianRupee}
          theme="emerald"
        />
        <MetricCard
          title="Labour Headcount"
          value={<>{summaryKPI.uniqueLabourers} <span className="text-sm font-semibold text-slate-500">workers</span></>}
          subtitle={`Across ${summaryKPI.totalWorkEntries} Work Orders`}
          icon={Users}
          theme="indigo"
        />
        <MetricCard
          title="Production Output"
          value={<>{summaryKPI.totalProductionQty.toLocaleString('en-IN')} <span className="text-sm font-semibold text-slate-500">tons / units</span></>}
          subtitle="Total Production Handled"
          icon={Boxes}
          theme="teal"
        />
        <MetricCard
          title="Per Person Average"
          value={`₹${summaryKPI.avgPerLabour.toLocaleString('en-IN')}`}
          subtitle="Average Payout / Worker"
          icon={TrendingUp}
          theme="emerald"
        />
      </div>

      {/* 4. Loading State */}
      {loading && (
        <div className="flex-1 flex flex-col items-center justify-center bg-white rounded-xl border border-slate-200 py-16">
          <RefreshCw size={32} className="text-indigo-600 animate-spin mb-3" />
          <div className="text-slate-800 font-bold text-base">Reconciling Enterprise Labour Ledger...</div>
          <div className="text-slate-500 text-sm mt-1">Pulling live data and computing breakdowns</div>
        </div>
      )}

      {/* 5. Empty State */}
      {!loading && filteredRecords.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center bg-white rounded-xl border border-slate-200 py-16 text-center px-6">
          <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mb-3.5">
            <Users size={28} />
          </div>
          <h3 className="text-base font-bold text-slate-800 mb-1.5">No Records In Selected Scope</h3>
          <p className="text-sm text-slate-500 max-w-md mb-4">
            No work deployment records match your active filters. Try adjusting the date range, incharge or work activity filter.
          </p>
          <button onClick={clearAllFilters} className={secondaryBtn}>
            Reset All Filters
          </button>
        </div>
      )}

      {/* 6. Active Professional Report Sheet Section */}
      {!loading && filteredRecords.length > 0 && (
        <div className="flex-1 min-h-0 bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-col overflow-hidden">
          {/* Table Header Strip: Title, Search, and Scope Actions */}
          <div className="flex items-center justify-between flex-wrap gap-3 px-4 pt-4 pb-3.5 border-b border-slate-100 shrink-0">
            <div>
              <h3 className="text-base font-bold text-slate-800">
                {reportMode === 'incharge' && '1. Incharge / Supervisor Deployment Summary'}
                {reportMode === 'labour' && (selectedSectionLabour ? `2. Attendance & Payout Ledger: ${selectedSectionLabour}` : '2. Labour Wise Attendance & Payout Summary')}
                {reportMode === 'workType' && '3. Work Activity & Production Output Ledger'}
                {reportMode === 'dateShift' && '4. Date & Shift Deployment Matrix'}
                {reportMode === 'detailed' && '5. Master Detailed Transaction Ledger'}
              </h3>
              <div className="text-xs text-slate-500 mt-0.5">
                Showing {currentViewData.length} records matching current criteria
              </div>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              {/* If on labour mode, provide quick labour switcher */}
              {reportMode === 'labour' && (
                <div className="flex items-center gap-1.5">
                  <select
                    className={`px-3 py-2 bg-slate-50 border rounded-lg text-sm max-w-[220px] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all ${
                      selectedSectionLabour ? 'font-bold border-emerald-300 bg-emerald-50 text-emerald-800' : 'font-medium border-slate-200 text-slate-800'
                    }`}
                    value={selectedSectionLabour}
                    onChange={e => {
                      setSelectedSectionLabour(e.target.value);
                      setCurrentPage(1);
                    }}
                  >
                    <option value="">All Workers ({availableLabourNames.length})</option>
                    {availableLabourNames.map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>

                  {selectedSectionLabour && (
                    <button
                      onClick={() => setSelectedSectionLabour('')}
                      className="bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-md text-[11px] font-semibold px-2 py-1.5 transition-colors"
                    >
                      View All
                    </button>
                  )}
                </div>
              )}

              {/* Table Search Input */}
              <div className="relative min-w-[220px]">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white transition-all"
                  placeholder="Search table rows..."
                  value={searchTerm}
                  onChange={e => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>

              <button
                onClick={handleExportCurrentCSV}
                title="Export this specific table view to CSV"
                className="bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-md text-[11px] font-semibold px-2.5 py-2 transition-colors inline-flex items-center gap-1.5"
              >
                <Download size={13} />
                <span>Export Table CSV</span>
              </button>
            </div>
          </div>

          {/* Drill-down Worker Header (If single labour is selected) */}
          {reportMode === 'labour' && selectedSectionLabour && selectedLabourStats && (
            <div className="mx-4 mt-3.5 px-4 py-3 bg-emerald-50/60 border border-emerald-200 rounded-lg flex items-center justify-between flex-wrap gap-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-base shrink-0">
                  {selectedLabourStats.labourName.charAt(0)}
                </div>
                <div>
                  <div className="text-sm font-bold text-emerald-900">
                    {selectedLabourStats.labourName}
                  </div>
                  <div className="text-xs text-emerald-700 font-semibold">
                    Supervisors: {selectedLabourStats.incharges.join(', ') || 'N/A'} • Activities: {selectedLabourStats.workTypes.join(', ') || 'N/A'}
                  </div>
                </div>
              </div>

              <div className="flex gap-2.5 flex-wrap">
                <div className="text-center bg-white px-3 py-1 rounded-md border border-emerald-200">
                  <div className="text-[10px] text-slate-500 font-bold uppercase">Working Days</div>
                  <div className="text-sm font-bold text-slate-900">{selectedLabourStats.totalDays} Days</div>
                </div>
                <div className="text-center bg-white px-3 py-1 rounded-md border border-emerald-200">
                  <div className="text-[10px] text-slate-500 font-bold uppercase">Total Payout</div>
                  <div className="text-sm font-bold text-emerald-600">₹{Number(selectedLabourStats.totalAmount).toLocaleString('en-IN')}</div>
                </div>
                <div className="text-center bg-white px-3 py-1 rounded-md border border-emerald-200">
                  <div className="text-[10px] text-slate-500 font-bold uppercase">Daily Avg</div>
                  <div className="text-sm font-bold text-emerald-600">₹{selectedLabourStats.avgPerDay}</div>
                </div>
                <div className="text-center bg-white px-3 py-1 rounded-md border border-emerald-200">
                  <div className="text-[10px] text-slate-500 font-bold uppercase">Output</div>
                  <div className="text-sm font-bold text-slate-900">{selectedLabourStats.totalQtyMade}</div>
                </div>
              </div>
            </div>
          )}

          {/* Table Container - only scrollable region on screen */}
          <div className="flex-1 min-h-0 overflow-x-auto overflow-y-auto px-4 pt-3.5 pb-1">
            {/* VIEW 1: INCHARGE SUMMARY TABLE */}
            {reportMode === 'incharge' && (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="sticky top-0 bg-slate-100 z-20 shadow-xs border-b border-slate-300">
                    <Th width={45}>#</Th>
                    <Th field="incharge">Incharge / Supervisor</Th>
                    <Th field="workEntries" align="right">Work Orders</Th>
                    <Th field="uniqueLabourers" align="right">Labourers (Count)</Th>
                    <Th field="qtyMade" align="right">Output (Tons/Units)</Th>
                    <Th field="avgPerLabour" align="right">Per Person Amount (₹)</Th>
                    <Th field="totalAmount" align="right">Total Amount (₹)</Th>
                    <Th align="center" width={100}>Action</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedData.map((inc, idx) => (
                    <tr key={inc.incharge} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-3 py-2.5 text-xs text-slate-500 font-semibold">
                        {(currentPage - 1) * pageSize + idx + 1}
                      </td>
                      <td className="px-3 py-2.5 text-xs font-bold text-slate-900">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 inline-block mr-2" />
                        {inc.incharge}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-slate-600 text-right font-semibold">{inc.workEntries}</td>
                      <td className="px-3 py-2.5 text-xs text-slate-600 text-right font-semibold">{inc.uniqueLabourers}</td>
                      <td className="px-3 py-2.5 text-xs text-slate-600 text-right font-semibold">{inc.qtyMade ? inc.qtyMade.toLocaleString('en-IN') : '-'}</td>
                      <td className="px-3 py-2.5 text-xs text-right font-bold text-emerald-600">
                        ₹{Number(inc.avgPerLabour).toLocaleString('en-IN')}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-right font-extrabold text-emerald-600">
                        ₹{Number(inc.totalAmount).toLocaleString('en-IN')}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <button
                          onClick={() => {
                            setInchargeFilter(inc.incharge);
                            setReportMode('detailed');
                          }}
                          title={`View detailed entries for ${inc.incharge}`}
                          className="bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-md text-[11px] font-semibold px-2 py-1 transition-colors"
                        >
                          View Ledger
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50 font-bold text-slate-900 border-t-2 border-slate-300">
                    <td className="px-3 py-2.5 text-xs" colSpan={2}>Grand Total ({inchargeSummary.length} Incharges)</td>
                    <td className="px-3 py-2.5 text-xs text-right">{summaryKPI.totalWorkEntries}</td>
                    <td className="px-3 py-2.5 text-xs text-right">{summaryKPI.uniqueLabourers}</td>
                    <td className="px-3 py-2.5 text-xs text-right">{summaryKPI.totalProductionQty.toLocaleString('en-IN')}</td>
                    <td className="px-3 py-2.5 text-xs text-right text-emerald-600">₹{summaryKPI.avgPerLabour.toLocaleString('en-IN')}</td>
                    <td className="px-3 py-2.5 text-xs text-right text-emerald-600">₹{summaryKPI.totalAmount.toLocaleString('en-IN')}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            )}

            {/* VIEW 2: LABOUR WISE PAYOUT TABLE */}
            {reportMode === 'labour' && (
              selectedSectionLabour ? (
                /* 2A: Single Worker Date-wise History Table */
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="sticky top-0 bg-slate-100 z-20 shadow-xs border-b border-slate-300">
                      <Th width={45}>#</Th>
                      <Th>Date</Th>
                      <Th>Supervisor / Incharge</Th>
                      <Th>Shift</Th>
                      <Th>Firm</Th>
                      <Th>Work Activity</Th>
                      <Th>Work Remark</Th>
                      <Th align="right">Days</Th>
                      <Th align="right">Amount (₹)</Th>
                      <Th align="right">Output Qty</Th>
                      <Th>Workflow Status</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedData.map((r, idx) => (
                      <tr key={`${r.workId}_${idx}`} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-3 py-2.5 text-xs text-slate-500 font-semibold">
                          {(currentPage - 1) * pageSize + idx + 1}
                        </td>
                        <td className="px-3 py-2.5 text-xs font-bold text-slate-900 whitespace-nowrap">
                          {formatDate(r.date)}
                        </td>
                        <td className="px-3 py-2.5 text-xs font-semibold text-slate-700 whitespace-nowrap">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 inline-block mr-1.5" />
                          {r.incharge}
                        </td>
                        <td className="px-3 py-2.5 text-xs text-slate-600 whitespace-nowrap">{r.shift || '-'}</td>
                        <td className="px-3 py-2.5">
                          <span className={badgeSlate}>{r.firmName || '-'}</span>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className={badgeEmerald}>{r.work}</span>
                        </td>
                        <td className="px-3 py-2.5">
                          <div
                            className={`max-w-[180px] whitespace-nowrap overflow-hidden text-ellipsis text-xs ${r.workRemark ? 'text-slate-600' : 'text-slate-400 italic'}`}
                            title={r.workRemark || 'No remark'}
                          >
                            {r.workRemark || '—'}
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-xs text-slate-600 text-right font-semibold">{r.days}</td>
                        <td className="px-3 py-2.5 text-xs text-right font-extrabold text-emerald-600">
                          ₹{Number(r.amount).toLocaleString('en-IN')}
                        </td>
                        <td className="px-3 py-2.5 text-xs text-slate-600 text-right font-semibold">{r.qtyMade || 0}</td>
                        <td className="px-3 py-2.5">
                          <StatusBadge status={r.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50 font-bold text-slate-900 border-t-2 border-slate-300">
                      <td className="px-3 py-2.5 text-xs" colSpan={7}>Total Payout for {selectedLabourStats.labourName}</td>
                      <td className="px-3 py-2.5 text-xs text-right">{selectedLabourStats.totalDays}</td>
                      <td className="px-3 py-2.5 text-xs text-right text-emerald-600">₹{Number(selectedLabourStats.totalAmount).toLocaleString('en-IN')}</td>
                      <td className="px-3 py-2.5 text-xs text-right">{selectedLabourStats.totalQtyMade}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              ) : (
                /* 2B: All Workers Summary Table */
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="sticky top-0 bg-slate-100 z-20 shadow-xs border-b border-slate-300">
                      <Th width={45}>#</Th>
                      <Th field="labourName">Labour Worker Name</Th>
                      <Th>Supervising Incharge(s)</Th>
                      <Th>Assigned Work Types</Th>
                      <Th field="totalDays" align="right">Working Days</Th>
                      <Th field="totalQty" align="right">Total Output</Th>
                      <Th field="totalAmount" align="right">Total Amount (₹)</Th>
                      <Th align="right">Work Orders</Th>
                      <Th align="center" width={90}>Action</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedData.map((l, idx) => (
                      <tr
                        key={l.labourName}
                        onClick={() => setSelectedSectionLabour(l.labourName)}
                        className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                      >
                        <td className="px-3 py-2.5 text-xs text-slate-500 font-semibold">
                          {(currentPage - 1) * pageSize + idx + 1}
                        </td>
                        <td className="px-3 py-2.5 text-xs font-bold text-indigo-600 underline">
                          {l.labourName}
                        </td>
                        <td className="px-3 py-2.5 text-xs text-slate-600">
                          {l.incharges.slice(0, 2).join(', ')}{l.incharges.length > 2 ? ` +${l.incharges.length - 2}` : ''}
                        </td>
                        <td className="px-3 py-2.5 text-xs text-slate-600">
                          {l.workTypes.slice(0, 2).join(', ')}{l.workTypes.length > 2 ? ` +${l.workTypes.length - 2}` : ''}
                        </td>
                        <td className="px-3 py-2.5 text-xs text-slate-600 text-right font-semibold">{l.totalDays}</td>
                        <td className="px-3 py-2.5 text-xs text-slate-600 text-right font-semibold">{l.totalQty || '-'}</td>
                        <td className="px-3 py-2.5 text-xs text-right font-extrabold text-emerald-600">
                          ₹{Number(l.totalAmount).toLocaleString('en-IN')}
                        </td>
                        <td className="px-3 py-2.5 text-xs text-slate-500 text-right">{l.workEntries}</td>
                        <td className="px-3 py-2.5 text-center">
                          <span className="inline-flex items-center gap-1 bg-white border border-slate-200 text-slate-600 rounded-md text-[11px] font-semibold px-2 py-1">
                            Details
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50 font-bold text-slate-900 border-t-2 border-slate-300">
                      <td className="px-3 py-2.5 text-xs" colSpan={4}>Grand Total ({labourSummary.length} Unique Workers)</td>
                      <td className="px-3 py-2.5 text-xs text-right">-</td>
                      <td className="px-3 py-2.5 text-xs text-right">{summaryKPI.totalProductionQty.toLocaleString('en-IN')}</td>
                      <td className="px-3 py-2.5 text-xs text-right text-emerald-600">₹{summaryKPI.totalAmount.toLocaleString('en-IN')}</td>
                      <td className="px-3 py-2.5 text-xs text-right">{filteredRecords.length}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              )
            )}

            {/* VIEW 3: WORK ACTIVITY & PRODUCTION OUTPUT TABLE */}
            {reportMode === 'workType' && (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="sticky top-0 bg-slate-100 z-20 shadow-xs border-b border-slate-300">
                    <Th width={45}>#</Th>
                    <Th field="workType">Work Activity</Th>
                    <Th>Rate Basis</Th>
                    <Th field="workEntries" align="right">Work Orders</Th>
                    <Th field="labourCount" align="right">Labour Headcount</Th>
                    <Th field="qtyMade" align="right">Production Output (Tons/Units)</Th>
                    <Th field="avgAmountPerLabour" align="right">Per Person Avg (₹)</Th>
                    <Th field="totalAmount" align="right">Total Amount (₹)</Th>
                    <Th align="center" width={100}>Action</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedData.map((w, idx) => (
                    <tr key={w.workType} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-3 py-2.5 text-xs text-slate-500 font-semibold">
                        {(currentPage - 1) * pageSize + idx + 1}
                      </td>
                      <td className="px-3 py-2.5 text-xs font-bold text-slate-900">
                        {w.workType}
                      </td>
                      <td className="px-3 py-2.5">
                        {w.isTon ? (
                          <span className={badgeEmerald}><Scale size={11} /> Per Person (Qty in Tons)</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border bg-indigo-50 text-indigo-700 border-indigo-200">
                            <User size={11} /> Per Person
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-slate-600 text-right font-semibold">{w.workEntries}</td>
                      <td className="px-3 py-2.5 text-xs text-slate-600 text-right font-semibold">{w.labourCount}</td>
                      <td className="px-3 py-2.5 text-xs text-slate-900 text-right font-bold">
                        {w.qtyMade ? w.qtyMade.toLocaleString('en-IN') : '-'}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-right font-semibold text-slate-600">
                        ₹{Number(w.avgAmountPerLabour).toLocaleString('en-IN')}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-right font-extrabold text-emerald-600">
                        ₹{Number(w.totalAmount).toLocaleString('en-IN')}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <button
                          onClick={() => {
                            setWorkTypeFilter(w.workType);
                            setReportMode('detailed');
                          }}
                          title={`View detailed entries for ${w.workType}`}
                          className="bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-md text-[11px] font-semibold px-2 py-1 transition-colors"
                        >
                          View Ledger
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50 font-bold text-slate-900 border-t-2 border-slate-300">
                    <td className="px-3 py-2.5 text-xs" colSpan={3}>Grand Total ({workTypeAnalysis.length} Work Activities)</td>
                    <td className="px-3 py-2.5 text-xs text-right">{summaryKPI.totalWorkEntries}</td>
                    <td className="px-3 py-2.5 text-xs text-right">{summaryKPI.uniqueLabourers}</td>
                    <td className="px-3 py-2.5 text-xs text-right">{summaryKPI.totalProductionQty.toLocaleString('en-IN')}</td>
                    <td className="px-3 py-2.5 text-xs text-right">₹{summaryKPI.avgPerLabour.toLocaleString('en-IN')}</td>
                    <td className="px-3 py-2.5 text-xs text-right text-emerald-600">₹{summaryKPI.totalAmount.toLocaleString('en-IN')}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            )}

            {/* VIEW 4: DATE & SHIFT DEPLOYMENT MATRIX */}
            {reportMode === 'dateShift' && (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="sticky top-0 bg-slate-100 z-20 shadow-xs border-b border-slate-300">
                    <Th width={45}>#</Th>
                    <Th field="date">Date</Th>
                    <Th field="shift">Shift</Th>
                    <Th field="workEntries" align="right">Work Orders</Th>
                    <Th field="uniqueLabourers" align="right">Labourers Deployed</Th>
                    <Th field="qtyMade" align="right">Production Output</Th>
                    <Th align="right">Per Person Avg (₹)</Th>
                    <Th field="totalAmount" align="right">Daily Payout (₹)</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedData.map((d, idx) => (
                    <tr key={`${d.date}_${d.shift}`} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-3 py-2.5 text-xs text-slate-500 font-semibold">
                        {(currentPage - 1) * pageSize + idx + 1}
                      </td>
                      <td className="px-3 py-2.5 text-xs font-bold text-slate-900 whitespace-nowrap">
                        {formatDate(d.date)}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={badgeSlate}>{d.shift}</span>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-slate-500 text-right">{d.workEntries}</td>
                      <td className="px-3 py-2.5 text-xs text-slate-600 text-right font-semibold">{d.uniqueLabourers}</td>
                      <td className="px-3 py-2.5 text-xs text-slate-600 text-right font-semibold">{d.qtyMade || '-'}</td>
                      <td className="px-3 py-2.5 text-xs text-right font-semibold text-slate-600">
                        ₹{Number(d.avgPerLabour).toLocaleString('en-IN')}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-right font-extrabold text-emerald-600">
                        ₹{Number(d.totalAmount).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50 font-bold text-slate-900 border-t-2 border-slate-300">
                    <td className="px-3 py-2.5 text-xs" colSpan={3}>Grand Total ({dateWiseSummary.length} Shift Deployments)</td>
                    <td className="px-3 py-2.5 text-xs text-right">{summaryKPI.totalWorkEntries}</td>
                    <td className="px-3 py-2.5 text-xs text-right">{summaryKPI.uniqueLabourers}</td>
                    <td className="px-3 py-2.5 text-xs text-right">{summaryKPI.totalProductionQty.toLocaleString('en-IN')}</td>
                    <td className="px-3 py-2.5 text-xs text-right">₹{summaryKPI.avgPerLabour.toLocaleString('en-IN')}</td>
                    <td className="px-3 py-2.5 text-xs text-right text-emerald-600">₹{summaryKPI.totalAmount.toLocaleString('en-IN')}</td>
                  </tr>
                </tfoot>
              </table>
            )}

            {/* VIEW 5: MASTER DETAILED TRANSACTION LEDGER */}
            {reportMode === 'detailed' && (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="sticky top-0 bg-slate-100 z-20 shadow-xs border-b border-slate-300">
                    <Th width={45}>#</Th>
                    <Th field="workId">Work ID</Th>
                    <Th field="date">Date</Th>
                    <Th>Shift</Th>
                    <Th>Firm</Th>
                    <Th field="incharge">Incharge</Th>
                    <Th field="work">Work Activity</Th>
                    <Th field="labourName">Labour Name</Th>
                    <Th>Remark</Th>
                    <Th align="right">Days</Th>
                    <Th align="right">Output</Th>
                    <Th field="amount" align="right">Amount (₹)</Th>
                    <Th>Status</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedData.map((r, idx) => (
                    <tr key={`${r.workId}_${idx}`} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-3 py-2.5 text-xs text-slate-500 font-semibold">
                        {(currentPage - 1) * pageSize + idx + 1}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="font-mono font-bold text-indigo-600 text-xs">{r.workId}</span>
                      </td>
                      <td className="px-3 py-2.5 text-xs font-semibold text-slate-700 whitespace-nowrap">{formatDate(r.date)}</td>
                      <td className="px-3 py-2.5 text-xs text-slate-600 whitespace-nowrap">{r.shift}</td>
                      <td className="px-3 py-2.5">
                        <span className={badgeSlate}>{r.firmName}</span>
                      </td>
                      <td className="px-3 py-2.5 text-xs font-semibold text-slate-700 whitespace-nowrap">{r.incharge}</td>
                      <td className="px-3 py-2.5">
                        <span className={badgeEmerald}>{r.work}</span>
                      </td>
                      <td className="px-3 py-2.5 text-xs font-bold text-slate-900">
                        {r.labourName}
                      </td>
                      <td className="px-3 py-2.5">
                        <div
                          className={`max-w-[140px] whitespace-nowrap overflow-hidden text-ellipsis text-xs ${r.workRemark ? 'text-slate-600' : 'text-slate-400 italic'}`}
                          title={r.workRemark || 'No remark'}
                        >
                          {r.workRemark || '—'}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-slate-600 text-right font-semibold">{r.days}</td>
                      <td className="px-3 py-2.5 text-xs text-slate-600 text-right font-semibold">{r.qtyMade || '-'}</td>
                      <td className="px-3 py-2.5 text-xs text-right font-extrabold text-emerald-600">
                        ₹{Number(r.amount).toLocaleString('en-IN')}
                      </td>
                      <td className="px-3 py-2.5">
                        <StatusBadge status={r.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50 font-bold text-slate-900 border-t-2 border-slate-300">
                    <td className="px-3 py-2.5 text-xs" colSpan={9}>Grand Total ({filteredRecords.length} Detailed Records)</td>
                    <td className="px-3 py-2.5 text-xs text-right">-</td>
                    <td className="px-3 py-2.5 text-xs text-right">{summaryKPI.totalProductionQty.toLocaleString('en-IN')}</td>
                    <td className="px-3 py-2.5 text-xs text-right text-emerald-600">₹{summaryKPI.totalAmount.toLocaleString('en-IN')}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between flex-wrap gap-2.5 px-4 py-3 border-t border-slate-200 shrink-0">
              <div className="text-xs text-slate-500 font-semibold">
                Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, currentViewData.length)} of {currentViewData.length} records
              </div>

              <div className="flex gap-1.5 items-center">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className={secondaryBtn}
                >
                  Previous
                </button>
                <span className="text-xs font-bold px-2 text-slate-800">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className={secondaryBtn}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
