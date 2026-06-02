import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronsUpDown, Check, Plus, Search, X, ToggleLeft, ToggleRight, ChevronRight } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { useUIStore } from '../store/uiStore';
import client from '../api/client';
import type { EmailApp } from '../types';

export function AppSwitcher() {
  const { apps, selectedApp, setApps, setSelectedApp } = useAppStore();
  const { sidebarOpen } = useUIStore();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [autoClose, setAutoClose] = useState(() =>
    localStorage.getItem('appSwitcherAutoClose') !== 'false'
  );
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    client.get<EmailApp[]>('/apps').then((r) => {
      setApps(r.data);
      if (!selectedApp && r.data.length > 0) setSelectedApp(r.data[0]);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    const onMouse = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!panelRef.current?.contains(t) && !triggerRef.current?.contains(t)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onMouse);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onMouse);
    };
  }, [open]);

  const toggleAutoClose = () => {
    setAutoClose(v => {
      const next = !v;
      localStorage.setItem('appSwitcherAutoClose', String(next));
      return next;
    });
  };

  const handleSelect = (app: EmailApp) => {
    setSelectedApp(app);
    if (autoClose) setOpen(false);
  };

  const filteredApps = apps.filter(a =>
    a.app_name.toLowerCase().includes(search.toLowerCase())
  );

  const sidebarWidth = sidebarOpen ? 220 : 60;

  return (
    <>
      {/* Trigger */}
      <button
        ref={triggerRef}
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 w-full px-3 py-2 rounded-lg hover:bg-[var(--nav-hover-bg)] transition-colors text-left"
      >
        <div className="w-7 h-7 rounded-lg bg-brand-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
          {selectedApp?.app_name?.charAt(0)?.toUpperCase() ?? '?'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-[var(--text-primary)] truncate">
            {selectedApp?.app_name ?? 'Select App'}
          </div>
          <div className="text-xs text-[var(--text-muted)] truncate">
            {selectedApp ? 'Active' : 'No app selected'}
          </div>
        </div>
        <ChevronsUpDown className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
      </button>

      {/* Slide-out panel — only mounted when open so it never overlays the sidebar when closed */}
      {open && (
      <div
        ref={panelRef}
        style={{ left: sidebarWidth }}
        className="fixed top-0 bottom-0 z-40 w-72 bg-[var(--surface)] border-r border-[var(--border)] shadow-2xl flex flex-col animate-slide-in-left"
      >
        {/* Header */}
        <div className="flex items-center h-14 px-4 border-b border-[var(--border)] shrink-0 gap-3">
          <span className="text-sm font-semibold text-[var(--text-primary)] flex-1">Switch App</span>
          <button
            onClick={toggleAutoClose}
            title={autoClose ? 'Auto-close: on — click to keep panel open' : 'Auto-close: off — click to enable'}
            className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            {autoClose
              ? <ToggleRight className="w-4 h-4 text-brand-600" />
              : <ToggleLeft className="w-4 h-4" />
            }
            <span>Auto-close</span>
          </button>
          <button
            onClick={() => setOpen(false)}
            className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-raised)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="px-3 py-3 border-b border-[var(--border)] shrink-0">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)] pointer-events-none" />
            <input
              type="text"
              placeholder="Search apps…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-sm bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-brand-500/30"
            />
          </div>
        </div>

        {/* App list */}
        <div className="flex-1 overflow-y-auto py-1.5">
          {filteredApps.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-[var(--text-muted)]">No apps found</p>
          ) : filteredApps.map(app => {
            const active = selectedApp?._id === app._id;
            return (
              <button
                key={app._id}
                onClick={() => handleSelect(app)}
                className={`w-full text-left px-4 py-2.5 flex items-center gap-3 transition-colors ${
                  active
                    ? 'bg-brand-50 dark:bg-brand-900/20'
                    : 'hover:bg-[var(--nav-hover-bg)]'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 ${
                  active ? 'bg-brand-600 text-white' : 'bg-[var(--surface-raised)] text-[var(--text-muted)]'
                }`}>
                  {app.app_name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-medium truncate ${
                    active ? 'text-brand-700 dark:text-brand-300' : 'text-[var(--text-secondary)]'
                  }`}>
                    {app.app_name}
                  </div>
                  {active && <div className="text-xs text-brand-500 dark:text-brand-400">Active</div>}
                </div>
                {active && <Check className="w-4 h-4 text-brand-600 dark:text-brand-400 shrink-0" />}
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="border-t border-[var(--border)] p-3 shrink-0">
          <button
            onClick={() => { navigate('/apps'); setOpen(false); }}
            className="w-full text-left px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--nav-hover-bg)] flex items-center gap-2 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Manage apps</span>
            <ChevronRight className="w-3.5 h-3.5 ml-auto" />
          </button>
        </div>
      </div>
      )}
    </>
  );
}
