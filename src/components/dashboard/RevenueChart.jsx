
import React, { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import styles from '../Dashboard.module.css';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { usePermissions } from '../../auth/usePermissions';
import { IndianRupee, ChevronDown } from 'lucide-react';

const RevenueChart = () => {
    const { hasPermission } = usePermissions();
    const [period, setPeriod] = useState('week');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            if (hasPermission('invoices:view')) {
                try {
                    setLoading(true);
                    setError(null);
                    const now = new Date();
                    let startDate;

                    if (period === 'week') {
                        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
                    } else if (period === 'month') {
                        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                    } else {
                        startDate = new Date(now.getFullYear(), 0, 1);
                    }

                    const firestoreStartDate = Timestamp.fromDate(startDate);

                    const invoicesCollection = collection(db, 'invoices');
                    const q = query(
                        invoicesCollection,
                        where('paymentStatus', '==', 'Paid'),
                        where('date', '>=', firestoreStartDate)
                    );
                    const snapshot = await getDocs(q);
                    const invoices = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));

                    // Process data for chart
                    const chartData = [];
                    if (period === 'week') {
                        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                        const dayRevenues = new Array(7).fill(0);
                        invoices.forEach(invoice => {
                            if (invoice.date && typeof invoice.date.toDate === 'function') {
                                const invoiceDate = invoice.date.toDate();
                                const day = invoiceDate.getUTCDay(); // Use UTC day
                                dayRevenues[day] += parseFloat(invoice.totalPrice) || 0;
                            }
                        });
                        for (let i = 0; i < 7; i++) {
                            // Align labels with UTC days for consistency
                            chartData.push({ label: days[(now.getUTCDay() - 6 + i + 7) % 7], revenue: dayRevenues[(now.getUTCDay() - 6 + i + 7) % 7] });
                        }
                    } else if (period === 'month') {
                        const monthDayRevenues = new Array(now.getUTCDate()).fill(0); // Use UTC date for array size
                        invoices.forEach(invoice => {
                            if (invoice.date && typeof invoice.date.toDate === 'function') {
                                const invoiceDate = invoice.date.toDate();
                                if (invoiceDate.getUTCMonth() === now.getUTCMonth() && invoiceDate.getUTCFullYear() === now.getUTCFullYear()) {
                                    const day = invoiceDate.getUTCDate() - 1; // Use UTC date
                                    monthDayRevenues[day] += parseFloat(invoice.totalPrice) || 0;
                                }
                            }
                        });
                        for (let i = 0; i < now.getUTCDate(); i++) { // Use UTC date for loop
                            chartData.push({ label: String(i + 1), revenue: monthDayRevenues[i] });
                        }
                    } else { // year
                        const monthRevenues = new Array(12).fill(0);
                        invoices.forEach(invoice => {
                            if (invoice.date && typeof invoice.date.toDate === 'function') {
                                const invoiceDate = invoice.date.toDate();
                                if (invoiceDate.getUTCFullYear() === now.getUTCFullYear()) {
                                    const month = invoiceDate.getUTCMonth(); // Use UTC month
                                    monthRevenues[month] += parseFloat(invoice.totalPrice) || 0;
                                }
                            }
                        });
                        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                        for (let i = 0; i < 12; i++) {
                            chartData.push({ label: monthNames[i], revenue: monthRevenues[i] });
                        }
                    }

                    setData(chartData);
                } catch (err) {
                    console.error("Error fetching revenue data:", err);
                    setError("Failed to load revenue data.");
                    setData([]); // Set data to empty on error
                } finally {
                    setLoading(false);
                }
            } else {
                setLoading(false);
                setData([]); // Ensure data is empty if no permission
            }
        };

        fetchData();
    }, [hasPermission, period]);

    const totalRevenue = data.reduce((sum, item) => sum + item.revenue, 0);
    const currentValue = data.length > 0 ? data[data.length - 1].revenue : 0;
    const previousValue = data.length > 1 ? data[data.length - 2].revenue : 0;
    const changePercent = previousValue !== 0 ? ((currentValue - previousValue) / previousValue * 100).toFixed(1) : (currentValue !== 0 ? '100.0' : '0.0');

    const periodLabels = {
        week: 'This Week',
        month: 'This Month',
        year: 'This Year'
    };
    
    if (loading && data.length === 0) {
        return null;
    }

    if (!hasPermission('invoices:view') || data.length === 0 || error) { // Also check for error
        return null;
    }

    return (
        <div className={styles.card}>
            <div className={styles.header}>
                <div>
                    <div className={styles.titleWrapper}>
                        <IndianRupee size={20} className={styles.revenueChartHeaderIcon} />
                        <h3 className={styles.invoiceTitle}>Revenue</h3>
                    </div>
                    <div className={styles.revenueChartSubtitle}>Current: ₹{currentValue.toLocaleString('en-IN')}</div>
                </div>
                <div className={styles.revenueChartHeaderRight}>
                    <div className={styles.revenueChartStats}>
                        <div className={styles.revenueChartStat}>
                            <div className={styles.revenueChartStatValue}>₹{(totalRevenue / 1000).toFixed(1)}K</div>
                            <div className={styles.revenueChartStatLabel}>Total</div>
                        </div>
                        <div className={styles.revenueChartStat}>
                            <div className={styles.revenueChartStatValue} style={{ color: parseFloat(changePercent) > 0 ? '#059669' : '#dc2626' }}>
                                {parseFloat(changePercent) > 0 ? '+' : ''}{changePercent}%
                            </div>
                            <div className={styles.revenueChartStatLabel}>Change</div>
                        </div>
                    </div>
                    <div className={styles.revenueChartDropdown}>
                        <button 
                            className={styles.revenueChartDropdownButton}
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        >
                            {periodLabels[period]}
                            <ChevronDown size={16} />
                        </button>
                        {isDropdownOpen && (
                            <div className={styles.revenueChartDropdownMenu}>
                                <div 
                                    className={`${styles.revenueChartDropdownItem} ${period === 'week' ? styles.active : ''}`}
                                    onClick={() => {
                                        setPeriod('week');
                                        setIsDropdownOpen(false);
                                    }}
                                >
                                    This Week
                                </div>
                                <div 
                                    className={`${styles.revenueChartDropdownItem} ${period === 'month' ? styles.active : ''}`}
                                    onClick={() => {
                                        setPeriod('month');
                                        setIsDropdownOpen(false);
                                    }}
                                >
                                    This Month
                                </div>
                                <div 
                                    className={`${styles.revenueChartDropdownItem} ${period === 'year' ? styles.active : ''}`}
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
                                tickFormatter={(value) => `₹${value / 1000}K`}
                            />
                            <Tooltip 
                                contentStyle={{
                                    background: 'white',
                                    border: '1px solid rgba(0, 0, 0, 0.1)',
                                    borderRadius: '8px',
                                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                                }}
                                formatter={(value) => [`₹${value.toLocaleString('en-IN')}`, 'Revenue']}
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
                }
            </div>
        </div>
    );
};

export default RevenueChart;
