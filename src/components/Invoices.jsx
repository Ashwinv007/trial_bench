import { useState, useEffect, useContext, useMemo, useCallback } from 'react';
import { Dialog, DialogTitle, DialogContent, TextField, Button, IconButton, Autocomplete, Select, MenuItem, InputAdornment, CircularProgress } from '@mui/material';
import { Close, AddCircleOutline, Search as SearchIcon, FilterList as FilterListIcon, RemoveCircleOutline } from '@mui/icons-material';
import styles from './Invoices.module.css';
import { FirebaseContext, AuthContext } from '../store/Context';
import { logActivity } from '../utils/logActivity';
import { collection, getDocs, addDoc, doc, updateDoc, query, where, serverTimestamp, Timestamp } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { saveAs } from 'file-saver';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { usePermissions } from '../auth/usePermissions';
import dayjs from 'dayjs';
import { toast } from 'sonner';

const formatDate = (dateInput) => {
  if (!dateInput) return '-';
  // Handle Firestore Timestamps which have a toDate method, otherwise treat as string/Date object
  const date = (dateInput.toDate && typeof dateInput.toDate === 'function')
    ? dateInput.toDate()
    : new Date(dateInput);
  
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const parseFirestoreDate = (firestoreDate) => {
    if (!firestoreDate) return null;
    if (firestoreDate.toDate) return firestoreDate.toDate(); // Is a timestamp
    return new Date(String(firestoreDate).replace(/-/g, '/')); // Is a string 'YYYY-MM-DD'
};

const updateCalculationsAndDescription = (currentFormData, allClients) => {
  const updated = { ...currentFormData };

  let subtotal = 0;
  updated.items.forEach(item => {
    const price = parseFloat(item.price) || 0;
    const quantity = parseInt(item.quantity, 10) || 0;
    subtotal += price * quantity;
  });

  const discount = parseFloat(updated.discountPercentage) || 0;
  const cgst = parseFloat(updated.cgstPercentage) || 0;
  const sgst = parseFloat(updated.sgstPercentage) || 0;

  const discountAmount = (subtotal * discount) / 100;
  const priceAfterDiscount = subtotal - discountAmount;
  
  const cgstAmount = (priceAfterDiscount * cgst) / 100;
  const sgstAmount = (priceAfterDiscount * sgst) / 100;
  const totalTax = cgstAmount + sgstAmount;
  
  const totalPayable = priceAfterDiscount + totalTax;

  updated.totalPrice = priceAfterDiscount.toFixed(2);
  updated.taxAmount = totalTax.toFixed(2);
  updated.totalAmountPayable = totalPayable.toFixed(2);

  if (updated.items.length > 0) {
    const selectedClient = allClients.find(c => c.id === updated.leadId);
    const packageName = selectedClient ? selectedClient.purposeOfVisit : '';
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
    const newItems = [...updated.items];
    newItems[0] = { ...newItems[0], description: generatedDescription };
    updated.items = newItems;
  }

  return updated;
};

const generateInvoiceNumber = (allInvoices) => {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear().toString().slice(-2);
  const currentMonth = String(currentDate.getMonth() + 1).padStart(2, '0');
  const prefix = `WCP${currentYear}${currentMonth}`;
  const relevantInvoices = allInvoices.filter(i => i.invoiceNumber?.startsWith(prefix));
  let maxSeq = 0;
  relevantInvoices.forEach(i => {
    const seqStr = i.invoiceNumber.slice(prefix.length);
    const seqNum = parseInt(seqStr, 10);
    if (!isNaN(seqNum) && seqNum > maxSeq) maxSeq = seqNum;
  });
  const newSeq = String(maxSeq + 1).padStart(3, '0');
  return `${prefix}${newSeq}`;
};

const getInvoicePdfBytes = async (invoiceData) => {
  const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib');
  const url = '/tb_invoice.pdf';
  const existingPdfBytes = await fetch(url).then(res => res.arrayBuffer());
  const pdfDoc = await PDFDocument.load(existingPdfBytes);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const firstPage = pdfDoc.getPages()[0];

  const { legalName, address, invoiceNumber, date, items, discountPercentage, cgstPercentage, sgstPercentage, totalPrice, taxAmount, totalAmountPayable } = invoiceData;

  let subtotal = 0;
  items.forEach(item => {
    subtotal += (parseFloat(item.price) || 0) * (parseInt(item.quantity, 10) || 0);
  });

  const discountAmount = (subtotal * (parseFloat(discountPercentage) || 0)) / 100;
  const priceAfterDiscount = parseFloat(totalPrice) || 0;
  const cgstAmount = (priceAfterDiscount * (parseFloat(cgstPercentage) || 0)) / 100;
  const sgstAmount = (priceAfterDiscount * (parseFloat(sgstPercentage) || 0)) / 100;

  const formatCurrency = (value) => typeof value === 'number' ? value.toFixed(2) : String(value);

  firstPage.drawText(legalName || '', { x: 66, y: 620, size: 11, font, color: rgb(0, 0, 0), maxWidth: 250 });
  firstPage.drawText(address || '', { x: 66, y: 607, size: 11, font, color: rgb(0, 0, 0), maxWidth: 200, lineHeight: 13 });
  firstPage.drawText(invoiceNumber || '', { x: 450, y: 634, size: 11, font, color: rgb(0, 0, 0) });
  firstPage.drawText(formatDate(date) || '', { x: 450, y: 618, size: 11, font, color: rgb(0, 0, 0) });

  let yPos = 380;
  items.forEach(item => {
    const lineItemSubtotal = (parseFloat(item.price) || 0) * (parseInt(item.quantity, 10) || 0);
    firstPage.drawText(item.description || '', { x: 66, y: yPos, size: 10, font, color: rgb(0, 0, 0), maxWidth: 150, lineHeight: 12 });
    firstPage.drawText(item.sacCode || '', { x: 306, y: yPos - 5, size: 10, font, color: rgb(0, 0, 0) });
    firstPage.drawText(formatCurrency(parseFloat(item.price) || 0), { x: 385, y: yPos - 6, size: 10, font, color: rgb(0, 0, 0) });
    firstPage.drawText(String(parseInt(item.quantity, 10) || 0), { x: 441, y: yPos - 6, size: 10, font, color: rgb(0, 0, 0) });
    firstPage.drawText(formatCurrency(lineItemSubtotal), { x: 500, y: yPos - 6, size: 10, font, color: rgb(0, 0, 0) });
    yPos -= 40;
  });

  firstPage.drawText(formatCurrency(priceAfterDiscount), { x: 490, y: 200, size: 10, font, color: rgb(0, 0, 0) });
  firstPage.drawText(formatCurrency(discountAmount), { x: 490, y: 184, size: 10, font, color: rgb(0, 0, 0) });
  firstPage.drawText(taxAmount, { x: 490, y: 169, size: 10, font, color: rgb(0, 0, 0) });
  firstPage.drawText(formatCurrency(cgstAmount), { x: 490, y: 154, size: 10, font, color: rgb(0, 0, 0) });
  firstPage.drawText(formatCurrency(sgstAmount), { x: 490, y: 137.5, size: 10, font, color: rgb(0, 0, 0) });
  firstPage.drawText(totalAmountPayable, { x: 490, y: 117, size: 13, font, color: rgb(0, 0, 0) });

  return await pdfDoc.save();
};

export default function Invoices() {
  const { db } = useContext(FirebaseContext);
  const { user } = useContext(AuthContext);
  const { hasPermission } = usePermissions();
  const [invoices, setInvoices] = useState([]);
  const [clients, setClients] = useState([]);
  const [agreements, setAgreements] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPaymentDateModalOpen, setIsPaymentDateModalOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState(null);
  const [paymentDate, setPaymentDate] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [packageFilter, setPackageFilter] = useState('All Packages');
  const [monthFilter, setMonthFilter] = useState('All Months');
  const [yearFilter, setYearFilter] = useState('All Years');
  const [invoiceGenerated, setInvoiceGenerated] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMarkingPaid, setIsMarkingPaid] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [formData, setFormData] = useState({
    leadId: null,
    agreementId: null,
    legalName: '',
    address: '',
    invoiceNumber: '',
    date: null,
    month: '',
    year: '',
    fromDate: null,
    toDate: null,
    items: [{ description: '', sacCode: '997212', price: '', quantity: 1 }],
    totalPrice: '',
    discountPercentage: 0,
    cgstPercentage: 9,
    sgstPercentage: 9,
    taxAmount: '',
    totalAmountPayable: ''
  });

  const functions = getFunctions();
  const sendInvoiceEmailCallable = httpsCallable(functions, 'sendInvoiceEmail');

  useEffect(() => {
    if (!db || !hasPermission('invoices:view')) return;

    const fetchInvoices = async () => {
      const invoicesCollection = collection(db, 'invoices');
      const invoicesSnapshot = await getDocs(invoicesCollection);
      const invoicesData = invoicesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setInvoices(invoicesData);
    };

    const fetchAgreementsAndClients = async () => {
      const clientsQuery = query(collection(db, 'leads'), where('status', '==', 'Converted'));
      const clientsSnapshot = await getDocs(clientsQuery);
      const clientsData = clientsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setClients(clientsData);
      const clientsMap = new Map(clientsData.map(client => [client.id, client]));

      const agreementsQuery = query(collection(db, 'agreements'), where('status', '==', 'active'));
      const agreementsSnapshot = await getDocs(agreementsQuery);
      const agreementsData = agreementsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      const combinedAgreementsData = agreementsData
        .map(agreement => {
          if (!agreement.leadId) return null;
          const client = clientsMap.get(agreement.leadId);
          if (!client) return null;
          
          return {
            ...agreement,
            name: client.name,
            company: client.companyName || 'N/A',
          };
        })
        .filter(Boolean);

      setAgreements(combinedAgreementsData);
    };

    fetchInvoices();
    fetchAgreementsAndClients();
  }, [db, hasPermission]);

  const invoicesWithClientData = useMemo(() => {
    if (!invoices.length || !clients.length) return [];
    return invoices.map(invoice => {
      const client = clients.find(c => c.id === invoice.leadId);
      return {
        ...invoice,
        name: client ? client.name : 'Unknown Client',
        phone: client ? client.convertedWhatsapp : 'N/A',
        email: client ? client.convertedEmail : 'N/A',
        ccEmail: client ? client.ccEmail : 'N/A',
      };
    });
  }, [invoices, clients]);

  const handleOpenModal = () => {
    setEditingInvoice(null);
    setInvoiceGenerated(null);
    const newInvoiceNumber = generateInvoiceNumber(invoices);
    const initialData = {
      leadId: null,
      agreementId: null,
      legalName: '',
      address: '',
      invoiceNumber: newInvoiceNumber,
      date: new Date(),
      month: '',
      year: new Date().getFullYear().toString(),
      fromDate: null,
      toDate: null,
      items: [{ description: '', sacCode: '997212', price: '', quantity: 1 }],
      totalPrice: '',
      discountPercentage: 0,
      cgstPercentage: 9,
      sgstPercentage: 9,
      taxAmount: '',
      totalAmountPayable: ''
    };
    setFormData(updateCalculationsAndDescription(initialData, clients));
    setIsModalOpen(true);
  };

  const handleEditInvoice = (invoice, e) => {
    if (!hasPermission('invoices:edit')) return;
    if (e.target.closest(`.${styles.statusBadge}`)) return;

    setEditingInvoice(invoice);
    setFormData({
      leadId: invoice.leadId,
      agreementId: invoice.agreementId,
      legalName: invoice.legalName,
      address: invoice.address,
      invoiceNumber: invoice.invoiceNumber,
      date: parseFirestoreDate(invoice.date),
      month: invoice.month || '',
      year: invoice.year || '',
      fromDate: parseFirestoreDate(invoice.fromDate),
      toDate: parseFirestoreDate(invoice.toDate),
      items: invoice.items || [{ description: '', sacCode: '997212', price: '', quantity: 1 }],
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

  const handleAgreementSelect = (event, agreement) => {
    setFormData(prev => {
      let updated = { ...prev };
      if (agreement) {
        const client = clients.find(c => c.id === agreement.leadId);
        updated.agreementId = agreement.id;
        updated.leadId = agreement.leadId;
        updated.legalName = agreement.memberLegalName || client?.name || '';
        updated.address = client?.lastInvoiceDetails?.address || agreement.memberAddress || client?.memberAddress || '';

        if (client && client.lastInvoiceDetails) {
          const newItems = [...prev.items];
          newItems[0].price = client.lastInvoiceDetails.price || '';
          newItems[0].sacCode = client.lastInvoiceDetails.sacCode || '997212';
          updated.items = newItems;
          updated.discountPercentage = client.lastInvoiceDetails.discountPercentage || 0;
          updated.cgstPercentage = client.lastInvoiceDetails.cgstPercentage !== undefined ? client.lastInvoiceDetails.cgstPercentage : 9;
          updated.sgstPercentage = client.lastInvoiceDetails.sgstPercentage !== undefined ? client.lastInvoiceDetails.sgstPercentage : 9;
          
          const lastToDate = client.lastInvoiceDetails.toDate;
          if (lastToDate) {
            const lastToDateObj = parseFirestoreDate(lastToDate);
            // Use local date methods to avoid timezone shifts
            const newFromDateObj = new Date(
              lastToDateObj.getFullYear(),
              lastToDateObj.getMonth(),
              lastToDateObj.getDate() + 1
            );
            
            const newMonthIndex = newFromDateObj.getMonth();
            const newYear = newFromDateObj.getFullYear();
            
            // Set toDate to the last day of the new month
            const newToDateObj = new Date(newYear, newMonthIndex + 1, 0);
            
            const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
            updated.month = monthNames[newMonthIndex];
            updated.year = newYear.toString();
            updated.fromDate = newFromDateObj;
            updated.toDate = newToDateObj;
          } else {
            updated.month = '';
            updated.year = new Date().getFullYear().toString();
            updated.fromDate = null;
            updated.toDate = null;
          }
        } else {
          const newItems = [...prev.items];
          newItems[0].price = '';
          newItems[0].sacCode = '997212';
          updated.items = newItems;
          updated.discountPercentage = 0;
          updated.cgstPercentage = 9;
          updated.sgstPercentage = 9;
          updated.month = '';
          updated.year = new Date().getFullYear().toString();
          updated.fromDate = null;
          updated.toDate = null;
        }
      } else {
        updated.agreementId = null;
        updated.leadId = null;
        updated.legalName = '';
        updated.address = '';
        updated.items = [{ description: '', sacCode: '997212', price: '', quantity: 1 }];
        updated.totalPrice = '';
        updated.discountPercentage = 0;
        updated.cgstPercentage = 9;
        updated.sgstPercentage = 9;
        updated.taxAmount = '';
        updated.totalAmountPayable = '';
        updated.month = '';
        updated.year = new Date().getFullYear().toString();
        updated.fromDate = null;
        updated.toDate = null;
      }
      return updateCalculationsAndDescription(updated, clients);
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => updateCalculationsAndDescription({ ...prev, [name]: value }, clients));
  };

  const handleItemInputChange = (index, e) => {
    const { name, value } = e.target;
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [name]: value };
    setFormData(prev => updateCalculationsAndDescription({ ...prev, items: newItems }, clients));
  };

  const handleAddItem = () => {
    if (formData.items.length < 4) {
        const newItems = [...formData.items, { description: '', sacCode: '997212', price: '', quantity: 1 }];
        setFormData(prev => ({ ...prev, items: newItems }));
    }
  };

  const handleRemoveItem = (index) => {
      if (formData.items.length > 1) {
          const newItems = formData.items.filter((_, i) => i !== index);
          setFormData(prev => updateCalculationsAndDescription({ ...prev, items: newItems }, clients));
      }
  };

  const handleDateChange = (name, newValue) => {
    const dateObj = newValue ? newValue.toDate() : null;
    setFormData((prev) => {
      const updated = { ...prev, [name]: dateObj };
      if (name === 'fromDate' && dateObj) {
        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        updated.month = monthNames[dateObj.getMonth()];
        updated.year = dateObj.getFullYear().toString();
      }
      return updateCalculationsAndDescription(updated, clients);
    });
  };

 const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.leadId) {
      alert("Please select a client agreement.");
      return;
    }

    setIsSubmitting(true);
    const { name, phone, email, date, fromDate, toDate, ...restOfFormData } = formData;
    
    const invoicePayload = { ...restOfFormData };
    if (date) invoicePayload.date = Timestamp.fromDate(date);
    if (fromDate) invoicePayload.fromDate = Timestamp.fromDate(fromDate);
    if (toDate) invoicePayload.toDate = Timestamp.fromDate(toDate);


    const client = clients.find(c => c.id === formData.leadId);
    const clientName = client ? client.name : 'Unknown Client';
    const clientEmail = client ? client.convertedEmail : '';
    const clientCcEmail = client ? client.ccEmail : '';

    try {
      if (editingInvoice) {
        const invoiceRef = doc(db, "invoices", editingInvoice.id);
        await updateDoc(invoiceRef, { ...invoicePayload, lastEditedAt: serverTimestamp() });
        const updatedInvoice = { ...editingInvoice, ...invoicePayload, name: clientName, email: clientEmail, ccEmail: clientCcEmail };
        setInvoices(prev => prev.map(inv => inv.id === editingInvoice.id ? updatedInvoice : inv));
        setInvoiceGenerated(updatedInvoice);
        logActivity(
          db,
          user,
          'invoice_updated',
          `Invoice "${updatedInvoice.invoiceNumber}" for "${updatedInvoice.name}" was updated.`,
          { invoiceId: updatedInvoice.id, invoiceNumber: updatedInvoice.invoiceNumber, clientName: updatedInvoice.name }
        );
      } else {
        const docRef = await addDoc(collection(db, "invoices"), { ...invoicePayload, createdAt: serverTimestamp(), lastEditedAt: serverTimestamp() });
        const newInvoice = { id: docRef.id, ...invoicePayload, name: clientName, email: clientEmail, ccEmail: clientCcEmail };
        setInvoices(prev => [...prev, newInvoice]);
        setInvoiceGenerated(newInvoice);
        logActivity(
          db,
          user,
          'invoice_generated',
          `Invoice "${newInvoice.invoiceNumber}" for "${newInvoice.name}" was generated.`,
          { invoiceId: newInvoice.id, invoiceNumber: newInvoice.invoiceNumber, clientName: newInvoice.name }
        );

        const leadRef = doc(db, "leads", formData.leadId);
        const lastInvoiceDetails = {
            sacCode: formData.items[0].sacCode,
            price: formData.items[0].price,
            discountPercentage: formData.discountPercentage,
            cgstPercentage: formData.cgstPercentage,
            sgstPercentage: formData.sgstPercentage,
            month: formData.month,
            fromDate: fromDate,
            toDate: toDate,
            address: formData.address, // Added address to lastInvoiceDetails
        };
        await updateDoc(leadRef, { lastInvoiceDetails: lastInvoiceDetails });

        setClients(prevClients => 
            prevClients.map(c => 
                c.id === formData.leadId 
                    ? { ...c, lastInvoiceDetails: lastInvoiceDetails } 
                    : c
            )
        );
      }
    } catch (error) {
      console.error("Error processing invoice: ", error);
      toast.error("Failed to process invoice.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const togglePaymentStatus = async (invoice, e) => {
    e.stopPropagation();
    if (!hasPermission('invoices:edit')) return;
    if (invoice.paymentStatus === 'Paid') return;
    setSelectedInvoiceForPayment(invoice);
    setPaymentDate('');
    setIsPaymentDateModalOpen(true);
  };

  const handlePaymentDateSubmit = async () => {
    if (paymentDate && selectedInvoiceForPayment) {
      setIsMarkingPaid(true);
      try {
        const invoiceRef = doc(db, "invoices", selectedInvoiceForPayment.id);
        await updateDoc(invoiceRef, { paymentStatus: 'Paid', dateOfPayment: Timestamp.fromDate(new Date(paymentDate.replace(/-/g, '/'))), lastEditedAt: serverTimestamp() });
        setInvoices(prev => prev.map(inv => inv.id === selectedInvoiceForPayment.id ? { ...inv, paymentStatus: 'Paid', dateOfPayment: paymentDate } : inv));
        setIsPaymentDateModalOpen(false);
        setSelectedInvoiceForPayment(null);
        setPaymentDate('');
        logActivity(
          db,
          user,
          'invoice_paid',
          `Invoice "${selectedInvoiceForPayment.invoiceNumber}" for "${selectedInvoiceForPayment.name}" was marked as paid.`,
          { invoiceId: selectedInvoiceForPayment.id, invoiceNumber: selectedInvoiceForPayment.invoiceNumber, clientName: selectedInvoiceForPayment.name, dateOfPayment: paymentDate }
        );
        toast.success("Invoice marked as paid.");
      } catch (error) {
        console.error("Error marking invoice as paid:", error);
        toast.error("Failed to mark invoice as paid.");
      } finally {
        setIsMarkingPaid(false);
      }
    }
  };

  const filteredInvoices = useMemo(() => {
    let currentInvoices = invoicesWithClientData;

    if (filterStatus !== 'All') {
      currentInvoices = currentInvoices.filter((invoice) => (invoice.paymentStatus || 'Unpaid') === filterStatus);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      currentInvoices = currentInvoices.filter(
        (invoice) =>
          (invoice.name && invoice.name.toLowerCase().includes(query)) ||
          (invoice.email && invoice.email.toLowerCase().includes(query)) ||
          (invoice.phone && invoice.phone.toLowerCase().includes(query))
      );
    }

    if (packageFilter !== 'All Packages') {
      currentInvoices = currentInvoices.filter((invoice) => {
        const client = clients.find(c => c.id === invoice.leadId);
        return client && client.purposeOfVisit === packageFilter;
      });
    }

    if (monthFilter !== 'All Months') {
      currentInvoices = currentInvoices.filter((invoice) => invoice.month === monthFilter);
    }

    if (yearFilter !== 'All Years') {
      currentInvoices = currentInvoices.filter((invoice) => invoice.year === yearFilter);
    }

    // Sorting logic
    currentInvoices.sort((a, b) => {
      const getDate = (field) => {
        if (field) {
          if (typeof field.toDate === 'function') { // Check if it's a Firestore Timestamp
            return field.toDate();
          }
          if (typeof field === 'string') { // Check if it's an ISO date string
            return new Date(field);
          }
        }
        return null;
      };

      const dateA = getDate(a.createdAt);
      const dateB = getDate(b.createdAt);

      if (dateA && dateB) {
        return dateB.getTime() - dateA.getTime(); // Descending sort
      }
      if (dateA) return -1; // a comes first if b has no date
      if (dateB) return 1;  // b comes first if a has no date
      
      return 0; // No date information to sort by
    });

    return currentInvoices;
  }, [invoicesWithClientData, filterStatus, searchQuery, packageFilter, monthFilter, yearFilter, clients]);

  const handleGenerateInvoiceForMember = useCallback((leadId, e) => {
    e.stopPropagation();
    if (!hasPermission('invoices:add')) return;

    const client = clients.find(c => c.id === leadId);
    if (client) {
      const agreement = agreements.find(a => a.leadId === leadId);
      setEditingInvoice(null);
      setInvoiceGenerated(null);
      
      const initialData = {
        leadId: client.id,
        agreementId: agreement ? agreement.id : null,
        legalName: agreement?.memberLegalName || client.name || '',
        address: client.lastInvoiceDetails?.address || agreement?.memberAddress || client.memberAddress || '',
        invoiceNumber: generateInvoiceNumber(invoices),
        date: new Date(),
        month: '',
        year: new Date().getFullYear().toString(),
        fromDate: null,
        toDate: null,
        items: [{ description: '', sacCode: '997212', price: '', quantity: 1 }],
        totalPrice: '',
        discountPercentage: 0,
        cgstPercentage: 9,
        sgstPercentage: 9,
        taxAmount: '',
        totalAmountPayable: ''
      };

      if (client.lastInvoiceDetails) {
        initialData.items[0].price = client.lastInvoiceDetails.price || '';
        initialData.items[0].sacCode = client.lastInvoiceDetails.sacCode || '997212';
        initialData.discountPercentage = client.lastInvoiceDetails.discountPercentage || 0;
        initialData.cgstPercentage = client.lastInvoiceDetails.cgstPercentage !== undefined ? client.lastInvoiceDetails.cgstPercentage : 9;
        initialData.sgstPercentage = client.lastInvoiceDetails.sgstPercentage !== undefined ? client.lastInvoiceDetails.sgstPercentage : 9;
        
        const lastToDate = client.lastInvoiceDetails.toDate;
        if (lastToDate) {
          const lastToDateObj = parseFirestoreDate(lastToDate);
          // Use local date methods to avoid timezone shifts
          const newFromDateObj = new Date(
            lastToDateObj.getFullYear(),
            lastToDateObj.getMonth(),
            lastToDateObj.getDate() + 1
          );

          const newMonthIndex = newFromDateObj.getMonth();
          const newYear = newFromDateObj.getFullYear();
          
          // Set toDate to the last day of the new month
          const newToDateObj = new Date(newYear, newMonthIndex + 1, 0);

          const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
          initialData.month = monthNames[newMonthIndex];
          initialData.year = newYear.toString();
          initialData.fromDate = newFromDateObj;
          initialData.toDate = newToDateObj;
        }
      }
      
      setFormData(updateCalculationsAndDescription(initialData, clients));
      setIsModalOpen(true);
    }
  }, [clients, hasPermission, invoices, agreements]);

  const handleSendInvoiceEmail = async () => {
    if (!invoiceGenerated) {
      toast.error("No invoice has been generated yet.");
      return;
    }
    if (!invoiceGenerated.email) {
      toast.error("Invoice recipient email is missing.");
      return;
    }
    
    setIsSendingEmail(true);
    try {
      const pdfBytes = await getInvoicePdfBytes(invoiceGenerated);
      let binary = '';
      for (let i = 0; i < pdfBytes.length; i++) {
        binary += String.fromCharCode(pdfBytes[i]);
      }
      const pdfBase64 = btoa(binary);

      await sendInvoiceEmailCallable({
        toEmail: invoiceGenerated.email,
        ccEmail: invoiceGenerated.ccEmail,
        customerName: invoiceGenerated.name,
        invoiceNumber: invoiceGenerated.invoiceNumber,
        pdfBase64: pdfBase64,
      });
      toast.success("Invoice email sent successfully!");
    } catch (error) {
      console.error("Error sending invoice email:", error);
      toast.error(error.message || "Failed to send invoice email.");
    } finally {
      setIsSendingEmail(false);
    }
  };

  if (!hasPermission('invoices:view')) {
    return (
        <div className={styles.container}>
            <div className={styles.content}>
                <div className={styles.header}>
                    <div className={styles.headerText}>
                        <h1 className={styles.title}>Permission Denied</h1>
                        <p className={styles.subtitle}>You do not have permission to view this page.</p>
                    </div>
                </div>
            </div>
        </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.header}>
          <div className={styles.headerText}>
            <h1 className={styles.title}>Invoices</h1>
            <p className={styles.subtitle}>Manage and generate client invoices.</p>
          </div>
          {hasPermission('invoices:add') && (
            <button className={styles.addButton} onClick={handleOpenModal}>
              <AddCircleOutline className={styles.addIcon} />
              Generate Invoice
            </button>
          )}
        </div>

        <div className={styles.filterControls}>
          <TextField
            placeholder="Search invoices by client name, email, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            size="small"
            sx={{ flex: 1, bgcolor: '#ffffff' }}
            InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon sx={{ color: '#9e9e9e', fontSize: '20px' }} /></InputAdornment>) }}
          />
          <Select value={packageFilter} onChange={(e) => setPackageFilter(e.target.value)} size="small" sx={{ minWidth: '150px', bgcolor: '#ffffff' }}>
            <MenuItem value="All Packages">All Packages</MenuItem>
            <MenuItem value="Dedicated Desk">Dedicated Desk</MenuItem>
            <MenuItem value="Flexible Desk">Flexible Desk</MenuItem>
            <MenuItem value="Private Cabin">Private Cabin</MenuItem>
            <MenuItem value="Virtual Office">Virtual Office</MenuItem>
            <MenuItem value="Meeting Room">Meeting Room</MenuItem>
            <MenuItem value="Others">Others</MenuItem>
          </Select>
          <Select value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} size="small" sx={{ minWidth: '150px', bgcolor: '#ffffff' }}>
            <MenuItem value="All Months">All Months</MenuItem>
            {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map(m => <MenuItem key={m} value={m}>{m}</MenuItem>)}
          </Select>
          <Select value={yearFilter} onChange={(e) => setYearFilter(e.target.value)} size="small" sx={{ minWidth: '150px', bgcolor: '#ffffff' }}>
            <MenuItem value="All Years">All Years</MenuItem>
            {Array.from({ length: 8 }, (_, i) => new Date().getFullYear() - 5 + i).map(year => <MenuItem key={year} value={String(year)}>{year}</MenuItem>)}
          </Select>
          <Button variant="outlined" startIcon={<FilterListIcon />} onClick={() => { setSearchQuery(''); setPackageFilter('All Packages'); setMonthFilter('All Months'); setYearFilter('All Years'); setFilterStatus('All'); }} sx={{ textTransform: 'none', color: '#424242', borderColor: '#e0e0e0', bgcolor: '#ffffff' }}>
            Clear Filters
          </Button>
        </div>

        <div className={styles.filterContainer}>
          <button className={`${styles.filterTab} ${filterStatus === 'All' ? styles.activeFilter : ''}`} onClick={() => setFilterStatus('All')}>
            All Invoices <span className={styles.filterCount}>{invoices.length}</span>
          </button>
          <button className={`${styles.filterTab} ${filterStatus === 'Paid' ? styles.activeFilter : ''}`} onClick={() => setFilterStatus('Paid')}>
            Paid <span className={styles.filterCount}>{invoices.filter(inv => inv.paymentStatus === 'Paid').length}</span>
          </button>
          <button className={`${styles.filterTab} ${filterStatus === 'Unpaid' ? styles.activeFilter : ''}`} onClick={() => setFilterStatus('Unpaid')}>
            Unpaid <span className={styles.filterCount}>{invoices.filter(inv => !inv.paymentStatus || inv.paymentStatus === 'Unpaid').length}</span>
          </button>
        </div>

        <div className={styles.tableCard}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Payment Status</th>
                <th>Invoice No.</th>
                <th>Name</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Date of Payment</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.map((invoice) => (
                <tr key={invoice.id} onClick={(e) => handleEditInvoice(invoice, e)} className={hasPermission('invoices:edit') ? styles.clickableRow : ''}>
                  <td>
                    <span className={`${styles.statusBadge} ${styles[invoice.paymentStatus ? invoice.paymentStatus.toLowerCase().replace(' ', '') : 'unpaid']}`} onClick={(e) => togglePaymentStatus(invoice, e)}>
                      {invoice.paymentStatus || 'Unpaid'}
                    </span>
                  </td>
                  <td>{invoice.invoiceNumber}</td>
                  <td><span className={styles.nameText}>{invoice.name}</span></td>
                  <td>{invoice.phone}</td>
                  <td>{invoice.email}</td>
                  <td>{invoice.paymentStatus === 'Paid' ? formatDate(invoice.dateOfPayment) : '-'}</td>
                  <td>
                    {hasPermission('invoices:add') && (
                      <IconButton onClick={(e) => handleGenerateInvoiceForMember(invoice.leadId, e)} size="small" color="primary" aria-label="generate invoice">
                        <AddCircleOutline />
                      </IconButton>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredInvoices.length === 0 && <div className={styles.emptyState}><p>No invoices found for the selected filter.</p></div>}
        </div>
      </div>

      <Dialog open={isPaymentDateModalOpen} onClose={() => setIsPaymentDateModalOpen(false)} maxWidth="xs" fullWidth PaperProps={{ style: { borderRadius: '12px' } }}>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0', p: '20px 24px' }}>
          <div>
            <h2 style={{ m: 0, color: '#1a4d5c', fontSize: '18px', fontWeight: 600 }}>Payment Date</h2>
            <p style={{ m: '4px 0 0 0', color: '#64748b', fontSize: '14px', fontWeight: 400 }}>Select the date when payment was received</p>
          </div>
          <IconButton onClick={() => setIsPaymentDateModalOpen(false)} size="small" disabled={isMarkingPaid}><Close /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: '24px' }}>
          <TextField label="Payment Date" type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} fullWidth variant="outlined" size="small" InputLabelProps={{ shrink: true }} sx={{ mb: '24px' }} />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <Button onClick={() => setIsPaymentDateModalOpen(false)} variant="outlined" sx={{ color: '#64748b', borderColor: '#cbd5e1', textTransform: 'none', p: '8px 24px' }} disabled={isMarkingPaid}>Cancel</Button>
            <Button onClick={handlePaymentDateSubmit} variant="contained" disabled={!paymentDate || isMarkingPaid} sx={{ bgcolor: paymentDate ? '#2b7a8e' : '#cbd5e1', color: 'white', textTransform: 'none', p: '8px 24px' }}>
              {isMarkingPaid ? <CircularProgress size={24} color="inherit" /> : 'Mark as Paid'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isModalOpen} onClose={handleCloseModal} maxWidth="md" fullWidth PaperProps={{ style: { borderRadius: '12px' } }}>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0', p: '20px 24px' }}>
          <div>
            <h2 style={{ m: 0, color: '#1a4d5c', fontSize: '20px', fontWeight: 600 }}>{invoiceGenerated ? (editingInvoice ? 'Invoice Updated' : 'Invoice Generated') : (editingInvoice ? 'Edit Invoice' : 'Generate Invoice')}</h2>
            <p style={{ m: '4px 0 0 0', color: '#64748b', fontSize: '14px', fontWeight: 400 }}>{invoiceGenerated ? 'The invoice has been saved.' : (editingInvoice ? 'Update invoice details' : 'Fill in the details to generate a new invoice')}</p>
          </div>
          <IconButton onClick={handleCloseModal} size="small" disabled={isSubmitting || isSendingEmail}><Close /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: '24px' }}>
        {invoiceGenerated ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <p style={{ margin: '4px 0 24px 0', color: '#64748b', fontSize: '14px', fontWeight: 400 }}>You can now download the invoice or send it via email.</p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
                <Button onClick={async () => { try { const pdfBytes = await getInvoicePdfBytes(invoiceGenerated); const blob = new Blob([pdfBytes], { type: 'application/pdf' }); saveAs(blob, `${invoiceGenerated.invoiceNumber || 'invoice'}.pdf`); toast.success("Invoice downloaded successfully!"); } catch (error) { console.error("Error downloading invoice:", error); toast.error("Failed to download invoice."); } }} variant="contained" sx={{ bgcolor: '#2b7a8e', color: 'white', textTransform: 'none', p: '8px 24px' }}>Download Invoice</Button>
                <Button onClick={handleSendInvoiceEmail} variant="outlined" sx={{ color: '#64748b', borderColor: '#cbd5e1', textTransform: 'none', p: '8px 24px' }} disabled={isSendingEmail}>
                  {isSendingEmail ? <CircularProgress size={24} /> : 'Send Email'}
                </Button>
              </div>
            </div>
          ) : (
          <LocalizationProvider dateAdapter={AdapterDayjs}>
          <form onSubmit={handleSubmit}>
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Client Details</h3>
              <div className={styles.formGrid} style={{ gridTemplateColumns: '1fr' }}>
                <Autocomplete options={agreements} getOptionLabel={(option) => `${option.memberLegalName || option.name} (${option.company})`} onChange={handleAgreementSelect} value={agreements.find(a => a.id === formData.agreementId) || null} disabled={!!editingInvoice} renderInput={(params) => <TextField {...params} label="Select Agreement" variant="outlined" size="small" required />} />
                 <TextField label="Legal Name (for invoice)" name="legalName" value={formData.legalName} onChange={handleInputChange} fullWidth variant="outlined" size="small" required style={{ marginTop: '16px' }} />
                <TextField label="Address" name="address" value={formData.address} onChange={handleInputChange} fullWidth variant="outlined" size="small" required multiline rows={2} style={{ marginTop: '16px' }} />
              </div>
            </div>
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Invoice Information</h3>
              <div className={styles.formGrid}>
                <TextField label="Invoice Number" name="invoiceNumber" value={formData.invoiceNumber} onChange={handleInputChange} fullWidth variant="outlined" size="small" required disabled />
                <DatePicker label="Date" value={formData.date ? dayjs(formData.date) : null} onChange={(newValue) => handleDateChange('date', newValue)} format="DD/MM/YYYY" slotProps={{ textField: { fullWidth: true, variant: 'outlined', size: 'small', required: true } }} />
                <DatePicker label="From Date" value={formData.fromDate ? dayjs(formData.fromDate) : null} onChange={(newValue) => handleDateChange('fromDate', newValue)} format="DD/MM/YYYY" slotProps={{ textField: { fullWidth: true, variant: 'outlined', size: 'small', required: true } }} />
                <DatePicker label="To Date" value={formData.toDate ? dayjs(formData.toDate) : null} onChange={(newValue) => handleDateChange('toDate', newValue)} format="DD/MM/YYYY" slotProps={{ textField: { fullWidth: true, variant: 'outlined', size: 'small', required: true } }} />
              </div>
            </div>
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Pricing Details</h3>
              {formData.items.map((item, index) => (
                <div key={index} className={styles.itemRow}>
                    <TextField label="Description" name="description" value={item.description} onChange={(e) => handleItemInputChange(index, e)} variant="outlined" size="small" required InputProps={{ readOnly: index === 0 && !!formData.agreementId }} style={{ flex: 3 }} />
                    <TextField label="SAC" name="sacCode" value={item.sacCode} onChange={(e) => handleItemInputChange(index, e)} variant="outlined" size="small" required style={{ flex: 1 }} />
                    <TextField label="Price" name="price" type="number" value={item.price} onChange={(e) => handleItemInputChange(index, e)} variant="outlined" size="small" required inputProps={{ step: "0.01", min: "0" }} style={{ flex: 1 }} />
                    <TextField label="Qty" name="quantity" type="number" value={item.quantity} onChange={(e) => handleItemInputChange(index, e)} variant="outlined" size="small" required inputProps={{ step: "1", min: "1" }} style={{ flex: 1 }} />
                    <TextField label="Total" name="total" type="number" value={((parseFloat(item.price) || 0) * (parseInt(item.quantity, 10) || 0)).toFixed(2)} variant="outlined" size="small" InputProps={{ readOnly: true }} style={{ flex: 1 }} />
                    {formData.items.length > 1 && <IconButton onClick={() => handleRemoveItem(index)} size="small"><RemoveCircleOutline /></IconButton>}
                </div>
              ))}
              {formData.items.length < 4 && <Button startIcon={<AddCircleOutline />} onClick={handleAddItem} size="small" style={{ marginTop: '10px' }}>Add Item</Button>}
              <div className={styles.formGrid} style={{marginTop: '16px'}}>
                <TextField label="Discount (%)" name="discountPercentage" type="number" value={formData.discountPercentage} onChange={handleInputChange} fullWidth variant="outlined" size="small" inputProps={{ step: "0.01", min: "0", max: "100" }} />
                <TextField label="Price After Discount" name="totalPrice" type="number" value={formData.totalPrice} fullWidth variant="outlined" size="small" InputProps={{ readOnly: true }} inputProps={{ step: "0.01" }} />
                <TextField label="CGST (%)" name="cgstPercentage" type="number" value={formData.cgstPercentage} onChange={handleInputChange} fullWidth variant="outlined" size="small" inputProps={{ step: "0.01", min: "0" }} />
                <TextField label="SGST (%)" name="sgstPercentage" type="number" value={formData.sgstPercentage} onChange={handleInputChange} fullWidth variant="outlined" size="small" inputProps={{ step: "0.01", min: "0" }} />
                <TextField label="Total Tax" name="taxAmount" type="number" value={formData.taxAmount} fullWidth variant="outlined" size="small" InputProps={{ readOnly: true }} />
                <TextField label="Total Amount Payable" name="totalAmountPayable" type="number" value={formData.totalAmountPayable} fullWidth variant="outlined" size="small" InputProps={{ readOnly: true }} />
              </div>
            </div>
            <div className={styles.modalActions}>
              <Button onClick={handleCloseModal} variant="outlined" sx={{ color: '#64748b', borderColor: '#cbd5e1', textTransform: 'none', p: '8px 24px' }} disabled={isSubmitting}>Cancel</Button>
              {editingInvoice && <Button onClick={async () => { try { const pdfBytes = await getInvoicePdfBytes(editingInvoice); const blob = new Blob([pdfBytes], { type: 'application/pdf' }); saveAs(blob, `${editingInvoice.invoiceNumber || 'invoice'}.pdf`); toast.success("Invoice downloaded successfully!"); } catch (error) { console.error("Error downloading invoice:", error); toast.error("Failed to download invoice."); } }} variant="outlined" sx={{ color: '#2b7a8e', borderColor: '#2b7a8e', textTransform: 'none', p: '8px 24px' }}>Download Current Invoice</Button>}
              {((editingInvoice && hasPermission('invoices:edit')) || (!editingInvoice && hasPermission('invoices:add'))) && <Button type="submit" variant="contained" sx={{ bgcolor: '#2b7a8e', color: 'white', textTransform: 'none', p: '8px 24px' }} disabled={isSubmitting}>{isSubmitting ? <CircularProgress size={24} color="inherit" /> : (editingInvoice ? 'Update Invoice' : 'Generate Invoice')}</Button>}
            </div>
          </form>
          </LocalizationProvider>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
