import { useState, useEffect, useContext } from 'react';
import { Dialog, DialogContent, IconButton, Tabs, Tab, Card, CardContent, Button, Chip, Typography, Box, CircularProgress } from '@mui/material';
import { Close, Email, Phone, Cake, Person, Business, CalendarToday, AttachMoney, Description, KeyboardArrowDown, KeyboardArrowRight } from '@mui/icons-material';
import styles from './ClientProfile.module.css';
import { FirebaseContext } from '../store/Context';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';

export default function ClientProfileModal({ open, onClose, clientId }) {
  const { db } = useContext(FirebaseContext);
  const [client, setClient] = useState(null);
  const [agreements, setAgreements] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [subMembersData, setSubMembersData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [expandedMembers, setExpandedMembers] = useState({});

  useEffect(() => {
    const fetchClientData = async () => {
      if (!clientId) {
        setClient(null);
        setLoading(false);
        return;
      }
      
      setLoading(true);
      try {
        const clientDocRef = doc(db, 'members', clientId);
        const clientDocSnap = await getDoc(clientDocRef);

        if (clientDocSnap.exists()) {
          const primaryClientData = { id: clientDocSnap.id, ...clientDocSnap.data() };
          setClient(primaryClientData);

          if (primaryClientData.primary && primaryClientData.subMembers && primaryClientData.subMembers.length > 0) {
            const fetchedSubMembers = [];
            for (const subMemberId of primaryClientData.subMembers) {
              const subMemberDocRef = doc(db, 'members', subMemberId);
              const subMemberDocSnap = await getDoc(subMemberDocRef);
              if (subMemberDocSnap.exists()) {
                fetchedSubMembers.push({ id: subMemberDocSnap.id, ...subMemberDocSnap.data() });
              }
            }
            setSubMembersData(fetchedSubMembers);
          } else {
            setSubMembersData([]);
          }
        } else {
          console.warn("Client not found with ID:", clientId);
          setClient(null);
        }

        const allAgreementsSnapshot = await getDocs(collection(db, 'agreements'));
        const allAgreementsList = allAgreementsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setAgreements(allAgreementsList);

        const allInvoicesSnapshot = await getDocs(collection(db, 'invoices'));
        const allInvoicesList = allInvoicesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setInvoices(allInvoicesList);

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

  // Reset state when modal is closed to avoid showing stale data
  useEffect(() => {
    if (!open) {
      setClient(null);
      setAgreements([]);
      setInvoices([]);
      setSubMembersData([]);
      setLoading(true);
      setActiveTab(0);
      setExpandedMembers({});
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

  const toggleMemberExpansion = (memberId) => {
    setExpandedMembers(prev => ({ ...prev, [memberId]: !prev[memberId] }));
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
          <Typography variant="h6">Member Not Found</Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
            The member profile you are looking for could not be found.
          </Typography>
          <Button variant="outlined" onClick={onClose} sx={{ mt: 3 }}>
            Close
          </Button>
        </Box>
      );
    }

    const relevantMemberIds = [client.id, ...subMembersData.map(sm => sm.id)];
    const clientAgreements = agreements.filter(agreement => relevantMemberIds.includes(agreement.memberId));
    const clientInvoices = invoices.filter(invoice => relevantMemberIds.includes(invoice.memberId));

    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <h2>Member Profile</h2>
          </div>
          <IconButton onClick={onClose} className={styles.closeButton} aria-label="close">
            <Close />
          </IconButton>
        </div>

        <div className={styles.content}>
          <div className={styles.profileSection}>
            <div className={styles.profileHeader}>
              <div className={styles.avatarSection}>
                <div className={styles.avatar}>{getInitials(client.name)}</div>
                <div className={styles.basicInfo}>
                  <h3 className={styles.clientName}>{client.name}</h3>
                  {client.primary && <Chip label="Primary Member" size="small" className={styles.primaryBadge} />}
                </div>
              </div>
            </div>
            <div className={styles.detailsGrid}>
              <div className={styles.detailItem}><div className={styles.detailLabel}><Business className={styles.detailIcon} />Package</div><div className={styles.detailValue}>{client.package || '-'}</div></div>
              <div className={styles.detailItem}><div className={styles.detailLabel}><Email className={styles.detailIcon} />Email</div><div className={styles.detailValue}>{client.email || '-'}</div></div>
              <div className={styles.detailItem}><div className={styles.detailLabel}><Phone className={styles.detailIcon} />WhatsApp</div><div className={styles.detailValue}>{client.whatsapp || '-'}</div></div>
              {client.birthday && <div className={styles.detailItem}><div className={styles.detailLabel}><Cake className={styles.detailIcon} />Birthday</div><div className={styles.detailValue}>{formatDate(client.birthday)}</div></div>}
            </div>
          </div>

          {client.primary && subMembersData.length > 0 && (
            <div className={styles.membersSection}>
              <h4 className={styles.sectionTitle}><Person className={styles.sectionIcon} />Team Members ({subMembersData.length})</h4>
              <div className={styles.membersList}>
                {subMembersData.map(subMember => (
                  <Card key={subMember.id} className={styles.memberCard}>
                    <CardContent className={styles.memberCardContent}>
                      <div className={styles.memberHeader}>
                        <div className={styles.memberInfo}>
                          <div className={styles.memberAvatar}>{getInitials(subMember.name)}</div>
                          <div>
                            <div className={styles.memberName}>{subMember.name}</div>
                            <div className={styles.memberPackage}>{subMember.package}</div>
                          </div>
                        </div>
                        <IconButton size="small" onClick={() => toggleMemberExpansion(subMember.id)} className={styles.expandButton}>
                          {expandedMembers[subMember.id] ? <KeyboardArrowDown /> : <KeyboardArrowRight />}
                        </IconButton>
                      </div>
                      {expandedMembers[subMember.id] && (
                        <div className={styles.memberDetails}>
                          <div className={styles.memberDetailItem}><Email className={styles.memberDetailIcon} /><span>{subMember.email}</span></div>
                          <div className={styles.memberDetailItem}><Phone className={styles.memberDetailIcon} /><span>{subMember.whatsapp}</span></div>
                          {subMember.birthday && <div className={styles.memberDetailItem}><Cake className={styles.memberDetailIcon} /><span>{formatDate(subMember.birthday)}</span></div>}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          <div className={styles.tabsSection}>
            <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)} className={styles.tabs}>
              <Tab label="AGREEMENTS" />
              <Tab label="INVOICES" />
            </Tabs>

            {activeTab === 0 && (
              <div className={styles.tabContent}>
                <h4 className={styles.tabSectionTitle}>Recent Agreements</h4>
                {clientAgreements.length === 0 ? (
                  <div className={styles.emptyState}><Description className={styles.emptyIcon} /><p>No agreements found for this member</p></div>
                ) : (
                  <div className={styles.agreementsList}>
                    {clientAgreements.map((agreement) => (
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
                {clientInvoices.length === 0 ? (
                  <div className={styles.emptyState}><Description className={styles.emptyIcon} /><p>No invoices found for this member</p></div>
                ) : (
                  <div className={styles.invoicesList}>
                    {clientInvoices.map((invoice) => (
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
