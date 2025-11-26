
import React, { useEffect, useState } from 'react';
import styles from '../Dashboard.module.css';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { usePermissions } from '../../auth/usePermissions';

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

    if (loading) {
        return <p>Loading recent clients...</p>;
    }

    if (!hasPermission('readMember')) {
        return null;
    }

    return (
        <div className={styles.chartCard}>
            <h3 className={styles.chartTitle}>Recent Converted Clients (This Week)</h3>
            <div className={styles.clientsContainer}>
                {recentClients.length > 0 ? (
                    recentClients.map((client) => (
                        <div key={client.id} className={styles.clientRow}>
                            <div className={styles.clientInfo}>
                                <div className={styles.clientName}>{client.name}</div>
                            </div>
                        </div>
                    ))
                ) : (
                    <p>No new clients this week.</p>
                )}
            </div>
        </div>
    );
};

export default RecentClients;
