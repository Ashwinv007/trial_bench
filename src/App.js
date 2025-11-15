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
import PastMembersPage from './pages/PastMembersPage';
import ClientProfilePage from './pages/ClientProfilePage';
import LogsPage from './pages/LogsPage'; // Import LogsPage
import { Toaster } from 'sonner';
import ProtectedRoute from './auth/ProtectedRoute'; // New import

function App() {
  const { user } = useContext(AuthContext);
  const { auth } = useContext(FirebaseContext);

  return (
    <Router>
      <Toaster position="top-center" richColors />
      <Routes>
        <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/" />} />
        
        <Route path="/" element={user ? <HomePage /> : <Navigate to="/login" />} />
        
        {/* Protected Routes */}
        <Route path="/leads" element={<ProtectedRoute permission="view_leads"><LeadsPage /></ProtectedRoute>} />
        <Route path="/add-lead" element={<ProtectedRoute permission="add_leads"><AddLeadPage /></ProtectedRoute>} />
        <Route path="/lead/:id" element={<ProtectedRoute permission="edit_leads"><EditLeadPage /></ProtectedRoute>} />
        <Route path="/members" element={<ProtectedRoute permission="view_members"><MembersPage /></ProtectedRoute>} />
        <Route path="/member/:id" element={<ProtectedRoute permission="view_members"><ClientProfilePage /></ProtectedRoute>} />
        <Route path="/past-members" element={<ProtectedRoute permission="view_members"><PastMembersPage /></ProtectedRoute>} />
        <Route path="/agreements" element={<ProtectedRoute permission="view_agreements"><AgreementsPage /></ProtectedRoute>} />
        <Route path="/invoices" element={<ProtectedRoute permission="view_invoices"><InvoicesPage /></ProtectedRoute>} />
        <Route path="/expenses" element={<ProtectedRoute permission="view_expenses"><ExpensesPage /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute permission="manage_settings"><SettingsPage /></ProtectedRoute>} />
        <Route path="/logs" element={<ProtectedRoute permission="view_logs"><LogsPage /></ProtectedRoute>} />
      </Routes>
    </Router>
  );
}

export default App;