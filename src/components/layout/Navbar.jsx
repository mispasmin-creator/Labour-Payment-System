import React from 'react';
import { Menu, Layers, RefreshCw, LogOut, Shield, User } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Link, useNavigate } from 'react-router-dom';

export function Navbar({ onToggleSidebar }) {
  const { currentUser, logout, syncing, refreshData } = useApp();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="navbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <button
          onClick={onToggleSidebar}
          className="btn btn-secondary btn-sm"
          style={{ display: 'flex', alignItems: 'center', padding: '8px' }}
          aria-label="Toggle menu"
        >
          <Menu size={18} />
        </button>

        <Link to="/" className="navbar-brand">
          <div className="navbar-logo-badge">
            <Layers size={22} />
          </div>
          <div>
            <div className="brand-text-title">
              Labour Payment <span>System</span>
            </div>
          </div>
        </Link>
      </div>

      <div className="navbar-actions">
        {/* Refresh Button */}
        <button
          onClick={refreshData}
          disabled={syncing}
          className="btn btn-secondary btn-sm"
          title="Refresh Data"
        >
          <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
          <span className="hide-mobile">Sync</span>
        </button>

        {/* User Badge */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: currentUser?.role === 'admin' ? '#ECFDF5' : '#EFF6FF',
          border: `1px solid ${currentUser?.role === 'admin' ? '#A7F3D0' : '#BFDBFE'}`,
          borderRadius: 10,
          padding: '5px 12px',
          fontSize: '0.82rem',
          fontWeight: 600,
          color: currentUser?.role === 'admin' ? '#065F46' : '#1E40AF'
        }}>
          {currentUser?.role === 'admin' ? <Shield size={15} color="#059669" /> : <User size={15} color="#2563EB" />}
          <span>{currentUser?.displayName || 'User'}</span>
          <span style={{
            fontSize: '0.7rem',
            background: currentUser?.role === 'admin' ? '#059669' : '#2563EB',
            color: '#FFFFFF',
            padding: '1px 6px',
            borderRadius: 6,
            fontWeight: 700,
            textTransform: 'uppercase'
          }}>
            {currentUser?.role === 'admin' ? 'Admin' : 'User'}
          </span>
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="btn btn-secondary btn-sm"
          title="Logout"
          style={{ color: '#EF4444', borderColor: '#FCA5A5' }}
        >
          <LogOut size={14} />
          <span className="hide-mobile">Logout</span>
        </button>
      </div>
    </header>
  );
}
