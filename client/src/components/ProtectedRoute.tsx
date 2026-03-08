import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

interface Props {
  requireSuperadmin?: boolean;
}

export function ProtectedRoute({ requireSuperadmin = false }: Props) {
  const { token, user } = useAuthStore();

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (requireSuperadmin && user.role !== 'superadmin') {
    return <Navigate to="/templates" replace />;
  }

  return <Outlet />;
}
