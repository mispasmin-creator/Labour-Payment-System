import React from 'react';
import { Clock, AlertTriangle, AlertCircle, CheckCircle } from 'lucide-react';
import { calculateWorkflowDelay } from '../../utils/dateUtils';

export function DelayBadge({ plannedDate, actualDate, storedDelay }) {
  if (!plannedDate) {
    return <span className="badge" style={{ background: '#F8FAFC', color: '#94A3B8' }}>-</span>;
  }

  // If actual date exists, compute or use stored
  if (actualDate) {
    const delay = calculateWorkflowDelay(plannedDate, actualDate);
    const text = storedDelay && storedDelay !== '-' ? storedDelay : delay.formatted;

    if (delay.severity === 'severe') {
      return (
        <span className="badge badge-delay-severe" title={`Delay: ${text}`}>
          <AlertCircle size={13} />
          {text}
        </span>
      );
    }
    if (delay.severity === 'moderate') {
      return (
        <span className="badge badge-delay-moderate" title={`Delay: ${text}`}>
          <AlertTriangle size={13} />
          {text}
        </span>
      );
    }
    return (
      <span className="badge badge-delay-ontime" title={`On time: ${text}`}>
        <CheckCircle size={13} />
        {text}
      </span>
    );
  }

  // Stage is still pending: compute live elapsed delay from planned date to current time
  const liveDelay = calculateWorkflowDelay(plannedDate, new Date().toISOString());

  if (liveDelay.diffHours > 24) {
    return (
      <span className="badge badge-delay-severe" title="Overdue by more than 24 hrs">
        <AlertCircle size={13} />
        Overdue ({liveDelay.formatted})
      </span>
    );
  } else if (liveDelay.diffHours > 8) {
    return (
      <span className="badge badge-delay-moderate" title="Due soon / pending">
        <Clock size={13} />
        Pending ({liveDelay.formatted})
      </span>
    );
  }

  return (
    <span className="badge badge-delay-ontime" title="Pending within SLA">
      <Clock size={13} />
      In Progress
    </span>
  );
}
