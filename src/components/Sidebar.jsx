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
  Description,
  History
} from '@mui/icons-material';
import styles from './Sidebar.module.css';
import { AuthContext } from '../store/Context';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase/config';
import { usePermissions } from '../auth/usePermissions';

const navItems = [
    { label: 'Dashboard', icon: Dashboard, path: '/' },
    { label: 'Leads', icon: ContactPage, path: '/leads', permission: 'leads:view' },
    { label: 'Agreements', icon: Description, path: '/agreements', permission: 'agreements:view' },
    { label: 'Invoices', icon: MonetizationOn, path: '/invoices', permission: 'invoices:view' },
    { label: 'Members', icon: People, path: '/members', permission: 'members:view' },
    { label: 'Past Members', icon: Assignment, path: '/past-members', permission: 'members:view' },
    { label: 'Expenses', icon: Receipt, path: '/expenses', permission: 'expenses:view' },
    { label: 'Settings', icon: Settings, path: '/settings', permissions: ['settings:manage_roles', 'settings:manage_users', 'settings:manage_templates'] },
    { label: 'Logs', icon: History, path: '/logs', permission: 'logs:view' }
];

export default function Sidebar() {
  const { user } = useContext(AuthContext);
  const { hasPermission, hasAtLeastOnePermission } = usePermissions();
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
          const showItem = item.path === '/' ? true : (item.permission ? hasPermission(item.permission) : (item.permissions ? hasAtLeastOnePermission(item.permissions) : false));
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