import { useEffect, useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend,
  ArcElement
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { useApp } from '../../context/AppContext';
import { lastSevenDays, fmtHM } from '../../utils';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

export default function Stats() {
  const { getTasks, getIncomes, timers, revision } = useApp();
  const tasks = getTasks();
  const incomes = getIncomes();
  const days = lastSevenDays(); // [{ label, date }]

  // --- weekly data ---
  const weekWorkMs = days.reduce((sum, d) => {
    const log = JSON.parse(localStorage.getItem(`timelog_${d.date}`) || '{}');
    return sum + Object.values(log).filter(e => e.type === 'task' || e.type === 'client').reduce((s, e) => s + (e.elapsed || 0), 0);
  }, 0);
  const weekLearnMs = days.reduce((sum, d) => {
    const log = JSON.parse(localStorage.getItem(`timelog_${d.date}`) || '{}');
    return sum + Object.values(log).filter(e => e.type === 'skill').reduce((s, e) => s + (e.elapsed || 0), 0);
  }, 0);
  const tasksDone = tasks.filter(t => t.status === 'completed' || t.status === 'Completed').length;
  const totalEarnings = incomes.filter(i => i.status === 'Received').reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);

  // --- bar chart: work hours per day ---
  const barData = useMemo(() => {
    const labels = days.map(d => d.label);
    const workHours = days.map(d => {
      const log = JSON.parse(localStorage.getItem(`timelog_${d.date}`) || '{}');
      const ms = Object.values(log).filter(e => e.type === 'task' || e.type === 'client').reduce((s, e) => s + (e.elapsed || 0), 0);
      return +(ms / 3600000).toFixed(2);
    });
    const learnHours = days.map(d => {
      const log = JSON.parse(localStorage.getItem(`timelog_${d.date}`) || '{}');
      const ms = Object.values(log).filter(e => e.type === 'skill').reduce((s, e) => s + (e.elapsed || 0), 0);
      return +(ms / 3600000).toFixed(2);
    });
    return {
      labels,
      datasets: [
        { label: 'Work', data: workHours, backgroundColor: 'rgba(139,92,246,0.8)', borderRadius: 6 },
        { label: 'Learn', data: learnHours, backgroundColor: 'rgba(34,197,94,0.7)', borderRadius: 6 },
      ]
    };
  }, [revision]);

  const barOptions = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { labels: { color: '#94a3b8', font: { size: 12 } } }, tooltip: { backgroundColor: '#1e293b' } },
    scales: {
      x: { ticks: { color: '#64748b' }, grid: { color: 'rgba(255,255,255,0.04)' } },
      y: { ticks: { color: '#64748b' }, grid: { color: 'rgba(255,255,255,0.04)' }, title: { display: true, text: 'Hours', color: '#64748b' } }
    }
  };

  // --- doughnut: completed tasks by type ---
  const typeCount = useMemo(() => {
    const counts = {};
    tasks.filter(t => t.status === 'Completed').forEach(t => { counts[t.type || 'Other'] = (counts[t.type || 'Other'] || 0) + 1; });
    return counts;
  }, [revision]);
  const doughnutData = {
    labels: Object.keys(typeCount),
    datasets: [{
      data: Object.values(typeCount),
      backgroundColor: ['rgba(139,92,246,0.8)', 'rgba(34,197,94,0.7)', 'rgba(251,191,36,0.7)', 'rgba(239,68,68,0.7)', 'rgba(59,130,246,0.7)'],
      borderWidth: 2, borderColor: '#0f172a'
    }]
  };
  const doughnutOptions = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom', labels: { color: '#94a3b8', padding: 16, font: { size: 12 } } }, tooltip: { backgroundColor: '#1e293b' } }
  };

  // --- income by month (last 3 months) ---
  const monthMap = {};
  incomes.filter(i => i.status === 'Received').forEach(i => {
    const m = (i.date || '').slice(0, 7);
    if (m) monthMap[m] = (monthMap[m] || 0) + (parseFloat(i.amount) || 0);
  });
  const months = Object.keys(monthMap).sort().slice(-3);

  return (
    <div>
      <div className="section-header">
        <div>
          <h2 className="section-title">Statistics</h2>
          <p className="section-sub">Your productivity insights &amp; trends</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="overview-grid mb-20" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(139,92,246,.12)' }}>
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#8b5cf6" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </div>
          <div className="stat-value">{fmtHM(weekWorkMs)}</div><div className="stat-label">Work This Week</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(34,197,94,.12)' }}>
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#22c55e" strokeWidth="2"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>
          </div>
          <div className="stat-value">{fmtHM(weekLearnMs)}</div><div className="stat-label">Learn This Week</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(251,191,36,.12)' }}>
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#fbbf24" strokeWidth="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
          </div>
          <div className="stat-value">{tasksDone}</div><div className="stat-label">Tasks Completed</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(34,197,94,.12)' }}>
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#22c55e" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
          </div>
          <div className="stat-value">${totalEarnings.toLocaleString()}</div><div className="stat-label">Total Earnings</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16 }}>
        {/* Bar chart */}
        <div className="card">
          <h3 style={{ marginBottom: 16, fontSize: 14, fontWeight: 600, color: 'var(--text-muted)' }}>DAILY HOURS (LAST 7 DAYS)</h3>
          <div style={{ height: 260 }}>
            <Bar data={barData} options={barOptions} />
          </div>
        </div>
        {/* Doughnut */}
        <div className="card">
          <h3 style={{ marginBottom: 16, fontSize: 14, fontWeight: 600, color: 'var(--text-muted)' }}>COMPLETED TASK TYPES</h3>
          {Object.keys(typeCount).length === 0 ? (
            <div className="empty-state" style={{ height: 220 }}>
              <p style={{ fontSize: 13 }}>No completed tasks yet</p>
            </div>
          ) : (
            <div style={{ height: 220 }}>
              <Doughnut data={doughnutData} options={doughnutOptions} />
            </div>
          )}
        </div>
      </div>

      {months.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <h3 style={{ marginBottom: 14, fontSize: 14, fontWeight: 600, color: 'var(--text-muted)' }}>INCOME BY MONTH</h3>
          <div style={{ display: 'flex', gap: 12 }}>
            {months.map(m => (
              <div key={m} className="stat-card" style={{ flex: 1 }}>
                <div className="stat-value" style={{ fontSize: 22 }}>${monthMap[m].toLocaleString()}</div>
                <div className="stat-label">{new Date(m + '-01').toLocaleString('en-US', { month: 'long', year: 'numeric' })}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
