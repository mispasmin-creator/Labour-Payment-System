import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import confetti from 'canvas-confetti';
import {
  fetchEntries,
  fetchMasterData,
  saveMasterData,
  getScriptUrl,
  setScriptUrl as setScriptUrlApi,
  resetToDemoData,
  sendToAppsScript
} from '../services/api';
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
  { id: 'approval', label: 'Payment Approval', path: '/approval' },
  { id: 'payment', label: 'Payment Disbursal', path: '/payment' },
  { id: 'tally', label: 'Tally Entry', path: '/tally' },
  { id: 'reports', label: 'Reports & Export', path: '/reports' },
  { id: 'admin', label: 'Administration & User Access', path: '/admin' }
];

export const DEFAULT_USERS = [
  {
    id: 'usr_admin',
    username: 'admin',
    password: 'admin123',
    name: 'Administrator',
    role: 'admin',
    status: 'active',
    assignedFirms: ['*'],
    permissions: ['dashboard', 'new_entry', 'tracker', 'verification', 'approval', 'payment', 'tally', 'reports', 'admin']
  },
  {
    id: 'usr_supervisor',
    username: 'supervisor',
    password: 'user123',
    name: 'Site Supervisor (Ops)',
    role: 'user',
    status: 'active',
    assignedFirms: ['*'],
    permissions: ['dashboard', 'new_entry', 'tracker', 'verification']
  },
  {
    id: 'usr_finance',
    username: 'finance',
    password: 'user123',
    name: 'Finance & Payment Officer',
    role: 'user',
    status: 'active',
    assignedFirms: ['*'],
    permissions: ['dashboard', 'approval', 'payment', 'reports']
  },
  {
    id: 'usr_tally',
    username: 'tally_user',
    password: 'user123',
    name: 'Tally Accounts Officer',
    role: 'user',
    status: 'active',
    assignedFirms: ['*'],
    permissions: ['dashboard', 'tally', 'reports']
  }
];

