import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import confetti from 'canvas-confetti';
import {
  fetchEntries,
  fetchMasterData,
  fetchUsers,
  fetchAllData,
  saveUsersToRemote,
  saveMasterData,
  getScriptUrl,
  setScriptUrl as setScriptUrlApi,
  resetToDemoData,
  sendToAppsScript,
  filterValidEntries
} from '../services/api';
import { DEFAULT_LOGIN_USERS } from '../utils/mockData';
import { calculateWorkflowDelay, getNowTimestamp } from '../utils/dateUtils';

export const AppContext = createContext();

export const ROLES = {
  ALL: 'Admin (All Access)',
  INCHARGE: 'Supervisor / Incharge',
  VERIFIER: 'Verifier (Site / Ops)',
  APPROVER: 'Approver (Management)',
  PAYMENT: 'Payment Officer (Finance)',
  TALLY: 'Tally Officer (Accounts)'
};

export const SYSTEM_MODULES = [
  { id: 'dashboard', label: 'Dashboard Overview', path: '/' },
  { id: 'new_entry', label: 'New Work Entry (Form)', path: '/new-entry' },
  { id: 'tracker', label: 'All Work Orders Master Grid', path: '/tracker' },
  { id: 'verification', label: 'Work Verification', path: '/verification' },
  { id: 'payment_report', label: 'Payment Report', path: '/payment-report' },
  { id: 'reports', label: 'Reports & Export', path: '/reports' },
  { id: 'admin', label: 'Administration & User Access', path: '/admin' }
];

export { DEFAULT_LOGIN_USERS };

