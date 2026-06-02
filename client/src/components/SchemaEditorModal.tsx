import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import type { PayloadSchema, SchemaField, FieldType } from '../types';

const FIELD_TYPES: FieldType[] = ['string', 'number', 'boolean', 'array', 'object'];

const emptyField = (): SchemaField => ({ key: '', type: 'string', required: false, example: '', description: '' });

const toJson = (name: string, description: string, fields: SchemaField[]) =>
  JSON.stringify({ name, description, fields }, null, 2);

interface SchemaEditorModalProps {
  schema?: PayloadSchema;
  loadedFromVersion?: number | null;
  onClose: () => void;
  onSave: (data: { name: string; description: string; fields: SchemaField[] }) => Promise<void>;
}

export function SchemaEditorModal({ schema, loadedFromVersion = null, onClose, onSave }: SchemaEditorModalProps) {
  const [name, setName]               = useState(schema?.name ?? '');
  const [description, setDescription] = useState(schema?.description ?? '');
  const [fields, setFields]           = useState<SchemaField[]>(
    schema?.fields.length ? schema.fields.map((f) => ({ ...f })) : [emptyField()]
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError]         = useState('');

  const [jsonText, setJsonText]   = useState(() => toJson(schema?.name ?? '', schema?.description ?? '', schema?.fields.length ? schema.fields.map((f) => ({ ...f })) : [emptyField()]));
  const [jsonError, setJsonError] = useState('');
  const syncingFromJson = useRef(false);

  useEffect(() => {
    if (syncingFromJson.current) return;
    setJsonText(toJson(name, description, fields));
  }, [name, description, fields]);

  const handleJsonChange = (text: string) => {
    setJsonText(text);
    setJsonError('');
    try {
      const parsed = JSON.parse(text) as Partial<{ name: string; description: string; fields: SchemaField[] }>;
      syncingFromJson.current = true;
      if (typeof parsed.name === 'string') setName(parsed.name);
      if (typeof parsed.description === 'string') setDescription(parsed.description);
      if (Array.isArray(parsed.fields)) {
        setFields(parsed.fields.map((f) => ({
          key: f.key ?? '',
          type: FIELD_TYPES.includes(f.type) ? f.type : 'string',
          required: !!f.required,
          example: f.example ?? '',
          description: f.description ?? '',
        })));
      }
      requestAnimationFrame(() => { syncingFromJson.current = false; });
    } catch {
      setJsonError('Invalid JSON');
    }
  };

  const setField = (idx: number, key: keyof SchemaField, value: string | boolean) => {
    setFields((prev) => prev.map((f, i) => (i === idx ? { ...f, [key]: value } : f)));
  };

  const addField    = () => setFields((prev) => [...prev, emptyField()]);
  const removeField = (idx: number) => setFields((prev) => prev.filter((_, i) => i !== idx));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('Name is required.'); return; }
    const validFields = fields.filter((f) => f.key.trim());
    if (validFields.length === 0) { setError('Add at least one field with a key.'); return; }
    setIsLoading(true); setError('');
    try {
      await onSave({ name, description, fields: validFields });
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally { setIsLoading(false); }
  };

  const inputCls = 'px-2.5 py-1.5 border border-[var(--border)] rounded-lg text-sm bg-[var(--surface)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="card shadow-modal w-full max-w-5xl max-h-[90vh] flex flex-col animate-slide-up">

        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] shrink-0">
          <div>
            <h2 className="text-base font-semibold text-[var(--text-primary)]">
              {schema ? 'Edit Schema' : 'New Payload Schema'}
            </h2>
            {loadedFromVersion !== null && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                Editing v{loadedFromVersion} — Save updates this version in place.
              </p>
            )}
          </div>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex flex-1 min-h-0 divide-x divide-[var(--border)]">

            {/* Form side */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="input-label">Schema Name <span className="text-red-500">*</span></label>
                  <input value={name} onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. User Basic" className="input" required />
                </div>
                <div>
                  <label className="input-label">Description</label>
                  <input value={description} onChange={(e) => setDescription(e.target.value)}
                    placeholder="What templates use this schema?" className="input" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-[var(--text-muted)]">
                    Fields ({fields.filter((f) => f.key.trim()).length} defined)
                  </label>
                  <button type="button" onClick={addField} className="text-xs font-medium text-brand-600 dark:text-brand-400 hover:underline">
                    + Add Field
                  </button>
                </div>

                <div className="grid grid-cols-[1fr_100px_60px_1fr_1fr_28px] gap-2 mb-1 px-1">
                  {['Key', 'Type', 'Req.', 'Example', 'Description', ''].map((h) => (
                    <span key={h} className="text-xs text-[var(--text-muted)] font-medium">{h}</span>
                  ))}
                </div>

                <div className="space-y-2">
                  {fields.map((f, idx) => (
                    <div key={idx} className="grid grid-cols-[1fr_100px_60px_1fr_1fr_28px] gap-2 items-center">
                      <input value={f.key} onChange={(e) => setField(idx, 'key', e.target.value)}
                        placeholder="user_name" className={`${inputCls} font-mono`} />
                      <select value={f.type} onChange={(e) => setField(idx, 'type', e.target.value as FieldType)}
                        className={inputCls}>
                        {FIELD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <div className="flex justify-center">
                        <input type="checkbox" checked={f.required} onChange={(e) => setField(idx, 'required', e.target.checked)}
                          className="w-4 h-4 rounded accent-brand-600 cursor-pointer" />
                      </div>
                      <input value={f.example} onChange={(e) => setField(idx, 'example', e.target.value)}
                        placeholder="Jane Doe" className={inputCls} />
                      <input value={f.description} onChange={(e) => setField(idx, 'description', e.target.value)}
                        placeholder="Short description" className={inputCls} />
                      <button type="button" onClick={() => removeField(idx)} disabled={fields.length === 1}
                        className="text-[var(--text-muted)] hover:text-red-500 disabled:opacity-20 transition-colors"
                        title="Remove field">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <p className="text-xs text-[var(--text-muted)] mt-2">
                  Fields map to <code className="bg-[var(--surface-raised)] px-1 rounded">{`{{key}}`}</code> variables.
                  <strong> Example</strong> pre-fills the test modal.
                </p>
              </div>

              {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
            </div>

            {/* JSON side */}
            <div className="w-80 shrink-0 flex flex-col bg-gray-950">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-800 shrink-0">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">JSON</span>
                {jsonError
                  ? <span className="text-xs text-red-400 font-medium">{jsonError}</span>
                  : <span className="text-xs text-emerald-500">valid</span>}
              </div>
              <textarea
                value={jsonText}
                onChange={(e) => handleJsonChange(e.target.value)}
                spellCheck={false}
                className={`flex-1 w-full resize-none bg-transparent text-gray-100 text-xs font-mono leading-relaxed p-4 focus:outline-none ${jsonError ? 'border-l-2 border-red-500' : ''}`}
                placeholder='{}'
              />
            </div>
          </div>

          <div className="flex items-center gap-3 justify-end px-6 py-4 border-t border-[var(--border)] bg-[var(--surface-raised)] rounded-b-2xl shrink-0">
            {schema && loadedFromVersion === null && (
              <p className="flex-1 text-xs text-[var(--text-muted)]">
                Saves the working draft. Use <strong>History → Commit version</strong> to create a named snapshot.
              </p>
            )}
            {schema && loadedFromVersion !== null && (
              <p className="flex-1 text-xs text-amber-600 dark:text-amber-400">
                Saves changes back to v{loadedFromVersion} in place.
              </p>
            )}
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={isLoading} className="btn-primary disabled:opacity-50">
              {isLoading ? 'Saving…' : schema
                ? (loadedFromVersion !== null ? `Save v${loadedFromVersion}` : 'Save')
                : 'Create Schema'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
