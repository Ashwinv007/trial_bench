import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from '../Dashboard.module.css';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { usePermissions } from '../../auth/usePermissions';
import { Cake } from 'lucide-react';

const PastMembersBirthday = () => {
    const { hasPermission } = usePermissions();
    const [birthdays, setBirthdays] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const currentMonth = new Date().getMonth() + 1;

    useEffect(() => {
        const fetchBirthdays = async () => {
            try {
                const membersCollection = collection(db, 'past_members');
                const membersSnapshot = await getDocs(membersCollection);
                const fetchedBirthdays = [];
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
                console.error("Firebase permission error fetching past member birthdays:", error);
                setBirthdays([]);
            } finally {
                setLoading(false);
            }
        };

        if (hasPermission('members:view')) { // Assuming same permission
            fetchBirthdays();
        } else {
            setLoading(false);
            setBirthdays([]);
        }
    }, [hasPermission, currentMonth]);

    const handleNavigate = (e) => {
        e.stopPropagation(); // Prevent card click if button is clicked
        navigate(`/past-members?birthdayMonth=${currentMonth}`);
    };

    const getInitials = (name) => {
        if (!name) return '';
        return name.split(' ').map(word => word[0]).join('').toUpperCase().substring(0, 2);
    };

    if (loading && birthdays.length === 0) {
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
                    <h3 className={styles.invoiceTitle}>Past Members' Birthdays</h3>
                </div>
                <span className={styles.count}>{birthdays.length}</span>
            </div>
            
            <div className={styles.birthdaysList}>
                {birthdays.map((birthday, index) => (
                    <div key={index} className={styles.birthdaysItem}>
                        <div className={styles.birthdaysAvatar}>
                            {getInitials(birthday.name)}
                        </div>
                        <div className={styles.birthdaysInfo}>
                            <div className={styles.birthdaysName}>{birthday.name}</div>
                            <div className={styles.birthdaysDate}>{birthday.date}</div>
                        </div>
                    </div>
                ))}
            </div>
            {/* <div className={styles.viewAll} onClick={handleNavigate}>
                View All
            </div> */}
        </div>
    );
};

export default PastMembersBirthday;
