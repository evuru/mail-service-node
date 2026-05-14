import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

interface Props {
  requireSuperadmin?: boolean;
}

export function ProtectedRoute({ requireSuperadmin = false }: Props) {
  const { token, user } = useAuthStore();
  const location = useLocation();

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (requireSuperadmin && user.role !== 'superadmin') {
    return <Navigate to="/templates" replace />;
  }

  // Regular users who haven't joined an org must set one up first
  // (superadmins always get auto-assigned to "Mail Service" on first register)
  const isOrgSetup = location.pathname === '/org-setup';
  if (!isOrgSetup && !user.org_id && user.role !== 'superadmin') {
    return <Navigate to="/org-setup" replace />;
  }

  return <Outlet />;
}
