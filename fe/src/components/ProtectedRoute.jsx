import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="animate-spin text-blue-600" size={40} />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Chuyển hướng nếu không đúng role
    let redirectPath = '/student';
    if (user.role === 'super_admin') redirectPath = '/super-admin';
    else if (user.role === 'admin' || user.role === 'institution_admin') redirectPath = '/admin';
    return <Navigate to={redirectPath} replace />;
  }

  return children;
};

export default ProtectedRoute;
