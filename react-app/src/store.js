// localStorage helpers
export const store = {
  get: (key, fallback = []) => {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
  },
  set: (key, val) => { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} },
  getStr: (key, fallback = '') => localStorage.getItem(key) ?? fallback,
  setStr: (key, val) => localStorage.setItem(key, val),
};
