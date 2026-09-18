import React from 'react';

const THEME = {
  green: { bar: 'bg-emerald-500', iconBg: 'bg-emerald-50', iconText: 'text-emerald-600' },
  emerald: { bar: 'bg-emerald-500', iconBg: 'bg-emerald-50', iconText: 'text-emerald-600' },
  amber: { bar: 'bg-amber-500', iconBg: 'bg-amber-50', iconText: 'text-amber-600' },
  blue: { bar: 'bg-indigo-500', iconBg: 'bg-indigo-50', iconText: 'text-indigo-600' },
  indigo: { bar: 'bg-indigo-500', iconBg: 'bg-indigo-50', iconText: 'text-indigo-600' },
  teal: { bar: 'bg-teal-500', iconBg: 'bg-teal-50', iconText: 'text-teal-600' },
  red: { bar: 'bg-rose-500', iconBg: 'bg-rose-50', iconText: 'text-rose-600' },
  rose: { bar: 'bg-rose-500', iconBg: 'bg-rose-50', iconText: 'text-rose-600' },
};

export function MetricCard({ title, value, subtitle, icon: Icon, theme = 'green', onClick }) {
  const t = THEME[theme] || THEME.green;

  return (
    <div
      className={`relative overflow-hidden bg-white rounded-xl border border-slate-200 shadow-2xs p-5 flex flex-col justify-between transition-all hover:shadow-md hover:-translate-y-0.5 ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <span className={`absolute top-0 left-0 right-0 h-1 ${t.bar}`} />

      <div className="flex items-start justify-between mb-3">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</span>
        {Icon && (
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${t.iconBg} ${t.iconText}`}>
            <Icon size={20} />
          </div>
        )}
      </div>

      <div className="text-2xl font-extrabold text-slate-900 leading-tight mb-1.5">{value}</div>

      {subtitle && <div className="text-xs text-slate-500 flex items-center gap-1.5">{subtitle}</div>}
    </div>
  );
}
