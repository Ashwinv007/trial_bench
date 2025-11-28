
import React, { useEffect, useState } from 'react';
import styles from '../Dashboard.module.css';
import { collection, getDocs, query, where, Timestamp, doc, getDoc } from 'firebase/firestore';
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
            if (hasPermission('agreements:view')) {
                const now = new Date();
                const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

                const agreementsCollection = collection(db, 'agreements');
                // Query agreements made in the last week
                const agreementsQuery = query(
                    agreementsCollection,
                    where('agreementDate', '>=', oneWeekAgo.toISOString().split('T')[0]) // agreementDate is stored as YYYY-MM-DD string
                );
                const agreementsSnapshot = await getDocs(agreementsQuery);
                const recentAgreements = agreementsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                const clientPromises = recentAgreements.map(async (agreement) => {
                    let leadData = null;
                    if (agreement.leadId && hasPermission('leads:view')) {
                        try {
                            const leadDocRef = doc(db, 'leads', agreement.leadId);
                            const leadSnapshot = await getDoc(leadDocRef);
                            leadData = leadSnapshot.exists() ? leadSnapshot.data() : null;
                        } catch (error) {
                            console.warn(`Could not fetch lead data for agreement ${agreement.id} due to permissions:`, error);
                            // Even if lead data fails, we can still show client info from agreement
                        }
                    }
                    
                    // Combine lead and agreement data, prioritizing agreement.memberLegalName
                    // If leadData is null, it will gracefully use agreement data
                    const effectiveLastEditedAt = agreement.lastEditedAt || agreement.agreementDate || (leadData ? leadData.lastEditedAt : null);

                    return { 
                        ...leadData, 
                        ...agreement, 
                        memberLegalName: agreement.memberLegalName || (leadData ? leadData.memberLegalName || leadData.name : null), // Explicitly populate memberLegalName
                        name: agreement.memberLegalName || (leadData ? leadData.name : null) || agreement.name, // General name property
                        lastEditedAt: effectiveLastEditedAt // Ensure a date property is always present
                    };
                });
                
                const combinedClients = (await Promise.all(clientPromises)).filter(Boolean);

                // Sort by agreementDate in descending order to show most recent first
                combinedClients.sort((a, b) => {
                    const dateA = new Date(a.agreementDate);
                    const dateB = new Date(b.agreementDate);
                    return dateB.getTime() - dateA.getTime();
                });

                setRecentClients(combinedClients);
            }
            setLoading(false);
        };

        fetchRecentClients();
    }, [hasPermission]);

    const getInitials = (name) => {
        if (!name) return '';
        return name.split(' ').map(word => word[0]).join('').toUpperCase().substring(0, 2);
    };

    const formatDate = (dateInput) => {
        if (!dateInput) return '-'; // Handle undefined/null input

        let itemDate;
        if (typeof dateInput.toDate === 'function') { // It's a Firestore Timestamp
            itemDate = dateInput.toDate();
        } else if (typeof dateInput === 'string') { // It's a date string
            itemDate = new Date(dateInput);
        } else if (dateInput instanceof Date) { // It's already a JS Date object
            itemDate = dateInput;
        } else {
            return '-'; // Unhandled date format
        }

        const today = new Date();
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

    if (recentClients.length === 0) {
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
                                    {getInitials(client.memberLegalName || client.name)}
                                </div>
                                <div className={styles.clientInfo}>
                                    <div className={styles.clientName}>{client.memberLegalName || client.name}</div>
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
