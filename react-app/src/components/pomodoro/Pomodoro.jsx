import { useState, useEffect, useRef } from 'react';

const RADIUS = 80;
const CIRC = 2 * Math.PI * RADIUS; // ≈ 502.65

const defaultSettings = { work: 25, shortBreak: 5, longBreak: 15, longAfter: 4 };

function pad(n) { return String(n).padStart(2, '0'); }
function fmtSec(s) { return `${pad(Math.floor(s / 60))}:${pad(s % 60)}`; }

export default function Pomodoro() {
  const [settings, setSettings] = useState(() => {
    try { return { ...defaultSettings, ...JSON.parse(localStorage.getItem('pomo_settings') || '{}') }; }
    catch { return defaultSettings; }
  });
  const [mode, setMode] = useState('work'); // 'work' | 'short' | 'long'
  const [remaining, setRemaining] = useState(settings.work * 60);
  const [running, setRunning] = useState(false);
  const [sessions, setSessions] = useState(0);
  const [sessionLog, setSessionLog] = useState(() => {
    try { return JSON.parse(localStorage.getItem('pomo_log') || '[]'); } catch { return []; }
  });
  const [showSettings, setShowSettings] = useState(false);
  const intervalRef = useRef(null);

  const totalSec = (() => {
    if (mode === 'work') return settings.work * 60;
    if (mode === 'short') return settings.shortBreak * 60;
    return settings.longBreak * 60;
  })();

  const fraction = totalSec > 0 ? remaining / totalSec : 1;
  const dashOffset = CIRC * (1 - fraction);
  const strokeColor = mode === 'work' ? '#8b5cf6' : mode === 'short' ? '#22c55e' : '#3b82f6';

  // tick
  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setRemaining(r => {
          if (r <= 1) {
            clearInterval(intervalRef.current);
            setRunning(false);
            handleComplete();
            return 0;
          }
          return r - 1;
        });
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [running, mode]);

  const handleComplete = () => {
    const label = mode === 'work' ? 'Work' : mode === 'short' ? 'Short Break' : 'Long Break';
    const entry = { mode: label, duration: totalSec, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    const updated = [entry, ...sessionLog].slice(0, 20);
    setSessionLog(updated);
    localStorage.setItem('pomo_log', JSON.stringify(updated));
    if (mode === 'work') {
      const next = sessions + 1;
      setSessions(next);
      if (next % settings.longAfter === 0) switchMode('long');
      else switchMode('short');
    } else {
      switchMode('work');
    }
  };

  const switchMode = (m) => {
    setMode(m);
    setRunning(false);
    setRemaining(m === 'work' ? settings.work * 60 : m === 'short' ? settings.shortBreak * 60 : settings.longBreak * 60);
  };

  const handleStartPause = () => setRunning(r => !r);
  const handleReset = () => { setRunning(false); setRemaining(totalSec); };
  const handleSkip = () => { setRunning(false); handleComplete(); };

  const saveSettings = (s) => {
    setSettings(s);
    localStorage.setItem('pomo_settings', JSON.stringify(s));
    switchMode('work');
    setSessions(0);
    setShowSettings(false);
  };

  const modeLabels = { work: 'Focus Time', short: 'Short Break', long: 'Long Break' };

  return (
    <div>
      <div className="section-header">
        <div>
          <h2 className="section-title">Pomodoro Timer</h2>
          <p className="section-sub">Boost your focus with timed work sessions</p>
        </div>
        <button className="btn btn-ghost" onClick={() => setShowSettings(s => !s)}>
          {showSettings ? 'Hide Settings' : 'Settings'}
        </button>
      </div>

      {showSettings && (
        <div className="card mb-16">
          <SettingsForm settings={settings} onSave={saveSettings} onCancel={() => setShowSettings(false)} />
        </div>
      )}

      {/* Mode selector */}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 24 }}>
        {['work', 'short', 'long'].map(m => (
          <button key={m} className={`btn ${mode === m ? 'btn-primary' : 'btn-ghost'}`} onClick={() => switchMode(m)} style={{ minWidth: 120 }}>
            {m === 'work' ? `Focus (${settings.work}m)` : m === 'short' ? `Short Break (${settings.shortBreak}m)` : `Long Break (${settings.longBreak}m)`}
          </button>
        ))}
      </div>

      {/* Ring */}
      <div className="card pomo-card">
        <div className="pomo-mode-label" style={{ color: strokeColor }}>{modeLabels[mode]}</div>

        <div className="pomo-ring-wrap">
          <svg width="220" height="220" viewBox="0 0 220 220">
            <circle cx="110" cy="110" r={RADIUS} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="14" />
            <circle
              cx="110" cy="110" r={RADIUS}
              fill="none"
              stroke={strokeColor}
              strokeWidth="14"
              strokeLinecap="round"
              strokeDasharray={CIRC}
              strokeDashoffset={dashOffset}
              transform="rotate(-90 110 110)"
              style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.4s' }}
            />
          </svg>
          <div className="pomo-time-overlay">
            <div className="pomo-time">{fmtSec(remaining)}</div>
            <div className="pomo-sessions">Session {sessions + 1}</div>
          </div>
        </div>

        <div className="pomo-controls">
          <button className="btn btn-ghost pomo-btn-sm" onClick={handleReset} title="Reset">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg>
          </button>
          <button className={`btn pomo-btn-main ${running ? 'btn-danger' : 'btn-primary'}`} onClick={handleStartPause}>
            {running ? 'Pause' : remaining === totalSec ? 'Start' : 'Resume'}
          </button>
          <button className="btn btn-ghost pomo-btn-sm" onClick={handleSkip} title="Skip">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19"/></svg>
          </button>
        </div>

        {/* session dots */}
        <div className="pomo-dots">
          {Array.from({ length: settings.longAfter }, (_, i) => (
            <div key={i} className={`pomo-dot ${i < (sessions % settings.longAfter) ? 'pomo-dot-filled' : ''}`} />
          ))}
        </div>
        <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 4 }}>
          {sessions} sessions completed today
        </div>
      </div>

      {/* Session log */}
      {sessionLog.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-muted)' }}>SESSION LOG</h3>
            <button className="btn-text" onClick={() => { setSessionLog([]); localStorage.removeItem('pomo_log'); }}>Clear</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {sessionLog.map((s, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: 6, fontSize: 13 }}>
                <span>
                  <span className={`badge ${s.mode === 'Work' ? 'badge-purple' : 'badge-green'}`} style={{ marginRight: 8 }}>{s.mode}</span>
                  {Math.round(s.duration / 60)} min
                </span>
                <span style={{ color: 'var(--text-muted)' }}>{s.time}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SettingsForm({ settings, onSave, onCancel }) {
  const [s, setS] = useState({ ...settings });
  const set = (k, v) => setS(x => ({ ...x, [k]: Math.max(1, parseInt(v) || 1) }));
  return (
    <div>
      <h3 style={{ marginBottom: 14, fontSize: 14, fontWeight: 600 }}>Timer Settings</h3>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Focus Duration (min)</label>
          <input className="inp" type="number" min="1" max="120" value={s.work} onChange={e => set('work', e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Short Break (min)</label>
          <input className="inp" type="number" min="1" max="60" value={s.shortBreak} onChange={e => set('shortBreak', e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Long Break (min)</label>
          <input className="inp" type="number" min="1" max="60" value={s.longBreak} onChange={e => set('longBreak', e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Long Break After</label>
          <input className="inp" type="number" min="2" max="8" value={s.longAfter} onChange={e => set('longAfter', e.target.value)} />
        </div>
      </div>
      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
        <button className="btn btn-primary" onClick={() => onSave(s)}>Save & Reset</button>
      </div>
    </div>
  );
}
