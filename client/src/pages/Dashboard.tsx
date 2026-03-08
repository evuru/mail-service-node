import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Plus, FileText, Layout, ClipboardList } from 'lucide-react';
import { useTemplateStore } from '../store/templateStore';
import { Header } from '../components/Header';
import { Badge } from '../components/Badge';
import { NewTemplateModal } from '../components/NewTemplateModal';
import type { Template } from '../types';

type Filter = 'all' | 'templates' | 'layouts';

export function Dashboard() {
  const navigate = useNavigate();
  const { templates, isLoading, error, fetchTemplates, createTemplate } = useTemplateStore();
  const [filter, setFilter] = useState<Filter>('all');
  const [showNew, setShowNew] = useState(false);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  const filtered = templates.filter((t) => {
    if (filter === 'layouts') return t.is_layout;
    if (filter === 'templates') return !t.is_layout;
    return true;
  });

  const handleCreate = async (data: { slug: string; name: string; subject: string; is_layout: boolean }) => {
    const DEFAULT_BODY = data.is_layout
      ? `<!DOCTYPE html>\n<html>\n<head><meta charset="UTF-8"/></head>\n<body>\n  {{{body}}}\n</body>\n</html>`
      : `<h2>Hello, {{user_name}}!</h2>\n<p>Your message content goes here.</p>`;
    const t = await createTemplate({ ...data, body_html: DEFAULT_BODY, use_layout: !data.is_layout });
    navigate(`/templates/${t.slug}`);
  };

  const actions = (
    <button
      onClick={() => setShowNew(true)}
      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
    >
      <Plus className="w-4 h-4" />
      New Template
    </button>
  );

  return (
    <>
      <Header actions={actions} />

      <main className="flex-1 overflow-y-auto p-6">
        {/* Stats */}
        <div className="flex items-center gap-4 mb-6">
          {(['all', 'templates', 'layouts'] as Filter[]).map((f) => {
            const count =
              f === 'all' ? templates.length :
              f === 'layouts' ? templates.filter((t) => t.is_layout).length :
              templates.filter((t) => !t.is_layout).length;
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  filter === f
                    ? 'bg-blue-600 text-white'
                    : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)} ({count})
              </button>
            );
          })}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center h-48 text-gray-400 text-sm">Loading templates...</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400">
            <ClipboardList className="w-10 h-10 mb-3" />
            <p className="text-sm">No templates yet. Click "New Template" to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((t: Template) => (
              <div
                key={t._id}
                onClick={() => navigate(`/templates/${t.slug}`)}
                className="bg-white border border-gray-200 rounded-xl p-5 cursor-pointer hover:border-blue-300 hover:shadow-md transition-all group"
              >
                <div className="flex items-start justify-between mb-3">
                  {t.is_layout
                    ? <Layout className="w-6 h-6 text-gray-400" />
                    : <FileText className="w-6 h-6 text-gray-400" />}
                  <div className="flex gap-1">
                    {t.is_layout && <Badge variant="info">Layout</Badge>}
                    {t.use_layout && !t.is_layout && <Badge variant="neutral">Uses layout</Badge>}
                  </div>
                </div>
                <h3 className="font-semibold text-gray-900 text-sm mb-1 group-hover:text-blue-600 transition-colors truncate">
                  {t.name}
                </h3>
                <code className="text-xs text-gray-500 bg-gray-50 px-1.5 py-0.5 rounded block mb-2 truncate">
                  {t.slug}
                </code>
                {!t.is_layout && (
                  <p className="text-xs text-gray-500 truncate mb-3">
                    {t.subject || 'No subject'}
                  </p>
                )}
                <p className="text-xs text-gray-400">
                  Updated {format(new Date(t.updated_at), 'MMM d, yyyy')}
                </p>
              </div>
            ))}
          </div>
        )}
      </main>

      {showNew && (
        <NewTemplateModal
          onClose={() => setShowNew(false)}
          onCreate={handleCreate}
        />
      )}
    </>
  );
}
