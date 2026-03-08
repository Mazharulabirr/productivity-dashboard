import { useState, useEffect, useCallback } from 'react';

const PIN_KEY = 'dashboard_pin';
const SESSION_KEY = 'dashboard_unlocked';
const LOCK_FLAG  = 'dashboard_locked';   // set when user manually locks
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 30000; // 30 seconds

// Simple hash using btoa + salt so PIN isn't stored as plain text
function hashPin(pin) {
  return btoa('pdash::' + pin + '::lock');
}

function getStoredPin() {
  return localStorage.getItem(PIN_KEY);
}

function verifyPin(pin) {
  const stored = getStoredPin();
  return stored && stored === hashPin(pin);
}

const PAD = [
  ['1','2','3'],
  ['4','5','6'],
  ['7','8','9'],
  ['','0','⌫'],
];

export function usePinLock() {
  const [locked, setLocked] = useState(() => {
    // Already unlocked this session → stay unlocked
    if (sessionStorage.getItem(SESSION_KEY) === '1') return false;
    // Every fresh session (new tab, new browser, new device) starts locked
    return true;
  });

  const unlock = () => {
    sessionStorage.setItem(SESSION_KEY, '1');
    sessionStorage.removeItem(LOCK_FLAG);  // clear manual lock
    setLocked(false);
  };

  const lock = () => {
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.setItem(LOCK_FLAG, '1');  // persist lock across reload
    setLocked(true);
  };

  return { locked, unlock, lock };
}

