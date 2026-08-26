import React from 'react';

export function MetricCard({ title, value, subtitle, icon: Icon, theme = 'green', onClick }) {
  return (
    <div
      className={`metric-card ${theme}`}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <div className="metric-card-top">
        <span className="metric-title">{title}</span>
        {Icon && (
          <div className="metric-icon-wrap">
            <Icon size={20} />
          </div>
        )}
      </div>

      <div className="metric-value">{value}</div>

      {subtitle && <div className="metric-subtitle">{subtitle}</div>}
    </div>
  );
}
