import React, { useState, useMemo, useContext, useEffect } from 'react';
import { FirebaseContext } from '../store/Context';
import { collection, getDocs, addDoc, doc, updateDoc, getDoc } from 'firebase/firestore';
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
  Collapse,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import AddIcon from '@mui/icons-material/Add';
import UploadFile from '@mui/icons-material/UploadFile';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import MemberModal from './MemberModal';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';

function Row(props) {
  const { member, handleOpenEditModal, allMembers, handleOpenAddModal } = props;
  const [open, setOpen] = useState(false);

  const subMembers = allMembers.filter(m => member.subMembers && member.subMembers.includes(m.id));

  return (
    <React.Fragment>
      <TableRow
        sx={{ '& > *': { borderBottom: 'unset' }, cursor: 'pointer' }}
        onClick={() => handleOpenEditModal(member)}
      >
        <TableCell>
          {member.primary && (
            <IconButton
              aria-label="expand row"
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(!open);
              }}
            >
              {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
            </IconButton>
          )}
        </TableCell>
        <TableCell component="th" scope="row">
          {member.name}
        </TableCell>
        <TableCell>{member.package}</TableCell>
        <TableCell>{member.company}</TableCell>
        <TableCell>{member.birthday}</TableCell>
        <TableCell>{member.whatsapp}</TableCell>
        <TableCell>{member.email}</TableCell>
        <TableCell>
          {member.primary && (
            <IconButton
              onClick={(e) => {
                e.stopPropagation();
                handleOpenAddModal(member.id);
              }}
            >
              <AddIcon />
            </IconButton>
          )}
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={8}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ margin: 1 }}>
              <Typography variant="h6" gutterBottom component="div">
                Sub Members
              </Typography>
              <Table size="small" aria-label="purchases">
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Package</TableCell>
                    <TableCell>Company</TableCell>
                    <TableCell>Birthday</TableCell>
                    <TableCell>WhatsApp</TableCell>
                    <TableCell>Email</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {subMembers.map((subMember) => (
                    <TableRow key={subMember.id}>
                      <TableCell component="th" scope="row">
                        {subMember.name}
                      </TableCell>
                      <TableCell>{subMember.package}</TableCell>
                      <TableCell>{subMember.company}</TableCell>
                      <TableCell>{subMember.birthday}</TableCell>
                      <TableCell>{subMember.whatsapp}</TableCell>
                      <TableCell>{subMember.email}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </React.Fragment>
  );
}

export default function MembersPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [packageFilter, setPackageFilter] = useState('All Packages');
  const [primaryMemberFilter, setPrimaryMemberFilter] = useState('All Members');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [editingIndex, setEditingIndex] = useState(null);
  const [primaryMemberId, setPrimaryMemberId] = useState(null);

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
        console.error("Error fetching members: ", error);
      }
    };

    fetchMembers();
  }, [db]);

  const handleOpenAddModal = (primaryId = null) => {
    setEditingMember(null);
    setEditingIndex(null);
    setPrimaryMemberId(primaryId);
    setModalOpen(true);
  };

  const handleOpenEditModal = (member) => {
    const index = allMembers.findIndex(m => m.id === member.id);
    setEditingMember(member);
    setEditingIndex(index);
    setPrimaryMemberId(member.primaryMemberId || null);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingMember(null);
    setEditingIndex(null);
    setPrimaryMemberId(null);
  };

  const handleSaveMember = async (memberData) => {
    if (editingIndex !== null) {
      // Edit existing member
      try {
        const memberDoc = doc(db, "members", editingMember.id);
        await updateDoc(memberDoc, memberData);
        const updatedMembers = [...allMembers];
        updatedMembers[editingIndex] = { ...memberData, id: editingMember.id };
        setAllMembers(updatedMembers);
      } catch (error) {
        console.error("Error updating member: ", error);
      }
    } else {
      // Add new member
      try {
        const docRef = await addDoc(collection(db, "members"), memberData);
        if (primaryMemberId) {
          const primaryMemberDocRef = doc(db, "members", primaryMemberId);
          const primaryMemberDoc = await getDoc(primaryMemberDocRef);
          const primaryMemberData = primaryMemberDoc.data();
          const subMembers = primaryMemberData.subMembers || [];
          await updateDoc(primaryMemberDocRef, { subMembers: [...subMembers, docRef.id] });
        }
        setAllMembers([...allMembers, { ...memberData, id: docRef.id }]);
      } catch (error) {
        console.error("Error adding member: ", error);
      }
    }
  };

  // Filter logic
  const filteredMembers = useMemo(() => {
    let filtered = allMembers.map((member, index) => ({ ...member, originalIndex: index }));

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (member) =>
          member.name.toLowerCase().startsWith(query) ||
          member.email.toLowerCase().startsWith(query) ||
          member.whatsapp.toLowerCase().startsWith(query)||
          member.company.toLowerCase().startsWith(query)
      );
    }

    // Package filter
    if (packageFilter !== 'All Packages') {
      filtered = filtered.filter((member) => member.package === packageFilter);
    }

    // Primary member filter
    if (primaryMemberFilter === 'Primary Members') {
      filtered = filtered.filter((member) => member.primary);
    }

    // Sort by company
    filtered.sort((a, b) => {
      const companyA = a.company || '';
      const companyB = b.company || '';
      return companyA.localeCompare(companyB);
    });

    if (primaryMemberFilter !== 'Primary Members') {
      return filtered.filter(member => !member.primaryMemberId);
    }

    return filtered;
  }, [searchQuery, packageFilter, primaryMemberFilter, allMembers]);

  return (
    <Box
      sx={{
        flex: 1,
        bgcolor: '#fafafa',
        minHeight: '100vh',
        overflow: 'auto',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: '32px 40px',
          bgcolor: '#ffffff',
          borderBottom: '1px solid #e0e0e0',
        }}
      >
        <Typography
          sx={{
            fontSize: '28px',
            fontWeight: 600,
            color: '#1a4d5c',
            mb: 0.5,
          }}
        >
          Members
        </Typography>
        <Typography
          sx={{
            fontSize: '14px',
            color: '#2b7a8e',
          }}
        >
          Manage your coworking space members.
        </Typography>
      </Box>

      {/* Content */}
      <Box sx={{ p: '32px 40px' }}>
        {/* Search and Filters */}
        <Box
          sx={{
            display: 'flex',
            gap: 2,
            mb: 3,
            alignItems: 'center',
          }}
        >
          <TextField
            placeholder="Search members by name, email, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            size="small"
            sx={{
              flex: 1,
              bgcolor: '#ffffff',
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
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: '#9e9e9e', fontSize: '20px' }} />
                </InputAdornment>
              ),
            }}
          />
          <Button
            variant="outlined"
            startIcon={<FilterListIcon />}
            onClick={() => {
              setSearchQuery('');
              setPackageFilter('All Packages');
              setPrimaryMemberFilter('All Members');
            }}
            sx={{
              textTransform: 'none',
              fontSize: '14px',
              color: '#424242',
              borderColor: '#e0e0e0',
              bgcolor: '#ffffff',
              px: 2,
              '&:hover': {
                borderColor: '#2b7a8e',
                bgcolor: '#ffffff',
              },
            }}
          >
            Clear
          </Button>
          <Select
            value={packageFilter}
            onChange={(e) => setPackageFilter(e.target.value)}
            size="small"
            sx={{
              minWidth: '150px',
              bgcolor: '#ffffff',
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
            sx={{
              minWidth: '150px',
              bgcolor: '#ffffff',
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
            <MenuItem value="All Members">All Members</MenuItem>
            <MenuItem value="Primary Members">Primary Members</MenuItem>
          </Select>
          <Button
            variant="contained"
            startIcon={<UploadFile />}
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
            onClick={() => {
              // a function to export data
            }}
          >
            Export
          </Button>
        </Box>

        {/* Table */}
        <TableContainer
          component={Paper}
          sx={{
            boxShadow: 'none',
            border: '1px solid #e0e0e0',
            borderRadius: '8px',
          }}
        >
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#fafafa' }}>
                <TableCell />
                <TableCell
                  sx={{
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#424242',
                    borderBottom: '1px solid #e0e0e0',
                    py: 2,
                  }}
                >
                  Name
                </TableCell>
                <TableCell
                  sx={{
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#424242',
                    borderBottom: '1px solid #e0e0e0',
                  }}
                >
                  Package
                </TableCell>
                <TableCell
                  sx={{
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#424242',
                    borderBottom: '1px solid #e0e0e0',
                  }}
                >
                  Company
                </TableCell>
                <TableCell
                  sx={{
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#424242',
                    borderBottom: '1px solid #e0e0e0',
                  }}
                >
                  Birthday
                </TableCell>
                <TableCell
                  sx={{
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#424242',
                    borderBottom: '1px solid #e0e0e0',
                  }}
                >
                  WhatsApp
                </TableCell>
                <TableCell
                  sx={{
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#424242',
                    borderBottom: '1px solid #e0e0e0',
                  }}
                >
                  Email
                </TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredMembers.length > 0 ? (
                filteredMembers.map((member) => (
                  <Row key={member.id} member={member} handleOpenEditModal={handleOpenEditModal} allMembers={allMembers} handleOpenAddModal={handleOpenAddModal} />
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    sx={{
                      textAlign: 'center',
                      py: 4,
                      fontSize: '14px',
                      color: '#757575',
                    }}
                  >
                    No members found matching your filters
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Footer */}
        <Typography
          sx={{
            mt: 2,
            fontSize: '13px',
            color: '#757575',
          }}
        >
          Showing {filteredMembers.length} of {allMembers.length} members
        </Typography>
      </Box>

      {/* Member Modal */}
      <MemberModal
        open={modalOpen}
        onClose={handleCloseModal}
        editMember={editingMember}
        onSave={handleSaveMember}
        primaryMemberId={primaryMemberId}
      />
    </Box>
  );
}