import React, { useEffect, useState } from 'react';
import styles from '../Dashboard.module.css';
import { collection, getDocs, query } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { usePermissions } from '../../auth/usePermissions';
import { Receipt, ExternalLink } from 'lucide-react';

const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
};

const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(amount);
};

const UnpaidInvoices = () => {
    const { hasPermission } = usePermissions();
    const [unpaidInvoices, setUnpaidInvoices] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUnpaidInvoices = async () => {
            if (hasPermission('readInvoice')) {
                const invoicesCollection = collection(db, 'invoices');
                const invoicesSnapshot = await getDocs(invoicesCollection);
                const allInvoices = invoicesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                const unpaid = allInvoices.filter(invoice => invoice.paymentStatus !== 'Paid');
                setUnpaidInvoices(unpaid);
            }
            setLoading(false);
        };

        fetchUnpaidInvoices();
    }, [hasPermission]);

    if (loading) {
        return <p>Loading unpaid invoices...</p>;
    }

    if (!hasPermission('readInvoice')) {
        return null;
    }

    return (
        <div className={styles.card}>
            <div className={styles.header}>
                <div className={styles.titleWrapper}>
                    <Receipt size={20} className={styles.headerIcon} />
                    <h3 className={styles.invoiceTitle}>Unpaid Invoices</h3>
                </div>
                <span className={styles.count}>{unpaidInvoices.length}</span>
            </div>

            <div className={styles.list}>
                {unpaidInvoices.slice(0, 5).map((invoice) => (
                    <div key={invoice.id} className={styles.item}>
                        <div className={styles.info}>
                            <div className={styles.invoiceHeader}>
                                <span className={styles.invoiceId}>{invoice.invoiceNumber || `#${invoice.id}`}</span>
                                <span className={styles.status}>{invoice.paymentStatus || 'Unpaid'}</span>
                            </div>
                            <div className={styles.client}>{invoice.clientName || invoice.name}</div>
                            <div className={styles.description}>{invoice.items && invoice.items[0]?.description}</div>
                            <div className={styles.footer}>
                                <span className={styles.date}>{formatDate(invoice.date)}</span>
                                <span className={styles.amount}>{formatCurrency(invoice.totalAmountPayable)}</span>
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
};

export default UnpaidInvoices;
