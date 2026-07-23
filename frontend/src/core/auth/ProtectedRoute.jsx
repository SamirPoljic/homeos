import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

export function ProtectedRoute({ children }) {
  const { session, loading } = useAuth();

  if (loading) return <div>Učitavanje...</div>;
  if (!session) return <Navigate to="/login" replace />;

  return children;
}
