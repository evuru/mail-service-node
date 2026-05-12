import { useEffect, useState, useMemo } from 'react';
import JSZip from 'jszip';
import axios from 'axios';
import {
  Download, ChevronRight, ChevronLeft, Package,
  Check, Layers, Settings2, Eye,
} from 'lucide-react';
import type { IconType } from 'react-icons';
import {
  SiTypescript, SiJavascript, SiPython, SiPhp, SiGo,
  SiRuby, SiOpenjdk, SiDotnet, SiKotlin, SiSwift,
  SiGnubash, SiHttpie, SiR, SiJson, SiC, SiCplusplus,
  SiOcaml, SiClojure,
} from 'react-icons/si';
import { TbBrandPowershell, TbBrandApple } from 'react-icons/tb';
import { useAppStore } from '../store/appStore';
import { useSchemaStore } from '../store/schemaStore';
import type { Template } from '../types';
import { generators, generatorMap } from '../generators';
import type { ExportApp, ExportTemplate, ExportConfig, GeneratedFile } from '../generators';
import { toCamel, toEnvKey } from '../generators/utils';

// ─── Language icon map ────────────────────────────────────────────────────────

const LANG_ICONS: Record<string, { Icon: IconType; color: string }> = {
  typescript:  { Icon: SiTypescript,      color: '#3178C6' },
  javascript:  { Icon: SiJavascript,      color: '#F7DF1E' },
  python:      { Icon: SiPython,          color: '#3776AB' },
  php:         { Icon: SiPhp,             color: '#777BB4' },
  go:          { Icon: SiGo,              color: '#00ADD8' },
  ruby:        { Icon: SiRuby,            color: '#CC342D' },
  java:        { Icon: SiOpenjdk,         color: '#ED8B00' },
  csharp:      { Icon: SiDotnet,          color: '#512BD4' },
  kotlin:      { Icon: SiKotlin,          color: '#7F52FF' },
  swift:       { Icon: SiSwift,           color: '#F05138' },
  shell:       { Icon: SiGnubash,         color: '#4EAA25' },
  http:        { Icon: SiHttpie,          color: '#009688' },
  powershell:  { Icon: TbBrandPowershell, color: '#012456' },
  r:           { Icon: SiR,              color: '#276DC3' },
  json:        { Icon: SiJson,            color: '#F5A623' },
  c:           { Icon: SiC,              color: '#A8B9CC' },
  cpp:         { Icon: SiCplusplus,       color: '#00599C' },
  objc:        { Icon: TbBrandApple,      color: '#555555' },
  ocaml:       { Icon: SiOcaml,           color: '#EC6813' },
  clojure:     { Icon: SiClojure,         color: '#5881D8' },
};

// ─── Data fetching ────────────────────────────────────────────────────────────

function getToken(): string {
  try {
    const raw = localStorage.getItem('auth-store');
    if (raw) {
      const p = JSON.parse(raw) as { state?: { token?: string } };
      return p.state?.token || '';
    }
  } catch { /* ignore */ }
  return '';
}

