// components/auth/ProtectedRoute.tsx
import { Navigate, useLocation } from "react-router-dom";
import { useIsAuthenticated, useAuthLoading } from "../../store/auth";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
  requiredRole?: string;
}

export const ProtectedRoute = ({ 
  children, 
  redirectTo = "/login",
  requiredRole 
}: ProtectedRouteProps) => {
  const isAuthenticated = useIsAuthenticated();
  const isLoading = useAuthLoading();
  const location = useLocation();

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return (
      <Navigate 
        to={redirectTo} 
        state={{ from: location.pathname }} 
        replace 
      />
    );
  }

  // Optional: Role-based access control
  if (requiredRole) {
    // You can import useUser hook and check user.role
    // const user = useUser();
    // if (user?.role !== requiredRole) {
    //   return <Navigate to="/unauthorized" replace />;
    // }
  }

  return <>{children}</>;
};

// Optional: Higher-order component version
export const withAuth = <P extends object>(
  Component: React.ComponentType<P>,
  options?: { redirectTo?: string; requiredRole?: string }
) => {
  return (props: P) => (
    <ProtectedRoute {...options}>
      <Component {...props} />
    </ProtectedRoute>
  );
};