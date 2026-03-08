import { useEffect } from 'react';
import { IconClose } from './Icons';

export default function Modal({ id, title, onClose, children }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">{title}</span>
          <button className="btn-icon" onClick={onClose} title="Close">
            <IconClose size={14} />
          </button>
        </div>
        <div className="modal-form">
          {children}
        </div>
      </div>
    </div>
  );
}
