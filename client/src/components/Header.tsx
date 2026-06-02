import { useLocation } from 'react-router-dom';
import { Menu, Sun, Moon, Monitor } from 'lucide-react';
import { useUIStore } from '../store/uiStore';

const titles: Record<string, string> = {
  '/templates':         'Templates',
  '/schemas':           'Payload Schemas',
  '/logs':              'Send Logs',
  '/settings':          'Settings',
  '/apps':              'Email Apps',
  '/users':             'Users',
  '/profile':           'Profile',
  '/sdk-export':        'SDK Export',
  '/platform-settings': 'Platform Settings',
};

function getTitle(pathname: string): string {
  if (pathname.startsWith('/templates/new'))  return 'New Template';
  if (pathname.startsWith('/templates/') && pathname.length > '/templates/'.length) return 'Edit Template';
  if (pathname.includes('/settings') && pathname.startsWith('/apps/')) return 'App Settings';
  return titles[pathname] || 'Mail Service';
}

const themeIcons = {
  light:  { Icon: Sun,     next: 'dark'   as const, title: 'Switch to dark mode'   },
  dark:   { Icon: Moon,    next: 'system' as const, title: 'Switch to system mode' },
  system: { Icon: Monitor, next: 'light'  as const, title: 'Switch to light mode'  },
};

interface HeaderProps { actions?: React.ReactNode }

export function Header({ actions }: HeaderProps) {
  const { pathname } = useLocation();
  const { setSidebarOpen, sidebarOpen, theme, setTheme } = useUIStore();
  const { Icon, next, title } = themeIcons[theme];

  return (
    <header className="page-header">
      <div className="flex items-center gap-3">
        {/* Mobile hamburger */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="btn-ghost p-2 lg:hidden"
          aria-label="Toggle sidebar"
        >
          <Menu className="w-4 h-4" />
        </button>
        <h1 className="text-sm font-semibold text-[var(--text-primary)]">
          {getTitle(pathname)}
        </h1>
      </div>

      <div className="flex items-center gap-2">
        {actions}
        {/* Theme toggle */}
        <button
          onClick={() => setTheme(next)}
          title={title}
          className="btn-ghost p-2 rounded-xl"
          aria-label={title}
        >
          <Icon className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
