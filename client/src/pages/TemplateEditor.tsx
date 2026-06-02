import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTemplateStore } from '../store/templateStore';
import { useSchemaStore } from '../store/schemaStore';
import { useAppStore } from '../store/appStore';
import { useDebounce } from '../hooks/useDebounce';
import { Header } from '../components/Header';
import { CodeEditor } from '../components/CodeEditor';
import { EmailPreview } from '../components/EmailPreview';
import { TestSendModal } from '../components/TestSendModal';
import { ConfirmModal } from '../components/ConfirmModal';
import { Badge } from '../components/Badge';
import client from '../api/client';
import type { PayloadSchema, TemplateVersion } from '../types';
import {
  Sparkles, X, Loader2, Wand2, History,
  CheckCircle2, RotateCcw, Trash2, Download,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface FormState {
  name: string;
  slug: string;
  subject: string;
  sender_name: string;
  body_html: string;
  use_layout: boolean;
  is_layout: boolean;
  layout_slug: string | null;
  payload_schema_id: string | null;
}

const TYPE_COLORS: Record<string, string> = {
  string:  'bg-blue-50   dark:bg-blue-900/30   text-blue-600   dark:text-blue-400',
  number:  'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
  boolean: 'bg-amber-50  dark:bg-amber-900/30  text-amber-600  dark:text-amber-400',
  array:   'bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
  object:  'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
};

const inputCls = 'w-full px-2.5 py-1.5 border border-[var(--border)] rounded-lg text-sm bg-[var(--surface)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent';

export function TemplateEditor() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { templates, fetchTemplates, updateTemplate, deleteTemplate } = useTemplateStore();
  const { schemas, fetchSchemas } = useSchemaStore();
  const { selectedApp } = useAppStore();
  const aiEnabled = selectedApp?.llm_enabled ?? false;

  const template = slug ? templates.find((t) => t.slug === slug) : null;
  const layouts = templates.filter((t) => t.is_layout);

  const [form, setForm] = useState<FormState>({
    name: '', slug: '', subject: '', sender_name: '',
    body_html: '', use_layout: true, is_layout: false, layout_slug: null, payload_schema_id: null,
  });

  const [previewHtml, setPreviewHtml]       = useState('');
  const [previewError, setPreviewError]     = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [isSaving, setIsSaving]             = useState(false);
  const [saveMsg, setSaveMsg]               = useState('');
  const [showTestModal, setShowTestModal]   = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting]         = useState(false);

  // Version state
  const [activeVersion, setActiveVersion]         = useState(0);
  const [loadedFromVersion, setLoadedFromVersion] = useState<number | null>(null); // null = editing draft
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [versions, setVersions]                   = useState<TemplateVersion[]>([]);
  const [versionsLoading, setVersionsLoading]     = useState(false);
  // Commit panel
  const [showCommitPanel, setShowCommitPanel]     = useState(false);
  const [commitNote, setCommitNote]               = useState('');
  const [isCommitting, setIsCommitting]           = useState(false);
  const [commitMsg, setCommitMsg]                 = useState('');
  // Per-row actions
  const [activatingVersion, setActivatingVersion] = useState<number | null>(null);
  const [restoringVersion, setRestoringVersion]   = useState<number | null>(null);
  const [deletingVersion, setDeletingVersion]     = useState<number | null>(null);
  const [deleteVersionConfirm, setDeleteVersionConfirm] = useState<number | null>(null);

  // AI state
  const [showAiPanel, setShowAiPanel]           = useState(false);
  const [aiPrompt, setAiPrompt]                 = useState('');
  const [aiType, setAiType]                     = useState<'template' | 'subject'>('template');
  const [aiGenerating, setAiGenerating]         = useState(false);
  const [aiError, setAiError]                   = useState('');
  const [showImprovePanel, setShowImprovePanel] = useState(false);
  const [improveInstruction, setImproveInstruction] = useState('');
  const [improving, setImproving]               = useState(false);

  const activeSchema: PayloadSchema | null =
    schemas.find((s) => s._id === form.payload_schema_id) ??
    (template?.payload_schema || null);

  useEffect(() => { fetchSchemas(); }, [fetchSchemas]);
  useEffect(() => { if (!templates.length) fetchTemplates(); }, [fetchTemplates, templates.length]);

  useEffect(() => {
    if (template) {
      setForm({
        name: template.name, slug: template.slug, subject: template.subject,
        sender_name: template.sender_name, body_html: template.body_html,
        use_layout: template.use_layout, is_layout: template.is_layout,
        layout_slug: template.layout_slug ?? null,
        payload_schema_id: template.payload_schema_id ?? null,
      });
      setActiveVersion(template.active_version ?? 0);
    }
  }, [template]);

  const fetchVersions = useCallback(async () => {
    if (!slug) return;
    setVersionsLoading(true);
    try {
      const { data } = await client.get<{ active_version: number; versions: TemplateVersion[] }>(`/templates/${slug}/versions`);
      setVersions(data.versions);
      setActiveVersion(data.active_version);
    } catch { /* silent */ }
    finally { setVersionsLoading(false); }
  }, [slug]);

  useEffect(() => {
    if (showVersionHistory) fetchVersions();
  }, [showVersionHistory, fetchVersions]);

  const debouncedHtml = useDebounce(form.body_html, 600);

  const updatePreview = useCallback(async (html: string) => {
    if (!html.trim()) { setPreviewHtml(''); return; }
    setPreviewLoading(true); setPreviewError('');
    try {
      const previewData = activeSchema
        ? Object.fromEntries(activeSchema.fields.map((f) => {
            if (f.type === 'array' || f.type === 'object') {
              try { return [f.key, JSON.parse(f.example)]; } catch { return [f.key, f.example]; }
            }
            return [f.key, f.example];
          }))
        : { user_name: 'Preview User', code: '123456' };
      const { data } = await client.post<{ html: string }>('/preview/raw', { html, data: previewData });
      setPreviewHtml(data.html);
    } catch (err) {
      setPreviewError((err as Error).message);
    } finally { setPreviewLoading(false); }
  }, [activeSchema]);

  useEffect(() => { updatePreview(debouncedHtml); }, [debouncedHtml, updatePreview]);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  // ── Save ──────────────────────────────────────────────────────────────────
  // If a version is loaded: updates that version in place.
  // Otherwise: updates the working draft.
  const handleSave = async () => {
    if (!slug) return;
    setIsSaving(true); setSaveMsg('');
    try {
      if (loadedFromVersion !== null) {
        await client.put(`/templates/${slug}/versions/${loadedFromVersion}`, {
          html: form.body_html,
          subject: form.subject,
        });
        setSaveMsg(`v${loadedFromVersion} updated`);
      } else {
        await updateTemplate(slug, form);
        setSaveMsg('Saved');
      }
      setTimeout(() => setSaveMsg(''), 2500);
    } catch (err) {
      setSaveMsg(`Error: ${(err as Error).message}`);
    } finally { setIsSaving(false); }
  };

  // ── Commit version (explicit snapshot) ────────────────────────────────────
  const handleCommit = async () => {
    if (!slug) return;
    setIsCommitting(true); setCommitMsg('');
    try {
      // Flush current editor content into the draft first
      await updateTemplate(slug, form);
      const { data } = await client.post<{ version: TemplateVersion; active_version: number }>(`/templates/${slug}/versions`, {
        note: commitNote.trim() || undefined,
      });
      setActiveVersion(data.active_version);
      setLoadedFromVersion(null);  // now pointing at a fresh commit
      setCommitNote('');
      setShowCommitPanel(false);
      setCommitMsg(`v${data.version.version} committed`);
      setTimeout(() => setCommitMsg(''), 3000);
      if (showVersionHistory) fetchVersions();
    } catch (err) {
      setCommitMsg(`Error: ${(err as Error).message}`);
    } finally { setIsCommitting(false); }
  };

  // ── Version drawer actions ─────────────────────────────────────────────────
  const handleLoadVersion = async (v: number) => {
    if (!slug) return;
    try {
      const { data } = await client.get<TemplateVersion>(`/templates/${slug}/versions/${v}`);
      setField('body_html', data.html);
      setField('subject', data.subject);
      setLoadedFromVersion(v);
    } catch { /* silent */ }
  };

  const handleActivateVersion = async (v: number) => {
    if (!slug) return;
    setActivatingVersion(v);
    try {
      await client.put(`/templates/${slug}/activate/${v}`);
      setActiveVersion(v);
      fetchVersions();
      // Keep editor content in sync
      const { data } = await client.get<TemplateVersion>(`/templates/${slug}/versions/${v}`);
      setField('body_html', data.html);
      setField('subject', data.subject);
    } catch { /* silent */ }
    finally { setActivatingVersion(null); }
  };

  const handleRestoreVersion = async (v: number) => {
    if (!slug) return;
    setRestoringVersion(v);
    try {
      await client.post(`/templates/${slug}/restore/${v}`);
      fetchVersions();
      fetchTemplates();
    } catch { /* silent */ }
    finally { setRestoringVersion(null); }
  };

  const handleDeleteVersion = async (v: number) => {
    if (!slug) return;
    setDeletingVersion(v);
    try {
      await client.delete(`/templates/${slug}/versions/${v}`);
      setDeleteVersionConfirm(null);
      fetchVersions();
    } catch { /* silent */ }
    finally { setDeletingVersion(null); }
  };

  const handleDelete = async () => {
    if (!slug) return;
    setIsDeleting(true);
    try {
      await deleteTemplate(slug);
      navigate('/templates');
    } catch {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleDuplicate = async () => {
    try {
      const newSlug = `${form.slug}-copy-${Date.now().toString(36)}`;
      const { data } = await client.post('/templates', { ...form, slug: newSlug, name: `${form.name} (copy)` });
      navigate(`/templates/${data.slug}`);
    } catch (err) { alert((err as Error).message); }
  };

  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) return;
    setAiGenerating(true); setAiError('');
    try {
      const { data } = await client.post<{ html?: string; subject?: string }>('/ai/generate', { prompt: aiPrompt, type: aiType });
      if (aiType === 'subject' && data.subject) {
        setField('subject', data.subject); setShowAiPanel(false);
      } else if (data.html) {
        setField('body_html', data.html); setShowAiPanel(false);
      }
      setAiPrompt('');
    } catch (err) { setAiError((err as Error).message); }
    finally { setAiGenerating(false); }
  };

  const handleImprove = async () => {
    if (!improveInstruction.trim() || !form.body_html.trim()) return;
    setImproving(true); setAiError('');
    try {
      const { data } = await client.post<{ html: string }>('/ai/improve', { html: form.body_html, instruction: improveInstruction });
      setField('body_html', data.html);
      setShowImprovePanel(false); setImproveInstruction('');
    } catch (err) { setAiError((err as Error).message); }
    finally { setImproving(false); }
  };

  const latestVersionNum = versions.length > 0 ? versions[0].version : 0;

  const actions = (
    <div className="flex items-center gap-2">
      {/* Status messages */}
      {saveMsg && (
        <span className={`text-xs font-medium ${saveMsg.startsWith('Error') ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
          {saveMsg}
        </span>
      )}
      {commitMsg && (
        <span className={`text-xs font-medium ${commitMsg.startsWith('Error') ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
          {commitMsg}
        </span>
      )}

      {/* Version indicator chip */}
      {loadedFromVersion !== null ? (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-700">
          <History className="w-3 h-3" />
          editing v{loadedFromVersion}
        </span>
      ) : activeVersion > 0 ? (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400 border border-brand-200 dark:border-brand-700">
          <CheckCircle2 className="w-3 h-3" />
          v{activeVersion} active
          {latestVersionNum > activeVersion && (
            <span className="text-amber-600 dark:text-amber-400 ml-0.5">· v{latestVersionNum} latest</span>
          )}
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-[var(--text-muted)] border border-dashed border-[var(--border)]">
          <History className="w-3 h-3" />
          unversioned
        </span>
      )}

      {aiEnabled && (
        <button
          onClick={() => { setShowAiPanel(true); setShowImprovePanel(false); setShowVersionHistory(false); setShowCommitPanel(false); }}
          className="btn-ai"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Generate
        </button>
      )}
      {!form.is_layout && (
        <button onClick={() => setShowTestModal(true)} className="btn-secondary">Send Test</button>
      )}
      <button
        onClick={() => { setShowVersionHistory((v) => !v); setShowAiPanel(false); setShowImprovePanel(false); setShowCommitPanel(false); }}
        className={`btn-secondary flex items-center gap-1.5 ${showVersionHistory ? 'ring-2 ring-brand-500' : ''}`}
      >
        <History className="w-3.5 h-3.5" />
        History
      </button>
      <button onClick={handleDuplicate} className="btn-secondary">Duplicate</button>
      <button onClick={() => setShowDeleteConfirm(true)} className="btn-danger">Delete</button>

      {/* Save (draft) */}
      <button onClick={handleSave} disabled={isSaving} className="btn-secondary disabled:opacity-50">
        {isSaving ? 'Saving…' : 'Save'}
      </button>

      {/* Commit version */}
      <div className="relative">
        <button
          onClick={() => { setShowCommitPanel((v) => !v); setShowAiPanel(false); setShowImprovePanel(false); }}
          className={`btn-primary flex items-center gap-1.5 ${showCommitPanel ? 'ring-2 ring-offset-1 ring-brand-400' : ''}`}
        >
          Commit version
        </button>
        {showCommitPanel && (
          <div className="absolute right-0 top-full mt-2 w-72 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-modal z-50 p-4 space-y-3">
            <p className="text-xs font-semibold text-[var(--text-primary)]">Commit a new version</p>
            <p className="text-xs text-[var(--text-muted)]">Snapshots the current editor content. The active version stays unchanged until you explicitly activate.</p>
            <input
              value={commitNote}
              onChange={(e) => setCommitNote(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCommit(); if (e.key === 'Escape') setShowCommitPanel(false); }}
              placeholder="Version note (optional)…"
              className={inputCls}
              autoFocus
            />
            <div className="flex gap-2">
              <button onClick={() => setShowCommitPanel(false)} className="btn-secondary flex-1 text-xs">Cancel</button>
              <button onClick={handleCommit} disabled={isCommitting} className="btn-primary flex-1 text-xs disabled:opacity-50">
                {isCommitting ? <Loader2 className="w-3 h-3 animate-spin mx-auto" /> : 'Commit'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  if (!template && slug) {
    return (
      <>
        <Header />
        <main className="flex-1 flex items-center justify-center text-[var(--text-muted)]">
          <div className="text-center">
            <p className="text-sm">Template not found.{' '}
              <button onClick={() => navigate('/templates')} className="text-brand-600 dark:text-brand-400 hover:underline">
                Go back
              </button>
            </p>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Header actions={actions} />

      <div className="flex-1 flex flex-col overflow-hidden p-4 gap-3 min-h-0">
        {/* Metadata */}
        <div className="card p-4 shrink-0">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-3">
            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Template Name</label>
              <input value={form.name} onChange={(e) => setField('name', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Slug</label>
              <input value={form.slug} readOnly
                className="w-full px-2.5 py-1.5 border border-[var(--border)] bg-[var(--surface-raised)] rounded-lg text-sm text-[var(--text-muted)] font-mono cursor-not-allowed" />
            </div>
            {!form.is_layout && (
              <div>
                <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Subject Line</label>
                <input value={form.subject} onChange={(e) => setField('subject', e.target.value)}
                  placeholder="Welcome, {{user_name}}!" className={inputCls} />
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Sender Name</label>
              <input value={form.sender_name} onChange={(e) => setField('sender_name', e.target.value)} className={inputCls} />
            </div>

            {!form.is_layout && (
              <div>
                <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Payload Schema</label>
                <select
                  value={form.payload_schema_id ?? ''}
                  onChange={(e) => setField('payload_schema_id', e.target.value || null)}
                  className={inputCls}
                >
                  <option value="">— None —</option>
                  {schemas.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
                </select>
              </div>
            )}
          </div>

          <div className="flex items-start gap-6">
            <div className="flex items-center gap-4 shrink-0 pt-0.5">
              <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)] cursor-pointer">
                <input type="checkbox" checked={form.use_layout} onChange={(e) => setField('use_layout', e.target.checked)}
                  disabled={form.is_layout} className="rounded border-[var(--border)] accent-brand-600" />
                Wrap in base layout
              </label>
              {form.is_layout && <Badge variant="info">Base Layout</Badge>}
            </div>

            {!form.is_layout && form.use_layout && (
              <div className="shrink-0">
                <select
                  value={form.layout_slug ?? ''}
                  onChange={(e) => setField('layout_slug', e.target.value || null)}
                  className="px-2.5 py-1 border border-[var(--border)] rounded-lg text-xs bg-[var(--surface)] text-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="">Default layout</option>
                  {layouts.map((l) => <option key={l.slug} value={l.slug}>{l.name}</option>)}
                </select>
              </div>
            )}

            {activeSchema && activeSchema.fields.length > 0 && (
              <div className="flex-1 min-w-0">
                <p className="text-xs text-[var(--text-muted)] mb-1">
                  Variables from <strong className="text-[var(--text-secondary)]">{activeSchema.name}</strong>:
                </p>
                <div className="flex flex-wrap gap-1">
                  {activeSchema.fields.map((f) => (
                    <span
                      key={f.key}
                      title={`${f.type}${f.required ? ' · required' : ''}${f.description ? ' · ' + f.description : ''}`}
                      className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-mono font-medium cursor-default ${TYPE_COLORS[f.type] ?? 'bg-[var(--surface-raised)] text-[var(--text-secondary)]'}`}
                    >
                      {f.required && <span className="text-red-400 font-bold text-[10px] leading-none">*</span>}
                      {`{{${f.key}}}`}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Loaded-version banner */}
        {loadedFromVersion !== null && (
          <div className="shrink-0 flex items-center justify-between gap-3 px-4 py-2 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
            <p className="text-xs text-amber-800 dark:text-amber-300">
              <strong>Editing v{loadedFromVersion}</strong>
              {loadedFromVersion === activeVersion && (
                <span className="ml-1 opacity-70">(active — production sends this)</span>
              )}
              {' · '}
              <span className="opacity-70">
                <strong>Save</strong> updates v{loadedFromVersion} in place.{' '}
                <strong>Commit version</strong> creates a new snapshot from the current content.{' '}
              </span>
              <button
                onClick={() => setLoadedFromVersion(null)}
                className="underline opacity-60 hover:opacity-100 transition-opacity"
              >
                Switch to draft
              </button>
            </p>
            <button
              onClick={() => setLoadedFromVersion(null)}
              className="text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200 shrink-0 transition-colors"
              title="Switch back to draft"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Editor + Preview */}
        <div className="flex-1 grid grid-cols-2 gap-4 min-h-0">
          <div className="min-h-0">
            <div className="flex items-center justify-between mb-1.5 px-1">
              <p className="text-xs font-medium text-[var(--text-muted)]">HTML / Handlebars</p>
              {aiEnabled && (
                <button
                  onClick={() => { setShowImprovePanel((v) => !v); setShowAiPanel(false); }}
                  className="flex items-center gap-1 text-xs font-medium text-violet-600 dark:text-violet-400 hover:underline"
                >
                  <Wand2 className="w-3 h-3" />
                  Improve
                </button>
              )}
            </div>
            <div className="h-[calc(100%-24px)]">
              <CodeEditor value={form.body_html} onChange={(v) => setField('body_html', v)} />
            </div>
          </div>
          <div className="min-h-0">
            <p className="text-xs font-medium text-[var(--text-muted)] mb-1.5 px-1">Live Preview</p>
            <div className="h-[calc(100%-24px)]">
              <EmailPreview html={previewHtml} isLoading={previewLoading} error={previewError} />
            </div>
          </div>
        </div>
      </div>

      {showTestModal && template && (
        <TestSendModal
          templateSlug={template.slug}
          templateName={template.name}
          activeVersion={activeVersion}
          payloadSchema={activeSchema}
          onClose={() => setShowTestModal(false)}
        />
      )}

      {showDeleteConfirm && (
        <ConfirmModal
          title="Delete Template"
          message={`Are you sure you want to delete "${form.name}"? All versions will be permanently removed.`}
          confirmLabel="Delete"
          danger
          isLoading={isDeleting}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}

      {/* ── Version History Drawer ─────────────────────────────────────────── */}
      {showVersionHistory && (
        <div className="fixed inset-y-0 right-0 w-96 bg-[var(--surface)] border-l border-[var(--border)] shadow-modal z-40 flex flex-col">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-[var(--text-secondary)]" />
              <span className="text-sm font-semibold text-[var(--text-primary)]">Version History</span>
            </div>
            <button onClick={() => setShowVersionHistory(false)} className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {versionsLoading ? (
              <div className="flex items-center justify-center h-32 text-[var(--text-muted)] text-sm">
                <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading…
              </div>
            ) : versions.length === 0 ? (
              <div className="p-5 text-center space-y-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--surface-raised)] flex items-center justify-center mx-auto">
                  <History className="w-5 h-5 text-[var(--text-muted)]" />
                </div>
                <p className="text-sm font-medium text-[var(--text-secondary)]">No versions yet</p>
                <p className="text-xs text-[var(--text-muted)]">
                  Click <strong>"Commit version"</strong> in the header to create your first snapshot.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[var(--border)]">
                {versions.map((v) => {
                  const isActive = v.version === activeVersion;
                  const confirmingDelete = deleteVersionConfirm === v.version;
                  return (
                    <div key={v._id} className={`p-4 ${isActive ? 'bg-brand-50 dark:bg-brand-900/20' : 'hover:bg-[var(--surface-raised)]'} transition-colors`}>
                      <div className="flex items-start justify-between gap-2 mb-1">
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

                      {v.note && (
                        <p className="text-xs text-[var(--text-secondary)] mb-2 italic">"{v.note}"</p>
                      )}

                      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                        {/* Load into editor */}
                        <button
                          onClick={() => handleLoadVersion(v.version)}
                          className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-raised)] transition-colors"
                        >
                          <Download className="w-3 h-3" />
                          Load
                        </button>

                        {/* Activate */}
                        {!isActive && (
                          <button
                            onClick={() => handleActivateVersion(v.version)}
                            disabled={activatingVersion === v.version}
                            className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-lg bg-brand-600 hover:bg-brand-700 text-white disabled:opacity-50 transition-colors"
                          >
                            {activatingVersion === v.version ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                            Activate
                          </button>
                        )}

                        {/* Restore as new */}
                        <button
                          onClick={() => handleRestoreVersion(v.version)}
                          disabled={restoringVersion === v.version}
                          className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-raised)] disabled:opacity-50 transition-colors"
                        >
                          {restoringVersion === v.version ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                          Restore
                        </button>

                        {/* Delete — two-click confirm */}
                        {confirmingDelete ? (
                          <>
                            <button
                              onClick={() => handleDeleteVersion(v.version)}
                              disabled={deletingVersion === v.version}
                              className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-lg bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 transition-colors"
                            >
                              {deletingVersion === v.version ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Confirm delete'}
                            </button>
                            <button onClick={() => setDeleteVersionConfirm(null)} className="text-xs text-[var(--text-muted)] hover:underline">
                              Cancel
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => {
                              if (isActive) return;
                              setDeleteVersionConfirm(v.version);
                            }}
                            disabled={isActive}
                            title={isActive ? 'Cannot delete the active version — activate another first' : `Delete v${v.version}`}
                            className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-lg border border-[var(--border)] text-[var(--text-muted)] hover:text-red-600 hover:border-red-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors ml-auto"
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

          <div className="px-5 py-4 border-t border-[var(--border)] bg-[var(--surface-raised)] space-y-1">
            <p className="text-xs text-[var(--text-muted)]">
              <strong>Save</strong> updates the working draft. <strong>Commit version</strong> creates a named snapshot. <strong>Activate</strong> sets what production sends.
            </p>
          </div>
        </div>
      )}

      {/* ── AI Generate Panel ──────────────────────────────────────────────── */}
      {showAiPanel && (
        <div className="fixed inset-y-0 right-0 w-96 bg-[var(--surface)] border-l border-[var(--border)] shadow-modal z-40 flex flex-col">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-violet-600 dark:text-violet-400" />
              <span className="text-sm font-semibold text-[var(--text-primary)]">Generate with AI</span>
            </div>
            <button onClick={() => setShowAiPanel(false)} className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 p-5 space-y-4 overflow-y-auto">
            <div>
              <label className="input-label">What to generate</label>
              <div className="flex gap-2">
                {(['template', 'subject'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setAiType(t)}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                      aiType === t
                        ? 'bg-violet-600 text-white border-violet-600'
                        : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--text-muted)]'
                    }`}
                  >
                    {t === 'template' ? 'Full template' : 'Subject line'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="input-label">Describe the email</label>
              <textarea
                rows={6}
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder={aiType === 'template'
                  ? 'A welcome email for new users. Include their name, a CTA button to get started, and a footer with an unsubscribe link.'
                  : 'A subject line for a password reset email. Urgent but not spammy.'}
                className="input resize-none"
              />
            </div>
            {aiError && <p className="text-xs text-red-600 dark:text-red-400">{aiError}</p>}
            <p className="text-xs text-[var(--text-muted)]">
              {aiType === 'template'
                ? 'Generated HTML replaces the current editor content.'
                : 'Generated subject line replaces the Subject field.'}
            </p>
          </div>
          <div className="px-5 py-4 border-t border-[var(--border)]">
            <button
              onClick={handleAiGenerate}
              disabled={aiGenerating || !aiPrompt.trim()}
              className="btn-ai w-full justify-center disabled:opacity-50"
            >
              {aiGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {aiGenerating ? 'Generating…' : 'Generate'}
            </button>
          </div>
        </div>
      )}

      {/* ── AI Improve Panel ───────────────────────────────────────────────── */}
      {showImprovePanel && (
        <div className="fixed inset-y-0 right-0 w-96 bg-[var(--surface)] border-l border-[var(--border)] shadow-modal z-40 flex flex-col">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
            <div className="flex items-center gap-2">
              <Wand2 className="w-4 h-4 text-violet-600 dark:text-violet-400" />
              <span className="text-sm font-semibold text-[var(--text-primary)]">Improve with AI</span>
            </div>
            <button onClick={() => setShowImprovePanel(false)} className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 p-5 space-y-4 overflow-y-auto">
            <div>
              <label className="input-label">Instruction</label>
              <textarea
                rows={4}
                value={improveInstruction}
                onChange={(e) => setImproveInstruction(e.target.value)}
                placeholder="Make it more friendly and concise. Add a prominent CTA button."
                className="input resize-none"
              />
            </div>
            {aiError && <p className="text-xs text-red-600 dark:text-red-400">{aiError}</p>}
            <p className="text-xs text-[var(--text-muted)]">The AI rewrites the full template HTML based on your instruction.</p>
          </div>
          <div className="px-5 py-4 border-t border-[var(--border)]">
            <button
              onClick={handleImprove}
              disabled={improving || !improveInstruction.trim()}
              className="btn-ai w-full justify-center disabled:opacity-50"
            >
              {improving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
              {improving ? 'Improving…' : 'Apply improvement'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
