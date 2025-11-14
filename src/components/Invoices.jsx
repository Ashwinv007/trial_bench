import { useState, useEffect, useContext, useMemo, useCallback } from 'react';
import { Dialog, DialogTitle, DialogContent, TextField, Button, IconButton, Autocomplete, Select, MenuItem, InputAdornment } from '@mui/material';
import { Close, AddCircleOutline, Description, Search as SearchIcon, FilterList as FilterListIcon, RemoveCircleOutline } from '@mui/icons-material';
import styles from './Invoices.module.css';
import { FirebaseContext, AuthContext } from '../store/Context';
import { collection, getDocs, addDoc, doc, updateDoc, query, where, documentId } from 'firebase/firestore';
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

  // --- Description Generation Logic for the first item ---
  if (updated.items.length > 0) {
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
    if (!isNaN(seqNum) && seqNum > maxSeq) {
      maxSeq = seqNum;
    }
  });

  const newSeq = String(maxSeq + 1).padStart(3, '0');

  return `${prefix}${newSeq}`;
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
    items,
    discountPercentage,
    cgstPercentage,
    sgstPercentage,
    totalPrice, // This is priceAfterDiscount, which is the subtotal for the bottom part
    taxAmount,
    totalAmountPayable
  } = invoiceData;

  // Calculations
  let subtotal = 0;
  items.forEach(item => {
      const price = parseFloat(item.price) || 0;
      const quantity = parseInt(item.quantity, 10) || 0;
      subtotal += price * quantity;
  });

  const discountPerc = parseFloat(discountPercentage) || 0;
  const cgstPerc = parseFloat(cgstPercentage) || 0;
  const sgstPerc = parseFloat(sgstPercentage) || 0;

  const discountAmount = (subtotal * discountPerc) / 100;
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
  let yPos = 380;
  items.forEach(item => {
    const priceNum = parseFloat(item.price) || 0;
    const quantityNum = parseInt(item.quantity, 10) || 0;
    const lineItemSubtotal = priceNum * quantityNum;

    // Description
    firstPage.drawText(item.description || '', { x: 66, y: yPos, size: 10, font, color: rgb(0, 0, 0), maxWidth: 150, lineHeight: 12 });

    // SAC
    firstPage.drawText(item.sacCode || '', { x: 306, y: yPos - 5, size: 10, font, color: rgb(0, 0, 0), maxWidth: 150 });

    // Price
    firstPage.drawText(formatCurrency(priceNum), { x: 385, y: yPos - 6, size: 10, font, color: rgb(0, 0, 0), maxWidth: 150 });

    // Qty
    firstPage.drawText(String(quantityNum), { x: 441, y: yPos - 6, size: 10, font, color: rgb(0, 0, 0), maxWidth: 150 });

    // Total (line item)
    firstPage.drawText(formatCurrency(lineItemSubtotal), { x: 500, y: yPos - 6, size: 10, font, color: rgb(0, 0, 0), maxWidth: 150 });

    yPos -= 40; // reduce y axis by 40 for next item
  });


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
  saveAs(blob, `${invoiceNumber || 'invoice'}.pdf`);
};

