import { AttachMoney, Adjust, People } from '@mui/icons-material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import styles from './Dashboard.module.css';
import { useState, useEffect, useContext } from 'react';
import { FirebaseContext } from '../store/Context';
import { collection, getDocs } from 'firebase/firestore';
import Notifications from './Notifications';
import { usePermissions } from '../auth/usePermissions';

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
  const { db } = useContext(FirebaseContext);
  const { hasPermission } = usePermissions(); // Use the usePermissions hook
  const [followUpNotifications, setFollowUpNotifications] = useState([]);
  const [agreementNotifications, setAgreementNotifications] = useState([]);
  const [birthdayNotifications, setBirthdayNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(true);

  useEffect(() => {
    const fetchNotifications = async () => {
      if (!db) return;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const dueFollowUps = [];
      const expiringAgreements = [];
      const birthdayReminders = [];

      // Fetch Follow-ups (Leads)
      if (hasPermission('leads:view')) {
        const leadsCollection = collection(db, 'leads');
        const leadsSnapshot = await getDocs(leadsCollection);
        leadsSnapshot.forEach(doc => {
          const lead = doc.data();
          if (lead.activities) {
            lead.activities.forEach(activity => {
              if (activity.hasFollowUp && activity.followUpDays) {
                const addedDate = new Date(activity.timestamp);
                const dueDate = new Date(addedDate);
                dueDate.setDate(addedDate.getDate() + parseInt(activity.followUpDays, 10));
                dueDate.setHours(0, 0, 0, 0);

                if (dueDate.getTime() === today.getTime()) {
                  dueFollowUps.push({
                    type: 'followUp',
                    leadName: lead.name,
                    note: activity.description,
                  });
                }
              }
            });
          }
        });
      } else {
        setFollowUpNotifications([]); // Clear if no permission
      }

      // Fetch Expiring Agreements
      if (hasPermission('agreements:view')) {
        const agreementsCollection = collection(db, 'agreements');
        const agreementsSnapshot = await getDocs(agreementsCollection);
        agreementsSnapshot.forEach(doc => {
          const agreement = doc.data();
          if (agreement.endDate) {
            const endDate = new Date(agreement.endDate);
            const diffTime = endDate.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            let message = '';
            let level = 'info'; // Default level

            if (diffDays < 0) {
              // Expired
              if (diffDays === -1) { // Only show on the day it expires
                  message = `Agreement for ${agreement.memberLegalName || agreement.name} has expired today.`;
                  level = 'critical';
              }
            } else if (diffDays === 0) {
              // Expires today
              message = `Agreement for ${agreement.memberLegalName || agreement.name} expires today!`;
              level = 'critical';
            } else if (diffDays > 0 && diffDays <= 7) {
              // Within 7 days, show every day
              message = `Agreement for ${agreement.memberLegalName || agreement.name} is expiring in ${diffDays} day(s).`;
              level = 'critical';
            } else if (diffDays === 15) {
              // Exactly 15 days
              message = `Agreement for ${agreement.memberLegalName || agreement.name} is expiring in 15 days.`;
              level = 'warning';
            } else if (diffDays === 30) {
              // Exactly 30 days
              message = `Agreement for ${agreement.memberLegalName || agreement.name} is expiring in 30 days.`;
              level = 'warning';
            }

            if (message) {
              expiringAgreements.push({
                type: 'agreement',
                message: message,
                level: level,
              });
            }
          }
        });
      } else {
        setAgreementNotifications([]); // Clear if no permission
      }

            // Fetch Birthday Reminders (Members)
            if (hasPermission('members:view')) {
              const membersCollection = collection(db, 'members');
              const membersSnapshot = await getDocs(membersCollection);
              membersSnapshot.forEach(doc => {
                const member = doc.data();
                if (member.birthdayDay && member.birthdayMonth) {
                  const birthdayMonth = parseInt(member.birthdayMonth, 10) - 1; // Month is 0-indexed
                  const birthdayDay = parseInt(member.birthdayDay, 10);
      
                  const todayMonth = today.getMonth();
                  const todayDay = today.getDate();
      
                  const tomorrow = new Date(today);
                  tomorrow.setDate(today.getDate() + 1);
                  const tomorrowMonth = tomorrow.getMonth();
                  const tomorrowDay = tomorrow.getDate();
      
                  let message = '';
                  let level = 'info';
      
                  if (birthdayMonth === todayMonth && birthdayDay === todayDay) {
                    message = `It's ${member.name}'s birthday today!`;
                    level = 'info';
                  } else if (birthdayMonth === tomorrowMonth && birthdayDay === tomorrowDay) {
                    message = `${member.name}'s birthday is tomorrow!`;
                    level = 'info';
                  }
      
                  if (message) {
                    birthdayReminders.push({
                      type: 'birthday',
                      message: message,
                      level: level,
                    });
                  }
                }
              });
            } else {
              setBirthdayNotifications([]); // Clear if no permission
            }
      setFollowUpNotifications(dueFollowUps);
      setAgreementNotifications(expiringAgreements);
      setBirthdayNotifications(birthdayReminders);
    };

    fetchNotifications();
  }, [db, hasPermission]);

  return (
    <div className={styles.container}>
      {showNotifications && (
        <>
          <Notifications
            notifications={followUpNotifications}
            onClose={() => setShowNotifications(false)}
            title="Follow-up Reminders"
          />
          <Notifications
            notifications={agreementNotifications}
            onClose={() => setShowNotifications(false)}
            title="Agreement Expirations"
          />
          <Notifications
            notifications={birthdayNotifications}
            onClose={() => setShowNotifications(false)}
            title="Birthday Reminders"
          />
        </>
      )}
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
