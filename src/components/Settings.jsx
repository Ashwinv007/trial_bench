import React, { useState, useEffect } from 'react';
import styles from './Settings.module.css';
import { Button, TextField, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Checkbox, FormControlLabel, Chip, Tooltip, Select, MenuItem, DialogContentText } from '@mui/material';
import { AddCircleOutline, Edit, Delete, Close } from '@mui/icons-material';
import { db } from '../firebase/config';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { toast } from 'sonner';

const allPermissions = [
    'all',
    'view_leads', 'edit_leads', 'delete_leads',
    'view_members', 'edit_members', 'delete_members',
    'view_agreements', 'edit_agreements', 'delete_agreements',
    'view_invoices', 'edit_invoices', 'delete_invoices',
    'view_expenses', 'edit_expenses', 'delete_expenses',
    'view_reports', 'view_settings'
];

const PermissionChips = ({ permissions }) => {
    const visibleCount = 3;
    const displayedPermissions = permissions.slice(0, visibleCount);
    const hiddenCount = permissions.length - visibleCount;
  
    return (
      <div className={styles.permissionChipsContainer}>
        {displayedPermissions.map(p => <Chip key={p} label={p.replace(/_/g, ' ')} size="small" />)}
        {hiddenCount > 0 && (
          <Tooltip title={permissions.slice(visibleCount).join(', ')}>
            <Chip label={`+${hiddenCount} more`} size="small" />
          </Tooltip>
        )}
      </div>
    );
  };

