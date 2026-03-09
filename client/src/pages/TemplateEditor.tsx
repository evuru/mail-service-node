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
import type { PayloadSchema } from '../types';
import { Sparkles, X, Loader2, Wand2 } from 'lucide-react';

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
  string: 'bg-blue-50 text-blue-600',
  number: 'bg-purple-50 text-purple-600',
  boolean: 'bg-yellow-50 text-yellow-600',
  array: 'bg-orange-50 text-orange-600',
  object: 'bg-green-50 text-green-600',
};

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

  const [previewHtml, setPreviewHtml] = useState('');
  const [previewError, setPreviewError] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [showTestModal, setShowTestModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // AI panel state
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiType, setAiType] = useState<'template' | 'subject'>('template');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiError, setAiError] = useState('');
  // Improve mode
  const [showImprovePanel, setShowImprovePanel] = useState(false);
  const [improveInstruction, setImproveInstruction] = useState('');
  const [improving, setImproving] = useState(false);

  // Resolved schema for the currently selected schema_id
  const activeSchema: PayloadSchema | null =
    schemas.find((s) => s._id === form.payload_schema_id) ??
    (template?.payload_schema || null);

  useEffect(() => { fetchSchemas(); }, [fetchSchemas]);
  useEffect(() => { if (!templates.length) fetchTemplates(); }, [fetchTemplates, templates.length]);

  useEffect(() => {
    if (template) {
      setForm({
        name: template.name,
        slug: template.slug,
        subject: template.subject,
        sender_name: template.sender_name,
        body_html: template.body_html,
        use_layout: template.use_layout,
        is_layout: template.is_layout,
        layout_slug: template.layout_slug ?? null,
        payload_schema_id: template.payload_schema_id ?? null,
      });
    }
  }, [template]);

  const debouncedHtml = useDebounce(form.body_html, 600);

  const updatePreview = useCallback(async (html: string) => {
    if (!html.trim()) { setPreviewHtml(''); return; }
    setPreviewLoading(true);
    setPreviewError('');
    try {
      // appName and year are injected server-side from APP_NAME env var.
      // We only send schema example values (or a minimal fallback) as the user data.
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
    } finally {
      setPreviewLoading(false);
    }
  }, [activeSchema]);

  useEffect(() => { updatePreview(debouncedHtml); }, [debouncedHtml, updatePreview]);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSave = async () => {
    if (!slug) return;
    setIsSaving(true);
    setSaveMsg('');
    try {
      await updateTemplate(slug, form);
      setSaveMsg('Saved!');
      setTimeout(() => setSaveMsg(''), 2000);
    } catch (err) {
      setSaveMsg(`Error: ${(err as Error).message}`);
    } finally {
      setIsSaving(false);
    }
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
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) return;
    setAiGenerating(true); setAiError('');
    try {
      const { data } = await client.post<{ html?: string; subject?: string }>('/ai/generate', {
        prompt: aiPrompt,
        type: aiType,
      });
      if (aiType === 'subject' && data.subject) {
        setField('subject', data.subject);
        setShowAiPanel(false);
      } else if (data.html) {
        setField('body_html', data.html);
        setShowAiPanel(false);
      }
      setAiPrompt('');
    } catch (err) {
      setAiError((err as Error).message);
    } finally {
      setAiGenerating(false);
    }
  };

  const handleImprove = async () => {
    if (!improveInstruction.trim() || !form.body_html.trim()) return;
    setImproving(true); setAiError('');
    try {
      const { data } = await client.post<{ html: string }>('/ai/improve', {
        html: form.body_html,
        instruction: improveInstruction,
      });
      setField('body_html', data.html);
      setShowImprovePanel(false);
      setImproveInstruction('');
    } catch (err) {
      setAiError((err as Error).message);
    } finally {
      setImproving(false);
    }
  };

  const actions = (
    <div className="flex items-center gap-2">
      {saveMsg && (
        <span className={`text-xs font-medium ${saveMsg.startsWith('Error') ? 'text-red-600' : 'text-green-600'}`}>
          {saveMsg}
        </span>
      )}
      {aiEnabled && (
        <button
          onClick={() => { setShowAiPanel(true); setShowImprovePanel(false); }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-violet-700 border border-violet-200 bg-violet-50 rounded-lg hover:bg-violet-100"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Generate
        </button>
      )}
      {!form.is_layout && (
        <button onClick={() => setShowTestModal(true)} className="px-3 py-1.5 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">
          Send Test
        </button>
      )}
      <button onClick={handleDuplicate} className="px-3 py-1.5 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">
        Duplicate
      </button>
      <button onClick={() => setShowDeleteConfirm(true)} className="px-3 py-1.5 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50">
        Delete
      </button>
      <button onClick={handleSave} disabled={isSaving} className="px-4 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
        {isSaving ? 'Saving...' : 'Save'}
      </button>
    </div>
  );

  if (!template && slug) {
    return (
      <>
        <Header />
        <main className="flex-1 flex items-center justify-center text-gray-400">
          <div className="text-center">
            <div className="text-4xl mb-3">🔍</div>
            <p className="text-sm">Template not found. <button onClick={() => navigate('/templates')} className="text-blue-600 hover:underline">Go back</button></p>
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
        <div className="bg-white rounded-xl border border-gray-200 p-4 shrink-0">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Template Name</label>
              <input value={form.name} onChange={(e) => setField('name', e.target.value)}
                className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Slug</label>
              <input value={form.slug} readOnly
                className="w-full px-2.5 py-1.5 border border-gray-100 bg-gray-50 rounded-lg text-sm text-gray-500 font-mono cursor-not-allowed" />
            </div>
            {!form.is_layout && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Subject Line</label>
                <input value={form.subject} onChange={(e) => setField('subject', e.target.value)}
                  placeholder="Welcome, {{user_name}}!"
                  className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Sender Name</label>
              <input value={form.sender_name} onChange={(e) => setField('sender_name', e.target.value)}
                className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            {/* Schema picker */}
            {!form.is_layout && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Payload Schema</label>
                <select
                  value={form.payload_schema_id ?? ''}
                  onChange={(e) => setField('payload_schema_id', e.target.value || null)}
                  className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">— None —</option>
                  {schemas.map((s) => (
                    <option key={s._id} value={s._id}>{s.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Second row: checkboxes + layout picker + schema variables */}
          <div className="flex items-start gap-6">
            <div className="flex items-center gap-4 shrink-0 pt-0.5">
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input type="checkbox" checked={form.use_layout} onChange={(e) => setField('use_layout', e.target.checked)}
                  disabled={form.is_layout} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                Wrap in base layout
              </label>
              {form.is_layout && <Badge variant="info">Base Layout</Badge>}
            </div>

            {/* Layout picker — only when use_layout is on and template is not itself a layout */}
            {!form.is_layout && form.use_layout && (
              <div className="shrink-0">
                <select
                  value={form.layout_slug ?? ''}
                  onChange={(e) => setField('layout_slug', e.target.value || null)}
                  className="px-2.5 py-1 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
                >
                  <option value="">Default layout</option>
                  {layouts.map((l) => (
                    <option key={l.slug} value={l.slug}>{l.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Variables from schema */}
            {activeSchema && activeSchema.fields.length > 0 && (
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-400 mb-1">
                  Variables from <strong className="text-gray-600">{activeSchema.name}</strong>:
                </p>
                <div className="flex flex-wrap gap-1">
                  {activeSchema.fields.map((f) => (
                    <span
                      key={f.key}
                      title={`${f.type}${f.required ? ' · required' : ''}${f.description ? ' · ' + f.description : ''}`}
                      className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-mono font-medium cursor-default ${TYPE_COLORS[f.type] ?? 'bg-gray-100 text-gray-600'}`}
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

        {/* Editor + Preview */}
        <div className="flex-1 grid grid-cols-2 gap-4 min-h-0">
          <div className="min-h-0">
            <div className="flex items-center justify-between mb-1.5 px-1">
              <p className="text-xs font-medium text-gray-500">HTML / Handlebars</p>
              {aiEnabled && (
                <button
                  onClick={() => { setShowImprovePanel((v) => !v); setShowAiPanel(false); }}
                  className="flex items-center gap-1 text-xs font-medium text-violet-600 hover:text-violet-800"
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
            <p className="text-xs font-medium text-gray-500 mb-1.5 px-1">Live Preview</p>
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
          payloadSchema={activeSchema}
          onClose={() => setShowTestModal(false)}
        />
      )}

      {showDeleteConfirm && (
        <ConfirmModal
          title="Delete Template"
          message={`Are you sure you want to delete "${form.name}"? This cannot be undone.`}
          confirmLabel="Delete"
          danger
          isLoading={isDeleting}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}

      {/* ── AI Generate Panel ── */}
      {showAiPanel && (
        <div className="fixed inset-y-0 right-0 w-96 bg-white border-l border-gray-200 shadow-2xl z-40 flex flex-col">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-violet-600" />
              <span className="text-sm font-semibold text-gray-900">Generate with AI</span>
            </div>
            <button onClick={() => setShowAiPanel(false)} className="text-gray-400 hover:text-gray-700">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 p-5 space-y-4 overflow-y-auto">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">What to generate</label>
              <div className="flex gap-2">
                {(['template', 'subject'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setAiType(t)}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                      aiType === t
                        ? 'bg-violet-600 text-white border-violet-600'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {t === 'template' ? 'Full template' : 'Subject line'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Describe the email</label>
              <textarea
                rows={6}
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder={aiType === 'template'
                  ? 'A welcome email for new users. Include their name, a CTA button to get started, and a footer with an unsubscribe link.'
                  : 'A subject line for a password reset email. Urgent but not spammy.'}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              />
            </div>
            {aiError && <p className="text-xs text-red-600">{aiError}</p>}
            <p className="text-xs text-gray-400">
              {aiType === 'template'
                ? 'The generated HTML will replace the current editor content.'
                : 'The generated subject line will replace the Subject field.'}
            </p>
          </div>
          <div className="px-5 py-4 border-t border-gray-100">
            <button
              onClick={handleAiGenerate}
              disabled={aiGenerating || !aiPrompt.trim()}
              className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
            >
              {aiGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {aiGenerating ? 'Generating…' : 'Generate'}
            </button>
          </div>
        </div>
      )}

      {/* ── AI Improve Panel ── */}
      {showImprovePanel && (
        <div className="fixed inset-y-0 right-0 w-96 bg-white border-l border-gray-200 shadow-2xl z-40 flex flex-col">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Wand2 className="w-4 h-4 text-violet-600" />
              <span className="text-sm font-semibold text-gray-900">Improve with AI</span>
            </div>
            <button onClick={() => setShowImprovePanel(false)} className="text-gray-400 hover:text-gray-700">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 p-5 space-y-4 overflow-y-auto">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Instruction</label>
              <textarea
                rows={4}
                value={improveInstruction}
                onChange={(e) => setImproveInstruction(e.target.value)}
                placeholder="Make it more friendly and concise. Add a prominent CTA button."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              />
            </div>
            {aiError && <p className="text-xs text-red-600">{aiError}</p>}
            <p className="text-xs text-gray-400">The AI will rewrite the full template HTML based on your instruction. The result replaces the current content.</p>
          </div>
          <div className="px-5 py-4 border-t border-gray-100">
            <button
              onClick={handleImprove}
              disabled={improving || !improveInstruction.trim()}
              className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
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
