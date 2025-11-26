import React, { useEffect, useState } from 'react';
import styles from '../Dashboard.module.css';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { usePermissions } from '../../auth/usePermissions';

const ExpiringAgreements = () => {
    const { hasPermission } = usePermissions();
    const [agreements, setAgreements] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchExpiringAgreements = async () => {
            if (hasPermission('readAgreement')) {
                const oneWeekFromNow = new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000);
                const agreementsCollection = collection(db, 'agreements');
                const q = query(agreementsCollection, where('endDate', '<=', Timestamp.fromDate(oneWeekFromNow)));
                const agreementsSnapshot = await getDocs(q);
                const expiringAgreements = agreementsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setAgreements(expiringAgreements);
            }
            setLoading(false);
        };

        fetchExpiringAgreements();
    }, [hasPermission]);

    if (loading) {
        return <p>Loading expiring agreements...</p>;
    }

    if (!hasPermission('readAgreement')) {
        return null;
    }

    return (
        <div className={styles.chartCard}>
            <h3 className={styles.chartTitle}>Expiring Agreements (Next 7 Days)</h3>
            <div className={styles.clientsContainer}>
                {agreements.length > 0 ? (
                    agreements.map((agreement) => (
                        <div key={agreement.id} className={styles.clientRow}>
                            <div className={styles.clientInfo}>
                                <div className={styles.clientName}>{agreement.name}</div>
                                <div className={styles.clientEmail}>
                                    Expires on: {agreement.endDate.toDate().toLocaleDateString()}
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <p>No agreements expiring soon.</p>
                )}
            </div>
        </div>
    );
};

export default ExpiringAgreements;
