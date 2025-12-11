import { useState } from 'react';
import { IconButton, Badge, Menu, MenuItem, Divider, Avatar } from '@mui/material';
import { Notifications, Person, Logout, Settings, Menu as MenuIcon } from '@mui/icons-material';
import styles from './Header.module.css';

export default function Header({ pageTitle = 'Dashboard', onMenuClick }) {
  const [notificationAnchor, setNotificationAnchor] = useState(null);
  const [userMenuAnchor, setUserMenuAnchor] = useState(null);

  // Sample notifications data
  const [notifications] = useState([
    {
      id: 1,
      title: 'New invoice payment received',
      description: 'Diana Prince paid invoice #WCP2511002',
      time: '5 mins ago',
      isRead: false,
    },
    {
      id: 2,
      title: 'Agreement expiring soon',
      description: 'Bruce Wayne\'s agreement expires in 30 days',
      time: '2 hours ago',
      isRead: false,
    },
    {
      id: 3,
      title: 'New lead added',
      description: 'Barry Allen added as a new lead',
      time: '1 day ago',
      isRead: true,
    },
    {
      id: 4,
      title: 'Invoice overdue',
      description: 'Invoice #WCP2511001 is overdue',
      time: '2 days ago',
      isRead: false,
    },
  ]);

  // User data
  const userData = {
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

  const handleUserMenuClick = (event) => {
    setUserMenuAnchor(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setUserMenuAnchor(null);
  };

  const handleLogout = () => {
    handleUserMenuClose();
    // Logout logic here
    alert('Logout functionality will be implemented');
  };

  const handleProfile = () => {
    handleUserMenuClose();
    // Navigate to profile page
    alert('Profile page will be implemented');
  };

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        {/* Hamburger Menu Button - Only visible on mobile */}
        <IconButton
          className={styles.menuButton}
          onClick={onMenuClick}
          aria-label="open menu"
        >
          <MenuIcon />
        </IconButton>

        {/* Page Title */}
        <div className={styles.titleSection}>
          <h1 className={styles.pageTitle}>{pageTitle}</h1>
        </div>

        {/* Right Section */}
        <div className={styles.rightSection}>
          {/* Notifications */}
          <IconButton
            className={styles.iconButton}
            onClick={handleNotificationClick}
            aria-label={`${unreadCount} notifications`}
          >
            <Badge badgeContent={unreadCount} color="error">
              <Notifications />
            </Badge>
          </IconButton>

          {/* User Account */}
          <IconButton
            className={styles.iconButton}
            onClick={handleUserMenuClick}
            aria-label="user account"
          >
            <Avatar className={styles.avatar}>
              {userData.initials}
            </Avatar>
          </IconButton>
        </div>

        {/* Notifications Menu */}
        <Menu
          anchorEl={notificationAnchor}
          open={Boolean(notificationAnchor)}
          onClose={handleNotificationClose}
          PaperProps={{
            className: styles.notificationMenu,
          }}
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
            <div className={styles.notificationsList}>
              {notifications.map((notification) => (
                <MenuItem
                  key={notification.id}
                  onClick={handleNotificationClose}
                  className={`${styles.notificationItem} ${!notification.isRead ? styles.unread : ''}`}
                >
                  <div className={styles.notificationContent}>
                    <div className={styles.notificationTitle}>
                      {notification.title}
                      {!notification.isRead && <span className={styles.unreadDot}></span>}
                    </div>
                    <div className={styles.notificationDescription}>
                      {notification.description}
                    </div>
                    <div className={styles.notificationTime}>
                      {notification.time}
                    </div>
                  </div>
                </MenuItem>
              ))}
            </div>
          )}
        </Menu>

        {/* User Menu */}
        <Menu
          anchorEl={userMenuAnchor}
          open={Boolean(userMenuAnchor)}
          onClose={handleUserMenuClose}
          PaperProps={{
            className: styles.userMenu,
          }}
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
          
          <MenuItem onClick={handleProfile} className={styles.menuItem}>
            <Person className={styles.menuIcon} />
            Profile
          </MenuItem>
          
          <MenuItem onClick={handleUserMenuClose} className={styles.menuItem}>
            <Settings className={styles.menuIcon} />
            Settings
          </MenuItem>
          
          <Divider />
          
          <MenuItem onClick={handleLogout} className={styles.menuItem}>
            <Logout className={styles.menuIcon} />
            Logout
          </MenuItem>
        </Menu>
      </div>
    </header>
  );
}