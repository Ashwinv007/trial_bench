
import React, { useEffect, useState } from 'react';
import styles from '../Dashboard.module.css';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { usePermissions } from '../../auth/usePermissions';
import { UserCheck, Mail, FileCheck } from 'lucide-react';

const statusIcons = {
  'Sent email': Mail,
  'Contract signed': FileCheck,
  'Converted': UserCheck, // Assuming 'Converted' is a status
};

const RecentClients = () => {
    const { hasPermission } = usePermissions();
    const [recentClients, setRecentClients] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRecentClients = async () => {
            if (hasPermission('readMember')) {
                const now = new Date();
                const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                const leadsCollection = collection(db, 'leads');
                const q = query(
                    leadsCollection,
                    where('status', '==', 'Converted'),
                    where('lastEditedAt', '>=', Timestamp.fromDate(oneWeekAgo))
                );
                const snapshot = await getDocs(q);
                const clients = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setRecentClients(clients);
            }
            setLoading(false);
        };

        fetchRecentClients();
    }, [hasPermission]);

    const getInitials = (name) => {
        if (!name) return '';
        return name.split(' ').map(word => word[0]).join('').toUpperCase().substring(0, 2);
    };

    const formatDate = (date) => {
        const today = new Date();
        const itemDate = date.toDate();
        if (today.toDateString() === itemDate.toDateString()) {
            return 'Today';
        }
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        if (yesterday.toDateString() === itemDate.toDateString()) {
            return 'Yesterday';
        }
        return itemDate.toLocaleDateString();
    };


    if (loading) {
        return <p>Loading recent clients...</p>;
    }

    if (!hasPermission('readMember')) {
        return null;
    }

    return (
        <div className={styles.card}>
            <div className={styles.header}>
                <div className={styles.titleWrapper}>
                    <UserCheck size={20} className={styles.clientsHeaderIcon} />
                    <h3 className={styles.invoiceTitle}>Recent Converted Clients (This Week)</h3>
                </div>
            </div>
            
            <div className={styles.clientList}>
                {recentClients.length > 0 ? (
                    recentClients.slice(0, 5).map((client) => {
                        const StatusIcon = statusIcons[client.status] || Mail;
                        return (
                            <div key={client.id} className={styles.clientItem}>
                                <div className={styles.avatar}>
                                    {getInitials(client.name)}
                                </div>
                                <div className={styles.clientInfo}>
                                    <div className={styles.clientName}>{client.name}</div>
                                    <div className={styles.statusWrapper}>
                                        <StatusIcon size={14} />
                                        <span className={styles.clientStatus}>{client.status}</span>
                                    </div>
                                </div>
                                <div className={styles.clientDate}>{formatDate(client.lastEditedAt)}</div>
                            </div>
                        );
                    })
                ) : (
                    <div className={styles.emptyClients}>
                        No converted clients this week
                    </div>
                )}
            </div>
        </div>
    );
};

export default RecentClients;
