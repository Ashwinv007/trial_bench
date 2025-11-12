import React, { useState, useMemo, useContext, useEffect } from 'react';
import { FirebaseContext } from '../store/Context';
import { collection, getDocs, addDoc, doc, updateDoc, getDoc, deleteDoc } from 'firebase/firestore';
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
  Chip,
  MenuItem,
  Select,
  IconButton,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import AddIcon from '@mui/icons-material/Add';
import UploadFile from '@mui/icons-material/UploadFile';
import MemberModal from './MemberModal';
import { KeyboardArrowDown, KeyboardArrowRight } from '@mui/icons-material';
import { toast } from 'sonner';

// Helper function to format birthday for display
const formatBirthdayDisplay = (birthday) => {
  if (!birthday) return '-';
  return birthday;
};

// The Row component is removed, and its logic is integrated into the main component.

export default function MembersPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [packageFilter, setPackageFilter] = useState('All Packages');
  const [primaryMemberFilter, setPrimaryMemberFilter] = useState('All Members');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [primaryMemberId, setPrimaryMemberId] = useState(null);
  const [expandedRows, setExpandedRows] = useState({});

  const { db } = useContext(FirebaseContext);
  const [allMembers, setAllMembers] = useState([]);

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const membersCollection = collection(db, 'members');
        const membersSnapshot = await getDocs(membersCollection);
        const membersList = membersSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
        setAllMembers(membersList);
      } catch (error) {
        console.error("Error fetching data: ", error);
        toast.error("Failed to fetch members.");
      }
    };
    fetchMembers();
  }, [db]);

  const handleOpenAddModal = (primaryId = null) => {
    setEditingMember(null);
    setPrimaryMemberId(primaryId);
    setModalOpen(true);
  };

  const handleOpenEditModal = (member) => {
    setEditingMember(member);
    setPrimaryMemberId(member.primaryMemberId || null);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingMember(null);
    setPrimaryMemberId(null);
  };

  const handleSaveMember = async (memberData) => {
    const isEditing = !!editingMember;
    try {
      if (isEditing) {
        const memberDoc = doc(db, "members", editingMember.id);
        await updateDoc(memberDoc, memberData);
        setAllMembers(prev => prev.map(m => m.id === editingMember.id ? { ...m, ...memberData } : m));
        toast.success("Member updated successfully!");
      } else {
        const docRef = await addDoc(collection(db, "members"), memberData);
        const newMember = { ...memberData, id: docRef.id };
        let newAllMembers = [...allMembers, newMember];
        if (primaryMemberId) {
          const primaryMemberDocRef = doc(db, "members", primaryMemberId);
          const primaryMemberDoc = await getDoc(primaryMemberDocRef);
          if (primaryMemberDoc.exists()) {
            const primaryData = primaryMemberDoc.data();
            const subMembers = primaryData.subMembers || [];
            await updateDoc(primaryMemberDocRef, { subMembers: [...subMembers, docRef.id] });
            newAllMembers = newAllMembers.map(m => m.id === primaryMemberId ? { ...m, subMembers: [...subMembers, docRef.id] } : m);
          }
        }
        setAllMembers(newAllMembers);
        toast.success("Member added successfully!");
      }
    } catch (error) {
      console.error("Error saving member: ", error);
      toast.error(`Failed to ${isEditing ? 'update' : 'add'} member.`);
    }
  };

  const handleRemove = async (memberId) => {
    if (window.confirm('Are you sure you want to remove this member? They will be moved to Past Members.')) {
      try {
        const memberDocRef = doc(db, "members", memberId);
        const memberDoc = await getDoc(memberDocRef);

        if (memberDoc.exists()) {
          const memberData = memberDoc.data();
          await addDoc(collection(db, "past_members"), { ...memberData, removedAt: new Date() });

          const allDocs = await getDocs(collection(db, "members"));
          for (const d of allDocs.docs) {
            const data = d.data();
            if (data.subMembers && data.subMembers.includes(memberId)) {
              const updatedSubMembers = data.subMembers.filter(id => id !== memberId);
              await updateDoc(d.ref, { subMembers: updatedSubMembers });
            }
          }
          
          await deleteDoc(doc(db, "members", memberId));
          setAllMembers(allMembers.filter(member => member.id !== memberId));
          toast.success("Member moved to Past Members successfully!");
        } else {
          toast.error("Member not found.");
        }
      } catch (error) {
        console.error("Error removing member: ", error);
        toast.error("Failed to remove member.");
      }
    }
  };

  const toggleRow = (memberId) => {
    setExpandedRows((prev) => ({ ...prev, [memberId]: !prev[memberId] }));
  };

  const filteredMembers = useMemo(() => {
    let members = allMembers;

    if (primaryMemberFilter === 'Primary Members') {
      members = members.filter((member) => member.primary);
    }
    // For "All Members", we show everyone in a flat list. No special filtering needed here.

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

    members.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    return members;
  }, [searchQuery, packageFilter, primaryMemberFilter, allMembers]);

  const getSubMembers = (member) => {
    if (!member.subMembers || member.subMembers.length === 0) return [];
    return member.subMembers
      .map(subId => allMembers.find(m => m.id === subId))
      .filter(Boolean);
  };

  const renderAllMembersView = () => (
    filteredMembers.map((member) => (
      <TableRow key={member.id} sx={{ '&:hover': { backgroundColor: '#f5f5f5' }, cursor: 'pointer' }} onClick={() => handleOpenEditModal(member)}>
        <TableCell sx={{ width: '40px' }} />
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
        <TableCell colSpan={2}>
          <Button size="small" onClick={(e) => { e.stopPropagation(); handleRemove(member.id); }}>Remove</Button>
        </TableCell>
      </TableRow>
    ))
  );

  const renderPrimaryMembersView = () => (
    filteredMembers.map((member) => {
      const subMembers = getSubMembers(member);
      const isExpanded = expandedRows[member.id];
      return (
        <React.Fragment key={member.id}>
          <TableRow sx={{ '& > *': { borderBottom: 'unset' }, '&:hover': { backgroundColor: '#f5f5f5' }, cursor: 'pointer' }}>
            <TableCell sx={{ width: '40px' }}>
              {subMembers.length > 0 && (
                <IconButton aria-label="expand row" size="small" onClick={(e) => { e.stopPropagation(); toggleRow(member.id); }}>
                  {isExpanded ? <KeyboardArrowDown fontSize="small" /> : <KeyboardArrowDown fontSize="small" />}
                </IconButton>
              )}
            </TableCell>
            <TableCell component="th" scope="row" onClick={() => handleOpenEditModal(member)}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {member.name}
              </Box>
            </TableCell>
            <TableCell onClick={() => handleOpenEditModal(member)}>{member.package}</TableCell>
            <TableCell onClick={() => handleOpenEditModal(member)}>{member.company}</TableCell>
            <TableCell onClick={() => handleOpenEditModal(member)}>{formatBirthdayDisplay(member.birthday)}</TableCell>
            <TableCell onClick={() => handleOpenEditModal(member)}>{member.whatsapp}</TableCell>
            <TableCell onClick={() => handleOpenEditModal(member)}>{member.email}</TableCell>
            <TableCell>
              <IconButton onClick={(e) => { e.stopPropagation(); handleOpenAddModal(member.id); }} title="Add sub-member" sx={{ color: '#2b7a8e' }}>
                <AddIcon />
              </IconButton>
            </TableCell>
            <TableCell>
              <Button onClick={(e) => { e.stopPropagation(); handleRemove(member.id); }}>Remove</Button>
            </TableCell>
          </TableRow>
          {isExpanded && subMembers.map((subMember) => (
            <TableRow key={subMember.id} sx={{ backgroundColor: '#f8fafc', '&:hover': { backgroundColor: '#f1f5f9' }, cursor: 'pointer' }} onClick={() => handleOpenEditModal(subMember)}>
              <TableCell />
              <TableCell component="th" scope="row">
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Typography component="span" sx={{ fontFamily: 'monospace', mr: 1, color: 'grey.500' }}>└─</Typography>
                  {subMember.name}
                </Box>
              </TableCell>
              <TableCell>{subMember.package}</TableCell>
              <TableCell>{subMember.company}</TableCell>
              <TableCell>{subMember.birthday}</TableCell>
              <TableCell>{subMember.whatsapp}</TableCell>
              <TableCell>{subMember.email}</TableCell>
              <TableCell colSpan={2}>
                <Button size="small" onClick={(e) => { e.stopPropagation(); handleRemove(subMember.id); }}>Remove</Button>
              </TableCell>
            </TableRow>
          ))}
        </React.Fragment>
      );
    })
  );

  return (
    <Box sx={{ flex: 1, bgcolor: '#fafafa', minHeight: '100vh', overflow: 'auto' }}>
      <Box sx={{ p: '32px 40px', bgcolor: '#ffffff', borderBottom: '1px solid #e0e0e0' }}>
        <Typography sx={{ fontSize: '28px', fontWeight: 600, color: '#1a4d5c', mb: 0.5 }}>
          Members
        </Typography>
        <Typography sx={{ fontSize: '14px', color: '#2b7a8e' }}>
          Manage your coworking space members and their roles.
        </Typography>
      </Box>

      <Box sx={{ p: '32px 40px' }}>
        <Box sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'center' }}>
          <TextField
            placeholder="Search members by name, email, or phone..."
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
              setPrimaryMemberFilter('All Members');
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
          <Select
            value={primaryMemberFilter}
            onChange={(e) => setPrimaryMemberFilter(e.target.value)}
            size="small"
            sx={{ minWidth: '150px', bgcolor: '#ffffff', fontSize: '14px', '& .MuiOutlinedInput-notchedOutline': { borderColor: '#e0e0e0' }, '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#2b7a8e' }, '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#2b7a8e' } }}
          >
            <MenuItem value="All Members">All Members</MenuItem>
            <MenuItem value="Primary Members">Primary Members</MenuItem>
          </Select>
          <Button
            variant="contained"
            startIcon={<UploadFile />}
            sx={{ textTransform: 'none', fontSize: '14px', bgcolor: '#2b7a8e', px: 3, boxShadow: 'none', '&:hover': { bgcolor: '#1a4d5c', boxShadow: 'none' } }}
            onClick={() => { /* export data function */ }}
          >
            Export
          </Button>
        </Box>

        <TableContainer component={Paper} sx={{ boxShadow: 'none', border: '1px solid #e0e0e0', borderRadius: '8px' }}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#fafafa' }}>
                <TableCell />
                <TableCell sx={{ fontSize: '13px', fontWeight: 600, color: '#424242', borderBottom: '1px solid #e0e0e0', py: 2 }}>Name</TableCell>
                <TableCell sx={{ fontSize: '13px', fontWeight: 600, color: '#424242', borderBottom: '1px solid #e0e0e0' }}>Package</TableCell>
                <TableCell sx={{ fontSize: '13px', fontWeight: 600, color: '#424242', borderBottom: '1px solid #e0e0e0' }}>Company</TableCell>
                <TableCell sx={{ fontSize: '13px', fontWeight: 600, color: '#424242', borderBottom: '1px solid #e0e0e0' }}>Birthday</TableCell>
                <TableCell sx={{ fontSize: '13px', fontWeight: 600, color: '#424242', borderBottom: '1px solid #e0e0e0' }}>WhatsApp</TableCell>
                <TableCell sx={{ fontSize: '13px', fontWeight: 600, color: '#424242', borderBottom: '1px solid #e0e0e0' }}>Email</TableCell>
                <TableCell />
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {primaryMemberFilter === 'Primary Members' ? renderPrimaryMembersView() : renderAllMembersView()}
              {filteredMembers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} sx={{ textAlign: 'center', py: 4, fontSize: '14px', color: '#757575' }}>
                    No members found matching your filters
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <Typography sx={{ mt: 2, fontSize: '13px', color: '#757575' }}>
          Showing {filteredMembers.length} of {allMembers.length} members
        </Typography>
      </Box>

      {modalOpen && (
        <MemberModal
          open={modalOpen}
          onClose={handleCloseModal}
          editMember={editingMember}
          onSave={handleSaveMember}
          primaryMemberId={primaryMemberId}
        />
      )}
    </Box>
  );
}