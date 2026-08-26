import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  PlusCircle,
  ShieldCheck,
  CheckCircle2,
  CreditCard,
  FileCheck2,
  TableProperties,
  Database,
  FileSpreadsheet,
  Sparkles,
  Layers,
  ChevronLeft,
  ChevronRight,
  Shield,
  User,
  LogOut,
  Users
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export function Sidebar({ isOpen, onClose, isCollapsed, onToggleCollapse }) {
  const { counts, currentUser, logout, hasPermission } = useApp();

  const handleLinkClick = () => {
    if (window.innerWidth <= 1024) {
      onClose();
    }
  };

  return (
    <>
      {isOpen && <div className="sidebar-overlay" onClick={onClose} />}

      <aside className={`sidebar ${isOpen ? 'open' : ''} ${isCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
            <div className="navbar-logo-badge" style={{ width: 34, height: 34, flexShrink: 0 }}>
              <Layers size={18} />
            </div>
            {!isCollapsed && (
              <div className="brand-info" style={{ minWidth: 0, overflow: 'hidden' }}>
                <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#0F172A', whiteSpace: 'nowrap' }}>
                  Labour Payment <span style={{ color: '#059669' }}>System</span>
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            className="btn-collapse-toggle hide-mobile"
            onClick={onToggleCollapse}
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            aria-label={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {isCollapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
          </button>
        </div>

        <nav className="sidebar-nav">
          {hasPermission('dashboard') && (
            <NavLink
              to="/"
              end
              title="Dashboard"
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              onClick={handleLinkClick}
            >
              <div className="sidebar-link-content">
                <LayoutDashboard size={18} />
                <span>Dashboard</span>
              </div>
            </NavLink>
          )}

          {hasPermission('new_entry') && (
            <NavLink
              to="/new-entry"
              title="New Entry Form"
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              onClick={handleLinkClick}
            >
              <div className="sidebar-link-content">
                <PlusCircle size={18} />
                <span>New Entry Form</span>
              </div>
            </NavLink>
          )}

          {hasPermission('tracker') && (
            <NavLink
              to="/tracker"
              title="All Work IDs"
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              onClick={handleLinkClick}
            >
              <div className="sidebar-link-content">
                <TableProperties size={18} />
                <span>All Work IDs</span>
              </div>
              <span className="sidebar-badge">{counts.total}</span>
            </NavLink>
          )}

          {/* Stage 1 */}
          {hasPermission('verification') && (
            <NavLink
              to="/verification"
              title="1. Verification"
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              onClick={handleLinkClick}
            >
              <div className="sidebar-link-content">
                <ShieldCheck size={18} />
                <span>1. Verification</span>
              </div>
              {counts.pendingVerification > 0 && (
                <span className="sidebar-badge amber">{counts.pendingVerification}</span>
              )}
            </NavLink>
          )}

          {/* Stage 2 */}
          {hasPermission('approval') && (
            <NavLink
              to="/approval"
              title="2. Payment Approval"
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              onClick={handleLinkClick}
            >
              <div className="sidebar-link-content">
                <CheckCircle2 size={18} />
                <span>2. Payment Approval</span>
              </div>
              {counts.pendingApproval > 0 && (
                <span className="sidebar-badge amber">{counts.pendingApproval}</span>
              )}
            </NavLink>
          )}

          {/* Stage 3 */}
          {hasPermission('payment') && (
            <NavLink
              to="/payment"
              title="3. Payment Disbursal"
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              onClick={handleLinkClick}
            >
              <div className="sidebar-link-content">
                <CreditCard size={18} />
                <span>3. Payment Disbursal</span>
              </div>
              {counts.pendingPayment > 0 && (
                <span className="sidebar-badge amber">{counts.pendingPayment}</span>
              )}
            </NavLink>
          )}

          {/* Stage 4 */}
          {hasPermission('tally') && (
            <NavLink
              to="/tally"
              title="4. Tally Entry"
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              onClick={handleLinkClick}
            >
              <div className="sidebar-link-content">
                <FileCheck2 size={18} />
                <span>4. Tally Entry</span>
              </div>
              {counts.pendingTally > 0 && (
                <span className="sidebar-badge amber">{counts.pendingTally}</span>
              )}
            </NavLink>
          )}

          {hasPermission('reports') && (
            <NavLink
              to="/reports"
              title="Reports & Export"
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              onClick={handleLinkClick}
            >
              <div className="sidebar-link-content">
                <FileSpreadsheet size={18} />
                <span>Reports & Export</span>
              </div>
            </NavLink>
          )}

          {/* Administration & User Management */}
          {hasPermission('admin') && (
            <NavLink
              to="/admin"
              title="Administration"
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              onClick={handleLinkClick}
            >
              <div className="sidebar-link-content">
                <Users size={18} />
                <span>Administration</span>
              </div>
            </NavLink>
          )}
        </nav>

        {!isCollapsed && (
          <div style={{
            padding: '14px 16px',
            borderTop: '1px solid #E2E8F0',
            background: '#F8FAFC',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
              <div style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: currentUser?.role === 'admin' ? '#ECFDF5' : '#EFF6FF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: currentUser?.role === 'admin' ? '#059669' : '#2563EB',
                flexShrink: 0
              }}>
                {currentUser?.role === 'admin' ? <Shield size={16} /> : <User size={16} />}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {currentUser?.displayName || 'User'}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>
                  {currentUser?.role === 'admin' ? 'Administrator' : 'Site User'}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={logout}
              title="Logout"
              style={{
                border: 'none',
                background: 'transparent',
                color: '#94A3B8',
                cursor: 'pointer',
                padding: 6,
                borderRadius: 6,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'color 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.color = '#EF4444'}
              onMouseLeave={e => e.currentTarget.style.color = '#94A3B8'}
            >
              <LogOut size={16} />
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
