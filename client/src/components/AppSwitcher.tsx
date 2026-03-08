import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronsUpDown, Check, Plus, LogOut } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { useAuthStore } from '../store/authStore';
import client from '../api/client';
import type { EmailApp } from '../types';

export function AppSwitcher() {
  const { apps, selectedApp, setApps, setSelectedApp } = useAppStore();
  const { clearAuth } = useAuthStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    client.get<EmailApp[]>('/apps').then((r) => {
      setApps(r.data);
      if (!selectedApp && r.data.length > 0) setSelectedApp(r.data[0]);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const logout = () => {
    clearAuth();
    setSelectedApp(null);
    navigate('/login');
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 w-full px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors text-left"
      >
        <div className="w-7 h-7 rounded-md bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
          {selectedApp?.app_name?.charAt(0)?.toUpperCase() ?? '?'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-gray-900 truncate">
            {selectedApp?.app_name ?? 'Select App'}
          </div>
          <div className="text-xs text-gray-400 truncate">
            {selectedApp ? 'Active' : 'No app selected'}
          </div>
        </div>
        <ChevronsUpDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
      </button>

      {open && (
        <div className="absolute bottom-full mb-1 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50">
          <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">
            Your apps
          </div>

          {apps.map((app) => (
            <button
              key={app._id}
              onClick={() => { setSelectedApp(app); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-gray-50 ${
                selectedApp?._id === app._id ? 'text-blue-700 font-medium' : 'text-gray-700'
              }`}
            >
              <div className="w-5 h-5 rounded bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold">
                {app.app_name.charAt(0).toUpperCase()}
              </div>
              {app.app_name}
              {selectedApp?._id === app._id && (
                <Check className="w-3.5 h-3.5 ml-auto text-blue-600" />
              )}
            </button>
          ))}

          <div className="border-t border-gray-100 mt-1 pt-1">
            <button
              onClick={() => { navigate('/apps'); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Manage apps
            </button>
            <button
              onClick={logout}
              className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
