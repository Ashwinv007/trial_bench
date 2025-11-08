import React, { useContext, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthContext, FirebaseContext } from './store/Context';
import { onAuthStateChanged } from 'firebase/auth';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import LeadsPage from './pages/LeadsPage';
import AddLeadPage from './pages/AddLeadPage';
import './theme.css';
import MembersPage from './pages/MembersPage';
import EditLeadPage from './pages/EditLeadPage';
import AgreementsPage from './pages/AgreementsPage';
import InvoicesPage from './pages/InvoicesPage';
import ExpensesPage from './pages/ExpensesPage';

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
        <Route path="/leads" element={user ? <LeadsPage /> : <Navigate to="/login" />} />
        <Route path="/add-lead" element={user ? <AddLeadPage /> : <Navigate to="/login" />} />
        <Route path="/lead/:id" element={user ? <EditLeadPage /> : <Navigate to="/login" />} />
        <Route path="/members" element={user ? <MembersPage /> : <Navigate to="/login" />} />
        <Route path="/agreements" element={user ? <AgreementsPage/>: <Navigate to="/login"/>}/>
        <Route path="invoices" element={user? <InvoicesPage/>:<Navigate to ="/login"/>} />
        <Route path="expenses" element={user? <ExpensesPage/>:<Navigate to ="/login"/>} />



        
      </Routes>
    </Router>
  );
}

export default App;