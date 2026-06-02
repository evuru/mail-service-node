import { Mail } from 'lucide-react';

interface EmailPreviewProps {
  html: string;
  isLoading?: boolean;
  error?: string;
}

export function EmailPreview({ html, isLoading, error }: EmailPreviewProps) {
  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-[var(--surface-raised)] rounded-xl border border-[var(--border)]">
        <div className="text-center text-[var(--text-muted)]">
          <div className="animate-spin text-3xl mb-2">⟳</div>
          <p className="text-sm">Rendering preview…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800 p-6">
        <div className="text-center text-red-600 dark:text-red-400">
          <p className="text-sm font-medium mb-1">Preview error</p>
          <p className="text-xs font-mono opacity-80">{error}</p>
        </div>
      </div>
    );
  }

  if (!html) {
    return (
      <div className="h-full flex items-center justify-center bg-[var(--surface-raised)] rounded-xl border border-[var(--border)]">
        <div className="text-center text-[var(--text-muted)]">
          <Mail className="w-8 h-8 mb-2 mx-auto opacity-40" />
          <p className="text-sm">Start typing to see a preview</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full rounded-xl border border-[var(--border)] overflow-hidden bg-gray-100 dark:bg-gray-900">
      <iframe
        srcDoc={html}
        title="Email Preview"
        sandbox="allow-same-origin"
        className="w-full h-full border-0"
        style={{ background: '#f4f4f5' }}
      />
    </div>
  );
}
