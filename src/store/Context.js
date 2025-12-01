import { createContext, useState, useEffect, useCallback } from "react";
import { auth, db } from '../firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

export const FirebaseContext = createContext(null);
export const AuthContext = createContext(null);

// In-memory cache for role permissions to avoid re-fetching on every render.
const roleCache = new Map();

export default function Context({ children }) {
  const [user, setUser] = useState(null);
  const [customClaims, setCustomClaims] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [loadingPermissions, setLoadingPermissions] = useState(true);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoadingPermissions(true);
      if (firebaseUser) {
        const idTokenResult = await firebaseUser.getIdTokenResult(true); // Force refresh
        setUser(firebaseUser);
        setCustomClaims(idTokenResult.claims);
      } else {
        // User is signed out.
        setUser(null);
        setCustomClaims(null);
        setPermissions([]);
        setLoadingPermissions(false);
      }
      setIsAuthLoading(false);
    });

    return () => unsubscribe(); // Cleanup subscription
  }, []);

  useEffect(() => {
    const fetchPermissions = async () => {
      if (!customClaims || !customClaims.role) {
        setPermissions([]);
        setLoadingPermissions(false);
        return;
      }

      const roleId = customClaims.role;
      if (roleCache.has(roleId)) {
        setPermissions(roleCache.get(roleId));
        setLoadingPermissions(false);
        return;
      }

      try {
        const roleRef = doc(db, 'roles', roleId);
        const roleSnap = await getDoc(roleRef);

        if (roleSnap.exists()) {
          const rolePermissions = roleSnap.data().permissions || [];
          roleCache.set(roleId, rolePermissions);
          setPermissions(rolePermissions);
        } else {
          console.error(`Role with ID "${roleId}" not found.`);
          setPermissions([]);
          roleCache.set(roleId, []);
        }
      } catch (error) {
        console.error("Error fetching permissions:", error);
        setPermissions([]);
      } finally {
        setLoadingPermissions(false);
      }
    };

    // Only fetch permissions if we have claims.
    if (customClaims) {
      fetchPermissions();
    }
  }, [customClaims]);

  const hasPermission = useCallback((requiredPermission) => {
    if (loadingPermissions) return false;
    return permissions.includes('all') || permissions.includes(requiredPermission);
  }, [permissions, loadingPermissions]);
  
  const hasAtLeastOnePermission = useCallback((requiredPermissions) => {
    if (loadingPermissions) return false;
    if (permissions.includes('all')) return true;
    return requiredPermissions.some(p => permissions.includes(p));
  }, [permissions, loadingPermissions]);

  return (
    <FirebaseContext.Provider value={{ auth, db }}>
      <AuthContext.Provider value={{ user, customClaims, permissions, loadingPermissions, isAuthLoading, hasPermission, hasAtLeastOnePermission }}>
        {children}
      </AuthContext.Provider>
    </FirebaseContext.Provider>
  );
}