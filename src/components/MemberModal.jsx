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
  FormControl,
  Typography,
  IconButton,
  InputLabel,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PersonAddIcon from '@mui/icons-material/PersonAdd';

export default function MemberModal({ open, onClose, onSave, editMember = null }) {
  const [formData, setFormData] = useState({
    name: '',
    package: '',
    type: 'NA',
    companyName: '',
    dob: '',
    whatsapp: '',
    email: '',
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (editMember) {
      setFormData({
        name: editMember.name || '',
        package: editMember.package || '',
        type: editMember.type === 'NA' ? 'Individual' : 'Company',
        companyName: editMember.type !== 'NA' ? editMember.type : '',
        dob: editMember.dob || '',
        whatsapp: editMember.whatsapp || '',
        email: editMember.email || '',
      });
    } else {
      setFormData({
        name: '',
        package: '',
        type: 'NA',
        companyName: '',
        dob: '',
        whatsapp: '',
        email: '',
      });
    }
    setErrors({});
  }, [editMember, open]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: '',
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    if (!formData.package) {
      newErrors.package = 'Package is required';
    }
    if (formData.type === 'Company' && !formData.companyName.trim()) {
      newErrors.companyName = 'Company name is required';
    }
    if (!formData.whatsapp.trim()) {
      newErrors.whatsapp = 'WhatsApp number is required';
    }
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      const memberData = {
        name: formData.name,
        package: formData.package,
        type: formData.type === 'Company' ? formData.companyName : 'NA',
        dob: formData.dob,
        whatsapp: formData.whatsapp,
        email: formData.email,
      };
      onSave(memberData);
      onClose();
    }
  };

  const handleCancel = () => {
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
        },
      }}
    >
      {/* Header */}
      <DialogTitle
        sx={{
          p: '24px 24px 16px',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
        }}
      >
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <PersonAddIcon sx={{ fontSize: '20px', color: '#2b7a8e' }} />
            <Typography sx={{ fontSize: '18px', fontWeight: 600, color: '#1a4d5c' }}>
              {editMember ? 'Edit Member' : 'Add New Member'}
            </Typography>
          </Box>
          <Typography sx={{ fontSize: '13px', color: '#757575', ml: '28px' }}>
            {editMember
              ? 'Update the member details below.'
              : 'Fill in the details below to add a new member to your coworking space.'}
          </Typography>
        </Box>
        <IconButton
          onClick={onClose}
          sx={{
            color: '#757575',
            p: 0.5,
            '&:hover': {
              bgcolor: 'rgba(0, 0, 0, 0.04)',
            },
          }}
        >
          <CloseIcon sx={{ fontSize: '20px' }} />
        </IconButton>
      </DialogTitle>

      {/* Content */}
      <DialogContent sx={{ p: '16px 24px' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {/* Name */}
          <Box>
            <Typography sx={{ fontSize: '13px', fontWeight: 500, color: '#424242', mb: 0.75 }}>
              Name <span style={{ color: '#d32f2f' }}>*</span>
            </Typography>
            <TextField
              fullWidth
              size="small"
              placeholder="Enter member name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              error={!!errors.name}
              helperText={errors.name}
              sx={{
                '& .MuiOutlinedInput-root': {
                  fontSize: '14px',
                  '& fieldset': {
                    borderColor: '#e0e0e0',
                  },
                  '&:hover fieldset': {
                    borderColor: '#2b7a8e',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#2b7a8e',
                  },
                },
              }}
            />
          </Box>

          {/* Package and Type */}
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontSize: '13px', fontWeight: 500, color: '#424242', mb: 0.75 }}>
                Package <span style={{ color: '#d32f2f' }}>*</span>
              </Typography>
              <Select
                fullWidth
                size="small"
                value={formData.package}
                onChange={(e) => handleChange('package', e.target.value)}
                displayEmpty
                error={!!errors.package}
                sx={{
                  fontSize: '14px',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: errors.package ? '#d32f2f' : '#e0e0e0',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#2b7a8e',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#2b7a8e',
                  },
                }}
              >
                <MenuItem value="" disabled>
                  <span style={{ color: '#9e9e9e' }}>Select package</span>
                </MenuItem>
                <MenuItem value="Dedicated Desk">Dedicated Desk</MenuItem>
                <MenuItem value="Flexible Desk">Flexible Desk</MenuItem>
                <MenuItem value="Cabin">Cabin</MenuItem>
                <MenuItem value="Virtual Office">Virtual Office</MenuItem>
                <MenuItem value="Meeting Room">Meeting Room</MenuItem>
              </Select>
              {errors.package && (
                <Typography sx={{ fontSize: '12px', color: '#d32f2f', mt: 0.5, ml: 1.75 }}>
                  {errors.package}
                </Typography>
              )}
            </Box>

            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontSize: '13px', fontWeight: 500, color: '#424242', mb: 0.75 }}>
                Type <span style={{ color: '#d32f2f' }}>*</span>
              </Typography>
              <Select
                fullWidth
                size="small"
                value={formData.type}
                onChange={(e) => handleChange('type', e.target.value)}
                sx={{
                  fontSize: '14px',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#e0e0e0',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#2b7a8e',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#2b7a8e',
                  },
                }}
              >
                <MenuItem value="Individual">Individual</MenuItem>
                <MenuItem value="Company">Company</MenuItem>
              </Select>
            </Box>
          </Box>

          {/* Company Name - Only show if type is Company */}
          {formData.type === 'Company' && (
            <Box>
              <Typography sx={{ fontSize: '13px', fontWeight: 500, color: '#424242', mb: 0.75 }}>
                Company Name <span style={{ color: '#d32f2f' }}>*</span>
              </Typography>
              <TextField
                fullWidth
                size="small"
                placeholder="Enter company name"
                value={formData.companyName}
                onChange={(e) => handleChange('companyName', e.target.value)}
                error={!!errors.companyName}
                helperText={errors.companyName}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    fontSize: '14px',
                    '& fieldset': {
                      borderColor: '#e0e0e0',
                    },
                    '&:hover fieldset': {
                      borderColor: '#2b7a8e',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#2b7a8e',
                    },
                  },
                }}
              />
            </Box>
          )}

          {/* Date of Birth */}
          <Box>
            <Typography sx={{ fontSize: '13px', fontWeight: 500, color: '#424242', mb: 0.75 }}>
              Date of Birth
            </Typography>
            <TextField
              fullWidth
              size="small"
              placeholder="dd/mm/yyyy"
              value={formData.dob}
              onChange={(e) => handleChange('dob', e.target.value)}
              sx={{
                '& .MuiOutlinedInput-root': {
                  fontSize: '14px',
                  '& fieldset': {
                    borderColor: '#e0e0e0',
                  },
                  '&:hover fieldset': {
                    borderColor: '#2b7a8e',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#2b7a8e',
                  },
                },
              }}
            />
          </Box>

          {/* WhatsApp and Email */}
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontSize: '13px', fontWeight: 500, color: '#424242', mb: 0.75 }}>
                WhatsApp <span style={{ color: '#d32f2f' }}>*</span>
              </Typography>
              <TextField
                fullWidth
                size="small"
                placeholder="Enter WhatsApp number"
                value={formData.whatsapp}
                onChange={(e) => handleChange('whatsapp', e.target.value)}
                error={!!errors.whatsapp}
                helperText={errors.whatsapp}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    fontSize: '14px',
                    '& fieldset': {
                      borderColor: '#e0e0e0',
                    },
                    '&:hover fieldset': {
                      borderColor: '#2b7a8e',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#2b7a8e',
                    },
                  },
                }}
              />
            </Box>

            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontSize: '13px', fontWeight: 500, color: '#424242', mb: 0.75 }}>
                Email <span style={{ color: '#d32f2f' }}>*</span>
              </Typography>
              <TextField
                fullWidth
                size="small"
                placeholder="Enter email address"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                error={!!errors.email}
                helperText={errors.email}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    fontSize: '14px',
                    '& fieldset': {
                      borderColor: '#e0e0e0',
                    },
                    '&:hover fieldset': {
                      borderColor: '#2b7a8e',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#2b7a8e',
                    },
                  },
                }}
              />
            </Box>
          </Box>
        </Box>
      </DialogContent>

      {/* Actions */}
      <DialogActions sx={{ p: '16px 24px 24px', gap: 1.5 }}>
        <Button
          onClick={handleCancel}
          variant="outlined"
          sx={{
            textTransform: 'none',
            fontSize: '14px',
            color: '#424242',
            borderColor: '#e0e0e0',
            px: 3,
            '&:hover': {
              borderColor: '#424242',
              bgcolor: 'transparent',
            },
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          sx={{
            textTransform: 'none',
            fontSize: '14px',
            bgcolor: '#2b7a8e',
            px: 3,
            boxShadow: 'none',
            '&:hover': {
              bgcolor: '#1a4d5c',
              boxShadow: 'none',
            },
          }}
        >
          {editMember ? 'Update Member' : 'Add Member'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}