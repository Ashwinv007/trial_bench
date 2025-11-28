import { AddCircleOutline, Person, Delete } from '@mui/icons-material';
import styles from './Leads.module.css';
import { useContext, useEffect, useState, useMemo } from 'react';
import { FirebaseContext } from '../store/Context';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { usePermissions } from '../auth/usePermissions';
import {
  Box,
  TextField,
  Button,
  InputAdornment,
  Select,
  MenuItem,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  CircularProgress
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';

export default function Leads() {
  const { db } = useContext(FirebaseContext);
  const { hasPermission } = usePermissions();
  const [leads, setLeads] = useState([]);
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Statuses'); // New state for status filter
  const [isDeleting, setIsDeleting] = useState(false);

  const filteredLeads = useMemo(() => {
    let currentLeads = leads; // Start with all fetched leads

    // Apply search query filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      currentLeads = currentLeads.filter(
        (lead) =>
          (lead.name && lead.name.toLowerCase().includes(query)) ||
          (lead.email && lead.email.toLowerCase().includes(query)) || // Assuming lead object has an email field
          (lead.convertedEmail && lead.convertedEmail.toLowerCase().includes(query)) || // Assuming lead object has a convertedEmail field
          (lead.phone && lead.phone.toLowerCase().includes(query)) ||
          (lead.convertedWhatsapp && lead.convertedWhatsapp.toLowerCase().includes(query))
      );
    }

    // Apply status filter
    if (statusFilter !== 'All Statuses') {
      currentLeads = currentLeads.filter((lead) => lead.status === statusFilter);
    }

    return currentLeads.sort((a, b) => {
      const getDate = (field) => {
        if (field) {
          if (typeof field.toDate === 'function') { // Check if it's a Firestore Timestamp
            return field.toDate();
          }
          if (typeof field === 'string') { // Check if it's an ISO date string
            return new Date(field);
          }
        }
        return null;
      };

      const dateA = getDate(a.lastEditedAt || a.createdAt);
      const dateB = getDate(b.lastEditedAt || b.createdAt);

      if (dateA && dateB) {
        return dateB.getTime() - dateA.getTime();
      }
      if (dateA) return -1; // a comes first if b has no date
      if (dateB) return 1; // b comes first if a has no date
      return 0;
    });
  }, [leads, searchQuery, statusFilter]);

  useEffect(() => {
    if (!hasPermission('leads:view')) return;
    if (db) {
      console.log('Database reference is available:', db);
      const fetchLeads = async () => {
        try {
          const leadsCollection = collection(db, 'leads');
          const leadsSnapshot = await getDocs(leadsCollection);
          const leadsData = leadsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setLeads(leadsData);
          console.log('Fetched leads:', leadsData);
        } catch (error) {
          console.error("Error fetching leads:", error);
        }
      };
      fetchLeads();
    }
  }, [db, hasPermission]);

  const getStatusClass = (status) => {
    if (!status) return '';
    return status.toLowerCase().replace(' ', '-');
  };

  const handleDelete = async (leadId) => {
    if (window.confirm('Are you sure you want to delete this lead?')) {
      setIsDeleting(true);
      try {
        await deleteDoc(doc(db, 'leads', leadId));
        setLeads(leads.filter(lead => lead.id !== leadId));
        console.log('Lead deleted successfully');
      } catch (error) {
        console.error("Error deleting lead:", error);
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const handleRowClick = (leadId) => {
    if (hasPermission('leads:edit')) {
      navigate(`/lead/${leadId}`);
    }
  };

  if (!hasPermission('leads:view')) {
    return (
        <Box sx={{ flex: 1, bgcolor: '#fafafa', minHeight: '100vh', overflow: 'auto' }}>
            <Box sx={{ p: '32px 40px', bgcolor: '#ffffff', borderBottom: '1px solid #e0e0e0' }}>
                <Typography sx={{ fontSize: '28px', fontWeight: 600, color: '#1a4d5c', mb: 0.5 }}>
                    Permission Denied
                </Typography>
                <Typography sx={{ fontSize: '14px', color: '#2b7a8e' }}>
                    You do not have permission to view this page.
                </Typography>
            </Box>
        </Box>
    );
  }

  return (
    <Box sx={{ flex: 1, bgcolor: '#fafafa', minHeight: '100vh', overflow: 'auto' }}>
      <Box sx={{ p: '32px 40px', bgcolor: '#ffffff', borderBottom: '1px solid #e0e0e0' }}>
        <Typography sx={{ fontSize: '28px', fontWeight: 600, color: '#1a4d5c', mb: 0.5 }}>
          Leads
        </Typography>
        <Typography sx={{ fontSize: '14px', color: '#2b7a8e' }}>
          Manage your Leads and followUps.
        </Typography>
      </Box>

      <Box sx={{ p: '32px 40px' }}>
        {/* Filter and Search Section */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'center' }}>
          <TextField
            placeholder="Search leads by name, email, or phone..."
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
              setStatusFilter('All Statuses');
            }}
            sx={{ textTransform: 'none', fontSize: '14px', color: '#424242', borderColor: '#e0e0e0', bgcolor: '#ffffff', px: 2, '&:hover': { borderColor: '#2b7a8e', bgcolor: '#ffffff' } }}
          >
            Clear
          </Button>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            size="small"
            sx={{ minWidth: '150px', bgcolor: '#ffffff', fontSize: '14px', '& .MuiOutlinedInput-notchedOutline': { borderColor: '#e0e0e0' }, '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#2b7a8e' }, '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#2b7a8e' } } }
          >
            <MenuItem value="All Statuses">All Statuses</MenuItem>
            <MenuItem value="New">New</MenuItem>
            <MenuItem value="Follow Up">Follow Up</MenuItem>
            <MenuItem value="Converted">Converted</MenuItem>
            <MenuItem value="Not Interested">Not Interested</MenuItem>
          </Select>
          {hasPermission('leads:add') && (
            <Button
              variant="contained"
              startIcon={<AddCircleOutline />}
              sx={{ textTransform: 'none', fontSize: '14px', bgcolor: '#2b7a8e', px: 3, boxShadow: 'none', '&:hover': { bgcolor: '#1a4d5c', boxShadow: 'none' } }}
              onClick={() => navigate('/add-lead')}
            >
              Add Lead
            </Button>
          )}
        </Box>

        {/* Table */}
        <TableContainer component={Paper} sx={{ boxShadow: 'none', border: '1px solid #e0e0e0', borderRadius: '8px' }}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#fafafa' }}>
                <TableCell sx={{ fontSize: '13px', fontWeight: 600, color: '#424242', borderBottom: '1px solid #e0e0e0', py: 2 }}>Name</TableCell>
                <TableCell sx={{ fontSize: '13px', fontWeight: 600, color: '#424242', borderBottom: '1px solid #e0e0e0' }}>Status</TableCell>
                <TableCell sx={{ fontSize: '13px', fontWeight: 600, color: '#424242', borderBottom: '1px solid #e0e0e0' }}>Purpose of Visit</TableCell>
                <TableCell sx={{ fontSize: '13px', fontWeight: 600, color: '#424242', borderBottom: '1px solid #e0e0e0' }}>Phone</TableCell>
                <TableCell sx={{ fontSize: '13px', fontWeight: 600, color: '#424242', borderBottom: '1px solid #e0e0e0' }}>Whatsapp</TableCell>
                <TableCell sx={{ fontSize: '13px', fontWeight: 600, color: '#424242', borderBottom: '1px solid #e0e0e0' }}>Email</TableCell>
                <TableCell sx={{ fontSize: '13px', fontWeight: 600, color: '#424242', borderBottom: '1px solid #e0e0e0' }}>Source</TableCell>
                <TableCell sx={{ fontSize: '13px', fontWeight: 600, color: '#424242', borderBottom: '1px solid #e0e0e0' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredLeads.map((lead) => (
                <TableRow key={lead.id} sx={{ '&:hover': { backgroundColor: '#f5f5f5' }, cursor: hasPermission('leads:edit') ? 'pointer' : 'default' }}>
                  <TableCell onClick={() => handleRowClick(lead.id)}>
                    <Typography component="span" sx={{ fontSize: '14px', color: '#424242' }}>{lead.name}</Typography>
                  </TableCell>
                  <TableCell onClick={() => handleRowClick(lead.id)}>
                    <span className={`${styles.statusBadge} ${styles[getStatusClass(lead.status)]}`}>
                      {lead.status}
                    </span>
                  </TableCell>
                  <TableCell onClick={() => handleRowClick(lead.id)}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Person sx={{ fontSize: '18px', color: '#9e9e9e' }} />
                      <Typography component="span" sx={{ fontSize: '14px', color: '#424242' }}>{lead.purposeOfVisit}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell onClick={() => handleRowClick(lead.id)}><Typography component="span" sx={{ fontSize: '14px', color: '#424242' }}>{lead.phone}</Typography></TableCell>
                  <TableCell onClick={() => handleRowClick(lead.id)}><Typography component="span" sx={{ fontSize: '14px', color: '#424242' }}>{lead.convertedWhatsapp}</Typography></TableCell>
                  <TableCell onClick={() => handleRowClick(lead.id)}><Typography component="span" sx={{ fontSize: '14px', color: '#424242' }}>{lead.ccEmail}</Typography></TableCell>
                  <TableCell onClick={() => handleRowClick(lead.id)}>
                    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                      <Typography component="span" sx={{ fontSize: '14px', color: '#424242' }}>{lead.sourceType}</Typography>
                      <Typography component="span" sx={{ fontSize: '12px', color: '#757575' }}>{lead.sourceDetail}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    {hasPermission('leads:delete') && (
                      <IconButton color="error" onClick={(e) => { e.stopPropagation(); handleDelete(lead.id); }} disabled={isDeleting}>
                        {isDeleting ? <CircularProgress size={24} /> : <Delete />}
                      </IconButton>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {filteredLeads.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} sx={{ textAlign: 'center', py: 4, fontSize: '14px', color: '#757575' }}>
                    No leads found matching your filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Summary of filtered leads */}
        <Typography sx={{ mt: 2, fontSize: '13px', color: '#757575' }}>
          Showing {filteredLeads.length} of {leads.length} leads
        </Typography>
      </Box>
    </Box>
  );
}


