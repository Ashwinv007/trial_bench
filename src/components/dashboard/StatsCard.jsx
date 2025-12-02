import React, { useState, useEffect, useRef } from 'react';
import CountUp from 'react-countup';
import { IndianRupee, Users, FileText, FileCheck, TrendingUp, TrendingDown } from 'lucide-react';
import styles from './StatsCard.module.css';

const iconMap = {
  IndianRupee,
  Users,
  FileText,
  FileCheck
};

export default function StatsCard({ title, value, change, trend, icon, color, loading }) {
  const Icon = iconMap[icon];

  const parseValue = (val) => {
    if (typeof val !== 'string') return 0;
    // Remove currency symbols, commas, and lakh indicators ('L')
    const numericString = val.replace(/₹|L|,/g, '').trim();
    const number = parseFloat(numericString);
    // If 'L' was present, multiply by 100,000
    if (val.includes('L')) {
      return number * 100000;
    }
    return isNaN(number) ? 0 : number;
  };
  
  const endValue = parseValue(value);
  const isCurrency = value.includes('₹');

  const [slowCountValue, setSlowCountValue] = useState(0); // State for the value displayed during loading
  const intervalRef = useRef(null);
  const lastSlowCountValueRef = useRef(0); // Stores the value slowCountValue had right before loading became false
  const prevLoadingRef = useRef(loading); // To detect changes in loading prop

  // Effect for managing the slow counting interval
  useEffect(() => {
    if (loading) {
      // Clear any existing interval before starting a new one
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      // Start slow counting
      intervalRef.current = setInterval(() => {
        setSlowCountValue((prev) => {
          // Adjust increment dynamically based on endValue, or a fixed small increment
          const increment = endValue > 1000 ? Math.floor(endValue / 100) : 1; // Faster for larger numbers during loading
          // Max slow count before data arrives (e.g., 50 or 10% of endValue, whichever is smaller, but at least 10)
          const maxDuringSlowCount = Math.max(10, endValue > 0 ? Math.min(50, Math.floor(endValue * 0.1)) : 50);
          if (prev < maxDuringSlowCount) {
            return prev + increment;
          }
          return maxDuringSlowCount; // Cap the slow count
        });
      }, 100); // Slightly faster interval for slow counting to ensure visibility
    } else {
      // If loading just finished, capture the current slowCountValue
      // This is important because `CountUp` will be rendered in the next cycle.
      if (prevLoadingRef.current === true && loading === false) {
        lastSlowCountValueRef.current = slowCountValue;
      }
      // Clear interval regardless of loading state transition
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    // Update prevLoadingRef for the next render cycle
    prevLoadingRef.current = loading;

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [loading, endValue]); // Only re-run when loading state or endValue changes

  // Reset slowCountValue when endValue changes and loading becomes true again
  useEffect(() => {
      if (loading) {
          setSlowCountValue(0);
          lastSlowCountValueRef.current = 0;
      }
  }, [endValue, loading]);


  // This formatting function will be used for both slow counting and final value
  const formatNumber = (n) => {
    if (!isCurrency) return n.toLocaleString('en-IN');
    if (n >= 100000) {
      return `₹${(n / 100000).toFixed(2)} L`;
    }
    return `₹${n.toLocaleString('en-IN')}`;
  };

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
        <div className={styles.value}> {/* Reverted: removed inline color style */}
          {loading ? (
            // Display slow counting value with formatting, no explicit prefix here
            <span>
                {formatNumber(slowCountValue)}
            </span>
          ) : (
            <CountUp
              // If loading just finished, use the last slowCountValue, otherwise 0 for initial render
              start={lastSlowCountValueRef.current !== 0 && lastSlowCountValueRef.current < endValue ? lastSlowCountValueRef.current : 0}
              end={endValue}
              duration={1.5}
              separator=","
              prefix={isCurrency ? '₹' : ''} // CountUp's prefix property for currency
              formattingFn={formatNumber}
            />
          )}
        </div>
        <div className={styles.title}>{title}</div>
      </div>
    </div>
  );
}

