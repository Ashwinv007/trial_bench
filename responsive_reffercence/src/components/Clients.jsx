import { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, TextField, Button, IconButton, useMediaQuery, useTheme } from '@mui/material';
import { Close, AddCircleOutline, FileDownload, KeyboardArrowDown, KeyboardArrowRight } from '@mui/icons-material';
import ClientProfile from './ClientProfile';
import styles from './Clients.module.css';

// Sample data structure
const clientsData = [
  {
    id: 1,
    name: 'Diana Prince',
    email: 'diana@themyscira.corp',
    phone: '+918078514590',
    package: 'Dedicated Desk',
    isPrimaryMember: true,
    convertedFromLead: true,
    members: [
      {
        id: 101,
        name: 'Steve Trevor',
        email: 'steve@themyscira.corp',
        phone: '+918078514591',
        package: 'Flexi Desk',
        isPrimaryMember: false,
        convertedFromLead: false,
      },
      {
        id: 102,
        name: 'Barbara Minerva',
        email: 'barbara@themyscira.corp',
        phone: '+918078514592',
        package: 'Meeting Room Access',
        isPrimaryMember: false,
        convertedFromLead: false,
      },
    ],
  },
  {
    id: 2,
    name: 'Bruce Wayne',
    email: 'bruce@wayne.corp',
    phone: '+918078514593',
    package: 'Private Cabin',
    isPrimaryMember: true,
    convertedFromLead: true,
    members: [],
  },
  {
    id: 3,
    name: 'Clark Kent',
    email: 'clark@dailyplanet.com',
    phone: '+918078514594',
    package: 'Dedicated Desk',
    isPrimaryMember: true,
    convertedFromLead: true,
    members: [
      {
        id: 103,
        name: 'Lois Lane',
        email: 'lois@dailyplanet.com',
        phone: '+918078514595',
        package: 'Flexi Desk',
        isPrimaryMember: false,
        convertedFromLead: false,
      },
    ],
  },
  {
    id: 4,
    name: 'Barry Allen',
    email: 'barry@starlabs.com',
    phone: '+918078514596',
    package: 'Flexi Desk',
    isPrimaryMember: false,
    convertedFromLead: false,
    members: [],
  },
];

// Sample agreements data
const sampleAgreements = [
  {
    id: 1,
    email: 'diana@themyscira.corp',
    agreementNumber: 'TB25HD0003',
    startDate: '2025-11-14',
    endDate: '2026-08-14',
    serviceAgreementType: 'Dedicated Desk',
    totalMonthlyPayment: 15000,
    memberLegalName: 'Diana Prince Enterprises',
  },
  {
    id: 2,
    email: 'bruce@wayne.corp',
    agreementNumber: 'TB25HD0001',
    startDate: '2025-10-01',
    endDate: '2026-10-01',
    serviceAgreementType: 'Private Cabin',
    totalMonthlyPayment: 35000,
    memberLegalName: 'Wayne Enterprises',
  },
];

// Sample invoices data
const sampleInvoices = [
  {
    id: 1,
    email: 'diana@themyscira.corp',
    invoiceNumber: 'WCP2511002',
    date: '2025-11-13',
    totalPrice: 15000,
    paymentStatus: 'Paid',
    dateOfPayment: '2025-11-13',
    description: 'Dedicated Desk - November 2025',
  },
  {
    id: 2,
    email: 'bruce@wayne.corp',
    invoiceNumber: 'WCP2511001',
    date: '2025-11-01',
    totalPrice: 35000,
    paymentStatus: 'Unpaid',
    dateOfPayment: null,
    description: 'Private Cabin - November 2025',
  },
  {
    id: 3,
    email: 'diana@themyscira.corp',
    invoiceNumber: 'WCP2510002',
    date: '2025-10-28',
    totalPrice: 15000,
    paymentStatus: 'Paid',
    dateOfPayment: '2025-10-28',
    description: 'Dedicated Desk - October 2025',
  },
];

