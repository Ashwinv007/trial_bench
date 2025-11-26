import React from 'react';
import styles from '../Dashboard.module.css';
import { Lock } from 'lucide-react';

const PermissionMessage = ({ item }) => {
    return (
        <div className={styles.permissionMessage}>
            <Lock size={20} />
            <p>You do not have permission to view {item}.</p>
        </div>
    );
};

export default PermissionMessage;
