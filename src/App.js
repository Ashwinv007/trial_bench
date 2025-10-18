import Box from '@mui/material/Box';
import {LoginForm} from './components/LoginForm';
import {ForgotPassword} from './components/ForgotPassword'

function App() {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: '#f0f2f5'
      }}
    >
      <LoginForm />
    </Box>
  );
}

export default App;