export default function Invoices() {
  const { db } = useContext(FirebaseContext);
  const { hasPermission } = useContext(AuthContext);
  const [invoices, setInvoices] = useState([]);
  const [members, setMembers] = useState([]);
  const [agreements, setAgreements] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPaymentDateModalOpen, setIsPaymentDateModalOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState(null);
  const [paymentDate, setPaymentDate] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [searchQuery, setSearchQuery] = useState(''); // New state for search query
  const [packageFilter, setPackageFilter] = useState('All Packages'); // New state for package filter
  const [monthFilter, setMonthFilter] = useState('All Months'); // New state for month filter
  const [yearFilter, setYearFilter] = useState('All Years'); // New state for year filter
  const [invoiceGenerated, setInvoiceGenerated] = useState(null);
  const [formData, setFormData] = useState({
    memberId: null,
    agreementId: null,
    legalName: '',
    address: '',
    invoiceNumber: '',
    date: '',
    month: '',
    year: '',
    fromDate: '',
    toDate: '',
    items: [{ description: '', sacCode: '997212', price: '', quantity: 1 }],
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

    const fetchAgreementsAndMembers = async () => {
      const agreementsCollection = collection(db, 'agreements');
      const agreementsSnapshot = await getDocs(agreementsCollection);
      let agreementsData = agreementsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Filter agreements to only include those with a memberId
      const validAgreements = agreementsData.filter(agreement => agreement.memberId);

      const memberIdsInAgreements = new Set(validAgreements.map(agreement => agreement.memberId).filter(Boolean));

      let membersData = [];
      if (memberIdsInAgreements.size > 0) {
        const memberPromises = [];
        const memberIdsArray = Array.from(memberIdsInAgreements);
        for (let i = 0; i < memberIdsArray.length; i += 10) {
          const batch = memberIdsArray.slice(i, i + 10);
          memberPromises.push(getDocs(query(collection(db, 'members'), where(documentId(), 'in', batch))));
        }
        const memberSnapshots = await Promise.all(memberPromises);
        memberSnapshots.forEach(snapshot => {
          membersData = membersData.concat(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
      }
      
      // Create a map for quick member lookup
      const membersMap = new Map(membersData.map(member => [member.id, member]));

      // Combine agreement data with member data for display in Autocomplete
      const combinedAgreementsData = validAgreements.map(agreement => {
        const member = membersMap.get(agreement.memberId);
        return {
          ...agreement,
          name: member ? member.name : 'Unknown Member', // Add member's name
          company: member ? member.company : 'N/A', // Add member's company
          // You might want to add other member fields needed for display or logic
        };
      });

      setAgreements(combinedAgreementsData); // Set the combined data to agreements state
      setMembers(membersData); // Set the filtered members
    };

    fetchInvoices();
    fetchAgreementsAndMembers();
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
    const newInvoiceNumber = generateInvoiceNumber(invoices);
    const initialData = {
      memberId: null,
      agreementId: null,
      legalName: '',
      address: '',
      invoiceNumber: newInvoiceNumber,
      date: new Date().toISOString().split('T')[0],
      month: '',
      year: new Date().getFullYear().toString(),
      fromDate: '',
      toDate: '',
      items: [{ description: '', sacCode: '997212', price: '', quantity: 1 }],
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
      items: invoice.items || [{
        description: invoice.description,
        sacCode: invoice.sacCode || '997212',
        price: invoice.price,
        quantity: invoice.quantity,
      }],
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
        const member = members.find(m => m.id === agreement.memberId);
        updated.agreementId = agreement.id;
        updated.memberId = agreement.memberId;

        // Auto-fill legal details from agreement
        updated.legalName = (agreement.company && agreement.company !== 'NA' ? agreement.company : agreement.name) || '';
        updated.address = member?.legalDetails?.address || member?.address || agreement.address || '';

        // Auto-fill last invoice details from the associated member
        if (member && member.lastInvoiceDetails) {
          const newItems = [...prev.items];
          newItems[0].price = member.lastInvoiceDetails.price || '';
          newItems[0].sacCode = member.lastInvoiceDetails.sacCode || '997212';
          updated.items = newItems;
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
          // Reset to default invoice details if no saved data for this member or no member
          const newItems = [...prev.items];
          newItems[0].price = '';
          newItems[0].sacCode = '997212';
          updated.items = newItems;
          updated.discountPercentage = 0;
          updated.cgstPercentage = 9;
          updated.sgstPercentage = 9;
          updated.month = '';
          updated.year = new Date().getFullYear().toString();
          updated.fromDate = '';
          updated.toDate = '';
        }
      } else {
        // Agreement deselected, reset relevant fields to initial defaults
        updated.agreementId = null;
        updated.memberId = null;
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

  const handleItemInputChange = (index, e) => {
    const { name, value } = e.target;
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [name]: value };
    setFormData(prev => updateCalculationsAndDescription({ ...prev, items: newItems }, members));
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
          setFormData(prev => updateCalculationsAndDescription({ ...prev, items: newItems }, members));
      }
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
            sacCode: formData.items[0].sacCode,
            price: formData.items[0].price,
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

  const filteredInvoices = useMemo(() => {
    let currentInvoices = invoicesWithMemberData;

    // Apply payment status filter
    if (filterStatus !== 'All') {
      currentInvoices = currentInvoices.filter((invoice) => {
        const status = invoice.paymentStatus || 'Unpaid';
        return status === filterStatus;
      });
    }

    // Apply search query filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      currentInvoices = currentInvoices.filter(
        (invoice) =>
          (invoice.name && invoice.name.toLowerCase().includes(query)) ||
          (invoice.email && invoice.email.toLowerCase().includes(query)) ||
          (invoice.phone && invoice.phone.toLowerCase().includes(query))
      );
    }

    // Apply package filter
    if (packageFilter !== 'All Packages') {
      currentInvoices = currentInvoices.filter((invoice) => {
        const member = members.find(m => m.id === invoice.memberId);
        return member && member.package === packageFilter;
      });
    }

    // Apply month filter
    if (monthFilter !== 'All Months') {
      currentInvoices = currentInvoices.filter((invoice) => invoice.month === monthFilter);
    }

    // Apply year filter
    if (yearFilter !== 'All Years') {
      currentInvoices = currentInvoices.filter((invoice) => invoice.year === yearFilter);
    }

    return currentInvoices;
  }, [invoicesWithMemberData, filterStatus, searchQuery, packageFilter, monthFilter, yearFilter, members]);

  const handleGenerateInvoiceForMember = useCallback((memberId, e) => {
    e.stopPropagation(); // Prevent row click event from firing
    if (!hasPermission('add_invoices')) return;

    const member = members.find(m => m.id === memberId);
    if (member) {
      setEditingInvoice(null); // Ensure it's treated as a new invoice
      setInvoiceGenerated(null);
      
      // Simulate the handleMemberSelect logic to pre-fill the form
      const initialData = {
        memberId: member.id,
        legalName: member.legalDetails?.legalName || (member.company && member.company !== 'NA' ? member.company : member.name) || '',
        address: member.legalDetails?.address || member.address || '',
        invoiceNumber: '', // Keep empty for new invoice
        date: new Date().toISOString().split('T')[0],
        month: '',
        year: new Date().getFullYear().toString(),
        fromDate: '',
        toDate: '',
        items: [{ description: '', sacCode: '997212', price: '', quantity: 1 }],
        totalPrice: '',
        discountPercentage: 0,
        cgstPercentage: 9,
        sgstPercentage: 9,
        taxAmount: '',
        totalAmountPayable: ''
      };

      // Apply last invoice details if available
      if (member.lastInvoiceDetails) {
        initialData.items[0].price = member.lastInvoiceDetails.price || '';
        initialData.items[0].sacCode = member.lastInvoiceDetails.sacCode || '997212';
        initialData.discountPercentage = member.lastInvoiceDetails.discountPercentage || 0;
        initialData.cgstPercentage = member.lastInvoiceDetails.cgstPercentage !== undefined ? member.lastInvoiceDetails.cgstPercentage : 9;
        initialData.sgstPercentage = member.lastInvoiceDetails.sgstPercentage !== undefined ? member.lastInvoiceDetails.sgstPercentage : 9;
        
        const lastToDate = member.lastInvoiceDetails.toDate;
        if (lastToDate) {
          const lastToDateObj = new Date(lastToDate);
          const newFromDateObj = new Date(Date.UTC(lastToDateObj.getUTCFullYear(), lastToDateObj.getUTCMonth(), lastToDateObj.getUTCDate() + 1));
          
          const newMonthIndex = newFromDateObj.getUTCMonth();
          const newYear = newFromDateObj.getUTCFullYear();
          
          const newToDateObj = new Date(Date.UTC(newYear, newMonthIndex + 1, 0));
          
          const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
          
          initialData.month = monthNames[newMonthIndex];
          initialData.year = newYear.toString();
          initialData.fromDate = newFromDateObj.toISOString().split('T')[0];
          initialData.toDate = newToDateObj.toISOString().split('T')[0];
        }
      }
      
      setFormData(updateCalculationsAndDescription(initialData, members));
      setIsModalOpen(true);
    }
  }, [members, hasPermission, setEditingInvoice, setInvoiceGenerated, setFormData, setIsModalOpen]);

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

        {/* Filter Controls */}
        <div className={styles.filterControls}>
          <TextField
            placeholder="Search invoices by member name, email, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            size="small"
            sx={{ flex: 1, bgcolor: '#ffffff', '& .MuiOutlinedInput-root': { fontSize: '14px', '& fieldset': { borderColor: '#e0e0e0' }, '&:hover fieldset': { borderColor: '#2b7a8e' }, '&.Mui-focused fieldset': { borderColor: '#2b7a8e' } } }}
            InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon sx={{ color: '#9e9e9e', fontSize: '20px' }} /></InputAdornment>) }}
          />
          <Select
            value={packageFilter}
            onChange={(e) => setPackageFilter(e.target.value)}
            size="small"
            sx={{ minWidth: '150px', bgcolor: '#ffffff', fontSize: '14px', '& .MuiOutlinedInput-notchedOutline': { borderColor: '#e0e0e0' }, '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#2b7a8e' }, '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#2b7a8e' } }}
          >
            <MenuItem value="All Packages">All Packages</MenuItem>
            <MenuItem value="Dedicated Desk">Dedicated Desk</MenuItem>
            <MenuItem value="Flexible Desk">Flexible Desk</MenuItem>
            <MenuItem value="Private Cabin">Private Cabin</MenuItem>
            <MenuItem value="Virtual Office">Virtual Office</MenuItem>
            <MenuItem value="Meeting Room">Meeting Room</MenuItem>
            <MenuItem value="Others">Others</MenuItem>
          </Select>
          <Select
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            size="small"
            sx={{ minWidth: '150px', bgcolor: '#ffffff', fontSize: '14px', '& .MuiOutlinedInput-notchedOutline': { borderColor: '#e0e0e0' }, '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#2b7a8e' }, '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#2b7a8e' } }}
          >
            <MenuItem value="All Months">All Months</MenuItem>
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
          <Select
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            size="small"
            sx={{ minWidth: '150px', bgcolor: '#ffffff', fontSize: '14px', '& .MuiOutlinedInput-notchedOutline': { borderColor: '#e0e0e0' }, '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#2b7a8e' }, '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#2b7a8e' } }}
          >
            <MenuItem value="All Years">All Years</MenuItem>
            {/* Generate years dynamically, e.g., last 5 years and next 2 years */}
            {Array.from({ length: 8 }, (_, i) => new Date().getFullYear() - 5 + i).map(year => (
              <MenuItem key={year} value={String(year)}>{year}</MenuItem>
            ))}
          </Select>
          <Button
            variant="outlined"
            startIcon={<FilterListIcon />}
            onClick={() => {
              setSearchQuery('');
              setPackageFilter('All Packages');
              setMonthFilter('All Months');
              setYearFilter('All Years');
              setFilterStatus('All'); // Also clear the payment status filter
            }}
            sx={{ textTransform: 'none', fontSize: '14px', color: '#424242', borderColor: '#e0e0e0', bgcolor: '#ffffff', px: 2, '&:hover': { borderColor: '#2b7a8e', bgcolor: '#ffffff' } }}
          >
            Clear Filters
          </Button>
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
              {invoices.filter(inv => !inv.paymentStatus || inv.paymentStatus === 'Unpaid').length}
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
                <th>Actions</th>
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
                  <td>
                    {hasPermission('add_invoices') && (
                      <IconButton
                        onClick={(e) => handleGenerateInvoiceForMember(invoice.memberId, e)}
                        size="small"
                        color="primary"
                        aria-label="generate invoice"
                      >
                        <Description />
                      </IconButton>
                    )}
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
                  options={agreements}
                  getOptionLabel={(option) => `${option.name} (${option.company})`}
                  onChange={handleAgreementSelect}
                  value={agreements.find(a => a.id === formData.agreementId) || null}
                  disabled={!!editingInvoice}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Select Agreement"
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
                  disabled
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
              </div>
            </div>

            {/* Pricing Section */}
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Pricing Details</h3>
              {formData.items.map((item, index) => (
                <div key={index} className={styles.itemRow}>
                    <TextField
                        label="Description"
                        name="description"
                        value={item.description}
                        onChange={(e) => handleItemInputChange(index, e)}
                        variant="outlined"
                        size="small"
                        required
                        InputProps={{ readOnly: index === 0 && !!formData.agreementId }}
                        style={{ flex: 3 }}
                    />
                    <TextField
                        label="SAC"
                        name="sacCode"
                        value={item.sacCode}
                        onChange={(e) => handleItemInputChange(index, e)}
                        variant="outlined"
                        size="small"
                        required
                        style={{ flex: 1 }}
                    />
                    <TextField
                        label="Price"
                        name="price"
                        type="number"
                        value={item.price}
                        onChange={(e) => handleItemInputChange(index, e)}
                        variant="outlined"
                        size="small"
                        required
                        inputProps={{ step: "0.01", min: "0" }}
                        style={{ flex: 1 }}
                    />
                    <TextField
                        label="Qty"
                        name="quantity"
                        type="number"
                        value={item.quantity}
                        onChange={(e) => handleItemInputChange(index, e)}
                        variant="outlined"
                        size="small"
                        required
                        inputProps={{ step: "1", min: "1" }}
                        style={{ flex: 1 }}
                    />
                    <TextField
                        label="Total"
                        name="total"
                        type="number"
                        value={((parseFloat(item.price) || 0) * (parseInt(item.quantity, 10) || 0)).toFixed(2)}
                        variant="outlined"
                        size="small"
                        InputProps={{ readOnly: true }}
                        style={{ flex: 1 }}
                    />
                    {formData.items.length > 1 && (
                        <IconButton onClick={() => handleRemoveItem(index)} size="small">
                            <RemoveCircleOutline />
                        </IconButton>
                    )}
                </div>
              ))}
              {formData.items.length < 4 && (
                  <Button
                      startIcon={<AddCircleOutline />}
                      onClick={handleAddItem}
                      size="small"
                      style={{ marginTop: '10px' }}
                  >
                      Add Item
                  </Button>
              )}
              <div className={styles.formGrid} style={{marginTop: '16px'}}>
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