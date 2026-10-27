
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({
  children,
  allowedRoles,
}) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <p>Checking session...</p>;
  }

  if (!user) {
    return (
      <Navigate
        to="/login"
        state={{ from: location }}
        replace
      />
    );
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    const destinations = {
      ADMIN: "/admin",
      CUSTOMER: "/customer",
      WORKER: "/worker",
    };

    return (
      <Navigate
        to={destinations[user.role] || "/login"}
        replace
      />
    );
  }

  return children;
}
