import { AddCircleOutline, Person } from '@mui/icons-material';
import styles from './Leads.module.css';

const leadsData = [
  {
    id: 1,
    name: 'Alice Johnson',
    initials: 'AJ',
    phone: '+918078514587',
    whatsapp: '+918078514587',
    email: 'alice@innovate.com',
    sourceType: 'Social Media',
    sourceDetail: 'Instagram',
    purposeOfVisit: 'Dedicated',
    status: 'New',
  },
  {
    id: 2,
    name: 'Bob Williams',
    initials: 'BW',
    phone: '+918078514588',
    whatsapp: '+918078514588',
    email: 'bob@solutions.io',
    sourceType: 'Referral',
    sourceDetail: 'Sarah Mitchell',
    purposeOfVisit: 'Flexi',
    status: 'Contacted',
  },
  {
    id: 3,
    name: 'Charlie Brown',
    initials: 'CB',
    phone: '+918078514589',
    whatsapp: '+918078514589',
    email: 'charlie@creative.co',
    sourceType: 'Social Media',
    sourceDetail: 'LinkedIn',
    purposeOfVisit: 'Private Cabin',
    status: 'Qualified',
  },
  {
    id: 4,
    name: 'Diana Prince',
    initials: 'DP',
    phone: '+918078514590',
    whatsapp: '+918078514590',
    email: 'diana@themyscira.corp',
    sourceType: 'Referral',
    sourceDetail: 'John Davis',
    purposeOfVisit: 'Dedicated',
    status: 'Converted',
  },
  {
    id: 5,
    name: 'Ethan Hunt',
    initials: 'EH',
    phone: '+918078514591',
    whatsapp: '+918078514591',
    email: 'ethan@mission.com',
    sourceType: 'Social Media',
    sourceDetail: 'Facebook',
    purposeOfVisit: 'Flexi',
    status: 'New',
  },
];

export default function Leads() {
  return (
    <div className={styles.container}>
      <div className={styles.content}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerText}>
            <h1 className={styles.title}>Leads</h1>
            <p className={styles.subtitle}>Manage your Leads and followUps.</p>
          </div>
          <button className={styles.addButton}>
            <AddCircleOutline className={styles.addIcon} />
            Add Lead
          </button>
        </div>

        {/* Table */}
        <div className={styles.tableCard}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Status</th>
                <th>Purpose of Visit</th>
                <th>Phone</th>
                <th>Whatsapp</th>
                <th>Email</th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody>
              {leadsData.map((lead) => (
                <tr key={lead.id}>
                  <td>
                    <span className={styles.nameText}>{lead.name}</span>
                  </td>
                  <td>
                    <span className={`${styles.statusBadge} ${styles[lead.status.toLowerCase()]}`}>
                      {lead.status}
                    </span>
                  </td>
                  <td>
                    <div className={styles.purposeCell}>
                      <Person className={styles.purposeIcon} />
                      <span>{lead.purposeOfVisit}</span>
                    </div>
                  </td>
                  <td>{lead.phone}</td>
                  <td>{lead.whatsapp}</td>
                  <td>{lead.email}</td>
                  <td>
                    <div className={styles.sourceCell}>
                      <span className={styles.sourceType}>{lead.sourceType}</span>
                      <span className={styles.sourceDetail}>{lead.sourceDetail}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
