/* ═══════════════════════════════════════════════════════════
   PRODUCTIVITY DASHBOARD — script.js
   All data persisted in localStorage
   ═══════════════════════════════════════════════════════════ */

'use strict';

/* ── Quotes ── */
const QUOTES = [
  "Every day is a new chance to be better than yesterday.",
  "Focus on progress, not perfection.",
  "Small daily steps build extraordinary results.",
  "Consistency beats intensity every time.",
  "Your only competition is who you were yesterday.",
  "Work hard in silence; let success make the noise.",
  "The secret of getting ahead is getting started.",
  "One task at a time. One day at a time.",
  "Discipline is the bridge between goals and accomplishment.",
  "You don't have to be great to start, but you have to start to be great.",
  "Success is the sum of small efforts repeated day in and day out.",
  "Believe you can and you're halfway there.",
  "Don't watch the clock; do what it does — keep going.",
  "The harder you work for something, the greater you'll feel when you achieve it.",
  "Great things never come from comfort zones.",
];

/* ── localStorage helpers ── */
const store = {
  get: (key, fallback = []) => {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
  },
  set: (key, val) => { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} },
  getStr: (key, fallback = '') => { return localStorage.getItem(key) ?? fallback; },
  setStr: (key, val) => { localStorage.setItem(key, val); },
};

/* ── UID ── */
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

/* ── Today string YYYY-MM-DD ── */
const todayStr = () => new Date().toISOString().slice(0, 10);

/* ── Week day labels (Mon-Sun) ── */
function lastSevenDays() {
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const result = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    result.push({ label: days[d.getDay()], date: d.toISOString().slice(0,10) });
  }
  return result;
}

/* ── Charts instances ── */
let chartWork = null, chartTasks = null;