export default function PinLock({ onUnlock, onSkip }) {
  const hasPin = !!getStoredPin();
  const [mode, setMode] = useState(hasPin ? 'enter' : 'setup'); // 'enter' | 'setup' | 'confirm'
  const [pin, setPin] = useState('');
  const [setupPin, setSetupPin] = useState('');
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const isLockedOut = lockedUntil && now < lockedUntil;
  const lockoutSec = isLockedOut ? Math.ceil((lockedUntil - now) / 1000) : 0;

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const handleKey = useCallback((k) => {
    if (isLockedOut) return;
    if (k === '⌫') {
      setPin(p => p.slice(0, -1));
      setError('');
      return;
    }
    if (pin.length >= 6) return;
    const next = pin + k;
    setPin(next);

    if (mode === 'enter' && next.length === next.length) {
      // auto-submit at 4-6 digits when enter pressed (user taps confirm)
    }
    if (mode === 'confirm' && next.length === setupPin.length) {
      // wait for confirm
    }
  }, [pin, mode, setupPin, isLockedOut]);

  const handleSubmit = useCallback(() => {
    if (isLockedOut || pin.length < 4) return;

    if (mode === 'enter') {
      if (verifyPin(pin)) {
        onUnlock();
      } else {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        if (newAttempts >= MAX_ATTEMPTS) {
          setLockedUntil(Date.now() + LOCKOUT_DURATION);
          setAttempts(0);
          setError(`Too many attempts. Wait ${LOCKOUT_DURATION / 1000}s.`);
        } else {
          setError(`Wrong PIN. ${MAX_ATTEMPTS - newAttempts} attempts left.`);
        }
        triggerShake();
        setPin('');
      }
    } else if (mode === 'setup') {
      if (pin.length < 4) { setError('PIN must be at least 4 digits.'); return; }
      setSetupPin(pin);
      setPin('');
      setError('');
      setMode('confirm');
    } else if (mode === 'confirm') {
      if (pin === setupPin) {
        localStorage.setItem(PIN_KEY, hashPin(pin));
        onUnlock();
      } else {
        setError('PINs don\'t match. Try again.');
        triggerShake();
        setPin('');
        setSetupPin('');
        setMode('setup');
      }
    }
  }, [pin, mode, setupPin, attempts, isLockedOut, onUnlock]);

  // Allow keyboard input
  useEffect(() => {
    const handler = (e) => {
      if (e.key >= '0' && e.key <= '9') handleKey(e.key);
      else if (e.key === 'Backspace') handleKey('⌫');
      else if (e.key === 'Enter') handleSubmit();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleKey, handleSubmit]);

  const dots = Array.from({ length: Math.max(4, pin.length || (mode === 'confirm' ? setupPin.length : 4)) });
  const title = mode === 'enter' ? 'Enter PIN' : mode === 'setup' ? 'Set up PIN' : 'Confirm PIN';
  const subtitle = mode === 'enter'
    ? 'Enter your PIN to access the dashboard'
    : mode === 'setup'
    ? 'Choose a 4–6 digit PIN to protect your dashboard'
    : `Re-enter your ${setupPin.length}-digit PIN to confirm`;

  return (
    <div className="pin-overlay">
      <div className="pin-card">
        {/* Logo */}
        <div className="pin-logo">
          <div className="pin-logo-icon">
            <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="#f97316" strokeWidth="2.5">
              <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
            </svg>
          </div>
          <span className="pin-logo-text">Productivity</span>
        </div>

        {/* Lock icon */}
        <div className="pin-lock-icon">
          <svg width="32" height="32" fill="none" viewBox="0 0 24 24" strokeWidth="1.5">
            <rect x="3" y="11" width="18" height="12" rx="2" stroke="#8b5cf6"/>
            <path d="M7 11V7a5 5 0 0110 0v4" stroke="#8b5cf6"/>
            <circle cx="12" cy="17" r="1.5" fill="#8b5cf6"/>
          </svg>
        </div>

        <h2 className="pin-title">{title}</h2>
        <p className="pin-subtitle">{subtitle}</p>

        {/* PIN dots */}
        <div className={`pin-dots${shake ? ' pin-shake' : ''}`}>
          {dots.map((_, i) => (
            <div key={i} className={`pin-dot${i < pin.length ? ' filled' : ''}`} />
          ))}
        </div>

        {/* Error */}
        {isLockedOut ? (
          <div className="pin-error">Locked. Try again in {lockoutSec}s</div>
        ) : error ? (
          <div className="pin-error">{error}</div>
        ) : (
          <div className="pin-error-placeholder" />
        )}

        {/* Numpad */}
        <div className="pin-pad">
          {PAD.map((row, ri) => (
            <div key={ri} className="pin-pad-row">
              {row.map((k, ki) => (
                k === '' ? <div key={ki} className="pin-key pin-key-empty" /> :
                k === '⌫' ? (
                  <button key={ki} className="pin-key pin-key-backspace" onClick={() => handleKey('⌫')}>
                    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path d="M21 4H8l-7 8 7 8h13a2 2 0 002-2V6a2 2 0 00-2-2z"/>
                      <line x1="18" y1="9" x2="12" y2="15"/><line x1="12" y1="9" x2="18" y2="15"/>
                    </svg>
                  </button>
                ) : (
                  <button key={ki} className="pin-key pin-key-num" onClick={() => handleKey(k)} disabled={isLockedOut}>
                    {k}
                  </button>
                )
              ))}
            </div>
          ))}
        </div>

        {/* Submit */}
        <button
          className="btn btn-primary pin-submit-btn"
          onClick={handleSubmit}
          disabled={pin.length < 4 || isLockedOut}
        >
          {mode === 'enter' ? 'Unlock' : mode === 'setup' ? 'Next →' : 'Confirm PIN'}
        </button>

        {/* No skip — PIN setup is required */}
      </div>
    </div>
  );
}

// ── Change PIN component (used inside dashboard settings) ──────
export function ChangePinModal({ onClose }) {
  const hasPin = !!getStoredPin();
  const [step, setStep] = useState(hasPin ? 'old' : 'new'); // old → new → confirm
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const handleSave = () => {
    if (hasPin && step === 'old') {
      if (!verifyPin(oldPin)) { setError('Current PIN is incorrect.'); return; }
      setStep('new'); setError(''); setOldPin('');
      return;
    }
    if (step === 'new') {
      if (newPin.length < 4) { setError('PIN must be at least 4 digits.'); return; }
      setStep('confirm'); setError('');
      return;
    }
    if (step === 'confirm') {
      if (newPin !== confirmPin) { setError('PINs don\'t match.'); setStep('new'); setNewPin(''); setConfirmPin(''); return; }
      localStorage.setItem(PIN_KEY, hashPin(newPin));
      setDone(true);
    }
  };

  const handleRemove = () => {
    if (!hasPin) return;
    if (!verifyPin(oldPin)) { setError('Current PIN is incorrect.'); return; }
    localStorage.removeItem(PIN_KEY);
    sessionStorage.removeItem(SESSION_KEY);
    setDone(true);
  };

  if (done) return (
    <div className="change-pin-done">
      <div style={{ fontSize: 32, marginBottom: 8 }}>✓</div>
      <div style={{ fontWeight: 700, color: 'var(--green)', marginBottom: 16 }}>PIN updated!</div>
      <button className="btn btn-primary btn-sm" onClick={onClose}>Close</button>
    </div>
  );

  const current = step === 'old' ? oldPin : step === 'new' ? newPin : confirmPin;
  const setCurrent = step === 'old' ? setOldPin : step === 'new' ? setNewPin : setConfirmPin;
  const labels = { old: 'Current PIN', new: 'New PIN (4–6 digits)', confirm: 'Confirm New PIN' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="form-group">
        <label className="form-label">{labels[step]}</label>
        <input
          className="inp"
          type="password"
          inputMode="numeric"
          maxLength={6}
          placeholder="••••"
          value={current}
          onChange={e => { setCurrent(e.target.value.replace(/\D/g, '')); setError(''); }}
          autoFocus
          onKeyDown={e => e.key === 'Enter' && handleSave()}
          style={{ letterSpacing: '0.3em', fontSize: 20, textAlign: 'center' }}
        />
      </div>
      {error && <div style={{ fontSize: 12, color: 'var(--red)' }}>{error}</div>}
      <div className="modal-actions">
        {step === 'old' && hasPin && (
          <button className="btn btn-danger" onClick={handleRemove} style={{ marginRight: 'auto' }}>Remove PIN</button>
        )}
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={handleSave} disabled={current.length < 4}>
          {step === 'confirm' ? 'Save PIN' : 'Next →'}
        </button>
      </div>
    </div>
  );
}
