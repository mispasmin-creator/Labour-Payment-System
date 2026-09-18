import React from 'react';
import { Clock, AlertTriangle, AlertCircle, CheckCircle } from 'lucide-react';
import { calculateWorkflowDelay } from '../../utils/dateUtils';

const badgeBase = 'inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border whitespace-nowrap';
const severe = `${badgeBase} bg-rose-50 text-rose-700 border-rose-200`;
const moderate = `${badgeBase} bg-amber-50 text-amber-700 border-amber-200`;
const ontime = `${badgeBase} bg-emerald-50 text-emerald-700 border-emerald-200`;

export function DelayBadge({ plannedDate, actualDate, storedDelay }) {
  if (!plannedDate) {
    return <span className={`${badgeBase} bg-slate-50 text-slate-400 border-slate-200`}>-</span>;
  }

  if (actualDate) {
    const delay = calculateWorkflowDelay(plannedDate, actualDate);
    const text = storedDelay && storedDelay !== '-' ? storedDelay : delay.formatted;

    if (delay.severity === 'severe') {
      return (
        <span className={severe} title={`Delay: ${text}`}>
          <AlertCircle size={13} />
          {text}
        </span>
      );
    }
    if (delay.severity === 'moderate') {
      return (
        <span className={moderate} title={`Delay: ${text}`}>
          <AlertTriangle size={13} />
          {text}
        </span>
      );
    }
    return (
      <span className={ontime} title={`On time: ${text}`}>
        <CheckCircle size={13} />
        {text}
      </span>
    );
  }

  const liveDelay = calculateWorkflowDelay(plannedDate, new Date().toISOString());

  if (liveDelay.diffHours > 24) {
    return (
      <span className={severe} title="Overdue by more than 24 hrs">
        <AlertCircle size={13} />
        Overdue ({liveDelay.formatted})
      </span>
    );
  } else if (liveDelay.diffHours > 8) {
    return (
      <span className={moderate} title="Due soon / pending">
        <Clock size={13} />
        Pending ({liveDelay.formatted})
      </span>
    );
  }

  return (
    <span className={ontime} title="Pending within SLA">
      <Clock size={13} />
      In Progress
    </span>
  );
}
