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
  LayoutDashboard
} from 'lucide-react';
import { useApp, SYSTEM_MODULES } from '../context/AppContext';
import { Modal } from '../components/common/Modal';

export function AdministrationPage() {
  const { users, currentUser, masterData, addUser, updateUser, deleteUser } = useApp();

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
    permissions: ['dashboard', 'new_entry', 'tracker', 'verification']
  });

  const [formErrors, setFormErrors] = useState({});

  // Filtered user list
  const filteredUsers = (users || []).filter(u => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.username.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = !roleFilter || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const totalUsers = users?.length || 0;
  const activeUsers = users?.filter(u => u.status === 'active').length || 0;

  const handleOpenAddModal = () => {
    setEditingUser(null);
    setShowModalPassword(false);
    setFormData({
      name: '',
      username: '',
      password: '',
      role: 'user',
      status: 'active',
      assignedFirms: ['*'],
      permissions: ['dashboard', 'new_entry', 'tracker', 'verification']
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleOpenEditModal = userToEdit => {
    setEditingUser(userToEdit);
    setShowModalPassword(false);
    setFormData({
      name: userToEdit.name,
      username: userToEdit.username,
      password: userToEdit.password || '',
      role: userToEdit.role || 'user',
      status: userToEdit.status || 'active',
      assignedFirms: Array.isArray(userToEdit.assignedFirms) && userToEdit.assignedFirms.length > 0 ? userToEdit.assignedFirms : ['*'],
      permissions: userToEdit.permissions || []
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleTogglePermission = moduleId => {
    setFormData(prev => {
      const exists = prev.permissions.includes(moduleId);
      const updated = exists
        ? prev.permissions.filter(p => p !== moduleId)
        : [...prev.permissions, moduleId];
      return { ...prev, permissions: updated };
    });
  };

  const handleSelectAllPermissions = () => {
    setFormData(prev => ({
      ...prev,
      permissions: SYSTEM_MODULES.map(m => m.id)
    }));
  };

  const handleDeselectAllPermissions = () => {
    setFormData(prev => ({
      ...prev,
      permissions: []
    }));
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
    if (formData.permissions.length === 0) errors.permissions = 'At least 1 module permission must be granted';

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

    if (editingUser) {
      updateUser(editingUser.id, formData);
    } else {
      addUser(formData);
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
    if (userToDelete.username === 'admin') {
      alert('The primary Admin account cannot be deleted.');
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
            Create users, manage roles, and customize granular permissions for each module.
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
              <th>User</th>
              <th>Username</th>
              <th>Role</th>
              <th>Assigned Firms</th>
              <th>Status</th>
              <th>Permitted Modules & Access</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map(u => (
              <tr key={u.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      background: u.role === 'admin' ? '#ECFDF5' : '#EFF6FF',
                      color: u.role === 'admin' ? '#059669' : '#2563EB',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '0.9rem',
                      flexShrink: 0
                    }}>
                      {u.name ? u.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, color: '#0F172A' }}>{u.name}</div>
                      {u.username === currentUser?.username && (
                        <span style={{ fontSize: '0.7rem', color: '#059669', fontWeight: 700 }}>
                          (Current You)
                        </span>
                      )}
                    </div>
                  </div>
                </td>
                <td>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', background: '#F8FAFC', padding: '3px 8px', borderRadius: 4, border: '1px solid #E2E8F0', fontWeight: 600 }}>
                    {u.username}
                  </span>
                </td>
                <td>
                  <span style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    padding: '3px 8px',
                    borderRadius: 6,
                    background: u.role === 'admin' ? '#ECFDF5' : '#EFF6FF',
                    color: u.role === 'admin' ? '#065F46' : '#1E40AF',
                    border: `1px solid ${u.role === 'admin' ? '#A7F3D0' : '#BFDBFE'}`
                  }}>
                    {u.role === 'admin' ? 'Admin' : 'User'}
                  </span>
                </td>
                <td>
                  {(!u.assignedFirms || u.assignedFirms.includes('*') || u.assignedFirms.includes('ALL')) ? (
                    <span style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: '#047857',
                      background: '#ECFDF5',
                      padding: '3px 8px',
                      borderRadius: 6,
                      border: '1px solid #A7F3D0',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4
                    }}>
                      🏢 All Firms
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
                        padding: '3px 8px',
                        borderRadius: 6,
                        border: '1px solid #86EFAC'
                      }}>
                        <Check size={12} /> Active
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
                        padding: '3px 8px',
                        borderRadius: 6,
                        border: '1px solid #CBD5E1'
                      }}>
                        <X size={12} /> Inactive
                      </span>
                    )}
                  </button>
                </td>
                <td>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxWidth: 360 }}>
                    {(u.permissions || []).map(permId => {
                      const mod = SYSTEM_MODULES.find(m => m.id === permId);
                      if (!mod) return null;
                      return (
                        <span
                          key={permId}
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            background: '#F8FAFC',
                            color: '#334155',
                            border: '1px solid #E2E8F0',
                            borderRadius: 6,
                            padding: '2px 7px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4
                          }}
                        >
                          {getModuleIcon(permId)}
                          <span>{mod.label.replace(/^\d+\.\s*/, '')}</span>
                        </span>
                      );
                    })}
                  </div>
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button
                      onClick={() => handleOpenEditModal(u)}
                      className="btn btn-outline-green btn-sm"
                      title="Edit user & permissions"
                    >
                      <Edit2 size={13} />
                      <span>Edit</span>
                    </button>

                    {u.username !== 'admin' && (
                      <button
                        onClick={() => handleDeleteUser(u)}
                        className="btn btn-secondary btn-sm"
                        style={{ color: '#EF4444', borderColor: '#FCA5A5' }}
                        title="Delete user"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add / Edit User Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingUser ? `Edit User: ${editingUser.name}` : 'Add New User & Set Permissions'}
        maxWidth="640px"
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
                  setFormData({
                    ...formData,
                    role: r,
                    assignedFirms: r === 'admin' ? ['*'] : formData.assignedFirms,
                    permissions: r === 'admin'
                      ? SYSTEM_MODULES.map(m => m.id)
                      : ['dashboard', 'new_entry', 'tracker', 'verification']
                  });
                }}
              >
                <option value="admin">Admin</option>
                <option value="user">User</option>
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

          {/* Granular Module Permissions Selector */}
          <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 12, padding: '16px', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0F172A' }}>
                  Granular Module Access Permissions
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                  Select modules this user is allowed to access and operate.
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={handleSelectAllPermissions}
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '0.75rem', padding: '3px 8px' }}
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={handleDeselectAllPermissions}
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '0.75rem', padding: '3px 8px' }}
                >
                  Clear All
                </button>
              </div>
            </div>

            {formErrors.permissions && (
              <div style={{ fontSize: '0.75rem', color: '#DC2626', marginBottom: 8, fontWeight: 600 }}>
                {formErrors.permissions}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {SYSTEM_MODULES.map(module => {
                const isChecked = formData.permissions.includes(module.id);
                return (
                  <label
                    key={module.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      background: isChecked ? '#ECFDF5' : '#FFFFFF',
                      border: `1px solid ${isChecked ? '#A7F3D0' : '#CBD5E1'}`,
                      borderRadius: 8,
                      padding: '8px 12px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleTogglePermission(module.id)}
                      style={{ accentColor: '#059669', width: 16, height: 16 }}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', fontWeight: isChecked ? 700 : 500, color: isChecked ? '#065F46' : '#334155' }}>
                      {getModuleIcon(module.id)}
                      <span>{module.label}</span>
                    </div>
                  </label>
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
