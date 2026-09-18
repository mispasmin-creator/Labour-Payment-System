import React from 'react';
import { Clock, CheckCircle2, ShieldCheck, CreditCard, FileCheck2 } from 'lucide-react';

export function StatusBadge({ status }) {
  const norm = String(status || '').trim().toLowerCase();

  if (norm.includes('pending verification') || norm === 'pending') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border bg-amber-50 text-amber-700 border-amber-200">
        <Clock size={13} />
        Pending Verification
      </span>
    );
  }

  if (norm === 'verified' || norm.includes('verified')) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border bg-indigo-50 text-indigo-700 border-indigo-200">
        <ShieldCheck size={13} />
        Verified
      </span>
    );
  }

  if (norm === 'approved' || norm.includes('approved')) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border bg-teal-50 text-teal-700 border-teal-200">
        <CheckCircle2 size={13} />
        Approved
      </span>
    );
  }

  if (norm === 'paid' || norm.includes('paid')) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border bg-emerald-50 text-emerald-700 border-emerald-200">
        <CreditCard size={13} />
        Paid
      </span>
    );
  }

  if (norm.includes('tally')) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border bg-emerald-50 text-emerald-700 border-emerald-200">
        <FileCheck2 size={13} />
        Tally Complete
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border bg-slate-100 text-slate-600 border-slate-200">
      {status || 'Unknown'}
    </span>
  );
}