export default function Settings() {
  const [roles, setRoles] = useState([]);
  const [users, setUsers] = useState([]); // State for users
  const [isModalOpen, setIsModalOpen] = useState(false); // For Role Modal
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false); // For Add User Modal
  const [editingRole, setEditingRole] = useState(null);
  const [roleName, setRoleName] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const [newUserEmail, setNewUserEmail] = useState(''); // State for new user email
  const [newUserPassword, setNewUserPassword] = useState(''); // State for new user password

  const functions = getFunctions();
  const listUsers = httpsCallable(functions, 'listUsers');
  const setUserRole = httpsCallable(functions, 'setUserRole');
  const createUser = httpsCallable(functions, 'createUser'); // Initialize createUser callable

  const fetchUsersAndRoles = async () => {
    // Fetch Roles
    const rolesCollection = collection(db, 'roles');
    const rolesSnapshot = await getDocs(rolesCollection);
    const rolesList = rolesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setRoles(rolesList);

    // Fetch Users
    try {
      const result = await listUsers();
      const userList = result.data.users.map(user => {
        // Find the role that matches the user's custom claims
        const assignedRole = rolesList.find(role => {
          if (!user.customClaims) return false;
          // Check if every permission in the role is a claim for the user
          // This is a simplified check; a more robust one would compare all claims
          return role.permissions.every(p => user.customClaims[p]);
        });
        return { ...user, roleId: assignedRole ? assignedRole.id : '' };
      });
      setUsers(userList);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error(error.message || "Failed to fetch users.");
    }
  };

  useEffect(() => {
    fetchUsersAndRoles();
  }, []);

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

  const handleSaveRole = async () => {
    if (!roleName) {
      toast.error('Role name cannot be empty');
      return;
    }

    if (editingRole) {
      const roleDoc = doc(db, 'roles', editingRole.id);
      await updateDoc(roleDoc, { name: roleName, permissions: selectedPermissions });
      toast.success('Role updated successfully');
    } else {
      await addDoc(collection(db, 'roles'), { name: roleName, permissions: selectedPermissions });
      toast.success('Role added successfully');
    }

    fetchUsersAndRoles(); // Refetch both users and roles
    handleCloseModal();
  };
  
  const handleDeleteRole = async (id) => {
    if (window.confirm('Are you sure you want to delete this role?')) {
      await deleteDoc(doc(db, 'roles', id));
      fetchUsersAndRoles(); // Refetch both users and roles
      toast.success('Role deleted successfully');
    }
  };

  const handlePermissionChange = (permission) => {
    if (permission === 'all') {
        if (selectedPermissions.includes('all')) {
            setSelectedPermissions([]);
        } else {
            setSelectedPermissions(allPermissions);
        }
    } else {
        setSelectedPermissions(prev => 
            prev.includes(permission) 
              ? prev.filter(p => p !== permission && p !== 'all') 
              : [...prev, permission]
          );
    }
  };

  const handleAssignRole = async (userEmail, roleId) => {
    try {
      const result = await setUserRole({ email: userEmail, roleId: roleId });
      toast.success(result.data.message);
      fetchUsersAndRoles(); // Refresh the user list to show the new role
    } catch (error) {
      console.error("Error assigning role:", error);
      toast.error(error.message || "Failed to assign role.");
    }
  };

  const handleOpenAddUserModal = () => {
    setNewUserEmail('');
    setNewUserPassword('');
    setIsAddUserModalOpen(true);
  };

  const handleCloseAddUserModal = () => {
    setIsAddUserModalOpen(false);
  };

  const handleCreateUser = async () => {
    if (!newUserEmail || !newUserPassword) {
      toast.error('Email and password cannot be empty');
      return;
    }
    try {
      const result = await createUser({ email: newUserEmail, password: newUserPassword });
      toast.success(result.data.message);
      fetchUsersAndRoles(); // Refresh user list
      handleCloseAddUserModal();
    } catch (error) {
      console.error("Error creating user:", error);
      toast.error(error.message || "Failed to create user.");
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
            <h1>Settings</h1>
            <p className={styles.subtitle}>Manage user roles, permissions, and assignments.</p>
        </div>
        <div className={styles.headerButtons}>
            <Button
              variant="contained"
              className={styles.addButton}
              startIcon={<AddCircleOutline />}
              onClick={() => handleOpenModal()}
              sx={{ mr: 1 }} // Add some margin
            >
              Add Role
            </Button>
            <Button
              variant="contained"
              className={styles.addButton}
              startIcon={<AddCircleOutline />}
              onClick={handleOpenAddUserModal}
            >
              Add User
            </Button>
        </div>
      </div>
      <div className={styles.content}>
        {/* Role Management Section */}
        <div className={styles.rolesSection}>
          <h2>Role Management</h2>
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
                    <td><PermissionChips permissions={role.permissions} /></td>
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

        {/* User Management Section */}
        <div className={styles.rolesSection} style={{ marginTop: '40px' }}>
          <h2>User Management</h2>
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>User Email</th>
                  <th>Assigned Role</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.uid}>
                    <td>{user.email}</td>
                    <td>
                      <Select
                        value={user.roleId || ''}
                        onChange={(e) => handleAssignRole(user.email, e.target.value)}
                        displayEmpty
                        size="small"
                        sx={{ minWidth: 150 }}
                      >
                        <MenuItem value=""><em>None</em></MenuItem>
                        {roles.map((role) => (
                          <MenuItem key={role.id} value={role.id}>
                            {role.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Role Management Dialog */}
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
                    checked={selectedPermissions.includes(permission)}
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

      {/* Add User Dialog */}
      <Dialog open={isAddUserModalOpen} onClose={handleCloseAddUserModal} maxWidth="sm" fullWidth>
        <DialogTitle>
            Add New User
            <IconButton
                onClick={handleCloseAddUserModal}
                className={styles.closeButton}
            >
                <Close />
            </IconButton>
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Enter the email and a temporary password for the new user.
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            label="Email"
            type="email"
            fullWidth
            variant="outlined"
            value={newUserEmail}
            onChange={(e) => setNewUserEmail(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Password"
            type="password"
            fullWidth
            variant="outlined"
            value={newUserPassword}
            onChange={(e) => setNewUserPassword(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
            <div className={styles.modalActions}>
                <Button onClick={handleCloseAddUserModal}>Cancel</Button>
                <Button onClick={handleCreateUser} className={styles.saveButton} variant="contained">Add User</Button>
            </div>
        </DialogActions>
      </Dialog>
    </div>
  );
}