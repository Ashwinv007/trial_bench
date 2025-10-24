import { AddCircleOutline, Person } from '@mui/icons-material';
import styles from './Leads.module.css';
import { useContext, useEffect, useState } from 'react';
import { FirebaseContext } from '../store/Context';
import { collection, getDocs } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

export default function Leads() {
  const { db } = useContext(FirebaseContext);
  const [leads, setLeads] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (db) {
      console.log('Database reference is available:', db);
      const fetchLeads = async () => {
        try {
          const leadsCollection = collection(db, 'leads');
          const leadsSnapshot = await getDocs(leadsCollection);
          const leadsData = leadsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setLeads(leadsData);
          console.log('Fetched leads:', leadsData);
        } catch (error) {
          console.error("Error fetching leads:", error);
        }
      };
      fetchLeads();
    }
  }, [db]);

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerText}>
            <h1 className={styles.title}>Leads</h1>
            <p className={styles.subtitle}>Manage your Leads and followUps.</p>
          </div>
          <button className={styles.addButton} onClick={() => navigate('/add-lead')}>
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
              {leads.map((lead) => (
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
