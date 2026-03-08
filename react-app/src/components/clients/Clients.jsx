import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import Modal from '../shared/Modal';
import TimerWidget from '../shared/TimerWidget';
import { IconEdit, IconDelete } from '../shared/Icons';
import { todayStr } from '../../utils';

const STATUS_COLOR = { Pending: 'badge-yellow', 'In Progress': 'badge-blue', Completed: 'badge-green' };
const EMPTY = { client: '', project: '', desc: '', hours: '', payment: '', status: 'Pending' };

export default function Clients() {
  const { getClients, saveClient, deleteClient, revision } = useApp();
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const clients = getClients();

  const openAdd = () => { setForm(EMPTY); setEditId(null); setModal(true); };
  const openEdit = (c) => {
    setForm({ client: c.client, project: c.project, desc: c.desc || '', hours: c.hours || '', payment: c.payment || '', status: c.status });
    setEditId(c.id); setModal(true);
  };
  const handleSave = () => {
    if (!form.client.trim() || !form.project.trim()) return;
    saveClient({ ...form, date: todayStr() }, editId);
    setModal(false);
  };
  const handleDelete = (id) => { if (confirm('Delete this project?')) deleteClient(id); };
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div>
      <div className="section-header">
        <div>
          <h2 className="section-title">Client Work Tracker</h2>
          <p className="section-sub">Log your client projects and work hours</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>+ Add Project</button>
      </div>

      <div className="card">
        {clients.length === 0 ? (
          <div className="empty-state">
            <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></svg>
            <p>No projects yet — add your first client project!</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr>
                <th>Client</th><th>Project</th><th>Description</th><th>Hours</th><th>Payment</th><th>Status</th><th>Actions</th>
              </tr></thead>
              <tbody>
                {clients.map(c => (
                  <tr key={c.id}>
                    <td><strong>{c.client}</strong></td>
                    <td>{c.project}</td>
                    <td style={{ maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.desc || '—'}</td>
                    <td>{c.hours || '—'} hrs</td>
                    <td>${parseFloat(c.payment || 0).toLocaleString()}</td>
                    <td><span className={`badge ${STATUS_COLOR[c.status] || 'badge-muted'}`}>{c.status}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <TimerWidget id={c.id} type="client" name={`${c.client} — ${c.project}`} />
                        <button className="btn-icon" onClick={() => openEdit(c)} title="Edit"><IconEdit /></button>
                        <button className="btn-icon btn-danger" onClick={() => handleDelete(c.id)} title="Delete"><IconDelete /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && (
        <Modal title={editId ? 'Edit Project' : 'Add Project'} onClose={() => setModal(false)}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Client Name *</label>
              <input className="inp" autoFocus placeholder="Client name..." value={form.client} onChange={e => set('client', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Project *</label>
              <input className="inp" placeholder="Project name..." value={form.project} onChange={e => set('project', e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <input className="inp" placeholder="Brief description..." value={form.desc} onChange={e => set('desc', e.target.value)} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Hours Worked</label>
              <input className="inp" type="number" min="0" step="0.5" placeholder="0" value={form.hours} onChange={e => set('hours', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Payment ($)</label>
              <input className="inp" type="number" min="0" placeholder="0" value={form.payment} onChange={e => set('payment', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="inp" value={form.status} onChange={e => set('status', e.target.value)}>
                <option>Pending</option><option>In Progress</option><option>Completed</option>
              </select>
            </div>
          </div>
          <div className="modal-actions">
            <button className="btn btn-ghost" onClick={() => setModal(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave}>{editId ? 'Update' : 'Add Project'}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
