import { useState, useEffect, useRef, useCallback } from 'react';
import { store } from '../store';
import { todayStr, fmtMs } from '../utils';

const TIMER_KEY = () => 'timelog_' + todayStr();
const MAX_RESTORE_GAP = 12 * 3600 * 1000;

export function useTimers() {
  // activeTimers: { [id]: { startedAt, type, name } }
  const [activeTimers, setActiveTimers] = useState({});
  const intervalsRef = useRef({}); // { [id]: intervalId } — NOT in state
  const [tick, setTick] = useState(0); // force re-render every second for live display

  // Restore running timers on mount
  useEffect(() => {
    const saved = store.get('timer_running', {});
    const now = Date.now();
    const valid = {};
    const log = store.get(TIMER_KEY(), {});
    Object.entries(saved).forEach(([id, meta]) => {
      if (now - meta.startedAt > MAX_RESTORE_GAP) {
        // Too old — finalize elapsed
        const prev = log[id] || { elapsed: 0 };
        log[id] = { elapsed: prev.elapsed + (now - meta.startedAt), type: meta.type, name: meta.name };
      } else {
        valid[id] = meta;
      }
    });
    store.set(TIMER_KEY(), log);
    store.set('timer_running', valid);
    if (Object.keys(valid).length) {
      setActiveTimers(valid);
    }
  }, []);

  // Start intervals for all active timers
  useEffect(() => {
    const ids = Object.keys(activeTimers);
    // Clear intervals not in activeTimers
    Object.keys(intervalsRef.current).forEach(id => {
      if (!activeTimers[id]) {
        clearInterval(intervalsRef.current[id]);
        delete intervalsRef.current[id];
      }
    });
    // Start intervals for new active timers
    ids.forEach(id => {
      if (!intervalsRef.current[id]) {
        intervalsRef.current[id] = setInterval(() => setTick(t => t + 1), 1000);
      }
    });
    return () => {
      // Cleanup on unmount only if nothing active
    };
  }, [activeTimers]);

  // Save snapshot on beforeunload
  useEffect(() => {
    const handler = () => {
      const now = Date.now();
      const running = store.get('timer_running', {});
      const log = store.get(TIMER_KEY(), {});
      Object.entries(activeTimers).forEach(([id, active]) => {
        const delta = now - active.startedAt;
        const prev = log[id] || { elapsed: 0 };
        log[id] = { elapsed: prev.elapsed + delta, type: active.type, name: active.name };
        if (running[id]) running[id].startedAt = now;
      });
      store.set(TIMER_KEY(), log);
      store.set('timer_running', running);
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [activeTimers]);

  const getSaved = useCallback((id) => {
    return store.get(TIMER_KEY(), {})[id] || { elapsed: 0 };
  }, [tick]); // re-read on each tick

  const getElapsed = useCallback((id) => {
    const saved = store.get(TIMER_KEY(), {})[id]?.elapsed || 0;
    const extra = activeTimers[id] ? Date.now() - activeTimers[id].startedAt : 0;
    return saved + extra;
  }, [activeTimers, tick]);

  const getDisplay = useCallback((id) => {
    return fmtMs(getElapsed(id));
  }, [getElapsed]);

  const timerStart = useCallback((id, type, nameHint) => {
    if (activeTimers[id]) return;
    const startedAt = Date.now();
    const meta = { startedAt, type, name: nameHint || id };
    setActiveTimers(prev => ({ ...prev, [id]: meta }));
    const running = store.get('timer_running', {});
    running[id] = meta;
    store.set('timer_running', running);
  }, [activeTimers]);

  const timerStop = useCallback((id) => {
    const active = activeTimers[id];
    if (!active) return;
    const elapsed = Date.now() - active.startedAt;
    const log = store.get(TIMER_KEY(), {});
    const prev = log[id] || { elapsed: 0 };
    log[id] = { elapsed: prev.elapsed + elapsed, type: active.type, name: active.name };
    store.set(TIMER_KEY(), log);
    const running = store.get('timer_running', {});
    delete running[id];
    store.set('timer_running', running);
    setActiveTimers(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, [activeTimers]);

  const timerToggle = useCallback((id, type, nameHint) => {
    if (activeTimers[id]) timerStop(id);
    else timerStart(id, type, nameHint);
  }, [activeTimers, timerStart, timerStop]);

  const timerStopAll = useCallback(() => {
    Object.keys(activeTimers).forEach(id => timerStop(id));
  }, [activeTimers, timerStop]);

  const getTimerLog = useCallback(() => {
    const log = store.get(TIMER_KEY(), {});
    const allIds = new Set([...Object.keys(log), ...Object.keys(activeTimers)]);
    const entries = [];
    allIds.forEach(id => {
      const savedMs = (log[id] || { elapsed: 0 }).elapsed;
      const runMs = activeTimers[id] ? Date.now() - activeTimers[id].startedAt : 0;
      const elapsed = savedMs + runMs;
      if (elapsed < 1000) return;
      const meta = activeTimers[id] || log[id] || {};
      entries.push({ id, elapsed, type: meta.type || '?', name: meta.name || id, live: !!activeTimers[id] });
    });
    return entries.sort((a, b) => b.elapsed - a.elapsed);
  }, [activeTimers, tick]);

  const getWorkLearnMs = useCallback(() => {
    const log = store.get(TIMER_KEY(), {});
    let workMs = 0, learnMs = 0;
    Object.values(log).forEach(e => {
      if (e.type === 'task' || e.type === 'client') workMs += e.elapsed || 0;
      if (e.type === 'skill') learnMs += e.elapsed || 0;
    });
    Object.entries(activeTimers).forEach(([, a]) => {
      const r = Date.now() - a.startedAt;
      if (a.type === 'task' || a.type === 'client') workMs += r;
      if (a.type === 'skill') learnMs += r;
    });
    return { workMs, learnMs };
  }, [activeTimers, tick]);

  return {
    activeTimers,
    timerStart,
    timerStop,
    timerToggle,
    timerStopAll,
    getElapsed,
    getDisplay,
    isRunning: (id) => !!activeTimers[id],
    getTimerLog,
    getWorkLearnMs,
  };
}
