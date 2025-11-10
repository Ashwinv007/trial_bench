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
    { label: 'Dashboard', icon: Dashboard, path: '/' },
    { label: 'Leads', icon: ContactPage, path: '/leads' },
    {label: 'Agreements', icon: Description, path: '/agreements' },
      { label: 'Invoices', icon: MonetizationOn, path: '/invoices' },
    { label: 'Members', icon: People, path: '/members' },
      { label: 'Expenses', icon: Receipt, path: '/expenses' },
  
  ];

export default function Sidebar() {
  const { user } = useContext(AuthContext);
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

  return (
    <div className={styles.sidebar}>
      {/* Logo */}
      <div className={styles.logoContainer}>
        <img src="/tblogo.png" alt="Trial Bench" className={styles.logo} />
      </div>

      {/* Navigation */}
      <nav className={styles.nav}>
        {navItems.map((item) => (
          <NavLink
            key={item.label}
            to={item.path}
            className={`${styles.navItem} ${location.pathname === item.path ? styles.active : ''}`}
          >
            <item.icon className={styles.navIcon} />
            <span>{item.label}</span>
          </NavLink>
        ))}
        <NavLink
            to="/settings"
            className={`${styles.navItem} ${location.pathname === '/settings' ? styles.active : ''}`}
        >
            <Settings className={styles.navIcon} />
            <span>Settings</span>
        </NavLink>
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