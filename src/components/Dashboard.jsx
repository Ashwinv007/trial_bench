import React from 'react';
import styles from './Dashboard.module.css';
import BirthdayList from './dashboard/BirthdayList';
import ExpiringAgreements from './dashboard/ExpiringAgreements';
import UnpaidInvoices from './dashboard/UnpaidInvoices';
import RecentClients from './dashboard/RecentClients';
import LeadConversionsChart from './dashboard/LeadConversionsChart';
import RevenueChart from './dashboard/RevenueChart';
import ExpenseChart from './dashboard/ExpenseChart';
import StatsCard from './dashboard/StatsCard';
import { useStatsData } from './dashboard/useStatsData';
import { usePermissions } from '../auth/usePermissions';
import PermissionMessage from './dashboard/PermissionMessage';

export default function Dashboard() {
    const { statsData, loading } = useStatsData();
    const permissions = usePermissions();

    const showBirthdayList = permissions.hasPermission('members:view');
    const showExpiringAgreements = permissions.hasPermission('agreements:view');
    const showUnpaidInvoices = permissions.hasPermission('invoices:view');
    const showRecentClients = permissions.hasPermission('agreements:view'); // This was changed from members:view
    const showLeadConversionsChart = permissions.hasPermission('leads:view');
    const showRevenueChart = permissions.hasPermission('invoices:view');
    const showExpenseChart = permissions.hasPermission('expenses:view');


    return (
        <div className={styles.container}>
            <div className={styles.content}>
                <div className={styles.header}>
                    <h1 className={styles.title}>Dashboard</h1>
                    <p className={styles.subtitle}>An overview of your coworking space.</p>
                </div>

                {/* Stats Cards Row */}
                {!loading && (
                    <div className={styles.statsGrid}>
                        {statsData
                            .filter(stat => {
                                if (stat.title === 'Total Revenue' || stat.title === 'Pending Invoices') {
                                    return permissions.hasPermission('invoices:view');
                                }
                                if (stat.title === 'Active Members') {
                                    return permissions.hasPermission('members:view');
                                }
                                if (stat.title === 'Active Agreements') {
                                    return permissions.hasPermission('agreements:view');
                                }
                                return false; // This should ideally not be reached if all stats are covered
                            })
                            .map((stat) => (
                                <StatsCard
                                    key={stat.id}
                                    title={stat.title}
                                    value={stat.value}
                                    change={stat.change}
                                    trend={stat.trend}
                                    icon={stat.icon}
                                    color={stat.color}
                                />
                            ))}
                    </div>
                )}

                {/* Main Content Grid */}
                <div className={styles.mainGrid}>
                    {/* Left Column - Lists */}
                    {(showBirthdayList || showExpiringAgreements) && (
                        <div className={styles.leftColumn}>
                            {showBirthdayList && (
                                <div className={styles.listCard}>
                                    <BirthdayList />
                                </div>
                            )}
                            {showExpiringAgreements && (
                                <div className={styles.listCard}>
                                    <ExpiringAgreements />
                                </div>
                            )}
                        </div>
                    )}

                    {/* Right Column - Invoices & Clients */}
                    {(showUnpaidInvoices || showRecentClients) && (
                        <div className={styles.rightColumn}>
                            {showUnpaidInvoices && (
                                <div className={styles.listCard}>
                                    <UnpaidInvoices />
                                </div>
                            )}
                            {showRecentClients && (
                                <div className={styles.listCard}>
                                    <RecentClients />
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Lead Conversions Chart - Full Width */}
                {showLeadConversionsChart && (
                    <div className={styles.leadConversionsRow}>
                        <div className={styles.chartCard}>
                            <LeadConversionsChart />
                        </div>
                    </div>
                )}

                {/* Charts Row */}
                <div className={styles.chartsRow}>
                    {showRevenueChart && (
                        <div className={styles.chartCard}>
                            <RevenueChart />
                        </div>
                    )}
                    {showExpenseChart && (
                        <div className={styles.chartCard}>
                            <ExpenseChart />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
