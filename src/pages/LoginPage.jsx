import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  ShieldCheck
} from 'lucide-react';
import { useApp } from '../context/AppContext';

const FIELD_CLS =
  'w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 focus:bg-white transition-all';

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
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');

    const trimmedUsername = username.trim();
    const trimmedPassword = password.trim();

    if (!trimmedUsername || !trimmedPassword) {
      setError('Please enter both User ID and Password.');
      return;
    }

    setLoading(true);
    try {
      const success = await login(trimmedUsername, trimmedPassword, remember);
      if (success) {
        navigate('/', { replace: true });
      } else {
        setError('Invalid User ID or Password. Please check your credentials.');
      }
    } catch (err) {
      setError(err.message || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const disabled = loading || !username.trim() || !password.trim();

  return (
    <div className="min-h-screen flex items-center justify-center app-bg px-4 py-6">
      <div className="w-full max-w-[380px] bg-white rounded-2xl shadow-xl shadow-emerald-900/10 border border-slate-100 p-6 sm:p-7">
        {/* Brand header */}
        <div className="text-center mb-5">
          <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 shadow-2xs inline-flex items-center justify-center mb-2 p-1.5 overflow-hidden">
            <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
          </div>
          <h2 className="text-lg font-extrabold text-slate-900">
            Labour Payment <span className="text-indigo-600">System</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">Sign in to continue</p>
        </div>

        {error && (
          <div className="flex items-center gap-2.5 bg-rose-50 border border-rose-200 rounded-xl px-3.5 py-2.5 mb-5 text-rose-600 text-sm font-semibold">
            <AlertCircle size={17} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} autoComplete="on">
          {/* User ID */}
          <div className="mb-3.5">
            <label htmlFor="login-user" className="block text-xs font-semibold text-slate-700 mb-1.5">
              User ID
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 flex items-center pointer-events-none">
                <User size={17} />
              </span>
              <input
                id="login-user"
                type="text"
                name="username"
                autoComplete="username"
                className={FIELD_CLS}
                value={username}
                onChange={e => {
                  setUsername(e.target.value);
                  if (error) setError('');
                }}
                placeholder="Enter your User ID"
                autoFocus
                required
              />
            </div>
          </div>

          {/* Password */}
          <div className="mb-3.5">
            <label htmlFor="login-pass" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Password
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 flex items-center pointer-events-none">
                <Lock size={17} />
              </span>
              <input
                id="login-pass"
                type={showPassword ? 'text' : 'password'}
                name="password"
                autoComplete="current-password"
                className={`${FIELD_CLS} pr-10`}
                value={password}
                onChange={e => {
                  setPassword(e.target.value);
                  if (error) setError('');
                }}
                placeholder="Enter your password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 flex items-center p-0.5"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>

          {/* Keep me signed in */}
          <div className="flex items-center justify-between gap-3 mb-4">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={remember}
                onChange={e => setRemember(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 accent-[#27874F] cursor-pointer"
              />
              <span className="text-[13px] font-semibold text-slate-700">Keep me signed in</span>
            </label>
            <span className="text-[11px] text-slate-400 text-right"></span>
          </div>

          {/* Sign In */}
          <button
            type="submit"
            disabled={disabled}
            className={`w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow-md shadow-indigo-600/25 py-2.5 transition-all ${
              disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
            }`}
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <div className="flex items-center justify-center gap-1.5 mt-4 pt-3.5 border-t border-slate-100 text-slate-400 text-xs font-medium">
          <ShieldCheck size={14} className="text-indigo-600" />
          <span> &middot; </span>
        </div>
      </div>
    </div>
  );
}
