import { useState, useEffect, useCallback, createContext, useContext, type ReactNode } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextType {
  toast: (type: ToastType, message: string) => void;
}

const ToastContext = createContext<ToastContextType>({
  toast: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

const icons: Record<ToastType, ReactNode> = {
  success: <CheckCircle className="h-5 w-5 text-[var(--color-success)]" />,
  error: <AlertCircle className="h-5 w-5 text-[var(--color-error)]" />,
  info: <Info className="h-5 w-5 text-[var(--color-info)]" />,
};

const bgColors: Record<ToastType, string> = {
  success: 'border-l-[var(--color-success)]',
  error: 'border-l-[var(--color-error)]',
  info: 'border-l-[var(--color-info)]',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((type: ToastType, message: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, type, message }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}

      {/* Toast container */}
      <div className="fixed top-4 right-4 z-[var(--z-toast)] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={() => removeToast(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 5000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div
      className={[
        'pointer-events-auto',
        'bg-[var(--color-bg-raised)] rounded-[var(--radius-md)]',
        'border border-[var(--color-border-default)] border-l-4',
        bgColors[toast.type],
        'shadow-[var(--shadow-md)]',
        'p-3 flex items-start gap-3',
        'animate-[slideInRight_200ms_ease-out]',
      ].join(' ')}
      role="alert"
    >
      <span className="shrink-0 mt-0.5">{icons[toast.type]}</span>
      <p className="text-body text-[var(--color-text-primary)] flex-1">
        {toast.message}
      </p>
      <button
        onClick={onDismiss}
        className="shrink-0 p-0.5 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
