import React, { useState, useEffect, useMemo } from 'react';
import {
  PlusCircle,
  Trash2,
  Users,
  Briefcase,
  CheckCircle2,
  Eye,
  Calendar,
  Clock,
  IndianRupee
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { INITIAL_MASTER_DATA } from '../../utils/mockData';
import { SearchableSelect } from './SearchableSelect';
import { isTonBasedWork, DEFAULT_WORK_TYPES_LIST } from '../../utils/workTypes';
import { sanitizeLabourersList } from '../../services/api';
import { Modal } from './Modal';

const DEFAULT_SHIFTS = ['Shift 1', 'Shift 2', 'Shift 3', 'Shift 4'];
const DEFAULT_FIRMS = ['PMMPL', 'RKL', 'Purab', 'Refrasynth', 'Refratech'];

const INPUT_CLS =
  'w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 focus:bg-white transition-all';

function Field({ label, required, hint, hintTone = 'muted', error, children }) {
  return (
    <div>
      <label className="flex items-center gap-1.5 whitespace-nowrap text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
        <span>
          {label}
          {required && <span className="text-rose-500 ml-0.5">*</span>}
        </span>
        {hint && (
          <span className={`normal-case tracking-normal font-semibold ${hintTone === 'green' ? 'text-indigo-600' : 'text-slate-400'}`}>
            ({hint})
          </span>
        )}
      </label>
      {children}
      {error && <div className="text-xs text-rose-600 font-medium mt-1">{error}</div>}
    </div>
  );
}

function SectionTitle({ n, icon: Icon, title, hint, inline = false }) {
  return (
    <div className={`flex items-center gap-3 ${inline ? '' : 'mb-4'}`}>
      <div className="w-7 h-7 rounded-full bg-[#DDF27B] text-[#1B2420] flex items-center justify-center shrink-0 text-xs font-extrabold">
        {n}
      </div>
      <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
        <Icon size={18} />
      </div>
      <div className="leading-tight">
        <div className="font-bold text-slate-900 text-sm">{title}</div>
        {hint && <div className="text-xs text-slate-500 mt-0.5">{hint}</div>}
      </div>
    </div>
  );
}

function SummaryTile({ label, value, tone }) {
  const tones = {
    mint: 'bg-indigo-100 border-indigo-200',
    lime: 'bg-amber-100 border-amber-200',
    plain: 'bg-slate-50 border-slate-200',
  };
  return (
    <div className={`rounded-2xl border px-4 py-3 ${tones[tone]}`}>
      <div className="text-[11px] font-semibold text-slate-600">{label}</div>
      <div className="text-xl font-extrabold text-slate-900 tracking-tight tabular-nums">{value}</div>
    </div>
  );
}

function buildInitialFormData(activeFirms, inchargesList, activeWorks) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const initialRate = 450;
  const initialCount = 1;
  return {
    date: todayStr,
    shift: 'Shift 1',
    firmName: activeFirms[0] || 'PMMPL',
    incharge: inchargesList[0] || '',
    work: activeWorks[0] || 'Production',
    hours: 8,
    qty: 100,
    rate: initialRate,
    totalAmount: initialRate * initialCount,
    workRemark: '',
    labourNames: [''],
    lastEditedField: 'total'
  };
}

