import React from 'react';
import Sidebar from '../components/Sidebar';
import PastMembersPageComponent from '../components/PastMembersPage';


function PastMembersPage() {
  return (
     <div style={{display:'flex',height:'100vh'}}>
          <Sidebar/>
          <PastMembersPageComponent/>
        </div>
  );
}

export default PastMembersPage;
