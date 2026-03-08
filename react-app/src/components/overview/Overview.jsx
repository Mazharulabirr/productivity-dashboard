import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { store } from '../../store';
import { todayStr, getGreeting, getDailyQuote } from '../../utils';
import TimerLog from './TimerLog';

const QUICK_LINKS = [
  { href: 'https://www.upwork.com', label: 'Upwork', icon: <svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.561 13.158c-1.102 0-2.135-.467-3.074-1.227l.228-1.076.008-.042c.207-1.143.849-3.06 2.839-3.06 1.492 0 2.703 1.212 2.703 2.703-.001 1.489-1.212 2.702-2.704 2.702zm0-8.14c-2.539 0-4.51 1.649-5.31 4.366-1.22-1.834-2.148-4.036-2.687-5.892H7.828v7.112c-.002 1.406-1.141 2.546-2.547 2.546-1.405 0-2.543-1.14-2.543-2.546V3.492H0v7.112c0 2.914 2.37 5.303 5.281 5.303 2.913 0 5.283-2.389 5.283-5.303v-1.19c.529 1.107 1.182 2.228 1.974 3.221l-1.673 7.873h2.797l1.213-5.71c1.063.679 2.285 1.109 3.686 1.109 3 0 5.439-2.452 5.439-5.45 0-3-2.439-5.439-5.439-5.439z"/></svg> },
  { href: 'https://mail.google.com', label: 'Gmail', icon: <svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg> },
  { href: 'https://github.com', label: 'GitHub', icon: <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/></svg> },
  { href: 'https://www.youtube.com', label: 'YouTube', icon: <svg viewBox="0 0 24 24" fill="currentColor"><path d="M23.495 6.205a3.007 3.007 0 00-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 00.527 6.205a31.247 31.247 0 00-.522 5.805 31.247 31.247 0 00.522 5.783 3.007 3.007 0 002.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 002.088-2.088 31.247 31.247 0 00.5-5.783 31.247 31.247 0 00-.5-5.805zM9.609 15.601V8.408l6.264 3.602z"/></svg> },
];

export default function Overview() {
  const { getTasks, getClients, getSkills, getIncomes, timers, revision, getProfileData } = useApp();
  const today = todayStr();
  const profile = getProfileData();
  const greeting = getGreeting(profile.nickname || profile.name || '');
  const quote = getDailyQuote();
  const [goal, setGoal] = useState(() => store.getStr('goal_' + today, ''));
  const [goalSaved, setGoalSaved] = useState(false);

  const tasks = getTasks();
  const doneTasks = tasks.filter(t => t.status === 'completed' && t.completedDate === today).length;

  const { workMs, learnMs } = timers.getWorkLearnMs();
  let wMs = workMs, lMs = learnMs;
  if (wMs === 0) {
    wMs = getClients().filter(c => c.date === today).reduce((s, c) => s + (parseFloat(c.hours) || 0), 0) * 3600000;
  }
  if (lMs === 0) {
    lMs = getSkills().filter(s => s.dateUpdated === today).reduce((s2, s) => s2 + (parseFloat(s.hrsToday) || 0), 0) * 3600000;
  }

  const incomes = getIncomes();
  const ym = today.slice(0, 7);
  const monthEarn = incomes.filter(i => i.status === 'Received' && i.date?.slice(0, 7) === ym)
    .reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
  const incomeGoal = parseFloat(profile.incomeGoal) || 0;
  const incomeGoalPct = incomeGoal > 0 ? Math.min(100, Math.round((monthEarn / incomeGoal) * 100)) : 0;

  const saveGoal = () => {
    if (!goal.trim()) return;
    store.setStr('goal_' + today, goal);
    setGoalSaved(true);
    setTimeout(() => setGoalSaved(false), 1400);
  };

  return (
    <div className="overview-page">
      {/* Welcome + Goal */}
      <div className="welcome-banner">
        <div>
          <div className="welcome-greeting">{greeting.emoji} {greeting.text}</div>
          <div className="welcome-date">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
        </div>
      </div>

      <div className="goal-card mb-20">
        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#f97316" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
        <input
          type="text"
          placeholder="Set your main goal for today..."
          value={goal}
          onChange={e => setGoal(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && saveGoal()}
        />
        <button className="btn btn-primary btn-sm" onClick={saveGoal}>{goalSaved ? '✓ Saved' : 'Save'}</button>
      </div>

      {/* Stat cards */}
      <div className="overview-grid mb-20">
        <StatCard icon={<svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#f97316" strokeWidth="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>} bg="rgba(249,115,22,.12)" value={doneTasks} label="Tasks Completed Today" />
        <StatCard icon={<svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#3b82f6" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>} bg="rgba(59,130,246,.12)" value={(wMs / 3600000).toFixed(1)} label="Work Hours Today" />
        <StatCard icon={<svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#a855f7" strokeWidth="2"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>} bg="rgba(168,85,247,.12)" value={(lMs / 3600000).toFixed(1)} label="Learning Hours Today" />
        <StatCard icon={<svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#22c55e" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>} bg="rgba(34,197,94,.12)" value={'$' + monthEarn.toLocaleString()} label={incomeGoal > 0 ? `This Month (${incomeGoalPct}% of $${incomeGoal.toLocaleString()} goal)` : 'This Month Earnings'} progress={incomeGoal > 0 ? incomeGoalPct : null} />
      </div>

      {/* Timer log */}
      <TimerLog />

      {/* Quote */}
      <div className="quote-block mb-20">"{quote}"</div>

      {/* Quick links */}
      <div className="card">
        <div className="card-title">
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          Quick Links
        </div>
        <div className="grid-4">
          {QUICK_LINKS.map(lk => (
            <a key={lk.label} className="quick-link" href={lk.href} target="_blank" rel="noopener noreferrer">
              <span style={{ width: 22, height: 22 }}>{lk.icon}</span>
              {lk.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, bg, value, label, progress }) {
  return (
    <div className="stat-card">
      <div className="stat-icon" style={{ background: bg }}>{icon}</div>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
      {progress != null && (
        <div className="stat-progress-bar">
          <div className="stat-progress-fill" style={{ width: `${progress}%` }} />
        </div>
      )}
    </div>
  );
}
