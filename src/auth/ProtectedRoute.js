import React from 'react';
import { Navigate } from 'react-router-dom';
import { usePermissions } from './usePermissions'; // Updated import

const ProtectedRoute = ({ children, permission }) => {
  const { user, hasPermission, loadingPermissions } = usePermissions(); // Use the hook

  if (loadingPermissions) {
    // Optional: Render a loading spinner or a blank screen while permissions are being checked.
    // This prevents a flash of the redirect before permissions are loaded.
    return null; // or <LoadingSpinner />
  }

  if (!user) {
    // User is not logged in, redirect to login page
    return <Navigate to="/login" replace />;
  }

  if (!hasPermission(permission)) {
    // User is logged in but does not have the required permission,
    // redirect to home or a "not authorized" page.
    return <Navigate to="/" replace />;
  }

  return children; // User has the required permission, render the children
};

export default ProtectedRoute;
