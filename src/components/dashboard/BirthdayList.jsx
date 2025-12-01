import React, { useEffect, useState } from 'react';
import styles from '../Dashboard.module.css';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { usePermissions } from '../../auth/usePermissions';
import { Cake } from 'lucide-react';

const BirthdayList = () => {
    const { hasPermission } = usePermissions();
    const [birthdays, setBirthdays] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchBirthdays = async () => {
            try {
                const membersCollection = collection(db, 'leads');
                const q = query(membersCollection, where('status', '==', 'Converted'));
                const membersSnapshot = await getDocs(q);
                const fetchedBirthdays = [];
                const currentMonth = new Date().getMonth() + 1; // 1-indexed
                const monthNames = ["January", "February", "March", "April", "May", "June",
                    "July", "August", "September", "October", "November", "December"
                ];

                membersSnapshot.forEach(doc => {
                    const member = doc.data();
                    if (parseInt(member.birthdayMonth, 10) === currentMonth) {
                        const monthName = monthNames[parseInt(member.birthdayMonth, 10) - 1];
                        fetchedBirthdays.push({ name: member.name, date: `${monthName} ${member.birthdayDay}` });
                    }
                });
                setBirthdays(fetchedBirthdays);
            } catch (error) {
                console.error("Firebase permission error fetching birthdays:", error);
                setBirthdays([]); // Set birthdays to empty array on error
            } finally {
                setLoading(false);
            }
        };

        if (hasPermission('members:view')) {
            fetchBirthdays();
        } else {
            setLoading(false);
            setBirthdays([]);
        }
    }, [hasPermission]);

    const getInitials = (name) => {
        if (!name) return '';
        return name.split(' ').map(word => word[0]).join('').toUpperCase().substring(0, 2);
    };

    if (loading) {
        return null;
    }

    if (!hasPermission('members:view') || birthdays.length === 0) {
        return null;
    }

    return (
        <div className={styles.card}>
            <div className={styles.header}>
                <div className={styles.titleWrapper}>
                    <Cake size={20} className={styles.birthdaysHeaderIcon} />
                    <h3 className={styles.invoiceTitle}>Birthdays This Month</h3>
                </div>
                <span className={styles.count}>{birthdays.length}</span>
            </div>
            
            <div className={styles.birthdaysList}>
                {birthdays.length > 0 ? (
                    birthdays.slice(0, 5).map((birthday, index) => (
                        <div key={index} className={styles.birthdaysItem}>
                            <div className={styles.birthdaysAvatar}>
                                {getInitials(birthday.name)}
                            </div>
                            <div className={styles.birthdaysInfo}>
                                <div className={styles.birthdaysName}>{birthday.name}</div>
                                <div className={styles.birthdaysDate}>{birthday.date}</div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className={styles.emptyClients}>
                        No birthdays this month.
                    </div>
                )}
            </div>
        </div>
    );
};

export default BirthdayList;