import React, { useState, useEffect } from 'react';
import styles from './Settings.module.css';
import { Button, TextField, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Checkbox, FormControlLabel, Chip, Tooltip, Select, MenuItem, DialogContentText, CircularProgress } from '@mui/material';
import { AddCircleOutline, Edit, Delete, Close, LockReset } from '@mui/icons-material';
import { db } from '../firebase/config';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { toast } from 'sonner';

const allPermissions = [
    'all',
    'view_leads', 'add_leads', 'edit_leads', 'delete_leads',
    'view_members', 'add_members', 'edit_members', 'delete_members', 'export_members',
    'view_agreements', 'add_agreements', 'edit_agreements', 'delete_agreements',
    'view_invoices', 'add_invoices', 'edit_invoices', 'delete_invoices',
    'view_expenses', 'add_expenses', 'edit_expenses', 'delete_expenses', 'view_expense_reports', 'export_expenses',
    'manage_settings'
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
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Role Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [roleName, setRoleName] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState([]);

  // Add User Modal State
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  // Edit User Modal State
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  // Reset Password Modal State
  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState(false);
  const [resettingUser, setResettingUser] = useState(null);
  const [newPasswordForReset, setNewPasswordForReset] = useState('');
  
  const functions = getFunctions();
  const auth = getAuth();
  const listUsers = httpsCallable(functions, 'listUsers');
  const setUserRole = httpsCallable(functions, 'setUserRole');
  const createUser = httpsCallable(functions, 'createUser');
  const sendOtp = httpsCallable(functions, 'sendOtp');
  const verifyOtp = httpsCallable(functions, 'verifyOtp');
  const updateUser = httpsCallable(functions, 'updateUser');
  const deleteUser = httpsCallable(functions, 'deleteUser');
  const adminSetUserPassword = httpsCallable(functions, 'adminSetUserPassword');

  const fetchUsersAndRoles = async () => {
    setLoading(true);
    try {
      const rolesCollection = collection(db, 'roles');
      const rolesPromise = getDocs(rolesCollection);
      const usersPromise = listUsers();

      const [rolesSnapshot, result] = await Promise.all([rolesPromise, usersPromise]);

      const rolesList = rolesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRoles(rolesList);

      const userList = result.data.users.map(user => ({
        ...user,
        roleId: user.customClaims?.role || '',
      }));
      setUsers(userList);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error(error.message || "Failed to fetch data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const forceTokenRefresh = async () => {
      const currentUser = auth.currentUser;
      if (currentUser) {
        try {
          await currentUser.getIdToken(true);
        } catch (error) {
          console.error("Error refreshing token:", error);
        }
      }
    };

    forceTokenRefresh().then(() => {
      fetchUsersAndRoles();
    });
  }, [auth]);

  // Role Management Handlers
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

  const handleCloseModal = () => setIsModalOpen(false);

  const handleSaveRole = async () => {
    if (!roleName) return toast.error('Role name cannot be empty');
    const roleData = { name: roleName, permissions: selectedPermissions };
    try {
      if (editingRole) {
        await updateDoc(doc(db, 'roles', editingRole.id), roleData);
        toast.success('Role updated successfully');
      } else {
        await addDoc(collection(db, 'roles'), roleData);
        toast.success('Role added successfully');
      }
      fetchUsersAndRoles();
      handleCloseModal();
    } catch (error) {
      toast.error('Failed to save role.');
    }
  };
  
  const handleDeleteRole = async (id) => {
    if (window.confirm('Are you sure you want to delete this role?')) {
      try {
        await deleteDoc(doc(db, 'roles', id));
        fetchUsersAndRoles();
        toast.success('Role deleted successfully');
      } catch (error) {
        toast.error('Failed to delete role.');
      }
    }
  };

  const handlePermissionChange = (permission) => {
    if (permission === 'all') {
      setSelectedPermissions(prev => prev.includes('all') ? [] : allPermissions);
    } else {
      setSelectedPermissions(prev => 
        prev.includes(permission) 
          ? prev.filter(p => p !== permission && p !== 'all') 
          : [...prev, permission]
      );
    }
  };

  // User Management Handlers
  const handleAssignRole = async (userEmail, roleId) => {
    try {
      const result = await setUserRole({ email: userEmail, roleId: roleId });
      toast.success(result.data.message);
      if (auth.currentUser && auth.currentUser.email === userEmail) {
        await auth.currentUser.getIdToken(true);
      }
      setUsers(prev => prev.map(u => u.email === userEmail ? { ...u, roleId } : u));
    } catch (error) {
      toast.error(error.message || "Failed to assign role.");
    }
  };

  const handleOpenAddUserModal = () => {
    setIsAddUserModalOpen(true);
  };

  const handleCloseAddUserModal = () => {
    setIsAddUserModalOpen(false);
    setTimeout(() => {
      setNewUserEmail('');
      setNewUsername('');
      setNewUserPassword('');
      setOtp('');
      setOtpSent(false);
      setOtpSending(false);
      setOtpVerified(false);
      setVerifyingOtp(false);
    }, 300);
  };

  const handleSendOtp = async () => {
    if (!newUserEmail) return toast.error('Email cannot be empty');
    setOtpSending(true);
    try {
      const result = await sendOtp({ email: newUserEmail });
      toast.success(result.data.message);
      setOtpSent(true);
    } catch (error) {
      toast.error(error.message || "Failed to send OTP.");
    } finally {
      setOtpSending(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp) return toast.error('OTP cannot be empty');
    setVerifyingOtp(true);
    try {
      const result = await verifyOtp({ email: newUserEmail, otp });
      toast.success(result.data.message);
      setOtpVerified(true);
    } catch (error) {
      toast.error(error.message || "Failed to verify OTP.");
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleCreateUser = async () => {
    if (!newUsername || !newUserPassword) return toast.error('Username and password must be provided.');
    try {
      await createUser({ email: newUserEmail, password: newUserPassword, otp, username: newUsername });
      toast.success("User created successfully.");
      fetchUsersAndRoles();
      handleCloseAddUserModal();
    } catch (error) {
      toast.error(error.message || "Failed to create user.");
    }
  };

  const handleOpenEditUserModal = (user) => {
    setEditingUser({ ...user, newUsername: user.displayName });
    setIsEditUserModalOpen(true);
  };

  const handleCloseEditUserModal = () => {
    setIsEditUserModalOpen(false);
    setEditingUser(null);
  };

  const handleUpdateUser = async () => {
    if (!editingUser || !editingUser.newUsername) return toast.error("Username cannot be empty.");
    try {
      await updateUser({ uid: editingUser.uid, username: editingUser.newUsername });
      toast.success("User updated successfully.");
      fetchUsersAndRoles();
      handleCloseEditUserModal();
    } catch (error) {
      toast.error(error.message || "Failed to update user.");
    }
  };

  const handleOpenResetPasswordModal = (user) => {
    setResettingUser(user);
    setIsResetPasswordModalOpen(true);
  };

  const handleCloseResetPasswordModal = () => {
    setIsResetPasswordModalOpen(false);
    setNewPasswordForReset('');
    setResettingUser(null);
  };

  const handleAdminSetPassword = async () => {
    if (!resettingUser || !newPasswordForReset) return toast.error("Password cannot be empty.");
    try {
      await adminSetUserPassword({ uid: resettingUser.uid, newPassword: newPasswordForReset });
      toast.success(`Password for ${resettingUser.email} has been reset.`);
      handleCloseResetPasswordModal();
    } catch (error) {
      toast.error(error.message || "Failed to reset password.");
    }
  };

  const handleDeleteUser = async (uid) => {
    if (window.confirm('Are you sure you want to permanently delete this user? This action cannot be undone.')) {
      try {
        await deleteUser({ uid });
        toast.success("User deleted successfully.");
        fetchUsersAndRoles();
      } catch (error) {
        toast.error(error.message || "Failed to delete user.");
      }
    }
  };

  // Render methods for Add User dialog
  const renderAddUserContent = () => {
    if (!otpSent) {
      return <TextField autoFocus margin="dense" label="Email" type="email" fullWidth variant="outlined" value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} />;
    } else if (!otpVerified) {
      return <TextField autoFocus margin="dense" label="OTP" type="text" fullWidth variant="outlined" value={otp} onChange={(e) => setOtp(e.target.value)} />;
    } else {
      return (
        <>
          <TextField autoFocus margin="dense" label="Username" type="text" fullWidth variant="outlined" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} sx={{ mb: 2 }} />
          <TextField margin="dense" label="Password" type="password" fullWidth variant="outlined" value={newUserPassword} onChange={(e) => setNewUserPassword(e.target.value)} />
        </>
      );
    }
  };

  const renderAddUserActions = () => {
    if (!otpSent) {
      return <Button onClick={handleSendOtp} className={styles.saveButton} variant="contained" disabled={otpSending}>{otpSending ? <CircularProgress size={24} /> : "Send OTP"}</Button>;
    } else if (!otpVerified) {
      return <Button onClick={handleVerifyOtp} className={styles.saveButton} variant="contained" disabled={verifyingOtp}>{verifyingOtp ? <CircularProgress size={24} /> : "Verify OTP"}</Button>;
    } else {
      return <Button onClick={handleCreateUser} className={styles.saveButton} variant="contained" disabled={!newUsername || !newUserPassword}>Add User</Button>;
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
            <Button className={styles.addButton} variant="contained" startIcon={<AddCircleOutline />} onClick={() => handleOpenModal()} sx={{ mr: 1 }}>Add Role</Button>
            <Button className={styles.addButton} variant="contained" startIcon={<AddCircleOutline />} onClick={handleOpenAddUserModal}>Add User</Button>
        </div>
      </div>
      
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
              {loading ? (
                <tr><td colSpan="3" style={{ textAlign: 'center', padding: '20px' }}>Loading...</td></tr>
              ) : roles.map(role => (
                <tr key={role.id}>
                  <td>{role.name}</td>
                  <td><PermissionChips permissions={role.permissions} /></td>
                  <td>
                    <div className={styles.actions}>
                      <IconButton className={styles.editButton} onClick={() => handleOpenModal(role)}><Edit /></IconButton>
                      <IconButton className={styles.deleteButton} onClick={() => handleDeleteRole(role.id)}><Delete /></IconButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ height: '24px' }} />

      <div className={styles.rolesSection}>
        <h2>User Management</h2>
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Username</th>
                <th>User Email</th>
                <th>Assigned Role</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="4" style={{ textAlign: 'center', padding: '20px' }}>Loading...</td></tr>
              ) : users.map(user => (
                <tr key={user.uid}>
                  <td>{user.displayName || '-'}</td>
                  <td>{user.email}</td>
                  <td>
                    <Select value={user.roleId || ''} onChange={(e) => handleAssignRole(user.email, e.target.value)} displayEmpty size="small" sx={{ minWidth: 150, backgroundColor: '#f9f9f9' }}>
                      <MenuItem value=""><em>None</em></MenuItem>
                      {roles.map((role) => <MenuItem key={role.id} value={role.id}>{role.name}</MenuItem>)}
                    </Select>
                  </td>
                  <td>
                    <div className={styles.actions}>
                      <IconButton className={styles.editButton} onClick={() => handleOpenEditUserModal(user)}><Edit /></IconButton>
                      <IconButton className={styles.editButton} onClick={() => handleOpenResetPasswordModal(user)}><LockReset /></IconButton>
                      <IconButton className={styles.deleteButton} onClick={() => handleDeleteUser(user.uid)}><Delete /></IconButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Role Management Dialog */}
      <Dialog open={isModalOpen} onClose={handleCloseModal} maxWidth="sm" fullWidth>
        <DialogTitle>
            {editingRole ? 'Edit Role' : 'Add New Role'}
            <IconButton onClick={handleCloseModal} className={styles.closeButton}><Close /></IconButton>
        </DialogTitle>
        <DialogContent>
          <TextField autoFocus margin="dense" label="Role Name" type="text" fullWidth variant="outlined" value={roleName} onChange={(e) => setRoleName(e.target.value)} />
          <div className={styles.permissionsGrid}>
            {allPermissions.map(permission => (
              <FormControlLabel key={permission} control={<Checkbox checked={selectedPermissions.includes(permission)} onChange={() => handlePermissionChange(permission)} disabled={selectedPermissions.includes('all') && permission !== 'all'} />} label={permission.replace(/_/g, ' ')} />
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
        <DialogTitle>Add New User<IconButton onClick={handleCloseAddUserModal} className={styles.closeButton}><Close /></IconButton></DialogTitle>
        <DialogContent>{renderAddUserContent()}</DialogContent>
        <DialogActions>
            <div className={styles.modalActions}>
                <Button onClick={handleCloseAddUserModal}>Cancel</Button>
                {renderAddUserActions()}
            </div>
        </DialogActions>
      </Dialog>

      {/* Edit User Dialog */}
      {editingUser && (
        <Dialog open={isEditUserModalOpen} onClose={handleCloseEditUserModal} maxWidth="sm" fullWidth>
          <DialogTitle>Edit User<IconButton onClick={handleCloseEditUserModal} className={styles.closeButton}><Close /></IconButton></DialogTitle>
          <DialogContent>
            <TextField autoFocus margin="dense" label="Username" type="text" fullWidth variant="outlined" value={editingUser.newUsername} onChange={(e) => setEditingUser(prev => ({ ...prev, newUsername: e.target.value }))} />
          </DialogContent>
          <DialogActions>
              <div className={styles.modalActions}>
                  <Button onClick={handleCloseEditUserModal}>Cancel</Button>
                  <Button onClick={handleUpdateUser} className={styles.saveButton} variant="contained">Save</Button>
              </div>
          </DialogActions>
        </Dialog>
      )}

      {/* Reset Password Dialog */}
      {resettingUser && (
        <Dialog open={isResetPasswordModalOpen} onClose={handleCloseResetPasswordModal} maxWidth="sm" fullWidth>
          <DialogTitle>Reset Password for {resettingUser.email}<IconButton onClick={handleCloseResetPasswordModal} className={styles.closeButton}><Close /></IconButton></DialogTitle>
          <DialogContent>
            <DialogContentText sx={{mb: 2}}>
              Enter a new temporary password for the user.
            </DialogContentText>
            <TextField autoFocus margin="dense" label="New Password" type="password" fullWidth variant="outlined" value={newPasswordForReset} onChange={(e) => setNewPasswordForReset(e.target.value)} />
          </DialogContent>
          <DialogActions>
              <div className={styles.modalActions}>
                  <Button onClick={handleCloseResetPasswordModal}>Cancel</Button>
                  <Button onClick={handleAdminSetPassword} className={styles.saveButton} variant="contained" disabled={!newPasswordForReset}>Set Password</Button>
              </div>
          </DialogActions>
        </Dialog>
      )}
    </div>
  );
}