import React from 'react';
import { Receipt, ExternalLink } from 'lucide-react';
import { unpaidInvoicesData } from './dashboardData';
import styles from './UnpaidInvoices.module.css';

export default function UnpaidInvoices() {
  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.titleWrapper}>
          <Receipt size={20} className={styles.headerIcon} />
          <h3 className={styles.title}>Unpaid Invoices</h3>
        </div>
        <span className={styles.count}>{unpaidInvoicesData.length}</span>
      </div>
      
      <div className={styles.list}>
        {unpaidInvoicesData.slice(0, 5).map((invoice) => (
          <div key={invoice.id} className={styles.item}>
            <div className={styles.info}>
              <div className={styles.invoiceHeader}>
                <span className={styles.invoiceId}>{invoice.id}</span>
                <span className={styles.status}>{invoice.status}</span>
              </div>
              <div className={styles.client}>{invoice.client}</div>
              <div className={styles.description}>{invoice.description}</div>
              <div className={styles.footer}>
                <span className={styles.date}>{invoice.date}</span>
                <span className={styles.amount}>{invoice.amount}</span>
              </div>
            </div>
            <ExternalLink size={16} className={styles.linkIcon} />
          </div>
        ))}
      </div>
      
      <div className={styles.viewAll}>
        View All Invoices
      </div>
    </div>
  );
}