export function NewEntryModal() {
  const { isNewEntryOpen, closeNewEntry, masterData, createEntry, hasFirmAccess, canPerformAction, refreshData } = useApp();
  const canCreate = canPerformAction('new_entry');

  // If modal is opened and masterData has no labourers, fetch fresh data from sheet
  useEffect(() => {
    if (isNewEntryOpen && (!masterData?.labourers || masterData.labourers.length === 0)) {
      if (typeof refreshData === 'function') {
        refreshData();
      }
    }
  }, [isNewEntryOpen, masterData?.labourers, refreshData]);

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
    : DEFAULT_WORK_TYPES_LIST;
  const worksList = rawWorks
    .map(w => (typeof w === 'string' ? w : w?.name || ''))
    .filter(w => Boolean(w) && !w.toLowerCase().startsWith('shift'));
  const activeWorks = worksList.length > 0 ? worksList : DEFAULT_WORK_TYPES_LIST;

  // Available Labourers fetched directly from Master Sheet Col B (sanitized, individual & deduplicated)
  const availableLabourers = useMemo(() => {
    const rawList = Array.isArray(masterData?.labourers) && masterData.labourers.length > 0
      ? masterData.labourers
      : INITIAL_MASTER_DATA.labourers;
    return sanitizeLabourersList(rawList);
  }, [masterData?.labourers]);

  const [formData, setFormData] = useState(() => buildInitialFormData(activeFirms, inchargesList, activeWorks));
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset the form fresh every time the modal is opened
  useEffect(() => {
    if (isNewEntryOpen) {
      setFormData(buildInitialFormData(activeFirms, inchargesList, activeWorks));
      setErrors({});
      setIsSubmitting(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNewEntryOpen]);

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
  const handleWorkTypeChange = val => {
    const enteredWork = typeof val === 'string' ? val : val?.target?.value || '';
    const allWorks = Array.isArray(masterData?.workTypes) ? masterData.workTypes : [];
    const matched = allWorks.find(
      w => (typeof w === 'string' ? w : w?.name || '').toLowerCase() === enteredWork.trim().toLowerCase()
    );

    if (matched && typeof matched === 'object' && matched.defaultRate) {
      setFormData(prev => {
        const count = prev.labourNames.length > 0 ? prev.labourNames.length : 1;
        const newRate = Number(matched.defaultRate);
        return {
          ...prev,
          work: enteredWork,
          rate: newRate,
          totalAmount: Math.round(newRate * count * 100) / 100,
          lastEditedField: 'rate'
        };
      });
    } else {
      setFormData(prev => ({
        ...prev,
        work: enteredWork
      }));
    }
  };

  // Handle Rate (Amount per person) change
  const handleRateChange = val => {
    const newRate = val === '' ? '' : (isNaN(Number(val)) ? val : Number(val));
    setFormData(prev => {
      const count = prev.labourNames.length > 0 ? prev.labourNames.length : 1;
      const computedTotal = val === '' ? '' : Math.round(Number(val) * count * 100) / 100;
      return {
        ...prev,
        rate: newRate,
        totalAmount: computedTotal,
        lastEditedField: 'rate'
      };
    });
  };

  // Handle Total Amount change -> Auto-calculates Amount per Person (₹/Person)
  const handleTotalAmountChange = val => {
    const newTotal = val === '' ? '' : (isNaN(Number(val)) ? val : Number(val));
    setFormData(prev => {
      const count = prev.labourNames.length > 0 ? prev.labourNames.length : 1;
      const computedRate = (val === '' || isNaN(Number(val))) ? '' : Math.round((Number(val) / count) * 100) / 100;
      return {
        ...prev,
        totalAmount: newTotal,
        rate: computedRate,
        lastEditedField: 'total'
      };
    });
  };

  // Add Labour Slot -> Auto-calculates Amount per Person based on Total Amount
  const addLabourSlot = () => {
    setFormData(prev => {
      const nextNames = [...prev.labourNames, ''];
      const count = nextNames.length;
      let nextRate = prev.rate;
      let nextTotal = prev.totalAmount;

      if (prev.totalAmount !== '' && Number(prev.totalAmount) > 0) {
        // Auto-recalculate Amount per person according to Total Amount
        nextRate = Math.round((Number(prev.totalAmount) / count) * 100) / 100;
      } else if (prev.rate !== '' && Number(prev.rate) > 0) {
        nextTotal = Math.round(Number(prev.rate) * count * 100) / 100;
      }

      return {
        ...prev,
        labourNames: nextNames,
        rate: nextRate,
        totalAmount: nextTotal
      };
    });
  };

  // Remove Labour Slot -> Auto-calculates Amount per Person based on Total Amount
  const removeLabourSlot = index => {
    if (formData.labourNames.length <= 1) return;
    setFormData(prev => {
      const nextNames = prev.labourNames.filter((_, i) => i !== index);
      const count = nextNames.length > 0 ? nextNames.length : 1;
      let nextRate = prev.rate;
      let nextTotal = prev.totalAmount;

      if (prev.totalAmount !== '' && Number(prev.totalAmount) > 0) {
        // Auto-recalculate Amount per person according to Total Amount
        nextRate = Math.round((Number(prev.totalAmount) / count) * 100) / 100;
      } else if (prev.rate !== '' && Number(prev.rate) > 0) {
        nextTotal = Math.round(Number(prev.rate) * count * 100) / 100;
      }

      return {
        ...prev,
        labourNames: nextNames,
        rate: nextRate,
        totalAmount: nextTotal
      };
    });
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
  const isTon = isTonBasedWork(formData.work);
  const labourCount = formData.labourNames.length;

  // Validate
  const validateForm = () => {
    const newErrors = {};
    if (!formData.date) newErrors.date = 'Date is required';
    if (!formData.incharge) newErrors.incharge = 'Incharge is required';
    if (!formData.work) newErrors.work = 'Work type is required';
    if (!formData.rate || Number(formData.rate) <= 0) newErrors.rate = 'Valid rate is required';
    if (!formData.totalAmount || Number(formData.totalAmount) <= 0) newErrors.totalAmount = 'Valid total amount is required';
    if (!formData.hours || Number(formData.hours) <= 0) newErrors.hours = 'Valid hours required';

    if (isTon && (!formData.qty || Number(formData.qty) <= 0)) {
      newErrors.qty = 'Quantity in Tons is required for ' + formData.work;
    }

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

    setIsSubmitting(true);
    try {
      const validNames = formData.labourNames.map(n => (n ? n.trim() : '')).filter(Boolean);
      const count = validNames.length > 0 ? validNames.length : 1;
      const rate = Number(formData.rate) || 0;
      const qty = Number(formData.qty) || 0;
      const totalAmount = Number(formData.totalAmount) > 0 ? Number(formData.totalAmount) : (count * rate);

      const payload = {
        date: formData.date,
        shift: formData.shift,
        firmName: formData.firmName,
        incharge: formData.incharge,
        work: formData.work,
        hours: Number(formData.hours),
        qty: qty,
        rate: rate,
        labourCount: count,
        totalAmount: totalAmount,
        workRemark: (formData.workRemark || '').trim(),
        labourNames: validNames
      };

      await createEntry(payload);
      setIsSubmitting(false);
      closeNewEntry();
    } catch (err) {
      console.error(err);
      setIsSubmitting(false);
    }
  };

  const fmtINR = n => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

  const footer = (
    <>
      <div className="mr-auto hidden sm:flex items-center gap-2 text-xs text-slate-500 font-medium">
        <span className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-full px-3 py-1.5 font-semibold">
          <Users size={13} />
          {labourCount} {labourCount === 1 ? 'Person' : 'Persons'}
        </span>
        <span className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-700 rounded-full px-3 py-1.5 font-semibold">
          Total {fmtINR(formData.totalAmount)}
        </span>
      </div>

      <button
        type="button"
        onClick={closeNewEntry}
        className="bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-sm font-semibold px-5 py-2.5 transition-colors"
      >
        Cancel
      </button>

      {canCreate ? (
        <button
          type="submit"
          form="new-entry-form"
          disabled={isSubmitting}
          className="btn-lime inline-flex items-center justify-center gap-2 font-bold text-sm rounded-xl shadow-sm px-6 py-2.5 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          <CheckCircle2 size={18} />
          <span>{isSubmitting ? 'Submitting Entry...' : 'Submit Work Entry'}</span>
        </button>
      ) : (
        <div className="inline-flex items-center gap-1.5 bg-indigo-50 border border-indigo-200 text-indigo-800 px-4 py-2.5 rounded-xl text-center font-bold text-sm">
          <Eye size={16} />
          <span>View-Only Access (Submission Disabled)</span>
        </div>
      )}
    </>
  );

  return (
    <Modal
      isOpen={isNewEntryOpen}
      onClose={closeNewEntry}
      title="New Work Entry"
      subtitle="Log a shift, the work done and assign labourers"
      icon={Briefcase}
      maxWidth="940px"
      footer={footer}
    >
      <form id="new-entry-form" onSubmit={handleSubmit}>
        <div className="flex flex-col gap-4">
          {/* Live summary */}
          <div className="grid grid-cols-3 gap-3">
            <SummaryTile label="Labourers" value={`${labourCount}`} tone="mint" />
            <SummaryTile label="Total Amount" value={fmtINR(formData.totalAmount)} tone="lime" />
            <SummaryTile label="Per Person" value={fmtINR(formData.rate)} tone="plain" />
          </div>

          {/* 1. Shift & supervisor */}
          <section className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5">
            <SectionTitle n={1} icon={Briefcase} title="Shift & Supervisor" hint="When, where and who is in charge" />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="Work Date" required error={errors.date}>
                <div className="relative">
                  <Calendar size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="date"
                    className={`${INPUT_CLS} pl-10`}
                    value={formData.date}
                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                  />
                </div>
              </Field>

              <Field label="Shift" required>
                <SearchableSelect
                  options={shiftsList}
                  value={formData.shift}
                  onChange={val => setFormData({ ...formData, shift: val })}
                  placeholder="-- Select Shift --"
                  searchPlaceholder="Search shift..."
                />
              </Field>

              <Field label="Firm Name" required error={errors.firmName}>
                <SearchableSelect
                  options={activeFirms}
                  value={formData.firmName}
                  onChange={val => setFormData({ ...formData, firmName: val })}
                  placeholder="-- Select Firm --"
                  searchPlaceholder="Search firm name..."
                  error={errors.firmName}
                />
              </Field>

              <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Incharge / Supervisor" required error={errors.incharge}>
                  <SearchableSelect
                    options={inchargesList}
                    value={formData.incharge}
                    onChange={val => setFormData({ ...formData, incharge: val })}
                    placeholder="-- Select Incharge --"
                    searchPlaceholder="Search supervisor..."
                    error={errors.incharge}
                  />
                </Field>

                <Field label="Work Type / Activity" required error={errors.work}>
                  <SearchableSelect
                    options={activeWorks}
                    value={formData.work}
                    onChange={handleWorkTypeChange}
                    placeholder="-- Select Work Activity --"
                    searchPlaceholder="Search work activity..."
                    error={errors.work}
                  />
                </Field>
              </div>
            </div>
          </section>

          {/* 2. Output & payment */}
          <section className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5">
            <SectionTitle n={2} icon={IndianRupee} title="Output & Payment" hint="Hours, quantity and amount for this work" />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Field label="Hours Worked" error={errors.hours}>
                <div className="relative">
                  <Clock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    className={`${INPUT_CLS} pl-10`}
                    value={formData.hours}
                    onChange={e => setFormData({ ...formData, hours: e.target.value === '' ? '' : Number(e.target.value) })}
                  />
                </div>
              </Field>

              <Field
                label="Quantity"
                required={isTon}
                hint={isTon ? 'Tons' : 'optional'}
                hintTone={isTon ? 'green' : 'muted'}
                error={errors.qty}
              >
                <div className="relative">
                  <input
                    type="number"
                    min={isTon ? '0.01' : '0'}
                    step="any"
                    placeholder={isTon ? 'Quantity in tons' : 'Quantity'}
                    className={`${INPUT_CLS} pr-12`}
                    value={formData.qty}
                    onChange={e => setFormData({ ...formData, qty: e.target.value === '' ? '' : Number(e.target.value) })}
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">
                    {isTon ? 'MT' : 'Qty'}
                  </span>
                </div>
              </Field>

              <Field label="Total Amount" required error={errors.totalAmount}>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-indigo-600 pointer-events-none">₹</span>
                  <input
                    type="number"
                    min="0.01"
                    step="any"
                    placeholder="Total amount"
                    className={`${INPUT_CLS} pl-8 font-semibold !bg-indigo-50/60 !border-indigo-200`}
                    value={formData.totalAmount}
                    onChange={e => handleTotalAmountChange(e.target.value)}
                  />
                </div>
              </Field>

              <Field label="Per Person" required error={errors.rate}>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-500 pointer-events-none">₹</span>
                  <input
                    type="number"
                    min="0.01"
                    step="any"
                    placeholder="Per person"
                    className={`${INPUT_CLS} pl-8 font-semibold`}
                    value={formData.rate}
                    onChange={e => handleRateChange(e.target.value)}
                  />
                </div>
              </Field>
            </div>

            <div className="mt-4">
              <Field label="Work Remark" hint="optional comment" hintTone="muted">
                <input
                  type="text"
                  className={INPUT_CLS}
                  placeholder="e.g. Extra maintenance work, kiln cleaning, overtime..."
                  value={formData.workRemark}
                  onChange={e => setFormData({ ...formData, workRemark: e.target.value })}
                />
              </Field>
            </div>
          </section>

          {/* 3. Labourers */}
          <section className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5">
            <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
              <SectionTitle
                n={3}
                icon={Users}
                title="Deployed Labourers"
                hint={`${labourCount} ${labourCount === 1 ? 'person' : 'persons'} assigned`}
                inline
              />

              <button
                type="button"
                onClick={addLabourSlot}
                className="btn-lime rounded-xl text-xs font-bold px-3.5 py-2 inline-flex items-center gap-1.5 transition-colors"
              >
                <PlusCircle size={15} />
                <span>Add Labour Slot</span>
              </button>
            </div>

            {errors.labourNames && (
              <div className="bg-rose-50 border border-rose-200 px-3 py-2 rounded-xl text-rose-800 text-sm mb-3">
                {errors.labourNames}
              </div>
            )}

            <div className="bg-slate-50 border border-dashed border-slate-300 rounded-2xl p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {formData.labourNames.map((name, index) => (
                  <div
                    key={index}
                    className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 flex items-center gap-2.5 shadow-2xs hover:border-indigo-300 transition-colors"
                  >
                    <div className="w-7 h-7 rounded-full bg-[#DDF27B] text-[#1B2420] font-bold text-xs flex items-center justify-center shrink-0">
                      {index + 1}
                    </div>

                    <SearchableSelect
                      compact={true}
                      options={availableLabourers}
                      value={name}
                      onChange={val => handleLabourNameChange(index, val)}
                      placeholder="-- Choose Labourer --"
                      searchPlaceholder="Search labourer..."
                      allowCustom={true}
                      className="flex-1"
                    />

                    {formData.labourNames.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeLabourSlot(index)}
                        className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg p-1.5 transition-colors shrink-0"
                        title="Remove Labourer"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </form>
    </Modal>
  );
}
