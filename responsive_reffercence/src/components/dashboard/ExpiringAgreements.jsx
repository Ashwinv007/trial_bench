import React from 'react';
import { FileWarning, AlertCircle } from 'lucide-react';
import { expiringAgreementsData } from './dashboardData';
import styles from './ExpiringAgreements.module.css';

export default function ExpiringAgreements() {
  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.titleWrapper}>
          <FileWarning size={20} className={styles.headerIcon} />
          <h3 className={styles.title}>Expiring Agreements (Next 7 Days)</h3>
        </div>
      </div>
      
      <div className={styles.list}>
        {expiringAgreementsData.map((agreement) => (
          <div key={agreement.id} className={styles.item}>
            <div className={styles.iconWrapper}>
              <AlertCircle size={18} />
            </div>
            <div className={styles.info}>
              <div className={styles.client}>{agreement.client}</div>
              <div className={styles.date}>{agreement.expireDate}</div>
            </div>
            <div className={styles.badge}>
              {agreement.daysLeft} days
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
