import React from 'react';
import { Menu, RefreshCw, LogOut, Shield, User } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useNavigate } from 'react-router-dom';

export function Navbar({ onToggleSidebar }) {
  const { currentUser, logout, syncing, refreshData } = useApp();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isAdmin = currentUser?.role === 'admin';

  return (
    <header className="h-16 shrink-0 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-6">
      <button
        onClick={onToggleSidebar}
        className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
        aria-label="Toggle menu"
      >
        <Menu size={18} />
      </button>

      <div className="flex items-center gap-2 md:gap-3">
        <button
          onClick={refreshData}
          disabled={syncing}
          title="Sync & Refresh Data from Google Sheets"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
          <span className="hidden sm:inline">{syncing ? 'Syncing...' : 'Sync Data'}</span>
        </button>

        <div className={`hidden sm:flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold border ${
          isAdmin ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-indigo-50 border-indigo-200 text-indigo-700'
        }`}>
          {isAdmin ? <Shield size={14} /> : <User size={14} />}
          <span>{currentUser?.displayName || 'User'}</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase text-white ${isAdmin ? 'bg-emerald-600' : 'bg-indigo-600'}`}>
            {isAdmin ? 'Admin' : 'User'}
          </span>
        </div>

        <button
          onClick={handleLogout}
          title="Logout"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-rose-600 hover:bg-rose-50 transition-colors"
        >
          <LogOut size={14} />
          <span className="hidden md:inline">Logout</span>
        </button>
      </div>
    </header>
  );
}
