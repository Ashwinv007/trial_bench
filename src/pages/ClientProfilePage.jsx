import React from 'react';
import Sidebar from '../components/Sidebar';
import ClientProfile from '../components/ClientProfile';

function ClientProfilePage() {
  return (
    <div style={{display:'flex',height:'100vh'}}>
      <Sidebar/>
      <ClientProfile/>
    </div>
  );
}

export default ClientProfilePage;