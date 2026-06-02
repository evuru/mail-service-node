import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import {
  Plus, FileText, ClipboardList, Layers,
  Search, LayoutGrid, List,
  ArrowUpDown, ArrowUp, ArrowDown,
} from 'lucide-react';
import { useTemplateStore } from '../store/templateStore';
import { Header } from '../components/Header';
import { Badge } from '../components/Badge';
import { NewTemplateModal } from '../components/NewTemplateModal';
import type { Template } from '../types';

type Filter  = 'all' | 'templates' | 'layouts';
type View    = 'grid' | 'table';
type SortKey = 'name' | 'slug' | 'updated_at';
type SortDir = 'asc' | 'desc';

const FILTER_LABELS: Record<Filter, string> = { all: 'All', templates: 'Templates', layouts: 'Layouts' };
const DEFAULT_DIR: Record<SortKey, SortDir> = { name: 'asc', slug: 'asc', updated_at: 'desc' };

export function Dashboard() {
  const navigate = useNavigate();
  const { templates, isLoading, error, fetchTemplates, createTemplate } = useTemplateStore();
  const [filter, setFilter]   = useState<Filter>('all');
  const [query,  setQuery]    = useState('');
  const [view,   setView]     = useState<View>('grid');
  const [sortKey, setSortKey] = useState<SortKey>('updated_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [showNew, setShowNew] = useState(false);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(DEFAULT_DIR[key]);
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return templates
      .filter((t) => {
        if (filter === 'layouts')   return t.is_layout;
        if (filter === 'templates') return !t.is_layout;
        return true;
      })
      .filter((t) => {
        if (!q) return true;
        return (
          t.name.toLowerCase().includes(q) ||
          t.slug.toLowerCase().includes(q) ||
          t.subject?.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        let cmp = 0;
        if (sortKey === 'updated_at') {
          cmp = new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
        } else {
          cmp = a[sortKey].localeCompare(b[sortKey]);
        }
        return sortDir === 'asc' ? cmp : -cmp;
      });
  }, [templates, filter, query, sortKey, sortDir]);

  const handleCreate = async (data: { slug: string; name: string; subject: string; is_layout: boolean }) => {
    const body = data.is_layout
      ? `<!DOCTYPE html>\n<html>\n<head><meta charset="UTF-8"/></head>\n<body>\n  {{{body}}}\n</body>\n</html>`
      : `<h2>Hello, {{user_name}}!</h2>\n<p>Your message content goes here.</p>`;
    const t = await createTemplate({ ...data, body_html: body, use_layout: !data.is_layout });
    navigate(`/templates/${t.slug}`);
  };

  const counts = {
    all:       templates.length,
    templates: templates.filter((t) => !t.is_layout).length,
    layouts:   templates.filter((t) =>  t.is_layout).length,
  };

  const isEmpty = !isLoading && filtered.length === 0;

  return (
    <>
      <Header
        actions={
          <button onClick={() => setShowNew(true)} className="btn-primary">
            <Plus className="w-4 h-4" />
            New Template
          </button>
        }
      />

      <main className="page-content">

        {/* ── Toolbar ───────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-3 mb-5">
          {/* Filter pills */}
          <div className="flex items-center gap-1.5">
            {(['all', 'templates', 'layouts'] as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-all ${
                  filter === f
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'bg-[var(--surface)] border border-[var(--border)] text-[var(--text-secondary)] hover:border-brand-300'
                }`}
              >
                {FILTER_LABELS[f]}
                <span className={`ml-1.5 text-xs ${filter === f ? 'opacity-75' : 'opacity-50'}`}>
                  {counts[f]}
                </span>
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)] pointer-events-none" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search templates…"
              className="input pl-8 py-1.5 text-sm"
            />
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* View toggle */}
          <div className="flex items-center gap-0.5 p-1 rounded-lg bg-[var(--surface-raised)] border border-[var(--border)]">
            <button
              onClick={() => setView('grid')}
              title="Grid view"
              className={`p-1.5 rounded-md transition-colors ${
                view === 'grid'
                  ? 'bg-[var(--surface)] text-[var(--text-primary)] shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setView('table')}
              title="Table view"
              className={`p-1.5 rounded-md transition-colors ${
                view === 'table'
                  ? 'bg-[var(--surface)] text-[var(--text-primary)] shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Error ─────────────────────────────────────────────────────── */}
        {error && (
          <div className="mb-5 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20
                          border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {/* ── Loading skeletons ─────────────────────────────────────────── */}
        {isLoading && view === 'grid' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="card h-36 animate-pulse bg-[var(--surface-raised)]" />
            ))}
          </div>
        )}
        {isLoading && view === 'table' && (
          <div className="card overflow-hidden">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-[var(--border)] last:border-0">
                <div className="w-8 h-8 rounded-lg bg-[var(--surface-raised)] animate-pulse shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-40 rounded bg-[var(--surface-raised)] animate-pulse" />
                  <div className="h-2.5 w-24 rounded bg-[var(--surface-raised)] animate-pulse" />
                </div>
                <div className="h-2.5 w-28 rounded bg-[var(--surface-raised)] animate-pulse" />
                <div className="h-2.5 w-20 rounded bg-[var(--surface-raised)] animate-pulse" />
              </div>
            ))}
          </div>
        )}

        {/* ── Empty state ───────────────────────────────────────────────── */}
        {isEmpty && (
          <div className="empty-state">
            <div className="w-14 h-14 rounded-2xl bg-[var(--surface-raised)] flex items-center justify-center mb-1">
              {query ? (
                <Search className="w-6 h-6 text-[var(--text-muted)]" />
              ) : (
                <ClipboardList className="w-6 h-6 text-[var(--text-muted)]" />
              )}
            </div>
            <p className="text-sm font-medium text-[var(--text-secondary)]">
              {query ? 'No results found' : 'No templates yet'}
            </p>
            <p className="text-xs text-[var(--text-muted)]">
              {query ? `Nothing matched "${query}"` : 'Click "New Template" to get started'}
            </p>
          </div>
        )}

        {/* ── Grid view ─────────────────────────────────────────────────── */}
        {!isLoading && !isEmpty && view === 'grid' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((t) => (
              <TemplateCard key={t._id} template={t} onClick={() => navigate(`/templates/${t.slug}`)} />
            ))}
          </div>
        )}

        {/* ── Table view ────────────────────────────────────────────────── */}
        {!isLoading && !isEmpty && view === 'table' && (
          <TemplateTable
            templates={filtered}
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={handleSort}
            onRowClick={(t) => navigate(`/templates/${t.slug}`)}
          />
        )}
      </main>

      {showNew && (
        <NewTemplateModal onClose={() => setShowNew(false)} onCreate={handleCreate} />
      )}
    </>
  );
}

// ─── Grid card ────────────────────────────────────────────────────────────────

function TemplateCard({ template: t, onClick }: { template: Template; onClick: () => void }) {
  return (
    <div onClick={onClick} className="card card-hover p-5 group animate-fade-in flex flex-col">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
          t.is_layout
            ? 'bg-violet-100 dark:bg-violet-900/30'
            : 'bg-blue-100  dark:bg-blue-900/30'
        }`}>
          {t.is_layout
            ? <Layers className="w-4.5 h-4.5 text-violet-600 dark:text-violet-400" />
            : <FileText className="w-4.5 h-4.5 text-blue-600 dark:text-blue-400" />
          }
        </div>
        <div className="flex gap-1 flex-wrap justify-end">
          {t.is_layout             && <Badge variant="ai">Layout</Badge>}
          {t.use_layout && !t.is_layout && <Badge variant="neutral">Uses layout</Badge>}
          {t.is_global             && <Badge variant="info">Global</Badge>}
        </div>
      </div>

      <h3 className="font-semibold text-sm text-[var(--text-primary)]
                     group-hover:text-brand-600 dark:group-hover:text-brand-400
                     transition-colors truncate mb-1">
        {t.name}
      </h3>

      <code className="text-[11px] text-[var(--text-muted)] bg-[var(--surface-raised)]
                       px-1.5 py-0.5 rounded-md font-mono block truncate mb-2">
        {t.slug}
      </code>

      {!t.is_layout && (
        <p className="text-xs text-[var(--text-secondary)] truncate mb-3 leading-relaxed">
          {t.subject || <span className="italic opacity-60">No subject line</span>}
        </p>
      )}

      <p className="text-[11px] text-[var(--text-muted)] mt-auto">
        Updated {format(new Date(t.updated_at), 'MMM d, yyyy')}
      </p>
    </div>
  );
}

// ─── Table view ───────────────────────────────────────────────────────────────

interface TableProps {
  templates: Template[];
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (key: SortKey) => void;
  onRowClick: (t: Template) => void;
}

function TemplateTable({ templates, sortKey, sortDir, onSort, onRowClick }: TableProps) {
  return (
    <div className="card overflow-hidden animate-fade-in">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--border)] bg-[var(--surface-raised)]">
            <th className="w-10 px-4 py-2.5" />
            <SortTh label="Name"    col="name"       active={sortKey} dir={sortDir} onSort={onSort} />
            <SortTh label="Slug"    col="slug"       active={sortKey} dir={sortDir} onSort={onSort} className="hidden sm:table-cell" />
            <th className="px-4 py-2.5 text-left font-medium text-[var(--text-muted)] text-xs hidden md:table-cell">
              Subject
            </th>
            <th className="px-4 py-2.5 text-left font-medium text-[var(--text-muted)] text-xs">
              Tags
            </th>
            <SortTh label="Updated" col="updated_at" active={sortKey} dir={sortDir} onSort={onSort} align="right" className="hidden lg:table-cell" />
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)]">
          {templates.map((t) => (
            <tr
              key={t._id}
              onClick={() => onRowClick(t)}
              className="group cursor-pointer hover:bg-[var(--surface-raised)] transition-colors"
            >
              {/* Type icon */}
              <td className="px-4 py-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  t.is_layout
                    ? 'bg-violet-100 dark:bg-violet-900/30'
                    : 'bg-blue-100  dark:bg-blue-900/30'
                }`}>
                  {t.is_layout
                    ? <Layers  className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
                    : <FileText className="w-3.5 h-3.5 text-blue-600  dark:text-blue-400"   />
                  }
                </div>
              </td>

              {/* Name */}
              <td className="px-4 py-3 max-w-[180px]">
                <div className="font-medium text-[var(--text-primary)] truncate
                                group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                  {t.name}
                </div>
              </td>

              {/* Slug */}
              <td className="px-4 py-3 hidden sm:table-cell max-w-[160px]">
                <code className="text-[11px] text-[var(--text-muted)] bg-[var(--surface-raised)]
                                 px-1.5 py-0.5 rounded-md font-mono truncate block">
                  {t.slug}
                </code>
              </td>

              {/* Subject */}
              <td className="px-4 py-3 hidden md:table-cell max-w-[200px]">
                {t.is_layout ? (
                  <span className="text-[var(--text-muted)] text-xs italic">—</span>
                ) : (
                  <span className="text-xs text-[var(--text-secondary)] truncate block">
                    {t.subject || <span className="italic text-[var(--text-muted)]">No subject</span>}
                  </span>
                )}
              </td>

              {/* Tags */}
              <td className="px-4 py-3">
                <div className="flex gap-1 flex-wrap">
                  {t.is_layout             && <Badge variant="ai">Layout</Badge>}
                  {t.use_layout && !t.is_layout && <Badge variant="neutral">Uses layout</Badge>}
                  {t.is_global             && <Badge variant="info">Global</Badge>}
                </div>
              </td>

              {/* Updated */}
              <td className="px-4 py-3 text-right hidden lg:table-cell whitespace-nowrap">
                <span className="text-xs text-[var(--text-muted)]">
                  {format(new Date(t.updated_at), 'MMM d, yyyy')}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Row count footer */}
      <div className="px-4 py-2.5 border-t border-[var(--border)] bg-[var(--surface-raised)]
                      flex items-center justify-between">
        <span className="text-xs text-[var(--text-muted)]">
          {templates.length} {templates.length === 1 ? 'template' : 'templates'}
        </span>
      </div>
    </div>
  );
}

// ─── Sortable table header ────────────────────────────────────────────────────

interface SortThProps {
  label: string;
  col: SortKey;
  active: SortKey;
  dir: SortDir;
  onSort: (k: SortKey) => void;
  align?: 'left' | 'right';
  className?: string;
}

function SortTh({ label, col, active, dir, onSort, align = 'left', className = '' }: SortThProps) {
  const isActive = col === active;
  const Icon = isActive ? (dir === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;
  return (
    <th
      className={`px-4 py-2.5 font-medium text-xs cursor-pointer select-none
                  text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors
                  ${align === 'right' ? 'text-right' : 'text-left'} ${className}`}
      onClick={() => onSort(col)}
    >
      <span className={`inline-flex items-center gap-1 ${align === 'right' ? 'flex-row-reverse' : ''}`}>
        {label}
        <Icon className={`w-3 h-3 transition-colors ${isActive ? 'text-brand-500' : 'opacity-40'}`} />
      </span>
    </th>
  );
}
