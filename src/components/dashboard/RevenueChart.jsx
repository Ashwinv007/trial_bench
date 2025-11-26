
import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import styles from '../Dashboard.module.css';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { usePermissions } from '../../auth/usePermissions';

const RevenueChart = () => {
    const { hasPermission } = usePermissions();
    const [timeframe, setTimeframe] = useState('month');
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (hasPermission('readInvoice')) {
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

                const invoicesCollection = collection(db, 'invoices');
                const q = query(
                    invoicesCollection,
                    where('paymentStatus', '==', 'Paid'),
                    where('dateOfPayment', '>=', Timestamp.fromDate(startDate))
                );
                const snapshot = await getDocs(q);
                const invoices = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));

                // Process data for chart
                const chartData = [];
                if (timeframe === 'week') {
                    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                    const dayRevenues = new Array(7).fill(0);
                    invoices.forEach(invoice => {
                        const day = invoice.dateOfPayment.toDate().getDay();
                        dayRevenues[day] += invoice.totalAmountPayable;
                    });
                    for (let i = 0; i < 7; i++) {
                        chartData.push({ name: days[(now.getDay() - 6 + i + 7) % 7], value: dayRevenues[(now.getDay() - 6 + i + 7) % 7] });
                    }
                } else if (timeframe === 'month') {
                    const monthDayRevenues = new Array(now.getDate()).fill(0);
                    invoices.forEach(invoice => {
                        const day = invoice.dateOfPayment.toDate().getDate() - 1;
                        monthDayRevenues[day] += invoice.totalAmountPayable;
                    });
                    for (let i = 0; i < now.getDate(); i++) {
                        chartData.push({ name: i + 1, value: monthDayRevenues[i] });
                    }
                } else { // year
                    const monthRevenues = new Array(12).fill(0);
                    invoices.forEach(invoice => {
                        const month = invoice.dateOfPayment.toDate().getMonth();
                        monthRevenues[month] += invoice.totalAmountPayable;
                    });
                    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                    for (let i = 0; i < 12; i++) {
                        chartData.push({ name: monthNames[i], value: monthRevenues[i] });
                    }
                }

                setData(chartData);
                setLoading(false);
            }
        };

        fetchData();
    }, [hasPermission, timeframe]);


    if (!hasPermission('readInvoice')) {
        return null;
    }

    return (
        <div className={styles.chartCard}>
            <div className={styles.chartHeader}>
                <h3 className={styles.chartTitle}>Revenue</h3>
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

export default RevenueChart;
