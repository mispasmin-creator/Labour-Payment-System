import React, { useState } from 'react';
import {
  Database,
  Users,
  UserCheck,
  Briefcase,
  PlusCircle,
  Trash2,
  Save,
  Building2,
  Layers
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { isTonBasedWork } from '../utils/workTypes';

export function MasterDataPage() {
  const { masterData, updateMaster, syncing } = useApp();
  const [activeTab, setActiveTab] = useState('incharges'); // 'incharges' | 'labourers' | 'shifts' | 'workTypes' | 'firmNames'

  const [incharges, setIncharges] = useState(masterData.incharges || []);
  const [labourers, setLabourers] = useState(masterData.labourers || []);
  const [shifts, setShifts] = useState(
    masterData.shifts && masterData.shifts.length > 0
      ? masterData.shifts
      : ['Shift 1', 'Shift 2', 'Shift 3', 'Shift 4']
  );
  const [workTypes, setWorkTypes] = useState(
    (masterData.workTypes || []).map(w =>
      typeof w === 'string' ? { name: w, defaultRate: 450 } : w
    )
  );
  const [firmNames, setFirmNames] = useState(
    masterData.firmNames && masterData.firmNames.length > 0
      ? masterData.firmNames
      : ['Firm 1', 'Firm 2', 'Firm 3', 'Firm 4']
  );

  // New item inputs
  const [newIncharge, setNewIncharge] = useState('');
  const [newLabourer, setNewLabourer] = useState('');
  const [newShift, setNewShift] = useState('');
  const [newFirmName, setNewFirmName] = useState('');
  const [newWorkName, setNewWorkName] = useState('');
  const [newWorkRate, setNewWorkRate] = useState(450);

  // Save changes
  const handleSaveAll = async () => {
    await updateMaster({
      incharges: incharges.filter(Boolean),
      labourers: labourers.filter(Boolean),
      shifts: shifts.filter(Boolean),
      workTypes: workTypes.filter(w => w.name && w.name.trim()),
      firmNames: firmNames.filter(Boolean)
    });
  };

  // Add handlers
  const handleAddIncharge = e => {
    e.preventDefault();
    if (!newIncharge.trim()) return;
    if (incharges.includes(newIncharge.trim())) return;
    setIncharges([...incharges, newIncharge.trim()]);
    setNewIncharge('');
  };

  const handleAddLabourer = e => {
    e.preventDefault();
    if (!newLabourer.trim()) return;
    if (labourers.includes(newLabourer.trim())) return;
    setLabourers([...labourers, newLabourer.trim()]);
    setNewLabourer('');
  };

  const handleAddShift = e => {
    e.preventDefault();
    if (!newShift.trim()) return;
    if (shifts.includes(newShift.trim())) return;
    setShifts([...shifts, newShift.trim()]);
    setNewShift('');
  };

  const handleAddFirmName = e => {
    e.preventDefault();
    if (!newFirmName.trim()) return;
    if (firmNames.includes(newFirmName.trim())) return;
    setFirmNames([...firmNames, newFirmName.trim()]);
    setNewFirmName('');
  };

  const handleAddWorkType = e => {
    e.preventDefault();
    if (!newWorkName.trim()) return;
    setWorkTypes([...workTypes, { name: newWorkName.trim(), defaultRate: Number(newWorkRate) || 450 }]);
    setNewWorkName('');
    setNewWorkRate(450);
  };

  const removeIncharge = idx => {
    setIncharges(incharges.filter((_, i) => i !== idx));
  };

  const removeLabourer = idx => {
    setLabourers(labourers.filter((_, i) => i !== idx));
  };

  const removeShift = idx => {
    setShifts(shifts.filter((_, i) => i !== idx));
  };

  const removeFirmName = idx => {
    setFirmNames(firmNames.filter((_, i) => i !== idx));
  };

  const removeWorkType = idx => {
    setWorkTypes(workTypes.filter((_, i) => i !== idx));
  };

  const tabButtonClass = tab =>
    `inline-flex items-center gap-1.5 rounded-lg text-sm font-semibold px-4 py-2 transition-colors ${
      activeTab === tab
        ? 'bg-indigo-600 text-white shadow-sm'
        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
    }`;

  const removeBtnClass =
    'w-8 h-8 rounded-lg flex items-center justify-center text-rose-600 bg-rose-50 hover:bg-rose-100 transition-colors shrink-0';

  const listItemClass =
    'flex items-center justify-between bg-slate-50 px-3.5 py-2.5 rounded-lg border border-slate-200';

  const inputClass =
    'w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white transition-all';

  const cardHeaderClass = (Icon, label) => (
    <div className="flex items-center gap-2 pb-4 mb-4 border-b border-slate-100">
      <Icon size={18} className="text-indigo-600" />
      <span className="font-bold text-slate-800 text-sm">{label}</span>
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-slate-50 overflow-y-auto">
      <div className="max-w-[1000px] w-full mx-auto space-y-4">
        {/* Title */}
        <div className="flex items-center justify-between flex-wrap gap-3.5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Database size={20} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800">Master Data Management</h1>
              <p className="text-xs text-slate-500">Manage supervisors, labour pool, shifts, firms & work rates</p>
            </div>
          </div>

          <button
            onClick={handleSaveAll}
            disabled={syncing}
            className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-lg shadow-sm px-4 py-2 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Save size={16} />
            <span>{syncing ? 'Saving to Sheets...' : 'Save Master Changes'}</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 flex-wrap border-b border-slate-200 pb-2">
          <button onClick={() => setActiveTab('incharges')} className={tabButtonClass('incharges')}>
            <UserCheck size={16} />
            <span>Supervisors ({incharges.length})</span>
          </button>

          <button onClick={() => setActiveTab('labourers')} className={tabButtonClass('labourers')}>
            <Users size={16} />
            <span>Labour Pool ({labourers.length})</span>
          </button>

          <button onClick={() => setActiveTab('shifts')} className={tabButtonClass('shifts')}>
            <Layers size={16} />
            <span>Shifts ({shifts.length})</span>
          </button>

          <button onClick={() => setActiveTab('firmNames')} className={tabButtonClass('firmNames')}>
            <Building2 size={16} />
            <span>Firm Names ({firmNames.length})</span>
          </button>

          <button onClick={() => setActiveTab('workTypes')} className={tabButtonClass('workTypes')}>
            <Briefcase size={16} />
            <span>Work Types & Rates ({workTypes.length})</span>
          </button>
        </div>

        {/* TAB 1: INCHARGES */}
        {activeTab === 'incharges' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-6">
            {cardHeaderClass(UserCheck, 'Incharge Supervisors')}

            <form onSubmit={handleAddIncharge} className="flex gap-3 mb-5">
              <input
                type="text"
                className={inputClass}
                placeholder="Supervisor Name"
                value={newIncharge}
                onChange={e => setNewIncharge(e.target.value)}
              />
              <button type="submit" className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-lg shadow-sm px-4 py-2 transition-colors shrink-0">
                <PlusCircle size={16} />
                <span>Add</span>
              </button>
            </form>

            <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-2.5">
              {incharges.map((item, idx) => (
                <div key={idx} className={listItemClass}>
                  <span className="font-semibold text-slate-800 text-sm">{item}</span>
                  <button type="button" onClick={() => removeIncharge(idx)} className={removeBtnClass} title="Delete">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: LABOUR POOL */}
        {activeTab === 'labourers' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-6">
            {cardHeaderClass(Users, 'Labour Pool Master')}

            <form onSubmit={handleAddLabourer} className="flex gap-3 mb-5">
              <input
                type="text"
                className={inputClass}
                placeholder="Labourer Name"
                value={newLabourer}
                onChange={e => setNewLabourer(e.target.value)}
              />
              <button type="submit" className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-lg shadow-sm px-4 py-2 transition-colors shrink-0">
                <PlusCircle size={16} />
                <span>Add Labourer</span>
              </button>
            </form>

            <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-2.5">
              {labourers.map((item, idx) => (
                <div key={idx} className={listItemClass}>
                  <span className="font-semibold text-slate-800 text-sm">{item}</span>
                  <button type="button" onClick={() => removeLabourer(idx)} className={removeBtnClass} title="Delete">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: SHIFTS */}
        {activeTab === 'shifts' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-6">
            {cardHeaderClass(Layers, 'Shift Timing Master')}

            <form onSubmit={handleAddShift} className="flex gap-3 mb-5">
              <input
                type="text"
                className={inputClass}
                placeholder="Shift Name (e.g. Shift 1, Shift 2)"
                value={newShift}
                onChange={e => setNewShift(e.target.value)}
              />
              <button type="submit" className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-lg shadow-sm px-4 py-2 transition-colors shrink-0">
                <PlusCircle size={16} />
                <span>Add Shift</span>
              </button>
            </form>

            <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-2.5">
              {shifts.map((item, idx) => (
                <div key={idx} className={listItemClass}>
                  <span className="font-semibold text-slate-800 text-sm">{item}</span>
                  <button type="button" onClick={() => removeShift(idx)} className={removeBtnClass} title="Delete">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: FIRM NAMES */}
        {activeTab === 'firmNames' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-6">
            {cardHeaderClass(Building2, 'Firm Name Master (Column E)')}

            <form onSubmit={handleAddFirmName} className="flex gap-3 mb-5">
              <input
                type="text"
                className={inputClass}
                placeholder="Firm / Company Name"
                value={newFirmName}
                onChange={e => setNewFirmName(e.target.value)}
              />
              <button type="submit" className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-lg shadow-sm px-4 py-2 transition-colors shrink-0">
                <PlusCircle size={16} />
                <span>Add Firm</span>
              </button>
            </form>

            <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-2.5">
              {firmNames.map((item, idx) => (
                <div key={idx} className={listItemClass}>
                  <span className="font-semibold text-slate-800 text-sm">{item}</span>
                  <button type="button" onClick={() => removeFirmName(idx)} className={removeBtnClass} title="Delete">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: WORK TYPES */}
        {activeTab === 'workTypes' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-6">
            {cardHeaderClass(Briefcase, 'Work Activities & Default Rates (₹ / Person)')}

            <form onSubmit={handleAddWorkType} className="grid grid-cols-[2fr_1fr_auto] gap-3 mb-5">
              <input
                type="text"
                className={inputClass}
                placeholder="Activity name (e.g. Packing & Palletizing)"
                value={newWorkName}
                onChange={e => setNewWorkName(e.target.value)}
              />
              <input
                type="number"
                className={inputClass}
                placeholder="Default Rate (₹)"
                value={newWorkRate}
                onChange={e => setNewWorkRate(Number(e.target.value))}
              />
              <button type="submit" className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-lg shadow-sm px-4 py-2 transition-colors shrink-0">
                <PlusCircle size={16} />
                <span>Add Activity</span>
              </button>
            </form>

            <div className="flex flex-col gap-2.5">
              {workTypes.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between bg-slate-50 px-4 py-3 rounded-lg border border-slate-200">
                  <div>
                    <div className="font-bold text-slate-900 text-sm">
                      {item.name}
                    </div>
                    <div className="text-xs text-emerald-600 font-semibold">
                      Default Rate: ₹{item.defaultRate} / {isTonBasedWork(item.name) ? 'ton' : 'person'}
                    </div>
                  </div>
                  <button type="button" onClick={() => removeWorkType(idx)} className={removeBtnClass} title="Delete">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
