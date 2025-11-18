import { AddCircleOutline, Person } from '@mui/icons-material';
import styles from './Leads.module.css';
import { useContext, useEffect, useState } from 'react';
import { FirebaseContext, AuthContext } from '../store/Context';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

export default function Leads() {
  const { db } = useContext(FirebaseContext);
  const { hasPermission } = useContext(AuthContext);
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

  const getStatusClass = (status) => {
    if (!status) return '';
    return status.toLowerCase().replace(' ', '-');
  };

  const handleDelete = async (leadId) => {
    if (window.confirm('Are you sure you want to delete this lead?')) {
      try {
        await deleteDoc(doc(db, 'leads', leadId));
        setLeads(leads.filter(lead => lead.id !== leadId));
        console.log('Lead deleted successfully');
      } catch (error) {
        console.error("Error deleting lead:", error);
      }
    }
  };

  const handleRowClick = (leadId) => {
    if (hasPermission('edit_leads')) {
      navigate(`/lead/${leadId}`);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerText}>
            <h1 className={styles.title}>Leads</h1>
            <p className={styles.subtitle}>Manage your Leads and followUps.</p>
          </div>
          {hasPermission('add_leads') && (
            <button className={styles.addButton} onClick={() => navigate('/add-lead')}>
              <AddCircleOutline className={styles.addIcon} />
              Add Lead
            </button>
          )}
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
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id}>
                  <td onClick={() => handleRowClick(lead.id)} style={{ cursor: hasPermission('edit_leads') ? 'pointer' : 'default' }}>
                    <span className={styles.nameText}>{lead.name}</span>
                  </td>
                  <td onClick={() => handleRowClick(lead.id)} style={{ cursor: hasPermission('edit_leads') ? 'pointer' : 'default' }}>
                    <span className={`${styles.statusBadge} ${styles[getStatusClass(lead.status)]}`}>
                      {lead.status}
                    </span>
                  </td>
                  <td onClick={() => handleRowClick(lead.id)} style={{ cursor: hasPermission('edit_leads') ? 'pointer' : 'default' }}>
                    <div className={styles.purposeCell}>
                      <Person className={styles.purposeIcon} />
                      <span>{lead.purposeOfVisit}</span>
                    </div>
                  </td>
                  <td onClick={() => handleRowClick(lead.id)} style={{ cursor: hasPermission('edit_leads') ? 'pointer' : 'default' }}>{lead.phone}</td>
                  <td onClick={() => handleRowClick(lead.id)} style={{ cursor: hasPermission('edit_leads') ? 'pointer' : 'default' }}>{lead.convertedWhatsapp}</td>
                  <td onClick={() => handleRowClick(lead.id)} style={{ cursor: hasPermission('edit_leads') ? 'pointer' : 'default' }}>{lead.convertedEmail}</td>
                  <td onClick={() => handleRowClick(lead.id)} style={{ cursor: hasPermission('edit_leads') ? 'pointer' : 'default' }}>
                    <div className={styles.sourceCell}>
                      <span className={styles.sourceType}>{lead.sourceType}</span>
                      <span className={styles.sourceDetail}>{lead.sourceDetail}</span>
                    </div>
                  </td>
                  <td>
                    {hasPermission('delete_leads') && (
                      <button onClick={() => handleDelete(lead.id)}>Delete</button>
                    )}
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
