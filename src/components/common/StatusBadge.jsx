import React from 'react';
import { Clock, CheckCircle2, ShieldCheck, CreditCard, FileCheck2 } from 'lucide-react';

export function StatusBadge({ status }) {
  const norm = String(status || '').trim().toLowerCase();

  if (norm.includes('pending verification') || norm === 'pending') {
    return (
      <span className="badge badge-pending">
        <Clock size={13} />
        Pending Verification
      </span>
    );
  }

  if (norm === 'verified' || norm.includes('verified')) {
    return (
      <span className="badge badge-verified">
        <ShieldCheck size={13} />
        Verified
      </span>
    );
  }

  if (norm === 'approved' || norm.includes('approved')) {
    return (
      <span className="badge badge-approved">
        <CheckCircle2 size={13} />
        Approved
      </span>
    );
  }

  if (norm === 'paid' || norm.includes('paid')) {
    return (
      <span className="badge badge-paid">
        <CreditCard size={13} />
        Paid
      </span>
    );
  }

  if (norm.includes('tally')) {
    return (
      <span className="badge badge-tally">
        <FileCheck2 size={13} />
        Tally Complete
      </span>
    );
  }

  return (
    <span className="badge" style={{ background: '#F1F5F9', color: '#475569' }}>
      {status || 'Unknown'}
    </span>
  );
}
