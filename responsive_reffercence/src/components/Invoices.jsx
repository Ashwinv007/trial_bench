import { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, TextField, Button, IconButton, useMediaQuery, useTheme } from '@mui/material';
import { Close, AddCircleOutline } from '@mui/icons-material';
import styles from './Invoices.module.css';

const invoicesData = [
  {
    id: 1,
    name: 'Diana Prince',
    phone: '+918078514590',
    email: 'diana@themyscira.corp',
    paymentStatus: 'Paid',
    dateOfPayment: '2025-10-28',
    legalName: 'Diana Prince Enterprises',
    address: '123 Paradise Island, Themyscira',
    invoiceNumber: 'INV-2025-001',
    date: '2025-10-01',
    month: 'October',
    year: '2025',
    fromDate: '2025-10-01',
    toDate: '2025-10-31',
    description: 'Dedicated Desk - October 2025',
    sacCode: '998599',
    price: 15000,
    quantity: 1,
    totalPrice: 15000,
    discountPercentage: 0,
  },
  {
    id: 2,
    name: 'Alice Johnson',
    phone: '+918078514587',
    email: 'alice@innovate.com',
    paymentStatus: 'Unpaid',
    dateOfPayment: null,
    legalName: 'Innovate Solutions Ltd',
    address: '456 Tech Park, Bangalore',
    invoiceNumber: 'INV-2025-002',
    date: '2025-10-15',
    month: 'October',
    year: '2025',
    fromDate: '2025-10-01',
    toDate: '2025-10-31',
    description: 'Flexi Desk - October 2025',
    sacCode: '998599',
    price: 8000,
    quantity: 1,
    totalPrice: 8000,
    discountPercentage: 10,
  },
  {
    id: 3,
    name: 'Bob Williams',
    phone: '+918078514588',
    email: 'bob@solutions.io',
    paymentStatus: 'Paid',
    dateOfPayment: '2025-10-30',
    legalName: 'Williams & Co',
    address: '789 Business Center, Mumbai',
    invoiceNumber: 'INV-2025-003',
    date: '2025-10-05',
    month: 'October',
    year: '2025',
    fromDate: '2025-10-01',
    toDate: '2025-10-31',
    description: 'Private Cabin - October 2025',
    sacCode: '998599',
    price: 25000,
    quantity: 1,
    totalPrice: 25000,
    discountPercentage: 5,
  },
];

