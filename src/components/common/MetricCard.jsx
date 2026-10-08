import React from 'react';

const THEME = {
  green: { card: '', iconBg: 'bg-indigo-50', iconText: 'text-indigo-600' },
  emerald: { card: '', iconBg: 'bg-emerald-50', iconText: 'text-emerald-600' },
  amber: { card: '', iconBg: 'bg-amber-100', iconText: 'text-amber-700' },
  blue: { card: '', iconBg: 'bg-sky-50', iconText: 'text-sky-600' },
  // Highlighted card: filled mint, like the lead KPI tile
  indigo: { card: 'metric-mint', iconBg: 'bg-white/70', iconText: 'text-indigo-700' },
  teal: { card: '', iconBg: 'bg-teal-50', iconText: 'text-teal-600' },
  red: { card: '', iconBg: 'bg-rose-50', iconText: 'text-rose-600' },
  rose: { card: '', iconBg: 'bg-rose-50', iconText: 'text-rose-600' },
};

export function MetricCard({ title, value, subtitle, icon: Icon, theme = 'green', onClick }) {
  const t = THEME[theme] || THEME.green;

  return (
    <div
      className={`relative overflow-hidden bg-white rounded-xl border border-slate-200 p-5 flex flex-col justify-between transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-emerald-900/10 ${t.card} ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <span className="text-[13px] font-medium text-slate-600">{title}</span>
        {Icon && (
          <div className={`w-9 h-9 rounded-lg border border-slate-200/70 flex items-center justify-center ${t.iconBg} ${t.iconText}`}>
            <Icon size={18} />
          </div>
        )}
      </div>

      <div className="text-[26px] font-extrabold text-slate-900 leading-tight mb-1.5 tracking-tight">{value}</div>

      {subtitle && <div className="text-xs text-slate-500 flex items-center gap-1.5">{subtitle}</div>}
    </div>
  );
}