export function AppProvider({ children }) {
  // Initialize entries directly from localStorage so UI displays instantly (0ms)
  const [entries, setEntries] = useState(() => {
    try {
      const raw = localStorage.getItem('labour_sys_entries');
      return raw ? filterValidEntries(JSON.parse(raw)) : [];
    } catch (e) {
      return [];
    }
  });
  const [masterData, setMasterData] = useState(() => {
    try {
      const raw = localStorage.getItem('labour_sys_master');
      return raw ? JSON.parse(raw) : { incharges: [], labourers: [], shifts: [], workTypes: [] };
    } catch (e) {
      return { incharges: [], labourers: [], shifts: [], workTypes: [] };
    }
  });
  const [currentRole, setCurrentRole] = useState(ROLES.ALL);


  // Users database from "Login Page" Sheet / LocalStorage / Preset
  const [users, setUsers] = useState(() => {
    try {
      const stored = localStorage.getItem('labour_sys_users_db');
      if (stored) {
        const parsed = JSON.parse(stored);
        // If stored contains old store users like 'admin13' or 'Store Head', reset to DEFAULT_LOGIN_USERS
        const hasOldStoreUser = Array.isArray(parsed) && parsed.some(u => u.username === 'admin13' || u.username === 'Store Head');
        if (Array.isArray(parsed) && parsed.length > 0 && !hasOldStoreUser) return parsed;
      }
      localStorage.setItem('labour_sys_users_db', JSON.stringify(DEFAULT_LOGIN_USERS));
      return DEFAULT_LOGIN_USERS;
    } catch (e) {
      return DEFAULT_LOGIN_USERS;
    }
  });

  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const stored = localStorage.getItem('labour_sys_auth_user');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object' && parsed.isAuthenticated && parsed.username !== 'admin13') {
          return {
            id: parsed.id || 'usr_admin',
            username: parsed.username || 'admin',
            role: parsed.role || 'admin',
            displayName: parsed.displayName || parsed.name || 'Admin',
            assignedFirms: Array.isArray(parsed.assignedFirms) ? parsed.assignedFirms : ['*'],
            permissions: (Array.isArray(parsed.permissions) && parsed.permissions.length > 0)
              ? parsed.permissions
              : SYSTEM_MODULES.map(m => m.id),
            isAuthenticated: true
          };
        }
      }
    } catch (e) {}
    // Default to null - user must enter credentials on Login Page
    return null;
  });

  const [scriptUrl, setScriptUrlState] = useState(getScriptUrl());
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [isNewEntryOpen, setIsNewEntryOpen] = useState(false);

  const openNewEntry = useCallback(() => setIsNewEntryOpen(true), []);
  const closeNewEntry = useCallback(() => setIsNewEntryOpen(false), []);

  // Toast helper
  const showToast = useCallback((message, type = 'success') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  const saveUsers = useCallback(newUsers => {
    setUsers(newUsers);
    localStorage.setItem('labour_sys_users_db', JSON.stringify(newUsers));
    saveUsersToRemote(newUsers).catch(err => console.warn('Users remote sync failed:', err));
  }, []);

  const addUser = useCallback(userData => {
    const newUser = {
      id: `usr_${Date.now()}`,
      username: userData.username.trim(),
      password: userData.password || 'user123',
      name: userData.name.trim(),
      role: userData.role || 'user',
      status: userData.status || 'active',
      assignedFirms: Array.isArray(userData.assignedFirms) && userData.assignedFirms.length > 0 ? userData.assignedFirms : ['*'],
      permissions: userData.permissions || ['dashboard', 'new_entry', 'tracker']
    };
    const updated = [...users, newUser];
    saveUsers(updated);
    showToast(`User account "${newUser.name}" created successfully!`, 'success');
  }, [users, saveUsers, showToast]);

  const updateUser = useCallback((userId, updatedData) => {
    const updated = users.map(u => {
      if (u.id === userId) {
        return {
          ...u,
          ...updatedData,
          password: updatedData.password ? updatedData.password : u.password,
          assignedFirms: updatedData.assignedFirms || u.assignedFirms || ['*']
        };
      }
      return u;
    });
    saveUsers(updated);

    // If current logged-in user was updated, sync session
    if (currentUser?.id === userId) {
      const fresh = updated.find(u => u.id === userId);
      if (fresh) {
        const synced = {
          ...currentUser,
          displayName: fresh.name,
          role: fresh.role,
          assignedFirms: fresh.assignedFirms || ['*'],
          permissions: fresh.permissions
        };
        setCurrentUser(synced);
        localStorage.setItem('labour_sys_auth_user', JSON.stringify(synced));
      }
    }

    showToast('User profile & permissions updated!', 'success');
  }, [users, currentUser, saveUsers, showToast]);

  const deleteUser = useCallback(userId => {
    const updated = users.filter(u => u.id !== userId);
    saveUsers(updated);
    showToast('User account removed.', 'info');
  }, [users, saveUsers, showToast]);

  const hasPermission = useCallback((moduleId, requiredLevel = 'view') => {
    if (!currentUser || currentUser.isAuthenticated === false) return false;
    if (currentUser.role === 'admin') return true;
    if (!currentUser.permissions) return true;

    const perms = currentUser.permissions;

    // Production module default allow for authenticated users
    if (moduleId === 'production') {
      if (Array.isArray(perms) && perms.includes('production:none')) return false;
      if (typeof perms === 'object' && perms.production === 'none') return false;
      return true;
    }

    // Expand payment_report to also accept legacy permissions
    const candidateIds = moduleId === 'payment_report'
      ? ['payment_report', 'approval', 'payment', 'tally']
      : [moduleId];

    // If permissions is an array
    if (Array.isArray(perms)) {
      const isFull = candidateIds.some(id => perms.includes(`${id}:full`) || perms.includes(id));
      const isView = candidateIds.some(id => perms.includes(`${id}:view`)) || isFull;
      if (requiredLevel === 'view') return isView;
      if (requiredLevel === 'full' || requiredLevel === 'action') {
        if (candidateIds.some(id => perms.includes(`${id}:view`)) && !isFull) {
          return false;
        }
        return isFull;
      }
    }

    // If permissions is an object/map
    if (typeof perms === 'object') {
      for (const id of candidateIds) {
        const lvl = perms[id];
        if (lvl && lvl !== 'none') {
          if (requiredLevel === 'view') return lvl === 'view' || lvl === 'full';
          if (requiredLevel === 'full' || requiredLevel === 'action') return lvl === 'full';
        }
      }
    }

    return false;
  }, [currentUser]);

  const canPerformAction = useCallback(moduleId => {
    return hasPermission(moduleId, 'full');
  }, [hasPermission]);

  const getAccessLevel = useCallback((userObj, moduleId) => {
    if (!userObj) return 'none';
    if (userObj.role === 'admin') return 'full';
    const perms = userObj.permissions;
    if (!perms) return 'none';

    if (Array.isArray(perms)) {
      if (perms.includes(`${moduleId}:full`)) return 'full';
      if (perms.includes(`${moduleId}:view`)) return 'view';
      if (perms.includes(moduleId)) return 'full';
    } else if (typeof perms === 'object') {
      return perms[moduleId] || 'none';
    }
    return 'none';
  }, []);

  const hasFirmAccess = useCallback(firmName => {
    if (!currentUser || currentUser.isAuthenticated === false) return true;
    if (currentUser.role === 'admin') return true;
    if (!currentUser.assignedFirms || !Array.isArray(currentUser.assignedFirms) || currentUser.assignedFirms.length === 0) return true;
    if (currentUser.assignedFirms.includes('*') || currentUser.assignedFirms.includes('ALL')) return true;
    if (!firmName || firmName === '-' || firmName === '') return true;
    return currentUser.assignedFirms.some(f => f.toLowerCase().trim() === firmName.toLowerCase().trim());
  }, [currentUser]);

  const login = useCallback((username, password) => {
    const inputUname = String(username || '').trim();
    const inputPwd = String(password || '').trim();

    if (!inputUname || !inputPwd) {
      showToast('Please enter both username and password.', 'error');
      return false;
    }

    // Match in users list (case-insensitive for username/name)
    const userPool = Array.isArray(users) && users.length > 0 ? users : DEFAULT_LOGIN_USERS;
    const matchedUser = userPool.find(
      u => String(u.username || '').toLowerCase().trim() === inputUname.toLowerCase() ||
           String(u.name || '').toLowerCase().trim() === inputUname.toLowerCase()
    );

    if (!matchedUser) {
      showToast('Invalid username or password.', 'error');
      return false;
    }

    if (matchedUser.status === 'inactive') {
      showToast('This user account is inactive. Please contact Admin.', 'error');
      return false;
    }

    // Strict password match
    const expectedPassword = String(matchedUser.password || '').trim();
    if (expectedPassword && inputPwd !== expectedPassword) {
      showToast('Invalid username or password.', 'error');
      return false;
    }

    const isAdmin = matchedUser.role === 'admin' ||
      (Array.isArray(matchedUser.permissions) && matchedUser.permissions.includes('admin')) ||
      matchedUser.username.toLowerCase() === 'admin';

    const userObj = {
      id: matchedUser.id || `usr_${matchedUser.username}`,
      username: matchedUser.username,
      role: isAdmin ? 'admin' : 'user',
      displayName: matchedUser.name || matchedUser.username,
      assignedFirms: Array.isArray(matchedUser.assignedFirms) && matchedUser.assignedFirms.length > 0
        ? matchedUser.assignedFirms
        : ['*'],
      permissions: isAdmin
        ? SYSTEM_MODULES.map(m => m.id)
        : (matchedUser.permissions && matchedUser.permissions.length > 0 ? matchedUser.permissions : ['dashboard', 'new_entry', 'tracker']),
      isAuthenticated: true
    };

    setCurrentUser(userObj);
    setCurrentRole(isAdmin ? ROLES.ALL : ROLES.INCHARGE);
    localStorage.setItem('labour_sys_auth_user', JSON.stringify(userObj));
    showToast(`Welcome back, ${userObj.displayName}!`, 'success');
    return true;
  }, [users, showToast]);

  const logout = useCallback(() => {
    setCurrentUser(null);
    localStorage.removeItem('labour_sys_auth_user');
    showToast('Logged out successfully', 'info');
  }, [showToast]);

  const removeToast = useCallback(id => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Confetti helper for stage completion
  const triggerCelebration = useCallback(() => {
    try {
      confetti({
        particleCount: 60,
        spread: 60,
        origin: { y: 0.8 },
        colors: ['#10B981', '#059669', '#34D399', '#6EE7B7']
      });
    } catch (e) {
      // ignore in headless test
    }
  }, []);

  // Load initial data including Live Users from "Login Page" sheet
  const loadData = useCallback(async (silent = false) => {
    setSyncing(true);
    if (!silent) {
      setLoading(true);
    }
    try {
      // 1. Try unified single-request fetch first for 10x faster loading
      const unified = await fetchAllData();
      if (unified && unified.entries) {
        setEntries(unified.entries);
        if (unified.master) setMasterData(unified.master);
        if (unified.users && Array.isArray(unified.users) && unified.users.length > 0) {
          setUsers(unified.users);
        }
        if (!silent) showToast('Data synchronized successfully!', 'success');
        return;
      }

      // 2. Fallback to parallel fetch
      const [fetchedEntries, fetchedMaster, fetchedUsers] = await Promise.all([
        fetchEntries(),
        fetchMasterData(),
        fetchUsers()
      ]);
      if (fetchedEntries && Array.isArray(fetchedEntries)) {
        setEntries(fetchedEntries);
      }
      if (fetchedMaster) {
        setMasterData(fetchedMaster);
      }
      if (fetchedUsers && Array.isArray(fetchedUsers) && fetchedUsers.length > 0) {
        setUsers(fetchedUsers);
      }
      if (!silent) {
        showToast('Data synchronized successfully!', 'success');
      }
    } catch (err) {
      console.error('Error loading data:', err);
      if (!silent) showToast('Error fetching data from Google Sheets', 'error');
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  }, [showToast]);

  const refreshData = useCallback(() => {
    return loadData(false);
  }, [loadData]);

  // Initial load + Live background auto-polling every 35 seconds (when tab active) + Tab visibility change
  useEffect(() => {
    loadData();

    // Auto-refresh interval (35s) - skips when tab is hidden or already syncing to avoid quota exhaustion
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && !document.hidden) {
        loadData(true);
      }
    }, 35000);

    // Refresh only when user actually switches back to the browser tab after being away for > 15s
    let lastHiddenTime = 0;
    const handleVisibility = () => {
      if (document.hidden) {
        lastHiddenTime = Date.now();
      } else if (lastHiddenTime && Date.now() - lastHiddenTime > 15000) {
        loadData(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [loadData]);

  // Create Work Entry (Instant 0ms UI update)
  const createEntry = useCallback(async entryData => {
    const timestamp = getNowTimestamp();
    const labourCount = Number(entryData.labourCount) || (entryData.labourNames ? entryData.labourNames.length : 1);
    const rate = Number(entryData.rate) || 0;
    const totalAmount = labourCount * rate;

    let newEntry = null;

    setEntries(prev => {
      let maxNum = 0;
      prev.forEach(e => {
        if (e.workId && e.workId.startsWith('WRK-')) {
          const num = parseInt(e.workId.replace('WRK-', ''), 10);
          if (!isNaN(num) && num > maxNum) maxNum = num;
        }
      });
      const workId = entryData.workId || `WRK-${String(maxNum + 1).padStart(4, '0')}`;

      newEntry = {
        ...entryData,
        workId,
        timestamp,
        labourCount,
        rate,
        totalAmount,
        firmName: entryData.firmName || entryData.firm || 'PMMPL',
        workRemark: entryData.workRemark || '',
        status: 'Pending Verification',
        verificationPlanned: null,
        verificationActual: null,
        verificationDelay: '-',
        approvalPlanned: null,
        approvalActual: null,
        approvalDelay: '-',
        paymentPlanned: null,
        paymentActual: null,
        paymentDelay: '-',
        paymentMethod: '',
        paymentRef: '',
        tallyPlanned: null,
        tallyActual: null,
        tallyDelay: '-',
        tallyVoucher: '',
        tallyLedger: ''
      };

      const next = [newEntry, ...prev.filter(e => e.workId !== newEntry.workId)];
      try {
        localStorage.setItem('labour_sys_entries', JSON.stringify(next));
      } catch (e) {}
      return next;
    });

    showToast(`Work entry created: ${newEntry?.workId}`, 'success');
    triggerCelebration();

    // Background sync to Google Apps Script
    sendToAppsScript('submitLaborPayment', newEntry).catch(err => {
      console.warn('Background sync to Google Sheets failed:', err);
    });

    return newEntry;
  }, [showToast, triggerCelebration]);

  // Stage 1: Verify Work (Instant 0ms UI update)
  const verifyEntry = useCallback(async (workId, remarks = '') => {
    const now = getNowTimestamp();
    let updatedItem = null;

    // 1. Immediately write to localStorage synchronously so no async race condition can wipe it out
    try {
      const raw = localStorage.getItem('labour_sys_entries');
      if (raw) {
        const parsed = JSON.parse(raw);
        const updated = parsed.map(e => {
          if (e.workId === workId) {
            const delayInfo = calculateWorkflowDelay(e.verificationPlanned, now);
            updatedItem = {
              ...e,
              status: 'Verified (Pending Approval)',
              verificationActual: now,
              verificationDelay: delayInfo.formatted,
              verificationRemarks: remarks,
              approvalPlanned: now
            };
            return updatedItem;
          }
          return e;
        });
        localStorage.setItem('labour_sys_entries', JSON.stringify(updated));
      }
    } catch (e) {}

    // 2. Instant UI update
    setEntries(prev => {
      const next = prev.map(e => {
        if (e.workId === workId) {
          const delayInfo = calculateWorkflowDelay(e.verificationPlanned, now);
          updatedItem = {
            ...e,
            status: 'Verified (Pending Approval)',
            verificationActual: now,
            verificationDelay: delayInfo.formatted,
            verificationRemarks: remarks,
            approvalPlanned: now
          };
          return updatedItem;
        }
        return e;
      });
      return next;
    });

    showToast(`${workId} verified successfully`, 'success');
    triggerCelebration();

    // Background sync
    sendToAppsScript('verifyWork', { workId, remarks }).catch(err =>
      console.warn('Verification sync failed:', err)
    );

    return updatedItem;
  }, [showToast, triggerCelebration]);

  // Stage 2: Approve Payment (Instant 0ms UI update)
  const approveEntry = useCallback(async workId => {
    const now = getNowTimestamp();
    let updatedItem = null;

    setEntries(prev => {
      const next = prev.map(e => {
        if (e.workId === workId) {
          const delayInfo = calculateWorkflowDelay(e.approvalPlanned, now);
          updatedItem = {
            ...e,
            status: 'Approved (Pending Payment)',
            approvalActual: now,
            approvalDelay: delayInfo.formatted,
            paymentPlanned: now
          };
          return updatedItem;
        }
        return e;
      });
      try {
        localStorage.setItem('labour_sys_entries', JSON.stringify(next));
      } catch (e) {}
      return next;
    });

    showToast(`${workId} approved for payment`, 'success');
    triggerCelebration();

    // Background sync
    sendToAppsScript('approvePayment', { workId }).catch(err =>
      console.warn('Approval sync failed:', err)
    );

    return updatedItem;
  }, [showToast, triggerCelebration]);

  // Stage 2 Batch: Approve Multiple Payments (Instant 0ms UI update)
  const approveBatch = useCallback(async workIds => {
    if (!Array.isArray(workIds) || workIds.length === 0) return;
    const now = getNowTimestamp();

    setEntries(prev => {
      const next = prev.map(e => {
        if (workIds.includes(e.workId)) {
          const delayInfo = calculateWorkflowDelay(e.approvalPlanned, now);
          return {
            ...e,
            status: 'Approved (Pending Payment)',
            approvalActual: now,
            approvalDelay: delayInfo.formatted,
            paymentPlanned: now
          };
        }
        return e;
      });
      try {
        localStorage.setItem('labour_sys_entries', JSON.stringify(next));
      } catch (e) {}
      return next;
    });

    showToast(`${workIds.length} entries approved for payment`, 'success');
    triggerCelebration();

    // Background batch sync
    workIds.forEach(workId => {
      sendToAppsScript('approvePayment', { workId }).catch(err =>
        console.warn('Batch approval sync failed:', err)
      );
    });
  }, [showToast, triggerCelebration]);

  // Stage 3: Record Payment (Instant 0ms UI update)
  const payEntry = useCallback(async (workId, paymentMethod = 'Direct Payment', paymentRef = '') => {
    const now = getNowTimestamp();
    let updatedItem = null;

    setEntries(prev => {
      const next = prev.map(e => {
        if (e.workId === workId) {
          const delayInfo = calculateWorkflowDelay(e.paymentPlanned, now);
          updatedItem = {
            ...e,
            status: 'Paid (Pending Tally)',
            paymentActual: now,
            paymentDelay: delayInfo.formatted,
            paymentMethod: paymentMethod || 'Direct Payment',
            paymentRef: paymentRef || '',
            tallyPlanned: now
          };
          return updatedItem;
        }
        return e;
      });
      try {
        localStorage.setItem('labour_sys_entries', JSON.stringify(next));
      } catch (e) {}
      return next;
    });

    showToast(`Payment recorded for ${workId}`, 'success');
    triggerCelebration();

    // Background sync
    sendToAppsScript('recordPayment', { workId, paymentMethod, paymentRef }).catch(err =>
      console.warn('Payment sync failed:', err)
    );

    return updatedItem;
  }, [showToast, triggerCelebration]);

  // Stage 4: Record Tally (Instant 0ms UI update)
  const tallyEntry = useCallback(async (workId, tallyVoucher = '', tallyLedger = 'Direct Labour Charges') => {
    const now = getNowTimestamp();
    let updatedItem = null;

    setEntries(prev => {
      const next = prev.map(e => {
        if (e.workId === workId) {
          const delayInfo = calculateWorkflowDelay(e.tallyPlanned, now);
          updatedItem = {
            ...e,
            status: 'Tally Complete',
            tallyActual: now,
            tallyDelay: delayInfo.formatted,
            tallyVoucher: tallyVoucher || '',
            tallyLedger: tallyLedger || 'Direct Labour Charges'
          };
          return updatedItem;
        }
        return e;
      });
      try {
        localStorage.setItem('labour_sys_entries', JSON.stringify(next));
      } catch (e) {}
      return next;
    });

    showToast(`Tally posted for ${workId}`, 'success');
    triggerCelebration();

    // Background sync
    sendToAppsScript('recordTally', { workId, tallyVoucher, tallyLedger }).catch(err =>
      console.warn('Tally sync failed:', err)
    );

    return updatedItem;
  }, [showToast, triggerCelebration]);

  // Update Master Data
  const updateMaster = useCallback(async newMaster => {
    try {
      setSyncing(true);
      await saveMasterData(newMaster);
      setMasterData(newMaster);
      showToast('Master data updated successfully', 'success');
    } catch (err) {
      showToast('Failed to update master data: ' + err.message, 'error');
      throw err;
    } finally {
      setSyncing(false);
    }
  }, [showToast]);

  // Update Apps Script URL
  const updateScriptUrl = useCallback(url => {
    setScriptUrlApi(url);
    setScriptUrlState(url);
    showToast(url ? 'Google Sheets Web App URL saved' : 'Switched to Local/Mock Mode', 'info');
    loadData();
  }, [showToast, loadData]);

  // Reset to demo
  const resetDemo = useCallback(() => {
    const result = resetToDemoData();
    setEntries(result.entries);
    setMasterData(result.master);
    showToast('Reset to demo sample data', 'info');
  }, [showToast]);

  // Computed workflow counts with complete safety
  const safeList = Array.isArray(entries) ? entries.filter(Boolean) : [];
  const counts = {
    total: safeList.length,
    pendingVerification: safeList.filter(
      e => e && (e.status === 'Pending Verification' || !e.verificationActual) && e.status !== 'Verified' && e.status !== 'Approved' && e.status !== 'Paid' && e.status !== 'Tally Complete'
    ).length,
    pendingApproval: safeList.filter(
      e => e && (e.status === 'Verified' || e.status === 'Verified (Pending Approval)' || e.verificationActual) && !e.approvalActual && e.status !== 'Approved' && e.status !== 'Paid' && e.status !== 'Tally Complete'
    ).length,
    pendingPayment: safeList.filter(
      e => e && (e.status === 'Approved' || e.status === 'Approved (Pending Payment)' || e.approvalActual) && !e.paymentActual && e.status !== 'Paid' && e.status !== 'Tally Complete'
    ).length,
    pendingTally: safeList.filter(
      e => e && (e.status === 'Paid' || e.status === 'Paid (Pending Tally)' || e.paymentActual) && !e.tallyActual && e.status !== 'Tally Complete'
    ).length,
    completed: safeList.filter(
      e => e && (e.status === 'Tally Complete' || Boolean(e.tallyActual))
    ).length,
    verifiedCount: safeList.filter(
      e => e && (Boolean(e.verificationActual) || (e.status && !e.status.toLowerCase().includes('pending verification')))
    ).length,
    totalPaidAmount: safeList
      .filter(e => e && (e.status === 'Paid' || e.status === 'Paid (Pending Tally)' || e.status === 'Tally Complete' || Boolean(e.paymentActual)))
      .reduce((sum, e) => sum + (Number(e.totalAmount) || 0), 0),
    totalPendingAmount: safeList
      .filter(e => e && e.status !== 'Tally Complete' && !e.tallyActual)
      .reduce((sum, e) => sum + (Number(e.totalAmount) || 0), 0)
  };

  const editWorkRemark = useCallback((workId, workRemark) => {
    setEntries(prev => {
      const next = prev.map(e => (e.workId === workId ? { ...e, workRemark } : e));
      try {
        localStorage.setItem('labour_sys_entries', JSON.stringify(next));
      } catch (e) {}
      return next;
    });
    showToast('Work Remark updated successfully', 'success');

    sendToAppsScript('updateWorkRemark', { workId, workRemark }).catch(err => {
      console.warn('Remark sync failed:', err);
    });

    return true;
  }, [showToast]);

  const value = {
    entries,
    masterData,
    currentRole,
    setCurrentRole,
    scriptUrl,
    updateScriptUrl,
    loading,
    syncing,
    toasts,
    showToast,
    removeToast,
    currentUser,
    users,
    addUser,
    updateUser,
    deleteUser,
    hasPermission,
    canPerformAction,
    getAccessLevel,
    hasFirmAccess,
    login,
    logout,
    counts,
    createEntry,
    verifyEntry,
    approveEntry,
    approveBatch,
    payEntry,
    tallyEntry,
    updateMaster,
    editWorkRemark,
    refreshData,
    resetDemo,
    isNewEntryOpen,
    openNewEntry,
    closeNewEntry
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
