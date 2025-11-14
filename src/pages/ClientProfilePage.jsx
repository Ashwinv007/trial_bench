import React from 'react';
import Sidebar from '../components/Sidebar';
import ClientProfileModal from '../components/ClientProfileModal';

function ClientProfilePage() {
  return (
    <div style={{display:'flex',height:'100vh'}}>
      <Sidebar/>
      <ClientProfileModal/>
    </div>
  );
}

export default ClientProfilePage;