import { useState, useEffect, useContext } from 'react';
import { Dialog, DialogContent, IconButton, Tabs, Tab, Card, CardContent, Button, Chip, Typography, Box, CircularProgress } from '@mui/material';
import { Close, Email, Phone, Cake, Business } from '@mui/icons-material';
import styles from './ClientProfile.module.css';
import { FirebaseContext } from '../store/Context';
import { doc, getDoc, collection, getDocs, query, where, documentId } from 'firebase/firestore';

export default function ClientProfileModal({ open, onClose, clientId }) {
  const { db } = useContext(FirebaseContext);
  const [client, setClient] = useState(null);
  const [agreements, setAgreements] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    const fetchClientData = async () => {
      if (!clientId) {
        setClient(null);
        setLoading(false);
        return;
      }
      
      setLoading(true);
      try {
        // 1. Fetch the lead document
        const clientDocRef = doc(db, 'leads', clientId);
        const clientDocSnap = await getDoc(clientDocRef);

        if (clientDocSnap.exists()) {
          setClient({ id: clientDocSnap.id, ...clientDocSnap.data() });
        } else {
          console.warn("Client not found with ID:", clientId);
          setClient(null);
          setLoading(false);
          return;
        }

        // 2. Fetch agreements for the current client
        const agreementsQuery = query(collection(db, 'agreements'), where('leadId', '==', clientId));
        const agreementsSnapshot = await getDocs(agreementsQuery);
        const clientAgreementsData = agreementsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setAgreements(clientAgreementsData);

        // 3. Fetch invoices based on the fetched agreements
        if (clientAgreementsData.length > 0) {
          const agreementIds = clientAgreementsData.map(a => a.id);
          const invoicesQuery = query(collection(db, 'invoices'), where('agreementId', 'in', agreementIds));
          const invoicesSnapshot = await getDocs(invoicesQuery);
          const clientInvoicesData = invoicesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setInvoices(clientInvoicesData);
        } else {
          setInvoices([]);
        }
        
        // 4. Fetch members related to the lead (primary and sub-members)
        const primaryMembersQuery = query(collection(db, 'members'), where('leadId', '==', clientId));
        const primaryMembersSnapshot = await getDocs(primaryMembersQuery);
        const primaryMembers = primaryMembersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const subMemberIds = primaryMembers.flatMap(member => member.subMembers || []);
        let subMembers = [];

        if (subMemberIds.length > 0) {
            const chunks = [];
            for (let i = 0; i < subMemberIds.length; i += 30) {
                chunks.push(subMemberIds.slice(i, i + 30));
            }
            
            const subMemberPromises = chunks.map(chunk => {
                const subMembersQuery = query(collection(db, 'members'), where(documentId(), 'in', chunk));
                return getDocs(subMembersQuery);
            });

            const subMemberSnapshots = await Promise.all(subMemberPromises);
            subMembers = subMemberSnapshots.flatMap(snapshot => snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }

        const allRelatedMembers = [...primaryMembers, ...subMembers];
        const uniqueMembers = Array.from(new Map(allRelatedMembers.map(m => [m.id, m])).values());
        
        uniqueMembers.sort((a, b) => {
            if (a.primary && !b.primary) return -1;
            if (!a.primary && b.primary) return 1;
            return (a.name || '').localeCompare(b.name || '');
        });

        setMembers(uniqueMembers);

      } catch (error) {
        console.error("Error fetching client data:", error);
      } finally {
        setLoading(false);
      }
    };

    if (open) {
      fetchClientData();
    }
  }, [open, clientId, db]);

  // Reset state when modal is closed
  useEffect(() => {
    if (!open) {
      setClient(null);
      setAgreements([]);
      setInvoices([]);
      setMembers([]);
      setLoading(true);
      setActiveTab(0);
    }
  }, [open]);

  const getInitials = (name) => {
    if (!name) return '';
    return name.split(' ').map(word => word[0]).join('').toUpperCase().substring(0, 2);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(amount);
  };
  
  const getPaymentStatusColor = (status) => {
    switch(status?.toLowerCase()) {
      case 'paid': return '#4caf50';
      case 'unpaid': return '#f44336';
      case 'overdue': return '#ff9800';
      case 'partially paid': return '#2196f3';
      default: return '#9e9e9e';
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '500px' }}>
          <CircularProgress />
        </Box>
      );
    }

    if (!client) {
      return (
        <Box sx={{ textAlign: 'center', p: 4 }}>
          <Typography variant="h6">Client Not Found</Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
            The client profile you are looking for could not be found.
          </Typography>
          <Button variant="outlined" onClick={onClose} sx={{ mt: 3 }}>
            Close
          </Button>
        </Box>
      );
    }

    const displayName = client.memberLegalName || client.name;
    const secondaryText = client.memberLegalName ? client.name : client.companyName;

    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <h2>Client Profile</h2>
          </div>
          <IconButton onClick={onClose} className={styles.closeButton} aria-label="close">
            <Close />
          </IconButton>
        </div>

        <div className={styles.content}>
          <div className={styles.profileSection}>
            <div className={styles.profileHeader}>
              <div className={styles.avatarSection}>
                <div className={styles.avatar}>{getInitials(displayName)}</div>
                <div className={styles.basicInfo}>
                  <h3 className={styles.clientName}>{displayName}</h3>
                  {secondaryText && <Typography variant="body2" color="text.secondary">{secondaryText}</Typography>}
                </div>
              </div>
            </div>
            <div className={styles.detailsGrid}>
              <div className={styles.detailItem}><div className={styles.detailLabel}><Business className={styles.detailIcon} />Package</div><div className={styles.detailValue}>{client.purposeOfVisit || '-'}</div></div>
              <div className={styles.detailItem}><div className={styles.detailLabel}><Email className={styles.detailIcon} />Email</div><div className={styles.detailValue}>{client.convertedEmail || '-'}</div></div>
              <div className={styles.detailItem}><div className={styles.detailLabel}><Phone className={styles.detailIcon} />WhatsApp</div><div className={styles.detailValue}>{client.convertedWhatsapp || '-'}</div></div>
              {client.birthdayDay && client.birthdayMonth && <div className={styles.detailItem}><div className={styles.detailLabel}><Cake className={styles.detailIcon} />Birthday</div><div className={styles.detailValue}>{`${client.birthdayDay}/${client.birthdayMonth}`}</div></div>}
            </div>
          </div>

          <div className={styles.tabsSection}>
            <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)} className={styles.tabs}>
              <Tab label="AGREEMENTS" />
              <Tab label="INVOICES" />
              <Tab label="MEMBERS" />
            </Tabs>

            {activeTab === 0 && (
              <div className={styles.tabContent}>
                <h4 className={styles.tabSectionTitle}>Recent Agreements</h4>
                {agreements.length === 0 ? (
                  <div className={styles.emptyState}><p>No agreements found for this client</p></div>
                ) : (
                  <div className={styles.agreementsList}>
                    {agreements.map((agreement) => (
                      <Card key={agreement.id} className={styles.agreementCard}>
                        <CardContent>
                          <div className={styles.agreementHeader}>
                            <div className={styles.agreementNumber}>Agreement {agreement.agreementNumber || `#${agreement.id}`}</div>
                            {agreement.serviceAgreementType && <Chip label={agreement.serviceAgreementType} size="small" className={styles.agreementType} />}
                          </div>
                          <div className={styles.agreementDetails}>
                            <div className={styles.agreementDetailRow}><span className={styles.agreementLabel}>Start Date:</span><span className={styles.agreementValue}>{formatDate(agreement.startDate)}</span></div>
                            <div className={styles.agreementDetailRow}><span className={styles.agreementLabel}>End Date:</span><span className={styles.agreementValue}>{formatDate(agreement.endDate)}</span></div>
                            {agreement.totalMonthlyPayment && <div className={styles.agreementDetailRow}><span className={styles.agreementLabel}>Monthly Payment:</span><span className={styles.agreementValue}>{formatCurrency(agreement.totalMonthlyPayment)}</span></div>}
                            {agreement.memberLegalName && <div className={styles.agreementDetailRow}><span className={styles.agreementLabel}>Legal Name:</span><span className={styles.agreementValue}>{agreement.memberLegalName}</span></div>}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 1 && (
              <div className={styles.tabContent}>
                <h4 className={styles.tabSectionTitle}>Recent Invoices</h4>
                {invoices.length === 0 ? (
                  <div className={styles.emptyState}><p>No invoices found for this client</p></div>
                ) : (
                  <div className={styles.invoicesList}>
                    {invoices.map((invoice) => (
                      <Card key={invoice.id} className={styles.invoiceCard}>
                        <CardContent>
                          <div className={styles.invoiceHeader}>
                            <div className={styles.invoiceNumber}>Invoice {invoice.invoiceNumber || `#${invoice.id}`}</div>
                            <Chip 
                              label={invoice.paymentStatus || 'Pending'}
                              size="small"
                              style={{
                                backgroundColor: getPaymentStatusColor(invoice.paymentStatus) + '20',
                                color: getPaymentStatusColor(invoice.paymentStatus),
                                borderLeft: `3px solid ${getPaymentStatusColor(invoice.paymentStatus)}`
                              }}
                            />
                          </div>
                          <div className={styles.invoiceDetails}>
                            <div className={styles.invoiceDetailRow}><span className={styles.invoiceLabel}>Date:</span><span className={styles.invoiceValue}>{formatDate(invoice.date)}</span></div>
                            <div className={styles.invoiceDetailRow}><span className={styles.invoiceLabel}>Amount:</span><span className={styles.invoiceValue}>{formatCurrency(invoice.totalPrice || invoice.price || 0)}</span></div>
                            {invoice.description && <div className={styles.invoiceDetailRow}><span className={styles.invoiceLabel}>Description:</span><span className={styles.invoiceValue}>{invoice.description}</span></div>}
                            {invoice.dateOfPayment && <div className={styles.invoiceDetailRow}><span className={styles.invoiceLabel}>Payment Date:</span><span className={styles.invoiceValue}>{formatDate(invoice.dateOfPayment)}</span></div>}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}
            
            {activeTab === 2 && (
              <div className={styles.tabContent}>
                <h4 className={styles.tabSectionTitle}>Associated Members</h4>
                {members.length === 0 ? (
                  <div className={styles.emptyState}><p>No members found for this client</p></div>
                ) : (
                  <div className={styles.agreementsList}>
                    {members.map((member) => (
                      <Card key={member.id} className={styles.agreementCard}>
                        <CardContent>
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <Typography variant="h6">{member.name}</Typography>
                            {member.primary && (
                              <Chip
                                label="Primary Member"
                                size="small"
                                sx={{ ml: 1, backgroundColor: '#2b7a8e', color: 'white', fontWeight: 600 }}
                              />
                            )}
                          </Box>
                          {member.package && <Chip label={member.package} size="small" sx={{ mb: 1 }} />}
                          <Typography variant="body2" color="text.secondary">Email: {member.email || '-'}</Typography>
                          <Typography variant="body2" color="text.secondary">WhatsApp: {member.whatsapp || '-'}</Typography>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { maxHeight: '90vh' } }}>
      <DialogContent sx={{ p: 0, '&:first-of-type': { paddingTop: 0 } }}>
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
}
