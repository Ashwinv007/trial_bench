import { useState } from 'react';
import { Toaster } from 'sonner@2.0.3';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import Leads from './components/Leads';
import AddLead from './components/AddLead';
import Agreements from './components/Agreements';
import Invoices from './components/Invoices';
import Clients from './components/Clients';
import Expenses from './components/Expenses';
import './styles/theme.css';

export default function App() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Get page title based on current view
  const getPageTitle = () => {
    switch (currentView) {
      case 'dashboard':
        return 'Dashboard';
      case 'leads':
        return 'Leads';
      case 'addLead':
        return 'Add New Lead';
      case 'agreements':
        return 'Agreements';
      case 'clients':
        return 'Clients';
      case 'invoices':
        return 'Invoices';
      case 'expenses':
        return 'Expenses';
      default:
        return 'Dashboard';
    }
  };

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard />;
      case 'leads':
        return <Leads onAddLead={() => setCurrentView('addLead')} />;
      case 'addLead':
        return <AddLead onBack={() => setCurrentView('leads')} />;
      case 'agreements':
        return <Agreements />;
      case 'clients':
        return <Clients />;
      case 'invoices':
        return <Invoices />;
      case 'expenses':
        return <Expenses />;
      default:
        return <Dashboard />;
    }
  };

  const handleViewChange = (view) => {
    setCurrentView(view);
    setSidebarOpen(false); // Close sidebar on mobile when view changes
  };

  return (
    <>
      <Toaster position="top-right" richColors closeButton />
      <div style={{ display: 'flex', height: '100vh' }}>
        <Sidebar 
          currentView={currentView} 
          onViewChange={handleViewChange}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <Header 
            pageTitle={getPageTitle()} 
            onMenuClick={() => setSidebarOpen(true)}
          />
          <div style={{ flex: 1, overflow: 'auto' }}>
            {renderView()}
          </div>
        </div>
      </div>
    </>
  );
}