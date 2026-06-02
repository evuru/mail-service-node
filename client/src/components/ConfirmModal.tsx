interface ConfirmModalProps {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  title,
  message,
  confirmLabel = 'Confirm',
  danger = false,
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="card shadow-modal w-full max-w-sm mx-4 p-6 animate-slide-up">
        <h2 className="text-base font-semibold text-[var(--text-primary)] mb-2">{title}</h2>
        <p className="text-sm text-[var(--text-secondary)] mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} disabled={isLoading} className="btn-secondary disabled:opacity-50">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`${danger ? 'btn-danger' : 'btn-primary'} disabled:opacity-50`}
          >
            {isLoading ? 'Please wait…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
