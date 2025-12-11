import { useState } from 'react';
import { Dialog, DialogContent, IconButton, Tabs, Tab, Card, CardContent, Button, Chip, useMediaQuery, useTheme } from '@mui/material';
import { Close, ArrowBack, Email, Phone, Cake, Person, Business, CalendarToday, AttachMoney, Description, KeyboardArrowDown, KeyboardArrowRight } from '@mui/icons-material';
import styles from './ClientProfile.module.css';

export default function ClientProfile({ client, isOpen, onClose, agreements = [], invoices = [] }) {
  const [activeTab, setActiveTab] = useState(0);
  const [expandedMembers, setExpandedMembers] = useState({});
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));

  if (!client) return null;

  // Get client's agreements and invoices
  const clientAgreements = agreements.filter(agreement => 
    agreement.email === client.email || 
    (client.members && client.members.some(member => member.email === agreement.email))
  );

  const clientInvoices = invoices.filter(invoice => 
    invoice.email === client.email || 
    (client.members && client.members.some(member => member.email === invoice.email))
  );

  // Get initials for avatar
  const getInitials = (name) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const toggleMemberExpansion = (memberId) => {
    setExpandedMembers(prev => ({
      ...prev,
      [memberId]: !prev[memberId]
    }));
  };

  const getPaymentStatusColor = (status) => {
    switch(status?.toLowerCase()) {
      case 'paid':
        return '#4caf50';
      case 'unpaid':
        return '#f44336';
      case 'overdue':
        return '#ff9800';
      case 'partially paid':
        return '#2196f3';
      default:
        return '#9e9e9e';
    }
  };

  return (
    <Dialog 
      open={isOpen} 
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      fullScreen={isMobile}
      className={styles.dialog}
    >
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <IconButton onClick={onClose} className={styles.backButton}>
            <ArrowBack />
          </IconButton>
          <h2>Member Profile</h2>
        </div>
        <IconButton onClick={onClose} className={styles.closeButton}>
          <Close />
        </IconButton>
      </div>

      <DialogContent className={styles.content}>
        {/* Profile Section */}
        <div className={styles.profileSection}>
          <div className={styles.profileHeader}>
            <div className={styles.avatarSection}>
              <div className={styles.avatar}>
                {getInitials(client.name)}
              </div>
              <div className={styles.basicInfo}>
                <h3 className={styles.clientName}>{client.name}</h3>
                {client.isPrimaryMember && (
                  <Chip 
                    label="Primary Member" 
                    size="small" 
                    className={styles.primaryBadge}
                  />
                )}
              </div>
            </div>
          </div>

          <div className={styles.detailsGrid}>
            <div className={styles.detailItem}>
              <div className={styles.detailLabel}>
                <Business className={styles.detailIcon} />
                Package
              </div>
              <div className={styles.detailValue}>{client.package || '-'}</div>
            </div>

            <div className={styles.detailItem}>
              <div className={styles.detailLabel}>
                <Email className={styles.detailIcon} />
                Email
              </div>
              <div className={styles.detailValue}>{client.email || '-'}</div>
            </div>

            <div className={styles.detailItem}>
              <div className={styles.detailLabel}>
                <Phone className={styles.detailIcon} />
                WhatsApp
              </div>
              <div className={styles.detailValue}>{client.phone || '-'}</div>
            </div>

            {client.dob && (
              <div className={styles.detailItem}>
                <div className={styles.detailLabel}>
                  <Cake className={styles.detailIcon} />
                  Birthday
                </div>
                <div className={styles.detailValue}>{formatDate(client.dob)}</div>
              </div>
            )}
          </div>
        </div>

        {/* Members Section - Only show for primary members with members */}
        {client.isPrimaryMember && client.members && client.members.length > 0 && (
          <div className={styles.membersSection}>
            <h4 className={styles.sectionTitle}>
              <Person className={styles.sectionIcon} />
              Team Members ({client.members.length})
            </h4>
            <div className={styles.membersList}>
              {client.members.map((member) => (
                <Card key={member.id} className={styles.memberCard}>
                  <CardContent className={styles.memberCardContent}>
                    <div className={styles.memberHeader}>
                      <div className={styles.memberInfo}>
                        <div className={styles.memberAvatar}>
                          {getInitials(member.name)}
                        </div>
                        <div>
                          <div className={styles.memberName}>{member.name}</div>
                          <div className={styles.memberPackage}>{member.package}</div>
                        </div>
                      </div>
                      <IconButton 
                        size="small"
                        onClick={() => toggleMemberExpansion(member.id)}
                        className={styles.expandButton}
                      >
                        {expandedMembers[member.id] ? <KeyboardArrowDown /> : <KeyboardArrowRight />}
                      </IconButton>
                    </div>
                    
                    {expandedMembers[member.id] && (
                      <div className={styles.memberDetails}>
                        <div className={styles.memberDetailItem}>
                          <Email className={styles.memberDetailIcon} />
                          <span>{member.email}</span>
                        </div>
                        <div className={styles.memberDetailItem}>
                          <Phone className={styles.memberDetailIcon} />
                          <span>{member.phone}</span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Tabs Section */}
        <div className={styles.tabsSection}>
          <Tabs 
            value={activeTab} 
            onChange={(e, newValue) => setActiveTab(newValue)}
            className={styles.tabs}
          >
            <Tab label="AGREEMENTS" />
            <Tab label="INVOICES" />
          </Tabs>

          {/* Agreements Tab */}
          {activeTab === 0 && (
            <div className={styles.tabContent}>
              <h4 className={styles.tabSectionTitle}>Recent Agreements</h4>
              {clientAgreements.length === 0 ? (
                <div className={styles.emptyState}>
                  <Description className={styles.emptyIcon} />
                  <p>No agreements found for this member</p>
                </div>
              ) : (
                <div className={styles.agreementsList}>
                  {clientAgreements.map((agreement) => (
                    <Card key={agreement.id} className={styles.agreementCard}>
                      <CardContent>
                        <div className={styles.agreementHeader}>
                          <div className={styles.agreementNumber}>
                            Agreement {agreement.agreementNumber || `#${agreement.id}`}
                          </div>
                          {agreement.serviceAgreementType && (
                            <Chip 
                              label={agreement.serviceAgreementType}
                              size="small"
                              className={styles.agreementType}
                            />
                          )}
                        </div>
                        <div className={styles.agreementDetails}>
                          <div className={styles.agreementDetailRow}>
                            <span className={styles.agreementLabel}>Start Date:</span>
                            <span className={styles.agreementValue}>{formatDate(agreement.startDate)}</span>
                          </div>
                          <div className={styles.agreementDetailRow}>
                            <span className={styles.agreementLabel}>End Date:</span>
                            <span className={styles.agreementValue}>{formatDate(agreement.endDate)}</span>
                          </div>
                          {agreement.totalMonthlyPayment && (
                            <div className={styles.agreementDetailRow}>
                              <span className={styles.agreementLabel}>Monthly Payment:</span>
                              <span className={styles.agreementValue}>
                                {formatCurrency(agreement.totalMonthlyPayment)}
                              </span>
                            </div>
                          )}
                          {agreement.memberLegalName && (
                            <div className={styles.agreementDetailRow}>
                              <span className={styles.agreementLabel}>Legal Name:</span>
                              <span className={styles.agreementValue}>{agreement.memberLegalName}</span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Invoices Tab */}
          {activeTab === 1 && (
            <div className={styles.tabContent}>
              <h4 className={styles.tabSectionTitle}>Recent Invoices</h4>
              {clientInvoices.length === 0 ? (
                <div className={styles.emptyState}>
                  <Description className={styles.emptyIcon} />
                  <p>No invoices found for this member</p>
                </div>
              ) : (
                <div className={styles.invoicesList}>
                  {clientInvoices.map((invoice) => (
                    <Card key={invoice.id} className={styles.invoiceCard}>
                      <CardContent>
                        <div className={styles.invoiceHeader}>
                          <div className={styles.invoiceNumber}>
                            Invoice {invoice.invoiceNumber || `#${invoice.id}`}
                          </div>
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
                          <div className={styles.invoiceDetailRow}>
                            <span className={styles.invoiceLabel}>Date:</span>
                            <span className={styles.invoiceValue}>{formatDate(invoice.date)}</span>
                          </div>
                          <div className={styles.invoiceDetailRow}>
                            <span className={styles.invoiceLabel}>Amount:</span>
                            <span className={styles.invoiceValue}>
                              {formatCurrency(invoice.totalPrice || invoice.price || 0)}
                            </span>
                          </div>
                          {invoice.description && (
                            <div className={styles.invoiceDetailRow}>
                              <span className={styles.invoiceLabel}>Description:</span>
                              <span className={styles.invoiceValue}>{invoice.description}</span>
                            </div>
                          )}
                          {invoice.dateOfPayment && (
                            <div className={styles.invoiceDetailRow}>
                              <span className={styles.invoiceLabel}>Payment Date:</span>
                              <span className={styles.invoiceValue}>{formatDate(invoice.dateOfPayment)}</span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}