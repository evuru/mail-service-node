import { useState, useMemo, useCallback } from 'react';
import { Check, X } from 'lucide-react';
import client from '../api/client';
import type { PayloadSchema } from '../types';

interface TestSendModalProps {
  templateSlug: string;
  templateName: string;
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

// ─── Full-screen preview overlay ────────────────────────────────────────────

interface PreviewOverlayProps {
  templateSlug: string;
  dataJson: string;
  onDataChange: (json: string) => void;
  onClose: () => void;
}

function PreviewOverlay({ templateSlug, dataJson: initialJson, onDataChange, onClose }: PreviewOverlayProps) {
  const [dataJson, setDataJson] = useState(initialJson);
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewSubject, setPreviewSubject] = useState('');
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const [showDataEditor, setShowDataEditor] = useState(false);
  const [syncEnabled, setSyncEnabled] = useState(false);

  const fetchPreview = useCallback(async (json: string) => {
    let data: Record<string, unknown> = {};
    try {
      data = JSON.parse(json);
    } catch {
      setPreviewError('Invalid JSON — fix the data to refresh the preview.');
      return;
    }
    setIsPreviewing(true);
    setPreviewError('');
    try {
      const { data: result } = await client.post<{ subject: string; html: string }>('/preview', {
        template_slug: templateSlug,
        data,
      });
      setPreviewHtml(result.html);
      setPreviewSubject(result.subject);
    } catch (err) {
      setPreviewError((err as Error).message);
    } finally {
      setIsPreviewing(false);
    }
  }, [templateSlug]);

  // Load immediately on mount
  useState(() => { fetchPreview(initialJson); });

  const handleDataChange = (json: string) => {
    setDataJson(json);
    if (syncEnabled) onDataChange(json);
  };

  const toggleSync = () => {
    const next = !syncEnabled;
    setSyncEnabled(next);
    // Push current data immediately when enabling
    if (next) onDataChange(dataJson);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-xl shadow-2xl flex flex-col" style={{ width: '90vw', height: '90vh' }}>

        {/* Top bar */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-200 shrink-0">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Preview</p>
            {previewSubject && (
              <p className="text-sm font-semibold text-gray-800 truncate mt-0.5">{previewSubject}</p>
            )}
          </div>

          {/* Sync toggle — always visible */}
          <button
            type="button"
            onClick={toggleSync}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${syncEnabled ? 'bg-amber-50 border-amber-300 text-amber-700' : 'text-gray-500 border-gray-200 hover:bg-gray-50'}`}
          >
            <span
              className={`relative inline-flex h-4 w-7 shrink-0 rounded-full border-2 border-transparent transition-colors ${syncEnabled ? 'bg-amber-400' : 'bg-gray-300'}`}
            >
              <span className={`inline-block h-3 w-3 rounded-full bg-white shadow transition-transform ${syncEnabled ? 'translate-x-3' : 'translate-x-0'}`} />
            </span>
            Sync to send form
          </button>

          <button
            onClick={() => setShowDataEditor((v) => !v)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${showDataEditor ? 'bg-gray-900 text-white border-gray-900' : 'text-gray-600 border-gray-200 hover:bg-gray-50'}`}
          >
            Edit Data
          </button>
          <button
            onClick={() => fetchPreview(dataJson)}
            disabled={isPreviewing}
            className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isPreviewing ? 'Rendering…' : 'Refresh'}
          </button>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none ml-1">&times;</button>
        </div>

        {/* Optional data editor panel */}
        {showDataEditor && (
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 shrink-0">
            <textarea
              value={dataJson}
              onChange={(e) => handleDataChange(e.target.value)}
              rows={4}
              placeholder="{}"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none bg-white"
              spellCheck={false}
            />
            <p className="text-xs text-gray-400 mt-1">
              {syncEnabled
                ? 'Sync is on — changes update the send form in real time.'
                : 'Edit then hit Refresh to re-render.'}
            </p>
          </div>
        )}

        {/* Preview iframe */}
        <div className="flex-1 min-h-0 overflow-hidden rounded-b-xl">
          {previewError ? (
            <div className="m-6 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {previewError}
            </div>
          ) : isPreviewing ? (
            <div className="flex items-center justify-center h-full text-sm text-gray-400">
              Rendering…
            </div>
          ) : previewHtml ? (
            <iframe
              srcDoc={previewHtml}
              title="Email preview"
              className="w-full h-full border-0"
              sandbox="allow-same-origin"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-sm text-gray-400">
              Loading preview…
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Send modal ──────────────────────────────────────────────────────────────

export function TestSendModal({ templateSlug, templateName, payloadSchema, onClose }: TestSendModalProps) {
  const initialJson = useMemo(() => buildExampleJson(payloadSchema), [payloadSchema]);
  const [recipient, setRecipient] = useState('');
  const [dataJson, setDataJson] = useState(initialJson);
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  const handleSend = async () => {
    if (!recipient.trim()) return;
    let data: Record<string, unknown> = {};
    try {
      data = JSON.parse(dataJson);
    } catch {
      setStatus('error');
      setMessage('Invalid JSON in data field.');
      return;
    }
    setStatus('sending');
    setMessage('');
    try {
      await client.post('/send', { template_slug: templateSlug, recipient, data });
      setStatus('success');
      setMessage(`Email sent successfully to ${recipient}!`);
    } catch (err) {
      setStatus('error');
      setMessage((err as Error).message);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Send Test Email</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Template: <code className="bg-gray-100 px-1 rounded">{templateSlug}</code> — {templateName}
              </p>
              {payloadSchema && (
                <p className="text-xs text-blue-600 mt-0.5">
                  Schema: <strong>{payloadSchema.name}</strong> — data pre-filled from example values
                </p>
              )}
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
          </div>

          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Recipient Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="test@example.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-gray-700">Template Data (JSON)</label>
                {payloadSchema && (
                  <button
                    type="button"
                    onClick={() => setDataJson(buildExampleJson(payloadSchema))}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    Reset to schema examples
                  </button>
                )}
              </div>
              <textarea
                value={dataJson}
                onChange={(e) => setDataJson(e.target.value)}
                rows={payloadSchema ? Math.max(6, payloadSchema.fields.length + 2) : 7}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                spellCheck={false}
              />
              <p className="text-xs text-gray-400 mt-1">
                Merged with <code className="bg-gray-100 px-1 rounded">{`{{variables}}`}</code> in your template.
              </p>
            </div>

            {payloadSchema && payloadSchema.fields.some((f) => f.required) && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-xs font-medium text-amber-700 mb-1">Required fields</p>
                <div className="flex flex-wrap gap-1">
                  {payloadSchema.fields.filter((f) => f.required).map((f) => (
                    <code key={f.key} className="text-xs bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
                      {`{{${f.key}}}`}
                    </code>
                  ))}
                </div>
              </div>
            )}

            {status === 'success' && (
              <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
                <Check className="w-4 h-4 shrink-0" /> {message}
              </div>
            )}
            {status === 'error' && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                <X className="w-4 h-4 shrink-0" /> {message}
              </div>
            )}
          </div>

          <div className="flex gap-3 justify-end px-6 py-4 bg-gray-50 rounded-b-xl border-t border-gray-100">
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg bg-white hover:bg-gray-50">
              Close
            </button>
            <button
              onClick={() => setShowPreview(true)}
              className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg bg-white hover:bg-gray-50"
            >
              Preview
            </button>
            <button
              onClick={handleSend}
              disabled={!recipient.trim() || status === 'sending'}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
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
          onDataChange={setDataJson}
          onClose={() => setShowPreview(false)}
        />
      )}
    </>
  );
}
