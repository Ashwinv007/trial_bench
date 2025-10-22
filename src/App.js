import React, { useContext, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthContext, FirebaseContext } from './store/Context';
import { onAuthStateChanged } from 'firebase/auth';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import './theme.css';


function App() {
  const { user, setUser } = useContext(AuthContext);
  const { auth } = useContext(FirebaseContext);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
    });
    return () => unsubscribe(); // Cleanup the listener on unmount
  }, [auth, setUser]);

  return (
    <Router>
      <Routes>
        <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/" />} />
        <Route path="/" element={user ? <HomePage /> : <Navigate to="/login" />} />
        
      </Routes>
    </Router>
  );
}

export default App;