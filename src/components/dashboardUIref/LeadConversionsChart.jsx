import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, ChevronDown } from 'lucide-react';
import { leadConversionsData } from './dashboardData';
import styles from './LeadConversionsChart.module.css';

export default function LeadConversionsChart() {
  const [period, setPeriod] = useState('year');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const data = leadConversionsData[period];
  const total = data.reduce((sum, item) => sum + item.conversions, 0);
  const average = Math.round(total / data.length);

  const periodLabels = {
    week: 'This Week',
    month: 'This Month',
    year: 'This Year'
  };

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div>
          <div className={styles.titleWrapper}>
            <TrendingUp size={20} className={styles.headerIcon} />
            <h3 className={styles.title}>Lead Conversions</h3>
          </div>
          <div className={styles.subtitle}>Current: {data[data.length - 1].conversions}</div>
        </div>
        <div className={styles.headerRight}>
          <div className={styles.stats}>
            <div className={styles.stat}>
              <div className={styles.statValue}>{total}</div>
              <div className={styles.statLabel}>Total</div>
            </div>
            <div className={styles.stat}>
              <div className={styles.statValue}>{average}</div>
              <div className={styles.statLabel}>Average</div>
            </div>
          </div>
          <div className={styles.dropdown}>
            <button 
              className={styles.dropdownButton}
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            >
              {periodLabels[period]}
              <ChevronDown size={16} />
            </button>
            {isDropdownOpen && (
              <div className={styles.dropdownMenu}>
                <div 
                  className={`${styles.dropdownItem} ${period === 'week' ? styles.active : ''}`}
                  onClick={() => {
                    setPeriod('week');
                    setIsDropdownOpen(false);
                  }}
                >
                  This Week
                </div>
                <div 
                  className={`${styles.dropdownItem} ${period === 'month' ? styles.active : ''}`}
                  onClick={() => {
                    setPeriod('month');
                    setIsDropdownOpen(false);
                  }}
                >
                  This Month
                </div>
                <div 
                  className={`${styles.dropdownItem} ${period === 'year' ? styles.active : ''}`}
                  onClick={() => {
                    setPeriod('year');
                    setIsDropdownOpen(false);
                  }}
                >
                  This Year
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className={styles.chartContainer}>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={data} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
            <XAxis 
              dataKey="label" 
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#666', fontSize: 12 }}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#666', fontSize: 12 }}
            />
            <Tooltip 
              cursor={{ fill: 'rgba(43, 122, 142, 0.05)' }}
              contentStyle={{
                background: 'white',
                border: '1px solid rgba(0, 0, 0, 0.1)',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
              }}
            />
            <Bar 
              dataKey="conversions" 
              fill="#2b7a8e" 
              radius={[8, 8, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
