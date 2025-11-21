import React, { useState, useEffect, useContext } from 'react';
import styles from './Settings.module.css';
import { Button, TextField, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Checkbox, FormControlLabel, Chip, Tooltip, Select, MenuItem, DialogContentText, CircularProgress, Typography, Box } from '@mui/material';
import { AddCircleOutline, Edit, Delete, Close, LockReset } from '@mui/icons-material';
import { db } from '../firebase/config';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, setDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { toast } from 'sonner';
import { logActivity } from '../utils/logActivity';
import { AuthContext } from '../store/Context';
import { usePermissions } from '../auth/usePermissions';

const permissionGroups = {
    'Leads': ['leads:view', 'leads:add', 'leads:edit', 'leads:delete'],
    'Clients & Members': ['members:view', 'members:add', 'members:edit', 'members:delete', 'members:export'],
    'Agreements': ['agreements:view', 'agreements:add', 'agreements:edit', 'agreements:delete'],
    'Invoices': ['invoices:view', 'invoices:add', 'invoices:edit', 'invoices:delete'],
    'Expenses': ['expenses:view', 'expenses:add', 'expenses:edit', 'expenses:delete', 'expenses:export', 'expenses:view_reports', 'expenses:manage_categories'],
    'Logs': ['logs:view'],
    'Settings': ['settings:manage_roles', 'settings:manage_users', 'settings:manage_templates'],
};

const allPermissions = ['all', ...Object.values(permissionGroups).flat()];

const emailTemplateTypes = [
    { id: 'welcome_email', name: 'Welcome Email', defaultSubject: 'Welcome to Our Platform!', defaultBody: 'Hi {{username}},\n\nWelcome! We are excited to have you on board.' },
    { id: 'invoice_email', name: 'Invoice Email', defaultSubject: 'Your Invoice [{{invoice_number}}] is ready', defaultBody: 'Hi {{customerName}},\n\nPlease find your invoice attached. You can view it online here: {{invoice_link}}' },
    { id: 'agreement_email', name: 'Agreement Email', defaultSubject: 'Your Agreement [{{agreement_name}}] is ready', defaultBody: 'Hi {{clientName}},\n\nPlease find your agreement attached. You can view it online here: {{agreement_link}}' },
    { id: 'otp_email', name: 'OTP Email', defaultSubject: 'Your One-Time Password', defaultBody: 'Your OTP is: {{otp}}' },
];

const PermissionChips = ({ permissions }) => {
    // Defensively ensure that permissions is an array before trying to use array methods.
    const perms = Array.isArray(permissions) ? permissions : [];
    const visibleCount = 3;
    const displayedPermissions = perms.slice(0, visibleCount);
    const hiddenCount = perms.length - visibleCount;
  
    return (
      <div className={styles.permissionChipsContainer}>
        {displayedPermissions.map(p => <Chip key={p} label={p.replace(/_/g, ' ')} size="small" />)}
        {hiddenCount > 0 && (
          <Tooltip title={perms.slice(visibleCount).join(', ')}>
            <Chip label={`+${hiddenCount} more`} size="small" />
          </Tooltip>
        )}
      </div>
    );
};

