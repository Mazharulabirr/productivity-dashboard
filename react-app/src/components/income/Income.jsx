import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import Modal from '../shared/Modal';
import { IconEdit, IconDelete } from '../shared/Icons';
import { todayStr } from '../../utils';

const STATUS_COLOR = { Received: 'badge-green', Pending: 'badge-yellow', Cancelled: 'badge-red' };
const EMPTY = { client: '', amount: '', method: 'Upwork', date: todayStr(), status: 'Received' };

export default function Income() {
  const { getIncomes, saveIncome, deleteIncome, revision, getProfileData } = useApp();
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const incomes = getIncomes();
  const profile = getProfileData();
  const incomeGoal = parseFloat(profile.incomeGoal) || 0;

  const today = todayStr();
  const ym = today.slice(0, 7);
  let month = 0, total = 0, pending = 0;
  incomes.forEach(i => {
    const amt = parseFloat(i.amount) || 0;
    total += amt;
    if (i.status === 'Received' && i.date?.slice(0, 7) === ym) month += amt;
    if (i.status === 'Pending') pending += amt;
  });
  const goalPct = incomeGoal > 0 ? Math.min(100, Math.round((month / incomeGoal) * 100)) : 0;

  const openAdd = () => { setForm({ ...EMPTY, date: todayStr() }); setEditId(null); setModal(true); };
  const openEdit = (i) => {
    setForm({ client: i.client, amount: i.amount, method: i.method, date: i.date || '', status: i.status });
    setEditId(i.id); setModal(true);
  };
  const handleSave = () => {
    if (!form.client.trim() || !form.amount) return;
    saveIncome({ ...form, amount: parseFloat(form.amount) }, editId);
    setModal(false);
  };
  const handleDelete = (id) => { if (confirm('Delete this payment?')) deleteIncome(id); };
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div>
      <div className="section-header">
        <div>
          <h2 className="section-title">Income Tracker</h2>
          <p className="section-sub">Track your earnings and payments</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>+ Add Payment</button>
      </div>

      <div className="overview-grid mb-20" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
        <div className="stat-card"><div className="stat-icon" style={{ background: 'rgba(34,197,94,.12)' }}><svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#22c55e" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg></div><div className="stat-value">${month.toLocaleString()}</div><div className="stat-label">{incomeGoal > 0 ? `This Month (${goalPct}% of $${incomeGoal.toLocaleString()})` : 'This Month'}</div>{incomeGoal > 0 && <div className="stat-progress-bar"><div className="stat-progress-fill" style={{ width: `${goalPct}%` }} /></div>}</div>
        <div className="stat-card"><div className="stat-icon" style={{ background: 'rgba(59,130,246,.12)' }}><svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#3b82f6" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg></div><div className="stat-value">${total.toLocaleString()}</div><div className="stat-label">Total Received</div></div>
        <div className="stat-card"><div className="stat-icon" style={{ background: 'rgba(234,179,8,.12)' }}><svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#eab308" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></div><div className="stat-value">${pending.toLocaleString()}</div><div className="stat-label">Pending</div></div>
      </div>

      <div className="card">
        {incomes.length === 0 ? (
          <div className="empty-state">
            <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
            <p>No payments yet — log your first income!</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Client</th><th>Amount</th><th>Method</th><th>Date</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {incomes.map(i => (
                  <tr key={i.id}>
                    <td><strong>{i.client}</strong></td>
                    <td style={{ color: 'var(--green)', fontWeight: 700 }}>${parseFloat(i.amount || 0).toLocaleString()}</td>
                    <td>{i.method}</td>
                    <td>{i.date || '—'}</td>
                    <td><span className={`badge ${STATUS_COLOR[i.status] || 'badge-muted'}`}>{i.status}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn-icon" onClick={() => openEdit(i)} title="Edit"><IconEdit /></button>
                        <button className="btn-icon btn-danger" onClick={() => handleDelete(i.id)} title="Delete"><IconDelete /></button>
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
        <Modal title={editId ? 'Edit Payment' : 'Add Payment'} onClose={() => setModal(false)}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Client *</label>
              <input className="inp" autoFocus placeholder="Client name..." value={form.client} onChange={e => set('client', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Amount ($) *</label>
              <input className="inp" type="number" min="0" placeholder="0" value={form.amount} onChange={e => set('amount', e.target.value)} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Method</label>
              <select className="inp" value={form.method} onChange={e => set('method', e.target.value)}>
                <option>Upwork</option><option>PayPal</option><option>Bank Transfer</option><option>Crypto</option><option>Other</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Date</label>
              <input className="inp" type="date" value={form.date} onChange={e => set('date', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="inp" value={form.status} onChange={e => set('status', e.target.value)}>
                <option>Received</option><option>Pending</option><option>Cancelled</option>
              </select>
            </div>
          </div>
          <div className="modal-actions">
            <button className="btn btn-ghost" onClick={() => setModal(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave}>{editId ? 'Update' : 'Add Payment'}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
