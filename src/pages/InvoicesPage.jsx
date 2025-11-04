import React from 'react';
import Sidebar from '../components/Sidebar';
import Invoices from '../components/Invoices';
function EditLeadPage() {
  return (
    <div style={{display:'flex',height:'100vh'}}>
      <Sidebar/>
      <Invoices/>
    </div>
  );
}

export default EditLeadPage;
