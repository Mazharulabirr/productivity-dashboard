import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import Modal from '../shared/Modal';
import TimerWidget from '../shared/TimerWidget';
import Courses from './Courses';
import { IconEdit, IconDelete } from '../shared/Icons';
import { todayStr } from '../../utils';

const EMPTY = { name: '', topic: '', hrsToday: '', hrsTotal: '', pct: '' };

export default function Skills() {
  const { getSkills, saveSkill, deleteSkill, revision } = useApp();
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const skills = getSkills();

  const openAdd = () => { setForm(EMPTY); setEditId(null); setModal(true); };
  const openEdit = (s) => {
    setForm({ name: s.name, topic: s.topic || '', hrsToday: s.hrsToday || '', hrsTotal: s.hrsTotal || '', pct: s.pct || '' });
    setEditId(s.id); setModal(true);
  };
  const handleSave = () => {
    if (!form.name.trim()) return;
    const pct = Math.min(100, Math.max(0, parseInt(form.pct) || 0));
    saveSkill({ ...form, pct, dateUpdated: todayStr() }, editId);
    setModal(false);
  };
  const handleDelete = (id) => { if (confirm('Delete this skill?')) deleteSkill(id); };
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div>
      <div className="section-header">
        <div>
          <h2 className="section-title">Skill Learning Tracker</h2>
          <p className="section-sub">Track your learning progress and courses</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost" onClick={() => document.getElementById('add-course-btn')?.click()}>+ Add Course</button>
          <button className="btn btn-primary" onClick={openAdd}>+ Add Skill</button>
        </div>
      </div>

      <div className="card mb-20">
        {skills.length === 0 ? (
          <div className="empty-state">
            <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>
            <p>No skills yet — start tracking your learning!</p>
          </div>
        ) : (
          <div className="skill-list">
            {skills.map(s => (
              <div key={s.id} className="skill-row">
                <div className="skill-header">
                  <div>
                    <span className="skill-title">{s.name}</span>
                    {s.topic && <span className="text-muted text-sm" style={{ marginLeft: 8 }}>{s.topic}</span>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span className="text-sm text-secondary">{s.hrsTotal || 0} hrs total</span>
                    <span className="skill-pct">{s.pct || 0}%</span>
                    <TimerWidget id={s.id} type="skill" name={s.name} />
                    <button className="btn-icon" onClick={() => openEdit(s)} title="Edit"><IconEdit /></button>
                    <button className="btn-icon btn-danger" onClick={() => handleDelete(s.id)} title="Delete"><IconDelete /></button>
                  </div>
                </div>
                <div className="progress-wrap">
                  <div className="progress-fill" style={{ width: `${s.pct || 0}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Courses skills={skills} />

      {modal && (
        <Modal title={editId ? 'Edit Skill' : 'Add Skill'} onClose={() => setModal(false)}>
          <div className="form-group">
            <label className="form-label">Skill Name *</label>
            <input className="inp" autoFocus placeholder="e.g. React, Python..." value={form.name} onChange={e => set('name', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Current Topic</label>
            <input className="inp" placeholder="What are you learning now?" value={form.topic} onChange={e => set('topic', e.target.value)} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Hours Today</label>
              <input className="inp" type="number" min="0" step="0.5" placeholder="0" value={form.hrsToday} onChange={e => set('hrsToday', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Total Hours</label>
              <input className="inp" type="number" min="0" step="0.5" placeholder="0" value={form.hrsTotal} onChange={e => set('hrsTotal', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Progress %</label>
              <input className="inp" type="number" min="0" max="100" placeholder="0" value={form.pct} onChange={e => set('pct', e.target.value)} />
            </div>
          </div>
          <div className="modal-actions">
            <button className="btn btn-ghost" onClick={() => setModal(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave}>{editId ? 'Update Skill' : 'Add Skill'}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
