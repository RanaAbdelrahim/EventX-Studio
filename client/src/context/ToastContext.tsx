import React, { createContext, useContext, useEffect, useRef, useState } from 'react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextType {
  toasts: Toast[];
  showToast: (message: string, type?: ToastType) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType>({
  toasts: [],
  showToast: () => {},
  removeToast: () => {},
});

export const useToast = () => useContext(ToastContext);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timersRef = useRef<Record<string, number>>({});

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
    const timer = timersRef.current[id];
    if (timer) {
      window.clearTimeout(timer);
      delete timersRef.current[id];
    }
  };

  const showToast = (message: string, type: ToastType = 'info') => {
    const id =
      (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`).toString();
    const duration = 5000;

    setToasts(prev => [...prev, { id, message, type, duration }]);
    timersRef.current[id] = window.setTimeout(() => removeToast(id), duration);
  };

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      Object.values(timersRef.current).forEach(t => window.clearTimeout(t));
      timersRef.current = {};
    };
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, showToast, removeToast }}>
      {children}

      {toasts.length > 0 && (
        <div className="fixed bottom-4 right-4 z-50 space-y-2">
          {toasts.map(toast => {
            const isAlert = toast.type === 'error' || toast.type === 'warning';
            return (
              <div
                key={toast.id}
                role={isAlert ? 'alert' : 'status'}
                aria-live={isAlert ? 'assertive' : 'polite'}
                className={`px-4 py-3 rounded-lg shadow-lg max-w-xs flex items-start
                  ${toast.type === 'success' ? 'bg-green-500 text-white' : ''}
                  ${toast.type === 'error' ? 'bg-red-500 text-white' : ''}
                  ${toast.type === 'warning' ? 'bg-yellow-500 text-white' : ''}
                  ${toast.type === 'info' ? 'bg-blue-500 text-white' : ''}`}
              >
                <div className="flex-1">{toast.message}</div>
                <button
                  aria-label="Dismiss notification"
                  onClick={() => removeToast(toast.id)}
                  className="ml-2 text-white hover:text-gray-200"
                >
                  &times;
                </button>
              </div>
            );
          })}
        </div>
      )}
    </ToastContext.Provider>
  );
};
