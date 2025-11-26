import React from 'react';
import styles from './Notifications.module.css';
import { Notifications as NotificationsIcon } from '@mui/icons-material';

export default function Notifications({ notifications, onMarkAsRead }) {
  if (!notifications || notifications.length === 0) {
    return (
      <div className={styles.emptyNotifications}>
        <NotificationsIcon className={styles.emptyIcon} />
        <p>No notifications</p>
      </div>
    );
  }

  return (
    <div className={styles.notificationsList}>
      {notifications.map((notification) => (
        <div
          key={notification.id}
          onClick={() => onMarkAsRead(notification.id)}
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
        </div>
      ))}
    </div>
  );
}
