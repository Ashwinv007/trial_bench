import React, { useState, useEffect, useContext } from 'react';
import { FirebaseContext } from '../store/Context';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import {
  Box,
  Typography,
  CircularProgress,
  Paper,
  List,
  ListItem,
  ListItemText,
  Divider,
  Chip,
} from '@mui/material';
import { AccessTime, Person, InfoOutlined } from '@mui/icons-material';
import { usePermissions } from '../auth/usePermissions';

// Helper to format the action key into a readable title
const formatActionTitle = (action) => {
  if (!action) return 'Activity';
  return action
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export default function Logs() {
  const { db } = useContext(FirebaseContext);
  const { hasPermission } = usePermissions();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchLogs = async () => {
      if (!hasPermission('logs:view')) return;
      try {
        setLoading(true);
        setError(null);
        
        // Query the new centralized 'logs' collection
        const logsCollectionRef = collection(db, 'logs');
        const q = query(logsCollectionRef, orderBy('timestamp', 'desc'), limit(100));
        
        const querySnapshot = await getDocs(q);

        const fetchedLogs = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            // Convert Firestore Timestamp to JS Date object
            timestamp: data.timestamp ? data.timestamp.toDate() : new Date(),
          };
        });

        setLogs(fetchedLogs);
      } catch (err) {
        console.error("Error fetching logs:", err);
        setError("Failed to load logs. The 'logs' collection may not exist yet or requires an index.");
      } finally {
        setLoading(false);
      }
    };

    if (db) {
      fetchLogs();
    }
  }, [db, hasPermission]);

  if (!hasPermission('logs:view')) {
    return (
        <Box sx={{ p: { xs: 2, sm: 3 }, flex: 1, overflowY: 'auto' }}>
            <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 4, fontWeight: 'bold', color: '#333' }}>
                Permission Denied
            </Typography>
            <Typography>You do not have permission to view this page.</Typography>
        </Box>
    );
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ textAlign: 'center', mt: 4, p: { xs: 2, sm: 3 } }}>
        <Typography color="error" variant="h6">Error Loading Logs</Typography>
        <Typography color="text.secondary">{error}</Typography>
        <Typography color="text.secondary" sx={{mt: 1}}>
          Note: Firestore queries with `orderBy` may require creating a composite index. Check your browser's developer console for a link to create it.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, flex: 1, overflowY: 'auto' }}>
      <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 4, fontWeight: 'bold', color: '#333' }}>
        Platform Activity Logs
      </Typography>

      <Paper elevation={3} sx={{ p: { xs: 1, sm: 2 }, borderRadius: '8px' }}>
        {logs.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
            <InfoOutlined sx={{ fontSize: 40, mb: 1 }} />
            <Typography variant="h6">No activity logs found.</Typography>
            <Typography variant="body2">Perform actions like adding members or leads to see activity here.</Typography>
          </Box>
        ) : (
          <List>
            {logs.map((log, index) => (
              <React.Fragment key={log.id}>
                <ListItem alignItems="flex-start">
                  <ListItemText
                    primary={
                      <Box sx={{ 
                        display: 'flex', 
                        alignItems: { xs: 'flex-start', sm: 'center' }, 
                        flexDirection: { xs: 'column', sm: 'row' },
                        mb: 1 
                      }}>
                        <Chip 
                          label={formatActionTitle(log.action)} 
                          size="small" 
                          sx={{ 
                            mr: { sm: 2 },
                            mb: { xs: 1, sm: 0 },
                            fontWeight: 'bold',
                            backgroundColor: '#e0e0e0'
                          }} 
                        />
                        <Typography
                          component="span"
                          variant="body1"
                          color="text.primary"
                        >
                          {log.message}
                        </Typography>
                      </Box>
                    }
                    secondary={
                      <Box sx={{ 
                        display: 'flex', 
                        alignItems: { xs: 'flex-start', sm: 'center' },
                        flexDirection: { xs: 'column', sm: 'row' },
                        mt: 1, 
                        color: 'text.disabled' 
                      }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: { xs: 0.5, sm: 0 } }}>
                          <AccessTime sx={{ fontSize: 16, mr: 0.5 }} />
                          <Typography variant="caption" sx={{ mr: { sm: 2 } }}>
                            {log.timestamp.toLocaleString()}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Person sx={{ fontSize: 16, mr: 0.5 }} />
                          <Typography variant="caption">
                            {log.user?.displayName || 'Unknown User'}
                          </Typography>
                        </Box>
                      </Box>
                    }
                  />
                </ListItem>
                {index < logs.length - 1 && <Divider component="li" />}
              </React.Fragment>
            ))}
          </List>
        )}
      </Paper>
    </Box>
  );
}
