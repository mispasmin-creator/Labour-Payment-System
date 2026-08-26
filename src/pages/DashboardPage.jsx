import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PlusCircle,
  Clock,
  ShieldCheck,
  CheckCircle2,
  CreditCard,
  FileCheck2,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  FileSpreadsheet,
  Users,
  Briefcase,
  IndianRupee,
  Layers,
  Sparkles,
  Search,
  RefreshCw
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { MetricCard } from '../components/common/MetricCard';
import { StatusBadge } from '../components/common/StatusBadge';
import { DelayBadge } from '../components/common/DelayBadge';
import { formatDate } from '../utils/dateUtils';
import { WorkDetailModal } from './WorkDetailModal';

export function DashboardPage() {
  const navigate = useNavigate();
  const { entries, counts, refreshData, syncing } = useApp();
  const [selectedWorkId, setSelectedWorkId] = useState(null);

  // Compute average delays
  const completedEntries = entries.filter(e => e.status === 'Tally Complete');
  const delayedItems = entries.filter(e => {
    return (
      (e.verificationDelay && e.verificationDelay.includes('days')) ||
      (e.approvalDelay && e.approvalDelay.includes('days')) ||
      (e.paymentDelay && e.paymentDelay.includes('days')) ||
      (e.tallyDelay && e.tallyDelay.includes('days'))
    );
  });

  const recentEntries = entries.slice(0, 7);

  const stageStats = {
    verification: {
      pending: entries.filter(e => e.status === 'Pending Verification' || (!e.verificationActual && !e.approvalActual && !e.paymentActual && !e.tallyActual)).length,
      completed: entries.filter(e => ['Verified (Pending Approval)', 'Approved (Pending Payment)', 'Approved', 'Paid (Pending Tally)', 'Paid', 'Tally Complete'].includes(e.status) || Boolean(e.verificationActual)).length
    },
    approval: {
      pending: entries.filter(e => e.status === 'Verified (Pending Approval)' || (e.verificationActual && !e.approvalActual)).length,
      completed: entries.filter(e => ['Approved (Pending Payment)', 'Approved', 'Paid (Pending Tally)', 'Paid', 'Tally Complete'].includes(e.status) || Boolean(e.approvalActual)).length
    },
    payment: {
      pending: entries.filter(e => e.status === 'Approved (Pending Payment)' || e.status === 'Approved' || (e.approvalActual && !e.paymentActual)).length,
      completed: entries.filter(e => ['Paid (Pending Tally)', 'Paid', 'Tally Complete'].includes(e.status) || Boolean(e.paymentActual)).length
    },
    tally: {
      pending: entries.filter(e => e.status === 'Paid (Pending Tally)' || e.status === 'Paid' || (e.paymentActual && !e.tallyActual)).length,
      completed: entries.filter(e => e.status === 'Tally Complete' || Boolean(e.tallyActual)).length
    }
  };

  return (
    <div>
      {/* Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #059669 0%, #047857 50%, #064E3B 100%)',
        borderRadius: 16,
        padding: '28px 32px',
        color: '#FFFFFF',
        marginBottom: 28,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 20,
        boxShadow: '0 10px 25px -5px rgba(5, 150, 105, 0.25)'
      }}>
        <div>
          <h1 style={{ color: '#FFFFFF', fontSize: '1.8rem', fontWeight: 800, margin: 0 }}>
            Labour Payment System
          </h1>
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button
            onClick={refreshData}
            disabled={syncing}
            className="btn btn-lg"
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              color: '#FFFFFF',
              border: '1px solid rgba(255,255,255,0.4)',
              fontWeight: 700
            }}
            title="Sync & Refresh Data from Google Sheets"
          >
            <RefreshCw size={18} className={syncing ? 'animate-spin' : ''} />
            <span>{syncing ? 'Syncing...' : 'Sync Live Data'}</span>
          </button>

          <button
            onClick={() => navigate('/new-entry')}
            className="btn btn-lg"
            style={{ background: '#FFFFFF', color: '#047857', fontWeight: 700, boxShadow: '0 4px 14px rgba(0,0,0,0.1)' }}
          >
            <PlusCircle size={18} />
            <span>New Work Entry</span>
          </button>

          <button
            onClick={() => navigate('/reports')}
            className="btn btn-lg"
            style={{ background: 'rgba(255, 255, 255, 0.15)', color: '#FFFFFF', border: '1px solid rgba(255,255,255,0.3)' }}
          >
            <FileSpreadsheet size={18} />
            <span>Export Reports</span>
          </button>
        </div>
      </div>

      {/* 4 Workflow Stage Cards with Pending & Complete Counters */}
      <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
        {/* Step 1: Verification */}
        <div
          className="metric-card amber"
          onClick={() => navigate('/verification')}
          style={{ cursor: 'pointer' }}
        >
          <div className="metric-card-top">
            <span className="metric-title" style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1E293B' }}>
              Verification
            </span>
            <div className="metric-icon-wrap" style={{ background: '#FEF3C7', color: '#D97706' }}>
              <Clock size={18} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 8, background: '#F8FAFC', padding: '10px 12px', borderRadius: 8, border: '1px solid #E2E8F0' }}>
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#D97706', textTransform: 'uppercase' }}>
                Pending
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#B45309' }}>
                {stageStats.verification.pending}
              </div>
            </div>
            <div style={{ borderLeft: '1px solid #E2E8F0', paddingLeft: 10 }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#059669', textTransform: 'uppercase' }}>
                Complete
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#047857' }}>
                {stageStats.verification.completed}
              </div>
            </div>
          </div>
        </div>

        {/* Step 2: Payment Approval */}
        <div
          className="metric-card blue"
          onClick={() => navigate('/approval')}
          style={{ cursor: 'pointer' }}
        >
          <div className="metric-card-top">
            <span className="metric-title" style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1E293B' }}>
              Payment Approval
            </span>
            <div className="metric-icon-wrap" style={{ background: '#EFF6FF', color: '#2563EB' }}>
              <ShieldCheck size={18} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 8, background: '#F8FAFC', padding: '10px 12px', borderRadius: 8, border: '1px solid #E2E8F0' }}>
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#D97706', textTransform: 'uppercase' }}>
                Pending
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#B45309' }}>
                {stageStats.approval.pending}
              </div>
            </div>
            <div style={{ borderLeft: '1px solid #E2E8F0', paddingLeft: 10 }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#059669', textTransform: 'uppercase' }}>
                Complete
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#047857' }}>
                {stageStats.approval.completed}
              </div>
            </div>
          </div>
        </div>

        {/* Step 3: Payment Disbursal */}
        <div
          className="metric-card indigo"
          onClick={() => navigate('/payment')}
          style={{ cursor: 'pointer' }}
        >
          <div className="metric-card-top">
            <span className="metric-title" style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1E293B' }}>
              Payment Disbursal
            </span>
            <div className="metric-icon-wrap" style={{ background: '#EEF2FF', color: '#4F46E5' }}>
              <CreditCard size={18} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 8, background: '#F8FAFC', padding: '10px 12px', borderRadius: 8, border: '1px solid #E2E8F0' }}>
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#D97706', textTransform: 'uppercase' }}>
                Pending
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#B45309' }}>
                {stageStats.payment.pending}
              </div>
            </div>
            <div style={{ borderLeft: '1px solid #E2E8F0', paddingLeft: 10 }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#059669', textTransform: 'uppercase' }}>
                Complete
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#047857' }}>
                {stageStats.payment.completed}
              </div>
            </div>
          </div>
        </div>

        {/* Step 4: Tally Entry */}
        <div
          className="metric-card teal"
          onClick={() => navigate('/tally')}
          style={{ cursor: 'pointer' }}
        >
          <div className="metric-card-top">
            <span className="metric-title" style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1E293B' }}>
              Tally Entry
            </span>
            <div className="metric-icon-wrap" style={{ background: '#ECFDF5', color: '#059669' }}>
              <FileCheck2 size={18} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 8, background: '#F8FAFC', padding: '10px 12px', borderRadius: 8, border: '1px solid #E2E8F0' }}>
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#D97706', textTransform: 'uppercase' }}>
                Pending
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#B45309' }}>
                {stageStats.tally.pending}
              </div>
            </div>
            <div style={{ borderLeft: '1px solid #E2E8F0', paddingLeft: 10 }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#059669', textTransform: 'uppercase' }}>
                Complete
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#047857' }}>
                {stageStats.tally.completed}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Financial & Pipeline Rollup Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20, marginBottom: 28 }}>
        {/* Total Financials */}
        <div className="card" style={{ background: '#FFFFFF', borderColor: '#D1FAE5' }}>
          <div className="card-header">
            <div className="card-title">
              <div className="card-title-icon" style={{ background: '#ECFDF5', color: '#059669' }}>
                <IndianRupee size={18} />
              </div>
              <span>Financial Overview</span>
            </div>
            <span style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 600 }}>Real-time Total</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 10 }}>
            <div style={{ background: '#F0FDF4', padding: '16px', borderRadius: 12, border: '1px solid #BBF7D0' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#065F46', textTransform: 'uppercase' }}>
                Total Paid (Disbursed)
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#047857', marginTop: 4 }}>
                ₹{Number(counts.totalPaidAmount).toLocaleString('en-IN')}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#059669', marginTop: 4 }}>
                {counts.completed} tallies finalized
              </div>
            </div>

            <div style={{ background: '#FFFBEB', padding: '16px', borderRadius: 12, border: '1px solid #FDE68A' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#92400E', textTransform: 'uppercase' }}>
                Pending in Pipeline
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#D97706', marginTop: 4 }}>
                ₹{Number(counts.totalPendingAmount).toLocaleString('en-IN')}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#B45309', marginTop: 4 }}>
                {counts.total - counts.completed} active entries
              </div>
            </div>
          </div>
        </div>

        {/* 4-Stage Pipeline Progress */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <div className="card-title-icon">
                <Layers size={18} />
              </div>
              <span>Workflow Pipeline Distribution</span>
            </div>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#059669' }}>
              {counts.total} Total Orders
            </span>
          </div>

          <div style={{ marginTop: 12 }}>
            <div style={{ display: 'flex', height: 16, borderRadius: 8, overflow: 'hidden', background: '#F1F5F9', marginBottom: 14 }}>
              <div style={{ width: `${(counts.pendingVerification / (counts.total || 1)) * 100}%`, background: '#F59E0B' }} title="Pending Verification" />
              <div style={{ width: `${(counts.pendingApproval / (counts.total || 1)) * 100}%`, background: '#3B82F6' }} title="Pending Approval" />
              <div style={{ width: `${(counts.pendingPayment / (counts.total || 1)) * 100}%`, background: '#6366F1' }} title="Pending Payment" />
              <div style={{ width: `${(counts.pendingTally / (counts.total || 1)) * 100}%`, background: '#0D9488' }} title="Pending Tally" />
              <div style={{ width: `${(counts.completed / (counts.total || 1)) * 100}%`, background: '#10B981' }} title="Tally Complete" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8, fontSize: '0.78rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#F59E0B' }} />
                <span>Verification ({counts.pendingVerification})</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#3B82F6' }} />
                <span>Approval ({counts.pendingApproval})</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#6366F1' }} />
                <span>Payment ({counts.pendingPayment})</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#0D9488' }} />
                <span>Tally ({counts.pendingTally})</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#10B981' }} />
                <span>Done ({counts.completed})</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Work Entries Table */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <div className="card-title-icon">
              <Clock size={18} />
            </div>
            <span>Recent Work Entries & Workflow State</span>
          </div>

          <button onClick={() => navigate('/tracker')} className="btn btn-secondary btn-sm">
            <span>View All ({entries.length})</span>
            <ArrowRight size={14} />
          </button>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Work ID</th>
                <th>Date</th>
                <th>Shift</th>
                <th>Firm</th>
                <th>Incharge</th>
                <th>Work Type</th>
                <th>Labour (Count)</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {recentEntries.map(entry => (
                <tr key={entry.workId}>
                  <td>
                    <span className="work-id-badge">{entry.workId}</span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: '#0F172A', whiteSpace: 'nowrap' }}>{formatDate(entry.date)}</div>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.8rem', color: '#475569', fontWeight: 500, whiteSpace: 'nowrap' }}>{entry.shift || '-'}</span>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.8rem', color: '#0F172A', fontWeight: 600, whiteSpace: 'nowrap' }}>
                      {entry.firmName || '-'}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{entry.incharge}</div>
                  </td>
                  <td>
                    <div style={{ maxWidth: 220, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {entry.work}
                    </div>
                  </td>
                  <td>
                    <span style={{ fontWeight: 700, color: '#059669' }}>{entry.labourCount}</span> persons
                  </td>
                  <td>
                    <span style={{ fontWeight: 700, color: '#0F172A' }}>
                      ₹{Number(entry.totalAmount).toLocaleString('en-IN')}
                    </span>
                  </td>
                  <td>
                    <StatusBadge status={entry.status} />
                  </td>
                  <td>
                    <button
                      onClick={() => setSelectedWorkId(entry.workId)}
                      className="btn btn-outline-green btn-sm"
                    >
                      <span>Details</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedWorkId && (
        <WorkDetailModal
          workId={selectedWorkId}
          onClose={() => setSelectedWorkId(null)}
        />
      )}
    </div>
  );
}
