import React from 'react';
import styles from './Dashboard.module.css';
import BirthdayList from './dashboard/BirthdayList';
import ExpiringAgreements from './dashboard/ExpiringAgreements';
import UnpaidInvoices from './dashboard/UnpaidInvoices';
import RecentClients from './dashboard/RecentClients';
import LeadConversionsChart from './dashboard/LeadConversionsChart';
import RevenueChart from './dashboard/RevenueChart';
import ExpenseChart from './dashboard/ExpenseChart';

export default function Dashboard() {
    return (
        <div className={styles.container}>
            <div className={styles.content}>
                <div className={styles.header}>
                    <h1 className={styles.title}>Dashboard</h1>
                    <p className={styles.subtitle}>An overview of your coworking space.</p>
                </div>

                <div className={styles.chartsGrid}>
                    <div className={styles.gridItemSmall}><BirthdayList /></div>
                    <div className={styles.gridItemSmall}><ExpiringAgreements /></div>
                    <div className={styles.gridItemSmall}><UnpaidInvoices /></div>
                    <div className={styles.gridItemSmall}><RecentClients /></div>
                    <div className={styles.gridItemLarge}><LeadConversionsChart /></div>
                    <div className={styles.gridItemLarge}><RevenueChart /></div>
                    <div className={styles.gridItemLarge}><ExpenseChart /></div>
                </div>
            </div>
        </div>
    );
}
