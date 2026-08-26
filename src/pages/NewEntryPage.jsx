import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PlusCircle,
  Trash2,
  Users,
  Briefcase,
  IndianRupee,
  CheckCircle2
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { INITIAL_MASTER_DATA } from '../utils/mockData';

const DEFAULT_SHIFTS = ['Shift 1', 'Shift 2', 'Shift 3', 'Shift 4'];
const DEFAULT_WORK_TYPES = [
  'Production',
  'Loading',
  'Daily Wags',
  'Grinding',
  'Housekeeping',
  'Mechanical',
  'Crusing',
  'Unloading'
];
const DEFAULT_FIRMS = ['PMMPL', 'RKL', 'Purab', 'Refrasynth', 'Refratech'];

export function NewEntryPage() {
  const navigate = useNavigate();
  const { masterData, createEntry, syncing, currentUser, hasFirmAccess } = useApp();

  const todayStr = new Date().toISOString().slice(0, 10);

  // Safe parsed lists from masterData
  const inchargesList = Array.isArray(masterData?.incharges) && masterData.incharges.length > 0
    ? masterData.incharges.map(String).filter(Boolean)
    : INITIAL_MASTER_DATA.incharges;

  const shiftsList = Array.isArray(masterData?.shifts) && masterData.shifts.length > 0
    ? masterData.shifts.map(String).filter(Boolean)
    : DEFAULT_SHIFTS;

  const firmsList = Array.isArray(masterData?.firmNames) && masterData.firmNames.length > 0
    ? masterData.firmNames.map(String).filter(f => Boolean(f) && !f.toLowerCase().startsWith('firm '))
    : DEFAULT_FIRMS;
  const rawActiveFirms = firmsList.length > 0 ? firmsList : DEFAULT_FIRMS;
  const permittedFirms = rawActiveFirms.filter(f => (hasFirmAccess ? hasFirmAccess(f) : true));
  const activeFirms = permittedFirms.length > 0 ? permittedFirms : rawActiveFirms;

  const rawWorks = Array.isArray(masterData?.workTypes) && masterData.workTypes.length > 0
    ? masterData.workTypes
    : DEFAULT_WORK_TYPES;
  const worksList = rawWorks
    .map(w => (typeof w === 'string' ? w : w?.name || ''))
    .filter(w => Boolean(w) && !w.toLowerCase().startsWith('shift'));
  const activeWorks = worksList.length > 0 ? worksList : DEFAULT_WORK_TYPES;

  const availableLabourers = Array.isArray(masterData?.labourers) && masterData.labourers.length > 0
    ? masterData.labourers.map(String).filter(Boolean)
    : INITIAL_MASTER_DATA.labourers;

  const [formData, setFormData] = useState({
    date: todayStr,
    shift: 'Shift 1',
    firmName: activeFirms[0] || 'PMMPL',
    incharge: inchargesList[0] || '',
    work: activeWorks[0] || 'Production',
    hours: 8,
    qty: 100,
    rate: 450,
    labourNames: ['']
  });

  const [errors, setErrors] = useState({});

  // Auto pre-fill first Incharge, Shift, Firm Name & Work Type when masterData loads
  useEffect(() => {
    setFormData(prev => {
      let updated = { ...prev };
      if (inchargesList.length > 0 && !prev.incharge) {
        updated.incharge = inchargesList[0];
      }
      if (shiftsList.length > 0 && (!prev.shift || !shiftsList.includes(prev.shift))) {
        updated.shift = shiftsList[0];
      }
      if (activeFirms.length > 0 && (!prev.firmName || prev.firmName.startsWith('Firm '))) {
        updated.firmName = activeFirms[0];
      }
      if (activeWorks.length > 0 && (!prev.work || prev.work.toLowerCase().startsWith('shift'))) {
        updated.work = activeWorks[0];
      }
      return updated;
    });
  }, [masterData]);

  // Handle Work Type selection and auto-suggest rate if matched
  const handleWorkTypeChange = e => {
    const enteredWork = e.target.value;
    const allWorks = Array.isArray(masterData?.workTypes) ? masterData.workTypes : [];
    const matched = allWorks.find(
      w => (typeof w === 'string' ? w : w?.name || '').toLowerCase() === enteredWork.trim().toLowerCase()
    );

    if (matched && typeof matched === 'object' && matched.defaultRate) {
      setFormData(prev => ({
        ...prev,
        work: enteredWork,
        rate: matched.defaultRate
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        work: enteredWork
      }));
    }
  };

  // Add Labour Slot
  const addLabourSlot = () => {
    setFormData(prev => ({
      ...prev,
      labourNames: [...prev.labourNames, '']
    }));
  };

  // Remove Labour Slot
  const removeLabourSlot = index => {
    if (formData.labourNames.length <= 1) return;
    setFormData(prev => ({
      ...prev,
      labourNames: prev.labourNames.filter((_, i) => i !== index)
    }));
  };

  // Handle Labour Name Select
  const handleLabourNameChange = (index, value) => {
    setFormData(prev => {
      const updated = [...prev.labourNames];
      updated[index] = value;
      return { ...prev, labourNames: updated };
    });
  };

  // Calculations
  const filledLabourNames = formData.labourNames.map(n => (n ? n.trim() : '')).filter(Boolean);
  const labourCount = formData.labourNames.length;
  const totalAmount = labourCount * (Number(formData.rate) || 0);

  // Validate
  const validateForm = () => {
    const newErrors = {};
    if (!formData.date) newErrors.date = 'Date is required';
    if (!formData.incharge) newErrors.incharge = 'Incharge is required';
    if (!formData.work) newErrors.work = 'Work type is required';
    if (!formData.rate || Number(formData.rate) <= 0) newErrors.rate = 'Valid rate is required';
    if (!formData.hours || Number(formData.hours) <= 0) newErrors.hours = 'Valid hours required';

    const unselectedIndices = [];
    formData.labourNames.forEach((name, idx) => {
      if (!name || !name.trim()) {
        unselectedIndices.push(idx + 1);
      }
    });

    if (formData.labourNames.length === 0) {
      newErrors.labourNames = 'At least 1 labourer must be assigned';
    } else if (unselectedIndices.length > 0) {
      newErrors.labourNames = `Please select Labour name for Slot #${unselectedIndices.join(', #')}`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle Submit
  const handleSubmit = async e => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      const validNames = formData.labourNames.map(n => (n ? n.trim() : '')).filter(Boolean);
      const count = validNames.length > 0 ? validNames.length : 1;
      const rate = Number(formData.rate) || 0;
      const computedTotal = count * rate;

      const payload = {
        date: formData.date,
        shift: formData.shift,
        firmName: formData.firmName,
        incharge: formData.incharge,
        work: formData.work,
        hours: Number(formData.hours),
        qty: Number(formData.qty) || 0,
        rate: rate,
        labourCount: count,
        totalAmount: computedTotal,
        labourNames: validNames
      };

      await createEntry(payload);
      navigate('/tracker');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0F172A' }}>
            New Work Entry
          </h1>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
          {/* Main Form Fields */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* General Info Card */}
            <div className="card">
              <div className="card-header">
                <div className="card-title">
                  <div className="card-title-icon">
                    <Briefcase size={18} />
                  </div>
                  <span>Shift & Supervisor Details</span>
                </div>
              </div>

              <div className="form-row-3">
                <div className="form-group">
                  <label className="form-label">
                    Work Date <span className="required">*</span>
                  </label>
                  <input
                    type="date"
                    className="form-input"
                    value={formData.date}
                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                  />
                  {errors.date && <div className="form-error">{errors.date}</div>}
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Shift <span className="required">*</span>
                  </label>
                  <select
                    className="form-select"
                    value={formData.shift}
                    onChange={e => setFormData({ ...formData, shift: e.target.value })}
                  >
                    {shiftsList.map(sh => (
                      <option key={sh} value={sh}>{sh}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Firm Name <span className="required">*</span>
                  </label>
                  <select
                    className="form-select"
                    value={formData.firmName}
                    onChange={e => setFormData({ ...formData, firmName: e.target.value })}
                  >
                    {activeFirms.map(firm => (
                      <option key={firm} value={firm}>{firm}</option>
                    ))}
                  </select>
                  {errors.firmName && <div className="form-error">{errors.firmName}</div>}
                </div>
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label">
                    Incharge / Supervisor <span className="required">*</span>
                  </label>
                  <select
                    className="form-select"
                    value={formData.incharge}
                    onChange={e => setFormData({ ...formData, incharge: e.target.value })}
                  >
                    <option value="">-- Select Incharge --</option>
                    {inchargesList.map(inc => (
                      <option key={inc} value={inc}>{inc}</option>
                    ))}
                  </select>
                  {errors.incharge && <div className="form-error">{errors.incharge}</div>}
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Work Type / Activity <span className="required">*</span>
                  </label>
                  <select
                    className="form-select"
                    value={formData.work}
                    onChange={handleWorkTypeChange}
                  >
                    <option value="">-- Select Work Activity --</option>
                    {activeWorks.map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                  {errors.work && <div className="form-error">{errors.work}</div>}
                </div>
              </div>

              <div className="form-row-3">
                <div className="form-group">
                  <label className="form-label">Hours Worked</label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    className="form-input"
                    value={formData.hours}
                    onChange={e => setFormData({ ...formData, hours: Number(e.target.value) })}
                  />
                  {errors.hours && <div className="form-error">{errors.hours}</div>}
                </div>

                <div className="form-group">
                  <label className="form-label">Quantity / Output</label>
                  <input
                    type="number"
                    min="0"
                    className="form-input"
                    value={formData.qty}
                    onChange={e => setFormData({ ...formData, qty: Number(e.target.value) })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Rate per Person (₹) <span className="required">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    className="form-input"
                    value={formData.rate}
                    onChange={e => setFormData({ ...formData, rate: Number(e.target.value) })}
                  />
                  {errors.rate && <div className="form-error">{errors.rate}</div>}
                </div>
              </div>
            </div>

            {/* Dynamic Labourers Card */}
            <div className="card">
              <div className="card-header">
                <div className="card-title">
                  <div className="card-title-icon" style={{ background: '#ECFDF5', color: '#059669' }}>
                    <Users size={18} />
                  </div>
                  <div>
                    <span>Deployed Labourers</span>
                    <span style={{ fontSize: '0.8rem', color: '#059669', marginLeft: 8, fontWeight: 700 }}>
                      ({labourCount} {labourCount === 1 ? 'Person' : 'Persons'})
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={addLabourSlot}
                  className="btn btn-outline-green btn-sm"
                >
                  <PlusCircle size={15} />
                  <span>Add Labour Slot</span>
                </button>
              </div>

              {errors.labourNames && (
                <div style={{ background: '#FEE2E2', border: '1px solid #FECACA', padding: '8px 12px', borderRadius: 8, color: '#991B1B', fontSize: '0.82rem', marginBottom: 12 }}>
                  {errors.labourNames}
                </div>
              )}

              <div className="labour-grid">
                {formData.labourNames.map((name, index) => (
                  <div key={index} className="labour-slot-card">
                    <div className="labour-slot-number">
                      {index + 1}
                    </div>

                    <select
                      className="labour-slot-select"
                      value={name}
                      onChange={e => handleLabourNameChange(index, e.target.value)}
                    >
                      <option value="">-- Choose Labourer --</option>
                      {availableLabourers.map(lab => (
                        <option key={lab} value={lab}>{lab}</option>
                      ))}
                    </select>

                    {formData.labourNames.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeLabourSlot(index)}
                        className="btn-remove-slot"
                        title="Remove Labourer"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Calculation Summary & Action Sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Live Calculation Card */}
            <div className="card" style={{ background: '#FFFFFF', borderColor: '#BBF7D0' }}>
              <div className="card-header">
                <div className="card-title">
                  <IndianRupee size={18} color="#059669" />
                  <span>Payment Computation</span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem' }}>
                  <span style={{ color: '#64748B' }}>Labour Count:</span>
                  <span style={{ fontWeight: 700, color: '#0F172A' }}>{labourCount} persons</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem' }}>
                  <span style={{ color: '#64748B' }}>Rate per Person:</span>
                  <span style={{ fontWeight: 700, color: '#0F172A' }}>₹{formData.rate || 0}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem' }}>
                  <span style={{ color: '#64748B' }}>Hours Logged:</span>
                  <span style={{ fontWeight: 700, color: '#0F172A' }}>{formData.hours} hrs</span>
                </div>

                <div style={{
                  borderTop: '2px dashed #E2E8F0',
                  paddingTop: 14,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline'
                }}>
                  <span style={{ fontWeight: 700, color: '#065F46', fontSize: '0.95rem' }}>
                    Total Payable:
                  </span>
                  <span style={{
                    fontSize: '1.8rem',
                    fontWeight: 800,
                    color: '#059669',
                    fontFamily: 'var(--font-display)'
                  }}>
                    ₹{totalAmount.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              <div style={{ marginTop: 24 }}>
                <button
                  type="submit"
                  disabled={syncing}
                  className="btn btn-primary btn-lg"
                  style={{ width: '100%', fontWeight: 700 }}
                >
                  <CheckCircle2 size={18} />
                  <span>{syncing ? 'Submitting Entry...' : 'Submit Work Entry'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
