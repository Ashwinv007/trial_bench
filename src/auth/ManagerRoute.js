import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../store/Context'; // Assuming AuthContext is in ../store/Context

const ManagerRoute = ({ children }) => {
  const { user, userRole } = useContext(AuthContext);

  if (!user) {
    // User is not logged in, redirect to login page
    return <Navigate to="/login" replace />;
  }

  if (userRole !== 'admin' && userRole !== 'manager') {
    // User is logged in but not an admin or manager, redirect to home or a "not authorized" page
    return <Navigate to="/" replace />;
  }

  return children; // User is an admin or manager, render the children (protected component)
};

export default ManagerRoute;
