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
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchLogs = async () => {
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
  }, [db]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ textAlign: 'center', mt: 4, p: 2 }}>
        <Typography color="error" variant="h6">Error Loading Logs</Typography>
        <Typography color="text.secondary">{error}</Typography>
        <Typography color="text.secondary" sx={{mt: 1}}>
          Note: Firestore queries with `orderBy` may require creating a composite index. Check your browser's developer console for a link to create it.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, flex: 1, overflowY: 'auto' }}>
      <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 4, fontWeight: 'bold', color: '#333' }}>
        Platform Activity Logs
      </Typography>

      <Paper elevation={3} sx={{ p: 2, borderRadius: '8px' }}>
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
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Chip 
                          label={formatActionTitle(log.action)} 
                          size="small" 
                          sx={{ 
                            mr: 2, 
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
                      <Box sx={{ display: 'flex', alignItems: 'center', mt: 1, color: 'text.disabled' }}>
                        <AccessTime sx={{ fontSize: 16, mr: 0.5 }} />
                        <Typography variant="caption" sx={{ mr: 2 }}>
                          {log.timestamp.toLocaleString()}
                        </Typography>
                        <Person sx={{ fontSize: 16, mr: 0.5 }} />
                        <Typography variant="caption">
                          {log.user?.displayName || 'Unknown User'}
                        </Typography>
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
