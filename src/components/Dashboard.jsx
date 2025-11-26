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
                        {statsData.map((stat) => (
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
                    <div className={styles.leftColumn}>
                        <div className={styles.listCard}>
                            <BirthdayList />
                        </div>
                        <div className={styles.listCard}>
                            <ExpiringAgreements />
                        </div>
                    </div>

                    {/* Right Column - Invoices & Clients */}
                    <div className={styles.rightColumn}>
                        <div className={styles.listCard}>
                            <UnpaidInvoices />
                        </div>
                        <div className={styles.listCard}>
                            <RecentClients />
                        </div>
                    </div>
                </div>

                {/* Lead Conversions Chart - Full Width */}
                <div className={styles.leadConversionsRow}>
                    <div className={styles.chartCard}>
                        <LeadConversionsChart />
                    </div>
                </div>

                {/* Charts Row */}
                <div className={styles.chartsRow}>
                    <div className={styles.chartCard}>
                        {permissions.hasPermission('readInvoice') ? <RevenueChart /> : <PermissionMessage item="revenue chart" />}
                    </div>
                    <div className={styles.chartCard}>
                        {permissions.hasPermission('readExpense') ? <ExpenseChart /> : <PermissionMessage item="expense chart" />}
                    </div>
                </div>
            </div>
        </div>
    );
}