export default function Settings() {
  const [roles, setRoles] = useState([]);
  const [users, setUsers] = useState([]);
  const [emailTemplates, setEmailTemplates] = useState([]);
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
  
  const { user } = useContext(AuthContext);
  const { hasPermission } = usePermissions();
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

  const fetchSettingsData = async () => {
    setLoading(true);
    try {
      const rolesCollection = collection(db, 'roles');
      const rolesPromise = getDocs(rolesCollection);
      
      const usersPromise = listUsers();

      const templatesCollection = collection(db, 'email_templates');
      const templatesPromise = getDocs(templatesCollection);

      const [rolesSnapshot, result, templatesSnapshot] = await Promise.all([rolesPromise, usersPromise, templatesPromise]);

      const rolesList = rolesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRoles(rolesList);

      const userList = result.data.users.map(user => ({
        ...user,
        roleId: user.customClaims?.role || '',
      }));
      setUsers(userList);

      const existingTemplates = templatesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const allTemplates = emailTemplateTypes.map(type => {
          const existing = existingTemplates.find(t => t.id === type.id);
          return existing || {
              id: type.id,
              name: type.name,
              subject: type.defaultSubject,
              body: type.defaultBody,
              isNew: true
          };
      });
      setEmailTemplates(allTemplates);

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
      fetchSettingsData();
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
        logActivity(db, user, 'role_updated', `Role "${roleName}" was updated.`, { roleId: editingRole.id, roleName });
      } else {
        await addDoc(collection(db, 'roles'), roleData);
        toast.success('Role added successfully');
        logActivity(db, user, 'role_added', `Role "${roleName}" was added.`, { roleName });
      }
      fetchSettingsData();
      handleCloseModal();
    } catch (error) {
      toast.error('Failed to save role.');
    }
  };
  
  const handleDeleteRole = async (id) => {
    if (window.confirm('Are you sure you want to delete this role?')) {
      try {
        const roleToDelete = roles.find(role => role.id === id);
        await deleteDoc(doc(db, 'roles', id));
        fetchSettingsData();
        toast.success('Role deleted successfully');
        if (roleToDelete) {
          logActivity(db, user, 'role_deleted', `Role "${roleToDelete.name}" was deleted.`, { roleId: id, roleName: roleToDelete.name });
        }
      } catch (error) {
        toast.error('Failed to delete role.');
      }
    }
  };

  const handlePermissionChange = (permission) => {
    if (permission === 'all') {
      setSelectedPermissions(prev => prev.includes('all') ? [] : allPermissions.filter(p => p !== 'all'));
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
      fetchSettingsData(); // Re-fetch all data to ensure consistency
      const role = roles.find(r => r.id === roleId);
      logActivity(db, user, 'role_assigned', `Role "${role ? role.name : 'None'}" assigned to user "${userEmail}".`, { userEmail, roleId, roleName: role ? role.name : 'None' });
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
      fetchSettingsData();
      handleCloseAddUserModal();
      logActivity(db, user, 'user_created', `User "${newUsername}" with email "${newUserEmail}" was created.`, { newUserEmail, newUsername });
    } catch (error) {
      toast.error(error.message || "Failed to create user.");
    }
  };

  const handleOpenEditUserModal = (user) => {
    setEditingUser({ ...user, newUsername: user.displayName || '' });
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
      fetchSettingsData(); // Re-fetch data to reflect the change from the backend
      handleCloseEditUserModal();
      logActivity(db, user, 'user_updated', `User "${editingUser.uid}" was updated with username "${editingUser.newUsername}".`, { userId: editingUser.uid, newUsername: editingUser.newUsername });
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
      logActivity(db, user, 'password_reset', `Password for user "${resettingUser.email}" was reset.`, { userId: resettingUser.uid, userEmail: resettingUser.email });
    } catch (error) {
      toast.error(error.message || "Failed to reset password.");
    }
  };

  const handleDeleteUser = async (uid) => {
    if (window.confirm('Are you sure you want to permanently delete this user? This action cannot be undone.')) {
      try {
        const userToDelete = users.find(u => u.uid === uid);
        await deleteUser({ uid });
        toast.success("User deleted successfully.");
        fetchSettingsData();
        if (userToDelete) {
          logActivity(db, user, 'user_deleted', `User "${userToDelete.email}" was deleted.`, { userId: uid, userEmail: userToDelete.email });
        }
      } catch (error) {
        toast.error(error.message || "Failed to delete user.");
      }
    }
  };

  // Email Template Handlers
  const handleTemplateChange = (index, field, value) => {
    const newTemplates = [...emailTemplates];
    newTemplates[index][field] = value;
    setEmailTemplates(newTemplates);
  };

  const handleSaveTemplate = async (index) => {
      const template = emailTemplates[index];
      try {
          const templateRef = doc(db, 'email_templates', template.id);
          await setDoc(templateRef, { name: template.name, subject: template.subject, body: template.body }, { merge: true });
          toast.success(`${template.name} template saved successfully.`);
          const newTemplates = [...emailTemplates];
          delete newTemplates[index].isNew;
          setEmailTemplates(newTemplates);
          logActivity(db, user, 'template_saved', `Email template "${template.name}" was saved.`, { templateId: template.id, templateName: template.name });
      } catch (error) {
          toast.error(`Failed to save ${template.name} template.`);
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
            {hasPermission('settings:manage_roles') && <Button className={styles.addButton} variant="contained" startIcon={<AddCircleOutline />} onClick={() => handleOpenModal()} sx={{ mr: 1 }}>Add Role</Button>}
            {hasPermission('settings:manage_users') && <Button className={styles.addButton} variant="contained" startIcon={<AddCircleOutline />} onClick={handleOpenAddUserModal}>Add User</Button>}
        </div>
      </div>
      
      {hasPermission('settings:manage_roles') && (
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
      )}

      <div style={{ height: '24px' }} />

      {hasPermission('settings:manage_users') && (
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
      )}

      <div style={{ height: '24px' }} />

      {hasPermission('settings:manage_templates') && (
      <div className={styles.rolesSection}>
        <h2>Email Templates</h2>
        {loading ? <p>Loading templates...</p> : emailTemplates.map((template, index) => (
            <div key={template.id} className={styles.templateEditor}>
            <h3>{template.name}</h3>
            <TextField
                label="Subject"
                fullWidth
                variant="outlined"
                value={template.subject}
                onChange={(e) => handleTemplateChange(index, 'subject', e.target.value)}
                sx={{ mb: 2 }}
            />
            <TextField
                label="Body"
                fullWidth
                multiline
                rows={4}
                variant="outlined"
                value={template.body}
                onChange={(e) => handleTemplateChange(index, 'body', e.target.value)}
                sx={{ mb: 2 }}
            />
            <Button onClick={() => handleSaveTemplate(index)} variant="contained" className={styles.saveButton}>Save Template</Button>
            </div>
        ))}
      </div>
      )}

      {/* Role Management Dialog */}
      <Dialog open={isModalOpen} onClose={handleCloseModal} maxWidth="sm" fullWidth>
        <DialogTitle>
            {editingRole ? 'Edit Role' : 'Add New Role'}
            <IconButton onClick={handleCloseModal} className={styles.closeButton}><Close /></IconButton>
        </DialogTitle>
        <DialogContent>
          <TextField autoFocus margin="dense" label="Role Name" type="text" fullWidth variant="outlined" value={roleName} onChange={(e) => setRoleName(e.target.value)} />
          <FormControlLabel
            control={<Checkbox checked={selectedPermissions.includes('all')} onChange={() => handlePermissionChange('all')} />}
            label="All Permissions"
          />
          {Object.entries(permissionGroups).map(([groupName, permissions]) => (
            <Box key={groupName} sx={{ border: '1px solid #ccc', borderRadius: '4px', p: 2, my: 2 }}>
              <Typography variant="h6" gutterBottom>{groupName}</Typography>
              <div className={styles.permissionsGrid}>
                {permissions.map(permission => (
                  <FormControlLabel
                    key={permission}
                    control={
                      <Checkbox
                        checked={selectedPermissions.includes(permission) || selectedPermissions.includes('all')}
                        onChange={() => handlePermissionChange(permission)}
                        disabled={selectedPermissions.includes('all')}
                      />
                    }
                    label={permission.split(':')[1].replace(/_/g, ' ')}
                  />
                ))}
              </div>
            </Box>
          ))}
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