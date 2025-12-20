'use client';

import { useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  message: string;
  type?: ToastType;
  duration?: number;
  onClose: () => void;
}

export function Toast({ message, type = 'info', duration = 5000, onClose }: ToastProps) {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-4 w-4" />;
      case 'error':
        return <XCircle className="h-4 w-4" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4" />;
      case 'info':
        return <Info className="h-4 w-4" />;
    }
  };

  const getStyles = () => {
    switch (type) {
      case 'success':
        return 'bg-emerald-600/95 border-emerald-500/50 text-white';
      case 'error':
        return 'bg-red-600/95 border-red-500/50 text-white';
      case 'warning':
        return 'bg-yellow-600/95 border-yellow-500/50 text-white';
      case 'info':
        return 'bg-blue-600/95 border-blue-500/50 text-white';
    }
  };

  return (
    <div
      className={`${getStyles()} border backdrop-blur-sm px-3 py-2.5 rounded-lg shadow-xl animate-in slide-in-from-right-full duration-300 fade-in`}
      role="alert"
    >
      <div className="flex items-center gap-2">
        <div className="shrink-0">{getIcon()}</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium leading-snug">{message}</p>
        </div>
        <button
          onClick={onClose}
          className="shrink-0 text-white/70 hover:text-white transition-colors rounded p-0.5 hover:bg-white/10"
          aria-label="Cerrar notificación"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

