import { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { SECTION_TITLES } from './Sidebar';
import Modal from '../shared/Modal';
import { ChangePinModal } from '../lock/PinLock';

function MiniAvatar({ profile, onClick }) {
  const initials = (() => {
    const n = (profile.name || '').trim();
    if (!n) return '?';
    const parts = n.split(' ').filter(Boolean);
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : n.slice(0, 2).toUpperCase();
  })();
  return (
    <button className="topbar-avatar" onClick={onClick} title={profile.name || 'Profile'} style={{ background: profile.avatarImg ? 'transparent' : (profile.avatarColor || '#f97316') }}>
      {profile.avatarImg
        ? <img src={profile.avatarImg} alt="avatar" className="topbar-avatar-img" />
        : <span>{initials}</span>}
    </button>
  );
}

export default function Topbar({ onToggle, onLock }) {
  const { section, setSection, getProfileData } = useApp();
  const [time, setTime] = useState('');
  const [date, setDate] = useState('');
  const [showPinModal, setShowPinModal] = useState(false);
  const profile = getProfileData();

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setDate(now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <>
      <header className="topbar">
        <button className="topbar-toggle" onClick={onToggle} title="Toggle sidebar">
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>
        <span className="topbar-title">{SECTION_TITLES[section] || 'Dashboard'}</span>
        <div className="topbar-right">
          <span className="topbar-date">{date}</span>
          <span className="clock">{time}</span>
          <button className="topbar-icon-btn" onClick={() => setShowPinModal(true)} title="Change PIN">
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="12" rx="2"/>
              <path d="M7 11V7a5 5 0 0110 0v4"/>
              <circle cx="12" cy="17" r="1" fill="currentColor"/>
            </svg>
          </button>
          {onLock && (
            <button className="topbar-icon-btn topbar-lock-btn" onClick={onLock} title="Lock dashboard">
              <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="12" rx="2"/>
                <path d="M7 11V7a5 5 0 0110 0v4"/>
              </svg>
              Lock
            </button>
          )}
          <MiniAvatar profile={profile} onClick={() => setSection('profile')} />
        </div>
      </header>

      {showPinModal && (
        <Modal title="Change PIN" onClose={() => setShowPinModal(false)}>
          <ChangePinModal onClose={() => setShowPinModal(false)} />
        </Modal>
      )}
    </>
  );
}
