import { useState, useMemo, useCallback, useEffect } from 'react';
import { Check, X, AlertTriangle, ChevronDown } from 'lucide-react';
import client from '../api/client';
import type { PayloadSchema, TemplateVersion } from '../types';

interface TestSendModalProps {
  templateSlug: string;
  templateName: string;
  activeVersion?: number;
  payloadSchema?: PayloadSchema | null;
  onClose: () => void;
}

function buildExampleJson(schema: PayloadSchema | null | undefined): string {
  if (!schema?.fields.length) {
    return JSON.stringify({ user_name: 'Jane Doe', appName: 'My App', year: '2025' }, null, 2);
  }
  const obj: Record<string, unknown> = {};
  for (const f of schema.fields) {
    if (f.type === 'array' || f.type === 'object') {
      try { obj[f.key] = JSON.parse(f.example); } catch { obj[f.key] = f.example; }
    } else if (f.type === 'number') {
      obj[f.key] = isNaN(Number(f.example)) ? f.example : Number(f.example);
    } else if (f.type === 'boolean') {
      obj[f.key] = f.example === 'true';
    } else {
      obj[f.key] = f.example || '';
    }
  }
  return JSON.stringify(obj, null, 2);
}

interface PreviewOverlayProps {
  templateSlug: string;
  dataJson: string;
  version?: number;
  onDataChange: (json: string) => void;
  onClose: () => void;
}

function PreviewOverlay({ templateSlug, dataJson: initialJson, version, onDataChange, onClose }: PreviewOverlayProps) {
  const [dataJson, setDataJson] = useState(initialJson);
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewSubject, setPreviewSubject] = useState('');
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const [showDataEditor, setShowDataEditor] = useState(false);
  const [syncEnabled, setSyncEnabled] = useState(false);

  const fetchPreview = useCallback(async (json: string) => {
    let data: Record<string, unknown> = {};
    try { data = JSON.parse(json); }
    catch {
      setPreviewError('Invalid JSON — fix the data to refresh the preview.');
      return;
    }
    setIsPreviewing(true);
    setPreviewError('');
    try {
      const { data: result } = await client.post<{ subject: string; html: string }>('/preview', {
        template_slug: templateSlug,
        data,
        ...(version ? { version } : {}),
      });
      setPreviewHtml(result.html);
      setPreviewSubject(result.subject);
    } catch (err) {
      setPreviewError((err as Error).message);
    } finally {
      setIsPreviewing(false);
    }
  }, [templateSlug, version]);

  useState(() => { fetchPreview(initialJson); });

  const handleDataChange = (json: string) => {
    setDataJson(json);
    if (syncEnabled) onDataChange(json);
  };

  const toggleSync = () => {
    const next = !syncEnabled;
    setSyncEnabled(next);
    if (next) onDataChange(dataJson);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-modal flex flex-col" style={{ width: '90vw', height: '90vh' }}>
        <div className="flex items-center gap-3 px-5 py-3 border-b border-[var(--border)] shrink-0">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide font-medium">Preview{version ? ` · v${version}` : ''}</p>
            {previewSubject && (
              <p className="text-sm font-semibold text-[var(--text-primary)] truncate mt-0.5">{previewSubject}</p>
            )}
          </div>

          <button
            type="button"
            onClick={toggleSync}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
              syncEnabled
                ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400'
                : 'text-[var(--text-muted)] border-[var(--border)] hover:bg-[var(--surface-raised)]'
            }`}
          >
            <span className={`relative inline-flex h-4 w-7 shrink-0 rounded-full border-2 border-transparent transition-colors ${syncEnabled ? 'bg-amber-400' : 'bg-[var(--border)]'}`}>
              <span className={`inline-block h-3 w-3 rounded-full bg-white shadow transition-transform ${syncEnabled ? 'translate-x-3' : 'translate-x-0'}`} />
            </span>
            Sync to send form
          </button>

          <button
            onClick={() => setShowDataEditor((v) => !v)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
              showDataEditor
                ? 'bg-[var(--text-primary)] text-[var(--bg)] border-[var(--text-primary)]'
                : 'text-[var(--text-secondary)] border-[var(--border)] hover:bg-[var(--surface-raised)]'
            }`}
          >
            Edit Data
          </button>
          <button
            onClick={() => fetchPreview(dataJson)}
            disabled={isPreviewing}
            className="btn-primary text-xs disabled:opacity-50"
          >
            {isPreviewing ? 'Rendering…' : 'Refresh'}
          </button>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors ml-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {showDataEditor && (
          <div className="px-5 py-3 border-b border-[var(--border)] bg-[var(--surface-raised)] shrink-0">
            <textarea
              value={dataJson}
              onChange={(e) => handleDataChange(e.target.value)}
              rows={4}
              placeholder="{}"
              className="input text-xs font-mono resize-none"
              spellCheck={false}
            />
            <p className="text-xs text-[var(--text-muted)] mt-1">
              {syncEnabled ? 'Sync is on — changes update the send form in real time.' : 'Edit then hit Refresh to re-render.'}
            </p>
          </div>
        )}

        <div className="flex-1 min-h-0 overflow-hidden rounded-b-2xl">
          {previewError ? (
            <div className="m-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-400">
              {previewError}
            </div>
          ) : isPreviewing ? (
            <div className="flex items-center justify-center h-full text-sm text-[var(--text-muted)]">Rendering…</div>
          ) : previewHtml ? (
            <iframe srcDoc={previewHtml} title="Email preview" className="w-full h-full border-0" sandbox="allow-same-origin" />
          ) : (
            <div className="flex items-center justify-center h-full text-sm text-[var(--text-muted)]">Loading preview…</div>
          )}
        </div>
      </div>
    </div>
  );
}

