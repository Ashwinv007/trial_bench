
import React, { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import styles from '../Dashboard.module.css';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { usePermissions } from '../../auth/usePermissions';
import { TrendingDown, ChevronDown } from 'lucide-react';

const ExpenseChart = () => {
    const { hasPermission } = usePermissions();
    const [period, setPeriod] = useState('year');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (hasPermission('readExpense')) {
                setLoading(true);
                const now = new Date();
                let startDate;

                if (period === 'week') {
                    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
                } else if (period === 'month') {
                    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                } else {
                    startDate = new Date(now.getFullYear(), 0, 1);
                }

                const expensesCollection = collection(db, 'expenses');
                const q = query(
                    expensesCollection,
                    where('date', '>=', Timestamp.fromDate(startDate))
                );
                const snapshot = await getDocs(q);
                const expenses = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));

                // Process data for chart
                const chartData = [];
                if (period === 'week') {
                    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                    const dayExpenses = new Array(7).fill(0);
                    expenses.forEach(expense => {
                        const day = expense.date.toDate().getDay();
                        dayExpenses[day] += parseFloat(expense.amount);
                    });
                    for (let i = 0; i < 7; i++) {
                        chartData.push({ label: days[(now.getDay() - 6 + i + 7) % 7], expenses: dayExpenses[(now.getDay() - 6 + i + 7) % 7] });
                    }
                } else if (period === 'month') {
                    const monthDayExpenses = new Array(now.getDate()).fill(0);
                    expenses.forEach(expense => {
                        const day = expense.date.toDate().getDate() - 1;
                        monthDayExpenses[day] += parseFloat(expense.amount);
                    });
                    for (let i = 0; i < now.getDate(); i++) {
                        chartData.push({ label: String(i + 1), expenses: monthDayExpenses[i] });
                    }
                } else { // year
                    const monthExpenses = new Array(12).fill(0);
                    expenses.forEach(expense => {
                        const month = expense.date.toDate().getMonth();
                        monthExpenses[month] += parseFloat(expense.amount);
                    });
                    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                    for (let i = 0; i < 12; i++) {
                        chartData.push({ label: monthNames[i], expenses: monthExpenses[i] });
                    }
                }
                setData(chartData);
                setLoading(false);
            }
        };

        fetchData();
    }, [hasPermission, period]);

    const totalExpenses = data.reduce((sum, item) => sum + item.expenses, 0);
    const currentValue = data.length > 0 ? data[data.length - 1].expenses : 0;
    const previousValue = data.length > 1 ? data[data.length - 2].expenses : 0;
    const changePercent = previousValue !== 0 ? ((currentValue - previousValue) / previousValue * 100).toFixed(1) : (currentValue !== 0 ? '100.0' : '0.0');

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
                        <TrendingDown size={20} className={styles.expenseChartHeaderIcon} />
                        <h3 className={styles.invoiceTitle}>Expenses</h3>
                    </div>
                    <div className={styles.expenseChartSubtitle}>Current: ₹{currentValue.toLocaleString('en-IN')}</div>
                </div>
                <div className={styles.expenseChartHeaderRight}>
                    <div className={styles.expenseChartStats}>
                        <div className={styles.expenseChartStat}>
                            <div className={styles.expenseChartStatValue}>₹{(totalExpenses / 1000).toFixed(1)}K</div>
                            <div className={styles.expenseChartStatLabel}>Total</div>
                        </div>
                        <div className={styles.expenseChartStat}>
                            <div className={styles.expenseChartStatValue} style={{ color: parseFloat(changePercent) > 0 ? '#dc2626' : '#059669' }}>
                                {parseFloat(changePercent) > 0 ? '+' : ''}{changePercent}%
                            </div>
                            <div className={styles.expenseChartStatLabel}>Change</div>
                        </div>
                    </div>
                    <div className={styles.expenseChartDropdown}>
                        <button 
                            className={styles.expenseChartDropdownButton}
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        >
                            {periodLabels[period]}
                            <ChevronDown size={16} />
                        </button>
                        {isDropdownOpen && (
                            <div className={styles.expenseChartDropdownMenu}>
                                <div 
                                    className={`${styles.expenseChartDropdownItem} ${period === 'week' ? styles.active : ''}`}
                                    onClick={() => {
                                        setPeriod('week');
                                        setIsDropdownOpen(false);
                                    }}
                                >
                                    This Week
                                </div>
                                <div 
                                    className={`${styles.expenseChartDropdownItem} ${period === 'month' ? styles.active : ''}`}
                                    onClick={() => {
                                        setPeriod('month');
                                        setIsDropdownOpen(false);
                                    }}
                                >
                                    This Month
                                </div>
                                <div 
                                    className={`${styles.expenseChartDropdownItem} ${period === 'year' ? styles.active : ''}`}
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
                    !loading && data.length === 0 ? <p>No expense data available for the selected period.</p> :
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#1a4d5c" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#1a4d5c" stopOpacity={0}/>
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
                                formatter={(value) => [`₹${value.toLocaleString('en-IN')}`, 'Expenses']}
                            />
                            <Area 
                                type="monotone" 
                                dataKey="expenses" 
                                stroke="#1a4d5c" 
                                strokeWidth={3}
                                fill="url(#expenseGradient)" 
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                }
            </div>
        </div>
    );
};

export default ExpenseChart;
