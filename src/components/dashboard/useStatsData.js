import { useState, useEffect } from 'react';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { usePermissions } from '../../auth/usePermissions';

// Helper to safely parse date fields which could be Timestamps or strings
const parseDate = (dateField) => {
    if (!dateField) return null;
    // If it's a Firestore Timestamp, it will have a toDate method
    if (typeof dateField.toDate === 'function') {
        return dateField.toDate();
    }
    // Otherwise, assume it's a string or number that the Date constructor can parse
    return new Date(dateField);
};


// Helper function to calculate trend
const calculateChange = (current, previous) => {
    if (previous === 0) {
        return current > 0 ? { trend: 'up', change: '+100%' } : { trend: 'up', change: '+0%' };
    }
    const percentageChange = ((current - previous) / previous) * 100;
    const trend = percentageChange >= 0 ? 'up' : 'down';
    const change = `${percentageChange >= 0 ? '+' : ''}${Math.round(percentageChange)}%`;
    return { trend, change };
};


export const useStatsData = () => {
    const { hasPermission } = usePermissions();
    const [statsData, setStatsData] = useState([
        // Initial placeholder data
        { id: 1, title: 'Total Revenue (30d)', value: '₹0', change: '+0%', trend: 'up', icon: 'IndianRupee', color: '#2b7a8e' },
        { id: 2, title: 'Active Members', value: '0', change: '+0', trend: 'up', icon: 'Users', color: '#1a4d5c' },
        { id: 3, title: 'Pending Amount', value: '₹0', change: '0', trend: 'down', icon: 'FileText', color: '#2b7a8e' },
        { id: 4, title: 'New Agreements (30d)', value: '0', change: '+0', trend: 'up', icon: 'FileCheck', color: '#1a4d5c' }
    ]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStatsData = async () => {
            if (!hasPermission('invoices:view') && !hasPermission('members:view') && !hasPermission('agreements:view')) {
                setLoading(false);
                return;
            }

            const today = new Date();
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setHours(0, 0, 0, 0);
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            const sixtyDaysAgo = new Date();
            sixtyDaysAgo.setHours(0, 0, 0, 0);
            sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

            const firestoreThirtyDaysAgo = Timestamp.fromDate(thirtyDaysAgo);
            const firestoreSixtyDaysAgo = Timestamp.fromDate(sixtyDaysAgo);

            let revenueCurrent = 0, revenuePrevious = 0;
            let newMembersCurrent = 0, newMembersPrevious = 0;
            let newAgreementsCurrent = 0, newAgreementsPrevious = 0;
            let totalPendingAmount = 0;
            let pendingAmountCurrent = 0;
            let pendingAmountPrevious = 0;

            if (hasPermission('invoices:view')) {
                const invCol = collection(db, 'invoices');
                
                // Revenue
                const qCurrent = query(invCol, where('paymentStatus', '==', 'Paid'), where('date', '>=', firestoreThirtyDaysAgo));
                const invSnapCurrent = await getDocs(qCurrent);
                invSnapCurrent.forEach(doc => {
                    revenueCurrent += parseFloat(doc.data().totalPrice) || 0;
                });

                const qPrevious = query(invCol, where('paymentStatus', '==', 'Paid'), where('date', '>=', firestoreSixtyDaysAgo), where('date', '<', firestoreThirtyDaysAgo));
                const invSnapPrevious = await getDocs(qPrevious);
                invSnapPrevious.forEach(doc => {
                    revenuePrevious += parseFloat(doc.data().totalPrice) || 0;
                });
                
                // Pending Invoices
                const allInvoicesSnap = await getDocs(invCol);
                const allInvoices = allInvoicesSnap.docs.map(doc => doc.data());
                const unpaidInvoices = allInvoices.filter(invoice => invoice.paymentStatus !== 'Paid');
                
                unpaidInvoices.forEach(invoice => {
                    const amount = parseFloat(invoice.totalAmountPayable) || 0;
                    totalPendingAmount += amount;

                    const invoiceDate = parseDate(invoice.date);
                    if (!invoiceDate) return;
                    
                    if (invoiceDate >= thirtyDaysAgo) {
                        pendingAmountCurrent += amount;
                    } else if (invoiceDate >= sixtyDaysAgo && invoiceDate < thirtyDaysAgo) {
                        pendingAmountPrevious += amount;
                    }
                });
            }

            if (hasPermission('members:view')) {
                const memCol = collection(db, 'members');
                const memSnap = await getDocs(memCol);
                memSnap.forEach(doc => {
                    const member = doc.data();
                    const createdDate = parseDate(member.createdAt);
                     if (!createdDate) return;

                    if (createdDate >= thirtyDaysAgo) {
                        newMembersCurrent++;
                    } else if (createdDate >= sixtyDaysAgo && createdDate < thirtyDaysAgo) {
                        newMembersPrevious++;
                    }
                });
            }
            
            if (hasPermission('agreements:view')) {
                const agrCol = collection(db, 'agreements');
                const agrSnap = await getDocs(agrCol);
                 agrSnap.forEach(doc => {
                    const agreement = doc.data();
                    const startDate = parseDate(agreement.startDate);
                    if (!startDate) return;

                    if (startDate >= thirtyDaysAgo) {
                        newAgreementsCurrent++;
                    } else if (startDate >= sixtyDaysAgo && startDate < thirtyDaysAgo) {
                        newAgreementsPrevious++;
                    }
                });
            }

            // --- Point-in-time stats ---
            let totalActiveClients = 0;
            if (hasPermission('members:view')) {
                totalActiveClients = (await getDocs(collection(db, 'members'))).size;
            }
            
            // --- Calculate trends ---
            const revenueTrend = calculateChange(revenueCurrent, revenuePrevious);
            const membersTrend = calculateChange(newMembersCurrent, newMembersPrevious);
            const agreementsTrend = calculateChange(newAgreementsCurrent, newAgreementsPrevious);
            const pendingTrend = calculateChange(pendingAmountCurrent, pendingAmountPrevious);
            pendingTrend.trend = pendingTrend.trend === 'up' ? 'down' : 'up'; // More pending is bad

            // --- Format values ---
            const formatRevenue = (rev) => rev >= 100000 ? `₹${(rev / 100000).toFixed(2)} L` : `₹${rev.toLocaleString('en-IN')}`;

            setStatsData([
                { id: 1, title: 'Total Revenue (30d)', value: formatRevenue(revenueCurrent), change: revenueTrend.change, trend: revenueTrend.trend, icon: 'IndianRupee', color: '#2b7a8e' },
                { id: 2, title: 'Active Members', value: totalActiveClients.toString(), change: `+${newMembersCurrent}`, trend: membersTrend.trend, icon: 'Users', color: '#1a4d5c' },
                { id: 3, title: 'Pending Amount', value: formatRevenue(totalPendingAmount), change: pendingTrend.change, trend: pendingTrend.trend, icon: 'FileText', color: '#2b7a8e' },
                { id: 4, title: 'New Agreements (30d)', value: newAgreementsCurrent.toString(), change: agreementsTrend.change, trend: agreementsTrend.trend, icon: 'FileCheck', color: '#1a4d5c' }
            ]);

            setLoading(false);
        };

        fetchStatsData().catch(console.error);
    }, [hasPermission]);

    return { statsData, loading };
};
