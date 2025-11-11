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
    { label: 'Dashboard', icon: Dashboard, path: '/', roles: ['admin', 'manager', 'user'] }, // All logged-in users
    { label: 'Leads', icon: ContactPage, path: '/leads', roles: ['admin', 'manager'] },
    { label: 'Agreements', icon: Description, path: '/agreements', roles: ['admin'] },
    { label: 'Invoices', icon: MonetizationOn, path: '/invoices', roles: ['admin'] },
    { label: 'Members', icon: People, path: '/members', roles: ['admin'] },
    { label: 'Expenses', icon: Receipt, path: '/expenses', roles: ['admin'] },
    { label: 'Settings', icon: Settings, path: '/settings', roles: ['admin'] } // Moved settings into navItems
];

export default function Sidebar() {
  const { user, userRole } = useContext(AuthContext); // Get userRole
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
        {navItems.map((item) => (
          // Only render if the user's role is included in the item's allowed roles
          userRole && item.roles.includes(userRole) && (
            <NavLink
              key={item.label}
              to={item.path}
              className={`${styles.navItem} ${location.pathname === item.path ? styles.active : ''}`}
            >
              <item.icon className={styles.navIcon} />
              <span>{item.label}</span>
            </NavLink>
          )
        ))}
      </nav>

      {/* Logout Button */}
      <div className={styles.nav}>
        <button className={styles.navItem} onClick={handleLogout}>
          <ExitToApp className={styles.navIcon} />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
}