/* ══════════════════════════════════════════════════════
   APP OBJECT
══════════════════════════════════════════════════════ */
const App = {

  /* ── Edit-mode state ── */
  _editId: { task: null, client: null, skill: null, income: null, course: null },
  _activeTimers: {}, // { id: { startedAt, interval, type, name } }
  _ovTickInterval: null, // live-updates overview stats while any timer runs

  /* ══════════════════════
     NAVIGATION
  ══════════════════════ */
  navigate(section) {
    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.section === section);
    });
    document.querySelectorAll('.section-panel').forEach(el => {
      el.classList.toggle('active', el.id === 'sec-' + section);
    });
    document.getElementById('topbar-title').textContent = {
      overview:   'Daily Overview',
      tasks:      'Task Manager',
      clients:    'Client Work Tracker',
      skills:     'Skill Learning Tracker',
      attendance: 'Attendance Tracker',
      habits:     'Habit Tracker',
      income:     'Income Tracker',
      stats:      'Weekly Statistics',
      pomodoro:   'Pomodoro Timer',
      notes:      'Notes',
    }[section] || 'Dashboard';

    if (section === 'stats')      App.renderCharts();
    if (section === 'overview')   App.updateOverviewStats();
    if (section === 'attendance') App.attLoad();
  },

  /* ══════════════════════
     SIDEBAR TOGGLE
  ══════════════════════ */
  toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('collapsed');
  },

  /* ══════════════════════
     CLOCK & DATE
  ══════════════════════ */
  startClock() {
    const tick = () => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      document.getElementById('clock').textContent = timeStr;
      document.getElementById('topbar-date').textContent = dateStr;
    };
    tick();
    setInterval(tick, 1000);
  },

  /* ══════════════════════
     WELCOME GREETING
  ══════════════════════ */
  setWelcomeGreeting() {
    const hour = new Date().getHours();
    let greet = 'Good morning';
    if (hour >= 12 && hour < 17) greet = 'Good afternoon';
    else if (hour >= 17) greet = 'Good evening';
    const emoji = hour < 12 ? '☀️' : hour < 17 ? '👋' : '🌙';
    const el = document.getElementById('welcome-greeting');
    if (el) el.textContent = `${greet}, Abir! ${emoji}`;
    const dateEl = document.getElementById('welcome-date');
    if (dateEl) {
      dateEl.textContent = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    }
  },

  /* ══════════════════════
     DAILY QUOTE
  ══════════════════════ */
  setDailyQuote() {
    const today = todayStr();
    const idx = today.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % QUOTES.length;
    document.getElementById('daily-quote').textContent = `"${QUOTES[idx]}"`;
  },

  /* ══════════════════════
     GOAL
  ══════════════════════ */
  saveGoal() {
    const val = document.getElementById('today-goal').value.trim();
    if (!val) return;
    store.setStr('goal_' + todayStr(), val);
    this.flash('today-goal');
  },
  loadGoal() {
    const val = store.getStr('goal_' + todayStr(), '');
    document.getElementById('today-goal').value = val;
  },

  /* ══════════════════════
     OVERVIEW STATS
  ══════════════════════ */
  updateOverviewStats() {
    const today = todayStr();
    const tasks = store.get('tasks');
    const doneTasks = tasks.filter(t => t.status === 'completed' && t.completedDate === today).length;
    document.getElementById('ov-tasks-done').textContent = doneTasks;

    // Work / learn hours: timer-based (fall back to manual entries)
    const timerLog = store.get(this._timerKey(), {});
    let workMs = 0, learnMs = 0;
    Object.values(timerLog).forEach(e => {
      if (e.type === 'task' || e.type === 'client') workMs += (e.elapsed || 0);
      if (e.type === 'skill') learnMs += (e.elapsed || 0);
    });
    Object.entries(this._activeTimers).forEach(([, a]) => {
      const r = Date.now() - a.startedAt;
      if (a.type === 'task' || a.type === 'client') workMs += r;
      if (a.type === 'skill') learnMs += r;
    });
    if (workMs === 0) {
      const clients = store.get('clients');
      workMs = clients.filter(c => c.date === today).reduce((s, c) => s + (parseFloat(c.hours) || 0), 0) * 3600000;
    }
    if (learnMs === 0) {
      const skills = store.get('skills');
      learnMs = skills.filter(s => s.dateUpdated === today).reduce((s2, s) => s2 + (parseFloat(s.hrsToday) || 0), 0) * 3600000;
    }
    document.getElementById('ov-work-hrs').textContent = (workMs / 3600000).toFixed(1);
    document.getElementById('ov-learn-hrs').textContent = (learnMs / 3600000).toFixed(1);

    // This month earnings
    const incomes = store.get('incomes');
    const ym = today.slice(0, 7);
    const monthEarn = incomes.filter(i => i.status === 'Received' && i.date && i.date.slice(0,7) === ym)
      .reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
    document.getElementById('ov-earnings').textContent = '$' + monthEarn.toLocaleString();
    this._renderTimerLog();
  },

  /* ══════════════════════
     PER-ITEM TIMERS
  ══════════════════════ */
  _timerKey() { return 'timelog_' + todayStr(); },

  timerGetSaved(id) {
    return store.get(this._timerKey(), {})[id] || { elapsed: 0 };
  },

  _fmtMs(ms) {
    if (!ms || ms < 1000) return '00:00';
    const s   = Math.floor(ms / 1000);
    const h   = Math.floor(s / 3600);
    const m   = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return h + ':' + String(m).padStart(2,'0') + ':' + String(sec).padStart(2,'0');
    return String(m).padStart(2,'0') + ':' + String(sec).padStart(2,'0');
  },

  _timerHtml(id, type) {
    const saved  = this.timerGetSaved(id).elapsed || 0;
    const extra  = this._activeTimers[id] ? Date.now() - this._activeTimers[id].startedAt : 0;
    const active = !!this._activeTimers[id];
    const timeStr = this._fmtMs(saved + extra);
    return '<span id="timer-display-' + id + '" class="timer-display' + (active ? ' timer-live-text' : '') + '">' + timeStr + '</span>'
      + '<button id="timer-btn-' + id + '" class="btn-icon timer-btn' + (active ? ' timer-running' : '') + '"'
      + ' onclick="App.timerToggle(\'' + id + '\',\'' + type + '\')" title="' + (active ? 'Stop' : 'Start') + ' timer">'
      + '<svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">'
      + (active
        ? '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>'
        : '<polygon points="5 3 19 12 5 21 5 3"/>'
      )
      + '</svg></button>';
  },

  timerToggle(id, type) {
    if (this._activeTimers[id]) { this.timerStop(id); } else { this.timerStart(id, type); }
  },

  timerStart(id, type, resumeAt) {
    if (this._activeTimers[id]) return;
    let name = id;
    if (type === 'task')   { const t = store.get('tasks').find(x => x.id === id);   name = t ? t.name : id; }
    if (type === 'skill')  { const s = store.get('skills').find(x => x.id === id);  name = s ? s.name : id; }
    if (type === 'client') { const c = store.get('clients').find(x => x.id === id); name = c ? c.client + ' — ' + c.project : id; }
    const startedAt = resumeAt || Date.now();
    const interval  = setInterval(() => {
      const ms = (this.timerGetSaved(id).elapsed || 0) + (Date.now() - startedAt);
      const el = document.getElementById('timer-display-' + id);
      if (el) el.textContent = this._fmtMs(ms);
    }, 1000);
    this._activeTimers[id] = { startedAt, interval, type, name };

    // Persist running state so page refresh can restore it
    const running = store.get('timer_running', {});
    running[id] = { startedAt, type, name };
    store.set('timer_running', running);

    // Start the overview live-refresh tick if not already running
    if (!this._ovTickInterval) {
      this._ovTickInterval = setInterval(() => {
        const ov = document.getElementById('sec-overview');
        if (ov && ov.classList.contains('active')) this.updateOverviewStats();
      }, 1000);
    }

    const btn = document.getElementById('timer-btn-' + id);
    if (btn) {
      btn.classList.add('timer-running');
      btn.title = 'Stop timer';
      btn.innerHTML = '<svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';
    }
    const disp = document.getElementById('timer-display-' + id);
    if (disp) disp.classList.add('timer-live-text');
  },

  timerStop(id) {
    const active = this._activeTimers[id];
    if (!active) return;
    clearInterval(active.interval);
    const elapsed = Date.now() - active.startedAt;
    const log = store.get(this._timerKey(), {});
    const prev = log[id] || { elapsed: 0 };
    log[id] = { elapsed: prev.elapsed + elapsed, type: active.type, name: active.name };
    store.set(this._timerKey(), log);
    delete this._activeTimers[id];

    // Remove from persistent running state
    const running = store.get('timer_running', {});
    delete running[id];
    store.set('timer_running', running);

    const btn  = document.getElementById('timer-btn-' + id);
    const disp = document.getElementById('timer-display-' + id);
    if (btn)  {
      btn.classList.remove('timer-running');
      btn.title = 'Start timer';
      btn.innerHTML = '<svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>';
    }
    if (disp) { disp.textContent = this._fmtMs(log[id].elapsed); disp.classList.remove('timer-live-text'); }

    // Stop the overview tick when no timers remain
    if (!Object.keys(this._activeTimers).length && this._ovTickInterval) {
      clearInterval(this._ovTickInterval);
      this._ovTickInterval = null;
    }

    this._renderTimerLog();
    this.updateOverviewStats();
  },

  timerStopAll() {
    Object.keys({ ...this._activeTimers }).forEach(id => this.timerStop(id));
  },

  _renderTimerLog() {
    const el = document.getElementById('ov-timer-log');
    if (!el) return;
    const log    = store.get(this._timerKey(), {});
    const allIds = new Set([...Object.keys(log), ...Object.keys(this._activeTimers)]);
    const entries = [];
    allIds.forEach(id => {
      const savedMs = (log[id] || { elapsed: 0 }).elapsed;
      const runMs   = this._activeTimers[id] ? Date.now() - this._activeTimers[id].startedAt : 0;
      const elapsed = savedMs + runMs;
      if (elapsed < 1000) return;
      const meta = this._activeTimers[id] || log[id] || {};
      entries.push({ id, elapsed, type: meta.type || '?', name: meta.name || id, live: !!this._activeTimers[id] });
    });
    if (!entries.length) {
      el.innerHTML = '<div class="text-muted text-sm" style="padding:6px 0">No timer sessions yet — press ▶ on any task, skill or project to start tracking.</div>';
      return;
    }
    const typeColor = { task: 'badge-orange', skill: 'badge-purple', client: 'badge-blue' };
    const typeLabel = { task: 'Task', skill: 'Skill', client: 'Project' };
    el.innerHTML = entries
      .sort((a, b) => b.elapsed - a.elapsed)
      .map(e => '<div class="timer-log-row">'
        + '<span class="badge ' + (typeColor[e.type] || 'badge-muted') + '" style="min-width:54px;justify-content:center">' + (typeLabel[e.type] || e.type) + '</span>'
        + '<span class="timer-log-name">' + this._esc(e.name) + '</span>'
        + '<span class="timer-log-time' + (e.live ? ' timer-live-text' : '') + '">' + this._fmtMs(e.elapsed) + '</span>'
        + '</div>').join('');
  },

  /* ══════════════════════
     MODAL HELPERS
  ══════════════════════ */
  openModal(id) { document.getElementById(id).classList.remove('hidden'); },
  closeModal(id) { document.getElementById(id).classList.add('hidden'); },

  /* ══════════════════════
     TASKS
  ══════════════════════ */
  openTaskModal(id = null) {
    this._editId.task = id;
    document.getElementById('task-modal-title').textContent = id ? 'Edit Task' : 'Add Task';
    if (id) {
      const t = store.get('tasks').find(x => x.id === id);
      if (t) {
        document.getElementById('t-name').value = t.name;
        document.getElementById('t-type').value = t.type;
        document.getElementById('t-priority').value = t.priority;
        document.getElementById('t-status').value = t.status;
        document.getElementById('t-deadline').value = t.deadline || '';
        document.getElementById('t-time').value = t.time || '';
      }
    } else {
      ['t-name','t-deadline','t-time'].forEach(i => document.getElementById(i).value = '');
      document.getElementById('t-type').value = 'Client Work';
      document.getElementById('t-priority').value = 'Medium';
      document.getElementById('t-status').value = 'pending';
    }
    this.openModal('task-modal');
    setTimeout(() => document.getElementById('t-name').focus(), 80);
  },

  saveTask() {
    const name = document.getElementById('t-name').value.trim();
    if (!name) { this.shake('t-name'); return; }
    const tasks = store.get('tasks');
    const data = {
      name,
      type:     document.getElementById('t-type').value,
      priority: document.getElementById('t-priority').value,
      status:   document.getElementById('t-status').value,
      deadline: document.getElementById('t-deadline').value,
      time:     document.getElementById('t-time').value,
    };
    if (this._editId.task) {
      const idx = tasks.findIndex(t => t.id === this._editId.task);
      if (idx !== -1) {
        if (data.status === 'completed' && tasks[idx].status !== 'completed') data.completedDate = todayStr();
        tasks[idx] = { ...tasks[idx], ...data };
      }
    } else {
      if (data.status === 'completed') data.completedDate = todayStr();
      tasks.unshift({ id: uid(), createdAt: todayStr(), ...data });
    }
    store.set('tasks', tasks);
    this.closeModal('task-modal');
    this.renderTasks();
    this.updateOverviewStats();
  },

  deleteTask(id) {
    if (!confirm('Delete this task?')) return;
    store.set('tasks', store.get('tasks').filter(t => t.id !== id));
    this.renderTasks();
    this.updateOverviewStats();
  },

  toggleTaskDone(id) {
    const tasks = store.get('tasks');
    const t = tasks.find(x => x.id === id);
    if (!t) return;
    t.status = t.status === 'completed' ? 'pending' : 'completed';
    if (t.status === 'completed') t.completedDate = todayStr(); else delete t.completedDate;
    store.set('tasks', tasks);
    this.renderTasks();
    this.updateOverviewStats();
  },

  _taskFilter: 'all',
  renderTasks() {
    const tasks = store.get('tasks');
    const f = this._taskFilter;
    const filtered = tasks.filter(t => {
      if (f === 'all') return true;
      if (['pending','in-progress','completed'].includes(f)) return t.status === f;
      return t.type === f;
    });
    const list = document.getElementById('task-list');
    const empty = document.getElementById('task-empty');
    if (!filtered.length) { list.innerHTML = ''; empty.classList.remove('hidden'); return; }
    empty.classList.add('hidden');
    list.innerHTML = filtered.map(t => {
      const prioClass = { High: 'prio-high', Medium: 'prio-medium', Low: 'prio-low' }[t.priority] || 'badge-muted';
      const typeColor = { 'Client Work': 'badge-orange', 'Learning': 'badge-purple', 'Personal': 'badge-blue' }[t.type] || 'badge-muted';
      const statusColor = { 'pending': 'badge-muted', 'in-progress': 'badge-yellow', 'completed': 'badge-green' }[t.status] || 'badge-muted';
      const dl = (t.deadline || t.time) ? `<span class="text-muted text-sm">${[t.deadline, t.time].filter(Boolean).join(' ')}</span>` : '';
      return `
        <div class="task-item ${t.status === 'completed' ? 'done' : ''}">
          <input type="checkbox" class="task-check" ${t.status === 'completed' ? 'checked' : ''} onclick="App.toggleTaskDone('${t.id}')">
          <span class="task-name">${this._esc(t.name)}</span>
          <div class="task-meta">
            ${dl}
            ${this._timerHtml(t.id, 'task')}
            <span class="badge ${typeColor}">${t.type}</span>
            <span class="badge ${prioClass}">${t.priority}</span>
            <span class="badge ${statusColor}">${t.status}</span>
            <button class="btn-icon" onclick="App.openTaskModal('${t.id}')" title="Edit">
              <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button class="btn-icon btn-danger" onclick="App.deleteTask('${t.id}')" title="Delete">
              <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
            </button>
          </div>
        </div>`;
    }).join('');
  },

  setTaskFilter(f) {
    this._taskFilter = f;
    document.querySelectorAll('.filter-chip').forEach(el => {
      el.classList.toggle('active', el.dataset.filter === f);
    });
    this.renderTasks();
  },

  /* ══════════════════════
     CLIENTS
  ══════════════════════ */
  openClientModal(id = null) {
    this._editId.client = id;
    document.getElementById('client-modal-title').textContent = id ? 'Edit Project' : 'Add Project';
    if (id) {
      const c = store.get('clients').find(x => x.id === id);
      if (c) {
        document.getElementById('c-client').value = c.client;
        document.getElementById('c-project').value = c.project;
        document.getElementById('c-desc').value = c.desc || '';
        document.getElementById('c-hours').value = c.hours || '';
        document.getElementById('c-payment').value = c.payment || '';
        document.getElementById('c-status').value = c.status;
      }
    } else {
      ['c-client','c-project','c-desc','c-hours','c-payment'].forEach(i => document.getElementById(i).value = '');
      document.getElementById('c-status').value = 'Pending';
    }
    this.openModal('client-modal');
    setTimeout(() => document.getElementById('c-client').focus(), 80);
  },

  saveClient() {
    const client = document.getElementById('c-client').value.trim();
    const project = document.getElementById('c-project').value.trim();
    if (!client || !project) { if (!client) this.shake('c-client'); else this.shake('c-project'); return; }
    const clients = store.get('clients');
    const data = {
      client, project,
      desc:    document.getElementById('c-desc').value.trim(),
      hours:   document.getElementById('c-hours').value,
      payment: document.getElementById('c-payment').value,
      status:  document.getElementById('c-status').value,
      date:    todayStr(),
    };
    if (this._editId.client) {
      const idx = clients.findIndex(c => c.id === this._editId.client);
      if (idx !== -1) clients[idx] = { ...clients[idx], ...data };
    } else {
      clients.unshift({ id: uid(), ...data });
    }
    store.set('clients', clients);
    this.closeModal('client-modal');
    this.renderClients();
    this.updateOverviewStats();
  },

  deleteClient(id) {
    if (!confirm('Delete this project?')) return;
    store.set('clients', store.get('clients').filter(c => c.id !== id));
    this.renderClients();
  },

  renderClients() {
    const clients = store.get('clients');
    const tbody = document.getElementById('client-table-body');
    const empty = document.getElementById('client-empty');
    if (!clients.length) { tbody.innerHTML = ''; empty.classList.remove('hidden'); return; }
    empty.classList.add('hidden');
    const statusColor = { 'Pending': 'badge-yellow', 'In Progress': 'badge-blue', 'Completed': 'badge-green' };
    tbody.innerHTML = clients.map(c => `
      <tr>
        <td><strong>${this._esc(c.client)}</strong></td>
        <td>${this._esc(c.project)}</td>
        <td style="max-width:200px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${this._esc(c.desc || '—')}</td>
        <td>${c.hours || '—'} hrs</td>
        <td>$${parseFloat(c.payment || 0).toLocaleString()}</td>
        <td><span class="badge ${statusColor[c.status] || 'badge-muted'}">${c.status}</span></td>
        <td>
          <div style="display:flex;gap:6px;align-items:center">
            ${this._timerHtml(c.id, 'client')}
            <button class="btn-icon" onclick="App.openClientModal('${c.id}')" title="Edit">
              <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button class="btn-icon btn-danger" onclick="App.deleteClient('${c.id}')" title="Delete">
              <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
            </button>
          </div>
        </td>
      </tr>`).join('');
  },

  /* ══════════════════════
     SKILLS
  ══════════════════════ */
  openSkillModal(id = null) {
    this._editId.skill = id;
    document.getElementById('skill-modal-title').textContent = id ? 'Edit Skill' : 'Add Skill';
    if (id) {
      const s = store.get('skills').find(x => x.id === id);
      if (s) {
        document.getElementById('s-name').value = s.name;
        document.getElementById('s-topic').value = s.topic || '';
        document.getElementById('s-hrs-today').value = s.hrsToday || '';
        document.getElementById('s-hrs-total').value = s.hrsTotal || '';
        document.getElementById('s-pct').value = s.pct || '';
      }
    } else {
      ['s-name','s-topic','s-hrs-today','s-hrs-total','s-pct'].forEach(i => document.getElementById(i).value = '');
    }
    this.openModal('skill-modal');
    setTimeout(() => document.getElementById('s-name').focus(), 80);
  },

  saveSkill() {
    const name = document.getElementById('s-name').value.trim();
    if (!name) { this.shake('s-name'); return; }
    const skills = store.get('skills');
    const pct = Math.min(100, Math.max(0, parseInt(document.getElementById('s-pct').value) || 0));
    const data = {
      name,
      topic:    document.getElementById('s-topic').value.trim(),
      hrsToday: document.getElementById('s-hrs-today').value,
      hrsTotal: document.getElementById('s-hrs-total').value,
      pct,
      dateUpdated: todayStr(),
    };
    if (this._editId.skill) {
      const idx = skills.findIndex(s => s.id === this._editId.skill);
      if (idx !== -1) skills[idx] = { ...skills[idx], ...data };
    } else {
      skills.unshift({ id: uid(), ...data });
    }
    store.set('skills', skills);
    this.closeModal('skill-modal');
    this.renderSkills();
    this.updateOverviewStats();
  },

  deleteSkill(id) {
    if (!confirm('Delete this skill?')) return;
    store.set('skills', store.get('skills').filter(s => s.id !== id));
    this.renderSkills();
  },

  renderSkills() {
    const skills = store.get('skills');
    const list = document.getElementById('skills-list');
    const empty = document.getElementById('skills-empty');
    if (!skills.length) { list.innerHTML = ''; empty.classList.remove('hidden'); return; }
    empty.classList.add('hidden');
    list.innerHTML = skills.map(s => `
      <div class="skill-row">
        <div class="skill-header">
          <div>
            <span class="skill-title">${this._esc(s.name)}</span>
            ${s.topic ? `<span class="text-muted text-sm" style="margin-left:8px">${this._esc(s.topic)}</span>` : ''}
          </div>
          <div style="display:flex;align-items:center;gap:10px">
            <span class="text-sm text-secondary">${s.hrsTotal || 0} hrs total</span>
            <span class="skill-pct">${s.pct || 0}%</span>
            ${this._timerHtml(s.id, 'skill')}
            <button class="btn-icon" onclick="App.openSkillModal('${s.id}')" title="Edit">
              <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button class="btn-icon btn-danger" onclick="App.deleteSkill('${s.id}')" title="Delete">
              <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
            </button>
          </div>
        </div>
        <div class="progress-wrap">
          <div class="progress-fill" style="width:${s.pct || 0}%"></div>
        </div>
      </div>`).join('');
  },

  /* ══════════════════════
     COURSES
  ══════════════════════ */
  openCourseModal(id = null) {
    this._editId.course = id;
    document.getElementById('course-modal-title').textContent = id ? 'Edit Course' : 'Add Course / Playlist';
    // Fill skill dropdown
    const skills = store.get('skills');
    const skillSel = document.getElementById('c-skill');
    skillSel.innerHTML = '<option value="">— Not linked —</option>' +
      skills.map(s => `<option value="${s.id}">${this._esc(s.name)}</option>`).join('');
    const ll = document.getElementById('c-lessons-list');
    ll.innerHTML = '';
    if (id) {
      const c = store.get('courses').find(x => x.id === id);
      if (c) {
        document.getElementById('c-title').value = c.title;
        document.getElementById('c-platform').value = c.platform || 'YouTube';
        document.getElementById('c-url').value = c.url || '';
        skillSel.value = c.skillId || '';
        (c.lessons || []).forEach(l => this._appendLessonField(l.title));
        this._updateFetchBtn();
      }
    } else {
      document.getElementById('c-title').value = '';
      document.getElementById('c-platform').value = 'YouTube';
      document.getElementById('c-url').value = '';
      skillSel.value = '';
      this._appendLessonField(''); // one blank field to start
    }
    this._updateFetchBtn();
    this.openModal('course-modal');
    setTimeout(() => document.getElementById('c-title').focus(), 80);
  },

  _appendLessonField(value) {
    const ll = document.getElementById('c-lessons-list');
    const num = ll.children.length + 1;
    const div = document.createElement('div');
    div.className = 'lesson-input-row';
    div.innerHTML = `
      <span class="lesson-num">${num}</span>
      <input class="inp lesson-inp" type="text" placeholder="Lesson / video title..." value="${this._esc(value)}" />
      <button class="btn-icon btn-danger" type="button" onclick="this.parentElement.remove();App._renumberLessons()">
        <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>`;
    ll.appendChild(div);
  },

  _renumberLessons() {
    document.querySelectorAll('#c-lessons-list .lesson-num').forEach((el, i) => { el.textContent = i + 1; });
  },

  addCourseLessonField() {
    this._appendLessonField('');
    // focus the new field
    const inputs = document.querySelectorAll('#c-lessons-list .lesson-inp');
    if (inputs.length) inputs[inputs.length - 1].focus();
  },

  saveCourse() {
    const title = document.getElementById('c-title').value.trim();
    if (!title) { this.shake('c-title'); return; }
    const lessons = [...document.querySelectorAll('#c-lessons-list .lesson-inp')]
      .map(inp => inp.value.trim()).filter(Boolean)
      .map(t => ({ id: uid(), title: t, done: false }));
    const courses = store.get('courses');
    const data = {
      title,
      platform: document.getElementById('c-platform').value,
      url:      document.getElementById('c-url').value.trim(),
      skillId:  document.getElementById('c-skill').value,
      lessons,
    };
    if (this._editId.course) {
      const idx = courses.findIndex(c => c.id === this._editId.course);
      if (idx !== -1) {
        // preserve done state by title match
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
    store.set('courses', courses);
    this.closeModal('course-modal');
    this.renderCourses();
  },

  deleteCourse(id) {
    if (!confirm('Delete this course?')) return;
    store.set('courses', store.get('courses').filter(c => c.id !== id));
    this.renderCourses();
  },

  toggleCourseLesson(courseId, lessonId) {
    const courses = store.get('courses');
    const c = courses.find(x => x.id === courseId);
    if (!c) return;
    const l = c.lessons.find(x => x.id === lessonId);
    if (l) l.done = !l.done;
    store.set('courses', courses);
    this.renderCourses();
  },

  toggleCourseExpand(id) {
    const el = document.getElementById('course-lessons-' + id);
    if (el) el.classList.toggle('hidden');
  },

  _extractPlaylistId(url) {
    try { return new URL(url).searchParams.get('list'); } catch { return null; }
  },

  _updateFetchBtn() {
    const btn = document.getElementById('btn-fetch-yt');
    if (!btn) return;
    const platform = document.getElementById('c-platform')?.value;
    const url = document.getElementById('c-url')?.value || '';
    btn.style.display = (platform === 'YouTube' && url.includes('list=')) ? '' : 'none';
  },

  async fetchYouTubePlaylist() {
    const url = document.getElementById('c-url').value.trim();
    const listId = this._extractPlaylistId(url);
    if (!listId) {
      alert('Please enter a valid YouTube playlist URL first (must contain ?list=...)');
      return;
    }
    let apiKey = store.getStr('yt_api_key');
    if (!apiKey) {
      apiKey = prompt(
        'YouTube Data API v3 key দরকার playlist auto-fetch করতে।\n\n' +
        'Free key পাওয়ার উপায়:\n' +
        '1. console.cloud.google.com যাও\n' +
        '2. New Project → YouTube Data API v3 Enable করো\n' +
        '3. Credentials → Create API Key\n\n' +
        '(Key শুধু এই device-এ locally save হবে)'
      );
      if (!apiKey) return;
      apiKey = apiKey.trim();
      store.setStr('yt_api_key', apiKey);
    }
    const btn = document.getElementById('btn-fetch-yt');
    const origHTML = btn.innerHTML;
    btn.disabled = true;
    btn.textContent = 'Fetching…';
    try {
      const videos = [];
      let pageToken = '';
      do {
        const endpoint =
          `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50` +
          `&playlistId=${encodeURIComponent(listId)}` +
          (pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : '') +
          `&key=${encodeURIComponent(apiKey)}`;
        const res  = await fetch(endpoint);
        const data = await res.json();
        if (!res.ok) {
          if (res.status === 403) {
            store.setStr('yt_api_key', ''); // clear bad key
            throw new Error('API key invalid বা quota শেষ। Key clear করা হয়েছে — valid key দিয়ে আবার try করো।');
          }
          throw new Error(data.error?.message || `YouTube API error (${res.status})`);
        }
        (data.items || []).forEach(item => {
          const title = item.snippet?.title;
          if (title && title !== 'Deleted video' && title !== 'Private video') videos.push(title);
        });
        pageToken = data.nextPageToken || '';
      } while (pageToken && videos.length < 200);

      document.getElementById('c-lessons-list').innerHTML = '';
      videos.forEach(t => this._appendLessonField(t));
      btn.innerHTML = `<svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> ${videos.length} videos added`;
      setTimeout(() => {
        const b = document.getElementById('btn-fetch-yt');
        if (b) { b.innerHTML = origHTML; b.disabled = false; }
      }, 3000);
      return;
    } catch (err) {
      alert('Playlist fetch error:\n' + err.message);
    }
    btn.innerHTML = origHTML;
    btn.disabled = false;
  },

  renderCourses() {
    const courses = store.get('courses');
    const list  = document.getElementById('courses-list');
    const empty = document.getElementById('courses-empty');
    if (!list) return;
    if (!courses.length) { list.innerHTML = ''; empty.classList.remove('hidden'); return; }
    empty.classList.add('hidden');
    const skills = store.get('skills');
    list.innerHTML = courses.map(c => {
      const total = c.lessons.length;
      const done  = c.lessons.filter(l => l.done).length;
      const pct   = total ? Math.round((done / total) * 100) : 0;
      const skill = skills.find(s => s.id === c.skillId);
      const platColor = { YouTube:'badge-red', Udemy:'badge-purple', Coursera:'badge-blue', Other:'badge-muted' }[c.platform] || 'badge-muted';
      const urlBtn = c.url
        ? `<a href="${c.url}" target="_blank" rel="noopener noreferrer" class="btn btn-ghost btn-sm" style="padding:4px 10px;font-size:11px;text-decoration:none">
            <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            Open
           </a>` : '';
      const lessonRows = c.lessons.map(l => `
        <div class="lesson-item ${l.done ? 'done' : ''}">
          <input type="checkbox" class="task-check" ${l.done ? 'checked' : ''} onclick="App.toggleCourseLesson('${c.id}','${l.id}')">
          <span class="lesson-title">${this._esc(l.title)}</span>
        </div>`).join('');
      return `
        <div class="course-card">
          <div class="course-card-header">
            <div class="flex items-center gap-8" style="flex:1;min-width:0">
              <div class="course-icon">
                <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
              </div>
              <div style="min-width:0">
                <div class="course-title">${this._esc(c.title)}</div>
                <div style="display:flex;align-items:center;gap:6px;margin-top:4px;flex-wrap:wrap">
                  <span class="badge ${platColor}">${c.platform}</span>
                  ${skill ? `<span class="badge badge-purple">${this._esc(skill.name)}</span>` : ''}
                  <span class="text-muted text-sm">${done}/${total} lessons done</span>
                </div>
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:6px;flex-shrink:0">
              ${urlBtn}
              <button class="btn-icon" onclick="App.toggleCourseExpand('${c.id}')" title="Toggle lessons">
                <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
              </button>
              <button class="btn-icon" onclick="App.openCourseModal('${c.id}')" title="Edit">
                <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
              <button class="btn-icon btn-danger" onclick="App.deleteCourse('${c.id}')" title="Delete">
                <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
              </button>
            </div>
          </div>
          <div class="course-progress-row">
            <div class="progress-wrap" style="flex:1">
              <div class="progress-fill" style="width:${pct}%"></div>
            </div>
            <span class="course-pct">${pct}%</span>
          </div>
          <div id="course-lessons-${c.id}" class="course-lessons-list">
            ${total ? lessonRows : '<span class="text-muted text-sm" style="padding:8px">No lessons added.</span>'}
          </div>
        </div>`;
    }).join('');
  },

  /* ══════════════════════
     HABITS
  ══════════════════════ */
  openHabitModal() {
    document.getElementById('h-name').value = '';
    this.openModal('habit-modal');
    setTimeout(() => document.getElementById('h-name').focus(), 80);
  },

  saveHabit() {
    const name = document.getElementById('h-name').value.trim();
    if (!name) { this.shake('h-name'); return; }
    const habits = store.get('habits');
    habits.push({ id: uid(), name, days: {} });
    store.set('habits', habits);
    this.closeModal('habit-modal');
    this.renderHabits();
  },

  deleteHabit(id) {
    if (!confirm('Delete this habit?')) return;
    store.set('habits', store.get('habits').filter(h => h.id !== id));
    this.renderHabits();
  },

  toggleHabitDay(id, dateStr) {
    const habits = store.get('habits');
    const h = habits.find(x => x.id === id);
    if (!h) return;
    if (!h.days) h.days = {};
    h.days[dateStr] = !h.days[dateStr];
    store.set('habits', habits);
    this.renderHabits();
  },

  renderHabits() {
    const habits = store.get('habits');
    const list = document.getElementById('habit-list');
    const empty = document.getElementById('habit-empty');
    if (!habits.length) { list.innerHTML = ''; empty.classList.remove('hidden'); return; }
    empty.classList.add('hidden');
    const days7 = lastSevenDays();
    const today = todayStr();
    list.innerHTML = habits.map(h => {
      const streak = this._calcStreak(h.days || {});
      const dots = days7.map(d => {
        const done = h.days && h.days[d.date];
        const isToday = d.date === today;
        return `<div class="habit-dot ${done ? 'done' : ''}" 
          onclick="App.toggleHabitDay('${h.id}','${d.date}')"
          title="${d.date}${isToday ? ' (Today)' : ''}"
          style="${isToday ? 'border-color:rgba(249,115,22,.6)' : ''}">${d.label[0]}</div>`;
      }).join('');
      return `
        <div class="habit-row">
          <span class="habit-name">${this._esc(h.name)}</span>
          <div class="habit-days">${dots}</div>
          <span class="habit-streak">${streak > 0 ? streak + ' day streak' : ''}</span>
          <button class="btn-icon btn-danger" onclick="App.deleteHabit('${h.id}')" title="Delete" style="margin-left:8px">
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
          </button>
        </div>`;
    }).join('');
  },

  _calcStreak(days) {
    let streak = 0;
    const d = new Date();
    for (let i = 0; i < 365; i++) {
      const key = d.toISOString().slice(0,10);
      if (days[key]) { streak++; d.setDate(d.getDate() - 1); } else break;
    }
    return streak;
  },

  /* ══════════════════════
     INCOME
  ══════════════════════ */
  openIncomeModal(id = null) {
    this._editId.income = id;
    document.getElementById('income-modal-title').textContent = id ? 'Edit Payment' : 'Add Payment';
    if (id) {
      const i = store.get('incomes').find(x => x.id === id);
      if (i) {
        document.getElementById('i-client').value = i.client;
        document.getElementById('i-amount').value = i.amount;
        document.getElementById('i-method').value = i.method;
        document.getElementById('i-date').value = i.date || '';
        document.getElementById('i-status').value = i.status;
      }
    } else {
      ['i-client','i-amount'].forEach(el => document.getElementById(el).value = '');
      document.getElementById('i-method').value = 'Upwork';
      document.getElementById('i-date').value = todayStr();
      document.getElementById('i-status').value = 'Received';
    }
    this.openModal('income-modal');
    setTimeout(() => document.getElementById('i-client').focus(), 80);
  },

  saveIncome() {
    const client = document.getElementById('i-client').value.trim();
    const amount = document.getElementById('i-amount').value;
    if (!client || !amount) { if (!client) this.shake('i-client'); else this.shake('i-amount'); return; }
    const incomes = store.get('incomes');
    const data = {
      client,
      amount: parseFloat(amount),
      method: document.getElementById('i-method').value,
      date:   document.getElementById('i-date').value,
      status: document.getElementById('i-status').value,
    };
    if (this._editId.income) {
      const idx = incomes.findIndex(i => i.id === this._editId.income);
      if (idx !== -1) incomes[idx] = { ...incomes[idx], ...data };
    } else {
      incomes.unshift({ id: uid(), ...data });
    }
    store.set('incomes', incomes);
    this.closeModal('income-modal');
    this.renderIncome();
    this.updateOverviewStats();
  },

  deleteIncome(id) {
    if (!confirm('Delete this payment?')) return;
    store.set('incomes', store.get('incomes').filter(i => i.id !== id));
    this.renderIncome();
    this.updateOverviewStats();
  },

  renderIncome() {
    const incomes = store.get('incomes');
    const tbody = document.getElementById('income-table-body');
    const empty = document.getElementById('income-empty');
    if (!incomes.length) { tbody.innerHTML = ''; empty.classList.remove('hidden'); return; }
    empty.classList.add('hidden');

    const today = todayStr();
    const ym = today.slice(0, 7);
    let month = 0, total = 0, pending = 0;
    incomes.forEach(i => {
      const amt = parseFloat(i.amount) || 0;
      total += amt;
      if (i.status === 'Received') { if (i.date && i.date.slice(0,7) === ym) month += amt; }
      if (i.status === 'Pending') pending += amt;
    });
    document.getElementById('income-month').textContent = '$' + month.toLocaleString();
    document.getElementById('income-total').textContent = '$' + total.toLocaleString();
    document.getElementById('income-pending').textContent = '$' + pending.toLocaleString();

    const statusColor = { 'Received': 'badge-green', 'Pending': 'badge-yellow', 'Cancelled': 'badge-red' };
    tbody.innerHTML = incomes.map(i => `
      <tr>
        <td><strong>${this._esc(i.client)}</strong></td>
        <td style="color:var(--green);font-weight:700">$${parseFloat(i.amount || 0).toLocaleString()}</td>
        <td>${this._esc(i.method)}</td>
        <td>${i.date || '—'}</td>
        <td><span class="badge ${statusColor[i.status] || 'badge-muted'}">${i.status}</span></td>
        <td>
          <div style="display:flex;gap:6px">
            <button class="btn-icon" onclick="App.openIncomeModal('${i.id}')" title="Edit">
              <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button class="btn-icon btn-danger" onclick="App.deleteIncome('${i.id}')" title="Delete">
              <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
            </button>
          </div>
        </td>
      </tr>`).join('');
  },

  /* ══════════════════════
     STATISTICS
  ══════════════════════ */
  renderCharts() {
    const days7 = lastSevenDays();
    const clients = store.get('clients');
    const tasks = store.get('tasks');
    const incomes = store.get('incomes');
    const skills = store.get('skills');

    // Weekly work hours per day
    const workByDay = days7.map(d => {
      return clients.filter(c => c.date === d.date).reduce((s, c) => s + (parseFloat(c.hours) || 0), 0);
    });
    const workWeek = workByDay.reduce((s, v) => s + v, 0);

    // Weekly learn hours
    const learnWeek = skills.filter(s => {
      const d = new Date(); d.setDate(d.getDate() - 6);
      return s.dateUpdated >= d.toISOString().slice(0,10);
    }).reduce((s, sk) => s + (parseFloat(sk.hrsToday) || 0), 0);

    // Tasks done
    const w6 = new Date(); w6.setDate(w6.getDate() - 6);
    const w6str = w6.toISOString().slice(0,10);
    const tasksDone = tasks.filter(t => t.status === 'completed' && t.completedDate >= w6str).length;

    // Total earnings
    const totalEarn = incomes.filter(i => i.status === 'Received').reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);

    document.getElementById('stat-work-week').textContent = workWeek.toFixed(1);
    document.getElementById('stat-learn-week').textContent = learnWeek.toFixed(1);
    document.getElementById('stat-tasks-done').textContent = tasksDone;
    document.getElementById('stat-total-earn').textContent = '$' + totalEarn.toLocaleString();

    // Chart defaults
    const chartDefaults = {
      plugins: { legend: { labels: { color: '#8b8b91', font: { size: 12 } } } },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#8b8b91' } },
        y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#8b8b91' } },
      },
    };

    // Work hours bar chart
    if (chartWork) chartWork.destroy();
    chartWork = new Chart(document.getElementById('chart-work'), {
      type: 'bar',
      data: {
        labels: days7.map(d => d.label),
        datasets: [{
          label: 'Work Hours',
          data: workByDay,
          backgroundColor: 'rgba(249,115,22,0.7)',
          borderColor: '#f97316',
          borderWidth: 1,
          borderRadius: 6,
        }],
      },
      options: { responsive: true, maintainAspectRatio: false, ...chartDefaults },
    });

    // Task type doughnut
    const typeCount = { 'Client Work': 0, 'Learning': 0, 'Personal': 0 };
    tasks.filter(t => t.status === 'completed').forEach(t => { if (typeCount[t.type] !== undefined) typeCount[t.type]++; });
    if (chartTasks) chartTasks.destroy();
    chartTasks = new Chart(document.getElementById('chart-tasks'), {
      type: 'doughnut',
      data: {
        labels: Object.keys(typeCount),
        datasets: [{
          data: Object.values(typeCount),
          backgroundColor: ['rgba(249,115,22,0.8)', 'rgba(168,85,247,0.8)', 'rgba(59,130,246,0.8)'],
          borderColor: ['#f97316','#a855f7','#3b82f6'],
          borderWidth: 1,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom', labels: { color: '#8b8b91', font: { size: 12 }, padding: 16 } } },
      },
    });
  },

  /* ══════════════════════
     POMODORO
  ══════════════════════ */
  _pomo: {
    workDur: 25, breakDur: 5, mode: 'work',
    remaining: 25 * 60, running: false, timer: null,
    sessions: 0, totalSecs: 0,
  },

  pomoStart() {
    const p = this._pomo;
    if (p.running) {
      clearInterval(p.timer);
      p.running = false;
      document.getElementById('pomo-start').textContent = 'Resume';
      return;
    }
    p.running = true;
    document.getElementById('pomo-start').textContent = 'Pause';
    p.timer = setInterval(() => {
      p.remaining--;
      p.totalSecs++;
      this._pomoTick();
      if (p.remaining <= 0) {
        clearInterval(p.timer);
        p.running = false;
        if (p.mode === 'work') {
          p.sessions++;
          p.mode = 'break';
          p.remaining = p.breakDur * 60;
          this._pomoLogSession();
          document.getElementById('pomo-mode-label').textContent = 'BREAK TIME';
        } else {
          p.mode = 'work';
          p.remaining = p.workDur * 60;
          document.getElementById('pomo-mode-label').textContent = 'WORK SESSION';
        }
        document.getElementById('pomo-start').textContent = 'Start';
        document.getElementById('pomo-session-count').textContent = `Sessions today: ${p.sessions}`;
        this._pomoTick();
      }
    }, 1000);
  },

  _pomoTick() {
    const p = this._pomo;
    const mins = Math.floor(p.remaining / 60);
    const secs = p.remaining % 60;
    document.getElementById('pomo-display').textContent =
      String(mins).padStart(2,'0') + ':' + String(secs).padStart(2,'0');
    // Ring
    const total = (p.mode === 'work' ? p.workDur : p.breakDur) * 60;
    const frac = p.remaining / total;
    const circumference = 502.65;
    document.getElementById('pomo-ring').style.strokeDashoffset = circumference * (1 - frac);
  },

  pomoReset() {
    const p = this._pomo;
    clearInterval(p.timer);
    p.running = false;
    p.mode = 'work';
    p.remaining = p.workDur * 60;
    document.getElementById('pomo-start').textContent = 'Start';
    document.getElementById('pomo-mode-label').textContent = 'WORK SESSION';
    this._pomoTick();
  },

  pomoApplySettings() {
    const w = parseInt(document.getElementById('pomo-work-dur').value) || 25;
    const b = parseInt(document.getElementById('pomo-break-dur').value) || 5;
    this._pomo.workDur = Math.max(1, Math.min(90, w));
    this._pomo.breakDur = Math.max(1, Math.min(30, b));
    this.pomoReset();
  },

  _pomoLogSession() {
    const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const log = document.getElementById('pomo-log');
    const item = document.createElement('div');
    item.style.cssText = 'display:flex;align-items:center;gap:8px;padding:4px 0';
    item.innerHTML = `<span style="color:var(--orange);font-weight:700">#${this._pomo.sessions}</span>
      <span>Work session completed at ${now}</span>`;
    log.prepend(item);
  },

  /* ══════════════════════
     ATTENDANCE
  ══════════════════════ */
  _att: {
    state: 'idle', // idle | working | break | done
    checkInTs: null, checkOutTs: null,
    breakStartTs: null, sessionStartTs: null,
    totalWorkMs: 0, totalBreakMs: 0,
    timer: null, log: [],
  },

  _attKey() { return 'att_' + todayStr(); },

  attLoad() {
    // Reset in-memory state first, then restore from localStorage
    clearInterval(this._att.timer);
    Object.assign(this._att, { state:'idle', checkInTs:null, checkOutTs:null, breakStartTs:null, sessionStartTs:null, totalWorkMs:0, totalBreakMs:0, timer:null, log:[] });
    const saved = store.get(this._attKey(), null);
    if (saved && saved.state) {
      const { state, checkInTs, checkOutTs, breakStartTs, sessionStartTs, totalWorkMs, totalBreakMs, log } = saved;
      Object.assign(this._att, { state, checkInTs, checkOutTs, breakStartTs, sessionStartTs, totalWorkMs: totalWorkMs||0, totalBreakMs: totalBreakMs||0, log: log||[] });
    }
    if (this._att.state === 'working' || this._att.state === 'break') this._attStartTicker();
    this._attRender();
  },

  _attSave() {
    const { state, checkInTs, checkOutTs, breakStartTs, sessionStartTs, totalWorkMs, totalBreakMs, log } = this._att;
    store.set(this._attKey(), { state, checkInTs, checkOutTs, breakStartTs, sessionStartTs, totalWorkMs, totalBreakMs, log });
  },

  attCheckIn() {
    if (this._att.state !== 'idle') return;
    const now = Date.now();
    this._att.state = 'working';
    this._att.checkInTs = now;
    this._att.sessionStartTs = now;
    this._att.log.push({ type: 'checkin', time: this._attFmt(now) });
    this._attStartTicker();
    this._attSave(); this._attRender();
  },

  attBreak() {
    if (this._att.state !== 'working') return;
    const now = Date.now();
    this._att.totalWorkMs += now - this._att.sessionStartTs;
    this._att.state = 'break';
    this._att.breakStartTs = now;
    this._att.sessionStartTs = null;
    this._att.log.push({ type: 'break', time: this._attFmt(now) });
    this._attSave(); this._attRender();
  },

  attBreakEnd() {
    if (this._att.state !== 'break') return;
    const now = Date.now();
    this._att.totalBreakMs += now - this._att.breakStartTs;
    this._att.state = 'working';
    this._att.breakStartTs = null;
    this._att.sessionStartTs = now;
    this._att.log.push({ type: 'break_end', time: this._attFmt(now) });
    this._attSave(); this._attRender();
  },

  attCheckOut() {
    if (this._att.state !== 'working' && this._att.state !== 'break') return;
    const now = Date.now();
    if (this._att.state === 'working') this._att.totalWorkMs += now - this._att.sessionStartTs;
    else this._att.totalBreakMs += now - this._att.breakStartTs;
    clearInterval(this._att.timer); this._att.timer = null;
    this._att.state = 'done';
    this._att.checkOutTs = now;
    this._att.sessionStartTs = null; this._att.breakStartTs = null;
    this._att.log.push({ type: 'checkout', time: this._attFmt(now) });
    this._attSave(); this._attRender();
  },

  _attStartTicker() {
    clearInterval(this._att.timer);
    this._att.timer = setInterval(() => this._attUpdateDisplay(), 1000);
  },

  _attUpdateDisplay() {
    const p = this._att;
    let ms = 0;
    if      (p.state === 'working' && p.sessionStartTs) ms = Date.now() - p.sessionStartTs;
    else if (p.state === 'break'   && p.breakStartTs)   ms = Date.now() - p.breakStartTs;
    else if (p.state === 'done')                        ms = p.totalWorkMs;
    const el = document.getElementById('att-timer');
    if (el) el.textContent = this._msToHMS(ms);
    const twEl = document.getElementById('att-total-work');
    const tbEl = document.getElementById('att-total-break');
    if (twEl) twEl.textContent = this._fmtHM(p.state === 'working' && p.sessionStartTs ? p.totalWorkMs + (Date.now() - p.sessionStartTs) : p.totalWorkMs);
    if (tbEl) tbEl.textContent = this._fmtHM(p.state === 'break'   && p.breakStartTs   ? p.totalBreakMs + (Date.now() - p.breakStartTs)   : p.totalBreakMs);
  },

  _attRender() {
    const p = this._att;
    const cfgMap = {
      idle:    { label: 'Not Started',  color: 'var(--text-muted)', dot: '#4a4a52', sub: 'Click Check In to begin' },
      working: { label: 'Working',      color: 'var(--green)',      dot: '#22c55e', sub: 'Session time (live)' },
      break:   { label: 'On Break',     color: 'var(--yellow)',     dot: '#eab308', sub: 'Break time (live)' },
      done:    { label: 'Checked Out',  color: 'var(--blue)',       dot: '#3b82f6', sub: 'Total work today' },
    };
    const cfg = cfgMap[p.state] || cfgMap.idle;
    const q = id => document.getElementById(id);
    if (q('att-status-label')) { q('att-status-label').textContent = cfg.label; q('att-status-label').style.color = cfg.color; }
    if (q('att-dot'))          { q('att-dot').style.background = cfg.dot; q('att-dot').style.boxShadow = `0 0 8px ${cfg.dot}`; }
    if (q('att-timer-sub'))    q('att-timer-sub').textContent = cfg.sub;
    const setBtn = (id, on) => { const b = q(id); if (b) b.disabled = !on; };
    setBtn('att-btn-checkin',   p.state === 'idle');
    setBtn('att-btn-break',     p.state === 'working');
    setBtn('att-btn-break-end', p.state === 'break');
    setBtn('att-btn-checkout',  p.state === 'working' || p.state === 'break');
    if (q('att-checkin-time'))  q('att-checkin-time').textContent  = p.checkInTs  ? this._attFmt(p.checkInTs)  : '--:--';
    if (q('att-checkout-time')) q('att-checkout-time').textContent = p.checkOutTs ? this._attFmt(p.checkOutTs) : '--:--';
    this._attUpdateDisplay();
    const logEl = q('att-log'), emptyEl = q('att-log-empty');
    if (!logEl) return;
    const icons = {
      checkin:   { color: 'var(--green)',  label: 'Checked In' },
      break:     { color: 'var(--yellow)', label: 'Break Started' },
      break_end: { color: 'var(--orange)', label: 'Break Ended' },
      checkout:  { color: 'var(--blue)',   label: 'Checked Out' },
    };
    if (!p.log.length) { logEl.innerHTML = ''; if (emptyEl) emptyEl.classList.remove('hidden'); return; }
    if (emptyEl) emptyEl.classList.add('hidden');
    logEl.innerHTML = p.log.slice().reverse().map(e => {
      const ic = icons[e.type] || { color: 'var(--text-muted)', label: e.type };
      return `<div class="att-log-item"><div class="att-log-dot" style="background:${ic.color}"></div><span class="att-log-label" style="color:${ic.color}">${ic.label}</span><span class="att-log-time">${e.time}</span></div>`;
    }).join('');
  },

  _attFmt(ts) {
    return new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  },
  _msToHMS(ms) {
    const s = Math.max(0, Math.floor(ms / 1000));
    return `${String(Math.floor(s/3600)).padStart(2,'0')}:${String(Math.floor((s%3600)/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
  },
  _fmtHM(ms) {
    const m = Math.max(0, Math.floor(ms / 60000));
    return `${Math.floor(m/60)}h ${m%60}m`;
  },

  /* ══════════════════════
     NOTES
  ══════════════════════ */
  _notesTimer: null,
  initNotes() {
    const el = document.getElementById('notes-area');
    el.value = store.getStr('notes', '');
    el.addEventListener('input', () => {
      clearTimeout(this._notesTimer);
      document.getElementById('notes-saved-label').textContent = 'Saving...';
      this._notesTimer = setTimeout(() => {
        store.setStr('notes', el.value);
        document.getElementById('notes-saved-label').textContent = 'Saved';
        setTimeout(() => document.getElementById('notes-saved-label').textContent = '', 1200);
      }, 600);
    });
  },

  /* ══════════════════════
     UTILITY
  ══════════════════════ */
  _esc(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  },

  flash(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.transition = 'box-shadow .1s';
    el.style.boxShadow = '0 0 0 3px rgba(34,197,94,.4)';
    setTimeout(() => el.style.boxShadow = '', 700);
  },

  shake(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.animation = 'none';
    el.style.borderColor = 'var(--red)';
    el.style.boxShadow = '0 0 0 3px rgba(239,68,68,.25)';
    setTimeout(() => { el.style.borderColor = ''; el.style.boxShadow = ''; }, 1000);
    el.focus();
  },

  /* ══════════════════════
     INIT
  ══════════════════════ */
  init() {
    // Loading screen
    window.addEventListener('load', () => {
      setTimeout(() => document.getElementById('loader').classList.add('hide'), 1200);
    });

    // Sidebar toggle
    document.getElementById('sidebar-toggle').addEventListener('click', () => this.toggleSidebar());

    // Nav click
    document.querySelectorAll('.nav-item').forEach(el => {
      el.addEventListener('click', () => this.navigate(el.dataset.section));
    });

    // Filter chips
    document.querySelectorAll('.filter-chip').forEach(el => {
      el.addEventListener('click', () => this.setTaskFilter(el.dataset.filter));
    });

    // Modal backdrop click to close
    document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
      backdrop.addEventListener('click', e => {
        if (e.target === backdrop) backdrop.classList.add('hidden');
      });
    });

    // Keyboard: Escape closes any open modal
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal-backdrop:not(.hidden)').forEach(m => m.classList.add('hidden'));
      }
    });

    // Clock
    this.startClock();

    // Welcome greeting
    this.setWelcomeGreeting();

    // Quote
    this.setDailyQuote();

    // Load goal
    this.loadGoal();

    // On page unload: snapshot elapsed and update startedAt so timer resumes correctly after refresh
    window.addEventListener('beforeunload', () => {
      const now = Date.now();
      const running = store.get('timer_running', {});
      Object.entries(this._activeTimers).forEach(([id, active]) => {
        const delta = now - active.startedAt;
        const log   = store.get(this._timerKey(), {});
        const prev  = log[id] || { elapsed: 0 };
        log[id] = { elapsed: prev.elapsed + delta, type: active.type, name: active.name };
        store.set(this._timerKey(), log);
        // Reset startedAt to now so restored timer starts fresh from this checkpoint
        if (running[id]) { running[id].startedAt = now; }
      });
      store.set('timer_running', running);
    });

    // Restore any timers that were running before the page reload
    const savedRunning = store.get('timer_running', {});
    const MAX_RESTORE_GAP = 12 * 3600 * 1000; // ignore if >12h gap (e.g. after sleep)
    Object.entries(savedRunning).forEach(([id, meta]) => {
      if (Date.now() - meta.startedAt > MAX_RESTORE_GAP) {
        // Too old — save elapsed and clear
        const log  = store.get(this._timerKey(), {});
        const prev = log[id] || { elapsed: 0 };
        log[id] = { elapsed: prev.elapsed + (Date.now() - meta.startedAt), type: meta.type, name: meta.name };
        store.set(this._timerKey(), log);
        delete savedRunning[id];
        store.set('timer_running', savedRunning);
      } else {
        this.timerStart(id, meta.type, meta.startedAt);
      }
    });

    // Render all sections
    this.renderTasks();
    this.renderClients();
    this.renderSkills();
    this.renderCourses();
    this.renderHabits();
    this.renderIncome();
    this.updateOverviewStats();
    this.initNotes();

    // Pomodoro ring initial state
    this._pomoTick();

    // Attendance — restore today's state
    this.attLoad();
  },
};

document.addEventListener('DOMContentLoaded', () => App.init());
