import { useEffect, useState } from 'react';
import { Header } from '../components/Header';
import { usePlatformStore } from '../store/platformStore';
import type { LlmProvider } from '../types';
import { Bot, Eye, EyeOff, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

const PROVIDERS: { id: LlmProvider; label: string; needsKey: boolean; needsBase: boolean; defaultModel: string }[] = [
  { id: 'gemini',             label: 'Google Gemini',        needsKey: true,  needsBase: false, defaultModel: 'gemini-2.0-flash' },
  { id: 'openai',             label: 'OpenAI',               needsKey: true,  needsBase: false, defaultModel: 'gpt-4o' },
  { id: 'anthropic',          label: 'Anthropic (Claude)',   needsKey: true,  needsBase: false, defaultModel: 'claude-sonnet-4-6' },
  { id: 'ollama',             label: 'Ollama (local)',       needsKey: false, needsBase: true,  defaultModel: 'llama3.2' },
  { id: 'openai-compatible',  label: 'OpenAI-compatible',   needsKey: true,  needsBase: true,  defaultModel: 'gpt-4o' },
];

export function PlatformSettingsPage() {
  const { llm, isLoading, fetchPlatform, saveLlm, testLlm } = usePlatformStore();

  const [provider, setProvider]   = useState<LlmProvider>('gemini');
  const [apiKey, setApiKey]       = useState('');
  const [baseUrl, setBaseUrl]     = useState('');
  const [model, setModel]         = useState('gemini-2.0-flash');
  const [enabled, setEnabled]     = useState(false);
  const [showKey, setShowKey]     = useState(false);

  const [saving, setSaving]       = useState(false);
  const [testing, setTesting]     = useState(false);
  const [saved, setSaved]         = useState('');
  const [error, setError]         = useState('');
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => { fetchPlatform(); }, [fetchPlatform]);

  useEffect(() => {
    if (!llm) return;
    setProvider(llm.provider);
    setBaseUrl(llm.base_url);
    setModel(llm.model);
    setEnabled(llm.enabled);
  }, [llm]);

  const selectedProvider = PROVIDERS.find((p) => p.id === provider)!;

  const handleProviderChange = (p: LlmProvider) => {
    setProvider(p);
    const preset = PROVIDERS.find((x) => x.id === p)!;
    setModel(preset.defaultModel);
    if (!preset.needsBase) setBaseUrl('');
  };

  const handleSave = async () => {
    setSaving(true); setError(''); setSaved('');
    try {
      await saveLlm({ provider, api_key: apiKey, base_url: baseUrl, model, enabled });
      setApiKey(''); // clear after save — it's now stored server-side
      setSaved('Saved successfully');
      setTimeout(() => setSaved(''), 3000);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true); setTestResult(null);
    try {
      const msg = await testLlm();
      setTestResult({ ok: true, msg });
    } catch (err) {
      setTestResult({ ok: false, msg: (err as Error).message });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-auto">
      <Header title="Platform Settings" subtitle="Configure platform-wide AI and LLM integration" />

      <div className="flex-1 p-6 max-w-2xl">
        {isLoading ? (
          <div className="flex items-center gap-2 text-gray-500 text-sm"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            {/* Tab header */}
            <div className="flex border-b border-gray-100">
              <button className="flex items-center gap-2 px-5 py-3.5 text-sm font-medium border-b-2 border-blue-600 text-blue-700">
                <Bot className="w-4 h-4" />
                AI / LLM
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Master enable */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div>
                  <div className="text-sm font-semibold text-gray-900">Enable AI features platform-wide</div>
                  <div className="text-xs text-gray-500 mt-0.5">Master switch — off disables AI everywhere, regardless of app settings</div>
                </div>
                <button
                  onClick={() => setEnabled((v) => !v)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${enabled ? 'bg-blue-600' : 'bg-gray-300'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${enabled ? 'translate-x-5' : ''}`} />
                </button>
              </div>

              {/* Provider */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">LLM Provider</label>
                <select
                  value={provider}
                  onChange={(e) => handleProviderChange(e.target.value as LlmProvider)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {PROVIDERS.map((p) => (
                    <option key={p.id} value={p.id}>{p.label}</option>
                  ))}
                </select>
              </div>

              {/* Model */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Model</label>
                <input
                  type="text"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder={selectedProvider.defaultModel}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-400 mt-1">Enter the exact model name as the provider expects it.</p>
              </div>

              {/* API Key */}
              {selectedProvider.needsKey && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">API Key</label>
                  <div className="relative">
                    <input
                      type={showKey ? 'text' : 'password'}
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder={llm?.api_key_set ? '••••••••  (stored — leave blank to keep)' : 'Paste your API key'}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Stored server-side only — never exposed to the browser after saving.</p>
                </div>
              )}

              {/* Base URL */}
              {selectedProvider.needsBase && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Base URL</label>
                  <input
                    type="text"
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    placeholder={provider === 'ollama' ? 'http://localhost:11434' : 'https://api.example.com/v1'}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              )}

              {/* Test result */}
              {testResult && (
                <div className={`flex items-start gap-2 p-3 rounded-lg text-sm ${testResult.ok ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                  {testResult.ok
                    ? <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    : <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />}
                  {testResult.ok ? `Connection successful — model responded: "${testResult.msg}"` : testResult.msg}
                </div>
              )}

              {error && <p className="text-sm text-red-600">{error}</p>}
              {saved && <p className="text-sm text-green-600">{saved}</p>}

              {/* Actions */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                >
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
                <button
                  onClick={handleTest}
                  disabled={testing || !llm?.api_key_set && !apiKey}
                  className="flex items-center gap-2 border border-gray-300 hover:border-gray-400 disabled:opacity-50 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                >
                  {testing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {testing ? 'Testing…' : 'Test connection'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
