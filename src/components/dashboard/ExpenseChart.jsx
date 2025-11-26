
import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import styles from '../Dashboard.module.css';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { usePermissions } from '../../auth/usePermissions';

const ExpenseChart = () => {
    const { hasPermission } = usePermissions();
    const [timeframe, setTimeframe] = useState('month');
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (hasPermission('readExpense')) {
                setLoading(true);
                const now = new Date();
                let startDate;

                if (timeframe === 'week') {
                    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
                } else if (timeframe === 'month') {
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
                if (timeframe === 'week') {
                    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                    const dayExpenses = new Array(7).fill(0);
                    expenses.forEach(expense => {
                        const day = expense.date.toDate().getDay();
                        dayExpenses[day] += expense.amount;
                    });
                    for (let i = 0; i < 7; i++) {
                        chartData.push({ name: days[(now.getDay() - 6 + i + 7) % 7], value: dayExpenses[(now.getDay() - 6 + i + 7) % 7] });
                    }
                } else if (timeframe === 'month') {
                    const monthDayExpenses = new Array(now.getDate()).fill(0);
                    expenses.forEach(expense => {
                        const day = expense.date.toDate().getDate() - 1;
                        monthDayExpenses[day] += expense.amount;
                    });
                    for (let i = 0; i < now.getDate(); i++) {
                        chartData.push({ name: i + 1, value: monthDayExpenses[i] });
                    }
                } else { // year
                    const monthExpenses = new Array(12).fill(0);
                    expenses.forEach(expense => {
                        const month = expense.date.toDate().getMonth();
                        monthExpenses[month] += expense.amount;
                    });
                    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                    for (let i = 0; i < 12; i++) {
                        chartData.push({ name: monthNames[i], value: monthExpenses[i] });
                    }
                }
                setData(chartData);
                setLoading(false);
            }
        };

        fetchData();
    }, [hasPermission, timeframe]);


    if (!hasPermission('readExpense')) {
        return null;
    }

    return (
        <div className={styles.chartCard}>
            <div className={styles.chartHeader}>
                <h3 className={styles.chartTitle}>Expenses</h3>
                <select onChange={(e) => setTimeframe(e.target.value)} value={timeframe}>
                    <option value="week">This Week</option>
                    <option value="month">This Month</option>
                    <option value="year">This Year</option>
                </select>
            </div>
            <div className={styles.chartContainer}>
                {loading ? <p>Loading...</p> :
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                            <XAxis
                                dataKey="name"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#9ca3af', fontSize: 12 }}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#9ca3af', fontSize: 12 }}
                            />
                            <Bar dataKey="value" fill="#2b7a8e" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                }
            </div>
        </div>
    );
};

export default ExpenseChart;
