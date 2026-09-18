import React from 'react';
import { AlertTriangle, RefreshCw, LogOut } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleResetSession = () => {
    try {
      localStorage.removeItem('labour_sys_auth_user');
    } catch (e) {}
    window.location.href = '/login';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900 p-6 font-sans">
          <div className="max-w-[520px] w-full bg-slate-800 border border-slate-700 rounded-2xl p-8 text-center text-slate-50 shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-rose-500/15 text-rose-500 inline-flex items-center justify-center mb-5">
              <AlertTriangle size={32} />
            </div>

            <h2 className="text-xl font-extrabold mb-2 text-white">Something Went Wrong</h2>

            <p className="text-sm text-slate-400 mb-6 leading-relaxed">
              The application encountered a display error. Don't worry, your data is safe in Google Sheets.
            </p>

            {this.state.error && (
              <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 text-left mb-6 text-xs text-rose-400 font-mono overflow-x-auto max-h-[100px]">
                {this.state.error.toString()}
              </div>
            )}

            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleReload}
                className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-5 py-2.5 font-semibold text-sm transition-colors"
              >
                <RefreshCw size={16} />
                <span>Reload Page</span>
              </button>

              <button
                onClick={this.handleResetSession}
                className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/15 text-slate-300 border border-slate-600 rounded-lg px-5 py-2.5 font-semibold text-sm transition-colors"
              >
                <LogOut size={16} />
                <span>Re-login</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
