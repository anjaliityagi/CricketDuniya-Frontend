import { Navigate, useLocation } from "react-router-dom";

import { useAuth } from "@/context/AuthContext";

type ProtectedRouteProps = {
  children: JSX.Element;
  redirectTo?: string;
  message?: string;
};

export default function ProtectedRoute({
  children,
  redirectTo = "/login",
  message,
}: ProtectedRouteProps) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return (
      <Navigate
        to={redirectTo}
        state={{ from: location, message }}
        replace
      />
    );
  }

  return children;
}