export default function Clients() {
  const [clients, setClients] = useState(clientsData);
  const [filterType, setFilterType] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPrimaryMember, setSelectedPrimaryMember] = useState(null);
  const [expandedRows, setExpandedRows] = useState({});
  const [selectedClient, setSelectedClient] = useState(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    package: '',
  });

  // Add responsive dialog support
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const handleAddMember = (primaryMember) => {
    setSelectedPrimaryMember(primaryMember);
    setFormData({
      name: '',
      email: '',
      phone: '',
      package: '',
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedPrimaryMember(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const newMember = {
      id: Date.now(),
      ...formData,
      isPrimaryMember: false,
      convertedFromLead: false,
    };

    setClients((prev) =>
      prev.map((client) =>
        client.id === selectedPrimaryMember.id
          ? { ...client, members: [...client.members, newMember] }
          : client
      )
    );

    handleCloseModal();
  };

  const handleExport = () => {
    // Export functionality - for now just log
    console.log('Exporting clients data...');
    alert('Export functionality will download client data as CSV/Excel');
  };

  const toggleRow = (clientId) => {
    setExpandedRows((prev) => ({
      ...prev,
      [clientId]: !prev[clientId],
    }));
  };

  const handleOpenProfile = (client) => {
    setSelectedClient(client);
    setIsProfileOpen(true);
  };

  const handleCloseProfile = () => {
    setIsProfileOpen(false);
    setSelectedClient(null);
  };

  // Filter clients based on selected filter
  const filteredClients = clients.filter((client) => {
    if (filterType === 'All') return true;
    if (filterType === 'Primary Member') return client.isPrimaryMember;
    return true;
  });

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        {/* Header */}
        <div className={styles.header}>
          <button className={styles.exportButton} onClick={handleExport}>
            <FileDownload className={styles.exportIcon} />
            Export
          </button>
        </div>

        {/* Filter Tabs */}
        <div className={styles.filterContainer}>
          <button
            className={`${styles.filterTab} ${filterType === 'All' ? styles.activeFilter : ''}`}
            onClick={() => setFilterType('All')}
          >
            All Clients
            <span className={styles.filterCount}>{clients.length}</span>
          </button>
          <button
            className={`${styles.filterTab} ${filterType === 'Primary Member' ? styles.activeFilter : ''}`}
            onClick={() => setFilterType('Primary Member')}
          >
            Primary Members
            <span className={styles.filterCount}>
              {clients.filter(c => c.isPrimaryMember).length}
            </span>
          </button>
        </div>

        {/* Table */}
        <div className={styles.tableCard}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th style={{ width: '40px' }}></th>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Package</th>
                <th style={{ width: '60px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredClients.map((client) => (
                <>
                  {/* Primary Member Row */}
                  <tr 
                    key={client.id} 
                    className={styles.primaryRow}
                    onClick={() => handleOpenProfile(client)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td onClick={(e) => e.stopPropagation()}>
                      {client.isPrimaryMember && client.members.length > 0 && (
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleRow(client.id);
                          }}
                          className={styles.expandButton}
                        >
                          {expandedRows[client.id] ? (
                            <KeyboardArrowDown fontSize="small" />
                          ) : (
                            <KeyboardArrowRight fontSize="small" />
                          )}
                        </IconButton>
                      )}
                    </td>
                    <td>
                      <div className={styles.nameCell}>
                        <span className={styles.nameText}>{client.name}</span>
                        {client.isPrimaryMember && (
                          <span className={styles.primaryBadge}>Primary</span>
                        )}
                      </div>
                    </td>
                    <td>{client.email}</td>
                    <td>{client.phone}</td>
                    <td>
                      <span className={styles.packageBadge}>
                        <span className={styles.packageDot}></span>
                        {client.package}
                      </span>
                    </td>
                    <td>
                      {client.convertedFromLead && (
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddMember(client);
                          }}
                          className={styles.addMemberButton}
                          title="Add member under this client"
                        >
                          <AddCircleOutline fontSize="small" />
                        </IconButton>
                      )}
                    </td>
                  </tr>

                  {/* Nested Members Rows */}
                  {expandedRows[client.id] &&
                    client.members.map((member) => (
                      <tr key={member.id} className={styles.nestedRow}>
                        <td></td>
                        <td>
                          <div className={styles.nestedNameCell}>
                            <span className={styles.nestedIndicator}>└─</span>
                            <span className={styles.nameText}>{member.name}</span>
                          </div>
                        </td>
                        <td>{member.email}</td>
                        <td>{member.phone}</td>
                        <td>
                          <span className={styles.packageBadge}>
                            <span className={styles.packageDot}></span>
                            {member.package}
                          </span>
                        </td>
                        <td></td>
                      </tr>
                    ))}
                </>
              ))}
            </tbody>
          </table>

          {filteredClients.length === 0 && (
            <div className={styles.emptyState}>
              <p>No clients found for the selected filter.</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Member Modal */}
      <Dialog
        open={isModalOpen}
        onClose={handleCloseModal}
        maxWidth="sm"
        fullWidth
        fullScreen={isMobile}
        PaperProps={{
          style: {
            borderRadius: isMobile ? '0' : '12px',
          },
        }}
      >
        <DialogTitle
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            padding: isMobile ? '16px' : '20px 24px',
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                color: '#1a4d5c',
                fontSize: isMobile ? '18px' : '20px',
                fontWeight: 600,
              }}
            >
              Add Member
            </h2>
            <p
              style={{
                margin: '4px 0 0 0',
                color: '#64748b',
                fontSize: isMobile ? '13px' : '14px',
                fontWeight: 400,
              }}
            >
              Add a new member under {selectedPrimaryMember?.name}
            </p>
          </div>
          <IconButton onClick={handleCloseModal} size="small">
            <Close />
          </IconButton>
        </DialogTitle>

        <DialogContent style={{ padding: isMobile ? '16px' : '24px' }}>
          <form onSubmit={handleSubmit}>
            <div className={styles.formGrid}>
              <TextField
                label="Name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
                size="small"
                required
                style={{ marginBottom: '16px' }}
              />
              <TextField
                label="Email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
                size="small"
                required
                style={{ marginBottom: '16px' }}
              />
              <TextField
                label="Phone"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
                size="small"
                required
                style={{ marginBottom: '16px' }}
              />
              <TextField
                label="Package"
                name="package"
                value={formData.package}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
                size="small"
                required
                placeholder="e.g., Flexi Desk, Meeting Room Access"
              />
            </div>

            {/* Action Buttons */}
            <div className={styles.modalActions}>
              <Button
                onClick={handleCloseModal}
                variant="outlined"
                style={{
                  color: '#64748b',
                  borderColor: '#cbd5e1',
                  textTransform: 'none',
                  padding: '8px 24px',
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                style={{
                  backgroundColor: '#2b7a8e',
                  color: 'white',
                  textTransform: 'none',
                  padding: '8px 24px',
                }}
              >
                Add Member
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Client Profile Modal */}
      <ClientProfile 
        client={selectedClient}
        isOpen={isProfileOpen}
        onClose={handleCloseProfile}
        agreements={sampleAgreements}
        invoices={sampleInvoices}
      />
    </div>
  );
}