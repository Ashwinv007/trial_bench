import React from 'react';
import Sidebar from '../components/Sidebar';
import Logs from '../components/Logs';

function LogsPage() {
  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <Sidebar />
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <Logs />
      </div>
    </div>
  );
}

export default LogsPage;
