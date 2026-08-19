import { useContext } from 'react';
import { ToastContext } from '../context/ToastContext';
import type { Toast, ToastType } from '../context/ToastContext';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

const iconMap: Record<ToastType, React.ElementType> = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
  warning: AlertTriangle,
};

const styleMap: Record<ToastType, string> = {
  success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
  error: 'bg-red-50 border-red-200 text-red-800',
  info: 'bg-blue-50 border-blue-200 text-blue-800',
  warning: 'bg-amber-50 border-amber-200 text-amber-800',
};

const iconColorMap: Record<ToastType, string> = {
  success: 'text-emerald-500',
  error: 'text-red-500',
  info: 'text-blue-500',
  warning: 'text-amber-500',
};

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const Icon = iconMap[toast.type];
  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 rounded-xl border shadow-lg backdrop-blur-sm min-w-[320px] max-w-md animate-slide-down ${styleMap[toast.type]}`}
    >
      <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${iconColorMap[toast.type]}`} />
      <p className="text-sm font-medium flex-1">{toast.message}</p>
      <button
        onClick={() => onRemove(toast.id)}
        className="p-0.5 hover:opacity-70 transition-opacity shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export function ToastContainer() {
  const ctx = useContext(ToastContext);
  if (!ctx) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
      {ctx.toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem toast={toast} onRemove={ctx.removeToast} />
        </div>
      ))}
    </div>
  );
}
