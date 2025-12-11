import { Dashboard as DashboardIcon, People, Description, TrendingUp, ContactPage, Assignment, AccountBalanceWallet } from '@mui/icons-material';
import CloseIcon from '@mui/icons-material/Close';
import logoImage from 'figma:asset/5e0cb5ab52b91427ef6d34d374bb7a41db3cbd47.png';
import styles from './Sidebar.module.css';

export default function Sidebar({ currentView, onViewChange, isOpen, onClose }) {
  const navItems = [
    { label: 'Dashboard', icon: DashboardIcon, view: 'dashboard' },
    { label: 'Leads', icon: ContactPage, view: 'leads' },
    { label: 'Agreements', icon: Assignment, view: 'agreements' },
    { label: 'Clients', icon: People, view: 'clients' },
    { label: 'Invoices', icon: Description, view: 'invoices' },
    { label: 'Expenses', icon: AccountBalanceWallet, view: 'expenses' },
    { label: 'Rate Suggester', icon: TrendingUp, view: 'rate-suggester' },
  ];

  return (
    <>
      {/* Backdrop - only visible on mobile when sidebar is open */}
      <div 
        className={`${styles.backdrop} ${isOpen ? styles.backdropVisible : ''}`}
        onClick={onClose}
      />
      
      {/* Sidebar */}
      <div className={`${styles.sidebar} ${isOpen ? styles.sidebarOpen : ''}`}>
        {/* Close button - only visible on mobile */}
        <button className={styles.closeButton} onClick={onClose} aria-label="Close menu">
          <CloseIcon />
        </button>

        {/* Logo */}
        <div className={styles.logoContainer}>
          <img src={logoImage} alt="Trial Bench" className={styles.logo} />
        </div>

        {/* Navigation */}
        <nav className={styles.nav}>
          {navItems.map((item) => (
            <button
              key={item.label}
              className={`${styles.navItem} ${currentView === item.view ? styles.active : ''}`}
              onClick={() => onViewChange(item.view)}
            >
              <item.icon className={styles.navIcon} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </>
  );
}