import { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { usePermissions } from '../../auth/usePermissions';

export const useStatsData = () => {
    const { hasPermission } = usePermissions();
    const [statsData, setStatsData] = useState([
        {
            id: 1,
            title: 'Total Revenue',
            value: '$0',
            change: '+0%',
            trend: 'up',
            icon: 'DollarSign',
            color: '#2b7a8e'
        },
        {
            id: 2,
            title: 'Active Clients',
            value: '0',
            change: '+0',
            trend: 'up',
            icon: 'Users',
            color: '#1a4d5c'
        },
        {
            id: 3,
            title: 'Pending Invoices',
            value: '0',
            change: '-0',
            trend: 'down',
            icon: 'FileText',
            color: '#2b7a8e'
        },
        {
            id: 4,
            title: 'Active Agreements',
            value: '0',
            change: '+0',
            trend: 'up',
            icon: 'FileCheck',
            color: '#1a4d5c'
        }
    ]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStatsData = async () => {
            if (!hasPermission('readInvoice') && !hasPermission('readMember') && !hasPermission('readAgreement')) {
                setLoading(false);
                return;
            }

            let totalRevenue = 0;
            let activeClients = 0;
            let pendingInvoices = 0;
            let activeAgreements = 0;

            if (hasPermission('readInvoice')) {
                const invoicesCollection = collection(db, 'invoices');
                const invoicesSnapshot = await getDocs(invoicesCollection);
                invoicesSnapshot.forEach(doc => {
                    const invoice = doc.data();
                    if (invoice.paymentStatus === 'Paid') {
                        totalRevenue += invoice.totalAmountPayable;
                    }
                    if (invoice.paymentStatus !== 'Paid') {
                        pendingInvoices++;
                    }
                });
            }

            if (hasPermission('readMember')) {
                const membersCollection = collection(db, 'leads');
                const q = query(membersCollection, where('status', '==', 'Converted'));
                const membersSnapshot = await getDocs(q);
                activeClients = membersSnapshot.size;
            }
            
            if (hasPermission('readAgreement')) {
                const agreementsCollection = collection(db, 'agreements');
                const q = query(agreementsCollection, where('status', '!=', 'terminated'));
                const agreementsSnapshot = await getDocs(q);
                activeAgreements = agreementsSnapshot.size;
            }

            setStatsData([
                {
                    id: 1,
                    title: 'Total Revenue',
                    value: `$${totalRevenue.toLocaleString()}`,
                    change: '+0%', // Placeholder
                    trend: 'up',
                    icon: 'DollarSign',
                    color: '#2b7a8e'
                },
                {
                    id: 2,
                    title: 'Active Clients',
                    value: activeClients.toString(),
                    change: '+0', // Placeholder
                    trend: 'up',
                    icon: 'Users',
                    color: '#1a4d5c'
                },
                {
                    id: 3,
                    title: 'Pending Invoices',
                    value: pendingInvoices.toString(),
                    change: '-0', // Placeholder
                    trend: 'down',
                    icon: 'FileText',
                    color: '#2b7a8e'
                },
                {
                    id: 4,
                    title: 'Active Agreements',
                    value: activeAgreements.toString(),
                    change: '+0', // Placeholder
                    trend: 'up',
                    icon: 'FileCheck',
                    color: '#1a4d5c'
                }
            ]);

            setLoading(false);
        };

        fetchStatsData();
    }, [hasPermission]);

    return { statsData, loading };
};
