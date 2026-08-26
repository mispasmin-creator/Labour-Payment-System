import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export function ToastContainer() {
  const { toasts, removeToast } = useApp();

  if (!toasts || !toasts.length) return null;

  return (
    <div className="toast-container">
      {toasts.map(toast => {
        let Icon = CheckCircle2;
        let iconColor = '#059669';

        if (toast.type === 'error') {
          Icon = AlertCircle;
          iconColor = '#EF4444';
        } else if (toast.type === 'info') {
          Icon = Info;
          iconColor = '#3B82F6';
        }

        return (
          <div key={toast.id} className={`toast ${toast.type || 'success'}`}>
            <Icon size={20} color={iconColor} />
            <div className="toast-message">{toast.message}</div>
            <button
              onClick={() => removeToast(toast.id)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94A3B8',
                cursor: 'pointer',
                padding: 4
              }}
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
