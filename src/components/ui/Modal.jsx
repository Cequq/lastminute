import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, AlertTriangle } from 'lucide-react';
import { Spinner } from './States';

export function Modal({ open, onClose, title, children, wide = false }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    ref.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  // Portal: sticky/transform-той эцэг элементийн stacking context-оос гарч, үргэлж хамгийн дээр харагдана
  return createPortal((
    <div className="fixed inset-0 z-[1000] flex items-end justify-center bg-midnight/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
         onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title}
           className={`max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-surface shadow-2xl outline-none sm:rounded-3xl ${wide ? 'sm:max-w-2xl' : 'sm:max-w-md'}`}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-surface px-5 py-4">
          <h2 className="text-base font-semibold">{title}</h2>
          <button onClick={onClose} className="btn-ghost -mr-2 p-2" aria-label="Хаах"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  ), document.body);
}

// Устгахын өмнөх баталгаажуулах цонх
export function ConfirmDialog({ open, title, message, confirmLabel = 'Устгах', onConfirm, onCancel, busy }) {
  return (
    <Modal open={open} onClose={busy ? undefined : onCancel} title={title}>
      <div className="flex gap-4">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-rose-tint text-rose">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <p className="text-sm text-ink-soft">{message}</p>
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <button className="btn-outline" onClick={onCancel} disabled={busy}>Болих</button>
        <button className="btn-danger" onClick={onConfirm} disabled={busy}>
          {busy && <Spinner className="h-4 w-4" />} {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
