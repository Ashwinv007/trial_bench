import { useState, useContext } from 'react';
import { FirebaseContext } from '../store/Context';
import { collection, addDoc, doc, deleteDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
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
import styles from './AddLead.module.css';

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

export default function AddLead() {
  const [formData, setFormData] = useState({
    name: '',
    status: '',
    purposeOfVisit: '',
    phone: '+91',
    whatsapp: '+91',
    email: '',
    sourceType: '',
    sourceDetail: '',
    clientType: '',
    companyName: '',
    convertedEmail: '',
    convertedWhatsapp: '',
    birthdayDay: '', // Replaced birthday with separate day and month
    birthdayMonth: '', // Replaced birthday with separate day and month
    package: ''
  });

  const [showConvertedModal, setShowConvertedModal] = useState(false);
  const [note, setNote] = useState('');
  const [followUpDays, setFollowUpDays] = useState('');
  const [activities, setActivities] = useState([
    {
      id: 1,
      type: 'created',
      title: 'Lead Created',
      description: 'New lead added to the system',
      timestamp: new Date().toLocaleString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true 
      })
    }
  ]);

  const [errors, setErrors] = useState({});



  const { db } = useContext(FirebaseContext);
  const navigate = useNavigate();

  const handleSaveLead = async () => {
    try {
      if (formData.status === 'Converted') {
        // 1. Create the lead document first to get its ID
        const leadsCollection = collection(db, 'leads');
        const newLeadData = { ...formData, activities: activities }; // Keep activities for the lead itself
        const leadDocRef = await addDoc(leadsCollection, newLeadData);
        const leadId = leadDocRef.id; // Get the ID of the newly created lead

        // 2. Create a new member
        const memberData = {
          ...formData,
          email: formData.convertedEmail || formData.email,
          whatsapp: formData.convertedWhatsapp || formData.whatsapp,
          package: formData.purposeOfVisit,
          birthday: formatBirthday(formData.birthdayDay, formData.birthdayMonth), // Use helper function
          company: formData.companyName,
          primary: true, // Set primary to true for new members
        };
        const membersCollection = collection(db, 'members');
        const memberDocRef = await addDoc(membersCollection, memberData);
        const memberId = memberDocRef.id;

        // 3. Create a new agreement
        const agreementData = {
          memberId: memberId,
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
          preparedBy: '', // Changed from preparedByNew
        };
        const agreementsCollection = collection(db, 'agreements');
        await addDoc(agreementsCollection, agreementData);

        // 4. Delete the lead document
        const leadRefToDelete = doc(db, "leads", leadId);
        await deleteDoc(leadRefToDelete);

        // 5. Navigate to agreements page
        navigate('/agreements');

      } else {
        // Just create the lead
        const newLead = { ...formData, activities: activities };
        const leadsCollection = collection(db, 'leads');
        await addDoc(leadsCollection, newLead);
        navigate('/leads');
      }
    } catch (error) {
      console.error("Error processing lead: ", error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const newState = {...prev, [name]: value};
      
      // Auto-copy phone to whatsapp
      if (name === 'phone') {
        newState.whatsapp = value;
      }

      // When sourceType changes, reset sourceDetail if not applicable
      if (name === 'sourceType' && value !== 'Referral' && value !== 'Social Media') {
        newState.sourceDetail = '';
      }

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

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.package) newErrors.package = 'Package is required';
    if (!formData.whatsapp.trim()) newErrors.whatsapp = 'WhatsApp number is required';
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    // Birthday validation: if day or month is provided, both are required and day must be valid
    if (formData.birthdayDay || formData.birthdayMonth) {
      if (!formData.birthdayDay) newErrors.birthdayDay = 'Day is required if month is selected';
      if (!formData.birthdayMonth) newErrors.birthdayMonth = 'Month is required if day is selected';
      if (formData.birthdayDay && (parseInt(formData.birthdayDay, 10) < 1 || parseInt(formData.birthdayDay, 10) > 31)) {
        newErrors.birthdayDay = 'Day must be between 1 and 31';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        {/* Header */}
        <div className={styles.header}>

          <div className={styles.headerText}>
            <h1 className={styles.title}>Add New Lead</h1>
            <p className={styles.subtitle}>Capture and manage new lead information</p>
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
                  className={styles.input}
                />
              </div>

              {/* Status */}
              <div className={styles.formGroup}>
                <label className={styles.label}>Status *</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className={styles.select}
                >
                  <option value="">Select status</option>
                  <option value="New">New</option>
                  <option value="Follow Up">Follow Up</option>
                  <option value="Converted">Converted</option>
                  <option value="Not Interested">Not Interested</option>
                </select>
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
                      className={styles.select}
                    >
                      <option value="">Select client type</option>
                      <option value="Individual">Individual</option>
                      <option value="Company">Company</option>
                    </select>
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
                        className={styles.input}
                      />
                    </div>
                  )}

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Email</label>
                    <input
                      type="email"
                      name="convertedEmail"
                      value={formData.convertedEmail || formData.email}
                      onChange={handleInputChange}
                      placeholder="Enter email address"
                      className={styles.input}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>WhatsApp</label>
                    <input
                      type="text"
                      name="convertedWhatsapp"
                      value={formData.convertedWhatsapp || formData.whatsapp}
                      onChange={handleInputChange}
                      placeholder="Enter WhatsApp number"
                      className={styles.input}
                    />
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

              {/* Purpose of Visit */}
              <div className={styles.formGroup}>
                <label className={styles.label}>Purpose of Visit *</label>
                <select
                  name="purposeOfVisit"
                  value={formData.purposeOfVisit}
                  onChange={handleInputChange}
                  className={styles.select}
                >
                  <option value="">Select purpose</option>
                  <option value="Dedicated Desk">Dedicated Desk</option>
                  <option value="Flexible Desk">Flexible Desk</option>
                  <option value="Private Cabin">Private Cabin</option>
                  <option value="Virtual Office">Virtual Office</option>
                  <option value="Meeting Room">Meeting Room</option>
                  <option value="Others">Others</option>
                </select>
              </div>

              {/* Phone and WhatsApp */}
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Phone *</label>
                  <input
                    type="text"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="Enter phone number"
                    className={styles.input}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>WhatsApp</label>
                  <input
                    type="text"
                    name="whatsapp"
                    value={formData.whatsapp}
                    onChange={handleInputChange}
                    placeholder="Enter WhatsApp number"
                    className={styles.input}
                  />
                </div>
              </div>

              {/* Email */}
              <div className={styles.formGroup}>
                <label className={styles.label}>Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="Enter email address"
                  className={styles.input}
                />
              </div>

              {/* Source */}
              <div className={styles.formGroup}>
                <label className={styles.label}>Source *</label>
                <select
                  name="sourceType"
                  value={formData.sourceType}
                  onChange={handleInputChange}
                  className={styles.select}
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
              </div>

              {/* Referral Name */}
              {formData.sourceType === 'Referral' && (
                <div className={styles.formGroup}>
                  <label className={styles.label}>Referral Person Name</label>
                  <input
                    type="text"
                    name="sourceDetail"
                    value={formData.sourceDetail}
                    onChange={handleInputChange}
                    placeholder="Enter referral person name"
                    className={styles.input}
                  />
                </div>
              )}

              {/* Social Media Platform */}
              {formData.sourceType === 'Social Media' && (
                <div className={styles.formGroup}>
                  <label className={styles.label}>Social Media Platform</label>
                  <input
                    type="text"
                    name="sourceDetail"
                    value={formData.sourceDetail}
                    onChange={handleInputChange}
                    placeholder="e.g., Instagram, LinkedIn, Facebook"
                    className={styles.input}
                  />
                </div>
              )}

              {/* Save Button */}
              <button className={styles.saveButton} onClick={handleSaveLead}>
                <Save className={styles.buttonIcon} />
                Save Lead
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
                      {index < activities.length - 1 && <div className={styles.timelineLine} />}
                    </div>
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