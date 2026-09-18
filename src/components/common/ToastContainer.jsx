import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';

const BORDER = {
  success: 'border-l-emerald-600',
  error: 'border-l-rose-600',
  info: 'border-l-indigo-600',
};

export function ToastContainer() {
  const { toasts, removeToast } = useApp();

  if (!toasts || !toasts.length) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[150] flex flex-col gap-2.5 pointer-events-none">
      {toasts.map(toast => {
        const type = toast.type || 'success';
        let Icon = CheckCircle2;
        let iconClass = 'text-emerald-600';

        if (type === 'error') {
          Icon = AlertCircle;
          iconClass = 'text-rose-600';
        } else if (type === 'info') {
          Icon = Info;
          iconClass = 'text-indigo-600';
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto min-w-[320px] max-w-[450px] bg-white rounded-xl px-4 py-3.5 shadow-2xl border border-slate-200 border-l-4 ${BORDER[type]} flex items-center gap-3 animate-toast-in`}
          >
            <Icon size={20} className={`shrink-0 ${iconClass}`} />
            <div className="flex-1 text-sm font-medium text-slate-800">{toast.message}</div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-slate-600 p-1 shrink-0"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
