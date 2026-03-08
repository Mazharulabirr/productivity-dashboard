import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import Modal from '../shared/Modal';
import TimerWidget from '../shared/TimerWidget';
import { IconEdit, IconDelete } from '../shared/Icons';

const FILTERS = [
  { f: 'all', label: 'All' },
  { f: 'pending', label: 'Pending' },
  { f: 'in-progress', label: 'In Progress' },
  { f: 'completed', label: 'Completed' },
  { f: 'Client Work', label: 'Client Work' },
  { f: 'Learning', label: 'Learning' },
  { f: 'Personal', label: 'Personal' },
];

const PRIO_CLASS = { High: 'prio-high', Medium: 'prio-medium', Low: 'prio-low' };
const TYPE_COLOR = { 'Client Work': 'badge-orange', 'Learning': 'badge-purple', 'Personal': 'badge-blue' };
const STATUS_COLOR = { pending: 'badge-muted', 'in-progress': 'badge-yellow', completed: 'badge-green' };

const EMPTY_FORM = { name: '', type: 'Client Work', priority: 'Medium', status: 'pending', deadline: '', time: '' };

export default function Tasks() {
  const { getTasks, saveTask, deleteTask, toggleTask, revision } = useApp();
  const [filter, setFilter] = useState('all');
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const tasks = getTasks();
  const filtered = tasks.filter(t => {
    if (filter === 'all') return true;
    if (['pending', 'in-progress', 'completed'].includes(filter)) return t.status === filter;
    return t.type === filter;
  });

  const openAdd = () => { setForm(EMPTY_FORM); setEditId(null); setModal(true); };
  const openEdit = (t) => { setForm({ name: t.name, type: t.type, priority: t.priority, status: t.status, deadline: t.deadline || '', time: t.time || '' }); setEditId(t.id); setModal(true); };
  const closeModal = () => setModal(false);

  const handleSave = () => {
    if (!form.name.trim()) return;
    saveTask(form, editId);
    setModal(false);
  };

  const handleDelete = (id) => { if (confirm('Delete this task?')) deleteTask(id); };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div>
      <div className="section-header">
        <div>
          <h2 className="section-title">Task Manager</h2>
          <p className="section-sub">Track and manage your tasks</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>+ Add Task</button>
      </div>

      <div className="filter-bar mb-16">
        {FILTERS.map(({ f, label }) => (
          <button key={f} className={`filter-chip${filter === f ? ' active' : ''}`} onClick={() => setFilter(f)}>{label}</button>
        ))}
      </div>

      <div className="task-list">
        {filtered.length === 0 ? (
          <div className="empty-state">
            <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
            <p>No tasks yet — add one to get started!</p>
          </div>
        ) : filtered.map(t => (
          <div key={t.id} className={`task-item${t.status === 'completed' ? ' done' : ''}`}>
            <input type="checkbox" className="task-check" checked={t.status === 'completed'} onChange={() => toggleTask(t.id)} />
            <span className="task-name">{t.name}</span>
            <div className="task-meta">
              {(t.deadline || t.time) && <span className="text-muted text-sm">{[t.deadline, t.time].filter(Boolean).join(' ')}</span>}
              <TimerWidget id={t.id} type="task" name={t.name} />
              <span className={`badge ${TYPE_COLOR[t.type] || 'badge-muted'}`}>{t.type}</span>
              <span className={`badge ${PRIO_CLASS[t.priority] || 'badge-muted'}`}>{t.priority}</span>
              <span className={`badge ${STATUS_COLOR[t.status] || 'badge-muted'}`}>{t.status}</span>
              <button className="btn-icon" onClick={() => openEdit(t)} title="Edit"><IconEdit /></button>
              <button className="btn-icon btn-danger" onClick={() => handleDelete(t.id)} title="Delete"><IconDelete /></button>
            </div>
          </div>
        ))}
      </div>

      {modal && (
        <Modal title={editId ? 'Edit Task' : 'Add Task'} onClose={closeModal}>
          <div className="form-group">
            <label className="form-label">Task Name *</label>
            <input className="inp" autoFocus placeholder="What needs to be done?" value={form.name} onChange={e => set('name', e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSave()} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Type</label>
              <select className="inp" value={form.type} onChange={e => set('type', e.target.value)}>
                <option>Client Work</option><option>Learning</option><option>Personal</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Priority</label>
              <select className="inp" value={form.priority} onChange={e => set('priority', e.target.value)}>
                <option>High</option><option>Medium</option><option>Low</option>
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="inp" value={form.status} onChange={e => set('status', e.target.value)}>
                <option value="pending">Pending</option><option value="in-progress">In Progress</option><option value="completed">Completed</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Deadline</label>
              <input className="inp" type="date" value={form.deadline} onChange={e => set('deadline', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Time</label>
              <input className="inp" type="time" value={form.time} onChange={e => set('time', e.target.value)} />
            </div>
          </div>
          <div className="modal-actions">
            <button className="btn btn-ghost" onClick={closeModal}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave}>{editId ? 'Update Task' : 'Add Task'}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
