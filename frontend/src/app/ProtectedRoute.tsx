import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

type Props = {
  role?: 'ADMIN' | 'BUYER';
  children: React.ReactNode;
};

function ProtectedRoute({ role, children }: Props) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);

  if (!accessToken) {
    return <Navigate to="/login" replace />;
  }
  if (role && user?.role !== role) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

export default ProtectedRoute;
