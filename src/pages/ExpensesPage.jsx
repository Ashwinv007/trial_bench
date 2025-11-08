import React from 'react';
import Sidebar from '../components/Sidebar';
import Expenses from '../components/Expenses';
function EditLeadPage() {
  return (
    <div style={{display:'flex',height:'100vh'}}>
      <Sidebar/>
      <Expenses/>
    </div>
  );
}

export default EditLeadPage;
