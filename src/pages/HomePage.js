import React, { useContext } from 'react';
import { Button, Typography, Container, Box } from '@mui/material';
import { FirebaseContext } from '../store/Context';
import { signOut } from 'firebase/auth';

function HomePage() {
  const { auth } = useContext(FirebaseContext);

  const handleLogout = () => {
    signOut(auth);
  };

  return (
    <Container>
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Welcome to the Dashboard
        </Typography>
        <Typography variant="body1">
          This is the main application page. You are logged in.
        </Typography>
        <Button 
          variant="contained" 
          onClick={handleLogout} 
          sx={{ mt: 2 }}
        >
          Logout
        </Button>
      </Box>
    </Container>
  );
}

export default HomePage;