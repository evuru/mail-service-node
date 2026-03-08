import { useEffect, useRef, useState } from 'react';
import type { PayloadSchema, SchemaField, FieldType } from '../types';

const FIELD_TYPES: FieldType[] = ['string', 'number', 'boolean', 'array', 'object'];

const emptyField = (): SchemaField => ({
  key: '',
  type: 'string',
  required: false,
  example: '',
  description: '',
});

const toJson = (name: string, description: string, fields: SchemaField[]) =>
  JSON.stringify({ name, description, fields }, null, 2);

interface SchemaEditorModalProps {
  schema?: PayloadSchema;
  onClose: () => void;
  onSave: (data: { name: string; description: string; fields: SchemaField[] }) => Promise<void>;
}

export function SchemaEditorModal({ schema, onClose, onSave }: SchemaEditorModalProps) {
  const [name, setName] = useState(schema?.name ?? '');
  const [description, setDescription] = useState(schema?.description ?? '');
  const [fields, setFields] = useState<SchemaField[]>(
    schema?.fields.length ? schema.fields.map((f) => ({ ...f })) : [emptyField()]
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // JSON panel state
  const [jsonText, setJsonText] = useState(() => toJson(schema?.name ?? '', schema?.description ?? '', schema?.fields.length ? schema.fields.map((f) => ({ ...f })) : [emptyField()]));
  const [jsonError, setJsonError] = useState('');
  const syncingFromJson = useRef(false);

  // Form → JSON: whenever form state changes, keep JSON in sync
  useEffect(() => {
    if (syncingFromJson.current) return;
    setJsonText(toJson(name, description, fields));
  }, [name, description, fields]);

  // JSON → Form: parse JSON and push values into form
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
      // Let the useEffect above settle first, then re-enable sync
      requestAnimationFrame(() => { syncingFromJson.current = false; });
    } catch {
      setJsonError('Invalid JSON');
    }
  };

  const setField = (idx: number, key: keyof SchemaField, value: string | boolean) => {
    setFields((prev) => prev.map((f, i) => (i === idx ? { ...f, [key]: value } : f)));
  };

  const addField = () => setFields((prev) => [...prev, emptyField()]);

  const removeField = (idx: number) =>
    setFields((prev) => prev.filter((_, i) => i !== idx));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('Name is required.'); return; }
    const validFields = fields.filter((f) => f.key.trim());
    if (validFields.length === 0) { setError('Add at least one field with a key.'); return; }
    setIsLoading(true);
    setError('');
    try {
      await onSave({ name, description, fields: validFields });
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <h2 className="text-base font-semibold text-gray-900">
            {schema ? 'Edit Schema' : 'New Payload Schema'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          {/* Split body */}
          <div className="flex flex-1 min-h-0 divide-x divide-gray-100">

            {/* ── LEFT: Form ── */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {/* Name + Description */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Schema Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. User Basic"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                  <input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What templates use this schema?"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Fields */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-gray-600">
                    Fields ({fields.filter((f) => f.key.trim()).length} defined)
                  </label>
                  <button
                    type="button"
                    onClick={addField}
                    className="text-xs font-medium text-blue-600 hover:text-blue-800"
                  >
                    + Add Field
                  </button>
                </div>

                {/* Column headers */}
                <div className="grid grid-cols-[1fr_100px_60px_1fr_1fr_28px] gap-2 mb-1 px-1">
                  {['Key', 'Type', 'Req.', 'Example', 'Description', ''].map((h) => (
                    <span key={h} className="text-xs text-gray-400 font-medium">{h}</span>
                  ))}
                </div>

                <div className="space-y-2">
                  {fields.map((f, idx) => (
                    <div key={idx} className="grid grid-cols-[1fr_100px_60px_1fr_1fr_28px] gap-2 items-center">
                      <input
                        value={f.key}
                        onChange={(e) => setField(idx, 'key', e.target.value)}
                        placeholder="user_name"
                        className="px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <select
                        value={f.type}
                        onChange={(e) => setField(idx, 'type', e.target.value as FieldType)}
                        className="px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      >
                        {FIELD_TYPES.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                      <div className="flex justify-center">
                        <input
                          type="checkbox"
                          checked={f.required}
                          onChange={(e) => setField(idx, 'required', e.target.checked)}
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </div>
                      <input
                        value={f.example}
                        onChange={(e) => setField(idx, 'example', e.target.value)}
                        placeholder="Jane Doe"
                        className="px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <input
                        value={f.description}
                        onChange={(e) => setField(idx, 'description', e.target.value)}
                        placeholder="Short description"
                        className="px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => removeField(idx)}
                        disabled={fields.length === 1}
                        className="text-gray-300 hover:text-red-500 disabled:opacity-20 text-lg leading-none transition-colors"
                        title="Remove field"
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>

                <p className="text-xs text-gray-400 mt-2">
                  Fields map to <code className="bg-gray-100 px-1 rounded">{`{{key}}`}</code> variables.
                  <strong> Example</strong> pre-fills the test modal.
                </p>
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>

            {/* ── RIGHT: JSON Editor ── */}
            <div className="w-80 shrink-0 flex flex-col bg-gray-950">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-800 shrink-0">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">JSON</span>
                {jsonError ? (
                  <span className="text-xs text-red-400 font-medium">{jsonError}</span>
                ) : (
                  <span className="text-xs text-green-500">valid</span>
                )}
              </div>
              <textarea
                value={jsonText}
                onChange={(e) => handleJsonChange(e.target.value)}
                spellCheck={false}
                className={`flex-1 w-full resize-none bg-transparent text-gray-100 text-xs font-mono leading-relaxed p-4 focus:outline-none ${
                  jsonError ? 'border-l-2 border-red-500' : ''
                }`}
                placeholder='{}'
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-3 justify-end px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-xl shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg bg-white hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? 'Saving...' : schema ? 'Save Changes' : 'Create Schema'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
