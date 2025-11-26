import { AttachMoney, Adjust, People } from '@mui/icons-material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import styles from './Dashboard.module.css';

const revenueData = [
  { month: 'Jan', value: 4.4 },
  { month: 'Feb', value: 3.8 },
  { month: 'Mar', value: 3.2 },
  { month: 'Apr', value: 2.8 },
  { month: 'May', value: 4.2 },
  { month: 'Jun', value: 4.0 },
  { month: 'Jul', value: 3.4 },
  { month: 'Aug', value: 4.5 },
  { month: 'Sep', value: 2.6 },
  { month: 'Oct', value: 3.2 },
  { month: 'Nov', value: 3.6 },
  { month: 'Dec', value: 4.2 },
];

const clients = [
  {
    name: 'Alice Johnson',
    email: 'alice@innovate.com',
    initials: 'AJ',
    plan: 'Dedicated',
    status: 'Active',
    rate: '$450/h',
  },
  {
    name: 'Bob Williams',
    email: 'bob@solutions.io',
    initials: 'BW',
    plan: 'Flexi',
    status: 'Active',
    rate: '$200/h',
  },
  {
    name: 'Charlie Brown',
    email: 'charlie@creative.co',
    initials: 'CB',
    plan: 'Private Cabin',
    status: 'Past Due',
    rate: '$1200/h',
  },
  {
    name: 'Diana Prince',
    email: 'diana@themyscira.corp',
    initials: 'DP',
    plan: 'Dedicated',
    status: 'Active',
    rate: '$450/h',
  },
];

const statCards = [
  {
    title: 'Monthly Revenue',
    value: '$2,780',
    subtitle: 'From active subscriptions',
    icon: AttachMoney,
  },
  {
    title: 'Active Subscriptions',
    value: '5',
    subtitle: '71% of total clients',
    icon: Adjust,
  },
  {
    title: 'Total Clients',
    value: '7',
    subtitle: 'All-time registered clients',
    icon: People,
  },
];

export default function Dashboard() {
  return (
    <div className={styles.container}>
      <div className={styles.content}>
        {/* Header */}
        <div className={styles.header}>
          <h1 className={styles.title}>Dashboard</h1>
          <p className={styles.subtitle}>An overview of your coworking space.</p>
        </div>

        {/* Stats Cards */}
        <div className={styles.statsGrid}>
          {statCards.map((card) => (
            <div key={card.title} className={styles.statCard}>
              <div className={styles.statHeader}>
                <span className={styles.statLabel}>{card.title}</span>
                <div className={styles.statIconContainer}>
                  <card.icon className={styles.statIcon} />
                </div>
              </div>
              <div className={styles.statValue}>{card.value}</div>
              <p className={styles.statDescription}>{card.subtitle}</p>
            </div>
          ))}
        </div>

        {/* Charts and Recent Clients */}
        <div className={styles.chartsGrid}>
          {/* Revenue Overview */}
          <div className={styles.chartCard}>
            <div className={styles.chartHeader}>
              <h3 className={styles.chartTitle}>Revenue Overview</h3>
              <p className={styles.chartDescription}>
                Monthly revenue from active subscriptions.
              </p>
            </div>
            <div className={styles.chartContainer}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#9ca3af', fontSize: 12 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#9ca3af', fontSize: 12 }}
                    ticks={[0, 2, 4, 6]}
                    domain={[0, 6]}
                  />
                  <Bar dataKey="value" fill="#2b7a8e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recent Clients */}
          <div className={styles.chartCard}>
            <h3 className={styles.chartTitle}>Recent Clients</h3>
            <div className={styles.clientsContainer}>
              {clients.map((client, index) => (
                <div key={index} className={styles.clientRow}>
                  <div className={styles.clientAvatar}>
                    <span className={styles.clientInitials}>{client.initials}</span>
                  </div>
                  <div className={styles.clientInfo}>
                    <div className={styles.clientName}>{client.name}</div>
                    <div className={styles.clientEmail}>{client.email}</div>
                  </div>
                  <div className={styles.clientMeta}>
                    <span className={styles.clientPlan}>{client.plan}</span>
                    <div className={styles.clientStatus}>
                      <div
                        className={`${styles.statusDot} ${
                          client.status === 'Active' ? styles.active : styles.pastDue
                        }`}
                      />
                      <span className={styles.statusText}>{client.status}</span>
                    </div>
                    <span className={styles.clientRate}>{client.rate}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
