import React from 'react';
import { Navigate } from 'react-router-dom';
import { usePermissions } from './usePermissions';

const ProtectedRoute = ({ children, permission }) => {
  const { user, hasPermission, hasAtLeastOnePermission, loadingPermissions } = usePermissions();

  if (loadingPermissions) {
    // Render nothing while permissions are loading to prevent flashes of incorrect content.
    return null;
  }

  if (!user) {
    // User is not logged in, redirect to login page.
    return <Navigate to="/login" replace />;
  }

  // Determine if the user is allowed to access the route.
  let isAllowed = false;
  if (Array.isArray(permission)) {
    // If permission is an array, check if the user has at least one of them.
    isAllowed = hasAtLeastOnePermission(permission);
  } else if (typeof permission === 'string') {
    // If permission is a string, check for that specific permission.
    isAllowed = hasPermission(permission);
  }

  if (!isAllowed) {
    // User is logged in but does not have the required permission(s).
    return <Navigate to="/" replace />;
  }

  // User has the required permission, render the requested component.
  return children;
};

export default ProtectedRoute;
