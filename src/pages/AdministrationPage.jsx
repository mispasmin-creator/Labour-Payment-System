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
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Users size={26} color="#059669" />
            <span>User Management & Access Control</span>
          </h1>
          <p style={{ fontSize: '0.85rem', color: '#64748B', marginTop: 4 }}>
            Manage user roles, assigned firms, and granular <strong>View</strong> vs <strong>Full Access</strong> permissions.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ background: '#FFFFFF', padding: '8px 16px', borderRadius: 12, border: '1px solid #E2E8F0', boxShadow: 'var(--shadow-sm)', textAlign: 'right' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
              Active / Total Users
            </div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#059669' }}>
              {activeUsers} <span style={{ fontSize: '0.85rem', color: '#64748B', fontWeight: 600 }}>/ {totalUsers}</span>
            </div>
          </div>

          <button onClick={handleOpenAddModal} className="btn btn-primary">
            <UserPlus size={16} />
            <span>Add New User</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="filter-bar">
        <div className="search-input-wrap">
          <Search size={18} />
          <input
            type="text"
            className="form-input"
            placeholder="Search users by name or username..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <select
            className="form-select"
            style={{ width: 'auto', minWidth: 150 }}
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
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>USER</th>
              <th>USERNAME</th>
              <th>ROLE</th>
              <th>ASSIGNED FIRMS</th>
              <th>STATUS</th>
              <th>PERMITTED MODULES & ACCESS</th>
              <th style={{ textAlign: 'center' }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map(u => {
              const accessMap = getUserAccessMap(u);
              return (
                <tr key={u.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 38,
                        height: 38,
                        borderRadius: '50%',
                        background: u.role === 'admin' ? '#ECFDF5' : '#EFF6FF',
                        color: u.role === 'admin' ? '#059669' : '#2563EB',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: '0.95rem',
                        flexShrink: 0
                      }}>
                        {u.name ? u.name.charAt(0).toUpperCase() : 'U'}
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, color: '#0F172A', fontSize: '0.92rem' }}>
                          {u.name || u.username}
                        </div>
                        {u.username === currentUser?.username && (
                          <div style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 700, marginTop: 2 }}>
                            (Current You)
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td>
                    <span style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.84rem',
                      background: '#F8FAFC',
                      padding: '4px 10px',
                      borderRadius: 6,
                      border: '1px solid #E2E8F0',
                      fontWeight: 600,
                      color: '#334155'
                    }}>
                      {u.username}
                    </span>
                  </td>
                  <td>
                    <span style={{
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      padding: '4px 10px',
                      borderRadius: 6,
                      background: u.role === 'admin' ? '#D1FAE5' : '#DBEAFE',
                      color: u.role === 'admin' ? '#065F46' : '#1E40AF',
                      border: `1px solid ${u.role === 'admin' ? '#6EE7B7' : '#93C5FD'}`
                    }}>
                      {u.role === 'admin' ? 'ADMIN' : 'USER'}
                    </span>
                  </td>
                  <td>
                    {(!u.assignedFirms || u.assignedFirms.includes('*') || u.assignedFirms.includes('ALL')) ? (
                      <span style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        color: '#065F46',
                        background: '#ECFDF5',
                        padding: '4px 10px',
                        borderRadius: 6,
                        border: '1px solid #A7F3D0',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6
                      }}>
                        📊 All Firms
                      </span>
                    ) : (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, maxWidth: 200 }}>
                        {u.assignedFirms.map(f => (
                          <span key={f} style={{
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            background: '#F1F5F9',
                            color: '#334155',
                            padding: '2px 6px',
                            borderRadius: 4,
                            border: '1px solid #E2E8F0'
                          }}>
                            {f}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td>
                    <button
                      onClick={() => handleToggleStatus(u)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: 0
                      }}
                      title="Click to toggle status"
                    >
                      {u.status === 'active' ? (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          background: '#DCFCE7',
                          color: '#15803D',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          padding: '4px 10px',
                          borderRadius: 6,
                          border: '1px solid #86EFAC'
                        }}>
                          <Check size={13} /> Active
                        </span>
                      ) : (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          background: '#F1F5F9',
                          color: '#64748B',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          padding: '4px 10px',
                          borderRadius: 6,
                          border: '1px solid #CBD5E1'
                        }}>
                          <X size={13} /> Inactive
                        </span>
                      )}
                    </button>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxWidth: 440 }}>
                      {SYSTEM_MODULES.map(mod => {
                        const level = accessMap[mod.id];
                        if (!level || level === 'none') return null;
                        const isFull = level === 'full';
                        return (
                          <span
                            key={mod.id}
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: 600,
                              background: isFull ? '#FFFFFF' : '#F8FAFC',
                              color: isFull ? '#0F172A' : '#475569',
                              border: isFull ? '1px solid #CBD5E1' : '1px solid #E2E8F0',
                              borderRadius: 6,
                              padding: '3px 8px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 5,
                              boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                            }}
                          >
                            {getModuleIcon(mod.id)}
                            <span>{mod.label.replace(/^\d+\.\s*/, '')}</span>
                            {!isFull && (
                              <span style={{
                                fontSize: '0.64rem',
                                background: '#EFF6FF',
                                color: '#2563EB',
                                padding: '1px 5px',
                                borderRadius: 4,
                                fontWeight: 700
                              }}>
                                View
                              </span>
                            )}
                          </span>
                        );
                      })}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                      <button
                        onClick={() => handleOpenEditModal(u)}
                        style={{
                          background: '#FFFFFF',
                          border: '1px solid #10B981',
                          color: '#059669',
                          borderRadius: 6,
                          padding: '5px 12px',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                        title="Edit user & permissions"
                      >
                        <Edit2 size={13} color="#059669" />
                        <span>Edit</span>
                      </button>

                      {u.username !== 'admin' && u.username !== 'admin13' && (
                        <button
                          onClick={() => handleDeleteUser(u)}
                          style={{
                            background: '#FFFFFF',
                            border: '1px solid #FCA5A5',
                            color: '#EF4444',
                            borderRadius: 6,
                            padding: '5px 8px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer'
                          }}
                          title="Delete user"
                        >
                          <Trash2 size={14} color="#EF4444" />
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div className="form-group">
              <label className="form-label">
                Full Name <span className="required">*</span>
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Ramesh Kumar"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                required
              />
              {formErrors.name && (
                <span style={{ fontSize: '0.75rem', color: '#DC2626' }}>{formErrors.name}</span>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">
                Username / ID <span className="required">*</span>
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. ramesh_ops"
                value={formData.username}
                onChange={e => setFormData({ ...formData, username: e.target.value })}
                required
              />
              {formErrors.username && (
                <span style={{ fontSize: '0.75rem', color: '#DC2626' }}>{formErrors.username}</span>
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            <div className="form-group">
              <label className="form-label">
                Password <span className="required">*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showModalPassword ? 'text' : 'password'}
                  className="form-input"
                  style={{ paddingRight: 40 }}
                  placeholder="Enter login password"
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowModalPassword(!showModalPassword)}
                  style={{
                    position: 'absolute',
                    right: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#94A3B8',
                    cursor: 'pointer',
                    padding: 4
                  }}
                  title={showModalPassword ? 'Hide password' : 'Show password'}
                >
                  {showModalPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {formErrors.password && (
                <span style={{ fontSize: '0.75rem', color: '#DC2626' }}>{formErrors.password}</span>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">
                Role Type <span className="required">*</span>
              </label>
              <select
                className="form-select"
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
          <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 12, padding: '16px', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0F172A' }}>
                  Firm Access Control
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                  Assign single, multiple, or full (All Firms) access.
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, assignedFirms: ['*'] }))}
                  className={`btn btn-sm ${formData.assignedFirms.includes('*') ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontSize: '0.75rem', padding: '3px 10px' }}
                >
                  All Firms Access
                </button>
              </div>
            </div>

            <div style={{ marginBottom: 10 }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                background: (formData.assignedFirms.includes('*') || formData.assignedFirms.includes('ALL')) ? '#ECFDF5' : '#FFFFFF',
                border: `1px solid ${(formData.assignedFirms.includes('*') || formData.assignedFirms.includes('ALL')) ? '#A7F3D0' : '#CBD5E1'}`,
                borderRadius: 8,
                padding: '8px 12px',
                cursor: 'pointer'
              }}>
                <input
                  type="checkbox"
                  checked={formData.assignedFirms.includes('*') || formData.assignedFirms.includes('ALL')}
                  onChange={handleToggleAllFirms}
                  style={{ accentColor: '#059669', width: 16, height: 16 }}
                />
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: (formData.assignedFirms.includes('*') || formData.assignedFirms.includes('ALL')) ? '#065F46' : '#334155' }}>
                  🏢 All Firms (Full Multi-Firm Access)
                </span>
              </label>
            </div>

            {!(formData.assignedFirms.includes('*') || formData.assignedFirms.includes('ALL')) && (
              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748B', marginBottom: 6 }}>
                  Select Individual / Multiple Firm(s):
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 8 }}>
                  {activeFirmsList.map(firmName => {
                    const isSelected = formData.assignedFirms.includes(firmName);
                    return (
                      <label
                        key={firmName}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          background: isSelected ? '#EFF6FF' : '#FFFFFF',
                          border: `1px solid ${isSelected ? '#93C5FD' : '#E2E8F0'}`,
                          borderRadius: 6,
                          padding: '6px 10px',
                          cursor: 'pointer'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSpecificFirm(firmName)}
                          style={{ accentColor: '#2563EB', width: 15, height: 15 }}
                        />
                        <span style={{ fontSize: '0.8rem', fontWeight: isSelected ? 700 : 500, color: isSelected ? '#1E40AF' : '#475569' }}>
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
          <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 12, padding: '16px', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
              <div>
                <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0F172A' }}>
                  Granular Module Access: View vs Full Access
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                  Configure <strong>View Only</strong> (Read reports & data) vs <strong>Full Access</strong> (Action/Disburse/Approve).
                </div>
              </div>

              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  type="button"
                  onClick={() => handleSetAllAccess('full')}
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '0.74rem', padding: '3px 8px', color: '#059669', borderColor: '#A7F3D0' }}
                >
                  ⚡ All Full Access
                </button>
                <button
                  type="button"
                  onClick={() => handleSetAllAccess('view')}
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '0.74rem', padding: '3px 8px', color: '#2563EB', borderColor: '#BFDBFE' }}
                >
                  👁️ All View Only
                </button>
                <button
                  type="button"
                  onClick={() => handleSetAllAccess('none')}
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '0.74rem', padding: '3px 8px' }}
                >
                  ❌ Clear All
                </button>
              </div>
            </div>

            {formErrors.permissions && (
              <div style={{ fontSize: '0.75rem', color: '#DC2626', marginBottom: 8, fontWeight: 600 }}>
                {formErrors.permissions}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {SYSTEM_MODULES.map(module => {
                const currentLevel = formData.permissions?.[module.id] || 'none';
                return (
                  <div
                    key={module.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: currentLevel === 'full' ? '#ECFDF5' : currentLevel === 'view' ? '#EFF6FF' : '#FFFFFF',
                      border: `1px solid ${currentLevel === 'full' ? '#A7F3D0' : currentLevel === 'view' ? '#BFDBFE' : '#E2E8F0'}`,
                      borderRadius: 8,
                      padding: '8px 12px',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.84rem', fontWeight: 700, color: '#0F172A' }}>
                      {getModuleIcon(module.id)}
                      <span>{module.label}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <button
                        type="button"
                        onClick={() => handleSetModuleAccess(module.id, 'none')}
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: currentLevel === 'none' ? 800 : 500,
                          padding: '3px 8px',
                          borderRadius: 6,
                          border: currentLevel === 'none' ? '1px solid #CBD5E1' : '1px solid transparent',
                          background: currentLevel === 'none' ? '#F1F5F9' : 'transparent',
                          color: currentLevel === 'none' ? '#475569' : '#94A3B8',
                          cursor: 'pointer'
                        }}
                      >
                        No Access
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSetModuleAccess(module.id, 'view')}
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: currentLevel === 'view' ? 800 : 500,
                          padding: '3px 10px',
                          borderRadius: 6,
                          border: currentLevel === 'view' ? '1px solid #93C5FD' : '1px solid transparent',
                          background: currentLevel === 'view' ? '#DBEAFE' : 'transparent',
                          color: currentLevel === 'view' ? '#1E40AF' : '#64748B',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4
                        }}
                      >
                        <Eye size={12} />
                        <span>View Only</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSetModuleAccess(module.id, 'full')}
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: currentLevel === 'full' ? 800 : 500,
                          padding: '3px 10px',
                          borderRadius: 6,
                          border: currentLevel === 'full' ? '1px solid #6EE7B7' : '1px solid transparent',
                          background: currentLevel === 'full' ? '#D1FAE5' : 'transparent',
                          color: currentLevel === 'full' ? '#065F46' : '#64748B',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4
                        }}
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

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
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
