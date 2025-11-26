import React, { useEffect, useState } from 'react';
import styles from '../Dashboard.module.css';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { usePermissions } from '../../auth/usePermissions';

const BirthdayList = () => {
    const { hasPermission } = usePermissions();
    const [birthdays, setBirthdays] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchBirthdays = async () => {
            if (hasPermission('readMember')) {
                const membersCollection = collection(db, 'leads');
                const q = query(membersCollection, where('status', '==', 'Converted'));
                const membersSnapshot = await getDocs(q);
                const birthdays = [];
                const currentMonth = new Date().getMonth() + 1; // 1-indexed
                const monthNames = ["January", "February", "March", "April", "May", "June",
                    "July", "August", "September", "October", "November", "December"
                ];

                membersSnapshot.forEach(doc => {
                    const member = doc.data();
                    if (parseInt(member.birthdayMonth, 10) === currentMonth) {
                        const monthName = monthNames[parseInt(member.birthdayMonth, 10) - 1];
                        birthdays.push({ name: member.name, date: `${monthName} ${member.birthdayDay}` });
                    }
                });
                setBirthdays(birthdays);
            }
            setLoading(false);
        };

        fetchBirthdays();
    }, [hasPermission]);

    if (loading) {
        return <p>Loading birthdays...</p>;
    }

    if (!hasPermission('readMember')) {
        return null;
    }

    return (
        <div className={styles.chartCard}>
            <h3 className={styles.chartTitle}>Birthdays This Month</h3>
            <div className={styles.clientsContainer}>
                {birthdays.length > 0 ? (
                    birthdays.map((birthday, index) => (
                        <div key={index} className={styles.clientRow}>
                            <div className={styles.clientInfo}>
                                <div className={styles.clientName}>{birthday.name}</div>
                                <div className={styles.clientEmail}>{birthday.date}</div>
                            </div>
                        </div>
                    ))
                ) : (
                    <p>No birthdays this month.</p>
                )}
            </div>
        </div>
    );
};

export default BirthdayList;
