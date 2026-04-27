import { useEffect } from 'react';

export function Modal({ title, children, onClose, footer }) {
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-40 flex items-end sm:items-center justify-center modal-overlay"
      style={{ background: 'rgba(0,0,0,0.8)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
    >
      <div
        className="w-full sm:max-w-md bg-bg-card border border-border-emphasis rounded-t-md sm:rounded-md"
        style={{ borderRadius: '4px 4px 0 0', maxHeight: '90dvh', overflowY: 'auto' }}
      >
        {title && (
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="section-header text-base">{title}</span>
            <button
              onClick={onClose}
              className="text-text-muted hover:text-text-primary transition-colors"
              style={{ fontSize: '1.25rem', lineHeight: 1, cursor: 'pointer', background: 'none', border: 'none' }}
            >
              ×
            </button>
          </div>
        )}
        <div className="p-4">{children}</div>
        {footer && (
          <div className="px-4 pb-4 flex gap-2">{footer}</div>
        )}
      </div>
    </div>
  );
}
