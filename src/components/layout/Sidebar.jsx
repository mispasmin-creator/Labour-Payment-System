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
  RefreshCw,
  Users,
  ReceiptText,
  Factory,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

function NavItem({ to, end, icon: Icon, label, isCollapsed, onClick }) {
  return (
    <NavLink to={to} end={end} title={label} onClick={onClick} className="block">
      {({ isActive }) => (
        <span
          className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} sidebar-item gap-2.5 px-2.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
            isActive
              ? 'bg-[#DDF27B] text-[#1B2420] font-semibold'
              : 'text-slate-600 hover:bg-indigo-50 hover:text-slate-900'
          }`}
        >
          <span className="flex items-center gap-2.5 min-w-0">
            <span
              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                isActive ? 'bg-white/60 text-[#1B2420]' : 'bg-slate-100 text-slate-500'
              }`}
            >
              <Icon size={16} />
            </span>
            {!isCollapsed && <span className="truncate">{label}</span>}
          </span>
        </span>
      )}
    </NavLink>
  );
}

function NavGroup({ label, isCollapsed, children }) {
  return (
    <div className="flex flex-col gap-1">
      {children}
    </div>
  );
}

export function Sidebar({ isOpen, onClose, isCollapsed, onToggleCollapse }) {
  const { currentUser, logout, hasPermission, openNewEntry, syncing, refreshData } = useApp();

  const handleLinkClick = () => {
    if (window.innerWidth <= 1024) {
      onClose();
    }
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
        className={`fixed lg:relative inset-y-0 left-0 z-50 h-screen glass-bar border-r border-slate-100 shadow-[4px_0_24px_-12px_rgba(31,80,50,0.12)] flex flex-col transition-all duration-300 ${
          isCollapsed ? 'lg:w-[72px]' : 'lg:w-[17rem]'
        } w-64 transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
      >
        <div className={`h-16 flex items-center border-b border-slate-100 ${isCollapsed ? 'justify-center gap-1 px-2' : 'px-3.5 gap-2'}`}>
          <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 shadow-2xs flex items-center justify-center overflow-hidden shrink-0 p-1">
            <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
          </div>
          {!isCollapsed && (
            <div className="min-w-0 flex-1 overflow-hidden">
              <div className="font-extrabold text-[14px] tracking-tight text-slate-900 whitespace-nowrap truncate">
                Labour Application <span className="text-indigo-600"></span>
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

        <nav className="sidebar-nav flex-1 min-h-0 overflow-hidden px-3 py-3 flex flex-col gap-1">
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
                className={`flex items-center ${isCollapsed ? 'justify-center' : ''} sidebar-item gap-2.5 px-2.5 py-2.5 rounded-xl text-sm font-medium transition-colors text-slate-600 hover:bg-indigo-50 hover:text-slate-900`}
              >
                <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-slate-100 text-slate-500">
                  <PlusCircle size={16} />
                </span>
                {!isCollapsed && <span>New Entry Form</span>}
              </button>
            )}

            {hasPermission('tracker') && (
              <NavItem
                to="/tracker"
                icon={TableProperties}
                label="All Work IDs"
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
                isCollapsed={isCollapsed}
                onClick={handleLinkClick}
              />
            )}

            {hasPermission('payment_report') && (
              <NavItem
                to="/payment-report"
                icon={ReceiptText}
                label="Payment Report"
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

        <div className={`border-t border-slate-100 bg-slate-50 flex flex-col gap-2 ${isCollapsed ? 'py-3 px-2 items-center' : 'p-3'}`}>
          <button
            type="button"
            onClick={refreshData}
            disabled={syncing}
            title="Sync & Refresh Data from Google Sheets"
            className={`btn-gold inline-flex items-center justify-center gap-2 rounded-xl text-xs font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
              isCollapsed ? 'w-10 h-10' : 'w-full px-3 py-2.5'
            }`}
          >
            <RefreshCw size={15} className={syncing ? 'animate-spin' : ''} />
            {!isCollapsed && <span>{syncing ? 'Syncing...' : 'Sync Data'}</span>}
          </button>

          <div
            title={currentUser?.displayName || 'User'}
            className={`flex items-center gap-2.5 min-w-0 bg-white border border-slate-200 rounded-xl ${
              isCollapsed ? 'p-1.5 justify-center' : 'px-2.5 py-2'
            }`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
              currentUser?.role === 'admin' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'
            }`}>
              {currentUser?.role === 'admin' ? <Shield size={16} /> : <User size={16} />}
            </div>
            {!isCollapsed && (
              <>
                <div className="min-w-0 flex-1 text-[13px] font-bold text-slate-900 whitespace-nowrap overflow-hidden text-ellipsis">
                  {currentUser?.displayName || 'User'}
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase shrink-0 ${
                  currentUser?.role === 'admin' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'
                }`}>
                  {currentUser?.role === 'admin' ? 'Admin' : 'User'}
                </span>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={logout}
            title="Logout"
            className={`inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-rose-600 hover:bg-rose-50 text-xs font-semibold transition-colors ${
              isCollapsed ? 'w-10 h-10' : 'w-full px-3 py-2.5'
            }`}
          >
            <LogOut size={15} />
            {!isCollapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
