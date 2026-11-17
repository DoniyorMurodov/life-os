import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import Icon from './Icon';

const ToastContext = createContext(null);

/**
 * toast(message, { type: 'success' | 'error' | 'info', action: { label, onClick }, duration })
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id));
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
  }, []);

  const toast = useCallback(
    (message, options = {}) => {
      const id = Math.random().toString(36).slice(2);
      const item = { id, message, type: options.type || 'success', action: options.action };
      setToasts((list) => [...list.slice(-2), item]);
      timers.current.set(id, setTimeout(() => dismiss(id), options.duration || (options.action ? 6000 : 3500)));
      return id;
    },
    [dismiss],
  );

  useEffect(() => {
    const onStorageError = () =>
      toast('Could not save data — device storage may be full.', { type: 'error', duration: 6000 });
    window.addEventListener('lifeos:storage-error', onStorageError);
    const pending = timers.current;
    return () => {
      window.removeEventListener('lifeos:storage-error', onStorageError);
      pending.forEach(clearTimeout);
    };
  }, [toast]);

  const value = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-region" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.type}`}>
            <Icon name={t.type === 'error' ? 'alert' : t.type === 'info' ? 'info' : 'check'} size={18} />
            <span className="toast-message">{t.message}</span>
            {t.action && (
              <button
                type="button"
                className="toast-action"
                onClick={() => {
                  t.action.onClick();
                  dismiss(t.id);
                }}
              >
                {t.action.label}
              </button>
            )}
            <button type="button" className="icon-btn icon-btn-sm" aria-label="Dismiss notification" onClick={() => dismiss(t.id)}>
              <Icon name="x" size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx.toast;
}
