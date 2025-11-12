import React, { useContext } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  Dashboard,
  People,
  Assignment,
  Settings,
  ExitToApp,
  MonetizationOn,
  Receipt,
  ContactPage,
  Description
} from '@mui/icons-material';
import styles from './Sidebar.module.css';
import { AuthContext } from '../store/Context';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase/config';

const navItems = [
    { label: 'Dashboard', icon: Dashboard, path: '/', permission: 'view_dashboard' },
    { label: 'Leads', icon: ContactPage, path: '/leads', permission: 'view_leads' },
    { label: 'Agreements', icon: Description, path: '/agreements', permission: 'view_agreements' },
    { label: 'Invoices', icon: MonetizationOn, path: '/invoices', permission: 'view_invoices' },
    { label: 'Members', icon: People, path: '/members', permission: 'view_members' },
    { label: 'Past Members', icon: Assignment, path: '/past-members', permission: 'view_members' },
    { label: 'Expenses', icon: Receipt, path: '/expenses', permission: 'view_expenses' },
    { label: 'Settings', icon: Settings, path: '/settings', permission: 'manage_settings' }
];

export default function Sidebar() {
  const { user, hasPermission } = useContext(AuthContext); // Get hasPermission
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  // If user is not logged in, don't render sidebar
  if (!user) {
    return null;
  }

  return (
    <div className={styles.sidebar}>
      {/* Logo */}
      <div className={styles.logoContainer}>
        <img src="/tblogo.png" alt="Trial Bench" className={styles.logo} />
      </div>

      {/* Navigation */}
      <nav className={styles.nav}>
        {navItems.map((item) => {
          // Always show Dashboard, for others check permission
          const showItem = item.path === '/' ? true : hasPermission(item.permission);
          return (
            showItem && (
              <NavLink
                key={item.label}
                to={item.path}
                className={`${styles.navItem} ${location.pathname === item.path ? styles.active : ''}`}
              >
                <item.icon className={styles.navIcon} />
                <span>{item.label}</span>
              </NavLink>
            )
          );
        })}

        {/* Logout Button */}
        <button className={styles.navItem} onClick={handleLogout}>
          <ExitToApp className={styles.navIcon} />
          <span>Logout</span>
        </button>
      </nav>
    </div>
  );
}