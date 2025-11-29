import { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Typography, Box, Select, MenuItem, FormControl, InputLabel, FormHelperText } from '@mui/material';

export default function ConversionModal({ open, onClose, leadData, onConvert }) {
  const [step, setStep] = useState('initial'); // 'initial', 'birthday', 'form'
  const [primaryMemberData, setPrimaryMemberData] = useState({
    name: '',
    package: '',
    company: '',
    birthdayDay: '',
    birthdayMonth: '',
    whatsapp: '+91',
    email: '',
    ccEmail: '',
  });
  const [birthdayData, setBirthdayData] = useState({ day: '', month: '' });
  const [birthdayErrors, setBirthdayErrors] = useState({});
  const [isOtherPackage, setIsOtherPackage] = useState(false);

  useEffect(() => {
    if (open) {
      setStep('initial');
      setPrimaryMemberData({
        name: '',
        package: '',
        company: '',
        birthdayDay: '',
        birthdayMonth: '',
        whatsapp: '+91',
        email: '',
        ccEmail: '',
      });
      setBirthdayData({ day: '', month: '' });
      setBirthdayErrors({});
      setIsOtherPackage(false);
    }
  }, [open]);

  const handleYes = () => {
    setStep('birthday'); // Move to birthday step instead of converting directly
  };

  const handleNo = () => {
    const standardPackages = ["Dedicated Desk", "Flexible Desk", "Private Cabin", "Virtual Office", "Meeting Room"];
    const leadPackage = leadData.purposeOfVisit || '';

    if (leadPackage && !standardPackages.includes(leadPackage)) {
      setIsOtherPackage(true);
    } else {
      setIsOtherPackage(false);
    }

    setPrimaryMemberData(prev => ({
      ...prev,
      package: leadPackage,
      company: leadData.companyName || '',
      email: leadData.ccEmail || leadData.convertedEmail || '',
      ccEmail: leadData.ccEmail || '', // Carry over the ccEmail
    }));
    setStep('form');
  };

  const handleConfirmConversion = () => {
    const errors = {};
    if (!birthdayData.day) errors.day = 'Day is required';
    if (!birthdayData.month) errors.month = 'Month is required';
    if (birthdayData.day && (parseInt(birthdayData.day, 10) < 1 || parseInt(birthdayData.day, 10) > 31)) {
        errors.day = 'Day must be between 1 and 31';
    }
    setBirthdayErrors(errors);

    if (Object.keys(errors).length === 0) {
        const memberData = {
            name: leadData.name,
            package: leadData.purposeOfVisit,
            company: leadData.companyName,
            whatsapp: leadData.convertedWhatsapp,
            email: leadData.convertedEmail,
            ccEmail: leadData.ccEmail,
            birthdayDay: birthdayData.day,
            birthdayMonth: birthdayData.month,
        };
        onConvert(memberData);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'package_select') {
        if (value === 'Others') {
            setIsOtherPackage(true);
            setPrimaryMemberData(prev => ({...prev, package: ''}));
        } else {
            setIsOtherPackage(false);
            setPrimaryMemberData(prev => ({...prev, package: value}));
        }
        return;
    }
    setPrimaryMemberData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddPrimaryMember = () => {
    onConvert(primaryMemberData);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Convert Lead to Member</DialogTitle>
      <DialogContent>
        {step === 'initial' && (
          <Typography>Is the Primary Member the same as the Lead?</Typography>
        )}
        {step === 'birthday' && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                <Typography>Enter Primary Member's Birthday</Typography>
                <Box sx={{ display: 'flex', gap: 2 }}>
                    <TextField
                        autoFocus
                        label="Birthday Day"
                        fullWidth
                        type="number"
                        value={birthdayData.day}
                        onChange={(e) => setBirthdayData(prev => ({ ...prev, day: e.target.value }))}
                        inputProps={{ min: 1, max: 31 }}
                        error={!!birthdayErrors.day}
                        helperText={birthdayErrors.day}
                    />
                    <FormControl fullWidth variant="outlined" error={!!birthdayErrors.month}>
                        <InputLabel>Birthday Month</InputLabel>
                        <Select
                            value={birthdayData.month}
                            onChange={(e) => setBirthdayData(prev => ({ ...prev, month: e.target.value }))}
                            label="Birthday Month"
                        >
                            {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((monthName, index) => (
                                <MenuItem key={index + 1} value={String(index + 1)}>{monthName}</MenuItem>
                            ))}
                        </Select>
                        {birthdayErrors.month && <FormHelperText>{birthdayErrors.month}</FormHelperText>}
                    </FormControl>
                </Box>
            </Box>
        )}
        {step === 'form' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <Typography>Enter Primary Member Details</Typography>
            <TextField
              autoFocus
              name="name"
              label="Name"
              fullWidth
              value={primaryMemberData.name}
              onChange={handleInputChange}
            />
            <FormControl fullWidth>
              <InputLabel>Package</InputLabel>
              <Select
                name="package_select"
                value={isOtherPackage ? 'Others' : primaryMemberData.package}
                onChange={handleInputChange}
              >
                <MenuItem value="Dedicated Desk">Dedicated Desk</MenuItem>
                <MenuItem value="Flexible Desk">Flexible Desk</MenuItem>
                <MenuItem value="Private Cabin">Private Cabin</MenuItem>
                <MenuItem value="Virtual Office">Virtual Office</MenuItem>
                <MenuItem value="Meeting Room">Meeting Room</MenuItem>
                <MenuItem value="Others">Others</MenuItem>
              </Select>
            </FormControl>
            {isOtherPackage && (
              <TextField
                name="package"
                label="Other Package"
                fullWidth
                value={primaryMemberData.package}
                onChange={handleInputChange}
              />
            )}
            <TextField
              name="company"
              label="Company Name (optional)"
              fullWidth
              value={primaryMemberData.company}
              onChange={handleInputChange}
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                name="birthdayDay"
                label="Birthday Day"
                type="number"
                fullWidth
                value={primaryMemberData.birthdayDay}
                onChange={handleInputChange}
              />
              <FormControl fullWidth>
                <InputLabel>Birthday Month</InputLabel>
                <Select
                  name="birthdayMonth"
                  value={primaryMemberData.birthdayMonth}
                  onChange={handleInputChange}
                >
                  {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((month, index) => (
                    <MenuItem key={index + 1} value={String(index + 1)}>{month}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            <TextField
              name="whatsapp"
              label="WhatsApp"
              fullWidth
              value={primaryMemberData.whatsapp}
              onChange={handleInputChange}
            />
            <TextField
              name="email"
              label="Email"
              type="email"
              fullWidth
              value={primaryMemberData.email}
              onChange={handleInputChange}
              disabled
            />
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 3 }}>
        {step === 'initial' && (
          <>
            <Button onClick={handleNo} variant="outlined">No</Button>
            <Button onClick={handleYes} variant="contained">Yes</Button>
          </>
        )}
        {step === 'birthday' && (
            <>
                <Button onClick={() => setStep('initial')} variant="outlined">Back</Button>
                <Button onClick={handleConfirmConversion} variant="contained">Confirm Conversion</Button>
            </>
        )}
        {step === 'form' && (
          <>
            <Button onClick={onClose} variant="outlined">Cancel</Button>
            <Button onClick={handleAddPrimaryMember} variant="contained">Add Primary Member</Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
