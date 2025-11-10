import React from 'react';
import Sidebar from '../components/Sidebar';
import Settings from '../components/Settings';

export default function SettingsPage() {
  return (
    <div style={{ display: 'flex' }}>
      <Sidebar />
      <Settings />
    </div>
  );
}