import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PageLoader } from './ui/States';

// Нэвтрээгүй хэрэглэгчийг /login руу, админ биш бол нүүр рүү буцаана.
// Энэ нь зөвхөн UI-н хамгаалалт — жинхэнэ хамгаалалт нь өгөгдлийн сангийн RLS.
// roles: ['admin'] эсвэл ['business', 'admin'] гэх мэт зөвшөөрөгдсөн эрхүүд
export default function ProtectedRoute({ roles }) {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading || (user && !profile && roles)) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (roles && !roles.includes(profile?.role)) return <Navigate to="/" replace />;
  return <Outlet />;
}
