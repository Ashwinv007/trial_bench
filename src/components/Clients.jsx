import { useState, useEffect, useContext } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { FirebaseContext } from '../store/Context';
import { FileDownload } from '@mui/icons-material';
import styles from './Clients.module.css';

export default function Clients() {
  const { db } = useContext(FirebaseContext);
  const [clients, setClients] = useState([]);

  useEffect(() => {
    if (db) {
      const fetchClients = async () => {
        const leadsCollection = collection(db, 'leads');
        const q = query(leadsCollection, where('status', '==', 'Converted'));
        const clientsSnapshot = await getDocs(q);
        const clientsData = clientsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setClients(clientsData);
      };
      fetchClients();
    }
  }, [db]);

  const handleExport = () => {
    console.log('Exporting clients data...');
    alert('Export functionality will download client data as CSV/Excel');
  };

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerText}>
            <h1 className={styles.title}>Clients</h1>
            <p className={styles.subtitle}>Manage your converted clients.</p>
          </div>
          <button className={styles.exportButton} onClick={handleExport}>
            <FileDownload className={styles.exportIcon} />
            Export
          </button>
        </div>

        {/* Table */}
        <div className={styles.tableCard}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Package</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <tr key={client.id}>
                  <td>
                    <div className={styles.nameCell}>
                      <span className={styles.nameText}>{client.name}</span>
                    </div>
                  </td>
                  <td>{client.convertedEmail}</td>
                  <td>{client.phone}</td>
                  <td>
                    <span className={styles.packageBadge}>
                      <span className={styles.packageDot}></span>
                      {client.purposeOfVisit}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {clients.length === 0 && (
            <div className={styles.emptyState}>
              <p>No converted clients found.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
