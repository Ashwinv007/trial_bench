import React, { useState } from 'react';
import styles from './Settings.module.css';
import { Button, TextField, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Checkbox, FormControlLabel } from '@mui/material';
import { AddCircleOutline, Edit, Delete, Close } from '@mui/icons-material';

const initialRoles = [
  { id: 1, name: 'Admin', permissions: ['all'] },
  { id: 2, name: 'Community Manager', permissions: ['view_leads', 'edit_leads', 'view_members'] },
  { id: 3, name: 'Accounts', permissions: ['view_invoices', 'edit_invoices', 'view_expenses'] },
];

const allPermissions = [
    'view_leads', 'edit_leads', 'delete_leads',
    'view_members', 'edit_members', 'delete_members',
    'view_agreements', 'edit_agreements', 'delete_agreements',
    'view_invoices', 'edit_invoices', 'delete_invoices',
    'view_expenses', 'edit_expenses', 'delete_expenses',
    'view_reports', 'view_settings'
];


export default function Settings() {
  const [roles, setRoles] = useState(initialRoles);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [roleName, setRoleName] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState([]);

  const handleOpenModal = (role = null) => {
    if (role) {
      setEditingRole(role);
      setRoleName(role.name);
      setSelectedPermissions(role.permissions);
    } else {
      setEditingRole(null);
      setRoleName('');
      setSelectedPermissions([]);
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleSaveRole = () => {
    // Logic to save role (add or update)
    handleCloseModal();
  };
  
  const handleDeleteRole = (id) => {
    // Logic to delete role
  };

  const handlePermissionChange = (permission) => {
    setSelectedPermissions(prev => 
      prev.includes(permission) 
        ? prev.filter(p => p !== permission) 
        : [...prev, permission]
    );
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
            <h1>Settings</h1>
            <p className={styles.subtitle}>Manage user roles and permissions.</p>
        </div>
        <div className={styles.headerButtons}>
            <Button
              variant="contained"
              className={styles.addButton}
              startIcon={<AddCircleOutline />}
              onClick={() => handleOpenModal()}
            >
              Add Role
            </Button>
        </div>
      </div>
      <div className={styles.content}>
        <div className={styles.rolesSection}>
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Role Name</th>
                  <th>Permissions</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {roles.map(role => (
                  <tr key={role.id}>
                    <td>{role.name}</td>
                    <td>{role.permissions.join(', ')}</td>
                    <td>
                      <IconButton className={styles.editButton} onClick={() => handleOpenModal(role)}>
                        <Edit />
                      </IconButton>
                      <IconButton className={styles.deleteButton} onClick={() => handleDeleteRole(role.id)}>
                        <Delete />
                      </IconButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Dialog open={isModalOpen} onClose={handleCloseModal} maxWidth="sm" fullWidth>
        <DialogTitle>
            {editingRole ? 'Edit Role' : 'Add New Role'}
            <IconButton
                onClick={handleCloseModal}
                className={styles.closeButton}
            >
                <Close />
            </IconButton>
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Role Name"
            type="text"
            fullWidth
            variant="outlined"
            value={roleName}
            onChange={(e) => setRoleName(e.target.value)}
          />
          <div className={styles.permissionsGrid}>
            {allPermissions.map(permission => (
              <FormControlLabel
                key={permission}
                control={
                  <Checkbox
                    checked={selectedPermissions.includes(permission) || selectedPermissions.includes('all')}
                    onChange={() => handlePermissionChange(permission)}
                    disabled={selectedPermissions.includes('all') && permission !== 'all'}
                  />
                }
                label={permission.replace(/_/g, ' ')}
              />
            ))}
          </div>
        </DialogContent>
        <DialogActions>
            <div className={styles.modalActions}>
                <Button onClick={handleCloseModal}>Cancel</Button>
                <Button onClick={handleSaveRole} className={styles.saveButton} variant="contained">Save</Button>
            </div>
        </DialogActions>
      </Dialog>
    </div>
  );
}