import React from 'react';
import { IndianRupee, Users, FileText, FileCheck, TrendingUp, TrendingDown } from 'lucide-react';
import styles from './StatsCard.module.css';

const iconMap = {
  IndianRupee,
  Users,
  FileText,
  FileCheck
};

export default function StatsCard({ title, value, change, trend, icon, color }) {
  const Icon = iconMap[icon];
  
  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.iconWrapper} style={{ backgroundColor: `${color}15` }}>
          <Icon className={styles.icon} style={{ color }} size={24} />
        </div>
        <div className={styles.trendBadge} style={{ 
          backgroundColor: trend === 'up' ? '#e6f7f0' : '#ffe6e6',
          color: trend === 'up' ? '#059669' : '#dc2626'
        }}>
          {trend === 'up' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          <span>{change}</span>
        </div>
      </div>
      
      <div className={styles.content}>
        <div className={styles.value}>{value}</div>
        <div className={styles.title}>{title}</div>
      </div>
    </div>
  );
}
