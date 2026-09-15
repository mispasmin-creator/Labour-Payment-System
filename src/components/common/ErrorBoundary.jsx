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
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0F172A',
          padding: '24px',
          fontFamily: 'Inter, system-ui, sans-serif'
        }}>
          <div style={{
            maxWidth: '520px',
            width: '100%',
            backgroundColor: '#1E293B',
            border: '1px solid #334155',
            borderRadius: '16px',
            padding: '32px',
            textAlign: 'center',
            color: '#F8FAFC',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              color: '#EF4444',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '20px'
            }}>
              <AlertTriangle size={32} />
            </div>

            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '8px', color: '#FFFFFF' }}>
              Something Went Wrong
            </h2>

            <p style={{ fontSize: '0.88rem', color: '#94A3B8', marginBottom: '24px', lineHeight: 1.5 }}>
              The application encountered a display error. Don't worry, your data is safe in Google Sheets.
            </p>

            {this.state.error && (
              <div style={{
                backgroundColor: '#0F172A',
                border: '1px solid #334155',
                borderRadius: '8px',
                padding: '12px',
                textAlign: 'left',
                marginBottom: '24px',
                fontSize: '0.78rem',
                color: '#F87171',
                fontFamily: 'monospace',
                overflowX: 'auto',
                maxHeight: '100px'
              }}>
                {this.state.error.toString()}
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={this.handleReload}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: '#059669',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '10px 20px',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  cursor: 'pointer'
                }}
              >
                <RefreshCw size={16} />
                <span>Reload Page</span>
              </button>

              <button
                onClick={this.handleResetSession}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  color: '#CBD5E1',
                  border: '1px solid #475569',
                  borderRadius: '10px',
                  padding: '10px 18px',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  cursor: 'pointer'
                }}
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
