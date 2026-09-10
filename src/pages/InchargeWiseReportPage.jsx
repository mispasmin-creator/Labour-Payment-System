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
          'Date': r.date,
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
        'Rate Basis': w.isTon ? 'Per Ton' : 'Per Person',
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
        'Date': d.date,
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

  return (
    <div style={{ maxWidth: 1440, margin: '0 auto', paddingBottom: 40 }}>
      {/* 1. Executive Top Header */}
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
            <span>Reports Hub</span>
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                Labour MIS & Executive Report Sheet
              </h1>
              <span className="badge badge-emerald" style={{ fontSize: '0.75rem', padding: '4px 10px', fontWeight: 700 }}>
                Enterprise Ledger
              </span>
            </div>
            <p style={{ fontSize: '0.82rem', color: '#64748B', margin: '3px 0 0 0' }}>
              Structured audit-ready reporting by Incharge, Labourer, Work Activity, Output & Payment Ledgers
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            onClick={refreshData}
            disabled={syncing}
            className="btn btn-outline-green btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            title="Refresh & Synchronize Live Google Sheet Data"
          >
            <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
            <span>{syncing ? 'Syncing...' : 'Sync Live'}</span>
          </button>

          <button
            onClick={handleExportCurrentCSV}
            className="btn btn-outline-green btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            title="Export Current View Data to Excel CSV"
          >
            <Download size={14} />
            <span>Export Excel</span>
          </button>

          <button
            onClick={handlePrint}
            className="btn btn-primary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            title="Print Ready A4 Report or Download PDF"
          >
            <Printer size={14} />
            <span>Print Report Sheet</span>
          </button>
        </div>
      </div>

      {/* 2. Professional Filter & Requirement Selector Panel */}
      <div className="card" style={{
        marginBottom: 20,
        padding: '18px 20px',
        background: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: 12,
        boxShadow: 'var(--shadow-sm)'
      }}>
        {/* Row 1: Report Requirement Mode Selector */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
          flexWrap: 'wrap',
          gap: 12,
          borderBottom: '1px solid #F1F5F9',
          paddingBottom: 14
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Select Report Requirement:
            </span>
          </div>

          {/* Segmented Mode Tabs */}
          <div style={{
            display: 'inline-flex',
            background: '#F1F5F9',
            padding: 4,
            borderRadius: 8,
            gap: 4,
            flexWrap: 'wrap'
          }}>
            {[
              { id: 'incharge', label: 'Incharge Summary', count: inchargeSummary.length },
              { id: 'labour', label: selectedSectionLabour ? `Labour: ${selectedSectionLabour}` : `Labour Wise Payout`, count: labourSummary.length },
              { id: 'workType', label: 'Work Activity & Output', count: workTypeAnalysis.length },
              { id: 'dateShift', label: 'Date & Shift Matrix', count: dateWiseSummary.length },
              { id: 'detailed', label: 'Master Detailed Ledger', count: filteredRecords.length }
            ].map(tab => {
              const active = reportMode === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setReportMode(tab.id);
                    setCurrentPage(1);
                    setSearchTerm('');
                  }}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 6,
                    border: 'none',
                    background: active ? '#059669' : 'transparent',
                    color: active ? '#FFFFFF' : '#475569',
                    fontSize: '0.8rem',
                    fontWeight: active ? 700 : 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  <span>{tab.label}</span>
                  <span style={{
                    fontSize: '0.72rem',
                    padding: '1px 6px',
                    borderRadius: 10,
                    background: active ? 'rgba(255,255,255,0.25)' : '#E2E8F0',
                    color: active ? '#FFFFFF' : '#64748B'
                  }}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Row 2: Comprehensive Filters Grid */}
        <div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 12,
            flexWrap: 'wrap',
            gap: 8
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>
              <Filter size={14} color="#059669" />
              <span>Data Scope & Date Filters:</span>
            </div>

            {/* Quick Date Presets */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.74rem', color: '#64748B', fontWeight: 600 }}>Quick:</span>
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
                  className="btn btn-secondary btn-sm"
                  style={{
                    fontSize: '0.74rem',
                    padding: '3px 8px',
                    borderRadius: 5
                  }}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: 10,
            alignItems: 'flex-end'
          }}>
            <div>
              <label className="form-label" style={{ fontSize: '0.74rem', marginBottom: 3 }}>Date From</label>
              <input
                type="date"
                className="form-input"
                style={{ padding: '6px 8px', fontSize: '0.82rem' }}
                value={dateFrom}
                onChange={e => {
                  setDateFrom(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>

            <div>
              <label className="form-label" style={{ fontSize: '0.74rem', marginBottom: 3 }}>Date To</label>
              <input
                type="date"
                className="form-input"
                style={{ padding: '6px 8px', fontSize: '0.82rem' }}
                value={dateTo}
                onChange={e => {
                  setDateTo(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>

            <div>
              <label className="form-label" style={{ fontSize: '0.74rem', marginBottom: 3 }}>Supervisor / Incharge</label>
              <select
                className="form-select"
                style={{ padding: '6px 8px', fontSize: '0.82rem' }}
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
              <label className="form-label" style={{ fontSize: '0.74rem', marginBottom: 3 }}>Shift</label>
              <select
                className="form-select"
                style={{ padding: '6px 8px', fontSize: '0.82rem' }}
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
              <label className="form-label" style={{ fontSize: '0.74rem', marginBottom: 3 }}>Firm Name</label>
              <select
                className="form-select"
                style={{ padding: '6px 8px', fontSize: '0.82rem' }}
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
              <label className="form-label" style={{ fontSize: '0.74rem', marginBottom: 3 }}>Type of Work</label>
              <select
                className="form-select"
                style={{ padding: '6px 8px', fontSize: '0.82rem' }}
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
              <label className="form-label" style={{ fontSize: '0.74rem', marginBottom: 3 }}>Status</label>
              <select
                className="form-select"
                style={{ padding: '6px 8px', fontSize: '0.82rem' }}
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
                className="btn btn-secondary"
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  padding: '6px 10px',
                  fontSize: '0.82rem',
                  opacity: hasActiveFilters ? 1 : 0.6
                }}
                title="Reset all active filters"
              >
                <RotateCcw size={13} />
                <span>Reset Filters</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Executive Financial Metrics Strip */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 12,
        marginBottom: 20
      }}>
        {/* Metric 1: Total Payroll */}
        <div style={{
          background: 'linear-gradient(135deg, #F0FDF4 0%, #FFFFFF 100%)',
          border: '1.5px solid #86EFAC',
          borderRadius: 10,
          padding: '14px 16px',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Total Reconciled Payout
            </span>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IndianRupee size={15} color="#15803D" />
            </div>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#15803D', marginTop: 4 }}>
            ₹{summaryKPI.totalAmount.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '0.74rem', color: '#166534', marginTop: 2, fontWeight: 600 }}>
            Scope Total Payroll Amount
          </div>
        </div>

        {/* Metric 2: Headcount */}
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: 10,
          padding: '14px 16px',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Labour Headcount
            </span>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={15} color="#0F172A" />
            </div>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0F172A', marginTop: 4 }}>
            {summaryKPI.uniqueLabourers} <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748B' }}>workers</span>
          </div>
          <div style={{ fontSize: '0.74rem', color: '#64748B', marginTop: 2, fontWeight: 600 }}>
            Across {summaryKPI.totalWorkEntries} Work Orders
          </div>
        </div>

        {/* Metric 3: Production Volume */}
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: 10,
          padding: '14px 16px',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Production Output
            </span>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Boxes size={15} color="#0F172A" />
            </div>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0F172A', marginTop: 4 }}>
            {summaryKPI.totalProductionQty.toLocaleString('en-IN')} <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748B' }}>tons / units</span>
          </div>
          <div style={{ fontSize: '0.74rem', color: '#64748B', marginTop: 2, fontWeight: 600 }}>
            Total Production Handled
          </div>
        </div>

        {/* Metric 4: Per Person Avg */}
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: 10,
          padding: '14px 16px',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Per Person Average
            </span>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp size={15} color="#059669" />
            </div>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0F172A', marginTop: 4 }}>
            ₹{summaryKPI.avgPerLabour.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '0.74rem', color: '#64748B', marginTop: 2, fontWeight: 600 }}>
            Average Payout / Worker
          </div>
        </div>
      </div>

      {/* 4. Loading State */}
      {loading && (
        <div style={{ padding: '60px', textAlign: 'center', background: '#FFFFFF', borderRadius: 12, border: '1px solid #E2E8F0' }}>
          <div className="animate-spin" style={{ display: 'inline-block', marginBottom: 12 }}>
            <RefreshCw size={32} color="#059669" />
          </div>
          <div style={{ color: '#0F172A', fontWeight: 700, fontSize: '1.05rem' }}>Reconciling Enterprise Labour Ledger...</div>
          <div style={{ color: '#64748B', fontSize: '0.84rem', marginTop: 4 }}>Pulling live data and computing breakdowns</div>
        </div>
      )}

      {/* 5. Empty State */}
      {!loading && filteredRecords.length === 0 && (
        <div style={{
          background: '#FFFFFF',
          padding: '48px 24px',
          borderRadius: 12,
          border: '1px solid #E2E8F0',
          textAlign: 'center'
        }}>
          <div style={{ display: 'inline-flex', padding: 16, borderRadius: '50%', background: '#F1F5F9', color: '#64748B', marginBottom: 14 }}>
            <Users size={36} />
          </div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0F172A', margin: '0 0 6px 0' }}>No Records In Selected Scope</h3>
          <p style={{ color: '#64748B', maxWidth: 440, margin: '0 auto 18px', fontSize: '0.85rem' }}>
            No work deployment records match your active filters. Try adjusting the date range, incharge or work activity filter.
          </p>
          <button onClick={clearAllFilters} className="btn btn-outline-green btn-sm">
            Reset All Filters
          </button>
        </div>
      )}

      {/* 6. Active Professional Report Sheet Section */}
      {!loading && filteredRecords.length > 0 && (
        <div className="card" style={{
          padding: '20px',
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: 12,
          boxShadow: 'var(--shadow-sm)'
        }}>
          {/* Table Header Strip: Title, Search, and Scope Actions */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 16,
            flexWrap: 'wrap',
            gap: 12,
            borderBottom: '1px solid #F1F5F9',
            paddingBottom: 14
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                  {reportMode === 'incharge' && '1. Incharge / Supervisor Deployment Summary'}
                  {reportMode === 'labour' && (selectedSectionLabour ? `2. Attendance & Payout Ledger: ${selectedSectionLabour}` : '2. Labour Wise Attendance & Payout Summary')}
                  {reportMode === 'workType' && '3. Work Activity & Production Output Ledger'}
                  {reportMode === 'dateShift' && '4. Date & Shift Deployment Matrix'}
                  {reportMode === 'detailed' && '5. Master Detailed Transaction Ledger'}
                </h3>
              </div>
              <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: 3 }}>
                Showing {currentViewData.length} records matching current criteria
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              {/* If on labour mode, provide quick labour switcher */}
              {reportMode === 'labour' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <select
                    className="form-select"
                    style={{
                      padding: '5px 10px',
                      fontSize: '0.8rem',
                      maxWidth: 220,
                      fontWeight: selectedSectionLabour ? 700 : 500,
                      borderColor: selectedSectionLabour ? '#059669' : '#CBD5E1',
                      background: selectedSectionLabour ? '#F0FDF4' : '#FFFFFF'
                    }}
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
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '0.74rem', padding: '5px 8px' }}
                    >
                      View All
                    </button>
                  )}
                </div>
              )}

              {/* Table Search Input */}
              <div className="search-input-wrap" style={{ minWidth: 220 }}>
                <Search size={14} />
                <input
                  type="text"
                  className="form-input"
                  style={{ padding: '6px 10px 6px 32px', fontSize: '0.82rem' }}
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
                className="btn btn-secondary btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: 5 }}
                title="Export this specific table view to CSV"
              >
                <Download size={13} />
                <span>Export Table CSV</span>
              </button>
            </div>
          </div>

          {/* Drill-down Worker Header (If single labour is selected) */}
          {reportMode === 'labour' && selectedSectionLabour && selectedLabourStats && (
            <div style={{
              marginBottom: 16,
              padding: '14px 18px',
              background: 'linear-gradient(135deg, #ECFDF5 0%, #FFFFFF 100%)',
              border: '1px solid #A7F3D0',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 38,
                  height: 38,
                  borderRadius: '50%',
                  background: '#059669',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '1.1rem'
                }}>
                  {selectedLabourStats.labourName.charAt(0)}
                </div>
                <div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#064E3B' }}>
                    {selectedLabourStats.labourName}
                  </div>
                  <div style={{ fontSize: '0.76rem', color: '#047857', fontWeight: 600 }}>
                    Supervisors: {selectedLabourStats.incharges.join(', ') || 'N/A'} • Activities: {selectedLabourStats.workTypes.join(', ') || 'N/A'}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <div style={{ textAlign: 'center', background: '#FFFFFF', padding: '4px 12px', borderRadius: 6, border: '1px solid #BBF7D0' }}>
                  <div style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Working Days</div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0F172A' }}>{selectedLabourStats.totalDays} Days</div>
                </div>
                <div style={{ textAlign: 'center', background: '#FFFFFF', padding: '4px 12px', borderRadius: 6, border: '1px solid #BBF7D0' }}>
                  <div style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Total Payout</div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: '#059669' }}>₹{Number(selectedLabourStats.totalAmount).toLocaleString('en-IN')}</div>
                </div>
                <div style={{ textAlign: 'center', background: '#FFFFFF', padding: '4px 12px', borderRadius: 6, border: '1px solid #BBF7D0' }}>
                  <div style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Daily Avg</div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: '#047857' }}>₹{selectedLabourStats.avgPerDay}</div>
                </div>
                <div style={{ textAlign: 'center', background: '#FFFFFF', padding: '4px 12px', borderRadius: 6, border: '1px solid #BBF7D0' }}>
                  <div style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Output</div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0F172A' }}>{selectedLabourStats.totalQtyMade}</div>
                </div>
              </div>
            </div>
          )}

          {/* Table Container */}
          <div className="table-container" style={{ overflowX: 'auto' }}>
            {/* VIEW 1: INCHARGE SUMMARY TABLE */}
            {reportMode === 'incharge' && (
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: 45 }}>#</th>
                    <th onClick={() => handleSort('incharge')} style={{ cursor: 'pointer' }}>
                      Incharge / Supervisor <ArrowUpDown size={11} style={{ display: 'inline', marginLeft: 4 }} />
                    </th>
                    <th style={{ textAlign: 'right' }} onClick={() => handleSort('workEntries')}>
                      Work Orders <ArrowUpDown size={11} style={{ display: 'inline', marginLeft: 4 }} />
                    </th>
                    <th style={{ textAlign: 'right' }} onClick={() => handleSort('uniqueLabourers')}>
                      Labourers (Count) <ArrowUpDown size={11} style={{ display: 'inline', marginLeft: 4 }} />
                    </th>
                    <th style={{ textAlign: 'right' }} onClick={() => handleSort('qtyMade')}>
                      Output (Tons/Units) <ArrowUpDown size={11} style={{ display: 'inline', marginLeft: 4 }} />
                    </th>
                    <th style={{ textAlign: 'right' }} onClick={() => handleSort('avgPerLabour')}>
                      Per Person Amount (₹) <ArrowUpDown size={11} style={{ display: 'inline', marginLeft: 4 }} />
                    </th>
                    <th style={{ textAlign: 'right' }} onClick={() => handleSort('totalAmount')}>
                      Total Amount (₹) <ArrowUpDown size={11} style={{ display: 'inline', marginLeft: 4 }} />
                    </th>
                    <th style={{ textAlign: 'center', width: 90 }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.map((inc, idx) => (
                    <tr key={inc.incharge}>
                      <td style={{ color: '#64748B', fontWeight: 600 }}>
                        {(currentPage - 1) * pageSize + idx + 1}
                      </td>
                      <td style={{ fontWeight: 700, color: '#0F172A' }}>
                        <span style={{ color: '#059669', marginRight: 6 }}>●</span>
                        {inc.incharge}
                      </td>
                      <td style={{ textAlign: 'right', color: '#64748B', fontWeight: 600 }}>{inc.workEntries}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{inc.uniqueLabourers}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{inc.qtyMade ? inc.qtyMade.toLocaleString('en-IN') : '-'}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: '#047857' }}>
                        ₹{Number(inc.avgPerLabour).toLocaleString('en-IN')}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 800, color: '#059669' }}>
                        ₹{Number(inc.totalAmount).toLocaleString('en-IN')}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          onClick={() => {
                            setInchargeFilter(inc.incharge);
                            setReportMode('detailed');
                          }}
                          className="btn btn-secondary btn-sm"
                          style={{ fontSize: '0.72rem', padding: '2px 8px' }}
                          title={`View detailed entries for ${inc.incharge}`}
                        >
                          View Ledger
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: '#F8FAFC', fontWeight: 800 }}>
                    <td colSpan={2}>Grand Total ({inchargeSummary.length} Incharges)</td>
                    <td style={{ textAlign: 'right' }}>{summaryKPI.totalWorkEntries}</td>
                    <td style={{ textAlign: 'right' }}>{summaryKPI.uniqueLabourers}</td>
                    <td style={{ textAlign: 'right' }}>{summaryKPI.totalProductionQty.toLocaleString('en-IN')}</td>
                    <td style={{ textAlign: 'right', color: '#047857' }}>₹{summaryKPI.avgPerLabour.toLocaleString('en-IN')}</td>
                    <td style={{ textAlign: 'right', color: '#059669' }}>₹{summaryKPI.totalAmount.toLocaleString('en-IN')}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            )}

            {/* VIEW 2: LABOUR WISE PAYOUT TABLE */}
            {reportMode === 'labour' && (
              selectedSectionLabour ? (
                /* 2A: Single Worker Date-wise History Table */
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: 45 }}>#</th>
                      <th>Date</th>
                      <th>Supervisor / Incharge</th>
                      <th>Shift</th>
                      <th>Firm</th>
                      <th>Work Activity</th>
                      <th>Work Remark</th>
                      <th style={{ textAlign: 'right' }}>Days</th>
                      <th style={{ textAlign: 'right' }}>Amount (₹)</th>
                      <th style={{ textAlign: 'right' }}>Output Qty</th>
                      <th>Workflow Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedData.map((r, idx) => (
                      <tr key={`${r.workId}_${idx}`}>
                        <td style={{ color: '#64748B', fontWeight: 600 }}>
                          {(currentPage - 1) * pageSize + idx + 1}
                        </td>
                        <td style={{ fontWeight: 700, color: '#0F172A' }}>
                          {formatDate(r.date)}
                        </td>
                        <td style={{ fontWeight: 600, color: '#065F46' }}>
                          <span style={{ color: '#059669', marginRight: 4 }}>●</span>
                          {r.incharge}
                        </td>
                        <td>{r.shift || '-'}</td>
                        <td>
                          <span className="badge" style={{ background: '#F1F5F9', color: '#334155', fontSize: '0.74rem' }}>
                            {r.firmName || '-'}
                          </span>
                        </td>
                        <td>
                          <span className="badge" style={{ background: '#ECFDF5', color: '#065F46', fontSize: '0.74rem', fontWeight: 600 }}>
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
                      <td colSpan={7}>Total Payout for {selectedLabourStats.labourName}</td>
                      <td style={{ textAlign: 'right' }}>{selectedLabourStats.totalDays}</td>
                      <td style={{ textAlign: 'right', color: '#059669' }}>₹{Number(selectedLabourStats.totalAmount).toLocaleString('en-IN')}</td>
                      <td style={{ textAlign: 'right' }}>{selectedLabourStats.totalQtyMade}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              ) : (
                /* 2B: All Workers Summary Table */
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: 45 }}>#</th>
                      <th onClick={() => handleSort('labourName')} style={{ cursor: 'pointer' }}>
                        Labour Worker Name <ArrowUpDown size={11} style={{ display: 'inline', marginLeft: 4 }} />
                      </th>
                      <th>Supervising Incharge(s)</th>
                      <th>Assigned Work Types</th>
                      <th style={{ textAlign: 'right' }} onClick={() => handleSort('totalDays')}>
                        Working Days <ArrowUpDown size={11} style={{ display: 'inline', marginLeft: 4 }} />
                      </th>
                      <th style={{ textAlign: 'right' }} onClick={() => handleSort('totalQty')}>
                        Total Output <ArrowUpDown size={11} style={{ display: 'inline', marginLeft: 4 }} />
                      </th>
                      <th style={{ textAlign: 'right' }} onClick={() => handleSort('totalAmount')}>
                        Total Amount (₹) <ArrowUpDown size={11} style={{ display: 'inline', marginLeft: 4 }} />
                      </th>
                      <th style={{ textAlign: 'right' }}>Work Orders</th>
                      <th style={{ textAlign: 'center', width: 80 }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedData.map((l, idx) => (
                      <tr
                        key={l.labourName}
                        onClick={() => setSelectedSectionLabour(l.labourName)}
                        style={{ cursor: 'pointer' }}
                      >
                        <td style={{ color: '#64748B', fontWeight: 600 }}>
                          {(currentPage - 1) * pageSize + idx + 1}
                        </td>
                        <td style={{ fontWeight: 700, color: '#0F172A' }}>
                          <span style={{ color: '#059669', textDecoration: 'underline' }}>
                            {l.labourName}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.8rem', color: '#475569' }}>
                          {l.incharges.slice(0, 2).join(', ')}{l.incharges.length > 2 ? ` +${l.incharges.length - 2}` : ''}
                        </td>
                        <td style={{ fontSize: '0.8rem', color: '#475569' }}>
                          {l.workTypes.slice(0, 2).join(', ')}{l.workTypes.length > 2 ? ` +${l.workTypes.length - 2}` : ''}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>{l.totalDays}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>{l.totalQty || '-'}</td>
                        <td style={{ textAlign: 'right', fontWeight: 800, color: '#059669' }}>
                          ₹{Number(l.totalAmount).toLocaleString('en-IN')}
                        </td>
                        <td style={{ textAlign: 'right', color: '#64748B' }}>{l.workEntries}</td>
                        <td style={{ textAlign: 'center' }}>
                          <span className="btn btn-secondary btn-sm" style={{ fontSize: '0.72rem', padding: '2px 8px' }}>
                            Details
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: '#F8FAFC', fontWeight: 800 }}>
                      <td colSpan={4}>Grand Total ({labourSummary.length} Unique Workers)</td>
                      <td style={{ textAlign: 'right' }}>-</td>
                      <td style={{ textAlign: 'right' }}>{summaryKPI.totalProductionQty.toLocaleString('en-IN')}</td>
                      <td style={{ textAlign: 'right', color: '#059669' }}>₹{summaryKPI.totalAmount.toLocaleString('en-IN')}</td>
                      <td style={{ textAlign: 'right' }}>{filteredRecords.length}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              )
            )}

            {/* VIEW 3: WORK ACTIVITY & PRODUCTION OUTPUT TABLE */}
            {reportMode === 'workType' && (
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: 45 }}>#</th>
                    <th onClick={() => handleSort('workType')} style={{ cursor: 'pointer' }}>
                      Work Activity <ArrowUpDown size={11} style={{ display: 'inline', marginLeft: 4 }} />
                    </th>
                    <th>Rate Basis</th>
                    <th style={{ textAlign: 'right' }} onClick={() => handleSort('workEntries')}>
                      Work Orders <ArrowUpDown size={11} style={{ display: 'inline', marginLeft: 4 }} />
                    </th>
                    <th style={{ textAlign: 'right' }} onClick={() => handleSort('labourCount')}>
                      Labour Headcount <ArrowUpDown size={11} style={{ display: 'inline', marginLeft: 4 }} />
                    </th>
                    <th style={{ textAlign: 'right' }} onClick={() => handleSort('qtyMade')}>
                      Production Output (Tons/Units) <ArrowUpDown size={11} style={{ display: 'inline', marginLeft: 4 }} />
                    </th>
                    <th style={{ textAlign: 'right' }} onClick={() => handleSort('avgAmountPerLabour')}>
                      Per Person Avg (₹) <ArrowUpDown size={11} style={{ display: 'inline', marginLeft: 4 }} />
                    </th>
                    <th style={{ textAlign: 'right' }} onClick={() => handleSort('totalAmount')}>
                      Total Amount (₹) <ArrowUpDown size={11} style={{ display: 'inline', marginLeft: 4 }} />
                    </th>
                    <th style={{ textAlign: 'center', width: 90 }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.map((w, idx) => (
                    <tr key={w.workType}>
                      <td style={{ color: '#64748B', fontWeight: 600 }}>
                        {(currentPage - 1) * pageSize + idx + 1}
                      </td>
                      <td style={{ fontWeight: 700, color: '#0F172A' }}>
                        {w.workType}
                      </td>
                      <td>
                        <span className="badge" style={{
                          background: w.isTon ? '#ECFDF5' : '#EFF6FF',
                          color: w.isTon ? '#065F46' : '#1D4ED8',
                          fontSize: '0.72rem',
                          fontWeight: 700
                        }}>
                          {w.isTon ? '⚖️ Per Ton' : '👤 Per Person'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', color: '#64748B', fontWeight: 600 }}>{w.workEntries}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{w.labourCount}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: '#0F172A' }}>
                        {w.qtyMade ? w.qtyMade.toLocaleString('en-IN') : '-'}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>
                        ₹{Number(w.avgAmountPerLabour).toLocaleString('en-IN')}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 800, color: '#059669' }}>
                        ₹{Number(w.totalAmount).toLocaleString('en-IN')}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          onClick={() => {
                            setWorkTypeFilter(w.workType);
                            setReportMode('detailed');
                          }}
                          className="btn btn-secondary btn-sm"
                          style={{ fontSize: '0.72rem', padding: '2px 8px' }}
                          title={`View detailed entries for ${w.workType}`}
                        >
                          View Ledger
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: '#F8FAFC', fontWeight: 800 }}>
                    <td colSpan={3}>Grand Total ({workTypeAnalysis.length} Work Activities)</td>
                    <td style={{ textAlign: 'right' }}>{summaryKPI.totalWorkEntries}</td>
                    <td style={{ textAlign: 'right' }}>{summaryKPI.uniqueLabourers}</td>
                    <td style={{ textAlign: 'right' }}>{summaryKPI.totalProductionQty.toLocaleString('en-IN')}</td>
                    <td style={{ textAlign: 'right' }}>₹{summaryKPI.avgPerLabour.toLocaleString('en-IN')}</td>
                    <td style={{ textAlign: 'right', color: '#059669' }}>₹{summaryKPI.totalAmount.toLocaleString('en-IN')}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            )}

            {/* VIEW 4: DATE & SHIFT DEPLOYMENT MATRIX */}
            {reportMode === 'dateShift' && (
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: 45 }}>#</th>
                    <th onClick={() => handleSort('date')} style={{ cursor: 'pointer' }}>
                      Date <ArrowUpDown size={11} style={{ display: 'inline', marginLeft: 4 }} />
                    </th>
                    <th onClick={() => handleSort('shift')} style={{ cursor: 'pointer' }}>
                      Shift <ArrowUpDown size={11} style={{ display: 'inline', marginLeft: 4 }} />
                    </th>
                    <th style={{ textAlign: 'right' }} onClick={() => handleSort('workEntries')}>
                      Work Orders <ArrowUpDown size={11} style={{ display: 'inline', marginLeft: 4 }} />
                    </th>
                    <th style={{ textAlign: 'right' }} onClick={() => handleSort('uniqueLabourers')}>
                      Labourers Deployed <ArrowUpDown size={11} style={{ display: 'inline', marginLeft: 4 }} />
                    </th>
                    <th style={{ textAlign: 'right' }} onClick={() => handleSort('qtyMade')}>
                      Production Output <ArrowUpDown size={11} style={{ display: 'inline', marginLeft: 4 }} />
                    </th>
                    <th style={{ textAlign: 'right' }}>Per Person Avg (₹)</th>
                    <th style={{ textAlign: 'right' }} onClick={() => handleSort('totalAmount')}>
                      Daily Payout (₹) <ArrowUpDown size={11} style={{ display: 'inline', marginLeft: 4 }} />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.map((d, idx) => (
                    <tr key={`${d.date}_${d.shift}`}>
                      <td style={{ color: '#64748B', fontWeight: 600 }}>
                        {(currentPage - 1) * pageSize + idx + 1}
                      </td>
                      <td style={{ fontWeight: 700, color: '#0F172A' }}>
                        {formatDate(d.date)}
                      </td>
                      <td>
                        <span className="badge" style={{ background: '#F1F5F9', color: '#334155', fontSize: '0.74rem' }}>
                          {d.shift}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', color: '#64748B' }}>{d.workEntries}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{d.uniqueLabourers}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{d.qtyMade || '-'}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>
                        ₹{Number(d.avgPerLabour).toLocaleString('en-IN')}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 800, color: '#059669' }}>
                        ₹{Number(d.totalAmount).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: '#F8FAFC', fontWeight: 800 }}>
                    <td colSpan={3}>Grand Total ({dateWiseSummary.length} Shift Deployments)</td>
                    <td style={{ textAlign: 'right' }}>{summaryKPI.totalWorkEntries}</td>
                    <td style={{ textAlign: 'right' }}>{summaryKPI.uniqueLabourers}</td>
                    <td style={{ textAlign: 'right' }}>{summaryKPI.totalProductionQty.toLocaleString('en-IN')}</td>
                    <td style={{ textAlign: 'right' }}>₹{summaryKPI.avgPerLabour.toLocaleString('en-IN')}</td>
                    <td style={{ textAlign: 'right', color: '#059669' }}>₹{summaryKPI.totalAmount.toLocaleString('en-IN')}</td>
                  </tr>
                </tfoot>
              </table>
            )}

            {/* VIEW 5: MASTER DETAILED TRANSACTION LEDGER */}
            {reportMode === 'detailed' && (
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: 45 }}>#</th>
                    <th onClick={() => handleSort('workId')} style={{ cursor: 'pointer' }}>
                      Work ID <ArrowUpDown size={11} style={{ display: 'inline', marginLeft: 4 }} />
                    </th>
                    <th onClick={() => handleSort('date')} style={{ cursor: 'pointer' }}>
                      Date <ArrowUpDown size={11} style={{ display: 'inline', marginLeft: 4 }} />
                    </th>
                    <th>Shift</th>
                    <th>Firm</th>
                    <th onClick={() => handleSort('incharge')} style={{ cursor: 'pointer' }}>
                      Incharge <ArrowUpDown size={11} style={{ display: 'inline', marginLeft: 4 }} />
                    </th>
                    <th onClick={() => handleSort('work')} style={{ cursor: 'pointer' }}>
                      Work Activity <ArrowUpDown size={11} style={{ display: 'inline', marginLeft: 4 }} />
                    </th>
                    <th onClick={() => handleSort('labourName')} style={{ cursor: 'pointer' }}>
                      Labour Name <ArrowUpDown size={11} style={{ display: 'inline', marginLeft: 4 }} />
                    </th>
                    <th>Remark</th>
                    <th style={{ textAlign: 'right' }}>Days</th>
                    <th style={{ textAlign: 'right' }}>Output</th>
                    <th style={{ textAlign: 'right' }} onClick={() => handleSort('amount')}>
                      Amount (₹) <ArrowUpDown size={11} style={{ display: 'inline', marginLeft: 4 }} />
                    </th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.map((r, idx) => (
                    <tr key={`${r.workId}_${idx}`}>
                      <td style={{ color: '#64748B', fontWeight: 600 }}>
                        {(currentPage - 1) * pageSize + idx + 1}
                      </td>
                      <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#0F172A', fontSize: '0.78rem' }}>
                        {r.workId}
                      </td>
                      <td style={{ fontWeight: 600 }}>{formatDate(r.date)}</td>
                      <td>{r.shift}</td>
                      <td>
                        <span className="badge" style={{ background: '#F1F5F9', color: '#334155', fontSize: '0.72rem' }}>
                          {r.firmName}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600, color: '#065F46' }}>{r.incharge}</td>
                      <td>
                        <div>
                          <span className="badge" style={{ background: '#ECFDF5', color: '#065F46', fontSize: '0.72rem', fontWeight: 700 }}>
                            {r.work}
                          </span>
                        </div>
                      </td>
                      <td style={{ fontWeight: 700, color: '#0F172A' }}>
                        {r.labourName}
                      </td>
                      <td>
                        <div
                          style={{
                            maxWidth: 140,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            color: r.workRemark ? '#334155' : '#94A3B8',
                            fontStyle: r.workRemark ? 'normal' : 'italic',
                            fontSize: '0.78rem'
                          }}
                          title={r.workRemark || 'No remark'}
                        >
                          {r.workRemark || '—'}
                        </div>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{r.days}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{r.qtyMade || '-'}</td>
                      <td style={{ textAlign: 'right', fontWeight: 800, color: '#059669' }}>
                        ₹{Number(r.amount).toLocaleString('en-IN')}
                      </td>
                      <td>
                        <StatusBadge status={r.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: '#F8FAFC', fontWeight: 800 }}>
                    <td colSpan={9}>Grand Total ({filteredRecords.length} Detailed Records)</td>
                    <td style={{ textAlign: 'right' }}>-</td>
                    <td style={{ textAlign: 'right' }}>{summaryKPI.totalProductionQty.toLocaleString('en-IN')}</td>
                    <td style={{ textAlign: 'right', color: '#059669' }}>₹{summaryKPI.totalAmount.toLocaleString('en-IN')}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: 16,
              paddingTop: 14,
              borderTop: '1px solid #E2E8F0',
              flexWrap: 'wrap',
              gap: 10
            }}>
              <div style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 600 }}>
                Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, currentViewData.length)} of {currentViewData.length} records
              </div>

              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '0.8rem', padding: '4px 10px' }}
                >
                  Previous
                </button>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, padding: '0 8px', color: '#0F172A' }}>
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '0.8rem', padding: '4px 10px' }}
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
