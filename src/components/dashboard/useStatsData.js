import { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
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
        { id: 3, title: 'Pending Invoices', value: '0', change: '0', trend: 'down', icon: 'FileText', color: '#2b7a8e' },
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
            const thirtyDaysAgo = new Date(new Date().setHours(0,0,0,0)).setDate(today.getDate() - 30);
            const sixtyDaysAgo = new Date(new Date().setHours(0,0,0,0)).setDate(today.getDate() - 60);

            let revenueCurrent = 0, revenuePrevious = 0;
            let newMembersCurrent = 0, newMembersPrevious = 0;
            let newAgreementsCurrent = 0, newAgreementsPrevious = 0;

            if (hasPermission('invoices:view')) {
                const invCol = collection(db, 'invoices');
                const invSnap = await getDocs(query(invCol, where('paymentStatus', '==', 'Paid')));
                invSnap.forEach(doc => {
                    const invoice = doc.data();
                    const invoiceDate = parseDate(invoice.invoiceDate);
                    if (!invoiceDate) return;

                    const price = parseFloat(invoice.totalPrice) || 0;
                    if (invoiceDate >= thirtyDaysAgo) {
                        revenueCurrent += price;
                    } else if (invoiceDate >= sixtyDaysAgo && invoiceDate < thirtyDaysAgo) {
                        revenuePrevious += price;
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

            let totalPendingInvoices = 0;
            if (hasPermission('invoices:view')) {
                const q = query(collection(db, 'invoices'), where('paymentStatus', '!=', 'Paid'));
                totalPendingInvoices = (await getDocs(q)).size;
            }
            
            // --- Calculate trends ---
            const revenueTrend = calculateChange(revenueCurrent, revenuePrevious);
            const membersTrend = calculateChange(newMembersCurrent, newMembersPrevious);
            const agreementsTrend = calculateChange(newAgreementsCurrent, newAgreementsPrevious);

            // --- Format values ---
            const formatRevenue = (rev) => rev >= 100000 ? `₹${(rev / 100000).toFixed(2)} L` : `₹${rev.toLocaleString('en-IN')}`;

            setStatsData([
                { id: 1, title: 'Total Revenue (30d)', value: formatRevenue(revenueCurrent), change: revenueTrend.change, trend: revenueTrend.trend, icon: 'IndianRupee', color: '#2b7a8e' },
                { id: 2, title: 'Active Members', value: totalActiveClients.toString(), change: `+${newMembersCurrent}`, trend: membersTrend.trend, icon: 'Users', color: '#1a4d5c' },
                { id: 3, title: 'Pending Invoices', value: totalPendingInvoices.toString(), change: '', trend: 'down', icon: 'FileText', color: '#2b7a8e' },
                { id: 4, title: 'New Agreements (30d)', value: newAgreementsCurrent.toString(), change: agreementsTrend.change, trend: agreementsTrend.trend, icon: 'FileCheck', color: '#1a4d5c' }
            ]);

            setLoading(false);
        };

        fetchStatsData().catch(console.error);
    }, [hasPermission]);

    return { statsData, loading };
};
