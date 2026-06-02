import { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Mail, FileText, FolderOpen, BarChart2, Settings, Users,
  Cpu, Package, Building2, UserCircle, ChevronLeft, ChevronRight,
  LayoutDashboard, ShieldCheck, CreditCard, LogOut,
} from 'lucide-react';
import { useUIStore } from '../store/uiStore';
import { useAuthStore } from '../store/authStore';
import { useOrgStore } from '../store/orgStore';
import { AppSwitcher } from './AppSwitcher';
import { ConfirmModal } from './ConfirmModal';
import type { LucideIcon } from 'lucide-react';

interface NavItem { to: string; label: string; Icon: LucideIcon }

const links: NavItem[] = [
  { to: '/dashboard',  label: 'Dashboard',      Icon: LayoutDashboard },
  { to: '/templates',  label: 'Templates',      Icon: FileText        },
  { to: '/schemas',    label: 'Payload Schemas',Icon: FolderOpen      },
  { to: '/logs',       label: 'Send Logs',      Icon: BarChart2       },
  { to: '/sdk-export', label: 'SDK Export',     Icon: Package         },
];

const accountLinks: NavItem[] = [
  { to: '/profile',  label: 'Profile',  Icon: UserCircle },
  { to: '/settings', label: 'Settings', Icon: Settings   },
];

const adminLinks: NavItem[] = [
  { to: '/admin',             label: 'Admin Dashboard',   Icon: ShieldCheck  },
  { to: '/admin/plans',       label: 'Plans',             Icon: CreditCard   },
  { to: '/users',             label: 'Users',             Icon: Users        },
  { to: '/platform-settings', label: 'Platform Settings', Icon: Cpu          },
];

function NavItem({ to, label, Icon, collapsed }: NavItem & { collapsed: boolean }) {
  return (
    <NavLink
      to={to}
      title={collapsed ? label : undefined}
      className={({ isActive }) =>
        `nav-link ${isActive ? 'nav-link-active' : ''} ${collapsed ? 'justify-center px-2' : ''}`
      }
    >
      <Icon className="w-4 h-4 shrink-0" />
      {!collapsed && <span className="truncate">{label}</span>}
    </NavLink>
  );
}

export function Sidebar() {
  const { sidebarOpen, setSidebarOpen } = useUIStore();
  const { user, clearAuth } = useAuthStore();
  const { org, fetchOrg } = useOrgStore();
  const navigate = useNavigate();
  const collapsed = !sidebarOpen;

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const logout = () => { clearAuth(); navigate('/login'); };

  useEffect(() => {
    if (user?.org_id && !org) void fetchOrg();
  }, [user?.org_id, org, fetchOrg]);

  const initials = (user?.name || user?.email || '?').charAt(0).toUpperCase();

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-30 flex flex-col
          bg-[var(--sidebar-bg)] border-r border-[var(--sidebar-border)]
          transition-all duration-200 ease-in-out shrink-0
          ${collapsed ? 'w-[60px]' : 'w-[220px]'}
          ${sidebarOpen || !collapsed ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Logo + collapse toggle */}
        <div className={`flex items-center h-14 border-b border-[var(--sidebar-border)] shrink-0
          ${collapsed ? 'justify-center px-2' : 'px-4 gap-3'}`}>
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-brand-600 flex items-center justify-center shrink-0">
              <Mail className="w-4 h-4 text-white" />
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <div className="font-bold text-[var(--text-primary)] text-sm leading-tight truncate">
                  Mail Service
                </div>
                <div className="text-[10px] text-[var(--text-muted)] truncate">Template Engine</div>
              </div>
            )}
          </div>
          {/* Desktop collapse toggle */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="hidden lg:flex p-1 rounded-lg text-[var(--text-muted)]
                       hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)]
                       transition-colors shrink-0"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* App Switcher */}
        {!collapsed && (
          <div className="px-3 py-2 border-b border-[var(--sidebar-border)]">
            <AppSwitcher />
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
          {links.map((item) => (
            <NavItem key={item.to} {...item} collapsed={collapsed} />
          ))}

          {user?.role === 'superadmin' && (
            <>
              <div className={`pt-4 pb-1 ${collapsed ? 'flex justify-center' : ''}`}>
                {!collapsed
                  ? <p className="section-label">Admin</p>
                  : <div className="w-6 border-t border-[var(--border)]" />
                }
              </div>
              {adminLinks.map((item) => (
                <NavItem key={item.to} {...item} collapsed={collapsed} />
              ))}
            </>
          )}
        </nav>

        {/* Footer — account links + user identity */}
        <div className="border-t border-[var(--sidebar-border)] px-2 pt-2 pb-3 shrink-0 space-y-0.5">
          {/* Account links */}
          {accountLinks.map((item) => (
            <NavItem key={item.to} {...item} collapsed={collapsed} />
          ))}

          {/* Org label */}
          {org && !collapsed && (
            <div className="flex items-center gap-1.5 px-2 pt-2 pb-0.5">
              {org.logo_base64 ? (
                <img src={org.logo_base64} alt={org.name} className="w-3.5 h-3.5 rounded object-cover shrink-0" />
              ) : (
                <Building2 className="w-3 h-3 text-[var(--text-muted)] shrink-0" />
              )}
              <span className="text-[10px] text-[var(--text-muted)] truncate">{org.name}</span>
            </div>
          )}

          {/* User row */}
          <div className={`flex items-center gap-2 pt-1 ${collapsed ? 'justify-center' : ''}`}>
            <NavLink
              to="/profile"
              title={collapsed ? (user?.name || user?.email) : undefined}
              className={`flex items-center gap-2 flex-1 min-w-0 p-2 rounded-xl
                         hover:bg-[var(--surface-raised)] transition-colors
                         ${collapsed ? 'justify-center flex-none' : ''}`}
            >
              {user?.profile_image_base64 ? (
                <img src={user.profile_image_base64} alt={user.name || user.email}
                  className="w-6 h-6 rounded-full object-cover shrink-0 ring-1 ring-[var(--border)]" />
              ) : (
                <div className="w-6 h-6 rounded-full bg-brand-100 dark:bg-brand-900/40
                                flex items-center justify-center text-[11px] font-bold
                                text-brand-700 dark:text-brand-300 shrink-0">
                  {initials}
                </div>
              )}
              {!collapsed && (
                <div className="min-w-0">
                  <div className="text-[11px] font-medium text-[var(--text-primary)] truncate leading-tight">
                    {user?.name || user?.email}
                  </div>
                  {user?.name && (
                    <div className="text-[10px] text-[var(--text-muted)] truncate leading-tight">{user?.email}</div>
                  )}
                </div>
              )}
            </NavLink>

            {/* Subtle logout */}
            {!collapsed && (
              <button
                onClick={() => setShowLogoutConfirm(true)}
                title="Sign out"
                className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-red-500
                           hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shrink-0"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {showLogoutConfirm && (
        <ConfirmModal
          title="Sign out"
          message="Are you sure you want to sign out?"
          confirmLabel="Sign out"
          danger
          onConfirm={logout}
          onCancel={() => setShowLogoutConfirm(false)}
        />
      )}
    </>
  );
}
