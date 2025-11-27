import { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Typography, Box, Select, MenuItem, FormControl, InputLabel } from '@mui/material';

export default function ConversionModal({ open, onClose, leadData, onConvert }) {
  const [step, setStep] = useState('initial'); // 'initial', 'form'
  const [primaryMemberData, setPrimaryMemberData] = useState({
    name: '',
    package: '',
    company: '',
    birthdayDay: '',
    birthdayMonth: '',
    whatsapp: '',
    email: '',
  });
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
      });
      setIsOtherPackage(false);
    }
  }, [open]);

  const handleYes = () => {
    const memberData = {
      name: leadData.name,
      package: leadData.purposeOfVisit,
      company: leadData.companyName,
      birthdayDay: leadData.birthdayDay,
      birthdayMonth: leadData.birthdayMonth,
      whatsapp: leadData.convertedWhatsapp,
      email: leadData.ccEmail || leadData.convertedEmail,
    };
    onConvert(memberData);
  };

  const handleNo = () => {
    const standardPackages = ["Dedicated Desk", "Flexible Desk", "Cabin", "Virtual Office", "Meeting Room"];
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
    }));
    setStep('form');
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
                <MenuItem value="Cabin">Cabin</MenuItem>
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
