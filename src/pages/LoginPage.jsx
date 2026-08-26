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
  AlertCircle
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export function LoginPage() {
  const navigate = useNavigate();
  const { login, currentUser } = useApp();

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

  const handleRoleChange = role => {
    setActiveRole(role);
    setError('');
    if (role === 'admin') {
      setUsername('admin');
      setPassword('admin123');
    } else {
      setUsername('supervisor');
      setPassword('user123');
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
        setError('Invalid username or password. Please try again.');
      }
    } catch (err) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = role => {
    setActiveRole(role);
    if (role === 'admin') {
      login('admin', 'admin123', 'admin');
    } else {
      login('supervisor', 'user123', 'user');
    }
    navigate('/');
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
        maxWidth: 440,
        background: '#FFFFFF',
        borderRadius: 20,
        padding: '36px 32px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        position: 'relative',
        zIndex: 1
      }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 54,
            height: 54,
            borderRadius: 14,
            background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            marginBottom: 14,
            boxShadow: '0 8px 20px -4px rgba(5, 150, 105, 0.4)'
          }}>
            <Layers size={28} />
          </div>

          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
            Labour Payment <span style={{ color: '#059669' }}>System</span>
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#64748B', marginTop: 6, marginBottom: 0 }}>
            Sign in to access your workflow dashboard
          </p>
        </div>

        {/* Role Toggle Tabs */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          background: '#F1F5F9',
          padding: 4,
          borderRadius: 12,
          marginBottom: 24
        }}>
          <button
            type="button"
            onClick={() => handleRoleChange('admin')}
            style={{
              padding: '10px 14px',
              borderRadius: 10,
              border: 'none',
              background: activeRole === 'admin' ? '#FFFFFF' : 'transparent',
              color: activeRole === 'admin' ? '#065F46' : '#64748B',
              fontWeight: 700,
              fontSize: '0.88rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              cursor: 'pointer',
              boxShadow: activeRole === 'admin' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            <Shield size={16} color={activeRole === 'admin' ? '#059669' : '#64748B'} />
            <span>Admin</span>
          </button>

          <button
            type="button"
            onClick={() => handleRoleChange('user')}
            style={{
              padding: '10px 14px',
              borderRadius: 10,
              border: 'none',
              background: activeRole === 'user' ? '#FFFFFF' : 'transparent',
              color: activeRole === 'user' ? '#065F46' : '#64748B',
              fontWeight: 700,
              fontSize: '0.88rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              cursor: 'pointer',
              boxShadow: activeRole === 'user' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            <User size={16} color={activeRole === 'user' ? '#059669' : '#64748B'} />
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
            marginBottom: 20,
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
          <div className="form-group" style={{ marginBottom: 16 }}>
            <label className="form-label" style={{ fontSize: '0.82rem' }}>
              Username / ID
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                className="form-input"
                style={{ paddingLeft: 38 }}
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder={activeRole === 'admin' ? 'admin' : 'supervisor'}
                required
              />
              <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }}>
                {activeRole === 'admin' ? <Shield size={16} /> : <User size={16} />}
              </div>
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 22 }}>
            <label className="form-label" style={{ fontSize: '0.82rem' }}>
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
                required
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
              fontSize: '0.95rem',
              fontWeight: 700,
              justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(5, 150, 105, 0.3)'
            }}
          >
            <span>{loading ? 'Signing In...' : `Sign In as ${activeRole === 'admin' ? 'Admin' : 'User'}`}</span>
            <ArrowRight size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}
