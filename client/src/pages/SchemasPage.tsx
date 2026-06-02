import { useEffect, useState, useMemo, useCallback } from 'react';
import { Plus, FolderOpen, Check, Sparkles, X, Loader2, Search, History, CheckCircle2, RotateCcw, Trash2 } from 'lucide-react';
import { useSchemaStore } from '../store/schemaStore';
import { usePlatformStore } from '../store/platformStore';
import { Header } from '../components/Header';
import { Badge } from '../components/Badge';
import { SchemaEditorModal } from '../components/SchemaEditorModal';
import { ConfirmModal } from '../components/ConfirmModal';
import client from '../api/client';
import type { PayloadSchema, PayloadSchemaVersion, SchemaField, FieldType } from '../types';
import { formatDistanceToNow } from 'date-fns';

const TYPE_COLORS: Record<string, string> = {
  string:  'bg-blue-50   dark:bg-blue-900/30   text-blue-700   dark:text-blue-400',
  number:  'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
  boolean: 'bg-amber-50  dark:bg-amber-900/30  text-amber-700  dark:text-amber-400',
  array:   'bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400',
  object:  'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
};

const TYPE_ACTIVE: Record<string, string> = {
  string:  'bg-blue-100   dark:bg-blue-800/60   text-blue-700   dark:text-blue-300   border-blue-300   dark:border-blue-700',
  number:  'bg-purple-100 dark:bg-purple-800/60 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700',
  boolean: 'bg-amber-100  dark:bg-amber-800/60  text-amber-700  dark:text-amber-300  border-amber-300  dark:border-amber-700',
  array:   'bg-orange-100 dark:bg-orange-800/60 text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-700',
  object:  'bg-emerald-100 dark:bg-emerald-800/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700',
};

const ALL_TYPES: FieldType[] = ['string', 'number', 'boolean', 'array', 'object'];
type UsageFilter = 'all' | 'used' | 'unused';

