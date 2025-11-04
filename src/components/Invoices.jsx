import { useState, useEffect, useContext, useMemo } from 'react';
import { Dialog, DialogTitle, DialogContent, TextField, Button, IconButton, Autocomplete, Select, MenuItem } from '@mui/material';
import { Close, AddCircleOutline } from '@mui/icons-material';
import styles from './Invoices.module.css';
import { FirebaseContext } from '../store/Context';
import { collection, getDocs, addDoc, doc, updateDoc } from 'firebase/firestore';

export default function Invoices() {
  const { db } = useContext(FirebaseContext);
  const [invoices, setInvoices] = useState([]);
  const [members, setMembers] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPaymentDateModalOpen, setIsPaymentDateModalOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState(null);
  const [paymentDate, setPaymentDate] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [formData, setFormData] = useState({
    memberId: null,
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

  useEffect(() => {
    if (!db) return;

    const fetchInvoices = async () => {
      const invoicesCollection = collection(db, 'invoices');
      const invoicesSnapshot = await getDocs(invoicesCollection);
      const invoicesData = invoicesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setInvoices(invoicesData);
    };

    const fetchMembers = async () => {
      const membersCollection = collection(db, 'members');
      const membersSnapshot = await getDocs(membersCollection);
      const membersData = membersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMembers(membersData);
    };

    fetchInvoices();
    fetchMembers();
  }, [db]);

  const invoicesWithMemberData = useMemo(() => {
    if (!invoices.length || !members.length) return [];
    return invoices.map(invoice => {
      const member = members.find(m => m.id === invoice.memberId);
      return {
        ...invoice,
        name: member ? member.name : 'Unknown Member',
        phone: member ? member.whatsapp : 'N/A',
        email: member ? member.email : 'N/A',
      };
    });
  }, [invoices, members]);

  const handleOpenModal = () => {
    setEditingInvoice(null);
    setFormData({
      memberId: null,
      legalName: '',
      address: '',
      invoiceNumber: '',
      date: new Date().toISOString().split('T')[0], // Default to today
      month: '',
      year: new Date().getFullYear().toString(),
      fromDate: '',
      toDate: '',
      description: '',
      sacCode: '998599',
      price: '',
      quantity: 1,
      totalPrice: '',
      discountPercentage: 0,
    });
    setIsModalOpen(true);
  };

  const handleEditInvoice = (invoice, e) => {
    if (e.target.closest(`.${styles.statusBadge}`)) return;

    setEditingInvoice(invoice);
    setFormData({
      memberId: invoice.memberId,
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

  const handleMemberSelect = (event, member) => {
    if (member) {
      setFormData(prev => ({
        ...prev,
        memberId: member.id,
        legalName: member.company && member.company !== 'NA' ? member.company : member.name,
        address: 'Address field not in member data', // Placeholder
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        memberId: null,
        legalName: '',
        address: '',
      }));
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };
      if (['price', 'quantity', 'discountPercentage'].includes(name)) {
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.memberId) {
      alert("Please select a member.");
      return;
    }

    const { name, phone, email, ...invoicePayload } = formData;

    if (editingInvoice) {
      const invoiceRef = doc(db, "invoices", editingInvoice.id);
      await updateDoc(invoiceRef, invoicePayload);
      setInvoices(prev => prev.map(inv => inv.id === editingInvoice.id ? { ...inv, ...invoicePayload } : inv));
    } else {
      try {
        const docRef = await addDoc(collection(db, "invoices"), invoicePayload);
        setInvoices(prev => [...prev, { id: docRef.id, ...invoicePayload }]);
      } catch (error) {
        console.error("Error adding document: ", error);
      }
    }
    handleCloseModal();
  };

  const togglePaymentStatus = async (invoice, e) => {
    e.stopPropagation();
    if (invoice.paymentStatus === 'Paid') {
      const invoiceRef = doc(db, "invoices", invoice.id);
      await updateDoc(invoiceRef, { paymentStatus: 'Unpaid', dateOfPayment: null });
      setInvoices(prev => prev.map(inv => inv.id === invoice.id ? { ...inv, paymentStatus: 'Unpaid', dateOfPayment: null } : inv));
    } else {
      setSelectedInvoiceForPayment(invoice);
      setPaymentDate('');
      setIsPaymentDateModalOpen(true);
    }
  };

  const handlePaymentDateSubmit = async () => {
    if (paymentDate && selectedInvoiceForPayment) {
      const invoiceRef = doc(db, "invoices", selectedInvoiceForPayment.id);
      await updateDoc(invoiceRef, { paymentStatus: 'Paid', dateOfPayment: paymentDate });
      setInvoices(prev => prev.map(inv => inv.id === selectedInvoiceForPayment.id ? { ...inv, paymentStatus: 'Paid', dateOfPayment: paymentDate } : inv));
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

  const filteredInvoices = invoicesWithMemberData.filter((invoice) => {
    if (filterStatus === 'All') return true;
    return invoice.paymentStatus === filterStatus;
  });

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerText}>
            <h1 className={styles.title}>Invoices</h1>
            <p className={styles.subtitle}>Manage and generate client invoices.</p>
          </div>
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
                      className={`${styles.statusBadge} ${styles[invoice.paymentStatus ? invoice.paymentStatus.toLowerCase() : 'default']}`}
                      onClick={(e) => togglePaymentStatus(invoice, e)}
                    >
                      {invoice.paymentStatus || 'Unknown'}
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
        PaperProps={{
          style: {
            borderRadius: '12px',
          }
        }}
      >
        <DialogTitle style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          backgroundColor: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
          padding: '20px 24px'
        }}>
          <div>
            <h2 style={{ 
              margin: 0, 
              color: '#1a4d5c', 
              fontSize: '18px',
              fontWeight: 600 
            }}>
              Payment Date
            </h2>
            <p style={{ 
              margin: '4px 0 0 0', 
              color: '#64748b', 
              fontSize: '14px',
              fontWeight: 400
            }}>
              Select the date when payment was received
            </p>
          </div>
          <IconButton onClick={() => setIsPaymentDateModalOpen(false)} size="small">
            <Close />
          </IconButton>
        </DialogTitle>
        
        <DialogContent style={{ padding: '24px' }}>
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
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <Button 
              onClick={() => setIsPaymentDateModalOpen(false)} 
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
              onClick={handlePaymentDateSubmit} 
              variant="contained"
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
        PaperProps={{
          style: {
            borderRadius: '12px',
          }
        }}
      >
        <DialogTitle style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          backgroundColor: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
          padding: '20px 24px'
        }}>
          <div>
            <h2 style={{ 
              margin: 0, 
              color: '#1a4d5c', 
              fontSize: '20px',
              fontWeight: 600 
            }}>
              {editingInvoice ? 'Edit Invoice' : 'Generate Invoice'}
            </h2>
            <p style={{ 
              margin: '4px 0 0 0', 
              color: '#64748b', 
              fontSize: '14px',
              fontWeight: 400
            }}>
              {editingInvoice ? 'Update invoice details' : 'Fill in the details to generate a new invoice'}
            </p>
          </div>
          <IconButton onClick={handleCloseModal} size="small">
            <Close />
          </IconButton>
        </DialogTitle>
        
        <DialogContent style={{ padding: '24px' }}>
          <form onSubmit={handleSubmit}>
            {/* Client Details Section */}
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Client Details</h3>
              <div className={styles.formGrid} style={{ gridTemplateColumns: '1fr' }}>
                <Autocomplete
                  options={members}
                  getOptionLabel={(option) => `${option.name} (${option.company !== 'NA' ? option.company : 'Individual'})`}
                  onChange={handleMemberSelect}
                  value={members.find(m => m.id === formData.memberId) || null}
                  disabled={!!editingInvoice}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Select Member"
                      variant="outlined"
                      size="small"
                      required
                    />
                  )}
                />
                 <TextField
                  label="Legal Name (for invoice)"
                  name="legalName"
                  value={formData.legalName}
                  onChange={handleInputChange}
                  fullWidth
                  variant="outlined"
                  size="small"
                  required
                  style={{ marginTop: '16px' }}
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
                  style={{ marginTop: '16px' }}
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
                <Select
                  label="Month"
                  name="month"
                  value={formData.month}
                  onChange={handleInputChange}
                  fullWidth
                  variant="outlined"
                  size="small"
                  displayEmpty
                >
                  <MenuItem value="" disabled>
                    Select Month
                  </MenuItem>
                  <MenuItem value="January">January</MenuItem>
                  <MenuItem value="February">February</MenuItem>
                  <MenuItem value="March">March</MenuItem>
                  <MenuItem value="April">April</MenuItem>
                  <MenuItem value="May">May</MenuItem>
                  <MenuItem value="June">June</MenuItem>
                  <MenuItem value="July">July</MenuItem>
                  <MenuItem value="August">August</MenuItem>
                  <MenuItem value="September">September</MenuItem>
                  <MenuItem value="October">October</MenuItem>
                  <MenuItem value="November">November</MenuItem>
                  <MenuItem value="December">December</MenuItem>
                </Select>
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
