import { Loader2, AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning';
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  secondConfirmLabel?: string;
  onSecondConfirm?: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  variant = 'danger',
  loading = false,
  onConfirm,
  onCancel,
  secondConfirmLabel,
  onSecondConfirm,
}: ConfirmDialogProps) {
  if (!open) return null;

  const confirmStyles =
    variant === 'danger'
      ? 'bg-gradient-to-r from-jeta-red to-jeta-red-dark text-white hover:opacity-90'
      : 'bg-gradient-to-r from-amber-500 to-amber-600 text-white hover:opacity-90';

  const secondConfirmStyles =
    'bg-white border-2 border-red-300 text-red-700 hover:bg-red-50 hover:border-red-400';

  return (
    <div className="modal-overlay" onClick={loading ? undefined : onCancel}>
      <div
        className="modal-content max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-8 text-center">
          <div className="mx-auto w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="w-7 h-7 text-jeta-red" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
          <p className="text-sm text-gray-600 mb-6">{message}</p>
          <div className="flex flex-col gap-2">
            {secondConfirmLabel && onSecondConfirm && (
              <button
                type="button"
                onClick={onSecondConfirm}
                disabled={loading}
                className={`w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 disabled:opacity-60 ${secondConfirmStyles}`}
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {secondConfirmLabel}
              </button>
            )}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onCancel}
                disabled={loading}
                className="btn-secondary flex-1"
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={loading}
                className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 disabled:opacity-60 ${confirmStyles}`}
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {confirmLabel}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