export default function Invoices() {
  const [invoices, setInvoices] = useState(invoicesData);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPaymentDateModalOpen, setIsPaymentDateModalOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState(null);
  const [paymentDate, setPaymentDate] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [formData, setFormData] = useState({
    legalName: '',
    address: '',
    invoiceNumber: '',
    date: '',
    month: '',
    year: '',
    fromDate: '',
    toDate: '',
    description: '',
    sacCode: '',
    price: '',
    quantity: 1,
    totalPrice: '',
    discountPercentage: 0,
  });

  // Add responsive dialog support
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const handleOpenModal = () => {
    setEditingInvoice(null);
    // Reset form
    setFormData({
      legalName: '',
      address: '',
      invoiceNumber: '',
      date: '',
      month: '',
      year: '',
      fromDate: '',
      toDate: '',
      description: '',
      sacCode: '',
      price: '',
      quantity: 1,
      totalPrice: '',
      discountPercentage: 0,
    });
    setIsModalOpen(true);
  };

  const handleEditInvoice = (invoice, e) => {
    // Prevent row click if clicking on status badge
    if (e.target.closest(`.${styles.statusBadge}`)) {
      return;
    }

    setEditingInvoice(invoice);
    setFormData({
      legalName: invoice.legalName,
      address: invoice.address,
      invoiceNumber: invoice.invoiceNumber,
      date: invoice.date,
      month: invoice.month || '',
      year: invoice.year || '',
      fromDate: invoice.fromDate || '',
      toDate: invoice.toDate || '',
      description: invoice.description,
      sacCode: invoice.sacCode,
      price: invoice.price,
      quantity: invoice.quantity,
      totalPrice: invoice.totalPrice,
      discountPercentage: invoice.discountPercentage,
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingInvoice(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updated = {
        ...prev,
        [name]: value,
      };

      // Auto-calculate total price when price, quantity, or discount changes
      if (name === 'price' || name === 'quantity' || name === 'discountPercentage') {
        const price = parseFloat(name === 'price' ? value : updated.price) || 0;
        const quantity = parseFloat(name === 'quantity' ? value : updated.quantity) || 0;
        const discount = parseFloat(name === 'discountPercentage' ? value : updated.discountPercentage) || 0;
        
        const subtotal = price * quantity;
        const discountAmount = (subtotal * discount) / 100;
        updated.totalPrice = (subtotal - discountAmount).toFixed(2);
      }

      return updated;
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (editingInvoice) {
      // Update existing invoice
      setInvoices((prev) =>
        prev.map((invoice) =>
          invoice.id === editingInvoice.id
            ? { ...invoice, ...formData }
            : invoice
        )
      );
    } else {
      // Generate a new invoice
      const newInvoice = {
        id: invoices.length + 1,
        name: formData.legalName.split(' ')[0] + ' ' + (formData.legalName.split(' ')[1] || ''),
        phone: '+91XXXXXXXXXX', // Placeholder
        email: 'email@example.com', // Placeholder
        paymentStatus: 'Unpaid',
        dateOfPayment: null,
        ...formData,
      };

      setInvoices((prev) => [...prev, newInvoice]);
    }

    handleCloseModal();
  };

  const togglePaymentStatus = (invoice, e) => {
    e.stopPropagation();
    
    if (invoice.paymentStatus === 'Paid') {
      // Mark as unpaid
      setInvoices((prev) =>
        prev.map((inv) =>
          inv.id === invoice.id
            ? { ...inv, paymentStatus: 'Unpaid', dateOfPayment: null }
            : inv
        )
      );
    } else {
      // Mark as paid - ask for payment date
      setSelectedInvoiceForPayment(invoice);
      setPaymentDate('');
      setIsPaymentDateModalOpen(true);
    }
  };

  const handlePaymentDateSubmit = () => {
    if (paymentDate && selectedInvoiceForPayment) {
      setInvoices((prev) =>
        prev.map((inv) =>
          inv.id === selectedInvoiceForPayment.id
            ? { ...inv, paymentStatus: 'Paid', dateOfPayment: paymentDate }
            : inv
        )
      );
      setIsPaymentDateModalOpen(false);
      setSelectedInvoiceForPayment(null);
      setPaymentDate('');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  // Filter invoices based on selected filter
  const filteredInvoices = invoices.filter((invoice) => {
    if (filterStatus === 'All') return true;
    return invoice.paymentStatus === filterStatus;
  });

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        {/* Header */}
        <div className={styles.header}>
          <button className={styles.addButton} onClick={handleOpenModal}>
            <AddCircleOutline className={styles.addIcon} />
            Generate Invoice
          </button>
        </div>

        {/* Filter Tabs */}
        <div className={styles.filterContainer}>
          <button
            className={`${styles.filterTab} ${filterStatus === 'All' ? styles.activeFilter : ''}`}
            onClick={() => setFilterStatus('All')}
          >
            All Invoices
            <span className={styles.filterCount}>{invoices.length}</span>
          </button>
          <button
            className={`${styles.filterTab} ${filterStatus === 'Paid' ? styles.activeFilter : ''}`}
            onClick={() => setFilterStatus('Paid')}
          >
            Paid
            <span className={styles.filterCount}>
              {invoices.filter(inv => inv.paymentStatus === 'Paid').length}
            </span>
          </button>
          <button
            className={`${styles.filterTab} ${filterStatus === 'Unpaid' ? styles.activeFilter : ''}`}
            onClick={() => setFilterStatus('Unpaid')}
          >
            Unpaid
            <span className={styles.filterCount}>
              {invoices.filter(inv => inv.paymentStatus === 'Unpaid').length}
            </span>
          </button>
        </div>

        {/* Table */}
        <div className={styles.tableCard}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Payment Status</th>
                <th>Name</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Date of Payment</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.map((invoice) => (
                <tr 
                  key={invoice.id}
                  onClick={(e) => handleEditInvoice(invoice, e)}
                  className={styles.clickableRow}
                >
                  <td>
                    <span 
                      className={`${styles.statusBadge} ${styles[invoice.paymentStatus.toLowerCase()]}`}
                      onClick={(e) => togglePaymentStatus(invoice, e)}
                    >
                      {invoice.paymentStatus}
                    </span>
                  </td>
                  <td>
                    <span className={styles.nameText}>{invoice.name}</span>
                  </td>
                  <td>{invoice.phone}</td>
                  <td>{invoice.email}</td>
                  <td>
                    {invoice.paymentStatus === 'Paid' ? formatDate(invoice.dateOfPayment) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredInvoices.length === 0 && (
            <div className={styles.emptyState}>
              <p>No invoices found for the selected filter.</p>
            </div>
          )}
        </div>
      </div>

      {/* Payment Date Modal */}
      <Dialog 
        open={isPaymentDateModalOpen} 
        onClose={() => setIsPaymentDateModalOpen(false)}
        maxWidth="xs"
        fullWidth
        fullScreen={isMobile}
        PaperProps={{
          style: {
            borderRadius: isMobile ? '0' : '12px',
          }
        }}
      >
        <DialogTitle style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          backgroundColor: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
          padding: isMobile ? '16px' : '20px 24px'
        }}>
          <div>
            <h2 style={{ 
              margin: 0, 
              color: '#1a4d5c', 
              fontSize: isMobile ? '16px' : '18px',
              fontWeight: 600 
            }}>
              Payment Date
            </h2>
            <p style={{ 
              margin: '4px 0 0 0', 
              color: '#64748b', 
              fontSize: isMobile ? '13px' : '14px',
              fontWeight: 400
            }}>
              Select the date when payment was received
            </p>
          </div>
          <IconButton onClick={() => setIsPaymentDateModalOpen(false)} size="small">
            <Close />
          </IconButton>
        </DialogTitle>
        
        <DialogContent style={{ padding: isMobile ? '16px' : '24px' }}>
          <TextField
            label="Payment Date"
            type="date"
            value={paymentDate}
            onChange={(e) => setPaymentDate(e.target.value)}
            fullWidth
            variant="outlined"
            size="small"
            InputLabelProps={{ shrink: true }}
            style={{ marginBottom: '24px' }}
          />
          
          <div style={{ 
            display: 'flex', 
            flexDirection: isMobile ? 'column-reverse' : 'row',
            justifyContent: 'flex-end', 
            gap: isMobile ? '8px' : '12px' 
          }}>
            <Button 
              onClick={() => setIsPaymentDateModalOpen(false)} 
              variant="outlined"
              fullWidth={isMobile}
              style={{
                color: '#64748b',
                borderColor: '#cbd5e1',
                textTransform: 'none',
                padding: '8px 24px'
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handlePaymentDateSubmit} 
              variant="contained"
              fullWidth={isMobile}
              disabled={!paymentDate}
              style={{
                backgroundColor: paymentDate ? '#2b7a8e' : '#cbd5e1',
                color: 'white',
                textTransform: 'none',
                padding: '8px 24px'
              }}
            >
              Mark as Paid
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Generate/Edit Invoice Modal */}
      <Dialog 
        open={isModalOpen} 
        onClose={handleCloseModal}
        maxWidth="md"
        fullWidth
        fullScreen={isMobile}
        PaperProps={{
          style: {
            borderRadius: isMobile ? '0' : '12px',
          }
        }}
      >
        <DialogTitle style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          backgroundColor: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
          padding: isMobile ? '16px' : '20px 24px'
        }}>
          <div>
            <h2 style={{ 
              margin: 0, 
              color: '#1a4d5c', 
              fontSize: isMobile ? '18px' : '20px',
              fontWeight: 600 
            }}>
              {editingInvoice ? 'Edit Invoice' : 'Generate Invoice'}
            </h2>
            <p style={{ 
              margin: '4px 0 0 0', 
              color: '#64748b', 
              fontSize: isMobile ? '13px' : '14px',
              fontWeight: 400
            }}>
              {editingInvoice ? 'Update invoice details' : 'Fill in the details to generate a new invoice'}
            </p>
          </div>
          <IconButton onClick={handleCloseModal} size="small">
            <Close />
          </IconButton>
        </DialogTitle>
        
        <DialogContent style={{ padding: isMobile ? '16px' : '24px' }}>
          <form onSubmit={handleSubmit}>
            {/* Client Details Section */}
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Client Details</h3>
              <div className={styles.formGrid}>
                <TextField
                  label="Legal Name"
                  name="legalName"
                  value={formData.legalName}
                  onChange={handleInputChange}
                  fullWidth
                  variant="outlined"
                  size="small"
                  required
                  style={{ gridColumn: '1 / -1' }}
                />
                <TextField
                  label="Address"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  fullWidth
                  variant="outlined"
                  size="small"
                  required
                  multiline
                  rows={2}
                  style={{ gridColumn: '1 / -1' }}
                />
              </div>
            </div>

            {/* Invoice Details Section */}
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Invoice Information</h3>
              <div className={styles.formGrid}>
                <TextField
                  label="Invoice Number"
                  name="invoiceNumber"
                  value={formData.invoiceNumber}
                  onChange={handleInputChange}
                  fullWidth
                  variant="outlined"
                  size="small"
                  required
                />
                <TextField
                  label="Date"
                  name="date"
                  type="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  fullWidth
                  variant="outlined"
                  size="small"
                  required
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  label="Month"
                  name="month"
                  value={formData.month}
                  onChange={handleInputChange}
                  fullWidth
                  variant="outlined"
                  size="small"
                  placeholder="e.g., January"
                />
                <TextField
                  label="Year"
                  name="year"
                  value={formData.year}
                  onChange={handleInputChange}
                  fullWidth
                  variant="outlined"
                  size="small"
                  placeholder="e.g., 2025"
                />
                <TextField
                  label="From Date"
                  name="fromDate"
                  type="date"
                  value={formData.fromDate}
                  onChange={handleInputChange}
                  fullWidth
                  variant="outlined"
                  size="small"
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  label="To Date"
                  name="toDate"
                  type="date"
                  value={formData.toDate}
                  onChange={handleInputChange}
                  fullWidth
                  variant="outlined"
                  size="small"
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  label="Description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  fullWidth
                  variant="outlined"
                  size="small"
                  required
                  style={{ gridColumn: '1 / -1' }}
                />
                <TextField
                  label="SAC Code"
                  name="sacCode"
                  value={formData.sacCode}
                  onChange={handleInputChange}
                  fullWidth
                  variant="outlined"
                  size="small"
                  required
                />
              </div>
            </div>

            {/* Pricing Section */}
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Pricing Details</h3>
              <div className={styles.formGrid}>
                <TextField
                  label="Price"
                  name="price"
                  type="number"
                  value={formData.price}
                  onChange={handleInputChange}
                  fullWidth
                  variant="outlined"
                  size="small"
                  required
                  inputProps={{ step: "0.01", min: "0" }}
                />
                <TextField
                  label="Quantity"
                  name="quantity"
                  type="number"
                  value={formData.quantity}
                  onChange={handleInputChange}
                  fullWidth
                  variant="outlined"
                  size="small"
                  required
                  inputProps={{ step: "1", min: "1" }}
                />
                <TextField
                  label="Discount (%)"
                  name="discountPercentage"
                  type="number"
                  value={formData.discountPercentage}
                  onChange={handleInputChange}
                  fullWidth
                  variant="outlined"
                  size="small"
                  inputProps={{ step: "0.01", min: "0", max: "100" }}
                />
                <TextField
                  label="Total Price"
                  name="totalPrice"
                  type="number"
                  value={formData.totalPrice}
                  fullWidth
                  variant="outlined"
                  size="small"
                  InputProps={{
                    readOnly: true,
                  }}
                  inputProps={{ step: "0.01" }}
                />
              </div>
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
                  padding: '8px 24px'
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
                  padding: '8px 24px'
                }}
              >
                {editingInvoice ? 'Update Invoice' : 'Generate Invoice'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}