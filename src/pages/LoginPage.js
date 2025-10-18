import { useContext, useState } from 'react';
import { FirebaseContext } from '../store/Context';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';

import { 
  Box, 
  TextField, 
  Button, 
  Typography, 
  Card, 
  CardContent,
  Link,
  Stack
} from '@mui/material';

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { auth } = useContext(FirebaseContext);
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    signInWithEmailAndPassword(auth, email, password).then(() => {
      navigate('/');
    }).catch((error) => {
      alert(error.message);
    });
  };

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: '#fbf9fa'
      }}
    >
      <Card 
        sx={{ 
          maxWidth: 400, 
          width: '100%', 
          mx: 2,
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          borderRadius: 2
        }}
      >
        <CardContent sx={{ p: 4 }}>
          <Stack spacing={3}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Typography 
                variant="h6" 
                sx={{ 
                  color: '#1976d2',
                  fontWeight: 600
                }}
              >
                Trial Bench
              </Typography>
            </Box>

            <Typography 
              variant="h4" 
              component="h1"
              sx={{ 
                fontWeight: 600,
                color: '#1a1a1a'
              }}
            >
              Sign in
            </Typography>

            <Box component="form" onSubmit={handleLogin}>
              <Stack spacing={2.5}>
                <Box>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      mb: 0.5,
                      color: '#333',
                      fontWeight: 500
                    }}
                  >
                    Email
                  </Typography>
                  <TextField
                    fullWidth
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    variant="outlined"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: '#fff',
                        '&:hover fieldset': {
                          borderColor: '#1976d2',
                        },
                      }
                    }}
                  />
                </Box>

                <Box>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      mb: 0.5,
                      color: '#333',
                      fontWeight: 500
                    }}
                  >
                    Password
                  </Typography>
                  <TextField
                    fullWidth
                    type="password"
                    placeholder="••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    variant="outlined"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: '#fff',
                        '&:hover fieldset': {
                          borderColor: '#1976d2',
                        },
                      }
                    }}
                  />
                </Box>

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  sx={{
                    py: 1.5,
                    mt: 1,
                    backgroundColor: '#1a1a2e',
                    textTransform: 'none',
                    fontSize: '1rem',
                    fontWeight: 500,
                    '&:hover': {
                      backgroundColor: '#0f0f1e',
                    },
                  }}
                >
                  Sign in
                </Button>

                <Box sx={{ textAlign: 'center' }}>
                  <Link
                    href="#"
                    underline="hover"
                    sx={{
                      color: '#666',
                      fontSize: '0.875rem',
                      '&:hover': {
                        color: '#1976d2',
                      },
                    }}
                  >
                    Forgot your password?
                  </Link>
                </Box>
              </Stack>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}

export default LoginPage;