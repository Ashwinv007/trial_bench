import React, { useState, useEffect, useContext } from 'react';
import { FirebaseContext, AuthContext } from '../store/Context';
import { doc, getDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { logActivity } from '../utils/logActivity';
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
import { Email as EmailIcon } from '@mui/icons-material';
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
  const [isOtherPackage, setIsOtherPackage] = useState(false);
  
  // State to manage swapping to the profile view
  const [isViewingProfile, setIsViewingProfile] = useState(false);
  const [profileMemberId, setProfileMemberId] = useState(null);

  const functions = getFunctions();
  const sendWelcomeEmailCallable = httpsCallable(functions, 'sendWelcomeEmail');

  useEffect(() => {
    // When the modal is opened/re-opened, reset everything
    if (open) {
      const standardPackages = ["Dedicated Desk", "Flexible Desk", "Cabin", "Virtual Office", "Meeting Room"];
      
      const setupForm = (memberData) => {
        const initialPackage = memberData.package || '';
        if (initialPackage && !standardPackages.includes(initialPackage)) {
          setIsOtherPackage(true);
        } else {
          setIsOtherPackage(false);
        }

        setFormData({
          name: memberData.name || '',
          package: initialPackage,
          company: memberData.company !== 'NA' ? memberData.company : '',
          birthdayDay: memberData.birthdayDay || '',
          birthdayMonth: memberData.birthdayMonth || '',
          whatsapp: memberData.whatsapp || '',
          email: memberData.email || '',
          ccEmail: memberData.ccEmail || '',
        });
      };

      if (editMember) {
        setupForm(editMember);
      } else {
        const fetchPrimaryMemberDetails = async () => {
          if (primaryMemberId && db) {
            const primaryMemberDocRef = doc(db, "members", primaryMemberId);
            const primaryMemberDocSnap = await getDoc(primaryMemberDocRef);
            if (primaryMemberDocSnap.exists()) {
              const primaryMemberData = primaryMemberDocSnap.data();
              setupForm({
                ...formData, // Start with blank form data
                company: primaryMemberData.company !== 'NA' ? primaryMemberData.company : '',
                package: primaryMemberData.package || ''
              });
            }
          }
        };
        // Reset form for new member before fetching details
        setFormData({ name: '', package: '', company: '', birthdayDay: '', birthdayMonth: '', whatsapp: '', email: '', ccEmail: '' });
        setIsOtherPackage(false);
        fetchPrimaryMemberDetails();
      }
      
      setErrors({});
      setIsViewingProfile(false);
      setProfileMemberId(null);
    }
  }, [editMember, open, primaryMemberId, db]);



  const handleChange = (field, value) => {
    if (field === 'package_select') {
        if (value === 'Others') {
            setIsOtherPackage(true);
            setFormData(prev => ({...prev, package: ''}));
        } else {
            setIsOtherPackage(false);
            setFormData(prev => ({...prev, package: value}));
        }
        return;
    }

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
    if (primaryMemberId === null) {
      if (!formData.email.trim()) {
        newErrors.email = 'Email is required';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        newErrors.email = 'Invalid email format';
      }
      if (formData.ccEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.ccEmail)) {
        newErrors.ccEmail = 'Invalid CC email format';
      }
    }
    if (!formData.birthdayDay) newErrors.birthdayDay = 'Day is required';
    if (!formData.birthdayMonth) newErrors.birthdayMonth = 'Month is required';
    if (formData.birthdayDay && (parseInt(formData.birthdayDay, 10) < 1 || parseInt(formData.birthdayDay, 10) > 31)) {
      newErrors.birthdayDay = 'Day must be between 1 and 31';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSendWelcomeEmail = async () => {
    if (!formData.email.trim()) {
      toast.error('Member email is required to send a welcome email.');
      return;
    }

    try {
      await sendWelcomeEmailCallable({
        toEmail: formData.email, username: formData.name, ccEmail: formData.ccEmail.trim() ? formData.ccEmail.trim() : null,
      });
      toast.success('Welcome email sent successfully!');
      logActivity(
        db,
        user,
        'email_sent',
        `Welcome email sent to ${formData.name} (${formData.email}).`,
        { memberName: formData.name, email: formData.email, memberId: editMember?.id }
      );
    } catch (error) {
      console.error("Error sending welcome email:", error);
      toast.error(error.message || "Failed to send welcome email.");
    }
  };

  const handleSubmit = () => {
    if (validateForm()) {
      const memberData = {
        ...formData,
        company: formData.company.trim() ? formData.company.trim() : 'NA',
        birthday: formatBirthday(formData.birthdayDay, formData.birthdayMonth),
        primaryMemberId: primaryMemberId,
        ccEmail: formData.ccEmail.trim() ? formData.ccEmail.trim() : '',
      };
      // The onSave function (defined in the parent) will now handle the logging
      onSave(memberData);
      onClose();
    }
  };

  const handleViewProfile = (member) => {
    setProfileMemberId(member.leadId);
    setIsViewingProfile(true);
  };

  const handleProfileClose = () => {
    setIsViewingProfile(false);
    setProfileMemberId(null);
    onClose(); // Close the main modal wrapper
  };

  // If viewing profile, render the ClientProfileModal instead.
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
            <Select
              fullWidth
              value={isOtherPackage ? 'Others' : formData.package}
              onChange={(e) => handleChange('package_select', e.target.value)}
              displayEmpty
              error={!!errors.package}
            >
                <MenuItem value="" disabled>Select package</MenuItem>
                <MenuItem value="Dedicated Desk">Dedicated Desk</MenuItem>
                <MenuItem value="Flexible Desk">Flexible Desk</MenuItem>
                <MenuItem value="Cabin">Cabin</MenuItem>
                <MenuItem value="Virtual Office">Virtual Office</MenuItem>
                <MenuItem value="Meeting Room">Meeting Room</MenuItem>
                <MenuItem value="Others">Others</MenuItem>
            </Select>
            {isOtherPackage && (
              <TextField
                label="Other Package"
                fullWidth
                value={formData.package}
                onChange={(e) => handleChange('package', e.target.value)}
                error={!!errors.package}
                helperText={errors.package}
              />
            )}
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
            {primaryMemberId === null && (
              <>
                <TextField label="Email" fullWidth value={formData.email} onChange={(e) => handleChange('email', e.target.value)} error={!!errors.email} helperText={errors.email} />
                <TextField label="CC Email (optional)" fullWidth value={formData.ccEmail} onChange={(e) => handleChange('ccEmail', e.target.value)} error={!!errors.ccEmail} helperText={errors.ccEmail} />
              </>
            )}
          </Box>

          {/* Right Panel - Actions */}
          <div className={styles.rightPanel} style={{paddingLeft: '10px'}}>
            <div className={styles.timelineCard}>
              <h2 className={styles.sectionTitle}>Actions</h2>
              {primaryMemberId === null && editMember && (
                <button className={styles.welcomeButton} onClick={handleSendWelcomeEmail} style={{marginBottom: '15px'}}>
                    <EmailIcon className={styles.buttonIcon} />
                    Send Welcome Email
                </button>
              )}
              <Typography variant="body2" color="text.secondary">
                All activities such as member creation and updates are now automatically logged in the central platform logs.
              </Typography>
            </div>
          </div>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: '16px 24px 24px', gap: 1.5 }}>
        {editMember && editMember.primary && (
          <Button
            onClick={() => handleViewProfile(editMember)}
            variant="outlined"
          >
            View Lead Profile
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
