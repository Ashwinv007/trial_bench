import React from 'react';
import Sidebar from '../components/Sidebar';
import EditLead from '../components/EditLead';

function EditLeadPage() {
  return (
    <div style={{display:'flex',height:'100vh'}}>
      <Sidebar/>
      <EditLead/>
    </div>
  );
}

export default EditLeadPage;
