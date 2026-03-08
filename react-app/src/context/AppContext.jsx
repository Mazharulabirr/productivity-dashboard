import { createContext, useContext, useState, useCallback } from 'react';
import { store } from '../store';
import { uid, todayStr } from '../utils';
import { useTimers } from '../hooks/useTimers';

const AppContext = createContext(null);

const PROFILE_KEY = 'user_profile';

export function AppProvider({ children }) {
  const [section, setSection] = useState('overview');
  const timers = useTimers();

  // ── Generic CRUD helpers ──────────────────────────────
  const getList = (key) => store.get(key, []);
  const setList = (key, val) => store.set(key, val);

  // Force re-render on data changes using a simple counter
  const [revision, setRevision] = useState(0);
  const bump = useCallback(() => setRevision(r => r + 1), []);

  // ── Tasks ─────────────────────────────────────────────
  const getTasks = () => getList('tasks');
  const saveTask = (data, editId) => {
    const tasks = getTasks();
    if (editId) {
      const idx = tasks.findIndex(t => t.id === editId);
      if (idx !== -1) {
        if (data.status === 'completed' && tasks[idx].status !== 'completed') data.completedDate = todayStr();
        tasks[idx] = { ...tasks[idx], ...data };
      }
    } else {
      if (data.status === 'completed') data.completedDate = todayStr();
      tasks.unshift({ id: uid(), createdAt: todayStr(), ...data });
    }
    setList('tasks', tasks); bump();
  };
  const deleteTask = (id) => { setList('tasks', getTasks().filter(t => t.id !== id)); bump(); };
  const toggleTask = (id) => {
    const tasks = getTasks();
    const t = tasks.find(x => x.id === id);
    if (t) {
      t.status = t.status === 'completed' ? 'pending' : 'completed';
      if (t.status === 'completed') t.completedDate = todayStr(); else delete t.completedDate;
      setList('tasks', tasks); bump();
    }
  };

  // ── Clients ───────────────────────────────────────────
  const getClients = () => getList('clients');
  const saveClient = (data, editId) => {
    const clients = getClients();
    if (editId) {
      const idx = clients.findIndex(c => c.id === editId);
      if (idx !== -1) clients[idx] = { ...clients[idx], ...data };
    } else {
      clients.unshift({ id: uid(), date: todayStr(), ...data });
    }
    setList('clients', clients); bump();
  };
  const deleteClient = (id) => { setList('clients', getClients().filter(c => c.id !== id)); bump(); };

  // ── Skills ────────────────────────────────────────────
  const getSkills = () => getList('skills');
  const saveSkill = (data, editId) => {
    const skills = getSkills();
    if (editId) {
      const idx = skills.findIndex(s => s.id === editId);
      if (idx !== -1) skills[idx] = { ...skills[idx], ...data };
    } else {
      skills.unshift({ id: uid(), ...data });
    }
    setList('skills', skills); bump();
  };
  const deleteSkill = (id) => { setList('skills', getSkills().filter(s => s.id !== id)); bump(); };

  // ── Courses ───────────────────────────────────────────
  const getCourses = () => getList('courses');
  const saveCourse = (data, editId) => {
    const courses = getCourses();
    if (editId) {
      const idx = courses.findIndex(c => c.id === editId);
      if (idx !== -1) {
        const old = courses[idx].lessons || [];
        data.lessons = data.lessons.map(l => {
          const prev = old.find(o => o.title === l.title);
          return prev ? { ...l, done: prev.done } : l;
        });
        courses[idx] = { ...courses[idx], ...data };
      }
    } else {
      courses.unshift({ id: uid(), createdAt: todayStr(), ...data });
    }
    setList('courses', courses); bump();
  };
  const deleteCourse = (id) => { setList('courses', getCourses().filter(c => c.id !== id)); bump(); };
  const toggleLesson = (courseId, lessonId) => {
    const courses = getCourses();
    const c = courses.find(x => x.id === courseId);
    if (c) { const l = c.lessons.find(x => x.id === lessonId); if (l) l.done = !l.done; }
    setList('courses', courses); bump();
  };

  // ── Habits ────────────────────────────────────────────
  const getHabits = () => getList('habits');
  const saveHabit = (name) => {
    const habits = getHabits();
    habits.push({ id: uid(), name, days: {} });
    setList('habits', habits); bump();
  };
  const deleteHabit = (id) => { setList('habits', getHabits().filter(h => h.id !== id)); bump(); };
  const toggleHabitDay = (id, dateStr) => {
    const habits = getHabits();
    const h = habits.find(x => x.id === id);
    if (h) { if (!h.days) h.days = {}; h.days[dateStr] = !h.days[dateStr]; }
    setList('habits', habits); bump();
  };

  // ── Profile ───────────────────────────────────────────
  const getProfileData = () => {
    try { return JSON.parse(localStorage.getItem(PROFILE_KEY)) || {}; } catch { return {}; }
  };
  const saveProfileData = (data) => {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(data));
    bump();
  };

  // ── Income ────────────────────────────────────────────
  const getIncomes = () => getList('incomes');
  const saveIncome = (data, editId) => {
    const incomes = getIncomes();
    if (editId) {
      const idx = incomes.findIndex(i => i.id === editId);
      if (idx !== -1) incomes[idx] = { ...incomes[idx], ...data };
    } else {
      incomes.unshift({ id: uid(), ...data });
    }
    setList('incomes', incomes); bump();
  };
  const deleteIncome = (id) => { setList('incomes', getIncomes().filter(i => i.id !== id)); bump(); };

  return (
    <AppContext.Provider value={{
      section, setSection, revision,
      timers,
      getTasks, saveTask, deleteTask, toggleTask,
      getClients, saveClient, deleteClient,
      getSkills, saveSkill, deleteSkill,
      getCourses, saveCourse, deleteCourse, toggleLesson,
      getHabits, saveHabit, deleteHabit, toggleHabitDay,
      getIncomes, saveIncome, deleteIncome,
      getProfileData, saveProfileData,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
