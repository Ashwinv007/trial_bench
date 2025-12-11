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
        backgroundColor: 'var(--color-gray-50)'
      }}
    >
      <Card 
        sx={{ 
          maxWidth: 400, 
          width: '100%', 
          mx: 2,
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--color-gray-200)'
        }}
      >
        <CardContent sx={{ p: 4 }}>
          <Stack spacing={3}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Typography 
                variant="h6" 
                sx={{ 
                  color: 'var(--color-navy)',
                  fontWeight: 'var(--font-weight-semibold)'
                }}
              >
                Trial Bench
              </Typography>
            </Box>

            <Typography 
              variant="h4" 
              component="h1"
              sx={{ 
                fontWeight: 'var(--font-weight-semibold)',
                color: 'var(--color-navy)'
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
                      color: 'var(--color-gray-600)',
                      fontWeight: 'var(--font-weight-medium)'
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
                        backgroundColor: 'var(--color-white)',
                        borderRadius: 'var(--radius-sm)',
                        '&:hover fieldset': {
                          borderColor: 'var(--color-teal)',
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
                      color: 'var(--color-gray-600)',
                      fontWeight: 'var(--font-weight-medium)'
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
                        backgroundColor: 'var(--color-white)',
                        borderRadius: 'var(--radius-sm)',
                        '&:hover fieldset': {
                          borderColor: 'var(--color-teal)',
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
                    backgroundColor: 'var(--color-navy)',
                    borderRadius: 'var(--radius-sm)',
                    textTransform: 'none',
                    fontSize: 'var(--font-size-lg)',
                    fontWeight: 'var(--font-weight-medium)',
                    boxShadow: 'none',
                    '&:hover': {
                      backgroundColor: 'var(--color-teal-dark)',
                      boxShadow: 'none',
                    },
                  }}
                >
                  Sign in
                </Button>

               
              </Stack>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}

export default LoginPage;