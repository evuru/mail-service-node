import { useEffect, useState } from 'react';
import { Plus, FolderOpen, Check } from 'lucide-react';
import { useSchemaStore } from '../store/schemaStore';
import { Header } from '../components/Header';
import { Badge } from '../components/Badge';
import { SchemaEditorModal } from '../components/SchemaEditorModal';
import { ConfirmModal } from '../components/ConfirmModal';
import type { PayloadSchema, SchemaField } from '../types';

const TYPE_COLORS: Record<string, string> = {
  string: 'bg-blue-50 text-blue-700',
  number: 'bg-purple-50 text-purple-700',
  boolean: 'bg-yellow-50 text-yellow-700',
  array: 'bg-orange-50 text-orange-700',
  object: 'bg-green-50 text-green-700',
};

function FieldPill({ field }: { field: SchemaField }) {
  return (
    <span
      title={field.description || field.key}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-mono font-medium ${TYPE_COLORS[field.type] ?? 'bg-gray-100 text-gray-600'}`}
    >
      {field.required && <span className="text-red-500 font-bold leading-none" title="required">*</span>}
      {`{{${field.key}}}`}
    </span>
  );
}

export function SchemasPage() {
  const { schemas, isLoading, error, fetchSchemas, createSchema, updateSchema, deleteSchema } = useSchemaStore();
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<PayloadSchema | null>(null);
  const [deleting, setDeleting] = useState<PayloadSchema | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => { fetchSchemas(); }, [fetchSchemas]);

  const handleDelete = async () => {
    if (!deleting) return;
    setIsDeleting(true);
    try {
      await deleteSchema(deleting._id);
      setDeleting(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const actions = (
    <button
      onClick={() => setShowCreate(true)}
      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
    >
      <Plus className="w-4 h-4" />
      New Schema
    </button>
  );

  return (
    <>
      <Header actions={actions} />
      <main className="flex-1 overflow-y-auto p-6">
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{error}</div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center h-48 text-gray-400 text-sm">Loading schemas...</div>
        ) : schemas.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400">
            <FolderOpen className="w-10 h-10 mb-3" />
            <p className="text-sm">No schemas yet. Create one to define what variables your templates expect.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {schemas.map((schema) => (
              <div key={schema._id} className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Header row */}
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-semibold text-gray-900">{schema.name}</h3>
                      {schema.template_count !== undefined && schema.template_count > 0 && (
                        <Badge variant="info">
                          {schema.template_count} template{schema.template_count !== 1 ? 's' : ''}
                        </Badge>
                      )}
                    </div>
                    {schema.description && (
                      <p className="text-sm text-gray-500 mb-3">{schema.description}</p>
                    )}

                    {/* Fields */}
                    <div className="flex flex-wrap gap-1.5">
                      {schema.fields.map((f) => (
                        <FieldPill key={f.key} field={f} />
                      ))}
                      {schema.fields.length === 0 && (
                        <span className="text-xs text-gray-400 italic">No fields defined</span>
                      )}
                    </div>

                    {/* Field detail table (collapsed by default, shown on hover) */}
                    {schema.fields.length > 0 && (
                      <details className="mt-3">
                        <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600 select-none">
                          Show field details
                        </summary>
                        <div className="mt-2 overflow-x-auto">
                          <table className="w-full text-xs border-collapse">
                            <thead>
                              <tr className="border-b border-gray-100">
                                <th className="text-left py-1.5 px-2 text-gray-500 font-medium">Key</th>
                                <th className="text-left py-1.5 px-2 text-gray-500 font-medium">Type</th>
                                <th className="text-left py-1.5 px-2 text-gray-500 font-medium">Req.</th>
                                <th className="text-left py-1.5 px-2 text-gray-500 font-medium">Example</th>
                                <th className="text-left py-1.5 px-2 text-gray-500 font-medium">Description</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                              {schema.fields.map((f) => (
                                <tr key={f.key}>
                                  <td className="py-1.5 px-2 font-mono text-gray-800">{`{{${f.key}}}`}</td>
                                  <td className="py-1.5 px-2">
                                    <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${TYPE_COLORS[f.type] ?? ''}`}>
                                      {f.type}
                                    </span>
                                  </td>
                                  <td className="py-1.5 px-2 text-center">
                                    {f.required ? <Check className="w-3.5 h-3.5 mx-auto text-green-600" /> : null}
                                  </td>
                                  <td className="py-1.5 px-2 text-gray-600 max-w-[120px] truncate font-mono">{f.example}</td>
                                  <td className="py-1.5 px-2 text-gray-500">{f.description}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </details>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => setEditing(schema)}
                      className="px-3 py-1.5 text-xs font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleting(schema)}
                      className="px-3 py-1.5 text-xs font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
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
          schema={editing}
          onClose={() => setEditing(null)}
          onSave={async (data) => { await updateSchema(editing._id, data); }}
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
    </>
  );
}
