import { useState, useContext, useEffect } from 'react';
import { FirebaseContext } from '../store/Context';
import { doc, getDoc, updateDoc, collection, addDoc, deleteDoc } from 'firebase/firestore';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  CheckCircle, 
  ArrowBack, 
  Save, 
  Email as EmailIcon,
  WhatsApp,
  Cake,
  AccountBox
} from '@mui/icons-material';
import { // Added Material-UI components
  Box,
  TextField,
  MenuItem,
  Select,
  Typography,
  IconButton,
  FormControl, 
  InputLabel,  
  FormHelperText 
} from '@mui/material';
import styles from './AddLead.module.css'; // Reusing styles

// Helper function to format birthday
const formatBirthday = (day, month) => {
  if (!day || !month) return '';

  const monthNamesFull = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNum = parseInt(day, 10);
  const monthNum = parseInt(month, 10);

  if (isNaN(dayNum) || isNaN(monthNum) || dayNum < 1 || dayNum > 31 || monthNum < 1 || monthNum > 12) {
    return '';
  }

  let suffix = 'th';
  if (dayNum === 1 || dayNum === 21 || dayNum === 31) {
    suffix = 'st';
  } else if (dayNum === 2 || dayNum === 22) {
    suffix = 'nd';
  } else if (dayNum === 3 || dayNum === 23) {
    suffix = 'rd';
  }

  return `${dayNum}${suffix} ${monthNamesFull[monthNum - 1]}`;
};