export function TestSendModal({ templateSlug, templateName, activeVersion = 0, payloadSchema, onClose }: TestSendModalProps) {
  const initialJson = useMemo(() => buildExampleJson(payloadSchema), [payloadSchema]);
  const [recipient, setRecipient] = useState('');
  const [dataJson, setDataJson] = useState(initialJson);
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  // Version switcher
  const [versions, setVersions] = useState<TemplateVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<number>(activeVersion);
  const [showVersionPicker, setShowVersionPicker] = useState(false);

  useEffect(() => {
    if (activeVersion) setSelectedVersion(activeVersion);
    client.get<{ active_version: number; versions: TemplateVersion[] }>(`/templates/${templateSlug}/versions`)
      .then(({ data }) => {
        setVersions(data.versions);
        if (data.active_version) setSelectedVersion(data.active_version);
      })
      .catch(() => { /* no versions yet */ });
  }, [templateSlug, activeVersion]);

  const isNonActiveVersion = selectedVersion > 0 && selectedVersion !== activeVersion;

  const handleSend = async () => {
    if (!recipient.trim()) return;
    let data: Record<string, unknown> = {};
    try { data = JSON.parse(dataJson); }
    catch {
      setStatus('error');
      setMessage('Invalid JSON in data field.');
      return;
    }
    setStatus('sending');
    setMessage('');
    try {
      await client.post('/send', {
        template_slug: templateSlug,
        recipient,
        data,
        ...(selectedVersion && selectedVersion !== activeVersion ? { version: selectedVersion } : {}),
      });
      setStatus('success');
      setMessage(`Email sent successfully to ${recipient}!`);
    } catch (err) {
      setStatus('error');
      setMessage((err as Error).message);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="card shadow-modal w-full max-w-lg mx-4 animate-slide-up">
          <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
            <div>
              <h2 className="text-base font-semibold text-[var(--text-primary)]">Send Test Email</h2>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Template: <code className="bg-[var(--surface-raised)] px-1 rounded">{templateSlug}</code> — {templateName}
              </p>
              {payloadSchema && (
                <p className="text-xs text-brand-600 dark:text-brand-400 mt-0.5">
                  Schema: <strong>{payloadSchema.name}</strong> — data pre-filled from example values
                </p>
              )}
            </div>
            <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-4">

            {/* Version selector */}
            {versions.length > 0 && (
              <div>
                <label className="input-label">Template version</label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowVersionPicker((v) => !v)}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 border border-[var(--border)] rounded-lg text-sm bg-[var(--surface)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <span>
                      v{selectedVersion}
                      {selectedVersion === activeVersion ? ' (active — production)' : ' (draft)'}
                    </span>
                    <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />
                  </button>
                  {showVersionPicker && (
                    <div className="absolute z-10 w-full mt-1 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-lg overflow-hidden">
                      {versions.map((v) => (
                        <button
                          key={v._id}
                          type="button"
                          onClick={() => { setSelectedVersion(v.version); setShowVersionPicker(false); }}
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-[var(--surface-raised)] transition-colors flex items-center justify-between ${selectedVersion === v.version ? 'text-brand-600 dark:text-brand-400 font-medium' : 'text-[var(--text-primary)]'}`}
                        >
                          <span>v{v.version}{v.note ? ` · ${v.note}` : ''}</span>
                          {v.version === activeVersion && (
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold uppercase tracking-wide">active</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Amber notice for non-active version */}
            {isNonActiveVersion && (
              <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-700 dark:text-amber-400">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  You are test-sending <strong>v{selectedVersion}</strong>, not the active version (v{activeVersion}).
                  This send will <strong>not affect production</strong>.
                </span>
              </div>
            )}

            <div>
              <label className="input-label">Recipient Email <span className="text-red-500">*</span></label>
              <input
                type="email"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="test@example.com"
                className="input"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="input-label mb-0">Template Data (JSON)</label>
                {payloadSchema && (
                  <button
                    type="button"
                    onClick={() => setDataJson(buildExampleJson(payloadSchema))}
                    className="text-xs text-brand-600 dark:text-brand-400 hover:underline"
                  >
                    Reset to schema examples
                  </button>
                )}
              </div>
              <textarea
                value={dataJson}
                onChange={(e) => setDataJson(e.target.value)}
                rows={payloadSchema ? Math.max(6, payloadSchema.fields.length + 2) : 7}
                className="input font-mono resize-none"
                spellCheck={false}
              />
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Merged with <code className="bg-[var(--surface-raised)] px-1 rounded">{`{{variables}}`}</code> in your template.
              </p>
            </div>

            {payloadSchema && payloadSchema.fields.some((f) => f.required) && (
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
                <p className="text-xs font-medium text-amber-700 dark:text-amber-400 mb-1">Required fields</p>
                <div className="flex flex-wrap gap-1">
                  {payloadSchema.fields.filter((f) => f.required).map((f) => (
                    <code key={f.key} className="text-xs bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 px-1.5 py-0.5 rounded">
                      {`{{${f.key}}}`}
                    </code>
                  ))}
                </div>
              </div>
            )}

            {status === 'success' && (
              <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl text-sm text-emerald-700 dark:text-emerald-400">
                <Check className="w-4 h-4 shrink-0" /> {message}
              </div>
            )}
            {status === 'error' && (
              <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-400">
                <X className="w-4 h-4 shrink-0" /> {message}
              </div>
            )}
          </div>

          <div className="flex gap-3 justify-end px-6 py-4 bg-[var(--surface-raised)] rounded-b-2xl border-t border-[var(--border)]">
            <button onClick={onClose} className="btn-secondary">Close</button>
            <button onClick={() => setShowPreview(true)} className="btn-secondary">Preview</button>
            <button
              onClick={handleSend}
              disabled={!recipient.trim() || status === 'sending'}
              className="btn-primary disabled:opacity-50"
            >
              {status === 'sending' ? 'Sending…' : 'Send Test'}
            </button>
          </div>
        </div>
      </div>

      {showPreview && (
        <PreviewOverlay
          templateSlug={templateSlug}
          dataJson={dataJson}
          version={selectedVersion !== activeVersion ? selectedVersion : undefined}
          onDataChange={setDataJson}
          onClose={() => setShowPreview(false)}
        />
      )}
    </>
  );
}
