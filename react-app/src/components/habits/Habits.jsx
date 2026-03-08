import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { lastSevenDays, todayStr, calcStreak } from '../../utils';
import Modal from '../shared/Modal';
import { IconDelete } from '../shared/Icons';

export default function Habits() {
  const { getHabits, saveHabit, deleteHabit, toggleHabitDay, revision } = useApp();
  const [modal, setModal] = useState(false);
  const [name, setName] = useState('');
  const habits = getHabits();
  const days7 = lastSevenDays();
  const today = todayStr();

  const handleSave = () => {
    if (!name.trim()) return;
    saveHabit(name.trim());
    setName(''); setModal(false);
  };

  return (
    <div>
      <div className="section-header">
        <div>
          <h2 className="section-title">Habit Tracker</h2>
          <p className="section-sub">Build consistent daily habits</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModal(true)}>+ Add Habit</button>
      </div>

      <div className="card">
        {habits.length === 0 ? (
          <div className="empty-state">
            <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            <p>No habits yet — start building positive habits!</p>
          </div>
        ) : (
          <div>
            <div className="habit-header-row">
              <span style={{ flex: 1 }}>Habit</span>
              <div className="habit-days-header">
                {days7.map(d => <span key={d.date} className="habit-day-label">{d.label[0]}</span>)}
              </div>
              <span style={{ minWidth: 100, textAlign: 'right', paddingRight: 36 }}>Streak</span>
            </div>
            {habits.map(h => {
              const streak = calcStreak(h.days || {});
              return (
                <div key={h.id} className="habit-row">
                  <span className="habit-name">{h.name}</span>
                  <div className="habit-days">
                    {days7.map(d => (
                      <div
                        key={d.date}
                        className={`habit-dot${h.days?.[d.date] ? ' done' : ''}`}
                        onClick={() => toggleHabitDay(h.id, d.date)}
                        title={d.date}
                        style={d.date === today ? { borderColor: 'rgba(249,115,22,.6)' } : {}}
                      >
                        {d.label[0]}
                      </div>
                    ))}
                  </div>
                  <span className="habit-streak">{streak > 0 ? `${streak} day streak` : ''}</span>
                  <button className="btn-icon btn-danger" onClick={() => { if (confirm('Delete habit?')) deleteHabit(h.id); }} title="Delete" style={{ marginLeft: 8 }}><IconDelete /></button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {modal && (
        <Modal title="Add Habit" onClose={() => setModal(false)}>
          <div className="form-group">
            <label className="form-label">Habit Name *</label>
            <input className="inp" autoFocus placeholder="e.g. Morning workout, Read 20 min..." value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSave()} />
          </div>
          <div className="modal-actions">
            <button className="btn btn-ghost" onClick={() => setModal(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave}>Add Habit</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
