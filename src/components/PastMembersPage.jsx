import React, { useState, useMemo, useContext, useEffect } from 'react';
import { FirebaseContext, AuthContext } from '../store/Context';
import { collection, getDocs, doc, deleteDoc } from 'firebase/firestore';
import { logActivity } from '../utils/logActivity';
import {
  Box,
  Typography,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  InputAdornment,
  MenuItem,
  Select,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import UploadFile from '@mui/icons-material/UploadFile';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

// Helper function to format birthday for display
const formatBirthdayDisplay = (birthday) => {
  if (!birthday) return '-';
  return birthday;
};

export default function PastMembersPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [packageFilter, setPackageFilter] = useState('All Packages');
  const { db } = useContext(FirebaseContext);
  const { user, hasPermission } = useContext(AuthContext);
  const [allMembers, setAllMembers] = useState([]);

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const membersCollection = collection(db, 'past_members');
        const membersSnapshot = await getDocs(membersCollection);
        const membersList = membersSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
        membersList.sort((a, b) => (b.removedAt?.toDate() || 0) - (a.removedAt?.toDate() || 0));
        setAllMembers(membersList);
      } catch (error) {
        console.error("Error fetching data: ", error);
        toast.error("Failed to fetch past members.");
      }
    };
    fetchMembers();
  }, [db]);

  const filteredMembers = useMemo(() => {
    let members = allMembers;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      members = members.filter(
        (member) =>
          (member.name && member.name.toLowerCase().includes(query)) ||
          (member.email && member.email.toLowerCase().includes(query)) ||
          (member.whatsapp && member.whatsapp.toLowerCase().includes(query)) ||
          (member.company && member.company.toLowerCase().includes(query))
      );
    }

    if (packageFilter !== 'All Packages') {
      members = members.filter((member) => member.package === packageFilter);
    }

    return members;
  }, [searchQuery, packageFilter, allMembers]);

  const handlePermanentDelete = async (memberId) => {
    if (window.confirm('Are you sure you want to permanently delete this member? This action cannot be undone.')) {
      try {
        const memberToDelete = allMembers.find(member => member.id === memberId);
        await deleteDoc(doc(db, "past_members", memberId));
        setAllMembers(allMembers.filter(member => member.id !== memberId));
        toast.success("Member permanently deleted.");
        if (memberToDelete) {
          logActivity(
            db,
            user,
            'past_member_deleted',
            `Past member "${memberToDelete.name}" was permanently deleted.`,
            { memberId: memberId, memberName: memberToDelete.name }
          );
        }
      } catch (error) {
        console.error("Error deleting member: ", error);
        toast.error("Failed to permanently delete member.");
      }
    }
  };

  const handleExport = () => {
    const dataToExport = filteredMembers.map(member => ({
      Name: member.name,
      Package: member.package,
      Company: member.company,
      Birthday: formatBirthdayDisplay(member.birthday),
      WhatsApp: member.whatsapp,
      Email: member.email,
      'Date Removed': member.removedAt?.toDate().toLocaleDateString() || '-',
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "PastMembers");
    XLSX.writeFile(wb, "past_members.xlsx");
  };

  const renderAllMembersView = () => (
    filteredMembers.map((member) => (
      <TableRow key={member.id} sx={{ '&:hover': { backgroundColor: '#f5f5f5' } }}>
        <TableCell component="th" scope="row">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {member.name}
          </Box>
        </TableCell>
        <TableCell>{member.package}</TableCell>
        <TableCell>{member.company}</TableCell>
        <TableCell>{formatBirthdayDisplay(member.birthday)}</TableCell>
        <TableCell>{member.whatsapp}</TableCell>
        <TableCell>{member.email}</TableCell>
        <TableCell>{member.removedAt?.toDate().toLocaleDateString()}</TableCell>
        {hasPermission('manage_settings') && (
            <TableCell>
                <Button size="small" color="error" onClick={() => handlePermanentDelete(member.id)}>Delete</Button>
            </TableCell>
        )}
      </TableRow>
    ))
  );

  return (
    <Box sx={{ flex: 1, bgcolor: '#fafafa', minHeight: '100vh', overflow: 'auto' }}>
      <Box sx={{ p: '32px 40px', bgcolor: '#ffffff', borderBottom: '1px solid #e0e0e0' }}>
        <Typography sx={{ fontSize: '28px', fontWeight: 600, color: '#1a4d5c', mb: 0.5 }}>
          Past Members
        </Typography>
        <Typography sx={{ fontSize: '14px', color: '#2b7a8e' }}>
          View members who are no longer part of the coworking space.
        </Typography>
      </Box>

      <Box sx={{ p: '32px 40px' }}>
        <Box sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'center' }}>
          <TextField
            placeholder="Search past members..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            size="small"
            sx={{ flex: 1, bgcolor: '#ffffff', '& .MuiOutlinedInput-root': { fontSize: '14px', '& fieldset': { borderColor: '#e0e0e0' }, '&:hover fieldset': { borderColor: '#2b7a8e' }, '&.Mui-focused fieldset': { borderColor: '#2b7a8e' } } }}
            InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon sx={{ color: '#9e9e9e', fontSize: '20px' }} /></InputAdornment>) }}
          />
          <Button
            variant="outlined"
            startIcon={<FilterListIcon />}
            onClick={() => {
              setSearchQuery('');
              setPackageFilter('All Packages');
            }}
            sx={{ textTransform: 'none', fontSize: '14px', color: '#424242', borderColor: '#e0e0e0', bgcolor: '#ffffff', px: 2, '&:hover': { borderColor: '#2b7a8e', bgcolor: '#ffffff' } }}
          >
            Clear
          </Button>
          <Select
            value={packageFilter}
            onChange={(e) => setPackageFilter(e.target.value)}
            size="small"
            sx={{ minWidth: '150px', bgcolor: '#ffffff', fontSize: '14px', '& .MuiOutlinedInput-notchedOutline': { borderColor: '#e0e0e0' }, '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#2b7a8e' }, '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#2b7a8e' } }}
          >
            <MenuItem value="All Packages">All Packages</MenuItem>
            <MenuItem value="Dedicated Desk">Dedicated Desk</MenuItem>
            <MenuItem value="Flexible Desk">Flexible Desk</MenuItem>
            <MenuItem value="Cabin">Cabin</MenuItem>
            <MenuItem value="Virtual Office">Virtual Office</MenuItem>
            <MenuItem value="Meeting Room">Meeting Room</MenuItem>
          </Select>
          <Button
            variant="contained"
            startIcon={<UploadFile />}
            sx={{ textTransform: 'none', fontSize: '14px', bgcolor: '#2b7a8e', px: 3, boxShadow: 'none', '&:hover': { bgcolor: '#1a4d5c', boxShadow: 'none' } }}
            onClick={handleExport}
          >
            Export
          </Button>
        </Box>

        <TableContainer component={Paper} sx={{ boxShadow: 'none', border: '1px solid #e0e0e0', borderRadius: '8px' }}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#fafafa' }}>
                <TableCell sx={{ fontSize: '13px', fontWeight: 600, color: '#424242', borderBottom: '1px solid #e0e0e0', py: 2 }}>Name</TableCell>
                <TableCell sx={{ fontSize: '13px', fontWeight: 600, color: '#424242', borderBottom: '1px solid #e0e0e0' }}>Package</TableCell>
                <TableCell sx={{ fontSize: '13px', fontWeight: 600, color: '#424242', borderBottom: '1px solid #e0e0e0' }}>Company</TableCell>
                <TableCell sx={{ fontSize: '13px', fontWeight: 600, color: '#424242', borderBottom: '1px solid #e0e0e0' }}>Birthday</TableCell>
                <TableCell sx={{ fontSize: '13px', fontWeight: 600, color: '#424242', borderBottom: '1px solid #e0e0e0' }}>WhatsApp</TableCell>
                <TableCell sx={{ fontSize: '13px', fontWeight: 600, color: '#424242', borderBottom: '1px solid #e0e0e0' }}>Email</TableCell>
                <TableCell sx={{ fontSize: '13px', fontWeight: 600, color: '#424242', borderBottom: '1px solid #e0e0e0' }}>Date Removed</TableCell>
                {hasPermission('manage_settings') && <TableCell sx={{ fontSize: '13px', fontWeight: 600, color: '#424242', borderBottom: '1px solid #e0e0e0' }}>Actions</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {renderAllMembersView()}
              {filteredMembers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={hasPermission('manage_settings') ? 8 : 7} sx={{ textAlign: 'center', py: 4, fontSize: '14px', color: '#757575' }}>
                    No past members found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <Typography sx={{ mt: 2, fontSize: '13px', color: '#757575' }}>
          Showing {filteredMembers.length} of {allMembers.length} past members
        </Typography>
      </Box>
    </Box>
  );
}
