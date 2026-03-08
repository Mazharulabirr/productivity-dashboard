import { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import Modal from '../shared/Modal';
import { IconEdit, IconDelete, IconChevronDown, IconExternalLink, IconClose } from '../shared/Icons';
import { uid, todayStr } from '../../utils';
import { store } from '../../store';

const PLAT_COLOR = { YouTube: 'badge-red', Udemy: 'badge-purple', Coursera: 'badge-blue', Other: 'badge-muted' };
const EMPTY = { title: '', platform: 'YouTube', url: '', skillId: '', lessons: [''] };

export default function Courses({ skills }) {
  const { getCourses, saveCourse, deleteCourse, toggleLesson, revision } = useApp();
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [expanded, setExpanded] = useState({});
  const [fetching, setFetching] = useState(false);
  const [fetchResult, setFetchResult] = useState('');
  const courses = getCourses();

  const openAdd = () => { setForm({ ...EMPTY, lessons: [''] }); setEditId(null); setModal(true); setFetchResult(''); };
  const openEdit = (c) => {
    setForm({ title: c.title, platform: c.platform, url: c.url || '', skillId: c.skillId || '', lessons: c.lessons.map(l => l.title) });
    setEditId(c.id); setModal(true); setFetchResult('');
  };
  const closeModal = () => setModal(false);

  const handleSave = () => {
    if (!form.title.trim()) return;
    const lessons = form.lessons.filter(t => t.trim()).map(t => ({ id: uid(), title: t, done: false }));
    saveCourse({ title: form.title, platform: form.platform, url: form.url, skillId: form.skillId, lessons }, editId);
    setModal(false);
  };

  const handleDelete = (id) => { if (confirm('Delete this course?')) deleteCourse(id); };
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const updateLesson = (idx, val) => setForm(f => {
    const lessons = [...f.lessons]; lessons[idx] = val; return { ...f, lessons };
  });
  const addLesson = () => setForm(f => ({ ...f, lessons: [...f.lessons, ''] }));
  const removeLesson = (idx) => setForm(f => ({ ...f, lessons: f.lessons.filter((_, i) => i !== idx) }));

  const showFetchBtn = form.platform === 'YouTube' && form.url.includes('list=');

  const fetchPlaylist = async () => {
    const url = form.url.trim();
    let listId;
    try { listId = new URL(url).searchParams.get('list'); } catch {}
    if (!listId) { alert('Valid YouTube playlist URL দরকার (must contain ?list=...)'); return; }
    let apiKey = store.getStr('yt_api_key', '');
    if (!apiKey) {
      apiKey = prompt('YouTube Data API v3 key দরকার playlist auto-fetch করতে।\n\n1. console.cloud.google.com\n2. New Project → YouTube Data API v3 Enable\n3. Credentials → Create API Key\n\n(শুধু locally save হবে)');
      if (!apiKey) return;
      store.setStr('yt_api_key', apiKey.trim());
    }
    setFetching(true); setFetchResult('Fetching...');
    try {
      const videos = [];
      let pageToken = '';
      do {
        const endpoint = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${encodeURIComponent(listId)}${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}&key=${encodeURIComponent(apiKey)}`;
        const res = await fetch(endpoint);
        const data = await res.json();
        if (!res.ok) {
          if (res.status === 403) { store.setStr('yt_api_key', ''); throw new Error('API key invalid বা quota শেষ। Key clear করা হয়েছে।'); }
          throw new Error(data.error?.message || `YouTube API error (${res.status})`);
        }
        (data.items || []).forEach(item => {
          const title = item.snippet?.title;
          if (title && title !== 'Deleted video' && title !== 'Private video') videos.push(title);
        });
        pageToken = data.nextPageToken || '';
      } while (pageToken && videos.length < 200);
      setForm(f => ({ ...f, lessons: videos.length ? videos : f.lessons }));
      setFetchResult(`✓ ${videos.length} videos added`);
    } catch (err) {
      alert('Fetch error:\n' + err.message);
      setFetchResult('');
    }
    setFetching(false);
  };

  return (
    <div>
      <div className="section-subheader">
        <h3 className="section-subtitle">Courses &amp; Playlists</h3>
        <button id="add-course-btn" className="btn btn-primary btn-sm" onClick={openAdd}>+ Add Course</button>
      </div>

      {courses.length === 0 ? (
        <div className="empty-state">
          <svg width="38" height="38" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
          <p>No courses yet — add a YouTube playlist or course!</p>
        </div>
      ) : (
        <div className="course-grid">
          {courses.map(c => {
            const total = c.lessons.length;
            const done = c.lessons.filter(l => l.done).length;
            const pct = total ? Math.round((done / total) * 100) : 0;
            const skill = skills.find(s => s.id === c.skillId);
            const isOpen = expanded[c.id];
            return (
              <div key={c.id} className="course-card">
                <div className="course-card-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                    <div className="course-icon">
                      <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div className="course-title">{c.title}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                        <span className={`badge ${PLAT_COLOR[c.platform] || 'badge-muted'}`}>{c.platform}</span>
                        {skill && <span className="badge badge-purple">{skill.name}</span>}
                        <span className="text-muted text-sm">{done}/{total} done</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    {c.url && <a href={c.url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm" style={{ padding: '4px 10px', fontSize: 11, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}><IconExternalLink /> Open</a>}
                    <button className={`btn-icon${isOpen ? ' active' : ''}`} onClick={() => setExpanded(e => ({ ...e, [c.id]: !e[c.id] }))} title="Toggle"><IconChevronDown /></button>
                    <button className="btn-icon" onClick={() => openEdit(c)} title="Edit"><IconEdit /></button>
                    <button className="btn-icon btn-danger" onClick={() => handleDelete(c.id)} title="Delete"><IconDelete /></button>
                  </div>
                </div>
                <div className="course-progress-row">
                  <div className="progress-wrap" style={{ flex: 1 }}>
                    <div className="progress-fill" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="course-pct">{pct}%</span>
                </div>
                {isOpen && (
                  <div className="course-lessons-list">
                    {total === 0 ? <span className="text-muted text-sm" style={{ padding: 8 }}>No lessons added.</span> :
                      c.lessons.map(l => (
                        <div key={l.id} className={`lesson-item${l.done ? ' done' : ''}`}>
                          <input type="checkbox" className="task-check" checked={l.done} onChange={() => toggleLesson(c.id, l.id)} />
                          <span className="lesson-title">{l.title}</span>
                        </div>
                      ))
                    }
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {modal && (
        <Modal title={editId ? 'Edit Course' : 'Add Course / Playlist'} onClose={closeModal}>
          <div className="form-group">
            <label className="form-label">Course Title *</label>
            <input className="inp" autoFocus placeholder="e.g. React Complete Guide..." value={form.title} onChange={e => set('title', e.target.value)} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Platform</label>
              <select className="inp" value={form.platform} onChange={e => set('platform', e.target.value)}>
                <option>YouTube</option><option>Udemy</option><option>Coursera</option><option>Other</option>
              </select>
            </div>
            <div className="form-group" style={{ flex: 2 }}>
              <label className="form-label">URL</label>
              <div className="url-fetch-row">
                <input className="inp" placeholder="https://youtube.com/playlist?list=..." value={form.url} onChange={e => set('url', e.target.value)} />
                {showFetchBtn && (
                  <button className="btn btn-ghost btn-sm" onClick={fetchPlaylist} disabled={fetching}>
                    {fetchResult || (fetching ? 'Fetching…' : '⬇ Auto-fetch')}
                  </button>
                )}
              </div>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Linked Skill</label>
            <select className="inp" value={form.skillId} onChange={e => set('skillId', e.target.value)}>
              <option value="">— Not linked —</option>
              {skills.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
              Lessons / Episodes
              <button className="btn btn-ghost btn-sm" type="button" onClick={addLesson}>+ Add</button>
            </label>
            <div className="lessons-input-list">
              {form.lessons.map((l, i) => (
                <div key={i} className="lesson-input-row">
                  <span className="lesson-num">{i + 1}</span>
                  <input className="inp lesson-inp" placeholder="Lesson title..." value={l} onChange={e => updateLesson(i, e.target.value)} />
                  <button className="btn-icon btn-danger" type="button" onClick={() => removeLesson(i)}><IconClose /></button>
                </div>
              ))}
            </div>
          </div>
          <div className="modal-actions">
            <button className="btn btn-ghost" onClick={closeModal}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave}>{editId ? 'Update Course' : 'Add Course'}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
