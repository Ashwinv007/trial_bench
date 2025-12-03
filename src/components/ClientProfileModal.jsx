import { useState, useEffect, useContext, useMemo } from 'react';
import { Dialog, DialogContent, IconButton, Tabs, Tab, Card, CardContent, Button, Chip, Typography, Box, CircularProgress } from '@mui/material';
import { Close, Email, Phone, Cake, Business, Lock } from '@mui/icons-material';
import styles from './ClientProfile.module.css';
import { useData } from '../store/DataContext';
import { usePermissions } from '../auth/usePermissions'; // Import usePermissions

export default function ClientProfileModal({ open, onClose, clientId }) {
  const { clientProfiles, prefetchClientProfile } = useData();
  const { hasPermission } = usePermissions();
  const [activeTab, setActiveTab] = useState(0);

  const profileData = clientProfiles[clientId];
  const { client, agreements = [], invoices = [], members = [], loading, error } = profileData || {};

  // Define tabs and their required permissions
  const allTabs = useMemo(() => [
    { label: 'AGREEMENTS', permission: 'agreements:view' },
    { label: 'INVOICES', permission: 'invoices:view' },
    { label: 'MEMBERS', permission: 'members:view' }
  ], []);

  const visibleTabs = useMemo(() => allTabs.filter(tab => hasPermission(tab.permission)), [allTabs, hasPermission]);

  useEffect(() => {
    if (open && clientId) {
      // If data is not present, or is stale (e.g., older than 5 minutes), fetch it.
      // The prefetch function itself checks if it's already loading.
      if (!profileData || (!profileData.loading && !profileData.fetchedAt) || (profileData.fetchedAt && Date.now() - profileData.fetchedAt > 5 * 60 * 1000)) {
        prefetchClientProfile(clientId);
      }
    }
  }, [open, clientId, prefetchClientProfile, profileData]);

  // Reset tab when modal is closed or client changes
  useEffect(() => {
    if (!open) {
      setActiveTab(0);
    }
  }, [open]);

  // Adjust activeTab if it becomes invalid when permissions or tabs change
  useEffect(() => {
    if (activeTab >= visibleTabs.length) {
      setActiveTab(0);
    }
  }, [visibleTabs, activeTab]);

  const getInitials = (name) => {
    if (!name) return '';
    return name.split(' ').map(word => word[0]).join('').toUpperCase().substring(0, 2);
  };

  const formatDate = (dateField) => {
    if (!dateField) return '-';
    // Handle Firestore Timestamp or ISO string
    const date = typeof dateField.toDate === 'function' ? dateField.toDate() : new Date(dateField);
    return date.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined) return '-';
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
    if (loading && !client) { // Show main loader only if no client data is available yet
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '500px' }}>
          <CircularProgress />
        </Box>
      );
    }

    if (error === 'Not Found') {
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

    if (!client) { // Handles cases where there's no error but client is not yet loaded
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '500px' }}>
              <CircularProgress />
            </Box>
        );
    }

    const displayName = client.memberLegalName || client.name;
    const secondaryText = client.memberLegalName ? client.name : client.companyName;
    const activeTabLabel = visibleTabs[activeTab]?.label;

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
              {loading && <CircularProgress size={20} sx={{ ml: 2 }} />}
            </div>
            <div className={styles.detailsGrid}>
              <div className={styles.detailItem}><div className={styles.detailLabel}><Business className={styles.detailIcon} />Package</div><div className={styles.detailValue}>{client.purposeOfVisit || '-'}</div></div>
              <div className={styles.detailItem}><div className={styles.detailLabel}><Email className={styles.detailIcon} />Email</div><div className={styles.detailValue}>{client.convertedEmail || '-'}</div></div>
              <div className={styles.detailItem}><div className={styles.detailLabel}><Phone className={styles.detailIcon} />WhatsApp</div><div className={styles.detailValue}>{client.convertedWhatsapp || '-'}</div></div>
              {client.birthdayDay && client.birthdayMonth && <div className={styles.detailItem}><div className={styles.detailLabel}><Cake className={styles.detailIcon} />Birthday</div><div className={styles.detailValue}>{`${client.birthdayDay}/${client.birthdayMonth}`}</div></div>}
            </div>
          </div>

          <div className={styles.tabsSection}>
            <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)} className={styles.tabs} variant="fullWidth">
              {visibleTabs.map((tab, index) => (
                <Tab key={index} label={tab.label} />
              ))}
            </Tabs>

            {activeTabLabel === 'AGREEMENTS' && (
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
                            {agreement.memberLegalName && <div className={styles.agreementDetailRow}><span className={styles.agreementLabel}>Legal Name:</span><span className={styles.agreementValue}>{formatCurrency(agreement.memberLegalName)}</span></div>}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTabLabel === 'INVOICES' && (
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
            
            {activeTabLabel === 'MEMBERS' && (
              <div className={styles.tabContent}>
                <h4 className={styles.tabSectionTitle}>Associated Members</h4>
                {members.length === 0 ? (
                  <div className={styles.emptyState}><p>No members found for this client.</p></div>
                ) : (
                  <div className={styles.membersList}>
                    {members.map((member) => (
                      <Card key={member.id} className={styles.memberCard}>
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
