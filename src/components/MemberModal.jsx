import React, { useState, useEffect, useContext } from 'react';
import { FirebaseContext, AuthContext } from '../store/Context';
import { doc, getDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { toast } from 'sonner';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  TextField,
  Button,
  MenuItem,
  Select,
  Typography,
  IconButton,
  FormControl,
  InputLabel,
  FormHelperText
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { 
  CheckCircle, 
  Email as EmailIcon,
  AccountBox
} from '@mui/icons-material';
import styles from './AddLead.module.css';
import ClientProfileModal from './ClientProfileModal';

// Helper function to format birthday
const formatBirthday = (day, month) => {
  if (!day || !month) return '';
  const monthNamesFull = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNum = parseInt(day, 10);
  const monthNum = parseInt(month, 10);
  if (isNaN(dayNum) || isNaN(monthNum) || dayNum < 1 || dayNum > 31 || monthNum < 1 || monthNum > 12) return '';
  let suffix = 'th';
  if (dayNum === 1 || dayNum === 21 || dayNum === 31) suffix = 'st';
  else if (dayNum === 2 || dayNum === 22) suffix = 'nd';
  else if (dayNum === 3 || dayNum === 23) suffix = 'rd';
  return `${dayNum}${suffix} ${monthNamesFull[monthNum - 1]}`;
};

export default function MemberModal({ open, onClose, onSave, editMember = null, primaryMemberId = null }) {
  const { db } = useContext(FirebaseContext);
  const { user } = useContext(AuthContext);
  const [formData, setFormData] = useState({
    name: '',
    package: '',
    company: '',
    birthdayDay: '',
    birthdayMonth: '',
    whatsapp: '',
    email: '',
    ccEmail: '',
  });

  const [errors, setErrors] = useState({});
  const [note, setNote] = useState('');
  const [activities, setActivities] = useState([]);
  
  // State to manage swapping to the profile view
  const [isViewingProfile, setIsViewingProfile] = useState(false);
  const [profileMemberId, setProfileMemberId] = useState(null);

  const functions = getFunctions();
  const sendWelcomeEmailCallable = httpsCallable(functions, 'sendWelcomeEmail');

  useEffect(() => {
    // When the modal is opened/re-opened, reset everything
    if (open) {
      const fetchPrimaryMemberCompany = async () => {
        if (!editMember && primaryMemberId && db) {
          const primaryMemberDocRef = doc(db, "members", primaryMemberId);
          const primaryMemberDocSnap = await getDoc(primaryMemberDocRef);
          if (primaryMemberDocSnap.exists()) {
            const primaryMemberData = primaryMemberDocSnap.data();
            setFormData(prev => ({
              ...prev,
              company: primaryMemberData.company !== 'NA' ? primaryMemberData.company : ''
            }));
          }
        }
      };

      if (editMember) {
        setFormData({
          name: editMember.name || '',
          package: editMember.package || '',
          company: editMember.company !== 'NA' ? editMember.company : '',
          birthdayDay: editMember.birthdayDay || '',
          birthdayMonth: editMember.birthdayMonth || '',
          whatsapp: editMember.whatsapp || '',
          email: editMember.email || '',
          ccEmail: editMember.ccEmail || '',
        });
        setActivities(editMember.activities || []);
      } else {
        setFormData({
          name: '', package: '', company: '', birthdayDay: '', birthdayMonth: '', whatsapp: '', email: '', ccEmail: '',
        });
        setActivities([]);
        fetchPrimaryMemberCompany();
      }
      setErrors({});
      setNote('');
      setIsViewingProfile(false);
      setProfileMemberId(null);
    }
  }, [editMember, open, primaryMemberId, db]);

  const handleChange = (field, value) => {
    setFormData((prev) => {
      const newState = { ...prev };
      if (field === 'birthdayDay') {
        const dayValue = value;
        if (dayValue === '') {
          newState.birthdayDay = dayValue;
        } else {
          const day = parseInt(dayValue, 10);
          if (!isNaN(day) && day >= 1 && day <= 31) {
            newState.birthdayDay = dayValue;
          }
        }
      } else {
        newState[field] = value;
      }
      return newState;
    });
    const currentErrors = validateForm();
    setErrors(currentErrors);
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
    if (formData.ccEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.ccEmail)) {
      newErrors.ccEmail = 'Invalid CC email format';
    }
    if (!formData.birthdayDay) newErrors.birthdayDay = 'Day is required';
    if (!formData.birthdayMonth) newErrors.birthdayMonth = 'Month is required';
    if (formData.birthdayDay && (parseInt(formData.birthdayDay, 10) < 1 || parseInt(formData.birthdayDay, 10) > 31)) {
      newErrors.birthdayDay = 'Day must be between 1 and 31';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddNote = () => {
    if (!note.trim()) return;
    const newActivity = {
      id: activities.length + 1, type: 'note', title: 'Note Added', description: note, user: user ? user.displayName : 'Unknown User',
      timestamp: new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }),
    };
    setActivities([newActivity, ...activities]);
    setNote('');
  };

  const handleSendWelcomeEmail = async () => {
    if (!formData.email.trim()) {
      toast.error('Member email is required to send a welcome email.');
      return;
    }
    const emailSent = activities.some(activity => activity.type === 'email' && activity.title === 'Welcome Email Sent');
    if (emailSent) {
      toast.info('Welcome email has already been sent to this member.');
      return;
    }
    try {
      const result = await sendWelcomeEmailCallable({
        toEmail: formData.email, username: formData.name, ccEmail: formData.ccEmail.trim() ? formData.ccEmail.trim() : null,
      });
      toast.success(result.data.message);
      const newActivity = {
        id: activities.length + 1, type: 'email', title: 'Welcome Email Sent', description: `Welcome email sent to ${formData.email}`, user: user ? user.displayName : 'Unknown User',
        timestamp: new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })
      };
      setActivities([newActivity, ...activities]);
    } catch (error) {
      console.error("Error sending welcome email:", error);
      toast.error(error.message || "Failed to send welcome email.");
    }
  };

  const handleSubmit = () => {
    if (validateForm()) {
      const newActivities = [...activities];
      if (editMember) {
        const changes = [];
        Object.keys(formData).forEach(key => {
          if (formData[key] !== editMember[key]) {
            changes.push({ field: key, oldValue: editMember[key], newValue: formData[key] });
          }
        });
        changes.forEach(change => {
          newActivities.unshift({
            id: newActivities.length + 1, type: 'update', title: `Field "${change.field}" updated`, description: `Value changed from "${change.oldValue}" to "${change.newValue}"`, user: user ? user.displayName : 'Unknown User',
            timestamp: new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })
          });
        });
      } else {
        newActivities.unshift({
          id: newActivities.length + 1, type: 'created', title: 'Member Created', description: 'New member added to the system', user: user ? user.displayName : 'Unknown User',
          timestamp: new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })
        });
      }
      const memberData = {
        ...formData, company: formData.company.trim() ? formData.company.trim() : 'NA', birthday: formatBirthday(formData.birthdayDay, formData.birthdayMonth),
        activities: newActivities, primaryMemberId: primaryMemberId, ccEmail: formData.ccEmail.trim() ? formData.ccEmail.trim() : '',
      };
      onSave(memberData);
      onClose();
    }
  };

  const handleViewProfile = (memberId) => {
    setProfileMemberId(memberId);
    setIsViewingProfile(true);
  };

  const handleProfileClose = () => {
    setIsViewingProfile(false);
    setProfileMemberId(null);
    onClose(); // Close the main modal wrapper
  };

  // If viewing profile, render the ClientProfileModal instead.
  // The MemberModal component stays mounted, so its state is preserved.
  if (isViewingProfile) {
    return (
      <ClientProfileModal
        open={true}
        onClose={handleProfileClose}
        clientId={profileMemberId}
      />
    );
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{ sx: { borderRadius: '12px' } }}
    >
      <DialogTitle sx={{ p: '24px 24px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
            <Typography sx={{ fontSize: '18px', fontWeight: 600, color: '#1a4d5c' }}>
              {editMember ? 'Edit Member' : 'Add New Member'}
            </Typography>
        </Box>
        <IconButton onClick={onClose} sx={{ color: '#757575', p: 0.5 }}>
          <CloseIcon sx={{ fontSize: '20px' }} />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: '16px 24px' }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
          {/* Left Panel - Member Form */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <TextField label="Name" fullWidth value={formData.name} onChange={(e) => handleChange('name', e.target.value)} error={!!errors.name} helperText={errors.name} />
            <Select fullWidth value={formData.package} onChange={(e) => handleChange('package', e.target.value)} displayEmpty error={!!errors.package}>
                <MenuItem value="" disabled>Select package</MenuItem>
                <MenuItem value="Dedicated Desk">Dedicated Desk</MenuItem>
                <MenuItem value="Flexible Desk">Flexible Desk</MenuItem>
                <MenuItem value="Cabin">Cabin</MenuItem>
                <MenuItem value="Virtual Office">Virtual Office</MenuItem>
                <MenuItem value="Meeting Room">Meeting Room</MenuItem>
            </Select>
            <TextField label="Company Name (optional)" fullWidth value={formData.company} onChange={(e) => handleChange('company', e.target.value)} />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Birthday Day"
                fullWidth
                type="number"
                value={formData.birthdayDay}
                onChange={(e) => handleChange('birthdayDay', e.target.value)}
                inputProps={{ min: 1, max: 31 }}
                error={!!errors.birthdayDay}
                helperText={errors.birthdayDay}
              />
              <FormControl fullWidth variant="outlined" error={!!errors.birthdayMonth}>
                <InputLabel id="birthday-month-label">Birthday Month</InputLabel>
              <Select
                labelId="birthday-month-label"
                value={formData.birthdayMonth}
                onChange={(e) => handleChange('birthdayMonth', e.target.value)}
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
            <TextField label="WhatsApp" fullWidth value={formData.whatsapp} onChange={(e) => handleChange('whatsapp', e.target.value)} error={!!errors.whatsapp} helperText={errors.whatsapp} />
            <TextField label="Email" fullWidth value={formData.email} onChange={(e) => handleChange('email', e.target.value)} error={!!errors.email} helperText={errors.email} />
            {primaryMemberId === null && (
              <TextField label="CC Email (optional)" fullWidth value={formData.ccEmail} onChange={(e) => handleChange('ccEmail', e.target.value)} error={!!errors.ccEmail} helperText={errors.ccEmail} />
            )}
          </Box>

          {/* Right Panel - Timeline Activity Log */}
          <div className={styles.rightPanel} style={{paddingLeft: '10px'}}>
            <div className={styles.timelineCard}>
              <h2 className={styles.sectionTitle}>Timeline Activity Log</h2>
              {primaryMemberId === null && (
                <button className={styles.welcomeButton} onClick={handleSendWelcomeEmail} style={{marginBottom: '15px'}}>
                    <EmailIcon className={styles.buttonIcon} />
                    Send Welcome Email
                </button>
              )}
              <div className={styles.addNoteSection}>
                <h3 className={styles.addNoteTitle}>Add Note</h3>
                <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Enter activity note..." className={styles.textarea} rows="3" />

                <button className={styles.addToTimelineButton} onClick={handleAddNote}>
                  <CheckCircle className={styles.buttonIcon} />
                  Add to Timeline
                </button>
              </div>
              <div className={styles.timeline}>
                {activities.map((activity, index) => (
                  <div key={activity.id || index} className={styles.timelineItem}>
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
                      {activity.user && <p className={styles.activityUser}>by {activity.user}</p>}
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
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: '16px 24px 24px', gap: 1.5 }}>
        {editMember && editMember.primary && (
          <Button
            onClick={() => handleViewProfile(editMember.id)}
            variant="outlined"
          >
            View Profile
          </Button>
        )}
        <Button onClick={onClose} variant="outlined">Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" sx={{ bgcolor: '#2b7a8e' }}>
          {editMember ? 'Update Member' : 'Add Member'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
