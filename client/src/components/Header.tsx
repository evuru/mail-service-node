import { useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { useUIStore } from '../store/uiStore';

const titles: Record<string, string> = {
  '/templates': 'Templates',
  '/schemas': 'Payload Schemas',
  '/logs': 'Send Logs',
  '/settings': 'Settings',
  '/apps': 'Email Apps',
  '/users': 'Users',
};

function getTitle(pathname: string): string {
  if (pathname.startsWith('/templates/new')) return 'New Template';
  if (pathname.startsWith('/templates/') && pathname.length > '/templates/'.length) return 'Edit Template';
  if (pathname.includes('/settings') && pathname.startsWith('/apps/')) return 'App Settings';
  return titles[pathname] || 'Mail Service';
}

interface HeaderProps {
  actions?: React.ReactNode;
}

export function Header({ actions }: HeaderProps) {
  const { pathname } = useLocation();
  const { setSidebarOpen, sidebarOpen } = useUIStore();

  return (
    <header className="flex items-center justify-between h-14 px-5 bg-white border-b border-gray-200 shrink-0">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 lg:hidden"
          aria-label="Toggle sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="text-base font-semibold text-gray-900">{getTitle(pathname)}</h1>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  );
}
