import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, Button, DialogActions, Typography, Box } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';

export default function ExitDateModal({ open, onClose, onConfirm, memberName }) {
  const [exitDate, setExitDate] = useState(dayjs());

  const handleConfirm = () => {
    onConfirm(exitDate.toDate());
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Confirm Exit for {memberName}</DialogTitle>
      <DialogContent>
        <Box sx={{display: 'flex', flexDirection: 'column', gap: 2, mt: 1}}>
            <Typography>
                Please select the date of exit for this member. The member will be moved to Past Members.
            </Typography>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DatePicker
                label="Date of Exit"
                value={exitDate}
                onChange={(newValue) => setExitDate(newValue)}
                format="DD/MM/YYYY"
                slotProps={{ textField: { fullWidth: true, variant: 'outlined', size: 'small' } }}
            />
            </LocalizationProvider>
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: '16px 24px' }}>
        <Button onClick={onClose} variant="outlined">Cancel</Button>
        <Button onClick={handleConfirm} variant="contained" color="error">
          Confirm Exit
        </Button>
      </DialogActions>
    </Dialog>
  );
}
