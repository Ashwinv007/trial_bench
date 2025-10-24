import { createContext, useState } from "react";
import { auth, db } from '../firebase/config';

export const FirebaseContext = createContext(null);
export const AuthContext = createContext(null);

export default function Context({ children }) {
  const [user, setUser] = useState(null);

  return (
    <FirebaseContext.Provider value={{ auth, db }}>
      <AuthContext.Provider value={{ user, setUser }}>
        {children}
      </AuthContext.Provider>
    </FirebaseContext.Provider>
  );
}