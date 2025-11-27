import { useState, useEffect, useContext, useMemo } from 'react';
import { Dialog, DialogTitle, DialogContent, TextField, Button, IconButton, MenuItem, Box, InputAdornment, Select } from '@mui/material';
import { Close } from '@mui/icons-material';
import styles from './Agreements.module.css';
import { FirebaseContext, AuthContext } from '../store/Context';
import { collection, getDocs, doc, getDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore'; // Added serverTimestamp
import { getFunctions, httpsCallable } from 'firebase/functions';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { saveAs } from 'file-saver';
import { toast } from 'sonner';
import { logActivity } from '../utils/logActivity';
import { usePermissions } from '../auth/usePermissions';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import ExitDateModal from './ExitDateModal';
import SearchIcon from '@mui/icons-material/Search';

const generateAgreementNumber = (memberPackageName, allAgreements) => {
  if (!memberPackageName) {
    return '';
  }

  const currentDate = new Date();
  const currentYear = currentDate.getFullYear().toString().slice(-2);
  const month = currentDate.getMonth();
  
  const monthChar = String.fromCharCode(65 + month); // A=Jan, B=Feb, ...

  const packageChar = memberPackageName.charAt(0).toUpperCase();

  const filteringPrefix = `TB${currentYear}${monthChar}`; // New variable for filtering

  const relevantAgreements = allAgreements.filter(a => a.agreementNumber?.startsWith(filteringPrefix));
  
  let maxSeq = 0;
  relevantAgreements.forEach(a => {
    const seqStr = a.agreementNumber.slice(-4); // Get the last 4 characters
    const seqNum = parseInt(seqStr, 10);
    if (!isNaN(seqNum) && seqNum > maxSeq) {
      maxSeq = seqNum;
    }
  });

  const newSeq = String(maxSeq + 1).padStart(4, '0');

  // Construct the final agreement number with packageChar included
  return `TB${currentYear}${monthChar}${packageChar}${newSeq}`;
};

const formatBirthday = (day, month) => {
  if (!day || !month) return '-';
  const date = new Date(2000, month - 1, day); // Use a dummy year like 2000
  return date.toLocaleString('en-US', { month: 'short', day: 'numeric' });
};


export default function Agreements() {
  const { db } = useContext(FirebaseContext);
  const { user } = useContext(AuthContext);
  const { hasPermission } = usePermissions();
  const [allAgreements, setAllAgreements] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('Active');
  const [selectedAgreement, setSelectedAgreement] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isOtherPackage, setIsOtherPackage] = useState(false);
  const [agreementGenerated, setAgreementGenerated] = useState(null);
  const [isExitModalOpen, setIsExitModalOpen] = useState(false);
  const [latestAuthDetails, setLatestAuthDetails] = useState({ // New state for latest auth details
    authorizorName: '',
    designation: '',
    preparedByNew: '',
  });
  const [formData, setFormData] = useState({
    memberLegalName: '',
    memberCIN: '',
    memberGST: '',
    memberPAN: '',
    memberKYC: '',
    memberAddress: '',
    agreementDate: '',
    agreementNumber: '',
    startDate: '',
    endDate: '',
    servicePackage: '',
    serviceQuantity: 1,
    totalMonthlyPayment: '',
    authorizorName: '',
    designation: '',
    preparedByNew: '',
    clientAuthorizorName: '',
    clientAuthorizorTitle: '',
    agreementLength: '',
  });

  const functions = getFunctions();
  const sendAgreementEmailCallable = httpsCallable(functions, 'sendAgreementEmail');
  const earlyExitAgreementCallable = httpsCallable(functions, 'earlyExitAgreement');

  useEffect(() => {
    if (!hasPermission('agreements:view')) return;
    if (db) {
      const fetchAgreements = async () => {
        const agreementsCollection = collection(db, 'agreements');
        const agreementsSnapshot = await getDocs(agreementsCollection);
        const agreementsData = agreementsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const allAgreementsRaw = agreementsData.filter(agreement => agreement.leadId);

        const leadPromises = allAgreementsRaw.map(agreement => {
          const leadDocRef = doc(db, 'leads', agreement.leadId);
          return getDoc(leadDocRef);
        });
        const leadSnapshots = await Promise.all(leadPromises);
        const combinedData = allAgreementsRaw.map((agreement, index) => {
          const leadData = leadSnapshots[index].data();
          return leadData ? { ...leadData, ...agreement } : null;
        }).filter(Boolean);

        combinedData.sort((a, b) => {
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

          const dateA = getDate(a.lastEditedAt || a.createdAt);
          const dateB = getDate(b.lastEditedAt || b.createdAt);

          if (dateA && dateB) {
            return dateB.getTime() - dateA.getTime(); // Descending sort
          }
          if (dateA) return -1; // a comes first if b has no date
          if (dateB) return 1;  // b comes first if a has no date

          // Fallback to agreementDate if both lastEditedAt and createdAt are missing or invalid
          const agreementDateA = a.agreementDate ? new Date(a.agreementDate) : null;
          const agreementDateB = b.agreementDate ? new Date(b.agreementDate) : null;

          if (agreementDateA && agreementDateB) {
            return agreementDateB.getTime() - agreementDateA.getTime();
          }
          if (agreementDateA) return -1;
          if (agreementDateB) return 1;
          return 0;
        });

        setAllAgreements(combinedData);

        const activeAgreements = combinedData.filter(a => a.status !== 'terminated');
        if (activeAgreements.length > 0) {
          const latest = activeAgreements[0];
          setLatestAuthDetails({
            authorizorName: latest.authorizorName || '',
            designation: latest.designation || '',
            preparedByNew: latest.preparedByNew || '',
          });
        }
      };
      fetchAgreements();
    }
  }, [db, hasPermission]);

  const displayedAgreements = useMemo(() => {
    let filtered = allAgreements;

    if (statusFilter === 'Active') {
        filtered = filtered.filter(a => a.status !== 'terminated');
    } else if (statusFilter === 'Terminated') {
        filtered = filtered.filter(a => a.status === 'terminated');
    }

    if (searchQuery) {
        const lowercasedQuery = searchQuery.toLowerCase();
        filtered = filtered.filter(a => 
            (a.memberLegalName || a.name)?.toLowerCase().includes(lowercasedQuery) ||
            (a.convertedEmail)?.toLowerCase().includes(lowercasedQuery) ||
            (a.phone)?.toLowerCase().includes(lowercasedQuery)
        );
    }

    return filtered;
  }, [allAgreements, statusFilter, searchQuery]);

  useEffect(() => {
    if (formData.startDate && formData.agreementLength) {
      const startDate = new Date(formData.startDate);
      const length = parseInt(formData.agreementLength, 10);
      if (!isNaN(startDate.getTime()) && !isNaN(length)) {
        const endDate = new Date(startDate.setMonth(startDate.getMonth() + length));
        setFormData((prev) => ({
          ...prev,
          endDate: endDate.toISOString().split('T')[0],
        }));
      }
    }
  }, [formData.startDate, formData.agreementLength]);

  useEffect(() => {
    if (isModalOpen && (!selectedAgreement?.agreementNumber)) {
      const newAgreementNumber = generateAgreementNumber(selectedAgreement?.purposeOfVisit, allAgreements);
      if (newAgreementNumber) {
        setFormData(prev => ({ ...prev, agreementNumber: newAgreementNumber }));
      }
    }
  }, [selectedAgreement?.purposeOfVisit, isModalOpen, selectedAgreement, allAgreements]);


  const handleRowClick = (agreement) => {
    if (!hasPermission('agreements:view')) return;
    setAgreementGenerated(null);
    setSelectedAgreement(agreement);

    const serviceAgreementType = agreement.serviceAgreementType || '';
    let servicePackage = '';
    let serviceQuantity = 1;
    let isOtherPkg = false;
    const standardPackages = ["Dedicated Desk", "Flexible Desk", "Private Cabin", "Virtual Office", "Meeting Room", ""];

    if (serviceAgreementType) { // Agreement has been saved before
        const parts = serviceAgreementType.split(' - ');
        servicePackage = parts[0];
        if (parts.length > 1) {
            const qtyPart = parts[1].split(' ')[0];
            if (qtyPart && !isNaN(qtyPart)) {
                serviceQuantity = parseInt(qtyPart, 10);
            }
        }
    } else { // New/untouched agreement, use member's package
        servicePackage = agreement.purposeOfVisit || '';
    }

    if (servicePackage && !standardPackages.includes(servicePackage)) {
        isOtherPkg = true;
    }

    setFormData({
      memberLegalName: agreement.memberLegalName || '',
      memberCIN: agreement.memberCIN || 'Not Applicable',
      memberGST: agreement.memberGST || 'Not Applicable',
      memberPAN: agreement.memberPAN || 'Not Applicable',
      memberKYC: agreement.memberKYC || 'Not Applicable',
      memberAddress: agreement.memberAddress || '',
      agreementDate: agreement.agreementDate || '',
      agreementNumber: agreement.agreementNumber || '',
      startDate: agreement.startDate || '',
      endDate: agreement.endDate || '',
      servicePackage: servicePackage,
      serviceQuantity: serviceQuantity,
      totalMonthlyPayment: agreement.totalMonthlyPayment || '',
      authorizorName: agreement.authorizorName || latestAuthDetails.authorizorName || '',
      designation: agreement.designation || latestAuthDetails.designation || '',
      preparedByNew: agreement.preparedByNew || latestAuthDetails.preparedByNew || '',
      clientAuthorizorName: agreement.clientAuthorizorName || '',
      clientAuthorizorTitle: agreement.clientAuthorizorTitle || '',
      agreementLength: agreement.agreementLength || '',
    });
    setIsOtherPackage(isOtherPkg);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedAgreement(null);
    setAgreementGenerated(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'servicePackage_select') {
        if (value === 'Others') {
            setIsOtherPackage(true);
            setFormData(prev => ({...prev, servicePackage: ''}));
        } else {
            setIsOtherPackage(false);
            setFormData(prev => ({...prev, servicePackage: value}));
        }
        return;
    }
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleDateChange = (name, newValue) => {
    const formattedDate = newValue ? dayjs(newValue).format('YYYY-MM-DD') : '';
    setFormData((prev) => ({
      ...prev,
      [name]: formattedDate,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!hasPermission('agreements:edit')) {
        toast.error("You don't have permission to update agreements.");
        return;
    }
    
    if (!selectedAgreement) return;

    const serviceAgreementType = `${formData.servicePackage} - ${formData.serviceQuantity} nos`;
    const dataToUpdate = {
        ...formData,
        serviceAgreementType: serviceAgreementType,
        clientAuthorizorName: formData.clientAuthorizorName,
        clientAuthorizorTitle: formData.clientAuthorizorTitle,
        lastEditedAt: serverTimestamp(), // Update last edited timestamp
    };

    const agreementRef = doc(db, 'agreements', selectedAgreement.id);
    await updateDoc(agreementRef, dataToUpdate);

    const updatedAgreement = { ...selectedAgreement, ...dataToUpdate };

    setAllAgreements((prev) =>
      prev.map((agreement) =>
        agreement.id === selectedAgreement.id
          ? updatedAgreement
          : agreement
      )
    );

    if (selectedAgreement.leadId) {
        const leadRef = doc(db, 'leads', selectedAgreement.leadId);
        await updateDoc(leadRef, {
            memberLegalName: formData.memberLegalName,
            memberAddress: formData.memberAddress,
            memberCIN: formData.memberCIN,
            memberGST: formData.memberGST,
            memberPAN: formData.memberPAN,
            memberKYC: formData.memberKYC,
            lastEditedAt: serverTimestamp(), // Update last edited timestamp for the lead as well
        });
    }

    setAgreementGenerated(updatedAgreement);
    logActivity(
      db,
      user,
      'agreement_updated',
      `Agreement "${updatedAgreement.agreementNumber}" for "${updatedAgreement.name}" was updated.`, 
      { agreementId: updatedAgreement.id, agreementNumber: updatedAgreement.agreementNumber, memberName: updatedAgreement.name }
    );
  };

  const handleDeleteClick = async () => {
    if (!hasPermission('agreements:delete')) {
        toast.error("You don't have permission to delete agreements.");
        return;
    }
    if (!selectedAgreement) return;

    if (window.confirm(`Are you sure you want to delete the agreement for ${selectedAgreement.name}? This action cannot be undone.`)) {
      try {
        const agreementRef = doc(db, 'agreements', selectedAgreement.id);
        await deleteDoc(agreementRef);

        setAllAgreements(prev => prev.filter(a => a.id !== selectedAgreement.id));
        handleCloseModal();
      } catch (error) {
        console.error("Error deleting agreement:", error);
      }
    }
  };

  const formatDate = (dateString) => {
      if (!dateString) return '-';
      const date = new Date(dateString);
      const userTimezoneOffset = date.getTimezoneOffset() * 60000;
      const adjustedDate = new Date(date.getTime() + userTimezoneOffset);
      return adjustedDate.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const splitTextIntoLines = (text, font, fontSize, maxWidth) => {
    const words = text.split(' ');
    let line = '';
    const lines = [];
  
    for (const word of words) {
      const testLine = line + word + ' ';
      const testWidth = font.widthOfTextAtSize(testLine, fontSize);
      if (testWidth > maxWidth) {
        lines.push(line.trim());
        line = word + ' ';
      } else {
        line = testLine;
      }
    }
    lines.push(line.trim());
  
    return lines.slice(0, 3);
  };

  const getAgreementPdfBase64 = async (agreementData) => {
    const url = '/tb_agreement.pdf';
    const existingPdfBytes = await fetch(url).then(res => res.arrayBuffer());
  
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  
    const pages = pdfDoc.getPages();
    const firstPage = pages[0];
    const secondPage = pages[1];
  
    firstPage.drawText(agreementData.preparedByNew || '', {
      x: 60,
      y: 52,
      font: helveticaFont,
      size: 15,
      color: rgb(0.466, 0.466, 0.466),
    });
  
    for (let i = 1; i < pages.length; i++) {
      pages[i].drawText(agreementData.agreementNumber || '', {
        x: 480,
        y: 729,
        font: helveticaFont,
        size: 8.5,
        color: rgb(0.466, 0.466, 0.466),
      });
      pages[i].drawText(`(${agreementData.memberLegalName || ''})`, {
        x: 89,
        y: 105,
        font: helveticaFont,
        size: 11,
        color: rgb(0, 0, 0),
      });
    }
  
    if (secondPage) {
      secondPage.drawText(agreementData.serviceAgreementType || '', { x: 185, y: 394, font: helveticaFont, size: 9.5, color: rgb(0, 0, 0) });
      secondPage.drawText(`${agreementData.totalMonthlyPayment || ''} /-`, { x: 275, y: 380, font: helveticaFont, size: 9.5, color: rgb(0, 0, 0) });
      secondPage.drawText(formatDate(agreementData.endDate) || '', { x: 350, y: 408, font: helveticaFont, size: 9.5, color: rgb(0, 0, 0) });
      secondPage.drawText(formatDate(agreementData.startDate) || '', { x: 175, y: 408, font: helveticaFont, size: 9.5, color: rgb(0, 0, 0) });
      secondPage.drawText(agreementData.agreementNumber || '', { x: 160, y: 437, font: helveticaFont, size: 9.5, color: rgb(0, 0, 0) });
      secondPage.drawText(formatDate(agreementData.agreementDate) || '', { x: 145, y: 451, font: helveticaFont, size: 9.5, color: rgb(0, 0, 0) });
  
      secondPage.drawText(agreementData.memberLegalName || '', { x: 170, y: 608, font: helveticaFont, size: 9.5, color: rgb(0, 0, 0) });
      secondPage.drawText(agreementData.memberCIN || '', { x: 130, y: 594, font: helveticaFont, size: 9.5, color: rgb(0, 0, 0) });
      secondPage.drawText(agreementData.memberGST || '', { x: 174, y: 579, font: helveticaFont, size: 9.5, color: rgb(0, 0, 0) });
      secondPage.drawText(agreementData.memberPAN || '', { x: 133, y: 565, font: helveticaFont, size: 9.5, color: rgb(0, 0, 0) });
      secondPage.drawText(agreementData.memberKYC || '', { x: 133, y: 551, font: helveticaFont, size: 9.5, color: rgb(0, 0, 0) });
  
      const address = (agreementData.memberAddress || '').replace(/\n/g, ' ');
      const addressLines = splitTextIntoLines(address, helveticaFont, 9.5, 300);
      let y = 536.5;
      for (const line of addressLines) {
        secondPage.drawText(line, { x: 150, y, font: helveticaFont, size: 9.5, color: rgb(0, 0, 0) });
        y -= 12;
      }
  
      secondPage.drawText(agreementData.clientAuthorizorName || '', { x: 150, y: 280, font: helveticaFont, size: 9.5, color: rgb(0, 0, 0) });
      secondPage.drawText(agreementData.clientAuthorizorTitle || '', { x: 150, y: 266, font: helveticaFont, size: 9.5, color: rgb(0, 0, 0) });
  
      secondPage.drawText(agreementData.authorizorName || '', { x: 370, y: 280, font: helveticaFont, size: 9.5, color: rgb(0, 0, 0) });
      secondPage.drawText(agreementData.designation || '', { x: 370, y: 266, font: helveticaFont, size: 9.5, color: rgb(0, 0, 0) });
      const currentDate = new Date();
      secondPage.drawText(formatDate(currentDate), { x: 415, y: 252, font: helveticaFont, size: 9.5, color: rgb(0, 0, 0) });
      secondPage.drawText(formatDate(currentDate), { x: 150, y: 252, font: helveticaFont, size: 9.5, color: rgb(0, 0, 0) });
    }
  
    const pdfBytes = await pdfDoc.save();
    let binary = '';
    for (let i = 0; i < pdfBytes.length; i++) {
      binary += String.fromCharCode(pdfBytes[i]);
    }
    return btoa(binary);
  };

  const handleEarlyExit = async () => {
    if (!hasPermission('agreements:early_exit')) {
      toast.error("You don't have permission to terminate agreements.");
      return;
    }
    if (!selectedAgreement) return;
    setIsExitModalOpen(true);
  };

  const handleEarlyExitConfirm = async (exitDate) => {
    if (!selectedAgreement) return;
    try {
      const result = await earlyExitAgreementCallable({ agreementId: selectedAgreement.id, exitDate: exitDate });
      toast.success(result.data.message);

      setAllAgreements(prev => 
        prev.map(a => 
            a.id === selectedAgreement.id 
            ? { ...a, status: 'terminated', exitDate: exitDate, lastEditedAt: serverTimestamp() } // Assuming callable updates lastEditedAt
            : a
        )
      );
      
      logActivity(
        db,
        user,
        'agreement_early_exit',
        `Agreement "${selectedAgreement.agreementNumber}" for "${selectedAgreement.name}" was terminated early.`, 
        { agreementId: selectedAgreement.id, agreementNumber: selectedAgreement.agreementNumber, memberName: selectedAgreement.name }
      );
      handleCloseModal();
    } catch (error) {
      console.error("Error performing early exit:", error);
      toast.error(error.message || "Failed to perform early exit.");
    } finally {
      setIsExitModalOpen(false);
    }
  };

  const handleSendAgreementEmail = async () => {
    if (!hasPermission('agreements:edit')) {
        toast.error("You don't have permission to send agreement emails.");
        return;
    }
    if (!agreementGenerated || !agreementGenerated.convertedEmail || !agreementGenerated.name || !agreementGenerated.agreementNumber) {
      toast.error("Missing agreement details to send email.");
      return;
    }

    try {
      const pdfBase64 = await getAgreementPdfBase64(agreementGenerated);
      await sendAgreementEmailCallable({
        toEmail: agreementGenerated.convertedEmail,
        clientName: agreementGenerated.name,
        agreementName: agreementGenerated.agreementNumber,
        pdfBase64: pdfBase64,
      });
      toast.success("Agreement email sent successfully!");
    } catch (error) {
      console.error("Error sending agreement email:", error);
      toast.error(error.message || "Failed to send agreement email.");
    }
  };

  if (!hasPermission('agreements:view')) {
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
            <h1 className={styles.title}>Agreements</h1>
            <p className={styles.subtitle}>Manage your client agreements and onboarding details.</p>
          </div>
        </div>

        <Box sx={{ display: 'flex', gap: 2, my: 3, alignItems: 'center' }}>
          <TextField
            placeholder="Search by name, email, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            size="small"
            sx={{ flex: 1, bgcolor: '#ffffff', '& .MuiOutlinedInput-root': { fontSize: '14px', '& fieldset': { borderColor: '#e0e0e0' }, '&:hover fieldset': { borderColor: '#2b7a8e' }, '&.Mui-focused fieldset': { borderColor: '#2b7a8e' } } }}
            InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon sx={{ color: '#9e9e9e', fontSize: '20px' }} /></InputAdornment>) }}
          />
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            size="small"
            sx={{ minWidth: 200, bgcolor: '#ffffff', fontSize: '14px', '& .MuiOutlinedInput-notchedOutline': { borderColor: '#e0e0e0' }, '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#2b7a8e' }, '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#2b7a8e' } }}
          >
            <MenuItem value="Active">Active Agreements</MenuItem>
            <MenuItem value="Terminated">Terminated Agreements</MenuItem>
          </Select>
        </Box>

        <div className={styles.tableCard}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Package</th>
                <th>Birthday</th>
                <th>Email</th>
                <th>Phone</th>
              </tr>
            </thead>
            <tbody>
              {displayedAgreements.map((agreement) => (
                <tr 
                  key={agreement.id} 
                  onClick={() => handleRowClick(agreement)}
                  className={hasPermission('agreements:view') ? styles.clickableRow : ''}
                >
                  <td>
                    <span className={styles.nameText}>{agreement.memberLegalName || agreement.name}</span>
                  </td>
                  <td>
                    {agreement.purposeOfVisit}
                  </td>
                  <td>{agreement.birthdayDay && agreement.birthdayMonth ? formatBirthday(agreement.birthdayDay, agreement.birthdayMonth) : '-' }</td>
                  <td>{agreement.convertedEmail}</td>
                  <td>{agreement.phone}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

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
            <h2 style={{ margin: 0, color: '#1a4d5c', fontSize: '20px', fontWeight: 600 }}>
              {agreementGenerated ? 'Agreement Updated' : 'Agreement Details'}
            </h2>
            <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '14px', fontWeight: 400 }}>
              {agreementGenerated ? 'The agreement has been saved.' : (formData.memberLegalName || selectedAgreement?.name)}
            </p>
          </div>
          <IconButton onClick={handleCloseModal} size="small">
            <Close />
          </IconButton>
        </DialogTitle>
        
        <DialogContent style={{ padding: '24px' }}>
          {agreementGenerated ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <p style={{ margin: '4px 0 24px 0', color: '#64748b', fontSize: '14px', fontWeight: 400 }}>
                You can now download the agreement or send it via email.
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
                <Button
                  onClick={async () => {
                    try {
                      const pdfBase64 = await getAgreementPdfBase64(agreementGenerated);
                      const byteCharacters = atob(pdfBase64);
                      const byteArray = Uint8Array.from(byteCharacters, char => char.charCodeAt(0));
                      const blob = new Blob([byteArray], { type: 'application/pdf' });
                      saveAs(blob, `${agreementGenerated.agreementNumber || 'agreement'}.pdf`);
                      toast.success("Agreement downloaded successfully!");
                    } catch (error) {
                      console.error("Error downloading agreement:", error);
                      toast.error("Failed to download agreement.");
                    }
                  }}
                  variant="contained"
                  style={{ backgroundColor: '#2b7a8e', color: 'white', textTransform: 'none', padding: '8px 24px' }}
                >
                  Download Agreement
                </Button>
                <Button
                  onClick={handleSendAgreementEmail}
                  variant="outlined"
                  style={{ color: '#64748b', borderColor: '#cbd5e1', textTransform: 'none', padding: '8px 24px' }}
                >
                  Send Email
                </Button>
              </div>
            </div>
          ) : (
            <LocalizationProvider dateAdapter={AdapterDayjs}>
            <form onSubmit={handleSubmit}>
              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Member Details</h3>
                <div className={styles.formGrid}>
                  <TextField label="Member Legal Name" name="memberLegalName" value={formData.memberLegalName} onChange={handleInputChange} fullWidth variant="outlined" size="small" disabled={!hasPermission('agreements:edit') || selectedAgreement?.status === 'terminated'} />
                  <TextField label="Member CIN" name="memberCIN" value={formData.memberCIN} onChange={handleInputChange} fullWidth variant="outlined" size="small" disabled={!hasPermission('agreements:edit') || selectedAgreement?.status === 'terminated'} />
                  <TextField label="Member GST Number" name="memberGST" value={formData.memberGST} onChange={handleInputChange} fullWidth variant="outlined" size="small" disabled={!hasPermission('agreements:edit') || selectedAgreement?.status === 'terminated'} />
                  <TextField label="Member PAN" name="memberPAN" value={formData.memberPAN} onChange={handleInputChange} fullWidth variant="outlined" size="small" disabled={!hasPermission('agreements:edit') || selectedAgreement?.status === 'terminated'} />
                  <TextField label="Member KYC" name="memberKYC" value={formData.memberKYC} onChange={handleInputChange} fullWidth variant="outlined" size="small" disabled={!hasPermission('agreements:edit') || selectedAgreement?.status === 'terminated'} />
                  <TextField label="Member Address" name="memberAddress" value={formData.memberAddress} onChange={handleInputChange} fullWidth variant="outlined" size="small" multiline rows={2} style={{ gridColumn: '1 / -1' }} disabled={!hasPermission('agreements:edit') || selectedAgreement?.status === 'terminated'} />
                </div>
              </div>

              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Client Authorization Details</h3>
                <div className={styles.formGrid}>
                  <TextField label="Name" name="clientAuthorizorName" value={formData.clientAuthorizorName} onChange={handleInputChange} fullWidth variant="outlined" size="small" disabled={!hasPermission('agreements:edit') || selectedAgreement?.status === 'terminated'} />
                  <TextField label="Title" name="clientAuthorizorTitle" value={formData.clientAuthorizorTitle} onChange={handleInputChange} fullWidth variant="outlined" size="small" disabled={!hasPermission('agreements:edit') || selectedAgreement?.status === 'terminated'} />
                </div>
              </div>

              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Agreement Information</h3>
                <div className={styles.formGrid}>
                <DatePicker label="Agreement Date" value={formData.agreementDate ? dayjs(formData.agreementDate) : null} onChange={(newValue) => handleDateChange('agreementDate', newValue)} format="DD/MM/YYYY" slotProps={{ textField: { fullWidth: true, variant: 'outlined', size: 'small' } }} disabled={!hasPermission('agreements:edit') || selectedAgreement?.status === 'terminated'} />
                  <TextField label="Agreement Number" name="agreementNumber" value={formData.agreementNumber} onChange={handleInputChange} fullWidth variant="outlined" size="small" disabled />
                  <DatePicker label="Start Date" value={formData.startDate ? dayjs(formData.startDate) : null} onChange={(newValue) => handleDateChange('startDate', newValue)} format="DD/MM/YYYY" slotProps={{ textField: { fullWidth: true, variant: 'outlined', size: 'small' } }} disabled={!hasPermission('agreements:edit') || selectedAgreement?.status === 'terminated'} />
                  <TextField label="Length of Agreement" name="agreementLength" value={formData.agreementLength} onChange={handleInputChange} fullWidth variant="outlined" size="small" select disabled={!hasPermission('agreements:edit') || selectedAgreement?.status === 'terminated'}>
                    {[...Array(11).keys()].map((i) => ( <MenuItem key={i + 1} value={i + 1}> {i + 1} month(s) </MenuItem> ))}
                  </TextField>
                  <DatePicker label="End Date" value={formData.endDate ? dayjs(formData.endDate) : null} onChange={(newValue) => handleDateChange('endDate', newValue)} format="DD/MM/YYYY" slotProps={{ textField: { fullWidth: true, variant: 'outlined', size: 'small', disabled: true } }} disabled={!hasPermission('agreements:edit') || selectedAgreement?.status === 'terminated'} />
                  <TextField label="Package" name="servicePackage_select" value={isOtherPackage ? 'Others' : formData.servicePackage} onChange={handleInputChange} fullWidth variant="outlined" size="small" select disabled={!hasPermission('agreements:edit') || selectedAgreement?.status === 'terminated'}>
                    <MenuItem value="">Select Package</MenuItem>
                    <MenuItem value="Dedicated Desk">Dedicated Desk</MenuItem>
                    <MenuItem value="Flexible Desk">Flexible Desk</MenuItem>
                    <MenuItem value="Private Cabin">Private Cabin</MenuItem>
                    <MenuItem value="Virtual Office">Virtual Office</MenuItem>
                    <MenuItem value="Meeting Room">Meeting Room</MenuItem>
                    <MenuItem value="Others">Others</MenuItem>
                  </TextField>
                  <TextField label="Quantity" name="serviceQuantity" type="number" value={formData.serviceQuantity} onChange={handleInputChange} fullWidth variant="outlined" size="small" InputProps={{ inputProps: { min: 1 } }} disabled={!hasPermission('agreements:edit') || selectedAgreement?.status === 'terminated'} />
                  {isOtherPackage && ( <TextField label="Other Package" name="servicePackage" value={formData.servicePackage} onChange={handleInputChange} fullWidth variant="outlined" size="small" style={{ gridColumn: '1 / -1' }} disabled={!hasPermission('agreements:edit') || selectedAgreement?.status === 'terminated'} /> )}
                  <TextField label="Total Monthly Payment" name="totalMonthlyPayment" value={formData.totalMonthlyPayment} onChange={handleInputChange} fullWidth variant="outlined" size="small" type="number" disabled={!hasPermission('agreements:edit') || selectedAgreement?.status === 'terminated'} />
                </div>
              </div>

              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Authorization Details</h3>
                <div className={styles.formGrid}>
                  <TextField label="Authorizor Name" name="authorizorName" value={formData.authorizorName} onChange={handleInputChange} fullWidth variant="outlined" size="small" disabled={!hasPermission('agreements:edit') || selectedAgreement?.status === 'terminated'} />
                  <TextField label="Prepared By" name="preparedByNew" value={formData.preparedByNew} onChange={handleInputChange} fullWidth variant="outlined" size="small" disabled={!hasPermission('agreements:edit') || selectedAgreement?.status === 'terminated'} />
                  <TextField label="Designation" name="designation" value={formData.designation} onChange={handleInputChange} fullWidth variant="outlined" size="small" disabled={!hasPermission('agreements:edit') || selectedAgreement?.status === 'terminated'} />
                </div>
              </div>

              <div className={styles.modalActions}>
                {hasPermission('agreements:delete') && selectedAgreement?.status !== 'terminated' && ( <Button onClick={handleDeleteClick} variant="outlined" style={{ color: '#f44336', borderColor: '#f44336', textTransform: 'none', padding: '8px 24px', marginRight: '12px' }}> Delete </Button> )}
                {hasPermission('agreements:early_exit') && selectedAgreement?.status !== 'terminated' && ( <Button onClick={handleEarlyExit} variant="outlined" style={{ color: '#ff9800', borderColor: '#ff9800', textTransform: 'none', padding: '8px 24px', marginRight: 'auto' }}> Early Exit </Button> )}
                {selectedAgreement && (
                  <Button
                    onClick={async () => {
                      try {
                        const pdfBase64 = await getAgreementPdfBase64(formData);
                        const byteCharacters = atob(pdfBase64);
                        const byteArray = Uint8Array.from(byteCharacters, char => char.charCodeAt(0));
                        const blob = new Blob([byteArray], { type: 'application/pdf' });
                        saveAs(blob, `${formData.agreementNumber || 'agreement'}.pdf`);
                        toast.success("Agreement downloaded successfully!");
                      } catch (error) {
                        console.error("Error downloading agreement:", error);
                        toast.error("Failed to download agreement.");
                      }
                    }}
                    variant="outlined"
                    style={{ color: '#2b7a8e', borderColor: '#2b7a8e', textTransform: 'none', padding: '8px 24px' }}
                  >
                    Download Current Agreement
                  </Button>
                )}
                {selectedAgreement?.status !== 'terminated' && (
                <Button onClick={handleCloseModal} variant="outlined" style={{ color: '#64748b', borderColor: '#cbd5e1', textTransform: 'none', padding: '8px 24px' }}>
                  Cancel
                </Button>
                )}
                {hasPermission('agreements:edit') && selectedAgreement?.status !== 'terminated' && (
                  <Button type="submit" variant="contained" style={{ backgroundColor: '#2b7a8e', color: 'white', textTransform: 'none', padding: '8px 24px' }}>
                    Update Agreement
                  </Button>
                )}
              </div>
            </form>
            </LocalizationProvider>
          )}
        </DialogContent>
      </Dialog>
      {isExitModalOpen && (
        <ExitDateModal
          open={isExitModalOpen}
          onClose={() => setIsExitModalOpen(false)}
          onConfirm={handleEarlyExitConfirm}
          memberName={selectedAgreement?.name}
        />
      )}
    </div>
  );
}