export function AppProvider({ children }) {
  const [entries, setEntries] = useState([]);
  const [masterData, setMasterData] = useState({ incharges: [], labourers: [], shifts: [], workTypes: [] });
  const [currentRole, setCurrentRole] = useState(ROLES.ALL);

  // Users database
  const [users, setUsers] = useState(() => {
    try {
      const stored = localStorage.getItem('labour_sys_users_db');
      return stored ? JSON.parse(stored) : DEFAULT_USERS;
    } catch (e) {
      return DEFAULT_USERS;
    }
  });

  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const stored = localStorage.getItem('labour_sys_auth_user');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object') {
          return {
            id: parsed.id || 'usr_admin',
            username: parsed.username || 'admin',
            role: parsed.role || 'admin',
            displayName: parsed.displayName || parsed.name || 'Administrator',
            assignedFirms: Array.isArray(parsed.assignedFirms) ? parsed.assignedFirms : ['*'],
            permissions: (Array.isArray(parsed.permissions) && parsed.permissions.length > 0)
              ? parsed.permissions
              : SYSTEM_MODULES.map(m => m.id),
            isAuthenticated: parsed.isAuthenticated !== false
          };
        }
      }
    } catch (e) {}
    return {
      id: 'usr_admin',
      username: 'admin',
      role: 'admin',
      displayName: 'Administrator',
      assignedFirms: ['*'],
      permissions: SYSTEM_MODULES.map(m => m.id),
      isAuthenticated: true
    };
  });

  const [scriptUrl, setScriptUrlState] = useState(getScriptUrl());
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [toasts, setToasts] = useState([]);

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

  const hasPermission = useCallback(moduleId => {
    if (!currentUser || currentUser.isAuthenticated === false) return false;
    if (currentUser.role === 'admin') return true;
    if (!currentUser.permissions || !Array.isArray(currentUser.permissions)) return true;
    return currentUser.permissions.includes(moduleId);
  }, [currentUser]);

  const hasFirmAccess = useCallback(firmName => {
    if (!currentUser || currentUser.isAuthenticated === false) return true;
    if (currentUser.role === 'admin') return true;
    if (!currentUser.assignedFirms || !Array.isArray(currentUser.assignedFirms) || currentUser.assignedFirms.length === 0) return true;
    if (currentUser.assignedFirms.includes('*') || currentUser.assignedFirms.includes('ALL')) return true;
    if (!firmName || firmName === '-' || firmName === '') return true;
    return currentUser.assignedFirms.some(f => f.toLowerCase().trim() === firmName.toLowerCase().trim());
  }, [currentUser]);

  const login = useCallback((username, password, role = 'admin') => {
    const inputUname = username.trim().toLowerCase();
    const matchedUser = users.find(u => u.username.toLowerCase() === inputUname);

    if (matchedUser) {
      if (matchedUser.status === 'inactive') {
        showToast('This user account is inactive. Please contact Admin.', 'error');
        return false;
      }
      // If password provided and doesn't match
      if (password && matchedUser.password && password !== matchedUser.password) {
        showToast('Incorrect password entered.', 'error');
        return false;
      }

      const userObj = {
        id: matchedUser.id,
        username: matchedUser.username,
        role: matchedUser.role,
        displayName: matchedUser.name,
        assignedFirms: matchedUser.assignedFirms || ['*'],
        permissions: matchedUser.permissions || [],
        isAuthenticated: true
      };
      setCurrentUser(userObj);
      setCurrentRole(matchedUser.role === 'admin' ? ROLES.ALL : ROLES.INCHARGE);
      localStorage.setItem('labour_sys_auth_user', JSON.stringify(userObj));
      showToast(`Welcome back, ${userObj.displayName}!`, 'success');
      return true;
    }

    // Fallback for custom quick logins
    const normalizedRole = role.toLowerCase() === 'admin' ? 'admin' : 'user';
    const userObj = {
      id: `usr_${Date.now()}`,
      username: username.trim(),
      role: normalizedRole,
      displayName: normalizedRole === 'admin' ? 'Administrator' : 'Site Supervisor',
      assignedFirms: ['*'],
      permissions: normalizedRole === 'admin' ? SYSTEM_MODULES.map(m => m.id) : ['dashboard', 'new_entry', 'tracker', 'verification'],
      isAuthenticated: true
    };
    setCurrentUser(userObj);
    setCurrentRole(normalizedRole === 'admin' ? ROLES.ALL : ROLES.INCHARGE);
    localStorage.setItem('labour_sys_auth_user', JSON.stringify(userObj));
    showToast(`Welcome, ${userObj.displayName}!`, 'success');
    return true;
  }, [users, showToast]);

  const logout = useCallback(() => {
    const userObj = {
      id: '',
      username: '',
      role: '',
      displayName: '',
      permissions: [],
      isAuthenticated: false
    };
    setCurrentUser(userObj);
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

  // Load initial data
  const loadData = useCallback(async (silent = false) => {
    setSyncing(true);
    if (!silent) {
      setLoading(true);
    }
    try {
      const [fetchedEntries, fetchedMaster] = await Promise.all([
        fetchEntries(),
        fetchMasterData()
      ]);
      setEntries(fetchedEntries || []);
      setMasterData(fetchedMaster || { incharges: [], labourers: [], workTypes: [] });
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

  // Initial load + Live background auto-polling every 12 seconds + Window focus refresh
  useEffect(() => {
    loadData();

    // Live auto-refresh interval
    const interval = setInterval(() => {
      loadData(true);
    }, 12000);

    // Immediate refresh when tab becomes active
    const handleFocus = () => {
      loadData(true);
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
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
        verificationPlanned: timestamp,
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
      try {
        localStorage.setItem('labour_sys_entries', JSON.stringify(next));
      } catch (e) {}
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

  // Computed workflow counts
  const counts = {
    total: entries.length,
    pendingVerification: entries.filter(
      e => (e.status === 'Pending Verification' || !e.verificationActual) && e.status !== 'Verified' && e.status !== 'Approved' && e.status !== 'Paid' && e.status !== 'Tally Complete'
    ).length,
    pendingApproval: entries.filter(
      e => (e.status === 'Verified' || e.status === 'Verified (Pending Approval)' || e.verificationActual) && !e.approvalActual && e.status !== 'Approved' && e.status !== 'Paid' && e.status !== 'Tally Complete'
    ).length,
    pendingPayment: entries.filter(
      e => (e.status === 'Approved' || e.status === 'Approved (Pending Payment)' || e.approvalActual) && !e.paymentActual && e.status !== 'Paid' && e.status !== 'Tally Complete'
    ).length,
    pendingTally: entries.filter(
      e => (e.status === 'Paid' || e.status === 'Paid (Pending Tally)' || e.paymentActual) && !e.tallyActual && e.status !== 'Tally Complete'
    ).length,
    completed: entries.filter(
      e => e.status === 'Tally Complete' || Boolean(e.tallyActual)
    ).length,
    totalPaidAmount: entries
      .filter(e => e.status === 'Paid' || e.status === 'Paid (Pending Tally)' || e.status === 'Tally Complete' || Boolean(e.paymentActual))
      .reduce((sum, e) => sum + (Number(e.totalAmount) || 0), 0),
    totalPendingAmount: entries
      .filter(e => e.status !== 'Tally Complete' && !e.tallyActual)
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
    resetDemo
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
