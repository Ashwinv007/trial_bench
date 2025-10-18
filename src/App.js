import Box from '@mui/material/Box';
import {LoginForm} from './components/LoginForm';
import { AuthContext, FirebaseContext } from './store/Context';
import React,{useEffect,useContext} from 'react';
import {BrowserRouter as Router, Routes, Route} from 'react-router-dom'

function App() {
  const {setUser}=useContext(AuthContext);
  const {firebase}=useContext(FirebaseContext)
  useEffect(()=>{
    firebase.auth().onAuthStateChanged((user)=>{
      setUser(user)
    })
    
  })
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
      <LoginForm />
    </Box>
  );
}

export default App;