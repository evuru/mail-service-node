import { useState } from 'react';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">New Template</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <div className="flex gap-4">
              {[
                { value: false, label: 'Email Template', desc: 'Sends actual email content' },
                { value: true, label: 'Base Layout', desc: 'Wraps other templates' },
              ].map(({ value, label, desc }) => (
                <label key={String(value)} className="flex-1 cursor-pointer">
                  <div
                    className={`border rounded-lg p-3 transition-colors ${
                      isLayout === value ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setIsLayout(value)}
                  >
                    <div className="text-sm font-medium text-gray-900">{label}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Welcome Email"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Slug <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={slug}
              onChange={(e) => { setSlug(toSlug(e.target.value)); setSlugEdited(true); }}
              placeholder="welcome-email"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <p className="text-xs text-gray-400 mt-1">Used in API calls: POST /v1/send with template_slug: "{slug || '...'}"</p>
          </div>

          {!isLayout && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subject Line <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Welcome, {{user_name}}!"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-3 justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? 'Creating...' : 'Create Template'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
