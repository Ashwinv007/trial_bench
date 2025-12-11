import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthContext } from './store/Context';
import { DataProvider } from './store/DataContext';
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
import ProtectedRoute from './auth/ProtectedRoute';
import Dashboard from './components/Dashboard';
import { Box, CircularProgress } from '@mui/material';

function App() {
  const { user, isAuthLoading } = useContext(AuthContext);

  if (isAuthLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <DataProvider>
      <Router>
        <Toaster position="top-center" richColors />
        <Routes>
          <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/" />} />
          
          
          {/* Protected Routes within HomePage Layout */}
          <Route path="/" element={user ? <HomePage /> : <Navigate to="/login" />}>
            <Route index element={<Dashboard />} />
            <Route path="leads" element={<ProtectedRoute permission="leads:view"><LeadsPage /></ProtectedRoute>} />
            <Route path="add-lead" element={<ProtectedRoute permission="leads:add"><AddLeadPage /></ProtectedRoute>} />
            <Route path="lead/:id" element={<ProtectedRoute permission="leads:edit"><EditLeadPage /></ProtectedRoute>} />
            <Route path="members" element={<ProtectedRoute permission="members:view"><MembersPage /></ProtectedRoute>} />
            <Route path="member/:id" element={<ProtectedRoute permission="members:view"><ClientProfilePage /></ProtectedRoute>} />
            <Route path="past-members" element={<ProtectedRoute permission="members:view"><PastMembersPage /></ProtectedRoute>} />
            <Route path="agreements" element={<ProtectedRoute permission="agreements:view"><AgreementsPage /></ProtectedRoute>} />
            <Route path="invoices" element={<ProtectedRoute permission="invoices:view"><InvoicesPage /></ProtectedRoute>} />
            <Route path="expenses" element={<ProtectedRoute permission="expenses:view"><ExpensesPage /></ProtectedRoute>} />
            <Route path="settings" element={<ProtectedRoute permission={['settings:manage_roles', 'settings:manage_users', 'settings:manage_templates']}><SettingsPage /></ProtectedRoute>} />
            <Route path="logs" element={<ProtectedRoute permission="logs:view"><LogsPage /></ProtectedRoute>} />
          </Route>
        </Routes>
      </Router>
    </DataProvider>
  );
}

export default App;