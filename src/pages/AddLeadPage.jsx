import React, { useContext } from 'react';
import { FirebaseContext } from '../store/Context';
import { signOut } from 'firebase/auth';
import Sidebar from '../components/Sidebar';
import AddLead from '../components/AddLead';
function AddLeadPage() {
  const { auth } = useContext(FirebaseContext);

  const handleLogout = () => {
    signOut(auth);
  };

  return (
    <div style={{display:'flex',height:'100vh'}}>


    <Sidebar/>
    <AddLead/>
    </div>
   
  );
}

export default AddLeadPage;