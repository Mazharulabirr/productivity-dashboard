import { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import Sidebar from './components/layout/Sidebar';
import Topbar from './components/layout/Topbar';
import Overview from './components/overview/Overview';
import Tasks from './components/tasks/Tasks';
import Clients from './components/clients/Clients';
import Skills from './components/skills/Skills';
import Attendance from './components/attendance/Attendance';
import Habits from './components/habits/Habits';
import Income from './components/income/Income';
import Stats from './components/stats/Stats';
import Pomodoro from './components/pomodoro/Pomodoro';
import Notes from './components/notes/Notes';
import PinLock, { usePinLock } from './components/lock/PinLock';
import Profile from './components/profile/Profile';
import './styles/main.css';

const SECTION_MAP = {
  overview: Overview,
  tasks: Tasks,
  clients: Clients,
  skills: Skills,
  attendance: Attendance,
  habits: Habits,
  income: Income,
  stats: Stats,
  pomodoro: Pomodoro,
  notes: Notes,
  profile: Profile,
};

function Dashboard({ lock }) {
  const { section } = useApp();
  const [collapsed, setCollapsed] = useState(false);
  const SectionComponent = SECTION_MAP[section] || Overview;

  return (
    <div className="app-shell">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />
      <div id="main">
        <Topbar onToggle={() => setCollapsed(c => !c)} onLock={lock} />
        <div id="content">
          <SectionComponent />
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const { locked, unlock, lock } = usePinLock();

  if (locked) {
    return <PinLock onUnlock={unlock} />;
  }

  return (
    <AppProvider>
      <Dashboard lock={lock} />
    </AppProvider>
  );
}
