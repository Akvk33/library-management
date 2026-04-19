import { Navigate, Outlet } from "react-router-dom";

export function RequireAuth({ sessionUser }) {
  if (!sessionUser) {
    return <Navigate to="/auth" replace />;
  }

  return <Outlet />;
}

export function RequireRole({ sessionUser, role }) {
  if (!sessionUser) {
    return <Navigate to="/auth" replace />;
  }

  if (sessionUser.role !== role) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
