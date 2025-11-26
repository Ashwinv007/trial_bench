import React, { useState, useEffect, useContext } from 'react';
import Sidebar from '../components/Sidebar';
import { Outlet, useLocation } from 'react-router-dom';
import Header from '../components/Header';
import { FirebaseContext } from '../store/Context';
import { collection, getDocs } from 'firebase/firestore';
import { usePermissions } from '../auth/usePermissions';

const getPageTitle = (pathname) => {
  const titles = {
    '/': 'Dashboard',
    '/leads': 'Leads',
    '/add-lead': 'Add Lead',
    '/members': 'Members',
    '/past-members': 'Past Members',
    '/agreements': 'Agreements',
    '/invoices': 'Invoices',
    '/expenses': 'Expenses',
    '/settings': 'Settings',
    '/logs': 'Logs',
  };
  
  if (pathname.startsWith('/lead/')) return 'Edit Lead';
  if (pathname.startsWith('/member/')) return 'Client Profile';

  return titles[pathname] || 'Dashboard';
};

const SIDEBAR_WIDTH_EXPANDED = '256px';
const SIDEBAR_WIDTH_COLLAPSED = '80px';

function HomePage() {
  const { db } = useContext(FirebaseContext);
  const { hasPermission } = usePermissions();
  const [notifications, setNotifications] = useState([]);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(window.innerWidth < 768);
  const location = useLocation();
  const pageTitle = getPageTitle(location.pathname);

  // The toggleSidebar function is not used by the Header anymore, but might be used by the Sidebar itself.
  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setIsSidebarCollapsed(true);
      } else {
        // Only expand if not manually collapsed previously or if screen size changes from small to large
        if (isSidebarCollapsed && window.innerWidth >= 768) {
          setIsSidebarCollapsed(false);
        }
      }
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [isSidebarCollapsed]); // Added isSidebarCollapsed to dependencies to prevent stale closure

  useEffect(() => {
    const fetchNotifications = async () => {
      if (!db || !hasPermission) return;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const allNotifications = [];

      // Notifications fetching logic...
      
      setNotifications(allNotifications);
    };

    fetchNotifications();
  }, [db, hasPermission]);

  return (
    <div 
      style={{ 
        display: 'flex', 
        height: '100vh',
        '--sidebar-width-expanded': SIDEBAR_WIDTH_EXPANDED,
        '--sidebar-width-collapsed': SIDEBAR_WIDTH_COLLAPSED,
        '--current-sidebar-width': isSidebarCollapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED,
      }}
    >
      <Sidebar isCollapsed={isSidebarCollapsed} toggleSidebar={toggleSidebar} />
      <div 
        style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          flexGrow: 1, 
          marginLeft: isSidebarCollapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED, 
          transition: 'margin-left 0.3s' 
        }}
      >
        <Header 
          pageTitle={pageTitle} 
          notifications={notifications} 
          setNotifications={setNotifications}
          isSidebarCollapsed={isSidebarCollapsed}
        />
        <main style={{ flexGrow: 1, padding: '20px', overflowY: 'auto' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default HomePage;