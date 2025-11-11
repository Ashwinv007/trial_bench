import { createContext, useState, useEffect } from "react"; // Added useEffect
import { auth, db } from '../firebase/config';
import { onAuthStateChanged } from 'firebase/auth'; // Import onAuthStateChanged

export const FirebaseContext = createContext(null);
export const AuthContext = createContext(null);

export default function Context({ children }) {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null); // New state for user role

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // User is signed in.
        const idTokenResult = await firebaseUser.getIdTokenResult(true); // Force refresh to get latest claims
        const claims = idTokenResult.claims;

        // Determine user role based on custom claims
        if (claims.all) { // 'all' claim indicates an admin
          setUserRole('admin');
        } else if (claims.view_leads || claims.edit_leads || claims.delete_leads) { // Example: if any lead permission, consider manager
          setUserRole('manager');
        } else {
          setUserRole('user'); // Default role
        }
        setUser(firebaseUser);
      } else {
        // User is signed out.
        setUser(null);
        setUserRole(null);
      }
    });

    return () => unsubscribe(); // Cleanup subscription
  }, []);

  return (
    <FirebaseContext.Provider value={{ auth, db }}>
      <AuthContext.Provider value={{ user, setUser, userRole }}> {/* Added userRole to provider */}
        {children}
      </AuthContext.Provider>
    </FirebaseContext.Provider>
  );
}