async function fetchTemplatesForApp(apiKey: string): Promise<Template[]> {
  const token = getToken();
  const { data } = await axios.get<Template[]>('/v1/templates', {
    headers: { Authorization: `Bearer ${token}`, 'X-API-KEY': apiKey },
  });
  return data;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface AppSelection {
  selected: boolean;
  envVarName: string;
  templates: Record<string, boolean>;
}

interface PageState {
  appSelections: Record<string, AppSelection>;
  serviceUrl: string;
  serviceUrlVarName: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STEPS = ['Language', 'Select', 'Customize', 'Export'];

const fullSdk = generators.filter((g) => g.category === 'full-sdk');
const reqExamples = generators.filter((g) => g.category === 'request-examples');

// ─── Component ───────────────────────────────────────────────────────────────

export default function SDKExportPage() {
  const { apps } = useAppStore();
  const { schemas, fetchSchemas } = useSchemaStore();

  const [step, setStep] = useState(0);
  const [langId, setLangId] = useState('typescript');
  const [allTemplates, setAllTemplates] = useState<Record<string, Template[]>>({});
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [state, setState] = useState<PageState>({
    appSelections: {},
    serviceUrl: '',
    serviceUrlVarName: 'MAIL_SERVICE_URL',
  });
  const [generatedFiles, setGeneratedFiles] = useState<GeneratedFile[]>([]);
  const [activeFile, setActiveFile] = useState(0);
  const [generating, setGenerating] = useState(false);

  // Load templates for all apps on mount
  useEffect(() => {
    if (!apps.length) return;
    setLoadingTemplates(true);
    Promise.all(
      apps.map(async (app) => {
        const templates = await fetchTemplatesForApp(app.api_key).catch(() => [] as Template[]);
        // Only app-specific, non-layout templates
        return [app._id, templates.filter((t) => t.app_id === app._id && !t.is_layout)] as const;
      }),
    ).then((pairs) => {
      setAllTemplates(Object.fromEntries(pairs));
      // Init selections
      setState((s) => ({
        ...s,
        appSelections: Object.fromEntries(
          apps.map((app) => [
            app._id,
            {
              selected: true,
              envVarName: `MAIL_KEY_${toEnvKey(app.app_name)}`,
              templates: Object.fromEntries(
                (pairs.find(([id]) => id === app._id)?.[1] ?? []).map((t) => [t.slug, true]),
              ),
            },
          ]),
        ),
      }));
      setLoadingTemplates(false);
    });
    fetchSchemas();
  }, [apps.length]);

  const schemaMap = useMemo(
    () => Object.fromEntries(schemas.map((s) => [s._id, s])),
    [schemas],
  );

  function buildExportConfig(): ExportConfig {
    const exportApps: ExportApp[] = [];
    for (const app of apps) {
      const sel = state.appSelections[app._id];
      if (!sel?.selected) continue;
      const templates = (allTemplates[app._id] ?? []).filter((t) => sel.templates[t.slug]);
      const exportTemplates: ExportTemplate[] = templates.map((t) => {
        const schema = t.payload_schema_id ? schemaMap[t.payload_schema_id] : null;
        return {
          camelName: toCamel(t.slug.replace(/-/g, ' ')),
          slug: t.slug,
          name: t.name,
          appKey: toCamel(app.app_name),
          schema: schema ? schema.fields : null,
        };
      });
      exportApps.push({
        key: toCamel(app.app_name),
        name: app.app_name,
        fromEmail: app.smtp_user,
        envVarName: sel.envVarName,
        apiKeyValue: app.api_key,
        templates: exportTemplates,
      });
    }
    return {
      apps: exportApps,
      serviceUrl: state.serviceUrl,
      serviceUrlVarName: state.serviceUrlVarName,
    };
  }

  function handleGenerate() {
    setGenerating(true);
    try {
      const cfg = buildExportConfig();
      const gen = generatorMap[langId];
      const files = gen.generate(cfg);
      setGeneratedFiles(files);
      setActiveFile(0);
      setStep(3);
    } finally {
      setGenerating(false);
    }
  }

  async function handleDownloadZip() {
    const zip = new JSZip();
    for (const f of generatedFiles) {
      zip.file(f.filename, f.content);
    }
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mail-sdk-${langId}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleDownloadFile(file: GeneratedFile) {
    const blob = new Blob([file.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  const selectedAppCount = Object.values(state.appSelections).filter((s) => s.selected).length;
  const selectedTemplateCount = Object.entries(state.appSelections)
    .filter(([, s]) => s.selected)
    .reduce((sum, [, s]) => sum + Object.values(s.templates).filter(Boolean).length, 0);

  function toggleApp(appId: string) {
    setState((s) => ({
      ...s,
      appSelections: {
        ...s.appSelections,
        [appId]: { ...s.appSelections[appId], selected: !s.appSelections[appId]?.selected },
      },
    }));
  }

  function toggleTemplate(appId: string, slug: string) {
    setState((s) => ({
      ...s,
      appSelections: {
        ...s.appSelections,
        [appId]: {
          ...s.appSelections[appId],
          templates: {
            ...s.appSelections[appId]?.templates,
            [slug]: !s.appSelections[appId]?.templates?.[slug],
          },
        },
      },
    }));
  }

  function toggleAllTemplates(appId: string, value: boolean) {
    setState((s) => ({
      ...s,
      appSelections: {
        ...s.appSelections,
        [appId]: {
          ...s.appSelections[appId],
          templates: Object.fromEntries(
            Object.keys(s.appSelections[appId]?.templates ?? {}).map((slug) => [slug, value]),
          ),
        },
      },
    }));
  }

  const currentLang = generatorMap[langId];

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <Package className="w-6 h-6 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">SDK Export</h1>
        </div>
        <p className="text-gray-500 text-sm">
          Generate a ready-to-use mail client in your language of choice — pre-populated with your apps, templates, and API keys.
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <button
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                i === step
                  ? 'bg-blue-600 text-white'
                  : i < step
                    ? 'bg-green-100 text-green-700 cursor-pointer hover:bg-green-200'
                    : 'bg-gray-100 text-gray-400 cursor-default'
              }`}
              onClick={() => i < step && setStep(i)}
              disabled={i > step}
            >
              {i < step ? <Check className="w-3 h-3" /> : <span>{i + 1}</span>}
              {label}
            </button>
            {i < STEPS.length - 1 && <ChevronRight className="w-4 h-4 text-gray-300" />}
          </div>
        ))}
      </div>

      {/* ── Step 0: Language ─────────────────────────────────────────────── */}
      {step === 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <Layers className="w-4 h-4" /> Full SDK
          </h2>
          <p className="text-xs text-gray-400 mb-3">Generates a config file, service class, and .env</p>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
            {fullSdk.map((g) => (
              <button
                key={g.id}
                onClick={() => setLangId(g.id)}
                className={`p-3 rounded-xl border-2 text-center transition-all ${
                  langId === g.id
                    ? 'border-blue-500 bg-blue-50 shadow-sm'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                {(() => {
                  const lang = LANG_ICONS[g.id];
                  return lang
                    ? <lang.Icon className="w-6 h-6 mx-auto mb-1.5" style={{ color: langId === g.id ? lang.color : '#9CA3AF' }} />
                    : <div className="w-6 h-6 rounded mx-auto mb-1.5" style={{ backgroundColor: g.color }} />;
                })()}
                <div className="text-xs font-medium text-gray-800">{g.name}</div>
              </button>
            ))}
          </div>

          <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <Layers className="w-4 h-4" /> Request Examples
          </h2>
          <p className="text-xs text-gray-400 mb-3">Generates example HTTP requests + .env (no service class)</p>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-8">
            {reqExamples.map((g) => (
              <button
                key={g.id}
                onClick={() => setLangId(g.id)}
                className={`p-3 rounded-xl border-2 text-center transition-all ${
                  langId === g.id
                    ? 'border-blue-500 bg-blue-50 shadow-sm'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                {(() => {
                  const lang = LANG_ICONS[g.id];
                  return lang
                    ? <lang.Icon className="w-6 h-6 mx-auto mb-1.5" style={{ color: langId === g.id ? lang.color : '#9CA3AF' }} />
                    : <div className="w-6 h-6 rounded mx-auto mb-1.5" style={{ backgroundColor: g.color }} />;
                })()}
                <div className="text-xs font-medium text-gray-800">{g.name}</div>
              </button>
            ))}
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => setStep(1)}
              className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              Next: Select Apps & Templates <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Step 1: Select ───────────────────────────────────────────────── */}
      {step === 1 && (
        <div>
          {loadingTemplates ? (
            <div className="text-gray-500 text-sm py-10 text-center">Loading templates…</div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-600">
                  {selectedAppCount} app{selectedAppCount !== 1 ? 's' : ''} ·{' '}
                  {selectedTemplateCount} template{selectedTemplateCount !== 1 ? 's' : ''} selected
                </p>
              </div>

              <div className="space-y-4">
                {apps.map((app) => {
                  const sel = state.appSelections[app._id];
                  const appTemplates = allTemplates[app._id] ?? [];
                  const allSelected = appTemplates.every((t) => sel?.templates[t.slug]);
                  const noneSelected = appTemplates.every((t) => !sel?.templates[t.slug]);

                  return (
                    <div key={app._id} className="border border-gray-200 rounded-xl overflow-hidden">
                      {/* App header */}
                      <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border-b border-gray-200">
                        <input
                          type="checkbox"
                          checked={sel?.selected ?? false}
                          onChange={() => toggleApp(app._id)}
                          className="rounded border-gray-300 text-blue-600"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm text-gray-900">{app.app_name}</div>
                          <div className="text-xs text-gray-400">{app.smtp_user}</div>
                        </div>
                        {sel?.selected && appTemplates.length > 1 && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => toggleAllTemplates(app._id, true)}
                              className="text-xs text-blue-600 hover:underline"
                              disabled={allSelected}
                            >
                              All
                            </button>
                            <span className="text-gray-300">·</span>
                            <button
                              onClick={() => toggleAllTemplates(app._id, false)}
                              className="text-xs text-gray-500 hover:underline"
                              disabled={noneSelected}
                            >
                              None
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Templates */}
                      {sel?.selected && (
                        <div className="divide-y divide-gray-100">
                          {appTemplates.length === 0 ? (
                            <p className="px-4 py-3 text-xs text-gray-400">No templates for this app.</p>
                          ) : (
                            appTemplates.map((t) => (
                              <label
                                key={t.slug}
                                className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  checked={sel?.templates[t.slug] ?? false}
                                  onChange={() => toggleTemplate(app._id, t.slug)}
                                  className="rounded border-gray-300 text-blue-600"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm text-gray-800">{t.name}</div>
                                  <div className="text-xs text-gray-400 font-mono">{t.slug}</div>
                                </div>
                                {t.payload_schema_id && (
                                  <span className="text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full">
                                    typed
                                  </span>
                                )}
                              </label>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-between mt-6">
                <button
                  onClick={() => setStep(0)}
                  className="flex items-center gap-2 px-4 py-2 text-gray-600 border border-gray-200 rounded-lg text-sm hover:bg-gray-50"
                >
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
                <button
                  onClick={() => setStep(2)}
                  disabled={selectedTemplateCount === 0}
                  className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-40"
                >
                  Next: Customize <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Step 2: Customize ────────────────────────────────────────────── */}
      {step === 2 && (
        <div>
          <div className="space-y-6">
            {/* Service URL */}
            <div className="border border-gray-200 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <Settings2 className="w-4 h-4" /> Service Configuration
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Service URL</label>
                  <input
                    type="text"
                    value={state.serviceUrl}
                    onChange={(e) => setState((s) => ({ ...s, serviceUrl: e.target.value }))}
                    placeholder="https://mail.yourdomain.com"
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Env var name</label>
                  <input
                    type="text"
                    value={state.serviceUrlVarName}
                    onChange={(e) => setState((s) => ({ ...s, serviceUrlVarName: e.target.value }))}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Per-app env var names */}
            <div className="border border-gray-200 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-gray-800 mb-1">API Key Variable Names</h3>
              <p className="text-xs text-gray-400 mb-3">Rename the env var for each app's API key.</p>
              <div className="space-y-3">
                {apps
                  .filter((app) => state.appSelections[app._id]?.selected)
                  .map((app) => (
                    <div key={app._id} className="flex items-center gap-3">
                      <div className="w-32 text-sm text-gray-700 font-medium truncate">{app.app_name}</div>
                      <input
                        type="text"
                        value={state.appSelections[app._id]?.envVarName ?? ''}
                        onChange={(e) =>
                          setState((s) => ({
                            ...s,
                            appSelections: {
                              ...s.appSelections,
                              [app._id]: { ...s.appSelections[app._id], envVarName: e.target.value },
                            },
                          }))
                        }
                        className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  ))}
              </div>
            </div>

            {/* Summary */}
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-800">
              <p className="font-medium mb-1">Export summary</p>
              <ul className="text-xs space-y-0.5 text-blue-700">
                <li>Language: <strong>{currentLang?.name}</strong></li>
                <li>Apps: <strong>{selectedAppCount}</strong></li>
                <li>Templates: <strong>{selectedTemplateCount}</strong></li>
                <li>Files: <strong>{currentLang?.generate(buildExportConfig()).map((f) => f.filename).join(', ')}</strong></li>
              </ul>
            </div>
          </div>

          <div className="flex justify-between mt-6">
            <button
              onClick={() => setStep(1)}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 border border-gray-200 rounded-lg text-sm hover:bg-gray-50"
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-40"
            >
              <Eye className="w-4 h-4" /> Generate & Preview
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: Preview & Download ───────────────────────────────────── */}
      {step === 3 && (
        <div>
          {/* File tabs */}
          <div className="flex gap-1 mb-3 flex-wrap">
            {generatedFiles.map((f, i) => (
              <button
                key={f.filename}
                onClick={() => setActiveFile(i)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors ${
                  i === activeFile
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {f.filename}
              </button>
            ))}
          </div>

          {/* Code preview */}
          {generatedFiles[activeFile] && (
            <div className="relative rounded-xl border border-gray-200 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-700">
                <span className="text-xs text-gray-400 font-mono">{generatedFiles[activeFile].filename}</span>
                <button
                  onClick={() => handleDownloadFile(generatedFiles[activeFile])}
                  className="text-xs text-gray-400 hover:text-white flex items-center gap-1"
                >
                  <Download className="w-3 h-3" /> Download
                </button>
              </div>
              <pre className="bg-gray-950 text-gray-100 text-xs font-mono p-4 overflow-auto max-h-[480px] leading-relaxed whitespace-pre">
                {generatedFiles[activeFile].content}
              </pre>
            </div>
          )}

          <div className="flex justify-between mt-5">
            <button
              onClick={() => setStep(2)}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 border border-gray-200 rounded-lg text-sm hover:bg-gray-50"
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
            <button
              onClick={handleDownloadZip}
              className="flex items-center gap-2 px-5 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
            >
              <Download className="w-4 h-4" /> Download ZIP ({generatedFiles.length} files)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
