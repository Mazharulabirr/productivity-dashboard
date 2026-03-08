export const QUOTES = [
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

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

export const todayStr = () => new Date().toISOString().slice(0, 10);

export function lastSevenDays() {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const result = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    result.push({ label: days[d.getDay()], date: d.toISOString().slice(0, 10) });
  }
  return result;
}

export function fmtMs(ms) {
  if (!ms || ms < 1000) return '00:00';
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

export function msToHMS(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export function fmtHM(ms) {
  const m = Math.max(0, Math.floor(ms / 60000));
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

export function calcStreak(days) {
  let streak = 0;
  const d = new Date();
  for (let i = 0; i < 365; i++) {
    const key = d.toISOString().slice(0, 10);
    if (days[key]) { streak++; d.setDate(d.getDate() - 1); } else break;
  }
  return streak;
}

export function getDailyQuote() {
  const today = todayStr();
  const idx = today.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % QUOTES.length;
  return QUOTES[idx];
}

export function getGreeting(name) {
  const hour = new Date().getHours();
  const display = name ? `, ${name}!` : '!';
  if (hour < 12) return { text: `Good morning${display}`, emoji: '☀️' };
  if (hour < 17) return { text: `Good afternoon${display}`, emoji: '👋' };
  return { text: `Good evening${display}`, emoji: '🌙' };
}
