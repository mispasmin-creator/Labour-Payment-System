import React, { useState, useEffect, useMemo } from 'react';
import {
  Pencil,
  PlusCircle,
  Trash2,
  Users,
  Briefcase,
  CheckCircle2,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { INITIAL_MASTER_DATA } from '../../utils/mockData';
import { SearchableSelect } from './SearchableSelect';
import { isTonBasedWork, DEFAULT_WORK_TYPES_LIST } from '../../utils/workTypes';
import { sanitizeLabourersList } from '../../services/api';
import { Modal } from './Modal';

const DEFAULT_SHIFTS = ['Shift 1', 'Shift 2', 'Shift 3', 'Shift 4'];
const DEFAULT_FIRMS = ['PMMPL', 'RKL', 'Purab', 'Refrasynth', 'Refratech'];
const STATUS_OPTIONS = [
  'Pending Verification',
  'Verified (Pending Approval)',
  'Approved (Pending Payment)',
  'Paid (Pending Tally)',
  'Tally Complete',
  'Cancelled'
];

export function EditEntryModal() {
  const { editingEntry, closeEditEntry, masterData, updateEntry, hasFirmAccess } = useApp();

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

  const availableLabourers = useMemo(() => {
    const rawList = Array.isArray(masterData?.labourers) && masterData.labourers.length > 0
      ? masterData.labourers
      : INITIAL_MASTER_DATA.labourers;
    return sanitizeLabourersList(rawList);
  }, [masterData?.labourers]);

  const [formData, setFormData] = useState(null);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync state whenever editingEntry changes
  useEffect(() => {
    if (editingEntry) {
      let labourNames = [];
      if (Array.isArray(editingEntry.labourNames) && editingEntry.labourNames.length > 0) {
        labourNames = [...editingEntry.labourNames];
      } else if (typeof editingEntry.labourNames === 'string' && editingEntry.labourNames.trim()) {
        labourNames = editingEntry.labourNames.split(/[,;\n]+/).map(s => s.trim()).filter(Boolean);
      } else {
        // Collect dynamic labour props
        Object.keys(editingEntry).forEach(k => {
          const lower = k.toLowerCase();
          if (lower.startsWith('labour') && lower !== 'labourcount' && lower !== 'labournames') {
            if (editingEntry[k] && typeof editingEntry[k] === 'string' && editingEntry[k].trim()) {
              labourNames.push(editingEntry[k].trim());
            }
          }
        });
      }

      if (labourNames.length === 0) {
        const count = Number(editingEntry.labourCount) || 1;
        labourNames = new Array(count).fill('');
      }

      setFormData({
        workId: editingEntry.workId,
        date: editingEntry.date || new Date().toISOString().slice(0, 10),
        shift: editingEntry.shift || shiftsList[0] || 'Shift 1',
        firmName: editingEntry.firmName || editingEntry.firm || activeFirms[0] || 'PMMPL',
        incharge: editingEntry.incharge || inchargesList[0] || '',
        work: editingEntry.work || activeWorks[0] || 'Production',
        hours: editingEntry.hours !== undefined ? editingEntry.hours : 8,
        qty: editingEntry.qty !== undefined ? editingEntry.qty : 100,
        rate: editingEntry.rate !== undefined ? editingEntry.rate : 450,
        totalAmount: editingEntry.totalAmount !== undefined ? editingEntry.totalAmount : 450,
        status: editingEntry.status || 'Pending Verification',
        workRemark: editingEntry.workRemark || '',
        labourNames: labourNames.length > 0 ? labourNames : ['']
      });
      setErrors({});
      setIsSubmitting(false);
    } else {
      setFormData(null);
    }
  }, [editingEntry]);

  if (!editingEntry || !formData) return null;

  // Work type change
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
          totalAmount: Math.round(newRate * count * 100) / 100
        };
      });
    } else {
      setFormData(prev => ({
        ...prev,
        work: enteredWork
      }));
    }
  };

  // Rate (₹/Person) change -> Updates Total Amount
  const handleRateChange = val => {
    const newRate = val === '' ? '' : (isNaN(Number(val)) ? val : Number(val));
    setFormData(prev => {
      const count = prev.labourNames.length > 0 ? prev.labourNames.length : 1;
      const computedTotal = val === '' ? '' : Math.round(Number(val) * count * 100) / 100;
      return {
        ...prev,
        rate: newRate,
        totalAmount: computedTotal
      };
    });
  };

  // Total Amount change -> Updates Rate per Person
  const handleTotalAmountChange = val => {
    const newTotal = val === '' ? '' : (isNaN(Number(val)) ? val : Number(val));
    setFormData(prev => {
      const count = prev.labourNames.length > 0 ? prev.labourNames.length : 1;
      const computedRate = (val === '' || isNaN(Number(val))) ? '' : Math.round((Number(val) / count) * 100) / 100;
      return {
        ...prev,
        totalAmount: newTotal,
        rate: computedRate
      };
    });
  };

  // Add Labour slot
  const addLabourSlot = () => {
    setFormData(prev => {
      const nextNames = [...prev.labourNames, ''];
      const count = nextNames.length;
      let nextRate = prev.rate;
      let nextTotal = prev.totalAmount;

      if (prev.totalAmount !== '' && Number(prev.totalAmount) > 0) {
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

  // Remove Labour slot
  const removeLabourSlot = index => {
    if (formData.labourNames.length <= 1) return;
    setFormData(prev => {
      const nextNames = prev.labourNames.filter((_, i) => i !== index);
      const count = nextNames.length;
      let nextRate = prev.rate;
      let nextTotal = prev.totalAmount;

      if (prev.totalAmount !== '' && Number(prev.totalAmount) > 0) {
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

  const updateLabourName = (index, value) => {
    setFormData(prev => {
      const nextNames = [...prev.labourNames];
      nextNames[index] = value;
      return { ...prev, labourNames: nextNames };
    });
  };

  // Form Validation
  const validate = () => {
    const errs = {};
    if (!formData.date) errs.date = 'Date is required';
    if (!formData.incharge) errs.incharge = 'Supervisor / Incharge is required';
    if (!formData.work) errs.work = 'Work Activity is required';
    if (formData.hours === '' || isNaN(formData.hours) || Number(formData.hours) < 0) {
      errs.hours = 'Valid hours required';
    }
    if (formData.qty === '' || isNaN(formData.qty) || Number(formData.qty) < 0) {
      errs.qty = 'Valid quantity required';
    }
    if (formData.totalAmount === '' || isNaN(formData.totalAmount) || Number(formData.totalAmount) < 0) {
      errs.totalAmount = 'Valid Total Amount required';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const validLabourNames = formData.labourNames.map(n => String(n || '').trim()).filter(Boolean);
      const labourCount = validLabourNames.length > 0 ? validLabourNames.length : formData.labourNames.length;
      const rate = Number(formData.rate) || 0;
      const totalAmount = Number(formData.totalAmount) > 0 ? Number(formData.totalAmount) : labourCount * rate;

      await updateEntry({
        ...editingEntry,
        ...formData,
        labourCount,
        labourNames: validLabourNames,
        rate,
        totalAmount,
        hours: Number(formData.hours) || 0,
        qty: Number(formData.qty) || 0
      });
    } catch (err) {
      console.error('Failed to update entry:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={Boolean(editingEntry)}
      onClose={closeEditEntry}
      title={`Edit Work Order (Admin): ${formData.workId}`}
      maxWidth="820px"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Banner */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Pencil size={15} className="text-amber-600 shrink-0" />
            <span>
              <strong>Admin Mode:</strong> Any modifications made here will update the entry and synchronize to Google Sheets.
            </span>
          </div>
          <span className="font-mono font-bold bg-white border border-amber-300 px-2 py-0.5 rounded text-amber-900">
            {formData.workId}
          </span>
        </div>

        {/* Row 1: Date, Shift, Firm */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Date *
            </label>
            <input
              type="date"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
              value={formData.date}
              onChange={e => setFormData(prev => ({ ...prev, date: e.target.value }))}
            />
            {errors.date && <p className="text-rose-500 text-xs mt-1">{errors.date}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Shift *
            </label>
            <select
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
              value={formData.shift}
              onChange={e => setFormData(prev => ({ ...prev, shift: e.target.value }))}
            >
              {shiftsList.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Firm *
            </label>
            <select
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
              value={formData.firmName}
              onChange={e => setFormData(prev => ({ ...prev, firmName: e.target.value }))}
            >
              {activeFirms.map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 2: Incharge, Work Activity, Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Supervisor / Incharge *
            </label>
            <SearchableSelect
              options={inchargesList}
              value={formData.incharge}
              onChange={val => setFormData(prev => ({ ...prev, incharge: val }))}
              placeholder="Select supervisor..."
            />
            {errors.incharge && <p className="text-rose-500 text-xs mt-1">{errors.incharge}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Work Activity *
            </label>
            <SearchableSelect
              options={activeWorks}
              value={formData.work}
              onChange={handleWorkTypeChange}
              placeholder="Select work activity..."
            />
            {errors.work && <p className="text-rose-500 text-xs mt-1">{errors.work}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Current Status *
            </label>
            <select
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
              value={formData.status}
              onChange={e => setFormData(prev => ({ ...prev, status: e.target.value }))}
            >
              {STATUS_OPTIONS.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 3: Hours, Qty, Rate per Person, Total Amount */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-lg border border-slate-200">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Hours
            </label>
            <input
              type="number"
              step="any"
              min="0"
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={formData.hours}
              onChange={e => setFormData(prev => ({ ...prev, hours: e.target.value }))}
            />
            {errors.hours && <p className="text-rose-500 text-xs mt-1">{errors.hours}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Qty / Output ({isTonBasedWork(formData.work) ? 'Tons' : 'Units'})
            </label>
            <input
              type="number"
              step="any"
              min="0"
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={formData.qty}
              onChange={e => setFormData(prev => ({ ...prev, qty: e.target.value }))}
            />
            {errors.qty && <p className="text-rose-500 text-xs mt-1">{errors.qty}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Rate (₹/Person)
            </label>
            <input
              type="number"
              step="any"
              min="0"
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={formData.rate}
              onChange={e => handleRateChange(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-emerald-800 uppercase tracking-wider mb-1">
              Total Amount (₹) *
            </label>
            <input
              type="number"
              step="any"
              min="0"
              className="w-full px-3 py-2 bg-emerald-50 border border-emerald-300 rounded-lg text-emerald-900 text-base font-extrabold focus:outline-none focus:ring-2 focus:ring-emerald-500"
              value={formData.totalAmount}
              onChange={e => handleTotalAmountChange(e.target.value)}
            />
            {errors.totalAmount && <p className="text-rose-500 text-xs mt-1">{errors.totalAmount}</p>}
          </div>
        </div>

        {/* Row 4: Work Remark */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
            Work Remark
          </label>
          <input
            type="text"
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
            placeholder="e.g. QTY-58MT (NIGHT SHIFT), SAAF SAFAI KIYE..."
            value={formData.workRemark}
            onChange={e => setFormData(prev => ({ ...prev, workRemark: e.target.value }))}
          />
        </div>

        {/* Row 5: Labour Names Slots */}
        <div className="border border-slate-200 rounded-lg p-3.5 bg-white">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-indigo-600" />
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Assigned Labourers ({formData.labourNames.length} Persons)
              </span>
            </div>
            <button
              type="button"
              onClick={addLabourSlot}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2.5 py-1 rounded-md transition-colors"
            >
              <PlusCircle size={14} />
              <span>Add Person</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-[220px] overflow-y-auto p-1">
            {formData.labourNames.map((name, i) => (
              <div key={i} className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-md p-1.5">
                <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold flex items-center justify-center shrink-0">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <SearchableSelect
                    options={availableLabourers}
                    value={name}
                    onChange={val => updateLabourName(i, val)}
                    placeholder={`Labourer ${i + 1}`}
                  />
                </div>
                {formData.labourNames.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeLabourSlot(i)}
                    className="p-1 text-slate-400 hover:text-rose-600 transition-colors shrink-0"
                    title="Remove labourer"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
          <button
            type="button"
            onClick={closeEditEntry}
            disabled={isSubmitting}
            className="px-4 py-2 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg text-sm font-semibold transition-colors"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-lg shadow-sm transition-all disabled:opacity-60"
          >
            {isSubmitting ? (
              <>
                <RefreshCw size={15} className="animate-spin" />
                <span>Saving Changes...</span>
              </>
            ) : (
              <>
                <CheckCircle2 size={16} />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
