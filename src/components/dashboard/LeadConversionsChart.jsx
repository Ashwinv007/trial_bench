
import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import styles from '../Dashboard.module.css';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { usePermissions } from '../../auth/usePermissions';

const LeadConversionsChart = () => {
    const { hasPermission } = usePermissions();
    const [timeframe, setTimeframe] = useState('month');
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (hasPermission('readLead')) {
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
                if (timeframe === 'week') {
                    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                    const dayCounts = new Array(7).fill(0);
                    leads.forEach(lead => {
                        const day = lead.lastEditedAt.toDate().getDay();
                        dayCounts[day]++;
                    });
                    for (let i = 0; i < 7; i++) {
                        chartData.push({ name: days[(now.getDay() - 6 + i + 7) % 7], value: dayCounts[(now.getDay() - 6 + i + 7) % 7] });
                    }
                } else if (timeframe === 'month') {
                    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                    const monthDayCounts = new Array(now.getDate()).fill(0);
                    leads.forEach(lead => {
                        const day = lead.lastEditedAt.toDate().getDate() - 1;
                        monthDayCounts[day]++;
                    });
                    for (let i = 0; i < now.getDate(); i++) {
                        chartData.push({ name: i + 1, value: monthDayCounts[i] });
                    }
                } else { // year
                    const monthCounts = new Array(12).fill(0);
                    leads.forEach(lead => {
                        const month = lead.lastEditedAt.toDate().getMonth();
                        monthCounts[month]++;
                    });
                    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                    for (let i = 0; i < 12; i++) {
                        chartData.push({ name: monthNames[i], value: monthCounts[i] });
                    }
                }
                setData(chartData);
                setLoading(false);
            }
        };

        fetchData();
    }, [hasPermission, timeframe]);


    if (!hasPermission('readLead')) {
        return null;
    }

    return (
        <div className={styles.chartCard}>
            <div className={styles.chartHeader}>
                <h3 className={styles.chartTitle}>Lead Conversions</h3>
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

export default LeadConversionsChart;
