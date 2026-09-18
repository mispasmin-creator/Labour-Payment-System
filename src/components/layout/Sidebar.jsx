import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  PlusCircle,
  ShieldCheck,
  TableProperties,
  Shield,
  User,
  LogOut,
  Users,
  ReceiptText,
  Factory,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

function NavItem({ to, end, icon: Icon, label, badge, isCollapsed, onClick }) {
  return (
    <NavLink to={to} end={end} title={label} onClick={onClick} className="block">
      {({ isActive }) => (
        <span
          className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} gap-2 px-2.5 py-2 rounded-xl text-sm font-medium transition-colors ${
            isActive
              ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
              : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
          }`}
        >
          <span className="flex items-center gap-2.5 min-w-0">
            <span
              className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
              }`}
            >
              <Icon size={15} />
            </span>
            {!isCollapsed && <span className="truncate">{label}</span>}
          </span>
          {!isCollapsed && badge}
        </span>
      )}
    </NavLink>
  );
}

function NavGroup({ label, isCollapsed, children }) {
  return (
    <div className="flex flex-col gap-1">
      {!isCollapsed ? (
        <div className="px-2.5 pt-3 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          {label}
        </div>
      ) : (
        <div className="mx-auto my-1.5 w-6 border-t border-slate-200" />
      )}
      {children}
    </div>
  );
}

export function Sidebar({ isOpen, onClose, isCollapsed, onToggleCollapse }) {
  const { counts, currentUser, logout, hasPermission, openNewEntry } = useApp();

  const handleLinkClick = () => {
    if (window.innerWidth <= 1024) {
      onClose();
    }
  };

  const countBadge = (value, color) => {
    if (!value) return null;
    const colors = {
      slate: 'bg-slate-100 text-slate-600',
      amber: 'bg-amber-50 text-amber-700 border border-amber-200',
      emerald: 'bg-emerald-50 text-emerald-700 border border-emerald-200'
    };
    return (
      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0 ${colors[color]}`}>
        {value}
      </span>
    );
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed lg:relative inset-y-0 left-0 z-50 h-screen bg-white border-r border-slate-200 flex flex-col transition-all duration-300 ${
          isCollapsed ? 'lg:w-[72px]' : 'lg:w-72'
        } w-64 transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
      >
        <div className={`h-16 flex items-center border-b border-slate-200 ${isCollapsed ? 'justify-center gap-1 px-2' : 'px-3.5 gap-2'}`}>
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-50 to-white border border-slate-200 shadow-2xs flex items-center justify-center overflow-hidden shrink-0 p-1">
            <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
          </div>
          {!isCollapsed && (
            <div className="min-w-0 flex-1 overflow-hidden">
              <div className="font-extrabold text-[15px] tracking-tight text-slate-900 whitespace-nowrap truncate">
                Labour Payment <span className="text-indigo-600">System</span>
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={onToggleCollapse}
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            aria-label={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            className={`hidden lg:flex items-center justify-center rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors shrink-0 ${
              isCollapsed ? 'w-6 h-6' : 'w-7 h-7'
            }`}
          >
            {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-1">
          <NavGroup label="Overview" isCollapsed={isCollapsed}>
            {hasPermission('dashboard') && (
              <NavItem
                to="/"
                end
                icon={LayoutDashboard}
                label="Dashboard"
                isCollapsed={isCollapsed}
                onClick={handleLinkClick}
              />
            )}

            {hasPermission('new_entry') && (
              <button
                type="button"
                title="New Entry Form"
                onClick={() => {
                  openNewEntry();
                  handleLinkClick();
                }}
                className={`flex items-center ${isCollapsed ? 'justify-center' : ''} gap-2.5 px-2.5 py-2 rounded-xl text-sm font-medium transition-colors text-slate-600 hover:bg-slate-100/80 hover:text-slate-900`}
              >
                <span className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-slate-100 text-slate-500">
                  <PlusCircle size={15} />
                </span>
                {!isCollapsed && <span>New Entry Form</span>}
              </button>
            )}

            {hasPermission('tracker') && (
              <NavItem
                to="/tracker"
                icon={TableProperties}
                label="All Work IDs"
                badge={countBadge(counts.total, 'slate')}
                isCollapsed={isCollapsed}
                onClick={handleLinkClick}
              />
            )}
          </NavGroup>

          <NavGroup label="Workflow" isCollapsed={isCollapsed}>
            {hasPermission('verification') && (
              <NavItem
                to="/verification"
                icon={ShieldCheck}
                label="Verification"
                badge={countBadge(counts.pendingVerification, 'amber')}
                isCollapsed={isCollapsed}
                onClick={handleLinkClick}
              />
            )}

            {hasPermission('payment_report') && (
              <NavItem
                to="/payment-report"
                icon={ReceiptText}
                label="Payment Report"
                badge={countBadge(counts.verifiedCount, 'emerald')}
                isCollapsed={isCollapsed}
                onClick={handleLinkClick}
              />
            )}
          </NavGroup>

          <NavGroup label="Operations" isCollapsed={isCollapsed}>
            {hasPermission('production') && (
              <NavItem
                to="/production"
                icon={Factory}
                label="Production"
                isCollapsed={isCollapsed}
                onClick={handleLinkClick}
              />
            )}

            {hasPermission('admin') && (
              <NavItem
                to="/admin"
                icon={Users}
                label="Administration"
                isCollapsed={isCollapsed}
                onClick={handleLinkClick}
              />
            )}
          </NavGroup>
        </nav>

        <div className={`border-t border-slate-200 bg-slate-50 flex items-center gap-2.5 ${isCollapsed ? 'justify-center py-3 px-2' : 'justify-between py-3.5 px-4'}`}>
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
              currentUser?.role === 'admin' ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600'
            }`}>
              {currentUser?.role === 'admin' ? <Shield size={16} /> : <User size={16} />}
            </div>
            {!isCollapsed && (
              <div className="min-w-0">
                <div className="text-[13px] font-bold text-slate-900 whitespace-nowrap overflow-hidden text-ellipsis">
                  {currentUser?.displayName || 'User'}
                </div>
                <div className="text-[11px] text-slate-500 font-semibold uppercase tracking-wide">
                  {currentUser?.role === 'admin' ? 'Admin' : 'Site User'}
                </div>
              </div>
            )}
          </div>

          {!isCollapsed && (
            <button
              type="button"
              onClick={logout}
              title="Logout"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors shrink-0"
            >
              <LogOut size={16} />
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
