import React from 'react';
import styles from './Notifications.module.css';
import { Notifications as NotificationsIcon, Close } from '@mui/icons-material';
import { usePermissions } from '../auth/usePermissions'; // Import usePermissions

export default function Notifications({ notifications, onClose, title }) {
  const { hasPermission } = usePermissions(); // Use the usePermissions hook

  const filteredNotifications = notifications.filter(notification => {
    if (notification.type === 'followUp' && !hasPermission('leads:view')) {
      return false;
    }
    if (notification.type === 'agreement' && !hasPermission('agreements:view')) {
      return false;
    }
    if (notification.type === 'birthday' && !hasPermission('members:view')) {
      return false;
    }
    return true;
  });

  if (!filteredNotifications || filteredNotifications.length === 0) {
    return null;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <NotificationsIcon className={styles.icon} />
        <h3 className={styles.title}>{title}</h3>
        <button className={styles.closeButton} onClick={onClose}>
          <Close />
        </button>
      </div>
      <ul className={styles.notificationList}>
        {filteredNotifications.map((notification, index) => (
          <li key={index} className={`${styles.notificationItem} ${notification.type === 'agreement' ? styles[notification.level] : ''}`}>
            {notification.type === 'followUp' && (
              <>
                <p className={styles.notificationText}>
                  Follow up with <strong>{notification.leadName}</strong>.
                </p>
                <p className={styles.notificationNote}>Note: {notification.note}</p>
              </>
            )}
            {notification.type === 'agreement' && (
              <p className={styles.notificationText}>
                {notification.message}
              </p>
            )}
            {notification.type === 'birthday' && (
              <p className={styles.notificationText}>
                {notification.message}
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
