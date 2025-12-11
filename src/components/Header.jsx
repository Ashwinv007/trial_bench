import { useState, useContext, useEffect } from 'react';
import { IconButton, Badge, Menu, MenuItem, Divider, Avatar } from '@mui/material';
import { Notifications, Logout, Settings, Menu as MenuIcon } from '@mui/icons-material';
import styles from './Header.module.css';
import { AuthContext } from '../store/Context';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase/config';
import { useNavigate } from 'react-router-dom';
import { usePermissions } from '../auth/usePermissions';
import NotificationsComponent from './Notifications'; // Renamed to avoid conflict

export default function Header({ pageTitle = 'Dashboard', notifications, setNotifications, onMenuClick }) {
  const { user } = useContext(AuthContext);
  const { hasAtLeastOnePermission } = usePermissions();
  const navigate = useNavigate();

  const [notificationAnchor, setNotificationAnchor] = useState(null);
  const [userMenuAnchor, setUserMenuAnchor] = useState(null);
  const [mobileMenuAnchor, setMobileMenuAnchor] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const userData = user ? {
    name: user.displayName || 'Admin User',
    email: user.email,
    initials: user.displayName ? user.displayName.split(' ').map(n => n[0]).join('') : 'AU',
  } : {
    name: 'Admin User',
    email: 'admin@trialbench.com',
    initials: 'AU',
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleNotificationClick = (event) => {
    setNotificationAnchor(event.currentTarget);
  };

  const handleNotificationClose = () => {
    setNotificationAnchor(null);
  };

  const handleMarkAsRead = (id) => {
    setNotifications(notifications.map(n => n.id === id ? { ...n, isRead: true } : n));
  };

  const handleUserMenuClick = (event) => {
    setUserMenuAnchor(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setUserMenuAnchor(null);
  };

  const handleMobileMenuClick = (event) => {
    setMobileMenuAnchor(event.currentTarget);
  };

  const handleMobileMenuClose = () => {
    setMobileMenuAnchor(null);
  };

  const handleLogout = async () => {
    handleUserMenuClose();
    handleMobileMenuClose();
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const handleSettings = () => {
    handleUserMenuClose();
    handleMobileMenuClose();
    navigate('/settings');
  };

  const canViewSettings = hasAtLeastOnePermission(['settings:manage_roles', 'settings:manage_users', 'settings:manage_templates']);

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <div className={styles.titleSection}>
          {isMobile && (
            <IconButton
              edge="start"
              className={styles.menuButton}
              onClick={onMenuClick}
              aria-label="open sidebar"
            >
              <MenuIcon />
            </IconButton>
          )}
          <h1 className={styles.pageTitle}>{pageTitle}</h1>
        </div>

        <div className={styles.rightSection}>
          {isMobile ? (
            <IconButton
              className={styles.iconButton}
              onClick={handleMobileMenuClick}
              aria-label="open menu"
            >
              <MenuIcon />
            </IconButton>
          ) : (
            <>
              <IconButton
                className={styles.iconButton}
                onClick={handleNotificationClick}
                aria-label={`${unreadCount} notifications`}
              >
                <Badge badgeContent={unreadCount} color="error">
                  <Notifications />
                </Badge>
              </IconButton>
              <IconButton
                className={styles.iconButton}
                onClick={handleUserMenuClick}
                aria-label="user account"
              >
                <Avatar className={styles.avatar}>
                  {userData.initials}
                </Avatar>
              </IconButton>
            </>
          )}
        </div>

        {/* Notifications Menu */}
        <Menu
          anchorEl={notificationAnchor}
          open={Boolean(notificationAnchor)}
          onClose={handleNotificationClose}
          PaperProps={{ className: styles.notificationMenu }}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        >
           <div className={styles.menuHeader}>
            <h3 className={styles.menuTitle}>Notifications</h3>
            {unreadCount > 0 && (
              <span className={styles.unreadBadge}>{unreadCount} new</span>
            )}
          </div>
          <Divider />
          
          {notifications.length === 0 ? (
            <div className={styles.emptyNotifications}>
              <Notifications className={styles.emptyIcon} />
              <p>No notifications</p>
            </div>
          ) : (
            <NotificationsComponent notifications={notifications} onClose={handleNotificationClose} onMarkAsRead={handleMarkAsRead} />
          )}
        </Menu>

        {/* User Menu (Desktop) */}
        <Menu
          anchorEl={userMenuAnchor}
          open={Boolean(userMenuAnchor)}
          onClose={handleUserMenuClose}
          PaperProps={{ className: styles.userMenu }}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        >
          <div className={styles.userMenuHeader}>
            <Avatar className={styles.userMenuAvatar}>
              {userData.initials}
            </Avatar>
            <div className={styles.userInfo}>
              <div className={styles.userName}>{userData.name}</div>
              <div className={styles.userEmail}>{userData.email}</div>
            </div>
          </div>
          <Divider />
          
          {canViewSettings && (
            <MenuItem onClick={handleSettings} className={styles.menuItem}>
              <Settings className={styles.menuIcon} />
              Settings
            </MenuItem>
          )}
          
          <Divider />
          
          <MenuItem onClick={handleLogout} className={styles.menuItem}>
            <Logout className={styles.menuIcon} />
            Logout
          </MenuItem>
        </Menu>

        {/* Mobile Menu */}
        <Menu
          anchorEl={mobileMenuAnchor}
          open={Boolean(mobileMenuAnchor)}
          onClose={handleMobileMenuClose}
          PaperProps={{ className: styles.mobileMenu }}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        >
          {canViewSettings && (
            <MenuItem onClick={handleSettings} className={styles.menuItem}>
              <Settings className={styles.menuIcon} />
              Settings
            </MenuItem>
          )}
          <MenuItem onClick={handleLogout} className={styles.menuItem}>
            <Logout className={styles.menuIcon} />
            Logout
          </MenuItem>
        </Menu>
      </div>
    </header>
  );
}

