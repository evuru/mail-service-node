import Editor from '@monaco-editor/react';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: string;
  readOnly?: boolean;
}

export function CodeEditor({ value, onChange, language = 'html', readOnly = false }: CodeEditorProps) {
  return (
    <div className="h-full w-full overflow-visible rounded-lg border border-gray-200">
      <Editor
        height="100%"
        language={language}
        value={value}
        onChange={(v) => onChange(v ?? '')}
        theme="vs-dark"
        options={{
          minimap: { enabled: false },
          fontSize: 13,
          lineHeight: 20,
          wordWrap: 'on',
          formatOnPaste: true,
          scrollBeyondLastLine: false,
          padding: { top: 12, bottom: 12 },
          readOnly,
          fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
          renderLineHighlight: 'gutter',
        }}
        loading={
          <div className="h-full flex items-center justify-center bg-[#1e1e1e] text-gray-500 text-sm">
            Loading editor...
          </div>
        }
      />
    </div>
  );
}
