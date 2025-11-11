import { createContext, useState, useEffect, useCallback } from "react";
import { auth, db } from '../firebase/config';
import { onAuthStateChanged } from 'firebase/auth';

export const FirebaseContext = createContext(null);
export const AuthContext = createContext(null);

export default function Context({ children }) {
  const [user, setUser] = useState(null);
  const [customClaims, setCustomClaims] = useState({});

  const hasPermission = useCallback((permission) => {
    if (!customClaims) {
      return false;
    }
    // The 'all' permission grants access to everything
    if (customClaims.all === true) {
      return true;
    }
    return customClaims[permission] === true;
  }, [customClaims]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const idTokenResult = await firebaseUser.getIdTokenResult(true);
        setCustomClaims(idTokenResult.claims || {});
        setUser(firebaseUser);
      } else {
        // User is signed out.
        setUser(null);
        setCustomClaims({});
      }
    });

    return () => unsubscribe(); // Cleanup subscription
  }, []);

  return (
    <FirebaseContext.Provider value={{ auth, db }}>
      <AuthContext.Provider value={{ user, customClaims, hasPermission }}>
        {children}
      </AuthContext.Provider>
    </FirebaseContext.Provider>
  );
}