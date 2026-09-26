import React, { useState, useEffect, useMemo } from 'react';
import {
  PlusCircle,
  Trash2,
  Users,
  Briefcase,
  CheckCircle2,
  Eye
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { INITIAL_MASTER_DATA } from '../../utils/mockData';
import { SearchableSelect } from './SearchableSelect';
import { isTonBasedWork, DEFAULT_WORK_TYPES_LIST } from '../../utils/workTypes';
import { sanitizeLabourersList } from '../../services/api';
import { Modal } from './Modal';

const DEFAULT_SHIFTS = ['Shift 1', 'Shift 2', 'Shift 3', 'Shift 4'];
const DEFAULT_FIRMS = ['PMMPL', 'RKL', 'Purab', 'Refrasynth', 'Refratech'];

function buildInitialFormData(activeFirms, inchargesList, activeWorks) {
  const todayStr = new Date().toISOString().slice(0, 10);
  return {
    date: todayStr,
    shift: 'Shift 1',
    firmName: activeFirms[0] || 'PMMPL',
    incharge: inchargesList[0] || '',
    work: activeWorks[0] || 'Production',
    hours: 8,
    qty: 100,
    rate: 450,
    workRemark: '',
    labourNames: ['']
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
  const isTon = isTonBasedWork(formData.work);
  const labourCount = formData.labourNames.length;

  // Validate
  const validateForm = () => {
    const newErrors = {};
    if (!formData.date) newErrors.date = 'Date is required';
    if (!formData.incharge) newErrors.incharge = 'Incharge is required';
    if (!formData.work) newErrors.work = 'Work type is required';
    if (!formData.rate || Number(formData.rate) <= 0) newErrors.rate = 'Valid rate is required';
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
      // Amount per person x Labour count (same as sheet Col K x Col H)
      const computedTotal = count * rate;

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
        totalAmount: computedTotal,
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

  const footer = (
    <>
      <button
        type="button"
        onClick={closeNewEntry}
        className="bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg text-sm font-semibold px-5 py-2.5 transition-colors"
      >
        Cancel
      </button>

      {canCreate ? (
        <button
          type="submit"
          form="new-entry-form"
          disabled={isSubmitting}
          className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-lg shadow-sm px-6 py-2.5 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          <CheckCircle2 size={18} />
          <span>{isSubmitting ? 'Submitting Entry...' : 'Submit Work Entry'}</span>
        </button>
      ) : (
        <div className="inline-flex items-center gap-1.5 bg-indigo-50 border border-indigo-200 text-indigo-800 px-4 py-2.5 rounded-lg text-center font-bold text-sm">
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
      subtitle="Log a new shift, work activity and assign labourers"
      icon={Briefcase}
      maxWidth="900px"
      footer={footer}
    >
      <form id="new-entry-form" onSubmit={handleSubmit}>
        <div className="flex flex-col gap-5">
            {/* General Info Card */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0 text-xs font-bold">
                  1
                </div>
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <Briefcase size={18} />
                </div>
                <span className="font-bold text-slate-800 text-sm">Shift & Supervisor Details</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Work Date <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="date"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white transition-all"
                    value={formData.date}
                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                  />
                  {errors.date && <div className="text-xs text-rose-600 font-medium mt-1">{errors.date}</div>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Shift <span className="text-rose-600">*</span>
                  </label>
                  <SearchableSelect
                    options={shiftsList}
                    value={formData.shift}
                    onChange={val => setFormData({ ...formData, shift: val })}
                    placeholder="-- Select Shift --"
                    searchPlaceholder="Search shift..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Firm Name <span className="text-rose-600">*</span>
                  </label>
                  <SearchableSelect
                    options={activeFirms}
                    value={formData.firmName}
                    onChange={val => setFormData({ ...formData, firmName: val })}
                    placeholder="-- Select Firm --"
                    searchPlaceholder="Search firm name..."
                    error={errors.firmName}
                  />
                  {errors.firmName && <div className="text-xs text-rose-600 font-medium mt-1">{errors.firmName}</div>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Incharge / Supervisor <span className="text-rose-600">*</span>
                  </label>
                  <SearchableSelect
                    options={inchargesList}
                    value={formData.incharge}
                    onChange={val => setFormData({ ...formData, incharge: val })}
                    placeholder="-- Select Incharge --"
                    searchPlaceholder="Search supervisor..."
                    error={errors.incharge}
                  />
                  {errors.incharge && <div className="text-xs text-rose-600 font-medium mt-1">{errors.incharge}</div>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Work Type / Activity <span className="text-rose-600">*</span>
                  </label>
                  <SearchableSelect
                    options={activeWorks}
                    value={formData.work}
                    onChange={handleWorkTypeChange}
                    placeholder="-- Select Work Activity --"
                    searchPlaceholder="Search work activity..."
                    error={errors.work}
                  />
                  {errors.work && <div className="text-xs text-rose-600 font-medium mt-1">{errors.work}</div>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Hours Worked
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white transition-all"
                    value={formData.hours}
                    onChange={e => setFormData({ ...formData, hours: e.target.value === '' ? '' : Number(e.target.value) })}
                  />
                  {errors.hours && <div className="text-xs text-rose-600 font-medium mt-1">{errors.hours}</div>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Quantity / Output {isTon && <span className="text-rose-600">*</span>}
                    <span className={`ml-1.5 font-semibold normal-case ${isTon ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {isTon ? '(MT / Tons)' : '(optional)'}
                    </span>
                  </label>
                  <input
                    type="number"
                    min={isTon ? "0.01" : "0"}
                    step="any"
                    placeholder={isTon ? "Enter quantity in tons..." : "Enter quantity..."}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white transition-all"
                    value={formData.qty}
                    onChange={e => setFormData({ ...formData, qty: e.target.value === '' ? '' : Number(e.target.value) })}
                  />
                  {errors.qty && <div className="text-xs text-rose-600 font-medium mt-1">{errors.qty}</div>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Amount per Person <span className="text-rose-600">*</span>
                    <span className="ml-1.5 font-semibold normal-case text-indigo-600">(₹ / Person)</span>
                  </label>
                  <input
                    type="number"
                    min="0.01"
                    step="any"
                    placeholder="Amount per person (₹)..."
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white transition-all"
                    value={formData.rate}
                    onChange={e => setFormData({ ...formData, rate: e.target.value === '' ? '' : Number(e.target.value) })}
                  />
                  {errors.rate && <div className="text-xs text-rose-600 font-medium mt-1">{errors.rate}</div>}
                </div>
              </div>

              {/* Work Remark Input Field */}
              <div className="mt-4">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Work Remark
                  <span className="ml-1.5 font-normal normal-case text-slate-400">(optional comment/description)</span>
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white transition-all"
                  placeholder="Enter remark (e.g. Extra maintenance work, kiln cleaning, overtime, etc.)..."
                  value={formData.workRemark}
                  onChange={e => setFormData({ ...formData, workRemark: e.target.value })}
                />
              </div>
            </div>

            {/* Dynamic Labourers Card */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-6">
              <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0 text-xs font-bold">
                    2
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <Users size={18} />
                  </div>
                  <div>
                    <span className="font-bold text-slate-800 text-sm">Deployed Labourers</span>
                    <span className="text-xs text-emerald-600 font-bold ml-2">
                      ({labourCount} {labourCount === 1 ? 'Person' : 'Persons'})
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={addLabourSlot}
                  className="bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg text-xs font-semibold px-3 py-1.5 inline-flex items-center gap-1.5"
                >
                  <PlusCircle size={15} />
                  <span>Add Labour Slot</span>
                </button>
              </div>

              {errors.labourNames && (
                <div className="bg-rose-50 border border-rose-200 px-3 py-2 rounded-lg text-rose-800 text-sm mb-3">
                  {errors.labourNames}
                </div>
              )}

              <div className="bg-indigo-50/40 border border-dashed border-indigo-200 rounded-xl p-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {formData.labourNames.map((name, index) => (
                    <div
                      key={index}
                      className="bg-white border border-slate-200 rounded-lg px-3.5 py-2.5 flex items-center gap-2.5 shadow-2xs hover:border-indigo-300 transition-colors"
                    >
                      <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0">
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
                          className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md p-1 transition-colors shrink-0"
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
          </div>
      </form>
    </Modal>
  );
}


