import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import ClientProfileModal from '../components/ClientProfileModal';

function ClientProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const handleClose = () => {
    navigate('/clients'); // Navigate back to the clients list on close
  };

  return (
    <div style={{display:'flex',height:'100vh'}}>
      <Sidebar/>
      <ClientProfileModal
        open={true}
        onClose={handleClose}
        clientId={id}
      />
    </div>
  );
}

export default ClientProfilePage;