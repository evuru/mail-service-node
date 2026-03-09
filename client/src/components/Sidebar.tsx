import { NavLink } from 'react-router-dom';
import { Mail, FileText, FolderOpen, BarChart2, Settings, Users, Cpu } from 'lucide-react';
import { useUIStore } from '../store/uiStore';
import { useAuthStore } from '../store/authStore';
import { AppSwitcher } from './AppSwitcher';
import type { LucideIcon } from 'lucide-react';

const links: { to: string; label: string; Icon: LucideIcon }[] = [
  { to: '/templates', label: 'Templates', Icon: FileText },
  { to: '/schemas', label: 'Payload Schemas', Icon: FolderOpen },
  { to: '/logs', label: 'Send Logs', Icon: BarChart2 },
  { to: '/settings', label: 'Settings', Icon: Settings },
];

export function Sidebar() {
  const { sidebarOpen, setSidebarOpen } = useUIStore();
  const { user } = useAuthStore();

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-30
          flex flex-col w-60 bg-white border-r border-gray-200
          transition-transform duration-200
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
          <Mail className="w-6 h-6 text-blue-600 shrink-0" />
          <div>
            <div className="font-bold text-gray-900 text-sm leading-tight">Mail Service</div>
            <div className="text-xs text-gray-400">Template Engine</div>
          </div>
        </div>

        {/* App Switcher */}
        <div className="px-3 py-2 border-b border-gray-100">
          <AppSwitcher />
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {links.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </NavLink>
          ))}

          {user?.role === 'superadmin' && (
            <>
              <div className="pt-3 pb-1">
                <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Admin</p>
              </div>
              <NavLink
                to="/users"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`
                }
              >
                <Users className="w-4 h-4 shrink-0" />
                Users
              </NavLink>
              <NavLink
                to="/platform-settings"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`
                }
              >
                <Cpu className="w-4 h-4 shrink-0" />
                Platform Settings
              </NavLink>
            </>
          )}
        </nav>

        {/* User footer */}
        <div className="px-5 py-3 border-t border-gray-100">
          <div className="text-xs text-gray-500 truncate">{user?.email}</div>
          <div className="text-xs text-gray-400 mt-0.5">v2.0.0</div>
        </div>
      </aside>
    </>
  );
}
