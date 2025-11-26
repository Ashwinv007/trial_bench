import React, { useEffect, useState } from 'react';
import styles from '../Dashboard.module.css';
import { collection, getDocs, query } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { usePermissions } from '../../auth/usePermissions';
import { Card, CardContent, Chip } from '@mui/material';

const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
};

const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(amount);
};

const getPaymentStatusColor = (status) => {
    switch (status?.toLowerCase()) {
        case 'paid': return '#4caf50';
        case 'unpaid': return '#f44336';
        case 'overdue': return '#ff9800';
        case 'partially paid': return '#2196f3';
        default: return '#9e9e9e';
    }
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
        <div className={styles.chartCard}>
            <h3 className={styles.chartTitle}>Unpaid Invoices</h3>
            <div className={styles.clientsContainer}>
                {unpaidInvoices.length > 0 ? (
                    unpaidInvoices.map((invoice) => (
                        <Card key={invoice.id} className={styles.invoiceCard}>
                            <CardContent>
                                <div className={styles.invoiceHeader}>
                                    <div className={styles.invoiceNumber}>Invoice {invoice.invoiceNumber || `#${invoice.id}`}</div>
                                    <Chip
                                        label={invoice.paymentStatus || 'Unpaid'}
                                        size="small"
                                        style={{
                                            backgroundColor: getPaymentStatusColor(invoice.paymentStatus || 'unpaid') + '20',
                                            color: getPaymentStatusColor(invoice.paymentStatus || 'unpaid'),
                                            borderLeft: `3px solid ${getPaymentStatusColor(invoice.paymentStatus || 'unpaid')}`
                                        }}
                                    />
                                </div>
                                <div className={styles.invoiceDetails}>
                                    <div className={styles.invoiceDetailRow}><span className={styles.invoiceLabel}>Client:</span><span className={styles.invoiceValue}>{invoice.clientName || invoice.name}</span></div>
                                    <div className={styles.invoiceDetailRow}><span className={styles.invoiceLabel}>Date:</span><span className={styles.invoiceValue}>{formatDate(invoice.date)}</span></div>
                                    <div className={styles.invoiceDetailRow}><span className={styles.invoiceLabel}>Amount:</span><span className={styles.invoiceValue}>{formatCurrency(invoice.totalAmountPayable)}</span></div>
                                    {invoice.items && invoice.items[0]?.description && <div className={styles.invoiceDetailRow}><span className={styles.invoiceLabel}>Description:</span><span className={styles.invoiceValue}>{invoice.items[0].description}</span></div>}
                                </div>
                            </CardContent>
                        </Card>
                    ))
                ) : (
                    <p>No unpaid invoices.</p>
                )}
            </div>
        </div>
    );
};

export default UnpaidInvoices;