export default function EditLead() {
  const [formData, setFormData] = useState(null);
  const [originalLead, setOriginalLead] = useState(null);
  const [showConvertedModal, setShowConvertedModal] = useState(false);
  const [note, setNote] = useState('');
  const [followUpDays, setFollowUpDays] = useState('');
  const [activities, setActivities] = useState([]);
  const [errors, setErrors] = useState({}); // Added errors state



  const { db } = useContext(FirebaseContext);
  const navigate = useNavigate();
  const { id } = useParams();

  useEffect(() => {
    const fetchLead = async () => {
      const docRef = doc(db, "leads", id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const leadData = docSnap.data();
        setFormData({
          name: leadData.name || '',
          status: leadData.status || '',
          purposeOfVisit: leadData.purposeOfVisit || '',
          phone: leadData.phone || '+91',
          sourceType: leadData.sourceType || '',
          sourceDetail: leadData.sourceDetail || '',
          clientType: leadData.clientType || '',
          companyName: leadData.companyName !== 'NA' ? leadData.companyName : '',
          convertedEmail: leadData.convertedEmail || '',
          convertedWhatsapp: leadData.convertedWhatsapp || '',
          birthdayDay: leadData.birthdayDay || '', // Populate day directly
          birthdayMonth: leadData.birthdayMonth || '', // Populate month directly
        });
        setOriginalLead(leadData);
        if (leadData.activities) {
          setActivities(leadData.activities);
        }
        if (leadData.status === 'Converted') {
            setShowConvertedModal(true);
        }
      } else {
        console.log("No such document!");
      }
    };

    if (db && id) {
      fetchLead();
    }
  }, [db, id]);

  const handleUpdateLead = async () => {
    const newErrors = validateForm(formData); // Get errors
    setErrors(newErrors); // Set errors state
    if (Object.keys(newErrors).length > 0) {
      return; // Stop if form is invalid
    }
    if (!originalLead) return; // Add this check
    try {
      const leadRef = doc(db, "leads", id);

      if (formData.status === 'Converted' && originalLead.status !== 'Converted') {
        // This is a new conversion

        // 1. Create a new member
        const memberData = {
          ...formData,
          email: formData.convertedEmail,
          whatsapp: formData.convertedWhatsapp,
          package: formData.purposeOfVisit,
          birthday: formatBirthday(formData.birthdayDay, formData.birthdayMonth), // Use helper function
          company: formData.companyName,
          primary: true,
        };
        const membersCollection = collection(db, 'members');
        const memberDocRef = await addDoc(membersCollection, memberData);
        const memberId = memberDocRef.id;

        // 2. Create a new agreement
        const agreementData = {
          memberId: memberId,
          // Add any other agreement-specific fields here, initially empty
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
        };

        const agreementsCollection = collection(db, 'agreements');
        await addDoc(agreementsCollection, agreementData);

        // 3. Delete the lead
        await deleteDoc(leadRef);

        navigate('/agreements');

      } else {
        // Just update the lead
        await updateDoc(leadRef, {
          ...formData,
          activities: activities
        });
        navigate('/leads');
      }
    } catch (error) {
      console.error("Error updating document: ", error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const newState = {...prev, [name]: value};
      
      if (name === 'status' && value === 'Converted') {
        newState.convertedWhatsapp = prev.phone;
      }

      if (name === 'phone' && showConvertedModal) {
        newState.convertedWhatsapp = value;
      }

      // When sourceType changes, reset sourceDetail if not applicable
      if (name === 'sourceType' && value !== 'Referral' && value !== 'Social Media') {
        newState.sourceDetail = '';
      }

      // Validate immediately after setting the new state
      const updatedErrors = validateForm(newState);
      setErrors(updatedErrors); // Update errors state

      return newState;
    });

    // Show converted modal when status is Converted
    if (name === 'status' && value === 'Converted') {
      setShowConvertedModal(true);
    } else if (name === 'status' && value !== 'Converted') {
      setShowConvertedModal(false);
    }
  };

  const handleAddNote = () => {
    if (!note.trim()) return;

    const newActivity = {
      id: activities.length + 1,
      type: 'note',
      title: followUpDays ? `Note Added - Follow up in ${followUpDays} days` : 'Note Added',
      description: note,
      timestamp: new Date().toLocaleString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true 
      }),
      hasFollowUp: !!followUpDays,
      followUpDays: followUpDays
    };

    setActivities([newActivity, ...activities]);
    setNote('');
    setFollowUpDays('');
  };

  const validateForm = (data) => { // Accepts formData as argument
    const newErrors = {};
    if (!data.name.trim()) newErrors.name = 'Name is required';
    if (!data.purposeOfVisit) newErrors.purposeOfVisit = 'Purpose of Visit is required';
    if (data.phone.trim().length <= 3) newErrors.phone = 'Phone number is required (excluding country code)';
    if (!data.sourceType) newErrors.sourceType = 'Source is required';
    if (data.sourceType === 'Referral' && !data.sourceDetail.trim()) newErrors.sourceDetail = 'Referral Person Name is required';
    if (data.sourceType === 'Social Media' && !data.sourceDetail.trim()) newErrors.sourceDetail = 'Social Media Platform is required';
    if (!data.status) newErrors.status = 'Status is required';

    if (data.status === 'Converted') {
      if (!data.clientType) newErrors.clientType = 'Client Type is required';
      if (data.clientType === 'Company' && !data.companyName.trim()) newErrors.companyName = 'Company Name is required';
      if (!data.convertedEmail.trim()) newErrors.convertedEmail = 'Email is required';
      if (!data.convertedWhatsapp.trim()) newErrors.convertedWhatsapp = 'WhatsApp is required';
    }

    // Birthday validation: if day or month is provided, both are required and day must be valid
    if (data.birthdayDay || data.birthdayMonth) {
      if (!data.birthdayDay) newErrors.birthdayDay = 'Day is required if month is selected';
      if (!data.birthdayMonth) newErrors.birthdayMonth = 'Month is required if day is selected';
      if (data.birthdayDay && (parseInt(data.birthdayDay, 10) < 1 || parseInt(data.birthdayDay, 10) > 31)) {
        newErrors.birthdayDay = 'Day must be between 1 and 31';
      }
    }
    return newErrors; // Return the errors object
  };

  if (!formData) {
    return <div>Loading...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerText}>
            <h1 className={styles.title}>Edit Lead</h1>
            <p className={styles.subtitle}>Update lead information</p>
          </div>
        </div>

        {/* Main Content */}
        <div className={styles.mainContent}>
          {/* Left Panel - Lead Information */}
          <div className={styles.leftPanel}>
            <div className={styles.formCard}>
              <h2 className={styles.sectionTitle}>Lead Information</h2>

              {/* Name */}
              <div className={styles.formGroup}>
                <label className={styles.label}>Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Enter full name"
                  className={`${styles.input} ${errors.name ? styles.inputError : ''}`}
                  required
                />
                {errors.name && <p className={styles.errorMessage}>{errors.name}</p>}
              </div>




              {/* Purpose of Visit */}
              <div className={styles.formGroup}>
                <label className={styles.label}>Purpose of Visit *</label>
                <select
                  name="purposeOfVisit"
                  value={formData.purposeOfVisit}
                  onChange={handleInputChange}
                  className={`${styles.select} ${errors.purposeOfVisit ? styles.inputError : ''}`}
                  required
                >
                  <option value="">Select purpose</option>
                  <option value="Dedicated Desk">Dedicated Desk</option>
                  <option value="Flexible Desk">Flexible Desk</option>
                  <option value="Private Cabin">Private Cabin</option>
                  <option value="Virtual Office">Virtual Office</option>
                  <option value="Meeting Room">Meeting Room</option>
                  <option value="Others">Others</option>
                </select>
                {errors.purposeOfVisit && <p className={styles.errorMessage}>{errors.purposeOfVisit}</p>}
              </div>

              <div className={styles.formGroup}>
                  <label className={styles.label}>Phone *</label>
                  <input
                    type="text"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="Enter phone number"
                    className={`${styles.input} ${errors.phone ? styles.inputError : ''}`}
                    required
                  />
                  {errors.phone && <p className={styles.errorMessage}>{errors.phone}</p>}
                </div>

              {/* Source */}
              <div className={styles.formGroup}>
                <label className={styles.label}>Source *</label>
                <select
                  name="sourceType"
                  value={formData.sourceType}
                  onChange={handleInputChange}
                  className={`${styles.select} ${errors.sourceType ? styles.inputError : ''}`}
                  required
                >
                  <option value="">Select source</option>
                  <option value="Walk-in">Walk-in</option>
                  <option value="Phone">Phone</option>
                  <option value="Referral">Referral</option>
                  <option value="Event">Event</option>
                  <option value="Website">Website</option>
                  <option value="Social Media">Social Media</option>
                  <option value="Other">Other</option>
                </select>
                {errors.sourceType && <p className={styles.errorMessage}>{errors.sourceType}</p>}
              </div>

              {/* Referral Name */}
              {formData.sourceType === 'Referral' && (
                <div className={styles.formGroup}>
                  <label className={styles.label}>Referral Person Name *</label>
                  <input
                    type="text"
                    name="sourceDetail"
                    value={formData.sourceDetail}
                    onChange={handleInputChange}
                    placeholder="Enter referral person name"
                    className={`${styles.input} ${errors.sourceDetail ? styles.inputError : ''}`}
                    required
                  />
                  {errors.sourceDetail && <p className={styles.errorMessage}>{errors.sourceDetail}</p>}
                </div>
              )}

              {/* Social Media Platform */}
              {formData.sourceType === 'Social Media' && (
                <div className={styles.formGroup}>
                  <label className={styles.label}>Social Media Platform *</label>
                  <input
                    type="text"
                    name="sourceDetail"
                    value={formData.sourceDetail}
                    onChange={handleInputChange}
                    placeholder="e.g., Instagram, LinkedIn, Facebook"
                    className={`${styles.input} ${errors.sourceDetail ? styles.inputError : ''}`}
                    required
                  />
                  {errors.sourceDetail && <p className={styles.errorMessage}>{errors.sourceDetail}</p>}
                </div>
              )}

              {/* Status */}
              <div className={styles.formGroup}>
                <label className={styles.label}>Status *</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className={`${styles.select} ${errors.status ? styles.inputError : ''}`}
                  required
                >
                  <option value="">Select status</option>
                  <option value="New">New</option>
                  <option value="Follow Up">Follow Up</option>
                  <option value="Converted">Converted</option>
                  <option value="Not Interested">Not Interested</option>
                </select>
                {errors.status && <p className={styles.errorMessage}>{errors.status}</p>}
              </div>

              {/* Converted Modal Fields */}
              {showConvertedModal && (
                <div className={styles.convertedSection}>
                  <h3 className={styles.convertedTitle}>Client Onboarding Details</h3>
                  
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Client Type *</label>
                    <select
                      name="clientType"
                      value={formData.clientType}
                      onChange={handleInputChange}
                      className={`${styles.select} ${errors.clientType ? styles.inputError : ''}`}
                      required
                    >
                      <option value="">Select client type</option>
                      <option value="Individual">Individual</option>
                      <option value="Company">Company</option>
                    </select>
                    {errors.clientType && <p className={styles.errorMessage}>{errors.clientType}</p>}
                  </div>

                  {formData.clientType === 'Company' && (
                    <div className={styles.formGroup}>
                      <label className={styles.label}>Company Name *</label>
                      <input
                        type="text"
                        name="companyName"
                        value={formData.companyName}
                        onChange={handleInputChange}
                        placeholder="Enter company name"
                        className={`${styles.input} ${errors.companyName ? styles.inputError : ''}`}
                        required
                      />
                      {errors.companyName && <p className={styles.errorMessage}>{errors.companyName}</p>}
                    </div>
                  )}

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Email *</label>
                    <input
                      type="email"
                      name="convertedEmail"
                      value={formData.convertedEmail}
                      onChange={handleInputChange}
                      placeholder="Enter email address"
                      className={`${styles.input} ${errors.convertedEmail ? styles.inputError : ''}`}
                      required
                    />
                    {errors.convertedEmail && <p className={styles.errorMessage}>{errors.convertedEmail}</p>}
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>WhatsApp *</label>
                    <input
                      type="text"
                      name="convertedWhatsapp"
                      value={formData.convertedWhatsapp}
                      onChange={handleInputChange}
                      placeholder="Enter WhatsApp number"
                      className={`${styles.input} ${errors.convertedWhatsapp ? styles.inputError : ''}`}
                      required
                    />
                    {errors.convertedWhatsapp && <p className={styles.errorMessage}>{errors.convertedWhatsapp}</p>}
                  </div>

                  {/* Birthday Input - Replaced with Day and Month Selectors */}
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Birthday</label>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                      <TextField
                        label="Day"
                        fullWidth
                        type="number"
                        value={formData.birthdayDay}
                        onChange={(e) => handleInputChange({ target: { name: 'birthdayDay', value: e.target.value } })}
                        inputProps={{ min: 1, max: 31 }}
                        error={!!errors.birthdayDay}
                        helperText={errors.birthdayDay}
                      />
                      <FormControl fullWidth variant="outlined" error={!!errors.birthdayMonth}>
                        <InputLabel id="birthday-month-label">Month</InputLabel>
                        <Select
                          labelId="birthday-month-label"
                          value={formData.birthdayMonth}
                          onChange={(e) => handleInputChange({ target: { name: 'birthdayMonth', value: e.target.value } })}
                          displayEmpty
                        >
                          <MenuItem value="" disabled>Select Month</MenuItem>
                          {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((monthName, index) => (
                            <MenuItem key={index + 1} value={String(index + 1)}>{monthName}</MenuItem>
                          ))}
                        </Select>
                        {errors.birthdayMonth && <FormHelperText>{errors.birthdayMonth}</FormHelperText>}
                      </FormControl>
                    </Box>
                  </div>
                </div>
              )}

              {/* Save Button */}
              <button className={styles.saveButton} onClick={handleUpdateLead}>
                <Save className={styles.buttonIcon} />
                Update Lead
              </button>
            </div>
          </div>

          {/* Right Panel - Timeline Activity Log */}
          <div className={styles.rightPanel}>
            <div className={styles.timelineCard}>
              <h2 className={styles.sectionTitle}>Timeline Activity Log</h2>

              {/* Add Note Section */}
              <div className={styles.addNoteSection}>
                <h3 className={styles.addNoteTitle}>Add Note</h3>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Enter activity note..."
                  className={styles.textarea}
                  rows="3"
                />

                {/* Follow-up Reminder */}
                <div className={styles.followUpSection}>
                  <input
                    type="number"
                    value={followUpDays}
                    onChange={(e) => setFollowUpDays(e.target.value)}
                    placeholder="Follow up in (days)"
                    className={styles.followUpInput}
                    min="1"
                  />
                </div>

                <button className={styles.addToTimelineButton} onClick={handleAddNote}>
                  <CheckCircle className={styles.buttonIcon} />
                  Add to Timeline
                </button>
              </div>

              {/* Activity Timeline */}
              <div className={styles.timeline}>
                {activities.map((activity, index) => (
                  <div key={activity.id} className={styles.timelineItem}>
                    <div className={styles.timelineIconWrapper}>
                      <div className={`${styles.timelineIcon} ${styles[activity.type]}`}>
                        {activity.type === 'created' && <CheckCircle />}
                        {activity.type === 'note' && <AccountBox />}
                        {activity.type === 'email' && <EmailIcon />}
                      </div>
                      {index < activities.length - 1 && <div className={styles.timelineLine} />}</div>
                    <div className={styles.timelineContent}>
                      <div className={styles.timelineHeader}>
                        <h4 className={styles.timelineTitle}>{activity.title}</h4>
                        <span className={styles.timelineTimestamp}>{activity.timestamp}</span>
                      </div>
                      <p className={styles.timelineDescription}>{activity.description}</p>
                      {activity.hasFollowUp && (
                        <div className={styles.followUpBadge}>
                          Follow up reminder set for {activity.followUpDays} days
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}