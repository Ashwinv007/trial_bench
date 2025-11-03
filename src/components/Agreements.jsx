import { useState, useEffect, useContext } from 'react';
import { Dialog, DialogTitle, DialogContent, TextField, Button, IconButton } from '@mui/material';
import { Close } from '@mui/icons-material';
import styles from './Agreements.module.css';
import { FirebaseContext } from '../store/Context';
import { collection, getDocs } from 'firebase/firestore';

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
    preparedBy: '',
  });

  useEffect(() => {
    if (db) {
      const fetchAgreements = async () => {
        const agreementsCollection = collection(db, 'agreements');
        const agreementsSnapshot = await getDocs(agreementsCollection);
        const agreementsData = agreementsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setAgreements(agreementsData);
      };
      fetchAgreements();
    }
  }, [db]);

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
      preparedBy: agreement.preparedBy || '',
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

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Update the agreement data
    setAgreements((prev) =>
      prev.map((agreement) =>
        agreement.id === selectedAgreement.id
          ? { ...agreement, ...formData }
          : agreement
      )
    );

    handleCloseModal();
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
                    {agreement.package}
                  </td>
                  <td>{agreement.dob}</td>
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
                  label="End Date"
                  name="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={handleInputChange}
                  fullWidth
                  variant="outlined"
                  size="small"
                  InputLabelProps={{ shrink: true }}
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
                <TextField
                  label="Prepared By"
                  name="preparedBy"
                  value={formData.preparedBy}
                  onChange={handleInputChange}
                  fullWidth
                  variant="outlined"
                  size="small"
                  style={{ gridColumn: '1 / -1' }}
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
                Save Agreement
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
