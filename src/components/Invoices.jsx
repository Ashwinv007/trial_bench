import { useState, useEffect, useContext, useMemo } from 'react';
import { Dialog, DialogTitle, DialogContent, TextField, Button, IconButton, Autocomplete, Select, MenuItem } from '@mui/material';
import { Close, AddCircleOutline } from '@mui/icons-material';
import styles from './Invoices.module.css';
import { FirebaseContext, AuthContext } from '../store/Context';
import { collection, getDocs, addDoc, doc, updateDoc } from 'firebase/firestore';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { saveAs } from 'file-saver';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';

const formatDate = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  // Adjust for timezone offset to get the correct date
  const userTimezoneOffset = date.getTimezoneOffset() * 60000;
  const adjustedDate = new Date(date.getTime() + userTimezoneOffset);
  return adjustedDate.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const updateCalculationsAndDescription = (currentFormData, allMembers) => {
  const updated = { ...currentFormData };

  // --- Price and Tax Calculations ---
  const price = parseFloat(updated.price) || 0;
  const quantity = parseInt(updated.quantity, 10) || 0;
  const discount = parseFloat(updated.discountPercentage) || 0;
  const cgst = parseFloat(updated.cgstPercentage) || 0;
  const sgst = parseFloat(updated.sgstPercentage) || 0;

  const subtotal = price * quantity;
  const discountAmount = (subtotal * discount) / 100;
  const priceAfterDiscount = subtotal - discountAmount;
  
  const cgstAmount = (priceAfterDiscount * cgst) / 100;
  const sgstAmount = (priceAfterDiscount * sgst) / 100;
  const totalTax = cgstAmount + sgstAmount;
  
  const totalPayable = priceAfterDiscount + totalTax;

  updated.totalPrice = priceAfterDiscount.toFixed(2);
  updated.taxAmount = totalTax.toFixed(2);
updated.totalAmountPayable = totalPayable.toFixed(2);

  // --- Description Generation Logic ---
  const selectedMember = allMembers.find(m => m.id === updated.memberId);
  const packageName = selectedMember ? selectedMember.package : '';
  const invoiceMonth = updated.month;
  const invoiceYear = updated.year;
  const fromDate = updated.fromDate;
  const toDate = updated.toDate;

  let generatedDescription = packageName || '';
  if (packageName && invoiceMonth && invoiceYear) {
    let datePart = '';
    if (fromDate && toDate) {
      const formattedFromDate = formatDate(fromDate);
      const formattedToDate = formatDate(toDate);
      datePart = ` (From ${formattedFromDate} To ${formattedToDate})`;
    }
    generatedDescription = `${packageName}(${invoiceMonth} ${invoiceYear})${datePart}`;
  }
  updated.description = generatedDescription;

  return updated;
};

