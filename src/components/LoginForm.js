import { useState } from 'react';
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
import { Star } from 'lucide-react';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Login attempt with:', { email, password });
    // Add your login logic here
  };

  return (
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
          {/* Logo/Brand */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            {/* <Star size={20} fill="#1976d2" color="#1976d2" /> */}
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

          {/* Title */}
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

          {/* Form */}
          <Box component="form" onSubmit={handleSubmit}>
            <Stack spacing={2.5}>
              {/* Email Field */}
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

              {/* Password Field */}
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

              {/* Sign In Button */}
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

              {/* Forgot Password Link */}
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
  );
}
