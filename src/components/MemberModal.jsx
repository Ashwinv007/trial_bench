import React, { useState, useEffect } from 'react';
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
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { 
  CheckCircle, 
  Email as EmailIcon,
  AccountBox
} from '@mui/icons-material';
import styles from './AddLead.module.css'; // Reusing styles

export default function MemberModal({ open, onClose, onSave, editMember = null, primaryMemberId = null }) {
  const [formData, setFormData] = useState({
    name: '',
    package: '',
    company: '',
    birthday: '',
    whatsapp: '',
    email: '',
  });

  const [errors, setErrors] = useState({});
  const [note, setNote] = useState('');
  const [followUpDays, setFollowUpDays] = useState('');
  const [activities, setActivities] = useState([]);

  useEffect(() => {
    if (editMember) {
      setFormData({
        name: editMember.name || '',
        package: editMember.package || '',
        company: editMember.company !== 'NA' ? editMember.company : '',
        birthday: editMember.birthday || '',
        whatsapp: editMember.whatsapp || '',
        email: editMember.email || '',
      });
      setActivities(editMember.activities || []);
    } else {
      setFormData({
        name: '',
        package: '',
        company: '',
        birthday: '',
        whatsapp: '',
        email: '',
      });
      setActivities([]);
    }
    setErrors({});
    setNote('');
    setFollowUpDays('');
  }, [editMember, open]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: '',
      }));
    }
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
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddNote = () => {
    if (!note.trim()) return;
    const newActivity = {
      id: activities.length + 1,
      type: 'note',
      title: followUpDays ? `Note Added - Follow up in ${followUpDays} days` : 'Note Added',
      description: note,
      timestamp: new Date().toLocaleString('en-US', { 
        month: 'short', day: 'numeric', year: 'numeric',
        hour: 'numeric', minute: '2-digit', hour12: true 
      }),
      hasFollowUp: !!followUpDays,
      followUpDays: followUpDays
    };
    setActivities([newActivity, ...activities]);
    setNote('');
    setFollowUpDays('');
  };

  const handleSendWelcomeEmail = () => {
    const emailSent = activities.some(activity => activity.type === 'email' && activity.title === 'Welcome Email Sent');
    if (emailSent) {
      alert('Welcome email has already been sent to this member.');
      return;
    }

    const newActivity = {
      id: activities.length + 1,
      type: 'email',
      title: 'Welcome Email Sent',
      description: `Welcome email sent to ${formData.email}`,
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

  const handleSubmit = () => {
    if (validateForm()) {
      const memberData = {
        ...formData,
        company: formData.company.trim() ? formData.company.trim() : 'NA',
        activities: activities,
        primaryMemberId: primaryMemberId,
      };
      onSave(memberData);
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg" // Changed to large
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
              <TextField label="Birthday Day" fullWidth type="number" value={formData.birthday.split('/')[0] || ''} onChange={(e) => handleChange('birthday', `${e.target.value}/${formData.birthday.split('/')[1] || ''}`)} />
              <TextField label="Birthday Month" fullWidth type="number" value={formData.birthday.split('/')[1] || ''} onChange={(e) => handleChange('birthday', `${formData.birthday.split('/')[0] || ''}/${e.target.value}`)} />
            </Box>
            <TextField label="WhatsApp" fullWidth value={formData.whatsapp} onChange={(e) => handleChange('whatsapp', e.target.value)} error={!!errors.whatsapp} helperText={errors.whatsapp} />
            <TextField label="Email" fullWidth value={formData.email} onChange={(e) => handleChange('email', e.target.value)} error={!!errors.email} helperText={errors.email} />
          </Box>

          {/* Right Panel - Timeline Activity Log */}
          <div className={styles.rightPanel} style={{paddingLeft: '10px'}}>
            <div className={styles.timelineCard}>
              <h2 className={styles.sectionTitle}>Timeline Activity Log</h2>
              <button className={styles.welcomeButton} onClick={handleSendWelcomeEmail} style={{marginBottom: '15px'}}>
                  <EmailIcon className={styles.buttonIcon} />
                  Send Welcome Email
              </button>
              <div className={styles.addNoteSection}>
                <h3 className={styles.addNoteTitle}>Add Note</h3>
                <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Enter activity note..." className={styles.textarea} rows="3" />
                <div className={styles.followUpSection}>
                  <input type="number" value={followUpDays} onChange={(e) => setFollowUpDays(e.target.value)} placeholder="Follow up in (days)" className={styles.followUpInput} min="1" />
                </div>
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
        <Button onClick={onClose} variant="outlined">Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" sx={{ bgcolor: '#2b7a8e' }}>
          {editMember ? 'Update Member' : 'Add Member'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}