import React, { createContext, useContext, useState } from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle, AlertCircle, XCircle, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
}

interface ToastContextType {
  toast: (toast: Omit<Toast, 'id'>) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  warning: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast = { ...toast, id };
    
    setToasts(prev => [...prev, newToast]);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      removeToast(id);
    }, 5000);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const success = (title: string, description?: string) => 
    addToast({ type: 'success', title, description });
  
  const error = (title: string, description?: string) => 
    addToast({ type: 'error', title, description });
  
  const warning = (title: string, description?: string) => 
    addToast({ type: 'warning', title, description });
  
  const info = (title: string, description?: string) => 
    addToast({ type: 'info', title, description });

  const getToastIcon = (type: ToastType) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5" />;
      case 'error':
        return <XCircle className="h-5 w-5" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5" />;
      case 'info':
        return <AlertCircle className="h-5 w-5" />;
    }
  };

  const getToastStyles = (type: ToastType) => {
    switch (type) {
      case 'success':
        return 'bg-success text-success-foreground border-success';
      case 'error':
        return 'bg-destructive text-destructive-foreground border-destructive';
      case 'warning':
        return 'bg-warning text-warning-foreground border-warning';
      case 'info':
        return 'bg-accent text-accent-foreground border-accent';
    }
  };

  return (
    <ToastContext.Provider value={{ toast: addToast, success, error, warning, info }}>
      {children}
      
      {/* Toast Container */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              "flex items-start space-x-3 rounded-lg border p-4 shadow-lg max-w-sm animate-slide-up",
              getToastStyles(toast.type)
            )}
          >
            <div className="flex-shrink-0">
              {getToastIcon(toast.type)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{toast.title}</p>
              {toast.description && (
                <p className="text-sm opacity-90 mt-1">{toast.description}</p>
              )}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="flex-shrink-0 opacity-70 hover:opacity-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}