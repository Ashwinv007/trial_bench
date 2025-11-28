
import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';
import styles from '../Dashboard.module.css';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { usePermissions } from '../../auth/usePermissions';
import { TrendingUp, ChevronDown } from 'lucide-react';

const LeadConversionsChart = () => {
    const { hasPermission } = usePermissions();
    const [period, setPeriod] = useState('year');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);

        useEffect(() => {
            const fetchData = async () => {
                if (hasPermission('leads:view')) {
                    setLoading(true);
                    try {
                        const now = new Date();
                        let startDate;
    
                        if (period === 'week') {
                            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
                        } else if (period === 'month') {
                            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                        } else {
                            startDate = new Date(now.getFullYear(), 0, 1);
                        }
    
                        const leadsCollection = collection(db, 'leads');
                        const q = query(
                            leadsCollection,
                            where('status', '==', 'Converted'),
                            where('lastEditedAt', '>=', Timestamp.fromDate(startDate))
                        );
                        const snapshot = await getDocs(q);
                        const leads = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
    
                        // Process data for chart
                        const chartData = [];
                        if (period === 'week') {
                            const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                            const dayCounts = new Array(7).fill(0);
                            leads.forEach(lead => {
                                const leadDate = lead.lastEditedAt.toDate();
                                const day = leadDate.getUTCDay(); // Use UTC day
                                dayCounts[day]++;
                            });
                            for (let i = 0; i < 7; i++) {
                                // Align labels with UTC days for consistency
                                chartData.push({ label: days[(now.getUTCDay() - 6 + i + 7) % 7], conversions: dayCounts[(now.getUTCDay() - 6 + i + 7) % 7] });
                            }
                        } else if (period === 'month') {
                            const monthDayCounts = new Array(now.getUTCDate()).fill(0); // Use UTC date for array size
                            leads.forEach(lead => {
                                const leadDate = lead.lastEditedAt.toDate();
                                if (leadDate.getUTCMonth() === now.getUTCMonth() && leadDate.getUTCFullYear() === now.getUTCFullYear()) {
                                    const day = leadDate.getUTCDate() - 1; // Use UTC date
                                    monthDayCounts[day]++;
                                }
                            });
                            for (let i = 0; i < now.getUTCDate(); i++) { // Use UTC date for loop
                                chartData.push({ label: String(i + 1), conversions: monthDayCounts[i] });
                            }
                        } else { // year
                            const monthCounts = new Array(12).fill(0);
                            leads.forEach(lead => {
                                const leadDate = lead.lastEditedAt.toDate();
                                if (leadDate.getUTCFullYear() === now.getUTCFullYear()) {
                                    const month = leadDate.getUTCMonth(); // Use UTC month
                                    monthCounts[month]++;
                                }
                            });
                            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                            for (let i = 0; i < 12; i++) {
                                chartData.push({ label: monthNames[i], conversions: monthCounts[i] });
                            }
                        }
                        setData(chartData);
                    } catch (error) {
                        console.error("Firebase permission error fetching lead conversions:", error);
                        setData([]); // Set data to empty array on error
                    }
                    setLoading(false);
                }
            };
    
            fetchData();
        }, [hasPermission, period]);
    
        const totalConversions = data.reduce((sum, item) => sum + item.conversions, 0);
        const averageConversions = data.length > 0 ? Math.round(totalConversions / data.length) : 0;
        const currentConversions = data.length > 0 ? data[data.length - 1].conversions : 0;
    
        const periodLabels = {
            week: 'This Week',
            month: 'This Month',
            year: 'This Year'
        };
    
        if (loading) {
            return <p>Loading...</p>;
        }
    
        if (data.length === 0 && !loading) {
            return null;
        }
    
        return (
            <div className={styles.card}>            <div className={styles.header}>
                <div>
                    <div className={styles.titleWrapper}>
                        <TrendingUp size={20} className={styles.leadConversionsChartHeaderIcon} />
                        <h3 className={styles.invoiceTitle}>Lead Conversions</h3>
                    </div>
                    <div className={styles.leadConversionsChartSubtitle}>Current: {currentConversions}</div>
                </div>
                <div className={styles.leadConversionsChartHeaderRight}>
                    <div className={styles.leadConversionsChartStats}>
                        <div className={styles.leadConversionsChartStat}>
                            <div className={styles.leadConversionsChartStatValue}>{totalConversions}</div>
                            <div className={styles.leadConversionsChartStatLabel}>Total</div>
                        </div>
                        <div className={styles.leadConversionsChartStat}>
                            <div className={styles.leadConversionsChartStatValue}>{averageConversions}</div>
                            <div className={styles.leadConversionsChartStatLabel}>Average</div>
                        </div>
                    </div>
                    <div className={styles.leadConversionsChartDropdown}>
                        <button 
                            className={styles.leadConversionsChartDropdownButton}
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        >
                            {periodLabels[period]}
                            <ChevronDown size={16} />
                        </button>
                        {isDropdownOpen && (
                            <div className={styles.leadConversionsChartDropdownMenu}>
                                <div 
                                    className={`${styles.leadConversionsChartDropdownItem} ${period === 'week' ? styles.active : ''}`}
                                    onClick={() => {
                                        setPeriod('week');
                                        setIsDropdownOpen(false);
                                    }}
                                >
                                    This Week
                                </div>
                                <div 
                                    className={`${styles.leadConversionsChartDropdownItem} ${period === 'month' ? styles.active : ''}`}
                                    onClick={() => {
                                        setPeriod('month');
                                        setIsDropdownOpen(false);
                                    }}
                                >
                                    This Month
                                </div>
                                <div 
                                    className={`${styles.leadConversionsChartDropdownItem} ${period === 'year' ? styles.active : ''}`}
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
                {loading ? <p>Loading...</p> :
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
                }
            </div>
        </div>
    );
};

export default LeadConversionsChart;
