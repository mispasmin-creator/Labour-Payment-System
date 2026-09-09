import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Layers,
  Shield,
  User,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Users,
  ChevronDown
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export function LoginPage() {
  const navigate = useNavigate();
  const { login, currentUser, users = [] } = useApp();

  useEffect(() => {
    if (currentUser && currentUser.isAuthenticated) {
      navigate('/');
    }
  }, [currentUser, navigate]);

  const [activeRole, setActiveRole] = useState('admin'); // 'admin' | 'user'
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Update form when a user is picked from list/dropdown
  const handleSelectUser = user => {
    if (!user) return;
    setUsername(user.username);
    setPassword(user.password || '');
    setActiveRole(user.role === 'admin' ? 'admin' : 'user');
    setError('');
  };

  const handleRoleChange = role => {
    setActiveRole(role);
    setError('');
    if (role === 'admin') {
      const firstAdmin = users.find(u => u.role === 'admin') || { username: 'admin', password: 'admin123' };
      setUsername(firstAdmin.username);
      setPassword(firstAdmin.password || 'admin123');
    } else {
      const firstUser = users.find(u => u.role !== 'admin') || { username: 'DME', password: 'user123' };
      setUsername(firstUser.username);
      setPassword(firstUser.password || 'user123');
    }
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const success = await login(username, password, activeRole);
      if (success) {
        navigate('/');
      } else {
        setError('Invalid username or password. Please verify credentials.');
      }
    } catch (err) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0F172A 0%, #064E3B 50%, #0F172A 100%)',
      padding: '24px 16px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background glow effects */}
      <div style={{
        position: 'absolute',
        width: 500,
        height: 500,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(5, 150, 105, 0.18) 0%, rgba(0,0,0,0) 70%)',
        top: '-10%',
        left: '20%',
        pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute',
        width: 400,
        height: 400,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(16, 185, 129, 0.15) 0%, rgba(0,0,0,0) 70%)',
        bottom: '-10%',
        right: '20%',
        pointerEvents: 'none'
      }} />

      <div style={{
        width: '100%',
        maxWidth: 480,
        background: '#FFFFFF',
        borderRadius: 20,
        padding: '32px 28px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        position: 'relative',
        zIndex: 1
      }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{
            width: 56,
            height: 56,
            borderRadius: 14,
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 10,
            padding: 6,
            boxShadow: '0 8px 24px -4px rgba(0, 0, 0, 0.1)',
            overflow: 'hidden'
          }}>
            <img src="/logo.png" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>

          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
            Labour Payment <span style={{ color: '#059669' }}>System</span>
          </h2>
          <p style={{ fontSize: '0.82rem', color: '#64748B', marginTop: 4, marginBottom: 0 }}>
            Google Sheets "Login Page" Connected Authentication
          </p>
        </div>

        {/* Quick Select User Dropdown */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <Users size={14} color="#059669" />
            <span>Select Sheet User / Quick Pick</span>
          </label>
          <select
            className="form-input"
            style={{ fontSize: '0.84rem', background: '#F8FAFC', cursor: 'pointer' }}
            value={users.some(u => u.username === username) ? username : ''}
            onChange={e => {
              const u = users.find(x => x.username === e.target.value);
              if (u) handleSelectUser(u);
            }}
          >
            <option value="">-- Choose User from "Login Page" Sheet --</option>
            {users.map((u, i) => (
              <option key={u.id || i} value={u.username}>
                {u.name || u.username} ({u.username}) — {u.role === 'admin' ? '🛡️ Admin' : '👤 User'}
              </option>
            ))}
          </select>
        </div>

        {/* Role Toggle Tabs */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          background: '#F1F5F9',
          padding: 4,
          borderRadius: 12,
          marginBottom: 18
        }}>
          <button
            type="button"
            onClick={() => handleRoleChange('admin')}
            style={{
              padding: '8px 12px',
              borderRadius: 10,
              border: 'none',
              background: activeRole === 'admin' ? '#FFFFFF' : 'transparent',
              color: activeRole === 'admin' ? '#065F46' : '#64748B',
              fontWeight: 700,
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              cursor: 'pointer',
              boxShadow: activeRole === 'admin' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            <Shield size={15} color={activeRole === 'admin' ? '#059669' : '#64748B'} />
            <span>Admin</span>
          </button>

          <button
            type="button"
            onClick={() => handleRoleChange('user')}
            style={{
              padding: '8px 12px',
              borderRadius: 10,
              border: 'none',
              background: activeRole === 'user' ? '#FFFFFF' : 'transparent',
              color: activeRole === 'user' ? '#065F46' : '#64748B',
              fontWeight: 700,
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              cursor: 'pointer',
              boxShadow: activeRole === 'user' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            <User size={15} color={activeRole === 'user' ? '#059669' : '#64748B'} />
            <span>User</span>
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div style={{
            background: '#FEF2F2',
            border: '1px solid #FECACA',
            borderRadius: 10,
            padding: '10px 14px',
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            color: '#DC2626',
            fontSize: '0.82rem',
            fontWeight: 600
          }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: 14 }}>
            <label className="form-label" style={{ fontSize: '0.80rem' }}>
              Username / Sheet User ID
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                className="form-input"
                style={{ paddingLeft: 38 }}
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="e.g. admin, DME"
                required
              />
              <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }}>
                {activeRole === 'admin' ? <Shield size={16} /> : <User size={16} />}
              </div>
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 18 }}>
            <label className="form-label" style={{ fontSize: '0.80rem' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                style={{ paddingLeft: 38, paddingRight: 40 }}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter password"
              />
              <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }}>
                <Lock size={16} />
              </div>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
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
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{
              width: '100%',
              padding: '12px 18px',
              fontSize: '0.92rem',
              fontWeight: 700,
              justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(5, 150, 105, 0.3)'
            }}
          >
            <span>{loading ? 'Signing In...' : `Sign In (${username || 'User'})`}</span>
            <ArrowRight size={16} />
          </button>
        </form>

        {/* Quick Click Badges for Easy Login */}
        <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #F1F5F9' }}>
          <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8, textAlign: 'center' }}>
            Quick Accounts from "Login Page" Sheet
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 110, overflowY: 'auto', padding: 2 }}>
            {users.slice(0, 15).map((u, i) => (
              <button
                key={u.id || i}
                type="button"
                onClick={() => handleSelectUser(u)}
                style={{
                  fontSize: '0.72rem',
                  padding: '4px 8px',
                  borderRadius: 6,
                  border: username === u.username ? '1px solid #059669' : '1px solid #E2E8F0',
                  background: username === u.username ? '#ECFDF5' : '#F8FAFC',
                  color: username === u.username ? '#065F46' : '#334155',
                  cursor: 'pointer',
                  fontWeight: username === u.username ? 700 : 500,
                  transition: 'all 0.15s ease'
                }}
              >
                {u.role === 'admin' ? '🛡️ ' : ''}{u.username}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
