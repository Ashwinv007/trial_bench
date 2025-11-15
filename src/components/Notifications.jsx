import React from 'react';
import styles from './Notifications.module.css';
import { Notifications as NotificationsIcon, Close } from '@mui/icons-material';

export default function Notifications({ notifications, onClose }) {
  if (!notifications || notifications.length === 0) {
    return null;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <NotificationsIcon className={styles.icon} />
        <h3 className={styles.title}>Follow-up Reminders</h3>
        <button className={styles.closeButton} onClick={onClose}>
          <Close />
        </button>
      </div>
      <ul className={styles.notificationList}>
        {notifications.map((notification, index) => (
          <li key={index} className={styles.notificationItem}>
            <p className={styles.notificationText}>
              Follow up with <strong>{notification.leadName}</strong>.
            </p>
            <p className={styles.notificationNote}>Note: {notification.note}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
