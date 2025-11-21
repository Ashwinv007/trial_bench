import { useContext } from 'react';
import { AuthContext } from '../store/Context';

/**
 * Provides access to the user's authentication status and permission-checking functions.
 * This is now the single source of truth for authorization in the application.
 */
export const usePermissions = () => {
  return useContext(AuthContext);
};
