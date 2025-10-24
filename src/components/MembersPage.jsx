import React, { useState, useMemo, useContext, useEffect } from 'react';
import { FirebaseContext } from '../store/Context';
import { collection, getDocs, addDoc } from 'firebase/firestore';
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
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import AddIcon from '@mui/icons-material/Add';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import MemberModal from './MemberModal';

export default function MembersPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [packageFilter, setPackageFilter] = useState('All Packages');
  const [dateFilter, setDateFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [editingIndex, setEditingIndex] = useState(null);

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

  const formatDateForDisplay = (dateString) => {
    if (!dateString) return '';
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
  };

  const handleOpenAddModal = () => {
    setEditingMember(null);
    setEditingIndex(null);
    setModalOpen(true);
  };

  const handleOpenEditModal = (member, index) => {
    setEditingMember(member);
    setEditingIndex(index);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingMember(null);
    setEditingIndex(null);
  };

  const handleSaveMember = async (memberData) => {
    if (editingIndex !== null) {
      // Edit existing member
      const updatedMembers = [...allMembers];
      updatedMembers[editingIndex] = memberData;
      setAllMembers(updatedMembers);
    } else {
      // Add new member
      try {
        const docRef = await addDoc(collection(db, "members"), memberData);
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
          member.name.toLowerCase().includes(query) ||
          member.email.toLowerCase().includes(query) ||
          member.whatsapp.toLowerCase().includes(query)
      );
    }

    // Package filter
    if (packageFilter !== 'All Packages') {
      filtered = filtered.filter((member) => member.package === packageFilter);
    }

    // Date filter
    if (dateFilter.trim()) {
      filtered = filtered.filter((member) => {
        if (!member.dob) return false;
        const [year, month, day] = member.dob.split('-');
        const formattedDob = `${day}/${month}/${year}`;
        return formattedDob.includes(dateFilter);
      });
    }

    return filtered;
  }, [searchQuery, packageFilter, dateFilter, allMembers]);

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
              setDateFilter('');
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
          <TextField
            placeholder="DD/MM/YYYY"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            size="small"
            sx={{
              width: '180px',
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
            InputLabelProps={{
              shrink: true,
            }}
          />
          <Button
            variant="contained"
            startIcon={<AddIcon />}
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
            onClick={handleOpenAddModal}
          >
            Add Member
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
                  DOB
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
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredMembers.length > 0 ? (
                filteredMembers.map((member, index) => (
                  <TableRow
                    key={index}
                    onClick={() => handleOpenEditModal(member, member.originalIndex)}
                    sx={{
                      cursor: 'pointer',
                      '&:hover': {
                        bgcolor: 'rgba(43, 122, 142, 0.08)',
                      },
                    }}
                  >
                    <TableCell
                      sx={{
                        fontSize: '14px',
                        color: '#212121',
                        borderBottom: '1px solid #e0e0e0',
                        py: 2.5,
                      }}
                    >
                      {member.name}
                    </TableCell>
                    <TableCell
                      sx={{
                        fontSize: '14px',
                        borderBottom: '1px solid #e0e0e0',
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <FiberManualRecordIcon
                          sx={{
                            fontSize: '8px',
                            color: '#2b7a8e',
                          }}
                        />
                        <span style={{ color: '#424242' }}>{member.package}</span>
                      </Box>
                    </TableCell>
                    <TableCell
                      sx={{
                        fontSize: '14px',
                        color: '#424242',
                        borderBottom: '1px solid #e0e0e0',
                      }}
                    >
                      {member.company}
                    </TableCell>
                    <TableCell
                      sx={{
                        fontSize: '14px',
                        color: '#424242',
                        borderBottom: '1px solid #e0e0e0',
                      }}
                    >
                      {formatDateForDisplay(member.dob)}
                    </TableCell>
                    <TableCell
                      sx={{
                        fontSize: '14px',
                        color: '#424242',
                        borderBottom: '1px solid #e0e0e0',
                      }}
                    >
                      {member.whatsapp}
                    </TableCell>
                    <TableCell
                      sx={{
                        fontSize: '14px',
                        color: '#424242',
                        borderBottom: '1px solid #e0e0e0',
                      }}
                    >
                      {member.email}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={6}
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
        member={editingMember}
        onSave={handleSaveMember}
      />
    </Box>
  );
}