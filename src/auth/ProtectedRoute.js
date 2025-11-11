import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../store/Context';

const ProtectedRoute = ({ children, permission }) => {
  const { user, hasPermission } = useContext(AuthContext);

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