const generateInvoicePdf = async (invoiceData) => {
  const url = '/tb_invoice.pdf';
  const existingPdfBytes = await fetch(url).then(res => res.arrayBuffer());

  const pdfDoc = await PDFDocument.load(existingPdfBytes);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const pages = pdfDoc.getPages();
  const firstPage = pages[0];

  const {
    legalName,
    address,
    invoiceNumber,
    date,
    description,
    sacCode,
    price,
    quantity,
    discountPercentage,
    cgstPercentage,
    sgstPercentage,
    totalPrice, // This is priceAfterDiscount, which is the subtotal for the bottom part
    taxAmount,
    totalAmountPayable
  } = invoiceData;

  // Calculations
  const priceNum = parseFloat(price) || 0;
  const quantityNum = parseInt(quantity, 10) || 0;
  const discountPerc = parseFloat(discountPercentage) || 0;
  const cgstPerc = parseFloat(cgstPercentage) || 0;
  const sgstPerc = parseFloat(sgstPercentage) || 0;

  const lineItemSubtotal = priceNum * quantityNum;
  const discountAmount = (lineItemSubtotal * discountPerc) / 100;
  const priceAfterDiscount = parseFloat(totalPrice) || 0;
  const cgstAmount = (priceAfterDiscount * cgstPerc) / 100;
  const sgstAmount = (priceAfterDiscount * sgstPerc) / 100;

  // Helper for formatting
  const formatCurrency = (value) => typeof value === 'number' ? value.toFixed(2) : String(value);

  // Name
  firstPage.drawText(legalName || '', { x: 66, y: 620, size: 11, font, color: rgb(0, 0, 0), maxWidth: 250 });

  // Address
  firstPage.drawText(address || '', { x: 66, y: 607, size: 11, font, color: rgb(0, 0, 0), maxWidth: 200, lineHeight: 13 });

  // Invoice Number
  firstPage.drawText(invoiceNumber || '', { x: 450, y: 634, size: 11, font, color: rgb(0, 0, 0), maxWidth: 200 });

  // Date
  firstPage.drawText(formatDate(date) || '', { x: 450, y: 618, size: 11, font, color: rgb(0, 0, 0), maxWidth: 200 });

  // --- Table items ---
  // Description
  firstPage.drawText(description || '', { x: 66, y: 380, size: 10, font, color: rgb(0, 0, 0), maxWidth: 150,lineHeight:12 });

  // SAC
  firstPage.drawText(sacCode || '', { x: 306, y: 375, size: 10, font, color: rgb(0, 0, 0), maxWidth: 150 });

  // Price
  firstPage.drawText(formatCurrency(priceNum), { x: 385, y: 374, size: 10, font, color: rgb(0, 0, 0), maxWidth: 150 });

  // Qty
  firstPage.drawText(String(quantityNum), { x: 441, y: 374, size: 10, font, color: rgb(0, 0, 0), maxWidth: 150 });

  // Total (line item)
  firstPage.drawText(formatCurrency(lineItemSubtotal), { x: 500, y: 374, size: 10, font, color: rgb(0, 0, 0), maxWidth: 150 });

  // --- Totals section ---
  // Subtotal (Price after discount)
  firstPage.drawText(formatCurrency(priceAfterDiscount), { x: 490, y: 200, size: 10, font, color: rgb(0, 0, 0), maxWidth: 150 });

  // Discount
  firstPage.drawText(formatCurrency(discountAmount), { x: 490, y: 184, size: 10, font, color: rgb(0, 0, 0), maxWidth: 150 });

  // Tax
  firstPage.drawText(taxAmount, { x: 490, y: 169, size: 10, font, color: rgb(0, 0, 0), maxWidth: 150 });

  // CGST
  firstPage.drawText(formatCurrency(cgstAmount), { x: 490, y: 154, size: 10, font, color: rgb(0, 0, 0), maxWidth: 150 });

  // SGST
  firstPage.drawText(formatCurrency(sgstAmount), { x: 490, y: 137.5, size: 10, font, color: rgb(0, 0, 0), maxWidth: 150 });

  // Amount Payable
  firstPage.drawText(totalAmountPayable, { x: 490, y: 117, size: 13, font, color: rgb(0, 0, 0), maxWidth: 150 });

  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  saveAs(blob, `invoice-${invoiceNumber || 'new'}.pdf`);
};

