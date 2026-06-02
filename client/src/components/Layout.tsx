import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { VerificationBanner } from './VerificationBanner';
import { useAuthStore } from '../store/authStore';

export function Layout() {
  const { fetchMe, fetchPlatformRequirements } = useAuthStore();

  useEffect(() => {
    void fetchMe();
    void fetchPlatformRequirements();
  }, [fetchMe, fetchPlatformRequirements]);

  return (
    <div className="flex h-screen bg-[var(--bg)] overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <VerificationBanner />
        <Outlet />
      </div>
    </div>
  );
}
