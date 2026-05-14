import { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { Mail, FileText, FolderOpen, BarChart2, Settings, Users, Cpu, Package, Building2 } from 'lucide-react';
import { useUIStore } from '../store/uiStore';
import { useAuthStore } from '../store/authStore';
import { useOrgStore } from '../store/orgStore';
import { AppSwitcher } from './AppSwitcher';
import type { LucideIcon } from 'lucide-react';

const links: { to: string; label: string; Icon: LucideIcon }[] = [
  { to: '/templates', label: 'Templates', Icon: FileText },
  { to: '/schemas', label: 'Payload Schemas', Icon: FolderOpen },
  { to: '/logs', label: 'Send Logs', Icon: BarChart2 },
  { to: '/settings', label: 'Settings', Icon: Settings },
  { to: '/sdk-export', label: 'SDK Export', Icon: Package },
];

export function Sidebar() {
  const { sidebarOpen, setSidebarOpen } = useUIStore();
  const { user } = useAuthStore();
  const { org, fetchOrg } = useOrgStore();

  useEffect(() => {
    if (user?.org_id && !org) void fetchOrg();
  }, [user?.org_id, org, fetchOrg]);

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

        {/* User + org footer */}
        <div className="px-4 py-3 border-t border-gray-100">
          {/* Org row */}
          {org && (
            <div className="flex items-center gap-2 mb-2">
              {org.logo_base64 ? (
                <img src={org.logo_base64} alt={org.name} className="w-5 h-5 rounded object-cover flex-shrink-0" />
              ) : (
                <Building2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
              )}
              <span className="text-xs text-gray-600 truncate font-medium">{org.name}</span>
            </div>
          )}
          {/* User row */}
          <div className="flex items-center gap-2">
            {user?.profile_image_base64 ? (
              <img src={user.profile_image_base64} alt={user.name || user.email} className="w-6 h-6 rounded-full object-cover flex-shrink-0" />
            ) : (
              <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-600 flex-shrink-0">
                {(user?.name || user?.email || '?').charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <div className="text-xs text-gray-700 truncate font-medium">{user?.name || user?.email}</div>
              {user?.name && <div className="text-xs text-gray-400 truncate">{user.email}</div>}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
