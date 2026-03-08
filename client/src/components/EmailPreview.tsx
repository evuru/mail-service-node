import { Mail } from 'lucide-react';

interface EmailPreviewProps {
  html: string;
  isLoading?: boolean;
  error?: string;
}

export function EmailPreview({ html, isLoading, error }: EmailPreviewProps) {
  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50 rounded-lg border border-gray-200">
        <div className="text-center text-gray-400">
          <div className="animate-spin text-3xl mb-2">⟳</div>
          <p className="text-sm">Rendering preview...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-red-50 rounded-lg border border-red-200 p-6">
        <div className="text-center text-red-600">
          <div className="text-2xl mb-2">⚠️</div>
          <p className="text-sm font-medium">Preview error</p>
          <p className="text-xs text-red-500 mt-1 font-mono">{error}</p>
        </div>
      </div>
    );
  }

  if (!html) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50 rounded-lg border border-gray-200">
        <div className="text-center text-gray-400">
          <Mail className="w-8 h-8 mb-2" />
          <p className="text-sm">Start typing to see a preview</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full rounded-lg border border-gray-200 overflow-hidden bg-gray-100">
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
