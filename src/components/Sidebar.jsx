import { useNavigate, useLocation } from 'react-router-dom';
import { Dashboard as DashboardIcon, People, Description, TrendingUp } from '@mui/icons-material';
import styles from './Sidebar.module.css';

const navItems = [
  { label: 'Dashboard', icon: DashboardIcon, path: '/' },
  { label: 'Leads', icon: People, path: '/leads' },
  { label: 'Invoices', icon: Description, path: '/invoices' },
  { label: 'Rate Suggester', icon: TrendingUp, path: '/rate-suggester' },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className={styles.sidebar}>
      {/* Logo */}
      <div className={styles.logoContainer}>
        <img src="/tblogo.png" alt="Trial Bench" className={styles.logo} />
      </div>

      {/* Navigation */}
      <nav className={styles.nav}>
        {navItems.map((item) => (
          <button
            key={item.label}
            onClick={() => navigate(item.path)}
            className={`${styles.navItem} ${location.pathname === item.path ? styles.active : ''}`}
          >
            <item.icon className={styles.navIcon} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}