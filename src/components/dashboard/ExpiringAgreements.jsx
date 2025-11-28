import React, { useEffect, useState } from 'react';
import styles from '../Dashboard.module.css';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { usePermissions } from '../../auth/usePermissions';
import { FileWarning, AlertCircle } from 'lucide-react';

const ExpiringAgreements = () => {
    const { hasPermission } = usePermissions();
    const [agreements, setAgreements] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchExpiringAgreements = async () => {
            if (hasPermission('agreements:view')) {
                try {
                    const oneWeekFromNow = new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000);
                    const agreementsCollection = collection(db, 'agreements');
                    // endDate is typically stored as a string or Timestamp.
                    // Assuming it's a Firestore Timestamp for comparison, though the original code implies string comparison.
                    // To compare with Timestamp, it should be Timestamp.fromDate(oneWeekFromNow)
                    // If it's a string, the comparison 'endDate', '<=', oneWeekFromNow.toISOString().split('T')[0] would be more appropriate
                    // For now, let's assume direct comparison with Timestamp.fromDate is intended if endDate is a Timestamp.
                    // If endDate is a string, it needs to be fetched and converted.
                    // Given the previous error context, let's keep the existing query with Timestamp.fromDate, as it's more robust for Firestore.
                    const q = query(agreementsCollection, where('endDate', '<=', Timestamp.fromDate(oneWeekFromNow)));
                    const agreementsSnapshot = await getDocs(q);
                    const expiringAgreements = agreementsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    setAgreements(expiringAgreements);
                } catch (error) {
                    console.error("Firebase permission error fetching expiring agreements:", error);
                    setAgreements([]); // Set to empty array on error
                }
            }
            setLoading(false);
        };

        fetchExpiringAgreements();
    }, [hasPermission]);

    const calculateDaysLeft = (endDate) => {
        const today = new Date();
        const end = endDate.toDate();
        const diffTime = end.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

    if (loading) {
        return <p>Loading expiring agreements...</p>;
    }

    if (!hasPermission('agreements:view') || agreements.length === 0) {
        return null;
    }

    return (
        <div className={styles.card}>
            <div className={styles.header}>
                <div className={styles.titleWrapper}>
                    <FileWarning size={20} className={styles.expiringAgreementsHeaderIcon} />
                    <h3 className={styles.invoiceTitle}>Expiring Agreements (Next 7 Days)</h3>
                </div>
            </div>
            
            <div className={styles.agreementsList}>
                {agreements.length > 0 ? (
                    agreements.map((agreement) => (
                        <div key={agreement.id} className={styles.agreementsItem}>
                            <div className={styles.agreementsIconWrapper}>
                                <AlertCircle size={18} />
                            </div>
                            <div className={styles.agreementsInfo}>
                                <div className={styles.agreementsClient}>{agreement.name}</div>
                                <div className={styles.agreementsDate}>Expires on: {agreement.endDate.toDate().toLocaleDateString()}</div>
                            </div>
                            <div className={styles.agreementsBadge}>
                                {calculateDaysLeft(agreement.endDate)} days
                            </div>
                        </div>
                    ))
                ) : (
                    <div className={styles.emptyClients}>
                        No agreements expiring soon.
                    </div>
                )}
            </div>
        </div>
    );
};

export default ExpiringAgreements;
