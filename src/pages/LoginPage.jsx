import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  ShieldCheck
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export function LoginPage() {
  const navigate = useNavigate();
  const { login, currentUser } = useApp();

  useEffect(() => {
    if (currentUser && currentUser.isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [currentUser, navigate]);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');

    const trimmedUsername = username.trim();
    const trimmedPassword = password.trim();

    if (!trimmedUsername || !trimmedPassword) {
      setError('Please enter both Username and Password.');
      return;
    }

    setLoading(true);
    try {
      const success = await login(trimmedUsername, trimmedPassword);
      if (success) {
        navigate('/', { replace: true });
      } else {
        setError('Invalid Username or Password. Please check your credentials.');
      }
    } catch (err) {
      setError(err.message || 'Authentication failed. Please try again.');
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
      {/* Subtle background ambient glows */}
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
        padding: '36px 30px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        position: 'relative',
        zIndex: 1
      }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: 26 }}>
          <div style={{
            width: 60,
            height: 60,
            borderRadius: 16,
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 12,
            padding: 8,
            boxShadow: '0 8px 24px -4px rgba(0, 0, 0, 0.08)',
            overflow: 'hidden'
          }}>
            <img src="/logo.png" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>

          <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
            Labour Payment <span style={{ color: '#059669' }}>System</span>
          </h2>
          <p style={{ fontSize: '0.84rem', color: '#64748B', marginTop: 6, marginBottom: 0 }}>
            Sign in with your Username and Password
          </p>
        </div>

        {/* Error Alert Banner */}
        {error && (
          <div style={{
            background: '#FEF2F2',
            border: '1px solid #FECACA',
            borderRadius: 10,
            padding: '11px 14px',
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            color: '#DC2626',
            fontSize: '0.84rem',
            fontWeight: 600
          }}>
            <AlertCircle size={17} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Clean Login Form */}
        <form onSubmit={handleSubmit} autoComplete="on">
          {/* Username Field */}
          <div className="form-group" style={{ marginBottom: 18 }}>
            <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
              Username
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                name="username"
                autoComplete="username"
                className="form-input"
                style={{
                  paddingLeft: 40,
                  fontSize: '0.90rem',
                  height: 44,
                  borderRadius: 10,
                  borderColor: '#E2E8F0'
                }}
                value={username}
                onChange={e => {
                  setUsername(e.target.value);
                  if (error) setError('');
                }}
                placeholder="Enter Username"
                autoFocus
                required
              />
              <div style={{
                position: 'absolute',
                left: 14,
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#94A3B8',
                display: 'flex',
                alignItems: 'center'
              }}>
                <User size={18} />
              </div>
            </div>
          </div>

          {/* Password Field */}
          <div className="form-group" style={{ marginBottom: 24 }}>
            <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                autoComplete="current-password"
                className="form-input"
                style={{
                  paddingLeft: 40,
                  paddingRight: 42,
                  fontSize: '0.90rem',
                  height: 44,
                  borderRadius: 10,
                  borderColor: '#E2E8F0'
                }}
                value={password}
                onChange={e => {
                  setPassword(e.target.value);
                  if (error) setError('');
                }}
                placeholder="Enter Password"
                required
              />
              <div style={{
                position: 'absolute',
                left: 14,
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#94A3B8',
                display: 'flex',
                alignItems: 'center'
              }}>
                <Lock size={18} />
              </div>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                style={{
                  position: 'absolute',
                  right: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#94A3B8',
                  cursor: 'pointer',
                  padding: 4,
                  display: 'flex',
                  alignItems: 'center'
                }}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Sign In Button */}
          <button
            type="submit"
            disabled={loading || !username.trim() || !password.trim()}
            className="btn btn-primary"
            style={{
              width: '100%',
              height: 46,
              padding: '12px 18px',
              fontSize: '0.95rem',
              fontWeight: 700,
              borderRadius: 10,
              justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(5, 150, 105, 0.35)',
              opacity: (loading || !username.trim() || !password.trim()) ? 0.65 : 1,
              cursor: (loading || !username.trim() || !password.trim()) ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <span>{loading ? 'Signing In...' : 'Sign In'}</span>
            <ArrowRight size={17} style={{ marginLeft: 6 }} />
          </button>
        </form>

        {/* Clean Security Footer */}
        <div style={{
          marginTop: 26,
          paddingTop: 18,
          borderTop: '1px solid #F1F5F9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          color: '#94A3B8',
          fontSize: '0.76rem',
          fontWeight: 500
        }}>
          <ShieldCheck size={14} color="#059669" />
          <span>Secure System · Authorized Personnel Only</span>
        </div>
      </div>
    </div>
  );
}
