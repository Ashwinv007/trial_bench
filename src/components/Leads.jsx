import { AddCircleOutline, Person, Delete, UploadFile } from '@mui/icons-material';
import styles from './Leads.module.css';
import { useContext, useMemo, useState } from 'react';

import { FirebaseContext, AuthContext } from '../store/Context'; // Keep FirebaseContext for db operations
import { doc, deleteDoc } from 'firebase/firestore'; 
import { useNavigate } from 'react-router-dom';
import { usePermissions } from '../auth/usePermissions';
import { useData } from '../store/DataContext'; // Corrected import
import { logActivity } from '../utils/logActivity';


import { toast } from 'sonner';
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

  const { db } = useContext(FirebaseContext); // Get db from FirebaseContext
  const { user } = useContext(AuthContext);
  const { leads, loading, refreshing, refreshData } = useData(); // Use leads, loading, refreshing, refreshData from DataContext

  const { hasPermission } = usePermissions();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Statuses');
  const [purposeFilter, setPurposeFilter] = useState('All Purposes');
  const [dateFilter, setDateFilter] = useState('All Time');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  
  const purposeOptions = [
    "Dedicated Desk",
    "Flexible Desk",
    "Private Cabin",
    "Virtual Office",
    "Meeting Room",
    "Day Pass",
  ];

  const filteredLeads = useMemo(() => {
    let currentLeads = leads; 

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      currentLeads = currentLeads.filter(
        (lead) =>
          (lead.name && lead.name.toLowerCase().includes(query)) ||
          (lead.phone && lead.phone.toLowerCase().includes(query)) ||
          (lead.convertedWhatsapp && lead.convertedWhatsapp.toLowerCase().includes(query))
      );
    }

    if (statusFilter !== 'All Statuses') {
      currentLeads = currentLeads.filter((lead) => lead.status === statusFilter);
    }

    if (purposeFilter !== 'All Purposes') {
      if (purposeFilter === 'Others') {
        currentLeads = currentLeads.filter(
          (lead) => !purposeOptions.includes(lead.purposeOfVisit)
        );
      } else {
        currentLeads = currentLeads.filter(
          (lead) => lead.purposeOfVisit === purposeFilter
        );
      }
    }

    if (dateFilter !== 'All Time') {
      currentLeads = currentLeads.filter(lead => {
        if (!lead.createdAt || typeof lead.createdAt.toDate !== 'function') {
          return false;
        }
        const leadDate = lead.createdAt.toDate();
        const today = new Date();

        if (dateFilter === 'This Week') {
          const oneWeekAgo = new Date();
          oneWeekAgo.setDate(today.getDate() - 7);
          return leadDate >= oneWeekAgo;
        }
        if (dateFilter === 'This Month') {
          const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
          return leadDate >= startOfMonth;
        }
        return true;
      });
    }

    return currentLeads.sort((a, b) => {
      const getDate = (field) => {
        if (field) {
          if (typeof field.toDate === 'function') { 
            return field.toDate();
          }
          if (typeof field === 'string') { 
            return new Date(field);
          }
        }
        return null;
      };

      let dateA = getDate(a.lastEditedAt || a.createdAt);
      let dateB = getDate(b.lastEditedAt || b.createdAt);

      if (dateA && dateB) {
        return dateB.getTime() - dateA.getTime();
      }
      if (dateA) return -1; 
      if (dateB) return 1; 
      return 0;
    });
  }, [leads, searchQuery, statusFilter, purposeFilter, dateFilter, purposeOptions]); 

  const getStatusClass = (status) => {
    if (!status) return '';
    return status.toLowerCase().replace(' ', '-');
  };

  const handleDelete = async (leadId) => {
    if (window.confirm('Are you sure you want to delete this lead?')) {
      setIsDeleting(true);
      try {
        await deleteDoc(doc(db, 'leads', leadId)); 
        refreshData('leads'); 
        toast.success('Lead deleted successfully');
      } catch (error) {
        console.error("Error deleting lead:", error);
        toast.error("Failed to delete lead.");
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
  
  const handleExport = async () => {
    if (!hasPermission('leads:export')) {
        toast.error("You don't have permission to export leads.");
        return;
    }
    setIsExporting(true);
    try {
        const XLSX = await import('xlsx');
        const dataToExport = filteredLeads.map(lead => ({
          'Name': lead.name,
          'Status': lead.status,
          'Purpose of Visit': lead.purposeOfVisit,
          'Phone': lead.phone,
          'Whatsapp': lead.convertedWhatsapp,
          'Source': `${lead.sourceType}${lead.sourceDetail ? ` (${lead.sourceDetail})` : ''}`
        }));

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Leads");
        XLSX.writeFile(wb, "leads.xlsx");
        logActivity(
            db,
            user,
            'leads_exported',
            `Exported ${dataToExport.length} leads.`,
            {
                count: dataToExport.length,
                filters: {
                    status: statusFilter,
                    purpose: purposeFilter,
                    date: dateFilter,
                    search: searchQuery
                }
            }
        );
    } catch (error) {
        console.error("Error exporting leads:", error);
        toast.error("Failed to export leads.");
    } finally {
        setIsExporting(false);
    }
  };

  if (!hasPermission('leads:view')) {
    return (
        <Box sx={{ flex: 1, bgcolor: '#fafafa', minHeight: '100vh', overflow: 'auto' }}>
            <Box sx={{ p: { xs: 2, sm: '32px 40px' }, bgcolor: '#ffffff', borderBottom: '1px solid #e0e0e0' }}>
                <Typography sx={{ fontSize: { xs: '24px', sm: '28px' }, fontWeight: 600, color: '#1a4d5c', mb: 0.5 }}>
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
      <Box sx={{ p: { xs: 2, sm: '32px 40px' }, bgcolor: '#ffffff', borderBottom: '1px solid #e0e0e0' }}>
        <Typography sx={{ fontSize: { xs: '24px', sm: '28px' }, fontWeight: 600, color: '#1a4d5c', mb: 0.5 }}>
          Leads
        </Typography>
        <Typography sx={{ fontSize: '14px', color: '#2b7a8e' }}>
          Manage your Leads and followUps.
        </Typography>
      </Box>

      <Box sx={{ p: { xs: 2, sm: '32px 40px' } }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 2, mb: 3 }}>
            <Box sx={{ flex: '1 1 300px' }}>
                <TextField
                  fullWidth
                  placeholder="Search leads..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  size="small"
                  sx={{ bgcolor: '#ffffff', '& .MuiOutlinedInput-root': { fontSize: '14px', '& fieldset': { borderColor: '#e0e0e0' }, '&:hover fieldset': { borderColor: '#2b7a8e' }, '&.Mui-focused fieldset': { borderColor: '#2b7a8e' } } }}
                  InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon sx={{ color: '#9e9e9e', fontSize: '20px' }} /></InputAdornment>) }}
                />
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, justifyContent: 'flex-end' }}>
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  size="small"
                  sx={{ minWidth: 150, bgcolor: '#ffffff', fontSize: '14px', '& .MuiOutlinedInput-notchedOutline': { borderColor: '#e0e0e0' }, '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#2b7a8e' }, '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#2b7a8e' } } }
                >
                  <MenuItem value="All Statuses">All Statuses</MenuItem>
                  <MenuItem value="New">New</MenuItem>
                  <MenuItem value="Follow Up">Follow Up</MenuItem>
                  <MenuItem value="Converted">Converted</MenuItem>
                  <MenuItem value="Not Interested">Not Interested</MenuItem>
                </Select>
                <Select
                  value={purposeFilter}
                  onChange={(e) => setPurposeFilter(e.target.value)}
                  size="small"
                  sx={{ minWidth: 150, bgcolor: '#ffffff', fontSize: '14px', '& .MuiOutlinedInput-notchedOutline': { borderColor: '#e0e0e0' }, '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#2b7a8e' }, '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#2b7a8e' } } }
                >
                  <MenuItem value="All Purposes">All Purposes</MenuItem>
                  {purposeOptions.map(option => <MenuItem key={option} value={option}>{option}</MenuItem>)}
                  <MenuItem value="Others">Others</MenuItem>
                </Select>
                <Select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  size="small"
                  sx={{ minWidth: 150, bgcolor: '#ffffff', fontSize: '14px', '& .MuiOutlinedInput-notchedOutline': { borderColor: '#e0e0e0' }, '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#2b7a8e' }, '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#2b7a8e' } } }
                >
                  <MenuItem value="All Time">All Time</MenuItem>
                  <MenuItem value="This Week">This Week</MenuItem>
                  <MenuItem value="This Month">This Month</MenuItem>
                </Select>
                <Button
                    variant="outlined"
                    startIcon={<FilterListIcon />}
                    onClick={() => {
                      setSearchQuery('');
                      setStatusFilter('All Statuses');
                      setPurposeFilter('All Purposes');
                      setDateFilter('All Time');
                    }}
                    sx={{ textTransform: 'none', fontSize: '14px', color: '#424242', borderColor: '#e0e0e0', bgcolor: '#ffffff', px: 2, '&:hover': { borderColor: '#2b7a8e', bgcolor: '#ffffff' } }}
                >
                  Clear
                </Button>
                {hasPermission('leads:export') && (
                  <Button
                      variant="contained"
                      startIcon={isExporting ? <CircularProgress size={20} color="inherit" /> : <UploadFile />}
                      sx={{ textTransform: 'none', fontSize: '14px', bgcolor: '#2b7a8e', px: 3, boxShadow: 'none', '&:hover': { bgcolor: '#1a4d5c', boxShadow: 'none' } }}
                      onClick={handleExport}
                      disabled={isExporting}
                  >
                      {isExporting ? 'Exporting...' : 'Export'}
                  </Button>
                )}
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
        </Box>

        <TableContainer component={Paper} sx={{ boxShadow: 'none', border: '1px solid #e0e0e0', borderRadius: '8px' }}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#fafafa' }}>
                <TableCell sx={{ fontSize: '13px', fontWeight: 600, color: '#424242', borderBottom: '1px solid #e0e0e0', py: 2 }}>Name</TableCell>
                <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' }, fontSize: '13px', fontWeight: 600, color: '#424242', borderBottom: '1px solid #e0e0e0' }}>Status</TableCell>
                <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' }, fontSize: '13px', fontWeight: 600, color: '#424242', borderBottom: '1px solid #e0e0e0' }}>Purpose</TableCell>
                <TableCell sx={{ display: { xs: 'none', md: 'table-cell' }, fontSize: '13px', fontWeight: 600, color: '#424242', borderBottom: '1px solid #e0e0e0' }}>Phone</TableCell>
                <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' }, fontSize: '13px', fontWeight: 600, color: '#424242', borderBottom: '1px solid #e0e0e0' }}>Whatsapp</TableCell>
                <TableCell sx={{ display: { xs: 'none', md: 'table-cell' }, fontSize: '13px', fontWeight: 600, color: '#424242', borderBottom: '1px solid #e0e0e0' }}>Source</TableCell>
                <TableCell sx={{ fontSize: '13px', fontWeight: 600, color: '#424242', borderBottom: '1px solid #e0e0e0', width: { xs: '1%' }, px: { xs: 1 } }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading.leads || refreshing.leads ? (
                <TableRow>
                  <TableCell colSpan={7} sx={{ textAlign: 'center', py: 4 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : filteredLeads.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} sx={{ textAlign: 'center', py: 4, fontSize: '14px', color: '#757575' }}>
                    No leads found matching your filters.
                  </TableCell>
                </TableRow>
              ) : (
                filteredLeads.map((lead) => (
                  <TableRow key={lead.id} sx={{ '&:hover': { backgroundColor: '#f5f5f5' }, cursor: hasPermission('leads:edit') ? 'pointer' : 'default' }}>
                    <TableCell onClick={() => handleRowClick(lead.id)}>
                      <Typography component="span" title={lead.name} sx={{ fontSize: '14px', color: '#424242', display: 'block', maxWidth: { sm: 120, md: 180 }, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {lead.name}
                      </Typography>
                    </TableCell>
                    <TableCell onClick={() => handleRowClick(lead.id)} sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                      <span className={`${styles.statusBadge} ${styles[getStatusClass(lead.status)]}`}>
                        {lead.status}
                      </span>
                    </TableCell>
                    <TableCell onClick={() => handleRowClick(lead.id)} sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Person sx={{ fontSize: '18px', color: '#9e9e9e' }} />
                        <Typography component="span" sx={{ fontSize: '14px', color: '#424242' }}>{lead.purposeOfVisit}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell onClick={() => handleRowClick(lead.id)} sx={{ display: { xs: 'none', md: 'table-cell' } }}><Typography component="span" sx={{ fontSize: '14px', color: '#424242' }}>{lead.phone}</Typography></TableCell>
                    <TableCell onClick={() => handleRowClick(lead.id)} sx={{ display: { xs: 'none', lg: 'table-cell' } }}><Typography component="span" sx={{ fontSize: '14px', color: '#424242' }}>{lead.convertedWhatsapp}</Typography></TableCell>
                    <TableCell onClick={() => handleRowClick(lead.id)} sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                      <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                        <Typography component="span" sx={{ fontSize: '14px', color: '#424242' }}>{lead.sourceType}</Typography>
                        <Typography component="span" sx={{ fontSize: '12px', color: '#757575' }}>{lead.sourceDetail}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ width: { xs: '1%' }, px: { xs: 1 } }}>
                      {hasPermission('leads:delete') && (
                        <IconButton color="error" onClick={(e) => { e.stopPropagation(); handleDelete(lead.id); }} disabled={isDeleting}>
                          {isDeleting ? <CircularProgress size={24} /> : <Delete />}
                        </IconButton>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

         <Typography sx={{ mt: 2, fontSize: '13px', color: '#757575' }}>
            {`Showing ${filteredLeads.length} of ${leads.length} leads`}
       </Typography>
      </Box>  
    </Box>
  );
}
