import React, { useContext } from 'react';
import { FirebaseContext } from '../store/Context';
import { signOut } from 'firebase/auth';
import Sidebar from '../components/Sidebar';
import Leads from '../components/Leads';
function LeadsPage() {
  const { auth } = useContext(FirebaseContext);

  const handleLogout = () => {
    signOut(auth);
  };

  return (
    <div style={{display:'flex',height:'100vh'}}>


    <Sidebar/>
    <Leads/>
    </div>
   
  );
}

export default LeadsPage;