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

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      {/* Title */}
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0F172A' }}>
            Master Data Management
          </h1>
        </div>

        <button
          onClick={handleSaveAll}
          disabled={syncing}
          className="btn btn-primary"
        >
          <Save size={16} />
          <span>{syncing ? 'Saving to Sheets...' : 'Save Master Changes'}</span>
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, borderBottom: '1px solid #E2E8F0', paddingBottom: 8, flexWrap: 'wrap' }}>
        <button
          onClick={() => setActiveTab('incharges')}
          className={`btn ${activeTab === 'incharges' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
        >
          <UserCheck size={16} />
          <span>Supervisors ({incharges.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('labourers')}
          className={`btn ${activeTab === 'labourers' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
        >
          <Users size={16} />
          <span>Labour Pool ({labourers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('shifts')}
          className={`btn ${activeTab === 'shifts' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
        >
          <Layers size={16} />
          <span>Shifts ({shifts.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('firmNames')}
          className={`btn ${activeTab === 'firmNames' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
        >
          <Building2 size={16} />
          <span>Firm Names ({firmNames.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('workTypes')}
          className={`btn ${activeTab === 'workTypes' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
        >
          <Briefcase size={16} />
          <span>Work Types & Rates ({workTypes.length})</span>
        </button>
      </div>

      {/* TAB 1: INCHARGES */}
      {activeTab === 'incharges' && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <UserCheck size={18} color="#059669" />
              <span>Incharge Supervisors</span>
            </div>
          </div>

          <form onSubmit={handleAddIncharge} style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
            <input
              type="text"
              className="form-input"
              placeholder="Supervisor Name"
              value={newIncharge}
              onChange={e => setNewIncharge(e.target.value)}
            />
            <button type="submit" className="btn btn-primary">
              <PlusCircle size={16} />
              <span>Add</span>
            </button>
          </form>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
            {incharges.map((item, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: '#F8FAFC',
                  padding: '10px 14px',
                  borderRadius: 8,
                  border: '1px solid #E2E8F0'
                }}
              >
                <span style={{ fontWeight: 600, color: '#1E293B', fontSize: '0.9rem' }}>{item}</span>
                <button
                  type="button"
                  onClick={() => removeIncharge(idx)}
                  className="btn-remove-slot"
                  title="Delete"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: LABOUR POOL */}
      {activeTab === 'labourers' && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <Users size={18} color="#059669" />
              <span>Labour Pool Master</span>
            </div>
          </div>

          <form onSubmit={handleAddLabourer} style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
            <input
              type="text"
              className="form-input"
              placeholder="Labourer Name"
              value={newLabourer}
              onChange={e => setNewLabourer(e.target.value)}
            />
            <button type="submit" className="btn btn-primary">
              <PlusCircle size={16} />
              <span>Add Labourer</span>
            </button>
          </form>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
            {labourers.map((item, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: '#F8FAFC',
                  padding: '10px 14px',
                  borderRadius: 8,
                  border: '1px solid #E2E8F0'
                }}
              >
                <span style={{ fontWeight: 600, color: '#1E293B', fontSize: '0.9rem' }}>{item}</span>
                <button
                  type="button"
                  onClick={() => removeLabourer(idx)}
                  className="btn-remove-slot"
                  title="Delete"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: SHIFTS */}
      {activeTab === 'shifts' && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <Layers size={18} color="#059669" />
              <span>Shift Timing Master</span>
            </div>
          </div>

          <form onSubmit={handleAddShift} style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
            <input
              type="text"
              className="form-input"
              placeholder="Shift Name (e.g. Shift 1, Shift 2)"
              value={newShift}
              onChange={e => setNewShift(e.target.value)}
            />
            <button type="submit" className="btn btn-primary">
              <PlusCircle size={16} />
              <span>Add Shift</span>
            </button>
          </form>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
            {shifts.map((item, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: '#F8FAFC',
                  padding: '10px 14px',
                  borderRadius: 8,
                  border: '1px solid #E2E8F0'
                }}
              >
                <span style={{ fontWeight: 600, color: '#1E293B', fontSize: '0.9rem' }}>{item}</span>
                <button
                  type="button"
                  onClick={() => removeShift(idx)}
                  className="btn-remove-slot"
                  title="Delete"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: FIRM NAMES */}
      {activeTab === 'firmNames' && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <Building2 size={18} color="#059669" />
              <span>Firm Name Master (Column E)</span>
            </div>
          </div>

          <form onSubmit={handleAddFirmName} style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
            <input
              type="text"
              className="form-input"
              placeholder="Firm / Company Name"
              value={newFirmName}
              onChange={e => setNewFirmName(e.target.value)}
            />
            <button type="submit" className="btn btn-primary">
              <PlusCircle size={16} />
              <span>Add Firm</span>
            </button>
          </form>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
            {firmNames.map((item, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: '#F8FAFC',
                  padding: '10px 14px',
                  borderRadius: 8,
                  border: '1px solid #E2E8F0'
                }}
              >
                <span style={{ fontWeight: 600, color: '#1E293B', fontSize: '0.9rem' }}>{item}</span>
                <button
                  type="button"
                  onClick={() => removeFirmName(idx)}
                  className="btn-remove-slot"
                  title="Delete"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: WORK TYPES */}
      {activeTab === 'workTypes' && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <Briefcase size={18} color="#059669" />
              <span>Work Activities & Default Rates (₹ / Person)</span>
            </div>
          </div>

          <form onSubmit={handleAddWorkType} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: 12, marginBottom: 20 }}>
            <input
              type="text"
              className="form-input"
              placeholder="Activity name (e.g. Packing & Palletizing)"
              value={newWorkName}
              onChange={e => setNewWorkName(e.target.value)}
            />
            <input
              type="number"
              className="form-input"
              placeholder="Default Rate (₹)"
              value={newWorkRate}
              onChange={e => setNewWorkRate(Number(e.target.value))}
            />
            <button type="submit" className="btn btn-primary">
              <PlusCircle size={16} />
              <span>Add Activity</span>
            </button>
          </form>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {workTypes.map((item, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: '#F8FAFC',
                  padding: '12px 16px',
                  borderRadius: 8,
                  border: '1px solid #E2E8F0'
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '0.95rem' }}>
                    {item.name}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#059669', fontWeight: 600 }}>
                    Default Rate: ₹{item.defaultRate} / person
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeWorkType(idx)}
                  className="btn-remove-slot"
                  title="Delete"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
