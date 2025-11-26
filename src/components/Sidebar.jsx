import React, { useContext } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Dashboard,
  People,
  Assignment,
  MonetizationOn,
  Receipt,
  ContactPage,
  Description,
  History,
} from '@mui/icons-material';
import styles from './Sidebar.module.css';
import { AuthContext } from '../store/Context';
import { usePermissions } from '../auth/usePermissions';

const navItems = [
    { label: 'Dashboard', icon: Dashboard, path: '/' },
    { label: 'Leads', icon: ContactPage, path: '/leads', permission: 'leads:view' },
    { label: 'Agreements', icon: Description, path: '/agreements', permission: 'agreements:view' },
    { label: 'Invoices', icon: MonetizationOn, path: '/invoices', permission: 'invoices:view' },
    { label: 'Members', icon: People, path: '/members', permission: 'members:view' },
    { label: 'Past Members', icon: Assignment, path: '/past-members', permission: 'members:view' },
    { label: 'Expenses', icon: Receipt, path: '/expenses', permission: 'expenses:view' },
    { label: 'Logs', icon: History, path: '/logs', permission: 'logs:view' }
];

export default function Sidebar({ isCollapsed }) {
  const { user } = useContext(AuthContext);
  const { hasPermission, hasAtLeastOnePermission } = usePermissions();
  const location = useLocation();

  if (!user) {
    return null;
  }

  return (
    <div className={`${styles.sidebar} ${isCollapsed ? styles.collapsed : ''}`}>
      <div className={styles.header}>
        {!isCollapsed && (
          <div className={styles.logoContainer}>
            <img src="/tblogo.png" alt="Trial Bench" className={styles.logo} />
          </div>
        )}
      </div>

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
                {!isCollapsed && <span>{item.label}</span>}
              </NavLink>
            )
          );
        })}
      </nav>
    </div>
  );
}