import React, { useState, useEffect, useContext } from 'react';
import { useParams } from 'react-router-dom';
import { FirebaseContext } from '../store/Context';
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { Box, Typography, Paper, Grid, CircularProgress } from '@mui/material';
import styles from './Dashboard.module.css';
import { Person, Description, Receipt } from '@mui/icons-material';

export default function ClientProfile() {
  const { id } = useParams();
  const { db } = useContext(FirebaseContext);
  const [member, setMember] = useState(null);
  const [agreements, setAgreements] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMemberData = async () => {
      try {
        // Fetch member details
        const memberDocRef = doc(db, 'members', id);
        const memberDocSnap = await getDoc(memberDocRef);
        if (memberDocSnap.exists()) {
          setMember({ id: memberDocSnap.id, ...memberDocSnap.data() });
        }

        // Fetch agreements
        const agreementsQuery = query(collection(db, 'agreements'), where('memberId', '==', id));
        const agreementsSnapshot = await getDocs(agreementsQuery);
        const agreementsList = agreementsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setAgreements(agreementsList);

        // Fetch invoices
        const invoicesQuery = query(collection(db, 'invoices'), where('memberId', '==', id));
        const invoicesSnapshot = await getDocs(invoicesQuery);
        const invoicesList = invoicesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setInvoices(invoicesList);
      } catch (error) {
        console.error("Error fetching client data:", error);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchMemberData();
    }
  }, [id, db]);

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.content}>
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
            <CircularProgress />
          </Box>
        </div>
      </div>
    );
  }

  if (!member) {
    return (
      <div className={styles.container}>
        <div className={styles.content}>
          <Box sx={{ textAlign: 'center', mt: 4 }}>
            <Typography variant="h5">Member not found</Typography>
          </Box>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.header}>
          <h1 className={styles.title}>{member.name}'s Profile</h1>
          <p className={styles.subtitle}>An overview of the client's details.</p>
        </div>

        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statHeader}>
              <span className={styles.statLabel}>Details</span>
              <div className={styles.statIconContainer}>
                <Person className={styles.statIcon} />
              </div>
            </div>
            <Typography><strong>Package:</strong> {member.package}</Typography>
            <Typography><strong>Company:</strong> {member.company}</Typography>
            <Typography><strong>Birthday:</strong> {member.birthday}</Typography>
            <Typography><strong>WhatsApp:</strong> {member.whatsapp}</Typography>
            <Typography><strong>Email:</strong> {member.email}</Typography>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statHeader}>
              <span className={styles.statLabel}>Agreements</span>
              <div className={styles.statIconContainer}>
                <Description className={styles.statIcon} />
              </div>
            </div>
            {agreements.length > 0 ? (
              agreements.map(agreement => (
                <Box key={agreement.id} sx={{ mb: 2 }}>
                  <Typography><strong>Agreement Number:</strong> {agreement.agreementNumber}</Typography>
                  <Typography><strong>Start Date:</strong> {agreement.startDate}</Typography>
                  <Typography><strong>End Date:</strong> {agreement.endDate}</Typography>
                </Box>
              ))
            ) : (
              <Typography>No agreements found.</Typography>
            )}
          </div>

          <div className={styles.statCard}>
            <div className={styles.statHeader}>
              <span className={styles.statLabel}>Invoices</span>
              <div className={styles.statIconContainer}>
                <Receipt className={styles.statIcon} />
              </div>
            </div>
            {invoices.length > 0 ? (
              invoices.map(invoice => (
                <Box key={invoice.id} sx={{ mb: 2 }}>
                  <Typography><strong>Invoice Number:</strong> {invoice.invoiceNumber}</Typography>
                  <Typography><strong>Date:</strong> {invoice.date}</Typography>
                  <Typography><strong>Amount:</strong> {invoice.amount}</Typography>
                  <Typography><strong>Status:</strong> {invoice.status}</Typography>
                </Box>
              ))
            ) : (
              <Typography>No invoices found.</Typography>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}