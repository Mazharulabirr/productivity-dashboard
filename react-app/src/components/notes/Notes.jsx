import { useState, useEffect, useRef } from 'react';

const NOTES_KEY = 'notes';

export default function Notes() {
  const [text, setText] = useState(() => localStorage.getItem(NOTES_KEY) || '');
  const [status, setStatus] = useState('idle'); // idle | saving | saved
  const debounceRef = useRef(null);
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const lineCount = text ? text.split('\n').length : 0;

  const handleChange = (e) => {
    const val = e.target.value;
    setText(val);
    setStatus('saving');
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      localStorage.setItem(NOTES_KEY, val);
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 2000);
    }, 600);
  };

  const handleClear = () => {
    if (!text.trim()) return;
    if (confirm('Clear all notes?')) {
      setText('');
      localStorage.setItem(NOTES_KEY, '');
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 2000);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 80px)' }}>
      <div className="section-header" style={{ marginBottom: 12 }}>
        <div>
          <h2 className="section-title">Notes</h2>
          <p className="section-sub">Your personal scratchpad — auto-saved</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {status === 'saving' && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Saving...</span>}
          {status === 'saved' && <span style={{ fontSize: 12, color: 'var(--green)' }}>✓ Saved</span>}
          <button className="btn btn-ghost" onClick={handleClear}>Clear</button>
        </div>
      </div>

      <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
        <textarea
          className="notes-textarea"
          value={text}
          onChange={handleChange}
          placeholder="Start typing... your notes are auto-saved as you type."
          spellCheck={false}
          style={{ flex: 1, resize: 'none', width: '100%', padding: '20px', background: 'transparent', border: 'none', outline: 'none', color: 'var(--text)', fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace", fontSize: 14, lineHeight: 1.7 }}
        />
        <div style={{ display: 'flex', gap: 16, padding: '8px 20px', borderTop: '1px solid var(--border)', fontSize: 12, color: 'var(--text-muted)' }}>
          <span>{wordCount} words</span>
          <span>{lineCount} lines</span>
          <span>{text.length} chars</span>
        </div>
      </div>
    </div>
  );
}
