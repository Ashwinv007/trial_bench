import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthContext, FirebaseContext } from './store/Context';
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
import SettingsPage from './pages/SettingsPage';
import { Toaster } from 'sonner';
import AdminRoute from './auth/AdminRoute'; // New import
import ManagerRoute from './auth/ManagerRoute'; // New import

function App() {
  const { user } = useContext(AuthContext); // Removed setUser, as it's handled by Context.js
  const { auth } = useContext(FirebaseContext); // auth is still needed for FirebaseContext

  return (
    <Router>
      <Toaster position="top-center" richColors />
      <Routes>
        <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/" />} />
        <Route path="/" element={user ? <HomePage /> : <Navigate to="/login" />} />

        {/* Manager and Admin Routes */}
        <Route path="/leads" element={<ManagerRoute><LeadsPage /></ManagerRoute>} />
        <Route path="/add-lead" element={<ManagerRoute><AddLeadPage /></ManagerRoute>} />
        <Route path="/lead/:id" element={<ManagerRoute><EditLeadPage /></ManagerRoute>} />

        {/* Admin Only Routes */}
        <Route path="/members" element={<AdminRoute><MembersPage /></AdminRoute>} />
        <Route path="/agreements" element={<AdminRoute><AgreementsPage /></AdminRoute>} />
        <Route path="/invoices" element={<AdminRoute><InvoicesPage /></AdminRoute>} />
        <Route path="/expenses" element={<AdminRoute><ExpensesPage /></AdminRoute>} />
        <Route path="/settings" element={<AdminRoute><SettingsPage /></AdminRoute>} />
      </Routes>
    </Router>
  );
}

export default App;