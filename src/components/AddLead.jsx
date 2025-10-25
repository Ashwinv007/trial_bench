import { useState, useContext } from 'react';
import { FirebaseContext } from '../store/Context';
import { collection, addDoc } from 'firebase/firestore';
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
import styles from './AddLead.module.css';

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
    birthday: '',
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

  const { db } = useContext(FirebaseContext);
  const navigate = useNavigate();

  const handleSaveLead = async () => {
    try {
      const newLead = { ...formData, activities: activities };
      const leadsCollection = collection(db, 'leads');
      await addDoc(leadsCollection, newLead);
      navigate('/leads');
    } catch (error) {
      console.error("Error adding document: ", error);
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

  const handleSendWelcomeEmail = () => {
    const newActivity = {
      id: activities.length + 1,
      type: 'email',
      title: 'Welcome Email Sent',
      description: `Welcome email sent to ${formData.convertedEmail || formData.email}`,
      timestamp: new Date().toLocaleString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true 
      })
    };
    setActivities([newActivity, ...activities]);
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

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Birthday</label>
                    <input
                      type="date"
                      name="birthday"
                      value={formData.birthday}
                      onChange={handleInputChange}
                      className={styles.input}
                    />
                  </div>



                  <button className={styles.welcomeButton} onClick={handleSendWelcomeEmail}>
                    <EmailIcon className={styles.buttonIcon} />
                    Send Welcome Email
                  </button>
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