export default function Invoices() {
  const { db } = useContext(FirebaseContext);
  const { hasPermission } = useContext(AuthContext);
  const [invoices, setInvoices] = useState([]);
  const [members, setMembers] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPaymentDateModalOpen, setIsPaymentDateModalOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState(null);
  const [paymentDate, setPaymentDate] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [invoiceGenerated, setInvoiceGenerated] = useState(null);
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
    sacCode: '997212',
    price: '',
    quantity: 1,
    totalPrice: '',
    discountPercentage: 0,
    cgstPercentage: 9,
    sgstPercentage: 9,
    taxAmount: '',
    totalAmountPayable: ''
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
    setInvoiceGenerated(null);
    const initialData = {
      memberId: null,
      legalName: '',
      address: '',
      invoiceNumber: '',
      date: new Date().toISOString().split('T')[0],
      month: '',
      year: new Date().getFullYear().toString(),
      fromDate: '',
      toDate: '',
      description: '',
      sacCode: '997212',
      price: '',
      quantity: 1,
      totalPrice: '',
      discountPercentage: 0,
      cgstPercentage: 9,
      sgstPercentage: 9,
      taxAmount: '',
      totalAmountPayable: ''
    };
    setFormData(updateCalculationsAndDescription(initialData, members));
    setIsModalOpen(true);
  };

  const handleEditInvoice = (invoice, e) => {
    if (!hasPermission('edit_invoices')) return;
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
      sacCode: invoice.sacCode || '997212',
      price: invoice.price,
      quantity: invoice.quantity,
      totalPrice: invoice.totalPrice,
      discountPercentage: invoice.discountPercentage,
      cgstPercentage: invoice.cgstPercentage !== undefined ? invoice.cgstPercentage : 9,
      sgstPercentage: invoice.sgstPercentage !== undefined ? invoice.sgstPercentage : 9,
      taxAmount: invoice.taxAmount || '',
      totalAmountPayable: invoice.totalAmountPayable || ''
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingInvoice(null);
    setInvoiceGenerated(null);
  };

  const handleMemberSelect = (event, member) => {
    setFormData(prev => {
      let updated = { ...prev };

      if (member) {
        updated.memberId = member.id;
        // Auto-fill legal details from member.legalDetails
        updated.legalName = member.legalDetails?.legalName || (member.company && member.company !== 'NA' ? member.company : member.name) || '';
        updated.address = member.legalDetails?.address || member.address || ''; // Use member.address as fallback

        // Auto-fill last invoice details
        if (member.lastInvoiceDetails) {
          updated.price = member.lastInvoiceDetails.price || '';
          updated.sacCode = member.lastInvoiceDetails.sacCode || '997212';
          updated.discountPercentage = member.lastInvoiceDetails.discountPercentage || 0;
          updated.cgstPercentage = member.lastInvoiceDetails.cgstPercentage !== undefined ? member.lastInvoiceDetails.cgstPercentage : 9;
          updated.sgstPercentage = member.lastInvoiceDetails.sgstPercentage !== undefined ? member.lastInvoiceDetails.sgstPercentage : 9;
          
          const lastToDate = member.lastInvoiceDetails.toDate;
          if (lastToDate) {
            const lastToDateObj = new Date(lastToDate);
            const newFromDateObj = new Date(Date.UTC(lastToDateObj.getUTCFullYear(), lastToDateObj.getUTCMonth(), lastToDateObj.getUTCDate() + 1));
            
            const newMonthIndex = newFromDateObj.getUTCMonth();
            const newYear = newFromDateObj.getUTCFullYear();
            
            const newToDateObj = new Date(Date.UTC(newYear, newMonthIndex + 1, 0));
            
            const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
            
            updated.month = monthNames[newMonthIndex];
            updated.year = newYear.toString();
            updated.fromDate = newFromDateObj.toISOString().split('T')[0];
            updated.toDate = newToDateObj.toISOString().split('T')[0];
          } else {
            updated.month = '';
            updated.year = new Date().getFullYear().toString();
            updated.fromDate = '';
            updated.toDate = '';
          }
        } else {
          // Reset to default invoice details if no saved data for this member
          updated.price = '';
          updated.sacCode = '997212';
          updated.discountPercentage = 0;
          updated.cgstPercentage = 9;
          updated.sgstPercentage = 9;
          updated.month = '';
          updated.year = new Date().getFullYear().toString();
          updated.fromDate = '';
          updated.toDate = '';
        }
      } else {
        // Member deselected, reset relevant fields to initial defaults
        updated.memberId = null;
        updated.legalName = '';
        updated.address = '';
        updated.sacCode = '997212';
        updated.price = '';
        updated.quantity = 1;
        updated.totalPrice = '';
        updated.discountPercentage = 0;
        updated.cgstPercentage = 9;
        updated.sgstPercentage = 9;
        updated.taxAmount = '';
        updated.totalAmountPayable = '';
        updated.description = '';
        updated.month = '';
        updated.year = new Date().getFullYear().toString();
        updated.fromDate = '';
        updated.toDate = '';
      }
      return updateCalculationsAndDescription(updated, members);
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => updateCalculationsAndDescription({ ...prev, [name]: value }, members));
  };

  const handleDateChange = (name, newValue) => {
    const formattedDate = newValue ? dayjs(newValue).format('YYYY-MM-DD') : '';
    setFormData((prev) => updateCalculationsAndDescription({ ...prev, [name]: formattedDate }, members));
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
      const updatedInvoice = { ...editingInvoice, ...invoicePayload };
      setInvoices(prev => prev.map(inv => inv.id === editingInvoice.id ? updatedInvoice : inv));
      setInvoiceGenerated(updatedInvoice);
    } else {
      try {
        const docRef = await addDoc(collection(db, "invoices"), invoicePayload);
        const newInvoice = { id: docRef.id, ...invoicePayload };
        setInvoices(prev => [...prev, newInvoice]);
        setInvoiceGenerated(newInvoice);

        // Save last invoice details to member
        const memberRef = doc(db, "members", formData.memberId);
        const lastInvoiceDetails = {
            sacCode: formData.sacCode,
            price: formData.price,
            discountPercentage: formData.discountPercentage,
            cgstPercentage: formData.cgstPercentage,
            sgstPercentage: formData.sgstPercentage,
            month: formData.month,
            fromDate: formData.fromDate,
            toDate: formData.toDate,
        };
        await updateDoc(memberRef, { lastInvoiceDetails: lastInvoiceDetails });

        // Update local members state to reflect the change
        setMembers(prevMembers => 
            prevMembers.map(m => 
                m.id === formData.memberId 
                    ? { ...m, lastInvoiceDetails: lastInvoiceDetails } 
                    : m
            )
        );

      } catch (error) {
        console.error("Error adding document: ", error);
      }
    }
  };

  const togglePaymentStatus = async (invoice, e) => {
    e.stopPropagation();
    if (!hasPermission('edit_invoices')) return;

    // If the invoice is already paid, do nothing when the badge is clicked.
    if (invoice.paymentStatus === 'Paid') {
      return; // Exit the function early
    }

    // If the invoice is not paid, open the modal to set the payment date.
    setSelectedInvoiceForPayment(invoice);
    setPaymentDate('');
    setIsPaymentDateModalOpen(true);
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
          {hasPermission('add_invoices') && (
            <button className={styles.addButton} onClick={handleOpenModal}>
              <AddCircleOutline className={styles.addIcon} />
              Generate Invoice
            </button>
          )}
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
                  className={hasPermission('edit_invoices') ? styles.clickableRow : ''}
                >
                                    <td>
                                      <span
                                        className={`${styles.statusBadge} ${styles[invoice.paymentStatus ? invoice.paymentStatus.toLowerCase() : 'unpaid']}`}
                                        onClick={(e) => togglePaymentStatus(invoice, e)}
                                      >
                                        {invoice.paymentStatus || 'Unpaid'}
                                      </span>
                                    </td>                  <td>
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
              {invoiceGenerated ? (editingInvoice ? 'Invoice Updated' : 'Invoice Generated') : (editingInvoice ? 'Edit Invoice' : 'Generate Invoice')}
            </h2>
            <p style={{ 
              margin: '4px 0 0 0', 
              color: '#64748b', 
              fontSize: '14px',
              fontWeight: 400
            }}>
              {invoiceGenerated ? 'The invoice has been saved.' : (editingInvoice ? 'Update invoice details' : 'Fill in the details to generate a new invoice')}
            </p>
          </div>
          <IconButton onClick={handleCloseModal} size="small">
            <Close />
          </IconButton>
        </DialogTitle>
        
        <DialogContent style={{ padding: '24px' }}>
        {invoiceGenerated ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <p style={{ margin: '4px 0 24px 0', color: '#64748b', fontSize: '14px', fontWeight: 400 }}>
                You can now download the invoice or send it via email.
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
                <Button
                  onClick={() => generateInvoicePdf(invoiceGenerated)}
                  variant="contained"
                  style={{
                    backgroundColor: '#2b7a8e',
                    color: 'white',
                    textTransform: 'none',
                    padding: '8px 24px'
                  }}
                >
                  Download Invoice
                </Button>
                <Button
                  variant="outlined"
                  style={{
                    color: '#64748b',
                    borderColor: '#cbd5e1',
                    textTransform: 'none',
                    padding: '8px 24px'
                  }}
                >
                  Send Email
                </Button>
              </div>
            </div>
          ) : (
          <LocalizationProvider dateAdapter={AdapterDayjs}>
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
                <DatePicker
                  label="Date"
                  value={formData.date ? dayjs(formData.date) : null}
                  onChange={(newValue) => handleDateChange('date', newValue)}
                  format="DD/MM/YYYY"
                  slotProps={{ textField: { fullWidth: true, variant: 'outlined', size: 'small', required: true } }}
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
                <DatePicker
                  label="From Date"
                  value={formData.fromDate ? dayjs(formData.fromDate) : null}
                  onChange={(newValue) => handleDateChange('fromDate', newValue)}
                  format="DD/MM/YYYY"
                  slotProps={{ textField: { fullWidth: true, variant: 'outlined', size: 'small', required: true } }}
                />
                <DatePicker
                  label="To Date"
                  value={formData.toDate ? dayjs(formData.toDate) : null}
                  onChange={(newValue) => handleDateChange('toDate', newValue)}
                  format="DD/MM/YYYY"
                  slotProps={{ textField: { fullWidth: true, variant: 'outlined', size: 'small', required: true } }}
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
                  InputProps={{
                    readOnly: true,
                  }}
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
                  label="Price After Discount"
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
                <TextField
                  label="CGST (%)"
                  name="cgstPercentage"
                  type="number"
                  value={formData.cgstPercentage}
                  onChange={handleInputChange}
                  fullWidth
                  variant="outlined"
                  size="small"
                  inputProps={{ step: "0.01", min: "0" }}
                />
                <TextField
                  label="SGST (%)"
                  name="sgstPercentage"
                  type="number"
                  value={formData.sgstPercentage}
                  onChange={handleInputChange}
                  fullWidth
                  variant="outlined"
                  size="small"
                  inputProps={{ step: "0.01", min: "0" }}
                />
                <TextField
                  label="Total Tax"
                  name="taxAmount"
                  type="number"
                  value={formData.taxAmount}
                  fullWidth
                  variant="outlined"
                  size="small"
                  InputProps={{
                    readOnly: true,
                  }}
                />
                <TextField
                  label="Total Amount Payable"
                  name="totalAmountPayable"
                  type="number"
                  value={formData.totalAmountPayable}
                  fullWidth
                  variant="outlined"
                  size="small"
                  InputProps={{
                    readOnly: true,
                  }}
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
              {((editingInvoice && hasPermission('edit_invoices')) || (!editingInvoice && hasPermission('add_invoices'))) && (
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
              )}
            </div>
          </form>
          </LocalizationProvider>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
