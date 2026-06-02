import { useState } from 'react';
import { X } from 'lucide-react';

interface NewTemplateModalProps {
  onClose: () => void;
  onCreate: (data: { slug: string; name: string; subject: string; is_layout: boolean }) => Promise<void>;
}

function toSlug(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60);
}

export function NewTemplateModal({ onClose, onCreate }: NewTemplateModalProps) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [subject, setSubject] = useState('');
  const [isLayout, setIsLayout] = useState(false);
  const [slugEdited, setSlugEdited] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleNameChange = (v: string) => {
    setName(v);
    if (!slugEdited) setSlug(toSlug(v));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !slug.trim() || (!isLayout && !subject.trim())) {
      setError('Please fill in all required fields.');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      await onCreate({ slug, name, subject: subject || 'No subject', is_layout: isLayout });
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="card shadow-modal w-full max-w-md mx-4 animate-slide-up">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
          <h2 className="text-base font-semibold text-[var(--text-primary)]">New Template</h2>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="input-label">Type</label>
            <div className="flex gap-3">
              {[
                { value: false, label: 'Email Template', desc: 'Sends actual email content' },
                { value: true,  label: 'Base Layout',    desc: 'Wraps other templates' },
              ].map(({ value, label, desc }) => (
                <div
                  key={String(value)}
                  onClick={() => setIsLayout(value)}
                  className={`flex-1 cursor-pointer border rounded-xl p-3 transition-colors ${
                    isLayout === value
                      ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                      : 'border-[var(--border)] hover:border-[var(--text-muted)]'
                  }`}
                >
                  <div className={`text-sm font-medium ${isLayout === value ? 'text-brand-700 dark:text-brand-300' : 'text-[var(--text-primary)]'}`}>{label}</div>
                  <div className="text-xs text-[var(--text-muted)] mt-0.5">{desc}</div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="input-label">Name <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Welcome Email"
              className="input"
              required
            />
          </div>

          <div>
            <label className="input-label">Slug <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={slug}
              onChange={(e) => { setSlug(toSlug(e.target.value)); setSlugEdited(true); }}
              placeholder="welcome-email"
              className="input font-mono"
              required
            />
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Used in API calls: <code className="bg-[var(--surface-raised)] px-1 rounded">template_slug: "{slug || '…'}"</code>
            </p>
          </div>

          {!isLayout && (
            <div>
              <label className="input-label">Subject Line <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Welcome, {{user_name}}!"
                className="input"
              />
            </div>
          )}

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={isLoading} className="btn-primary disabled:opacity-50">
              {isLoading ? 'Creating…' : 'Create Template'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
