import React, { useState, useEffect, useContext } from 'react';
import { FirebaseContext, AuthContext } from '../store/Context';
import { doc, getDoc, collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
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
import { usePermissions } from '../auth/usePermissions';
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

const ReplacementView = ({ subMembers, onCancel, onConfirm, mode, oldPrimaryMember }) => {
    const [selectedMemberId, setSelectedMemberId] = useState('');
    const [showNewMemberForm, setShowNewMemberForm] = useState(false);
    const [newMemberData, setNewMemberData] = useState({ 
        name: '', 
        whatsapp: '', 
        birthdayDay: '', 
        birthdayMonth: '' 
    });
    const [newMemberErrors, setNewMemberErrors] = useState({});

    const validateNewMemberForm = () => {
        const errors = {};
        if (!newMemberData.name.trim()) errors.name = 'Name is required';
        if (!newMemberData.whatsapp.trim()) errors.whatsapp = 'WhatsApp number is required';
        if (!newMemberData.birthdayDay) errors.birthdayDay = 'Day is required';
        if (!newMemberData.birthdayMonth) errors.birthdayMonth = 'Month is required';
        if (newMemberData.birthdayDay && (parseInt(newMemberData.birthdayDay, 10) < 1 || parseInt(newMemberData.birthdayDay, 10) > 31)) {
            errors.birthdayDay = 'Day must be between 1 and 31';
        }
        setNewMemberErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleNewMemberChange = (field, value) => {
        setNewMemberData(prev => {
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
    };

    const handleConfirm = () => {
        if (showNewMemberForm) {
            if (validateNewMemberForm()) {
                onConfirm({ newMember: newMemberData });
            }
        } else {
            if (!selectedMemberId) {
                toast.error("Please select a member to promote.");
                return;
            }
            onConfirm({ promoteMemberId: selectedMemberId });
        }
    };

    return (
        <Box>
            <Typography variant="body1" sx={{mb: 2}}>
                The current primary member is <strong>{oldPrimaryMember.name}</strong>.
            </Typography>

            <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Select a sub-member to promote</InputLabel>
                <Select
                    value={selectedMemberId}
                    label="Select a sub-member to promote"
                    onChange={(e) => {
                        setSelectedMemberId(e.target.value);
                        setShowNewMemberForm(false);
                    }}
                    disabled={showNewMemberForm}
                >
                    <MenuItem value=""><em>None</em></MenuItem>
                    {subMembers.map(member => (
                        <MenuItem key={member.id} value={member.id}>{member.name}</MenuItem>
                    ))}
                </Select>
            </FormControl>

            <Typography variant="body1" align="center" sx={{mb: 2}}>OR</Typography>

            <Button fullWidth variant="outlined" onClick={() => {
                setShowNewMemberForm(!showNewMemberForm);
                setSelectedMemberId('');
                setNewMemberErrors({}); // Clear errors when toggling
            }} sx={{mb: 2}}>
                {showNewMemberForm ? 'Cancel Adding New Member' : 'Add New Member to be Primary'}
            </Button>

            {showNewMemberForm && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, border: '1px solid #ccc', borderRadius: '8px', p: 2 }}>
                    <Typography variant="h6" gutterBottom>New Primary Member Details</Typography>
                    <TextField 
                        label="Name" 
                        fullWidth 
                        value={newMemberData.name} 
                        onChange={(e) => handleNewMemberChange('name', e.target.value)} 
                        error={!!newMemberErrors.name} 
                        helperText={newMemberErrors.name} 
                    />
                    <TextField 
                        label="WhatsApp" 
                        fullWidth 
                        value={newMemberData.whatsapp} 
                        onChange={(e) => handleNewMemberChange('whatsapp', e.target.value)} 
                        error={!!newMemberErrors.whatsapp} 
                        helperText={newMemberErrors.whatsapp} 
                    />
                    <Box sx={{ display: 'flex', gap: 2 }}>
                        <TextField
                            label="Birthday Day"
                            fullWidth
                            type="number"
                            value={newMemberData.birthdayDay}
                            onChange={(e) => handleNewMemberChange('birthdayDay', e.target.value)}
                            inputProps={{ min: 1, max: 31 }}
                            error={!!newMemberErrors.birthdayDay}
                            helperText={newMemberErrors.birthdayDay}
                        />
                        <FormControl fullWidth variant="outlined" error={!!newMemberErrors.birthdayMonth}>
                            <InputLabel id="new-member-birthday-month-label">Birthday Month</InputLabel>
                            <Select
                                labelId="new-member-birthday-month-label"
                                value={newMemberData.birthdayMonth}
                                onChange={(e) => handleNewMemberChange('birthdayMonth', e.target.value)}
                                displayEmpty
                                label="Birthday Month"
                            >
                                <MenuItem value="" disabled>Select Month</MenuItem>
                                {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((monthName, index) => (
                                    <MenuItem key={index + 1} value={String(index + 1)}>{monthName}</MenuItem>
                                ))}
                            </Select>
                            {newMemberErrors.birthdayMonth && <FormHelperText>{newMemberErrors.birthdayMonth}</FormHelperText>}
                        </FormControl>
                    </Box>
                </Box>
            )}
            
            <DialogActions sx={{ p: '16px 0 0', gap: 1.5 }}>
                <Button onClick={onCancel} variant="outlined">Cancel</Button>
                <Button onClick={handleConfirm} variant="contained" sx={{ bgcolor: '#2b7a8e' }}>
                    Confirm Replacement
                </Button>
            </DialogActions>
        </Box>
    );
};

export default function MemberModal({ open, onClose, onSave, editMember = null, primaryMemberId = null, initialAction = null }) {
  const { db } = useContext(FirebaseContext);
  const { user } = useContext(AuthContext);
  const { hasPermission } = usePermissions();
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
  const [leadEmail, setLeadEmail] = useState('');
  
  // State to manage swapping to the profile view
  const [isViewingProfile, setIsViewingProfile] = useState(false);
  const [profileMemberId, setProfileMemberId] = useState(null);

  // State for replacement flow
  const [replacementAction, setReplacementAction] = useState(null); // null, 'replace', 'removeAndReplace'
  const [subMembers, setSubMembers] = useState([]);

  const functions = getFunctions();
  const sendWelcomeEmailCallable = httpsCallable(functions, 'sendWelcomeEmail');

  useEffect(() => {
    // When the modal is opened/re-opened, reset everything
    if (open) {
      // Reset all state at the beginning
      setFormData({ name: '', package: '', company: '', birthdayDay: '', birthdayMonth: '', whatsapp: '', email: '', ccEmail: '' });
      setErrors({});
      setIsOtherPackage(false);
      setLeadEmail('');
      setIsViewingProfile(false);
      setProfileMemberId(null);
      setReplacementAction(null);
      setSubMembers([]);

      if (initialAction) {
        setReplacementAction(initialAction);
      }

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
        if (editMember.primary && db) {
          const fetchSubMembers = async () => {
            const subMembersQuery = query(collection(db, "members"), where("primaryMemberId", "==", editMember.id));
            const querySnapshot = await getDocs(subMembersQuery);
            const members = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setSubMembers(members);
          };
          fetchSubMembers();

          if (editMember.leadId) {
            const fetchLeadEmail = async () => {
              const leadDocRef = doc(db, "leads", editMember.leadId);
              const leadDocSnap = await getDoc(leadDocRef);
              if (leadDocSnap.exists()) {
                setLeadEmail(leadDocSnap.data().email);
              }
            };
            fetchLeadEmail();
          }
        }
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
        fetchPrimaryMemberDetails();
      }
    }
  }, [editMember, open, primaryMemberId, db, initialAction]);



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
    if (!formData.birthdayDay) newErrors.birthdayDay = 'Day is required';
    if (!formData.birthdayMonth) newErrors.birthdayMonth = 'Month is required';
    if (formData.birthdayDay && (parseInt(formData.birthdayDay, 10) < 1 || parseInt(formData.birthdayDay, 10) > 31)) {
      newErrors.birthdayDay = 'Day must be between 1 and 31';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSendWelcomeEmail = async () => {
    if (!hasPermission('members:edit')) {
        toast.error("You don't have permission to send welcome emails.");
        return;
    }
    const emailToSend = editMember && editMember.primary ? leadEmail : formData.email;
    if (!emailToSend || !emailToSend.trim()) {
      toast.error('Member does not have an email to send to.');
      return;
    }

    try {
      await sendWelcomeEmailCallable({
        toEmail: emailToSend, 
        username: formData.name, 
        ccEmail: null, // CC email is no longer collected
      });
      toast.success('Welcome email sent successfully!');
      logActivity(
        db,
        user,
        'email_sent',
        `Welcome email sent to ${formData.name} (${emailToSend}).`,
        { memberName: formData.name, email: emailToSend, memberId: editMember?.id }
      );
    } catch (error) {
      console.error("Error sending welcome email:", error);
      toast.error(error.message || "Failed to send welcome email.");
    }
  };

  const handleSubmit = () => {
    if (editMember) {
        if (!hasPermission('members:edit')) {
            toast.error("You don't have permission to edit members.");
            return;
        }
    } else {
        if (!hasPermission('members:add')) {
            toast.error("You don't have permission to add members.");
            return;
        }
    }

    if (validateForm()) {
      const memberData = {
        ...formData,
        company: formData.company.trim() ? formData.company.trim() : 'NA',
        birthday: formatBirthday(formData.birthdayDay, formData.birthdayMonth),
        primaryMemberId: primaryMemberId,
      };
      
      // Email fields are not editable, so they are not part of the save data from the form
      delete memberData.email; 
      delete memberData.ccEmail;

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

  const handleReplacementConfirm = async (replacementData) => {
    if (!hasPermission('members:edit')) {
        toast.error("You don't have permission to replace members.");
        return;
    }
    const replacePrimaryMemberCallable = httpsCallable(functions, 'replacePrimaryMember');

    const payload = {
      oldPrimaryMemberId: editMember.id,
      mode: replacementAction,
      promotionTarget: replacementData
    };

    toast.promise(
        replacePrimaryMemberCallable(payload),
        {
            loading: 'Processing replacement...',
            success: (result) => {
                onSave({}); // To trigger a refresh in parent component.
                onClose(); // Close the modal.
                return result.data.message;
            },
            error: (err) => {
                console.error(err);
                return err.message || 'Replacement failed.';
            },
        }
    );
  };

  const handleReplacementCancel = () => {
      setReplacementAction(null);
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

  if (replacementAction) {
    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: '12px' } }}>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography sx={{ fontSize: '18px', fontWeight: 600, color: '#1a4d5c' }}>
                    {replacementAction === 'replace' ? 'Replace Primary Member' : 'Remove and Replace Primary Member'}
                </Typography>
                <IconButton onClick={onClose} sx={{ color: '#757575', p: 0.5 }}>
                    <CloseIcon sx={{ fontSize: '20px' }} />
                </IconButton>
            </DialogTitle>
            <DialogContent>
                <ReplacementView 
                    subMembers={subMembers}
                    onCancel={handleReplacementCancel}
                    onConfirm={handleReplacementConfirm}
                    mode={replacementAction}
                    oldPrimaryMember={editMember}
                />
            </DialogContent>
        </Dialog>
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
                label="Birthday Month"
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
            {editMember && editMember.primary && (
              <TextField
                label=""
                fullWidth
                value={formData.email}
                disabled
              />
            )}
          </Box>

          {/* Right Panel - Actions */}
          <div className={styles.rightPanel} style={{paddingLeft: '10px'}}>
            <div className={styles.timelineCard}>
              <h2 className={styles.sectionTitle}>Actions</h2>
              {editMember && editMember.primary && (
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

      <DialogActions sx={{ p: '16px 24px 24px', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
            {editMember && editMember.primary && hasPermission('members:replace') && (
            <>
                <Button
                    onClick={() => setReplacementAction('replace')}
                    variant="outlined"
                >
                    Replace
                </Button>
            </>
            )}
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
            {editMember && editMember.primary && (
            <Button
                onClick={() => handleViewProfile(editMember)}
                variant="outlined"
            >
                View Client Profile
            </Button>
            )}
            <Button onClick={onClose} variant="outlined">Cancel</Button>
            <Button onClick={handleSubmit} variant="contained" sx={{ bgcolor: '#2b7a8e' }}>
            {editMember ? 'Update Member' : 'Add Member'}
            </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
}