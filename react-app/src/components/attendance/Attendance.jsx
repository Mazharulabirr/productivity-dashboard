import { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { msToHMS, fmtHM, todayStr } from '../../utils';

const KEY = () => `att_${todayStr()}`;

function loadAtt() {
  try { return JSON.parse(localStorage.getItem(KEY())) || {}; } catch { return {}; }
}
function saveAtt(data) {
  localStorage.setItem(KEY(), JSON.stringify(data));
}

export default function Attendance() {
  const { getProfileData } = useApp();
  const [log, setLog] = useState(loadAtt);
  const [now, setNow] = useState(Date.now());
  const tickRef = useRef(null);
  const [showHistory, setShowHistory] = useState(false);

  // live tick
  useEffect(() => {
    tickRef.current = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tickRef.current);
  }, []);

  const persist = (updated) => { setLog(updated); saveAtt(updated); };

  // --- status computation ---
  const status = (() => {
    if (log.checkedOut) return 'done';
    if (log.breakStart && !log.breakEnd) return 'break';
    if (log.checkIn) return 'working';
    return 'idle';
  })();

  // work elapsed (total minus break time)
  const workMs = (() => {
    if (!log.checkIn) return 0;
    const end = log.checkedOut ? log.checkOut : now;
    const total = end - log.checkIn;
    const brk = log.breaks?.reduce((s, b) => s + ((b.end || now) - b.start), 0) || 0;
    return Math.max(0, total - brk);
  })();

  const breakMs = (() => {
    if (!log.breaks?.length) return 0;
    return log.breaks.reduce((s, b) => s + ((b.end || now) - b.start), 0);
  })();

  // --- actions ---
  const handleCheckIn = () => {
    persist({ checkIn: Date.now(), breaks: [] });
  };
  const handleBreakStart = () => {
    const updated = { ...log, breakStart: Date.now(), breaks: [...(log.breaks || []), { start: Date.now() }] };
    persist(updated);
  };
  const handleBreakEnd = () => {
    const breaks = (log.breaks || []).map((b, i) => i === log.breaks.length - 1 ? { ...b, end: Date.now() } : b);
    const updated = { ...log, breakEnd: Date.now(), breaks };
    delete updated.breakStart;
    persist(updated);
  };
  const handleCheckOut = () => {
    // auto-end any open break
    let breaks = log.breaks || [];
    if (status === 'break') {
      breaks = breaks.map((b, i) => i === breaks.length - 1 ? { ...b, end: Date.now() } : b);
    }
    persist({ ...log, breaks, checkOut: Date.now(), checkedOut: true });
  };
  const handleReset = () => {
    if (confirm('Clear today\'s attendance?')) persist({});
  };

  // history: last 7 days
  const historyDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - i);
    const key = `att_${d.toISOString().slice(0, 10)}`;
    try {
      const data = JSON.parse(localStorage.getItem(key)) || {};
      return { date: d.toISOString().slice(0, 10), data };
    } catch { return { date: d.toISOString().slice(0, 10), data: {} }; }
  });

  const histWorkMs = (data) => {
    if (!data.checkIn) return 0;
    const end = data.checkedOut ? data.checkOut : Date.now();
    const total = end - data.checkIn;
    const brk = data.breaks?.reduce((s, b) => s + ((b.end || Date.now()) - b.start), 0) || 0;
    return Math.max(0, total - brk);
  };

  const statusLabels = { idle: 'Not Started', working: 'Working', break: 'On Break', done: 'Checked Out' };
  const statusColors = { idle: 'var(--text-muted)', working: 'var(--green)', break: 'var(--yellow)', done: 'var(--accent)' };

  const profile = getProfileData();
  const workHrsGoal = parseFloat(profile.workHrsGoal) || 0;
  const workHrsDone = workMs / 3600000;
  const workGoalPct = workHrsGoal > 0 ? Math.min(100, Math.round((workHrsDone / workHrsGoal) * 100)) : 0;

  return (
    <div>
      <div className="section-header">
        <div>
          <h2 className="section-title">Attendance</h2>
          <p className="section-sub">Track your work hours for today</p>
        </div>
        <button className="btn btn-ghost" onClick={() => setShowHistory(h => !h)}>
          {showHistory ? 'Hide History' : 'View History'}
        </button>
      </div>

      <div className="card att-main-card">
        <div className="att-status-label" style={{ color: statusColors[status] }}>
          <span className="att-status-dot" style={{ background: statusColors[status] }}></span>
          {statusLabels[status]}
        </div>

        <div className="att-time-display">
          {msToHMS(workMs)}
        </div>
        <div className="att-sub">Work time today{workHrsGoal > 0 ? ` • goal: ${workHrsGoal}h` : ''}</div>
        {workHrsGoal > 0 && (
          <div className="att-goal-bar">
            <div className="att-goal-fill" style={{ width: `${workGoalPct}%`, background: workGoalPct >= 100 ? 'var(--green)' : 'var(--orange)' }} />
            <span className="att-goal-label">{workGoalPct}%</span>
          </div>
        )}

        <div className="att-grid">
          <div className="att-info-box">
            <div className="att-info-label">Check In</div>
            <div className="att-info-val">{log.checkIn ? new Date(log.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</div>
          </div>
          <div className="att-info-box">
            <div className="att-info-label">Break Time</div>
            <div className="att-info-val">{breakMs > 0 ? fmtHM(breakMs) : '—'}</div>
          </div>
          <div className="att-info-box">
            <div className="att-info-label">Check Out</div>
            <div className="att-info-val">{log.checkOut ? new Date(log.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</div>
          </div>
        </div>

        <div className="att-actions">
          {status === 'idle' && (
            <button className="btn btn-primary btn-lg" onClick={handleCheckIn}>Check In</button>
          )}
          {status === 'working' && (<>
            <button className="btn btn-yellow btn-lg" onClick={handleBreakStart}>Take Break</button>
            <button className="btn btn-danger btn-lg" onClick={handleCheckOut}>Check Out</button>
          </>)}
          {status === 'break' && (<>
            <button className="btn btn-primary btn-lg" onClick={handleBreakEnd}>End Break</button>
            <button className="btn btn-danger btn-lg" onClick={handleCheckOut}>Check Out</button>
          </>)}
          {status === 'done' && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: 'var(--green)', marginBottom: 12, fontSize: 15 }}>Total Work: <strong>{fmtHM(workMs)}</strong></div>
              <button className="btn btn-ghost" onClick={handleReset}>Reset Today</button>
            </div>
          )}
        </div>

        {(log.breaks?.length > 0) && (
          <div className="att-breaks">
            <div className="att-breaks-title">Break Log</div>
            {log.breaks.map((b, i) => (
              <div key={i} className="att-break-row">
                <span>Break {i + 1}</span>
                <span>{new Date(b.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – {b.end ? new Date(b.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'ongoing'}</span>
                <span style={{ color: 'var(--text-muted)' }}>{b.end ? fmtHM(b.end - b.start) : '...'}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {showHistory && (
        <div className="card" style={{ marginTop: 16 }}>
          <h3 style={{ marginBottom: 14, fontSize: 15, fontWeight: 600 }}>Last 7 Days</h3>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Date</th><th>Check In</th><th>Check Out</th><th>Break</th><th>Work Time</th></tr></thead>
              <tbody>
                {historyDays.map(({ date, data }) => {
                  const wms = histWorkMs(data);
                  const bms = data.breaks?.reduce((s, b) => s + ((b.end || 0) - b.start), 0) || 0;
                  const isToday = date === todayStr();
                  return (
                    <tr key={date} style={isToday ? { background: 'rgba(139,92,246,.06)' } : {}}>
                      <td>{isToday ? <strong>Today</strong> : date}</td>
                      <td>{data.checkIn ? new Date(data.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                      <td>{data.checkOut ? new Date(data.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                      <td>{bms > 0 ? fmtHM(bms) : '—'}</td>
                      <td style={{ fontWeight: 700, color: wms > 0 ? 'var(--green)' : 'var(--text-muted)' }}>{wms > 0 ? fmtHM(wms) : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
