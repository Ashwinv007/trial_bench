import React from 'react';
import { UserCheck, Mail, FileCheck } from 'lucide-react';
import { recentClientsData } from './dashboardData';
import styles from './RecentClients.module.css';

const statusIcons = {
  'Sent email': Mail,
  'Contract signed': FileCheck
};

export default function RecentClients() {
  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.titleWrapper}>
          <UserCheck size={20} className={styles.headerIcon} />
          <h3 className={styles.title}>Recent Converted Clients (This Week)</h3>
        </div>
      </div>
      
      <div className={styles.list}>
        {recentClientsData.map((client) => {
          const StatusIcon = statusIcons[client.status] || Mail;
          return (
            <div key={client.id} className={styles.item}>
              <div className={styles.avatar}>
                {client.avatar}
              </div>
              <div className={styles.info}>
                <div className={styles.name}>{client.name}</div>
                <div className={styles.statusWrapper}>
                  <StatusIcon size={14} />
                  <span className={styles.status}>{client.status}</span>
                </div>
              </div>
              <div className={styles.date}>{client.date}</div>
            </div>
          );
        })}
      </div>
      
      {recentClientsData.length === 0 && (
        <div className={styles.empty}>
          No converted clients this week
        </div>
      )}
    </div>
  );
}
