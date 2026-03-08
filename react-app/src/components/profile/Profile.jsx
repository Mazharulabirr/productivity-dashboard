import { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { ChangePinModal } from '../lock/PinLock';
import Modal from '../shared/Modal';

const PROFILE_KEY = 'user_profile';

export function getProfile() {
  try {
    return JSON.parse(localStorage.getItem(PROFILE_KEY)) || {};
  } catch { return {}; }
}

function saveProfile(data) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(data));
}

const AVATAR_COLORS = [
  '#f97316', '#8b5cf6', '#3b82f6', '#22c55e',
  '#ef4444', '#ec4899', '#06b6d4', '#eab308',
];

const ROLES = [
  'Freelancer', 'Developer', 'Designer', 'Student',
  'Entrepreneur', 'Writer', 'Marketer', 'Other',
];

export default function Profile() {
  const { saveProfileData } = useApp();
  const [profile, setProfileState] = useState(getProfile);
  const [saved, setSaved] = useState('');
  const [showPinModal, setShowPinModal] = useState(false);
  const [avatarTab, setAvatarTab] = useState('color');
  const fileRef = useRef(null);

  const set = (k, v) => setProfileState(p => ({ ...p, [k]: v }));

  const handleSave = () => {
    saveProfileData(profile);
    setSaved('✓ Saved');
    setTimeout(() => setSaved(''), 2000);
  };

  const handleAvatarImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 800 * 1024) { alert('Image too large. Please choose one under 800KB.'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => { set('avatarImg', ev.target.result); setAvatarTab('image'); };
    reader.readAsDataURL(file);
  };

  const initials = (() => {
    const n = (profile.name || '').trim();
    if (!n) return '?';
    const parts = n.split(' ').filter(Boolean);
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : n.slice(0, 2).toUpperCase();
  })();

  const avatarColor = profile.avatarColor || '#f97316';

  const hasPin = !!localStorage.getItem('dashboard_pin');

  return (
    <div>
      <div className="section-header">
        <div>
          <h2 className="section-title">Profile & Settings</h2>
          <p className="section-sub">Manage your personal info and preferences</p>
        </div>
        <button className="btn btn-primary" onClick={handleSave}>
          {saved || 'Save Changes'}
        </button>
      </div>

      <div className="profile-layout">
        {/* ── Left: Avatar Card ── */}
        <div className="profile-avatar-card card">
          <div className="profile-avatar-preview" style={{ background: profile.avatarImg ? 'transparent' : avatarColor }}>
            {profile.avatarImg
              ? <img src={profile.avatarImg} alt="avatar" className="profile-avatar-img" />
              : <span className="profile-avatar-initials">{initials}</span>
            }
          </div>

          <div className="profile-name-display">{profile.name || 'Your Name'}</div>
          <div className="profile-role-display">{profile.role || 'Freelancer'}</div>
          {profile.email && <div className="profile-email-display">{profile.email}</div>}

          <div style={{ width: '100%', marginTop: 16 }}>
            <div className="profile-section-label">Avatar Style</div>
            <div className="profile-avatar-tabs">
              {['color', 'image'].map(t => (
                <button key={t} className={`profile-tab-btn${avatarTab === t ? ' active' : ''}`} onClick={() => setAvatarTab(t)}>
                  {t === 'color' ? 'Color' : 'Photo'}
                </button>
              ))}
            </div>

            {avatarTab === 'color' && (
              <div className="profile-color-grid">
                {AVATAR_COLORS.map(c => (
                  <button
                    key={c}
                    className={`profile-color-swatch${avatarColor === c ? ' selected' : ''}`}
                    style={{ background: c }}
                    onClick={() => { set('avatarColor', c); set('avatarImg', ''); }}
                  />
                ))}
              </div>
            )}

            {avatarTab === 'image' && (
              <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <input type="file" accept="image/*" ref={fileRef} style={{ display: 'none' }} onChange={handleAvatarImage} />
                <button className="btn btn-ghost w-full" onClick={() => fileRef.current.click()}>
                  Upload Photo
                </button>
                {profile.avatarImg && (
                  <button className="btn btn-danger btn-sm w-full" onClick={() => { set('avatarImg', ''); setAvatarTab('color'); }}>
                    Remove Photo
                  </button>
                )}
                <p style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>Max 800KB. JPG, PNG, WebP.</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Right: Info & Settings ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Personal Info */}
          <div className="card">
            <div className="profile-section-title">
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#f97316" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              Personal Information
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input className="inp" placeholder="Your full name" value={profile.name || ''} onChange={e => set('name', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Display Name / Nickname</label>
                <input className="inp" placeholder="How should we greet you?" value={profile.nickname || ''} onChange={e => set('nickname', e.target.value)} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input className="inp" type="email" placeholder="you@email.com" value={profile.email || ''} onChange={e => set('email', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <input className="inp" type="tel" placeholder="+880 ..." value={profile.phone || ''} onChange={e => set('phone', e.target.value)} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Role / Profession</label>
                <select className="inp" value={profile.role || ''} onChange={e => set('role', e.target.value)}>
                  <option value="">Select role...</option>
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Location</label>
                <input className="inp" placeholder="City, Country" value={profile.location || ''} onChange={e => set('location', e.target.value)} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Bio / About</label>
              <textarea className="inp" rows={3} placeholder="A short bio about yourself..." value={profile.bio || ''} onChange={e => set('bio', e.target.value)} />
            </div>
          </div>

          {/* Online Profiles */}
          <div className="card">
            <div className="profile-section-title">
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#3b82f6" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>
              Online Profiles
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">GitHub Username</label>
                <div className="inp-prefix-wrap">
                  <span className="inp-prefix">github.com/</span>
                  <input className="inp inp-with-prefix" placeholder="username" value={profile.github || ''} onChange={e => set('github', e.target.value)} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">LinkedIn URL</label>
                <input className="inp" placeholder="linkedin.com/in/..." value={profile.linkedin || ''} onChange={e => set('linkedin', e.target.value)} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Upwork Profile URL</label>
                <input className="inp" placeholder="upwork.com/freelancers/..." value={profile.upwork || ''} onChange={e => set('upwork', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Portfolio / Website</label>
                <input className="inp" placeholder="https://yoursite.com" value={profile.website || ''} onChange={e => set('website', e.target.value)} />
              </div>
            </div>
          </div>

          {/* Work & Finance */}
          <div className="card">
            <div className="profile-section-title">
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#22c55e" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
              Work & Finance
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Hourly Rate ($)</label>
                <input className="inp" type="number" min="0" placeholder="0" value={profile.hourlyRate || ''} onChange={e => set('hourlyRate', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Monthly Income Goal ($)</label>
                <input className="inp" type="number" min="0" placeholder="0" value={profile.incomeGoal || ''} onChange={e => set('incomeGoal', e.target.value)} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Daily Work Hours Goal</label>
                <input className="inp" type="number" min="1" max="24" placeholder="8" value={profile.workHrsGoal || ''} onChange={e => set('workHrsGoal', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Work Start Time</label>
                <input className="inp" type="time" value={profile.workStart || ''} onChange={e => set('workStart', e.target.value)} />
              </div>
            </div>
          </div>

          {/* Security */}
          <div className="card">
            <div className="profile-section-title">
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#8b5cf6" strokeWidth="2"><rect x="3" y="11" width="18" height="12" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
              Security
            </div>
            <div className="profile-security-row">
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 3 }}>Dashboard PIN</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {hasPin ? 'PIN is set. Click to change or remove it.' : 'No PIN set. Add one to protect your dashboard.'}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className={`badge ${hasPin ? 'badge-green' : 'badge-muted'}`}>{hasPin ? 'Active' : 'None'}</span>
                <button className="btn btn-ghost btn-sm" onClick={() => setShowPinModal(true)}>
                  {hasPin ? 'Change PIN' : 'Set PIN'}
                </button>
              </div>
            </div>
          </div>

          {/* Danger zone */}
          <div className="card profile-danger-zone">
            <div className="profile-section-title" style={{ color: 'var(--red)' }}>
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#ef4444" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              Danger Zone
            </div>
            <div className="profile-security-row">
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 3 }}>Clear All App Data</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Permanently deletes all tasks, clients, habits, income, notes and settings.</div>
              </div>
              <button className="btn btn-danger btn-sm" onClick={() => {
                if (confirm('⚠️ This will delete ALL your data permanently. Are you absolutely sure?')) {
                  if (confirm('Last chance — this cannot be undone. Confirm?')) {
                    localStorage.clear();
                    sessionStorage.clear();
                    window.location.reload();
                  }
                }
              }}>
                Clear All Data
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Save button (bottom) */}
      <div style={{ textAlign: 'right', marginTop: 20 }}>
        <button className="btn btn-primary" onClick={handleSave} style={{ minWidth: 160 }}>
          {saved || 'Save Changes'}
        </button>
      </div>

      {showPinModal && (
        <Modal title={hasPin ? 'Change PIN' : 'Set PIN'} onClose={() => setShowPinModal(false)}>
          <ChangePinModal onClose={() => setShowPinModal(false)} />
        </Modal>
      )}
    </div>
  );
}
