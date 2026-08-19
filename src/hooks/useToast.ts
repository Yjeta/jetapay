import { useContext, useMemo } from 'react';
import { ToastContext } from '../context/ToastContext';

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return useMemo(
    () => ({
      success: (msg: string) => ctx.addToast('success', msg),
      error: (msg: string) => ctx.addToast('error', msg),
      info: (msg: string) => ctx.addToast('info', msg),
      warning: (msg: string) => ctx.addToast('warning', msg),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ctx.addToast]
  );
}
