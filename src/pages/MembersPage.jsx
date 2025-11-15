import React, { useContext } from 'react';
import { FirebaseContext } from '../store/Context';
import { signOut } from 'firebase/auth';
import Sidebar from '../components/Sidebar';
import MembersComponent from '../components/MembersPage';
function MembersPage() {
  const { auth } = useContext(FirebaseContext);

  const handleLogout = () => {
    signOut(auth);
  };

  return (
    <div style={{display:'flex',height:'100vh'}}>


    <Sidebar/>
    <MembersComponent/>
    </div>
   
  );
}

export default MembersPage;