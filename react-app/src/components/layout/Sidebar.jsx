import { useApp } from '../../context/AppContext';
function SidebarAvatar({ profile, onClick, collapsed }) {
  const initials = (() => {
    const n = (profile.name || '').trim();
    if (!n) return '?';
    const parts = n.split(' ').filter(Boolean);
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : n.slice(0, 2).toUpperCase();
  })();
  return (
    <button className="sidebar-avatar-btn" onClick={onClick} title={profile.name || 'Profile'}>
      <div className="sidebar-avatar-circle" style={{ background: profile.avatarImg ? 'transparent' : (profile.avatarColor || '#f97316') }}>
        {profile.avatarImg
          ? <img src={profile.avatarImg} alt="" className="sidebar-avatar-img" />
          : <span>{initials}</span>}
      </div>
      {!collapsed && (
        <div className="sidebar-avatar-info">
          <div className="sidebar-avatar-name">{profile.name || 'Your Name'}</div>
          <div className="sidebar-avatar-role">{profile.role || 'Freelancer'}</div>
        </div>
      )}
    </button>
  );
}

const NAV_ITEMS = [
  { section: 'overview',   label: 'Overview',    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg> },
  { section: 'tasks',      label: 'Tasks',       icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg> },
  { section: 'clients',    label: 'Clients',     icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></svg> },
  { section: 'skills',     label: 'Skills',      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg> },
  { section: 'attendance', label: 'Attendance',  icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> },
  { section: 'habits',     label: 'Habits',      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg> },
  { section: 'income',     label: 'Income',      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg> },
  { section: 'stats',      label: 'Statistics',  icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> },
  { section: 'pomodoro',   label: 'Pomodoro',    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> },
  { section: 'notes',      label: 'Notes',       icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg> },
  { section: 'profile',    label: 'Profile',     icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> },
];

const SECTION_TITLES = {
  overview: 'Daily Overview', tasks: 'Task Manager', clients: 'Client Work Tracker',
  skills: 'Skill Learning Tracker', attendance: 'Attendance Tracker', habits: 'Habit Tracker',
  income: 'Income Tracker', stats: 'Weekly Statistics', pomodoro: 'Pomodoro Timer', notes: 'Notes',
  profile: 'Profile & Settings',
};

export default function Sidebar({ collapsed, onToggle }) {
  const { section, setSection, getProfileData } = useApp();
  const profile = getProfileData();

  return (
    <aside id="sidebar" className={`sidebar${collapsed ? ' collapsed' : ''}`}>
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2.5">
            <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
          </svg>
        </div>
        {!collapsed && <span className="sidebar-brand">Productivity</span>}
      </div>
      <nav className="sidebar-nav">
        {NAV_ITEMS.map(item => (
          <button
            key={item.section}
            className={`nav-item${section === item.section ? ' active' : ''}`}
            onClick={() => setSection(item.section)}
            title={collapsed ? item.label : ''}
          >
            <span className="nav-icon">{item.icon}</span>
            {!collapsed && <span className="nav-label">{item.label}</span>}
          </button>
        ))}
      </nav>
      <SidebarAvatar profile={profile} onClick={() => setSection('profile')} collapsed={collapsed} />
    </aside>
  );
}

export { SECTION_TITLES };
