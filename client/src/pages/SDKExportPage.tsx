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

  useEffect(() => {
    if (!apps.length) return;
    setLoadingTemplates(true);
    Promise.all(
      apps.map(async (app) => {
        const templates = await fetchTemplatesForApp(app.api_key).catch(() => [] as Template[]);
        return [app._id, templates.filter((t) => t.app_id === app._id && !t.is_layout)] as const;
      }),
    ).then((pairs) => {
      setAllTemplates(Object.fromEntries(pairs));
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
          <Package className="w-6 h-6 text-brand-600 dark:text-brand-400" />
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">SDK Export</h1>
        </div>
        <p className="text-[var(--text-muted)] text-sm">
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
                  ? 'bg-brand-600 text-white'
                  : i < step
                    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 cursor-pointer hover:bg-emerald-200 dark:hover:bg-emerald-900/40'
                    : 'bg-[var(--surface-raised)] text-[var(--text-muted)] cursor-default'
              }`}
              onClick={() => i < step && setStep(i)}
              disabled={i > step}
            >
              {i < step ? <Check className="w-3 h-3" /> : <span>{i + 1}</span>}
              {label}
            </button>
            {i < STEPS.length - 1 && <ChevronRight className="w-4 h-4 text-[var(--border)]" />}
          </div>
        ))}
      </div>

      {/* ── Step 0: Language ─────────────────────────────────────────────── */}
      {step === 0 && (
        <div>
          <h2 className="text-sm font-semibold text-[var(--text-secondary)] mb-3 flex items-center gap-2">
            <Layers className="w-4 h-4" /> Full SDK
          </h2>
          <p className="text-xs text-[var(--text-muted)] mb-3">Generates a config file, service class, and .env</p>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
            {fullSdk.map((g) => (
              <button
                key={g.id}
                onClick={() => setLangId(g.id)}
                className={`p-3 rounded-xl border-2 text-center transition-all ${
                  langId === g.id
                    ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 shadow-sm'
                    : 'border-[var(--border)] hover:border-brand-300 hover:bg-[var(--surface-raised)]'
                }`}
              >
                {(() => {
                  const lang = LANG_ICONS[g.id];
                  return lang
                    ? <lang.Icon className="w-6 h-6 mx-auto mb-1.5" style={{ color: langId === g.id ? lang.color : '#9CA3AF' }} />
                    : <div className="w-6 h-6 rounded mx-auto mb-1.5" style={{ backgroundColor: g.color }} />;
                })()}
                <div className="text-xs font-medium text-[var(--text-primary)]">{g.name}</div>
              </button>
            ))}
          </div>

          <h2 className="text-sm font-semibold text-[var(--text-secondary)] mb-3 flex items-center gap-2">
            <Layers className="w-4 h-4" /> Request Examples
          </h2>
          <p className="text-xs text-[var(--text-muted)] mb-3">Generates example HTTP requests + .env (no service class)</p>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-8">
            {reqExamples.map((g) => (
              <button
                key={g.id}
                onClick={() => setLangId(g.id)}
                className={`p-3 rounded-xl border-2 text-center transition-all ${
                  langId === g.id
                    ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 shadow-sm'
                    : 'border-[var(--border)] hover:border-brand-300 hover:bg-[var(--surface-raised)]'
                }`}
              >
                {(() => {
                  const lang = LANG_ICONS[g.id];
                  return lang
                    ? <lang.Icon className="w-6 h-6 mx-auto mb-1.5" style={{ color: langId === g.id ? lang.color : '#9CA3AF' }} />
                    : <div className="w-6 h-6 rounded mx-auto mb-1.5" style={{ backgroundColor: g.color }} />;
                })()}
                <div className="text-xs font-medium text-[var(--text-primary)]">{g.name}</div>
              </button>
            ))}
          </div>

          <div className="flex justify-end">
            <button onClick={() => setStep(1)} className="btn-primary">
              Next: Select Apps & Templates <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Step 1: Select ───────────────────────────────────────────────── */}
      {step === 1 && (
        <div className="flex flex-col" style={{ minHeight: 0 }}>
          {loadingTemplates ? (
            <div className="flex flex-col items-center justify-center py-20 text-[var(--text-muted)]">
              <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mb-3" />
              <span className="text-sm">Loading templates…</span>
            </div>
          ) : (
            <>
              {/* Toolbar */}
              <div className="flex items-center justify-between mb-3 pb-3 border-b border-[var(--border)]">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-[var(--text-secondary)]">
                    {selectedAppCount} app{selectedAppCount !== 1 ? 's' : ''}
                  </span>
                  <span className="text-[var(--border)]">·</span>
                  <span className="text-sm text-[var(--text-muted)]">
                    {selectedTemplateCount} template{selectedTemplateCount !== 1 ? 's' : ''} selected
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => apps.forEach((a) => { if (!state.appSelections[a._id]?.selected) toggleApp(a._id); (allTemplates[a._id] ?? []).forEach((t) => { if (!state.appSelections[a._id]?.templates[t.slug]) toggleTemplate(a._id, t.slug); }); })}
                    className="text-xs text-brand-600 dark:text-brand-400 hover:text-brand-800 dark:hover:text-brand-300 font-medium px-2 py-1 rounded hover:bg-brand-50 dark:hover:bg-brand-900/20"
                  >
                    Select all
                  </button>
                  <button
                    onClick={() => apps.forEach((a) => { if (state.appSelections[a._id]?.selected) toggleApp(a._id); })}
                    className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] font-medium px-2 py-1 rounded hover:bg-[var(--surface-raised)]"
                  >
                    Clear all
                  </button>
                </div>
              </div>

              {/* Scrollable list */}
              <div className="overflow-y-auto space-y-3 pr-1" style={{ maxHeight: 'calc(100vh - 380px)', minHeight: '200px' }}>
                {apps.map((app) => {
                  const sel = state.appSelections[app._id];
                  const appTemplates = allTemplates[app._id] ?? [];
                  const selectedCount = appTemplates.filter((t) => sel?.templates[t.slug]).length;
                  const allSelected = appTemplates.length > 0 && selectedCount === appTemplates.length;
                  const noneSelected = selectedCount === 0;

                  return (
                    <div
                      key={app._id}
                      className={`border rounded-xl overflow-hidden transition-colors ${
                        sel?.selected
                          ? 'border-brand-200 dark:border-brand-800 bg-[var(--surface)]'
                          : 'border-[var(--border)] bg-[var(--surface-raised)] opacity-60'
                      }`}
                    >
                      {/* App header */}
                      <div
                        className={`flex items-center gap-3 px-4 py-3 cursor-pointer select-none ${
                          sel?.selected ? 'bg-brand-50/50 dark:bg-brand-900/10' : 'bg-[var(--surface-raised)]'
                        }`}
                        onClick={() => toggleApp(app._id)}
                      >
                        <input
                          type="checkbox"
                          checked={sel?.selected ?? false}
                          onChange={() => toggleApp(app._id)}
                          onClick={(e) => e.stopPropagation()}
                          className="rounded accent-brand-600 pointer-events-none"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm text-[var(--text-primary)] leading-tight">{app.app_name}</div>
                          <div className="text-xs text-[var(--text-muted)] mt-0.5">{app.smtp_user}</div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {sel?.selected && (
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              selectedCount > 0
                                ? 'bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400'
                                : 'bg-[var(--surface-raised)] text-[var(--text-muted)]'
                            }`}>
                              {selectedCount}/{appTemplates.length}
                            </span>
                          )}
                          {sel?.selected && appTemplates.length > 1 && (
                            <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => toggleAllTemplates(app._id, true)}
                                disabled={allSelected}
                                className="text-xs text-brand-600 dark:text-brand-400 hover:text-brand-800 disabled:opacity-30 px-1.5 py-0.5 rounded hover:bg-brand-50 dark:hover:bg-brand-900/20"
                              >
                                All
                              </button>
                              <button
                                onClick={() => toggleAllTemplates(app._id, false)}
                                disabled={noneSelected}
                                className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] disabled:opacity-30 px-1.5 py-0.5 rounded hover:bg-[var(--surface-raised)]"
                              >
                                None
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Templates grid */}
                      {sel?.selected && (
                        <div className={`${appTemplates.length === 0 ? 'px-4 py-3' : 'p-2 grid grid-cols-1 sm:grid-cols-2 gap-1'}`}>
                          {appTemplates.length === 0 ? (
                            <p className="text-xs text-[var(--text-muted)]">No templates for this app.</p>
                          ) : (
                            appTemplates.map((t) => (
                              <label
                                key={t.slug}
                                className={`flex items-start gap-2.5 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                                  sel?.templates[t.slug]
                                    ? 'bg-brand-50 dark:bg-brand-900/20 hover:bg-brand-100/70 dark:hover:bg-brand-900/30'
                                    : 'hover:bg-[var(--surface-raised)]'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={sel?.templates[t.slug] ?? false}
                                  onChange={() => toggleTemplate(app._id, t.slug)}
                                  className="rounded accent-brand-600 mt-0.5 shrink-0"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm text-[var(--text-primary)] font-medium leading-tight">{t.name}</div>
                                  <div className="text-xs text-[var(--text-muted)] font-mono truncate mt-0.5">{t.slug}</div>
                                </div>
                                {t.payload_schema_id && (
                                  <span className="text-xs bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 px-1.5 py-0.5 rounded font-medium shrink-0 mt-0.5">
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

              {/* Nav — outside scroll area */}
              <div className="flex justify-between mt-5 pt-4 border-t border-[var(--border)]">
                <button onClick={() => setStep(0)} className="btn-secondary">
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
                <button
                  onClick={() => setStep(2)}
                  disabled={selectedTemplateCount === 0}
                  className="btn-primary disabled:opacity-40"
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
            <div className="card p-4">
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                <Settings2 className="w-4 h-4" /> Service Configuration
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="input-label">Service URL</label>
                  <input
                    type="text"
                    value={state.serviceUrl}
                    onChange={(e) => setState((s) => ({ ...s, serviceUrl: e.target.value }))}
                    placeholder="https://mail.yourdomain.com"
                    className="input"
                  />
                </div>
                <div>
                  <label className="input-label">Env var name</label>
                  <input
                    type="text"
                    value={state.serviceUrlVarName}
                    onChange={(e) => setState((s) => ({ ...s, serviceUrlVarName: e.target.value }))}
                    className="input font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Per-app env var names */}
            <div className="card p-4">
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">API Key Variable Names</h3>
              <p className="text-xs text-[var(--text-muted)] mb-3">Rename the env var for each app's API key.</p>
              <div className="space-y-3">
                {apps
                  .filter((app) => state.appSelections[app._id]?.selected)
                  .map((app) => (
                    <div key={app._id} className="flex items-center gap-3">
                      <div className="w-32 text-sm text-[var(--text-secondary)] font-medium truncate">{app.app_name}</div>
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
                        className="input flex-1 font-mono"
                      />
                    </div>
                  ))}
              </div>
            </div>

            {/* Summary */}
            <div className="bg-brand-50 dark:bg-brand-900/20 border border-brand-100 dark:border-brand-800 rounded-xl p-4 text-sm text-brand-800 dark:text-brand-300">
              <p className="font-medium mb-1">Export summary</p>
              <ul className="text-xs space-y-0.5 text-brand-700 dark:text-brand-400">
                <li>Language: <strong>{currentLang?.name}</strong></li>
                <li>Apps: <strong>{selectedAppCount}</strong></li>
                <li>Templates: <strong>{selectedTemplateCount}</strong></li>
                <li>Files: <strong>{currentLang?.generate(buildExportConfig()).map((f) => f.filename).join(', ')}</strong></li>
              </ul>
            </div>
          </div>

          <div className="flex justify-between mt-6">
            <button onClick={() => setStep(1)} className="btn-secondary">
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="btn-primary disabled:opacity-40"
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
                    : 'bg-[var(--surface-raised)] text-[var(--text-secondary)] hover:bg-[var(--surface-raised)]'
                }`}
              >
                {f.filename}
              </button>
            ))}
          </div>

          {/* Code preview */}
          {generatedFiles[activeFile] && (
            <div className="relative rounded-xl border border-[var(--border)] overflow-hidden">
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
            <button onClick={() => setStep(2)} className="btn-secondary">
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
            <button
              onClick={handleDownloadZip}
              className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium transition-colors"
            >
              <Download className="w-4 h-4" /> Download ZIP ({generatedFiles.length} files)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
