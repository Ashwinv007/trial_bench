import React from 'react';
import styles from './dashboardUIref.module.css';
import StatsCard from './dashboardUIref/StatsCard';
import BirthdayList from './dashboardUIref/BirthdayList';
import ExpiringAgreements from './dashboardUIref/ExpiringAgreements';
import UnpaidInvoices from './dashboardUIref/UnpaidInvoices';
import RecentClients from './dashboardUIref/RecentClients';
import LeadConversionsChart from './dashboardUIref/LeadConversionsChart';
import RevenueChart from './dashboardUIref/RevenueChart';
import ExpenseChart from './dashboardUIref/ExpenseChart';
import { statsData } from './dashboardUIref/dashboardData';

export default function Dashboard() {
    return (
        <div className={styles.container}>
            <div className={styles.content}>
                {/* Stats Cards Row */}
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
                    <LeadConversionsChart />
                </div>

                {/* Charts Row */}
                <div className={styles.chartsRow}>
                    <div className={styles.chartCard}>
                        <RevenueChart />
                    </div>
                    <div className={styles.chartCard}>
                        <ExpenseChart />
                    </div>
                </div>
            </div>
        </div>
    );
}