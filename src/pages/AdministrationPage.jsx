import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  User,
  Check,
  X,
  Edit2,
  Trash2,
  Key,
  Lock,
  Eye,
  EyeOff,
  Search,
  CheckCircle2,
  XCircle,
  ToggleLeft,
  ToggleRight,
  ShieldCheck,
  Layers,
  FileCheck2,
  CreditCard,
  FileSpreadsheet,
  PlusCircle,
  TableProperties,
  LayoutDashboard,
  Zap
} from 'lucide-react';
import { useApp, SYSTEM_MODULES } from '../context/AppContext';
import { Modal } from '../components/common/Modal';

export function AdministrationPage() {
  const { users, currentUser, masterData, addUser, updateUser, deleteUser, getAccessLevel } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [showModalPassword, setShowModalPassword] = useState(false);

  const defaultFirms = ['PMMPL', 'RKL', 'Purab', 'Refrasynth', 'Refratech'];
  const availableFirms = (Array.isArray(masterData?.firmNames) && masterData.firmNames.length > 0)
    ? masterData.firmNames.filter(f => Boolean(f) && !f.toLowerCase().startsWith('firm '))
    : defaultFirms;
  const activeFirmsList = availableFirms.length > 0 ? availableFirms : defaultFirms;

  const [formData, setFormData] = useState({
    name: '',
    username: '',
    password: '',
    role: 'user',
    status: 'active',
    assignedFirms: ['*'],
    permissions: SYSTEM_MODULES.reduce((acc, m) => {
      acc[m.id] = 'full';
      return acc;
    }, {})
  });

  const [formErrors, setFormErrors] = useState({});

  // Helper to extract access map for a user
  const getUserAccessMap = userObj => {
    const map = {};
    SYSTEM_MODULES.forEach(m => {
      map[m.id] = getAccessLevel(userObj, m.id);
    });
    return map;
  };

  // Filtered user list
  const filteredUsers = (users || []).filter(u => {
    const matchesSearch =
      (u.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.username || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = !roleFilter || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const totalUsers = users?.length || 0;
  const activeUsers = users?.filter(u => u.status === 'active').length || 0;

  const handleOpenAddModal = () => {
    setEditingUser(null);
    setShowModalPassword(false);
    const initialPerms = {};
    SYSTEM_MODULES.forEach(m => {
      initialPerms[m.id] = ['dashboard', 'new_entry', 'tracker'].includes(m.id) ? 'full' : 'view';
    });
    setFormData({
      name: '',
      username: '',
      password: '',
      role: 'user',
      status: 'active',
      assignedFirms: ['*'],
      permissions: initialPerms
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleOpenEditModal = userToEdit => {
    setEditingUser(userToEdit);
    setShowModalPassword(false);
    const currentMap = getUserAccessMap(userToEdit);
    setFormData({
      name: userToEdit.name || userToEdit.username,
      username: userToEdit.username,
      password: userToEdit.password || '',
      role: userToEdit.role || 'user',
      status: userToEdit.status || 'active',
      assignedFirms: Array.isArray(userToEdit.assignedFirms) && userToEdit.assignedFirms.length > 0 ? userToEdit.assignedFirms : ['*'],
      permissions: currentMap
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleSetModuleAccess = (moduleId, level) => {
    setFormData(prev => ({
      ...prev,
      permissions: {
        ...(typeof prev.permissions === 'object' && !Array.isArray(prev.permissions) ? prev.permissions : {}),
        [moduleId]: level
      }
    }));
  };

  const handleSetAllAccess = level => {
    const updated = {};
    SYSTEM_MODULES.forEach(m => {
      updated[m.id] = level;
    });
    setFormData(prev => ({ ...prev, permissions: updated }));
  };

  // Firm Access Handlers
  const handleToggleAllFirms = () => {
    setFormData(prev => {
      const isAll = prev.assignedFirms.includes('*') || prev.assignedFirms.includes('ALL');
      return {
        ...prev,
        assignedFirms: isAll ? [activeFirmsList[0]] : ['*']
      };
    });
  };

  const handleToggleSpecificFirm = firmName => {
    setFormData(prev => {
      let current = prev.assignedFirms.filter(f => f !== '*' && f !== 'ALL');
      if (current.includes(firmName)) {
        current = current.filter(f => f !== firmName);
      } else {
        current = [...current, firmName];
      }
      return {
        ...prev,
        assignedFirms: current.length === 0 ? [firmName] : current
      };
    });
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.name.trim()) errors.name = 'Full name is required';
    if (!formData.username.trim()) errors.username = 'Username is required';
    if (!formData.password || !formData.password.trim()) errors.password = 'Password is required';

    const activeCount = Object.values(formData.permissions || {}).filter(v => v === 'view' || v === 'full').length;
    if (activeCount === 0) errors.permissions = 'At least 1 module permission (View or Full Access) must be granted';

    // Duplicate username check
    const existing = users.find(
      u => u.username.toLowerCase() === formData.username.trim().toLowerCase() &&
           (!editingUser || u.id !== editingUser.id)
    );
    if (existing) {
      errors.username = 'Username is already taken';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = e => {
    e.preventDefault();
    if (!validateForm()) return;

    // Convert permissions map to format supported by app
    const permsArray = [];
    Object.entries(formData.permissions || {}).forEach(([mId, lvl]) => {
      if (lvl === 'full') permsArray.push(mId); // or mId:full
      else if (lvl === 'view') permsArray.push(`${mId}:view`);
    });

    const userPayload = {
      ...formData,
      permissions: permsArray
    };

    if (editingUser) {
      updateUser(editingUser.id, userPayload);
    } else {
      addUser(userPayload);
    }
    setIsModalOpen(false);
  };

  const handleToggleStatus = userToToggle => {
    if (userToToggle.username === 'admin' && userToToggle.status === 'active') {
      alert('The primary Admin account cannot be deactivated.');
      return;
    }
    const newStatus = userToToggle.status === 'active' ? 'inactive' : 'active';
    updateUser(userToToggle.id, { status: newStatus });
  };

  const handleDeleteUser = userToDelete => {
    if (userToDelete.username === 'admin' || userToDelete.username === 'admin13') {
      alert('Primary Admin accounts cannot be deleted.');
      return;
    }
    if (userToDelete.username === currentUser?.username) {
      alert('You cannot delete your own active logged-in account.');
      return;
    }
    if (window.confirm(`Are you sure you want to delete user "${userToDelete.name}" (${userToDelete.username})?`)) {
      deleteUser(userToDelete.id);
    }
  };

  const getModuleIcon = moduleId => {
    switch (moduleId) {
      case 'dashboard': return <LayoutDashboard size={12} />;
      case 'new_entry': return <PlusCircle size={12} />;
      case 'tracker': return <TableProperties size={12} />;
      case 'verification': return <ShieldCheck size={12} />;
      case 'approval': return <CheckCircle2 size={12} />;
      case 'payment': return <CreditCard size={12} />;
      case 'tally': return <FileCheck2 size={12} />;
      case 'reports': return <FileSpreadsheet size={12} />;
      case 'admin': return <Shield size={12} />;
      default: return <Layers size={12} />;
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 space-y-4">
      {/* Sticky Page Header */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs px-5 py-4 space-y-3 shrink-0">
        <div className="flex items-center justify-between flex-wrap gap-3.5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Users size={20} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800">User Management &amp; Access Control</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage user roles, assigned firms, and granular <strong>View</strong> vs <strong>Full Access</strong> permissions.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-white px-3.5 py-1.5 rounded-lg border border-slate-200 shadow-2xs text-right">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Active / Total Users</div>
              <div className="text-lg font-extrabold text-emerald-600 leading-tight">
                {activeUsers} <span className="text-xs text-slate-500 font-semibold">/ {totalUsers}</span>
              </div>
            </div>

            <button
              onClick={handleOpenAddModal}
              className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-lg shadow-sm px-4 py-2 transition-colors"
            >
              <UserPlus size={15} />
              <span>Add New User</span>
            </button>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white transition-all"
              placeholder="Search users by name or username..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          <select
            className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white transition-all"
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
          >
            <option value="">All Roles</option>
            <option value="admin">Admin</option>
            <option value="user">User</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs flex-1 min-h-0 overflow-x-auto overflow-y-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="sticky top-0 bg-slate-100 z-20 shadow-xs border-b border-slate-300">
              <th className="sticky left-0 bg-slate-100 z-30 border-r border-slate-200 shadow-xs font-semibold text-slate-700 uppercase tracking-wider text-[11px] px-4 py-2.5 whitespace-nowrap">User</th>
              <th className="font-semibold text-slate-700 uppercase tracking-wider text-[11px] px-4 py-2.5 whitespace-nowrap">Username</th>
              <th className="font-semibold text-slate-700 uppercase tracking-wider text-[11px] px-4 py-2.5 whitespace-nowrap">Role</th>
              <th className="font-semibold text-slate-700 uppercase tracking-wider text-[11px] px-4 py-2.5 whitespace-nowrap">Assigned Firms</th>
              <th className="font-semibold text-slate-700 uppercase tracking-wider text-[11px] px-4 py-2.5 whitespace-nowrap">Status</th>
              <th className="font-semibold text-slate-700 uppercase tracking-wider text-[11px] px-4 py-2.5 whitespace-nowrap">Permitted Modules &amp; Access</th>
              <th className="font-semibold text-slate-700 uppercase tracking-wider text-[11px] px-4 py-2.5 whitespace-nowrap text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredUsers.map(u => {
              const accessMap = getUserAccessMap(u);
              return (
                <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="sticky left-0 bg-white z-10 border-r border-slate-200 shadow-xs px-4 py-2.5">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center font-extrabold text-sm shrink-0 ${
                        u.role === 'admin' ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600'
                      }`}>
                        {u.name ? u.name.charAt(0).toUpperCase() : 'U'}
                      </div>
                      <div>
                        <div className="font-extrabold text-slate-900 text-sm">
                          {u.name || u.username}
                        </div>
                        {u.username === currentUser?.username && (
                          <div className="text-[11px] text-emerald-600 font-bold mt-0.5">
                            (Current You)
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="font-mono font-bold text-xs bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200 text-slate-700">
                      {u.username}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border ${
                      u.role === 'admin'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                    }`}>
                      {u.role === 'admin' ? 'ADMIN' : 'USER'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    {(!u.assignedFirms || u.assignedFirms.includes('*') || u.assignedFirms.includes('ALL')) ? (
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                        All Firms
                      </span>
                    ) : (
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {u.assignedFirms.map(f => (
                          <span key={f} className="text-[11px] font-semibold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">
                            {f}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <button
                      onClick={() => handleToggleStatus(u)}
                      className="p-0"
                      title="Click to toggle status"
                    >
                      {u.status === 'active' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border bg-emerald-50 text-emerald-700 border-emerald-200">
                          <Check size={12} /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border bg-slate-100 text-slate-600 border-slate-200">
                          <X size={12} /> Inactive
                        </span>
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex flex-wrap gap-1.5 max-w-[440px]">
                      {SYSTEM_MODULES.map(mod => {
                        const level = accessMap[mod.id];
                        if (!level || level === 'none') return null;
                        const isFull = level === 'full';
                        return (
                          <span
                            key={mod.id}
                            className={`inline-flex items-center gap-1 text-[11px] font-semibold rounded-md px-2 py-1 border ${
                              isFull
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                            }`}
                          >
                            {getModuleIcon(mod.id)}
                            <span>{mod.label.replace(/^\d+\.\s*/, '')}</span>
                            {!isFull && (
                              <span className="text-[10px] bg-white/70 px-1 py-0.5 rounded font-bold">
                                View
                              </span>
                            )}
                          </span>
                        );
                      })}
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleOpenEditModal(u)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold rounded-lg shadow-sm hover:shadow-md transition-all bg-white border border-teal-200 text-teal-700 hover:bg-teal-50"
                        title="Edit user & permissions"
                      >
                        <Edit2 size={13} />
                        <span>Edit</span>
                      </button>

                      {u.username !== 'admin' && u.username !== 'admin13' && (
                        <button
                          onClick={() => handleDeleteUser(u)}
                          className="inline-flex items-center justify-center px-2.5 py-1.5 text-[11px] font-semibold rounded-lg shadow-sm hover:shadow-md transition-all bg-white border border-rose-200 text-rose-600 hover:bg-rose-50"
                          title="Delete user"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add / Edit User Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingUser ? `Edit User: ${editingUser.name}` : 'Add New User & Set Permissions'}
        maxWidth="720px"
      >
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Full Name <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white transition-all"
                placeholder="e.g. Ramesh Kumar"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                required
              />
              {formErrors.name && (
                <span className="text-xs text-rose-600 mt-1 block">{formErrors.name}</span>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Username / ID <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white transition-all"
                placeholder="e.g. ramesh_ops"
                value={formData.username}
                onChange={e => setFormData({ ...formData, username: e.target.value })}
                required
              />
              {formErrors.username && (
                <span className="text-xs text-rose-600 mt-1 block">{formErrors.username}</span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Password <span className="text-rose-600">*</span>
              </label>
              <div className="relative">
                <input
                  type={showModalPassword ? 'text' : 'password'}
                  className="w-full px-3 py-2.5 pr-10 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white transition-all"
                  placeholder="Enter login password"
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowModalPassword(!showModalPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  title={showModalPassword ? 'Hide password' : 'Show password'}
                >
                  {showModalPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {formErrors.password && (
                <span className="text-xs text-rose-600 mt-1 block">{formErrors.password}</span>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Role Type <span className="text-rose-600">*</span>
              </label>
              <select
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white transition-all"
                value={formData.role}
                onChange={e => {
                  const r = e.target.value;
                  const newPerms = {};
                  SYSTEM_MODULES.forEach(m => {
                    newPerms[m.id] = r === 'admin' ? 'full' : ['dashboard', 'new_entry', 'tracker'].includes(m.id) ? 'full' : 'view';
                  });
                  setFormData({
                    ...formData,
                    role: r,
                    assignedFirms: r === 'admin' ? ['*'] : formData.assignedFirms,
                    permissions: newPerms
                  });
                }}
              >
                <option value="admin">Admin (All Access Default)</option>
                <option value="user">User (Granular Access)</option>
              </select>
            </div>
          </div>

          {/* Firm Access Permissions Selector */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-5">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <div>
                <div className="text-sm font-bold text-slate-900">
                  Firm Access Control
                </div>
                <div className="text-xs text-slate-500">
                  Assign single, multiple, or full (All Firms) access.
                </div>
              </div>

              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, assignedFirms: ['*'] }))}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                  formData.assignedFirms.includes('*')
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                All Firms Access
              </button>
            </div>

            <label className={`flex items-center gap-2.5 rounded-lg px-3 py-2 cursor-pointer border mb-2.5 ${
              (formData.assignedFirms.includes('*') || formData.assignedFirms.includes('ALL'))
                ? 'bg-emerald-50 border-emerald-200'
                : 'bg-white border-slate-200'
            }`}>
              <input
                type="checkbox"
                checked={formData.assignedFirms.includes('*') || formData.assignedFirms.includes('ALL')}
                onChange={handleToggleAllFirms}
                className="w-4 h-4 accent-emerald-600"
              />
              <span className={`text-sm font-bold ${
                (formData.assignedFirms.includes('*') || formData.assignedFirms.includes('ALL')) ? 'text-emerald-700' : 'text-slate-700'
              }`}>
                All Firms (Full Multi-Firm Access)
              </span>
            </label>

            {!(formData.assignedFirms.includes('*') || formData.assignedFirms.includes('ALL')) && (
              <div className="mt-2.5">
                <div className="text-xs font-semibold text-slate-500 mb-1.5">
                  Select Individual / Multiple Firm(s):
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {activeFirmsList.map(firmName => {
                    const isSelected = formData.assignedFirms.includes(firmName);
                    return (
                      <label
                        key={firmName}
                        className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 cursor-pointer border ${
                          isSelected ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-200'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSpecificFirm(firmName)}
                          className="w-3.5 h-3.5 accent-indigo-600"
                        />
                        <span className={`text-xs ${isSelected ? 'font-bold text-indigo-700' : 'font-medium text-slate-600'}`}>
                          {firmName}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Granular Module Permissions Selector: View vs Full Access */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-5">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <div>
                <div className="text-sm font-extrabold text-slate-900">
                  Granular Module Access: View vs Full Access
                </div>
                <div className="text-xs text-slate-500">
                  Configure <strong>View Only</strong> (Read reports &amp; data) vs <strong>Full Access</strong> (Action/Disburse/Approve).
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleSetAllAccess('full')}
                  className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-white border border-emerald-200 text-emerald-700 hover:bg-emerald-50 transition-colors"
                >
                  All Full Access
                </button>
                <button
                  type="button"
                  onClick={() => handleSetAllAccess('view')}
                  className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50 transition-colors"
                >
                  All View Only
                </button>
                <button
                  type="button"
                  onClick={() => handleSetAllAccess('none')}
                  className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Clear All
                </button>
              </div>
            </div>

            {formErrors.permissions && (
              <div className="text-xs font-semibold text-rose-600 mb-2">
                {formErrors.permissions}
              </div>
            )}

            <div className="flex flex-col gap-2">
              {SYSTEM_MODULES.map(module => {
                const currentLevel = formData.permissions?.[module.id] || 'none';
                return (
                  <div
                    key={module.id}
                    className={`flex items-center justify-between rounded-lg px-3 py-2 border transition-colors ${
                      currentLevel === 'full'
                        ? 'bg-emerald-50 border-emerald-200'
                        : currentLevel === 'view'
                        ? 'bg-indigo-50 border-indigo-200'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                      {getModuleIcon(module.id)}
                      <span>{module.label}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleSetModuleAccess(module.id, 'none')}
                        className={`text-[11px] px-2 py-1 rounded-md transition-colors ${
                          currentLevel === 'none'
                            ? 'font-bold bg-slate-100 text-slate-600 border border-slate-200'
                            : 'font-medium text-slate-400 border border-transparent hover:bg-slate-50'
                        }`}
                      >
                        No Access
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSetModuleAccess(module.id, 'view')}
                        className={`inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-md transition-colors ${
                          currentLevel === 'view'
                            ? 'font-bold bg-indigo-100 text-indigo-700 border border-indigo-300'
                            : 'font-medium text-slate-500 border border-transparent hover:bg-slate-50'
                        }`}
                      >
                        <Eye size={12} />
                        <span>View Only</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSetModuleAccess(module.id, 'full')}
                        className={`inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-md transition-colors ${
                          currentLevel === 'full'
                            ? 'font-bold bg-emerald-100 text-emerald-700 border border-emerald-300'
                            : 'font-medium text-slate-500 border border-transparent hover:bg-slate-50'
                        }`}
                      >
                        <Zap size={12} />
                        <span>Full Access</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg text-sm font-semibold px-4 py-2 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-lg shadow-sm px-4 py-2 transition-colors"
            >
              <CheckCircle2 size={16} />
              <span>{editingUser ? 'Save Changes' : 'Create User Account'}</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
