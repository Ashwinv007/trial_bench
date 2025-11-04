import { useState, useEffect, useContext } from 'react';
import { Dialog, DialogTitle, DialogContent, TextField, Button, IconButton, MenuItem } from '@mui/material';
import { Close } from '@mui/icons-material';
import styles from './Agreements.module.css';
import { FirebaseContext } from '../store/Context';
import { collection, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { saveAs } from 'file-saver';

export default function Agreements() {
  const { db } = useContext(FirebaseContext);
  const [agreements, setAgreements] = useState([]);
  const [selectedAgreement, setSelectedAgreement] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
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
    serviceAgreementType: '',
    totalMonthlyPayment: '',
    authorizorName: '',
    designation: '',
    preparedByNew: '',
    title: '',
    agreementLength: '',
  });

  useEffect(() => {
    if (db) {
      const fetchAgreements = async () => {
        const agreementsCollection = collection(db, 'agreements');
        const agreementsSnapshot = await getDocs(agreementsCollection);
        const agreementsData = agreementsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const validAgreements = agreementsData.filter(agreement => agreement.leadId);

        const leadPromises = validAgreements.map(agreement => {
          const leadDocRef = doc(db, 'leads', agreement.leadId);
          return getDoc(leadDocRef);
        });

        const leadSnapshots = await Promise.all(leadPromises);

        const combinedData = validAgreements.map((agreement, index) => {
          const leadData = leadSnapshots[index].data();
          return { ...agreement, ...leadData };
        });

        setAgreements(combinedData);
      };
      fetchAgreements();
    }
  }, [db]);

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

  const handleRowClick = (agreement) => {
    setSelectedAgreement(agreement);
    setFormData({
      memberLegalName: agreement.memberLegalName || '',
      memberCIN: agreement.memberCIN || '',
      memberGST: agreement.memberGST || '',
      memberPAN: agreement.memberPAN || '',
      memberKYC: agreement.memberKYC || '',
      memberAddress: agreement.memberAddress || '',
      agreementDate: agreement.agreementDate || '',
      agreementNumber: agreement.agreementNumber || '',
      startDate: agreement.startDate || '',
      endDate: agreement.endDate || '',
      serviceAgreementType: agreement.serviceAgreementType || '',
      totalMonthlyPayment: agreement.totalMonthlyPayment || '',
      authorizorName: agreement.authorizorName || '',
      designation: agreement.designation || '',
      preparedByNew: agreement.preparedByNew || '',
      title: agreement.title || '',
      agreementLength: agreement.agreementLength || '',
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedAgreement(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedAgreement) return;

    const agreementRef = doc(db, 'agreements', selectedAgreement.id);
    await updateDoc(agreementRef, formData);

    // Update the local state as well
    setAgreements((prev) =>
      prev.map((agreement) =>
        agreement.id === selectedAgreement.id
          ? { ...agreement, ...formData }
          : agreement
      )
    );

    handleCloseModal();
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const day = String(date.getUTCDate()).padStart(2, '0');
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const year = date.getUTCFullYear();
    return `${day}/${month}/${year}`;
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

  const handleGenerateAgreement = async () => {
    const url = '/tb_agreement.pdf';
    const existingPdfBytes = await fetch(url).then(res => res.arrayBuffer());

    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const pages = pdfDoc.getPages();
    const firstPage = pages[0];
    const secondPage = pages[1];

    // Prepared By - Page 1
    firstPage.drawText(formData.preparedByNew, {
      x: 60,
      y: 52,
      font: helveticaFont,
      size: 15,
      color: rgb(0.466, 0.466, 0.466),
    });

    // Top Agreement Number - All pages from 2 onwards
    for (let i = 1; i < pages.length; i++) {
      pages[i].drawText(formData.agreementNumber, {
        x: 480,
        y: 729,
        font: helveticaFont,
        size: 8.5,
        color: rgb(0.466, 0.466, 0.466),
      });
      // Client signatory - Page 2 onwards
      pages[i].drawText(`(${formData.memberLegalName})`, {
        x: 89,
        y: 105,
        font: helveticaFont,
        size: 11,
        color: rgb(0, 0, 0),
      });
    }

    // Page 2 Details
    if (secondPage) {
      // Agreement Details
      secondPage.drawText(formData.serviceAgreementType, { x: 185, y: 394, font: helveticaFont, size: 9.5, color: rgb(0, 0, 0) });
      secondPage.drawText(`${formData.totalMonthlyPayment} /-`, { x: 275, y: 380, font: helveticaFont, size: 9.5, color: rgb(0, 0, 0) });
      secondPage.drawText(formatDate(formData.endDate), { x: 350, y: 408, font: helveticaFont, size: 9.5, color: rgb(0, 0, 0) });
      secondPage.drawText(formatDate(formData.startDate), { x: 175, y: 408, font: helveticaFont, size: 9.5, color: rgb(0, 0, 0) });
      secondPage.drawText(formData.agreementNumber, { x: 160, y: 437, font: helveticaFont, size: 9.5, color: rgb(0, 0, 0) });
      secondPage.drawText(formatDate(formData.agreementDate), { x: 145, y: 451, font: helveticaFont, size: 9.5, color: rgb(0, 0, 0) });

      // Member Details
      secondPage.drawText(formData.memberLegalName, { x: 170, y: 608, font: helveticaFont, size: 9.5, color: rgb(0, 0, 0) });
      secondPage.drawText(formData.memberCIN, { x: 130, y: 594, font: helveticaFont, size: 9.5, color: rgb(0, 0, 0) });
      secondPage.drawText(formData.memberGST, { x: 174, y: 579, font: helveticaFont, size: 9.5, color: rgb(0, 0, 0) });
      secondPage.drawText(formData.memberPAN, { x: 133, y: 565, font: helveticaFont, size: 9.5, color: rgb(0, 0, 0) });
      secondPage.drawText(formData.memberKYC, { x: 133, y: 551, font: helveticaFont, size: 9.5, color: rgb(0, 0, 0) });

      // Address (with line wrapping)
      const address = formData.memberAddress.replace(/\n/g, ' ');
      const addressLines = splitTextIntoLines(address, helveticaFont, 9.5, 300);
      let y = 536.5;
      for (const line of addressLines) {
        secondPage.drawText(line, { x: 150, y, font: helveticaFont, size: 9.5, color: rgb(0, 0, 0) });
        y -= 12; // Adjust for next line
      }

      // New fields
      secondPage.drawText(formData.memberLegalName, { x: 150, y: 280, font: helveticaFont, size: 9.5, color: rgb(0, 0, 0) });
      secondPage.drawText(formData.title, { x: 150, y: 266, font: helveticaFont, size: 9.5, color: rgb(0, 0, 0) });
      // secondPage.drawText(formatDate(formData.agreementDate), { x: 150, y: 252, font: helveticaFont, size: 9.5, color: rgb(0, 0, 0) });

      secondPage.drawText(formData.authorizorName, { x: 370, y: 280, font: helveticaFont, size: 9.5, color: rgb(0, 0, 0) });
      secondPage.drawText(formData.designation, { x: 370, y: 266, font: helveticaFont, size: 9.5, color: rgb(0, 0, 0) });
      const currentDate = new Date();
      secondPage.drawText(formatDate(currentDate), { x: 415, y: 252, font: helveticaFont, size: 9.5, color: rgb(0, 0, 0) });
      secondPage.drawText(formatDate(currentDate), { x: 150, y: 252, font: helveticaFont, size: 9.5, color: rgb(0, 0, 0) });
    }

    const pdfBytes = await pdfDoc.save();

    saveAs(new Blob([pdfBytes], { type: 'application/pdf' }), 'agreement.pdf');
  };

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerText}>
            <h1 className={styles.title}>Agreements</h1>
            <p className={styles.subtitle}>Manage your client agreements and onboarding details.</p>
          </div>
        </div>

        {/* Table */}
        <div className={styles.tableCard}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Package</th>
                <th>DOB</th>
                <th>Email</th>
                <th>Phone</th>
              </tr>
            </thead>
            <tbody>
              {agreements.map((agreement) => (
                <tr 
                  key={agreement.id} 
                  onClick={() => handleRowClick(agreement)}
                  className={styles.clickableRow}
                >
                  <td>
                    <span className={styles.nameText}>{agreement.name}</span>
                  </td>
                  <td>
                    {agreement.purposeOfVisit}
                  </td>
                  <td>{agreement.birthday}</td>
                  <td>{agreement.email}</td>
                  <td>{agreement.phone}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Agreement Details Modal */}
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
              Agreement Details
            </h2>
            <p style={{ 
              margin: '4px 0 0 0', 
              color: '#64748b', 
              fontSize: '14px',
              fontWeight: 400
            }}>
              {selectedAgreement?.name}
            </p>
          </div>
          <IconButton onClick={handleCloseModal} size="small">
            <Close />
          </IconButton>
        </DialogTitle>
        
        <DialogContent style={{ padding: '24px' }}>
          <form onSubmit={handleSubmit}>
            {/* Member Details Section */}
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Member Details</h3>
              <div className={styles.formGrid}>
                <TextField
                  label="Member Legal Name"
                  name="memberLegalName"
                  value={formData.memberLegalName}
                  onChange={handleInputChange}
                  fullWidth
                  variant="outlined"
                  size="small"
                />
                <TextField
                  label="Title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  fullWidth
                  variant="outlined"
                  size="small"
                />
                <TextField
                  label="Member CIN"
                  name="memberCIN"
                  value={formData.memberCIN}
                  onChange={handleInputChange}
                  fullWidth
                  variant="outlined"
                  size="small"
                />
                <TextField
                  label="Member GST Number"
                  name="memberGST"
                  value={formData.memberGST}
                  onChange={handleInputChange}
                  fullWidth
                  variant="outlined"
                  size="small"
                />
                <TextField
                  label="Member PAN"
                  name="memberPAN"
                  value={formData.memberPAN}
                  onChange={handleInputChange}
                  fullWidth
                  variant="outlined"
                  size="small"
                />
                <TextField
                  label="Member KYC"
                  name="memberKYC"
                  value={formData.memberKYC}
                  onChange={handleInputChange}
                  fullWidth
                  variant="outlined"
                  size="small"
                />
                <TextField
                  label="Member Address"
                  name="memberAddress"
                  value={formData.memberAddress}
                  onChange={handleInputChange}
                  fullWidth
                  variant="outlined"
                  size="small"
                  multiline
                  rows={2}
                  style={{ gridColumn: '1 / -1' }}
                />
              </div>
            </div>

            {/* Agreement Details Section */}
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Agreement Information</h3>
              <div className={styles.formGrid}>
                <TextField
                  label="Agreement Date"
                  name="agreementDate"
                  type="date"
                  value={formData.agreementDate}
                  onChange={handleInputChange}
                  fullWidth
                  variant="outlined"
                  size="small"
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  label="Agreement Number"
                  name="agreementNumber"
                  value={formData.agreementNumber}
                  onChange={handleInputChange}
                  fullWidth
                  variant="outlined"
                  size="small"
                />
                <TextField
                  label="Start Date"
                  name="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={handleInputChange}
                  fullWidth
                  variant="outlined"
                  size="small"
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  label="Length of Agreement"
                  name="agreementLength"
                  value={formData.agreementLength}
                  onChange={handleInputChange}
                  fullWidth
                  variant="outlined"
                  size="small"
                  select
                >
                  {[...Array(11).keys()].map((i) => (
                    <MenuItem key={i + 1} value={i + 1}>
                      {i + 1} month(s)
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  label="End Date"
                  name="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={handleInputChange}
                  fullWidth
                  variant="outlined"
                  size="small"
                  InputLabelProps={{ shrink: true }}
                  disabled
                />
                <TextField
                  label="Service Agreement Type"
                  name="serviceAgreementType"
                  value={formData.serviceAgreementType}
                  onChange={handleInputChange}
                  fullWidth
                  variant="outlined"
                  size="small"
                />
                <TextField
                  label="Total Monthly Payment"
                  name="totalMonthlyPayment"
                  value={formData.totalMonthlyPayment}
                  onChange={handleInputChange}
                  fullWidth
                  variant="outlined"
                  size="small"
                  type="number"
                />

              </div>
            </div>

            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Authorization Details</h3>
              <div className={styles.formGrid}>
                <TextField
                  label="Prepared By"
                  name="preparedByNew"
                  value={formData.preparedByNew}
                  onChange={handleInputChange}
                  fullWidth
                  variant="outlined"
                  size="small"
                />
                <TextField
                  label="Authorizor Name"
                  name="authorizorName"
                  value={formData.authorizorName}
                  onChange={handleInputChange}
                  fullWidth
                  variant="outlined"
                  size="small"
                />
                <TextField
                  label="Designation"
                  name="designation"
                  value={formData.designation}
                  onChange={handleInputChange}
                  fullWidth
                  variant="outlined"
                  size="small"
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
                onClick={handleGenerateAgreement} 
                variant="contained"
                style={{
                  backgroundColor: '#1a4d5c',
                  color: 'white',
                  textTransform: 'none',
                  padding: '8px 24px'
                }}
              >
                Generate Agreement
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
                Save Agreement
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}