function FieldPill({ field }: { field: SchemaField }) {
  return (
    <span
      title={field.description || field.key}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-mono font-medium ${TYPE_COLORS[field.type] ?? 'bg-[var(--surface-raised)] text-[var(--text-secondary)]'}`}
    >
      {field.required && <span className="text-red-500 font-bold leading-none" title="required">*</span>}
      {`{{${field.key}}}`}
    </span>
  );
}

export function SchemasPage() {
  const { schemas, isLoading, error, fetchSchemas, createSchema, updateSchema, deleteSchema } = useSchemaStore();
  const { llm, fetchPlatform } = usePlatformStore();
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing]       = useState<PayloadSchema | null>(null);
  const [deleting, setDeleting]     = useState<PayloadSchema | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [showAiPanel, setShowAiPanel]     = useState(false);
  const [aiDescription, setAiDescription] = useState('');
  const [aiGenerating, setAiGenerating]   = useState(false);
  const [aiError, setAiError]             = useState('');

  // Version history drawer
  const [historySchema, setHistorySchema]           = useState<PayloadSchema | null>(null);
  const [schemaVersions, setSchemaVersions]         = useState<PayloadSchemaVersion[]>([]);
  const [historyActiveVer, setHistoryActiveVer]     = useState(0);
  const [versionsLoading, setVersionsLoading]       = useState(false);
  const [activatingVer, setActivatingVer]           = useState<number | null>(null);
  const [restoringVer, setRestoringVer]             = useState<number | null>(null);
  const [deletingVer, setDeletingVer]               = useState<number | null>(null);
  const [deleteVerConfirm, setDeleteVerConfirm]     = useState<number | null>(null);
  // Commit panel
  const [commitNote, setCommitNote]                 = useState('');
  const [isCommitting, setIsCommitting]             = useState(false);
  // Loaded version — when set, SchemaEditorModal saves back to that version in place
  const [loadedVersionForEdit, setLoadedVersionForEdit] = useState<{ version: number; fields: SchemaField[] } | null>(null);

  const fetchSchemaVersions = useCallback(async (schema: PayloadSchema) => {
    setVersionsLoading(true);
    try {
      const { data } = await client.get<{ active_version: number; versions: PayloadSchemaVersion[] }>(`/payload-schemas/${schema._id}/versions`);
      setSchemaVersions(data.versions);
      setHistoryActiveVer(data.active_version);
    } catch { /* silent */ }
    finally { setVersionsLoading(false); }
  }, []);

  const openHistory = (schema: PayloadSchema) => {
    setHistorySchema(schema);
    fetchSchemaVersions(schema);
  };

  const handleActivateSchemaVersion = async (v: number) => {
    if (!historySchema) return;
    setActivatingVer(v);
    try {
      await client.put(`/payload-schemas/${historySchema._id}/activate/${v}`);
      setHistoryActiveVer(v);
      fetchSchemas();
    } catch { /* silent */ }
    finally { setActivatingVer(null); }
  };

  const handleRestoreSchemaVersion = async (v: number) => {
    if (!historySchema) return;
    setRestoringVer(v);
    try {
      await client.post(`/payload-schemas/${historySchema._id}/restore/${v}`);
      fetchSchemaVersions(historySchema);
      fetchSchemas();
    } catch { /* silent */ }
    finally { setRestoringVer(null); }
  };

  const handleDeleteSchemaVersion = async (v: number) => {
    if (!historySchema) return;
    setDeletingVer(v);
    try {
      await client.delete(`/payload-schemas/${historySchema._id}/versions/${v}`);
      setDeleteVerConfirm(null);
      fetchSchemaVersions(historySchema);
    } catch { /* silent */ }
    finally { setDeletingVer(null); }
  };

  const handleLoadSchemaVersionIntoEditor = async (v: number) => {
    if (!historySchema) return;
    try {
      const { data } = await client.get<PayloadSchemaVersion>(`/payload-schemas/${historySchema._id}/versions/${v}`);
      setLoadedVersionForEdit({ version: v, fields: data.fields });
      setEditing(historySchema);
    } catch { /* silent */ }
  };

  const handleCommitSchemaVersion = async () => {
    if (!historySchema) return;
    setIsCommitting(true);
    try {
      const { data } = await client.post<{ version: PayloadSchemaVersion; active_version: number }>(
        `/payload-schemas/${historySchema._id}/versions`,
        { note: commitNote.trim() || undefined }
      );
      setHistoryActiveVer(data.active_version);
      setCommitNote('');
      fetchSchemaVersions(historySchema);
      fetchSchemas();
    } catch { /* silent */ }
    finally { setIsCommitting(false); }
  };

  // ── Filters ────────────────────────────────────────────────────────────────
  const [query, setQuery]             = useState('');
  const [activeTypes, setActiveTypes] = useState<Set<FieldType>>(new Set());
  const [usage, setUsage]             = useState<UsageFilter>('all');

  useEffect(() => { fetchSchemas(); fetchPlatform(); }, [fetchSchemas, fetchPlatform]);

  const toggleType = (t: FieldType) =>
    setActiveTypes((prev) => {
      const next = new Set(prev);
      next.has(t) ? next.delete(t) : next.add(t);
      return next;
    });

  const clearFilters = () => { setQuery(''); setActiveTypes(new Set()); setUsage('all'); };
  const hasFilters = query.trim() !== '' || activeTypes.size > 0 || usage !== 'all';

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return schemas.filter((s) => {
      if (q) {
        const hit =
          s.name.toLowerCase().includes(q) ||
          s.description?.toLowerCase().includes(q) ||
          s.fields.some((f) => f.key.toLowerCase().includes(q) || f.description?.toLowerCase().includes(q));
        if (!hit) return false;
      }
      if (activeTypes.size > 0 && !s.fields.some((f) => activeTypes.has(f.type as FieldType))) return false;
      if (usage === 'used')   return (s.template_count ?? 0) > 0;
      if (usage === 'unused') return (s.template_count ?? 0) === 0;
      return true;
    });
  }, [schemas, query, activeTypes, usage]);

  const handleDelete = async () => {
    if (!deleting) return;
    setIsDeleting(true);
    try { await deleteSchema(deleting._id); setDeleting(null); }
    finally { setIsDeleting(false); }
  };

  const handleAiGenerateSchema = async () => {
    if (!aiDescription.trim()) return;
    setAiGenerating(true); setAiError('');
    try {
      const { data } = await client.post<Partial<PayloadSchema>>('/ai/schema', { description: aiDescription });
      await createSchema(data);
      setShowAiPanel(false);
      setAiDescription('');
    } catch (err) {
      setAiError((err as Error).message);
    } finally { setAiGenerating(false); }
  };

  const aiEnabled = llm?.enabled ?? false;
  const isEmpty = !isLoading && filtered.length === 0;

  return (
    <>
      <Header
        actions={
          <div className="flex items-center gap-2">
            {aiEnabled && (
              <button onClick={() => setShowAiPanel(true)} className="btn-ai">
                <Sparkles className="w-4 h-4" /> Generate with AI
              </button>
            )}
            <button onClick={() => setShowCreate(true)} className="btn-primary">
              <Plus className="w-4 h-4" /> New Schema
            </button>
          </div>
        }
      />

      <main className="page-content">

        {/* ── Toolbar ──────────────────────────────────────────────────── */}
        {schemas.length > 0 && (
          <div className="space-y-3 mb-5">
            {/* Row 1: search + usage filter */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[180px] max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)] pointer-events-none" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search schemas, fields…"
                  className="input pl-8 py-1.5 text-sm"
                />
                {query && (
                  <button
                    onClick={() => setQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Usage filter */}
              <div className="flex items-center gap-1 p-1 rounded-lg bg-[var(--surface-raised)] border border-[var(--border)]">
                {(['all', 'used', 'unused'] as UsageFilter[]).map((u) => (
                  <button
                    key={u}
                    onClick={() => setUsage(u)}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-colors capitalize ${
                      usage === u
                        ? 'bg-[var(--surface)] text-[var(--text-primary)] shadow-sm'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                    }`}
                  >
                    {u === 'all' ? 'All' : u === 'used' ? 'In use' : 'Unused'}
                  </button>
                ))}
              </div>

              {/* Clear */}
              {hasFilters && (
                <button
                  onClick={clearFilters}
                  className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] flex items-center gap-1 transition-colors"
                >
                  <X className="w-3 h-3" /> Clear filters
                </button>
              )}

              <div className="flex-1" />

              <span className="text-xs text-[var(--text-muted)]">
                {filtered.length} of {schemas.length}
              </span>
            </div>

            {/* Row 2: field type pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs text-[var(--text-muted)] mr-1">Field type:</span>
              {ALL_TYPES.map((t) => {
                const active = activeTypes.has(t);
                return (
                  <button
                    key={t}
                    onClick={() => toggleType(t)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                      active
                        ? TYPE_ACTIVE[t]
                        : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] hover:border-[var(--text-muted)]'
                    }`}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Error ────────────────────────────────────────────────────── */}
        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {/* ── Loading ──────────────────────────────────────────────────── */}
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="card h-28 animate-pulse bg-[var(--surface-raised)]" />)}
          </div>
        )}

        {/* ── Empty state ──────────────────────────────────────────────── */}
        {isEmpty && (
          <div className="empty-state">
            <div className="w-14 h-14 rounded-2xl bg-[var(--surface-raised)] flex items-center justify-center mb-4">
              {hasFilters ? (
                <Search className="w-6 h-6 text-[var(--text-muted)]" />
              ) : (
                <FolderOpen className="w-6 h-6 text-[var(--text-muted)]" />
              )}
            </div>
            <p className="text-sm font-medium text-[var(--text-secondary)]">
              {hasFilters ? 'No schemas match' : 'No schemas yet'}
            </p>
            <p className="text-xs text-[var(--text-muted)]">
              {hasFilters
                ? <button onClick={clearFilters} className="hover:underline">Clear filters</button>
                : 'Create one to define what variables your templates expect'}
            </p>
          </div>
        )}

        {/* ── Schema cards ─────────────────────────────────────────────── */}
        {!isLoading && !isEmpty && (
          <div className="space-y-4">
            {filtered.map((schema) => (
              <SchemaCard
                key={schema._id}
                schema={schema}
                query={query}
                onEdit={() => setEditing(schema)}
                onDelete={() => setDeleting(schema)}
                onHistory={() => openHistory(schema)}
              />
            ))}
          </div>
        )}
      </main>

      {showCreate && (
        <SchemaEditorModal
          onClose={() => setShowCreate(false)}
          onSave={async (data) => { await createSchema(data); }}
        />
      )}
      {editing && (
        <SchemaEditorModal
          schema={
            loadedVersionForEdit
              ? { ...editing, fields: loadedVersionForEdit.fields }
              : editing
          }
          loadedFromVersion={loadedVersionForEdit?.version ?? null}
          onClose={() => { setEditing(null); setLoadedVersionForEdit(null); }}
          onSave={async (data) => {
            if (loadedVersionForEdit) {
              // Save directly to that version in place
              await client.put(`/payload-schemas/${editing._id}/versions/${loadedVersionForEdit.version}`, {
                fields: data.fields,
              });
              setLoadedVersionForEdit(null);
              if (historySchema?._id === editing._id) fetchSchemaVersions(historySchema);
              fetchSchemas();
            } else {
              await updateSchema(editing._id, data);
            }
          }}
        />
      )}
      {deleting && (
        <ConfirmModal
          title="Delete Schema"
          message={`Delete "${deleting.name}"? It will be unlinked from any templates using it. This cannot be undone.`}
          confirmLabel="Delete"
          danger
          isLoading={isDeleting}
          onConfirm={handleDelete}
          onCancel={() => setDeleting(null)}
        />
      )}

      {/* Schema Version History Drawer */}
      {historySchema && (
        <div className="fixed inset-y-0 right-0 w-96 bg-[var(--surface)] border-l border-[var(--border)] shadow-modal z-40 flex flex-col">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
            <div className="flex items-center gap-2 min-w-0">
              <History className="w-4 h-4 text-[var(--text-secondary)] shrink-0" />
              <span className="text-sm font-semibold text-[var(--text-primary)] truncate">{historySchema.name}</span>
            </div>
            <button onClick={() => setHistorySchema(null)} className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors ml-2">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {versionsLoading ? (
              <div className="flex items-center justify-center h-32 text-[var(--text-muted)] text-sm">
                <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading…
              </div>
            ) : schemaVersions.length === 0 ? (
              <div className="p-5 text-center space-y-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--surface-raised)] flex items-center justify-center mx-auto">
                  <History className="w-5 h-5 text-[var(--text-muted)]" />
                </div>
                <p className="text-sm font-medium text-[var(--text-secondary)]">No versions yet</p>
                <p className="text-xs text-[var(--text-muted)]">Click <strong>"Edit"</strong> then <strong>"Save as version"</strong> to start tracking history for this schema.</p>
              </div>
            ) : (
              <div className="divide-y divide-[var(--border)]">
                {schemaVersions.map((v) => {
                  const isActive = v.version === historyActiveVer;
                  return (
                    <div key={v._id} className={`p-4 ${isActive ? 'bg-brand-50 dark:bg-brand-900/20' : 'hover:bg-[var(--surface-raised)]'} transition-colors`}>
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-[var(--text-primary)] font-mono">v{v.version}</span>
                          {isActive && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide bg-brand-100 dark:bg-brand-800/50 text-brand-700 dark:text-brand-300">
                              <CheckCircle2 className="w-2.5 h-2.5" /> Active
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-[var(--text-muted)] whitespace-nowrap shrink-0">
                          {formatDistanceToNow(new Date(v.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      {v.note && <p className="text-xs text-[var(--text-secondary)] mb-2 italic">"{v.note}"</p>}
                      <p className="text-xs text-[var(--text-muted)] mb-2">{v.fields.length} field{v.fields.length !== 1 ? 's' : ''}</p>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* Load into editor */}
                        <button
                          onClick={() => handleLoadSchemaVersionIntoEditor(v.version)}
                          className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-raised)] transition-colors"
                        >
                          Edit
                        </button>

                        {!isActive && (
                          <button
                            onClick={() => handleActivateSchemaVersion(v.version)}
                            disabled={activatingVer === v.version}
                            className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-lg bg-brand-600 hover:bg-brand-700 text-white disabled:opacity-50 transition-colors"
                          >
                            {activatingVer === v.version ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                            Activate
                          </button>
                        )}
                        <button
                          onClick={() => handleRestoreSchemaVersion(v.version)}
                          disabled={restoringVer === v.version}
                          className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-raised)] disabled:opacity-50 transition-colors"
                        >
                          {restoringVer === v.version ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                          Restore
                        </button>
                        {deleteVerConfirm === v.version ? (
                          <>
                            <button
                              onClick={() => handleDeleteSchemaVersion(v.version)}
                              disabled={deletingVer === v.version}
                              className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-lg bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 transition-colors"
                            >
                              {deletingVer === v.version ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Confirm delete'}
                            </button>
                            <button onClick={() => setDeleteVerConfirm(null)} className="text-xs text-[var(--text-muted)] hover:underline">Cancel</button>
                          </>
                        ) : (
                          <button
                            onClick={() => { if (!isActive) setDeleteVerConfirm(v.version); }}
                            disabled={isActive}
                            title={isActive ? 'Activate another version first' : `Delete v${v.version}`}
                            className="ml-auto flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-lg border border-[var(--border)] text-[var(--text-muted)] hover:text-red-600 hover:border-red-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="px-5 py-4 border-t border-[var(--border)] bg-[var(--surface-raised)] space-y-3">
            <p className="text-xs font-semibold text-[var(--text-secondary)]">Commit current fields as version</p>
            <input
              value={commitNote}
              onChange={(e) => setCommitNote(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCommitSchemaVersion(); }}
              placeholder="Version note (optional)…"
              className="w-full px-2.5 py-1.5 border border-[var(--border)] rounded-lg text-xs bg-[var(--surface)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <button
              onClick={handleCommitSchemaVersion}
              disabled={isCommitting}
              className="btn-primary w-full justify-center text-xs disabled:opacity-50"
            >
              {isCommitting ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
              {isCommitting ? 'Committing…' : 'Commit version'}
            </button>
            <p className="text-xs text-[var(--text-muted)]">
              <strong>Edit + Save</strong> updates the working draft. Commit creates a named snapshot.
            </p>
          </div>
        </div>
      )}

      {showAiPanel && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="card shadow-modal w-full max-w-md flex flex-col animate-slide-up">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                <span className="text-sm font-semibold text-[var(--text-primary)]">Generate schema with AI</span>
              </div>
              <button onClick={() => setShowAiPanel(false)} className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="input-label">Describe the email data</label>
                <textarea
                  rows={5}
                  value={aiDescription}
                  onChange={(e) => setAiDescription(e.target.value)}
                  placeholder="An order confirmation email. It includes the customer's name, order number, list of items with names and prices, total amount, and a delivery date."
                  className="input resize-none"
                />
              </div>
              {aiError && <p className="text-xs text-red-600 dark:text-red-400">{aiError}</p>}
              <p className="text-xs text-[var(--text-muted)]">
                The AI will generate a schema with field names, types, and examples. You can review and edit it after creation.
              </p>
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={handleAiGenerateSchema}
                disabled={aiGenerating || !aiDescription.trim()}
                className="btn-ai flex-1 justify-center disabled:opacity-50"
              >
                {aiGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {aiGenerating ? 'Generating…' : 'Generate schema'}
              </button>
              <button onClick={() => setShowAiPanel(false)} className="btn-secondary">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Schema card ──────────────────────────────────────────────────────────────

function highlight(text: string, query: string) {
  if (!query.trim()) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase().trim());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-brand-100 dark:bg-brand-900/40 text-brand-800 dark:text-brand-300 rounded-sm px-0.5">
        {text.slice(idx, idx + query.trim().length)}
      </mark>
      {text.slice(idx + query.trim().length)}
    </>
  );
}

interface SchemaCardProps {
  schema: PayloadSchema;
  query: string;
  onEdit: () => void;
  onDelete: () => void;
  onHistory: () => void;
}

function SchemaCard({ schema, query, onEdit, onDelete, onHistory }: SchemaCardProps) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1 flex-wrap">
            <h3 className="font-semibold text-[var(--text-primary)]">
              {highlight(schema.name, query)}
            </h3>
            {(schema.template_count ?? 0) > 0 ? (
              <Badge variant="info">
                {schema.template_count} template{schema.template_count !== 1 ? 's' : ''}
              </Badge>
            ) : (
              <span className="text-[10px] px-2 py-0.5 rounded-full border border-[var(--border)] text-[var(--text-muted)] font-medium">
                unused
              </span>
            )}
          </div>

          {schema.description && (
            <p className="text-sm text-[var(--text-secondary)] mb-3">
              {highlight(schema.description, query)}
            </p>
          )}

          <div className="flex flex-wrap gap-1.5">
            {schema.fields.map((f) => <FieldPill key={f.key} field={f} />)}
            {schema.fields.length === 0 && (
              <span className="text-xs text-[var(--text-muted)] italic">No fields defined</span>
            )}
          </div>

          {schema.fields.length > 0 && (
            <details className="mt-3">
              <summary className="text-xs text-[var(--text-muted)] cursor-pointer hover:text-[var(--text-secondary)] select-none transition-colors">
                Show field details ({schema.fields.length})
              </summary>
              <div className="mt-2 overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--border)]">
                      {['Key', 'Type', 'Req.', 'Example', 'Description'].map((h) => (
                        <th key={h} className="text-left py-1.5 px-2 text-[var(--text-muted)] font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {schema.fields.map((f) => (
                      <tr key={f.key}>
                        <td className="py-1.5 px-2 font-mono text-[var(--text-primary)]">
                          {highlight(`{{${f.key}}}`, query)}
                        </td>
                        <td className="py-1.5 px-2">
                          <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${TYPE_COLORS[f.type] ?? ''}`}>
                            {f.type}
                          </span>
                        </td>
                        <td className="py-1.5 px-2 text-center">
                          {f.required && <Check className="w-3.5 h-3.5 mx-auto text-emerald-600 dark:text-emerald-400" />}
                        </td>
                        <td className="py-1.5 px-2 text-[var(--text-secondary)] max-w-[120px] truncate font-mono">{f.example}</td>
                        <td className="py-1.5 px-2 text-[var(--text-muted)]">{f.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          )}
        </div>

        <div className="flex gap-2 shrink-0">
          <button onClick={onHistory} className="btn-secondary text-xs flex items-center gap-1" title="Version history">
            <History className="w-3 h-3" />
            {schema.active_version > 0 ? `v${schema.active_version}` : 'History'}
          </button>
          <button onClick={onEdit}   className="btn-secondary text-xs">Edit</button>
          <button onClick={onDelete} className="btn-danger   text-xs">Delete</button>
        </div>
      </div>
    </div>
  );
}
