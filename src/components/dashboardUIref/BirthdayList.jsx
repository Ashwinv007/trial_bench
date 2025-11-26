import React from 'react';
import { Cake } from 'lucide-react';
import { birthdaysData } from './dashboardData';
import styles from './BirthdayList.module.css';

export default function BirthdayList() {
  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.titleWrapper}>
          <Cake size={20} className={styles.headerIcon} />
          <h3 className={styles.title}>Birthdays This Month</h3>
        </div>
        <span className={styles.count}>{birthdaysData.length}</span>
      </div>
      
      <div className={styles.list}>
        {birthdaysData.map((birthday) => (
          <div key={birthday.id} className={styles.item}>
            <div className={styles.avatar}>
              {birthday.avatar}
            </div>
            <div className={styles.info}>
              <div className={styles.name}>{birthday.name}</div>
              <div className={styles.date}>{birthday.date}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
