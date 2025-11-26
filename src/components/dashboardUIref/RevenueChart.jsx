import React, { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DollarSign, ChevronDown } from 'lucide-react';
import { revenueData } from './dashboardData';
import styles from './RevenueChart.module.css';

export default function RevenueChart() {
  const [period, setPeriod] = useState('year');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const data = revenueData[period];
  const total = data.reduce((sum, item) => sum + item.revenue, 0);
  const average = Math.round(total / data.length);
  const currentValue = data[data.length - 1].revenue;
  const previousValue = data[data.length - 2].revenue;
  const changePercent = ((currentValue - previousValue) / previousValue * 100).toFixed(1);

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
            <DollarSign size={20} className={styles.headerIcon} />
            <h3 className={styles.title}>Revenue</h3>
          </div>
          <div className={styles.subtitle}>Current: ${currentValue.toLocaleString()}</div>
        </div>
        <div className={styles.headerRight}>
          <div className={styles.stats}>
            <div className={styles.stat}>
              <div className={styles.statValue}>${(total / 1000).toFixed(1)}K</div>
              <div className={styles.statLabel}>Total</div>
            </div>
            <div className={styles.stat}>
              <div className={styles.statValue} style={{ color: changePercent > 0 ? '#059669' : '#dc2626' }}>
                {changePercent > 0 ? '+' : ''}{changePercent}%
              </div>
              <div className={styles.statLabel}>Change</div>
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
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2b7a8e" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#2b7a8e" stopOpacity={0}/>
              </linearGradient>
            </defs>
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
              tickFormatter={(value) => `$${value / 1000}K`}
            />
            <Tooltip 
              contentStyle={{
                background: 'white',
                border: '1px solid rgba(0, 0, 0, 0.1)',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
              }}
              formatter={(value) => [`$${value.toLocaleString()}`, 'Revenue']}
            />
            <Area 
              type="monotone" 
              dataKey="revenue" 
              stroke="#2b7a8e" 
              strokeWidth={3}
              fill="url(#revenueGradient)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
