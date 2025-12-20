'use client';

import { useToast } from '@/hooks/useToast';
import { ToastContainer } from '@/components/client';

interface ToastProviderProps {
  children: React.ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const { toasts, removeToast } = useToast();

  return (
    <>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      {children}
    </>
  );
}
