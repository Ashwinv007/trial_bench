import React from 'react';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  IconButton, 
  Tabs,
  Tab,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import { Close } from '@mui/icons-material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import styles from './Expenses.module.css';
import dayjs from 'dayjs';

const categoryColors = {
  'Rent': '#FF6B6B',
  'Electricity & Utilities': '#4ECDC4',
  'Internet': '#45B7D1',
  'Salaries': '#FFA07A',
  'Pantry': '#98D8C8',
  'Maintenance': '#F7B731',
  'Marketing': '#5F27CD',
  'Other Expenses': '#95A5A6'
};

const getCategoryColor = (category) => {
  if (categoryColors[category]) {
    return categoryColors[category];
  }
  const hash = category.split('').reduce((acc, char) => char.charCodeAt(0) + acc, 0);
  const hue = hash % 360;
  return `hsl(${hue}, 65%, 60%)`;
};

const parseDate = (date) => {
    if (!date) return null;
    if (date.toDate) return date.toDate(); // It's a Timestamp
    return dayjs(date).toDate(); // It's a string or Date object
};

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0
  }).format(amount);
};

const ExpenseReports = ({
  isReportsModalOpen,
  setIsReportsModalOpen,
  expenses,
  reportTab,
  setReportTab,
  selectedReportYear,
  setSelectedReportYear,
  selectedMonthlyYear,
  setSelectedMonthlyYear,
  selectedMonthlyMonth,
  setSelectedMonthlyMonth
}) => {

  const getMonthlyReports = () => {
    const monthlyData = {};
    
    expenses.forEach(expense => {
      const date = parseDate(expense.date);
      if (!date) return;
      const monthYear = `${date.toLocaleString('default', { month: 'long' })} ${date.getFullYear()}`;
      
      if (!monthlyData[monthYear]) {
        monthlyData[monthYear] = {
          total: 0,
          categories: {}
        };
      }
      
      monthlyData[monthYear].total += parseFloat(expense.amount);
      
      if (!monthlyData[monthYear].categories[expense.category]) {
        monthlyData[monthYear].categories[expense.category] = 0;
      }
      monthlyData[monthYear].categories[expense.category] += parseFloat(expense.amount);
    });
    
    return monthlyData;
  };

  const getYearlyReports = () => {
    const yearlyData = {};
    
    expenses.forEach(expense => {
      const date = parseDate(expense.date);
      if (!date) return;
      const year = date.getFullYear().toString();
      
      if (!yearlyData[year]) {
        yearlyData[year] = {
          total: 0,
          categories: {}
        };
      }
      
      yearlyData[year].total += parseFloat(expense.amount);
      
      if (!yearlyData[year].categories[expense.category]) {
        yearlyData[year].categories[expense.category] = 0;
      }
      yearlyData[year].categories[expense.category] += parseFloat(expense.amount);
    });
    
    return yearlyData;
  };

  const getAvailableMonthsForYear = (year) => {
    const months = new Set();
    expenses.forEach(expense => {
        const expenseDate = parseDate(expense.date);
        if (expenseDate && expenseDate.getFullYear().toString() === year) {
            months.add(expenseDate.toLocaleString('default', { month: 'long' }));
        }
    });
    const monthOrder = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return Array.from(months).sort((a, b) => monthOrder.indexOf(a) - monthOrder.indexOf(b));
  };

  const getCategoryChartData = (categoryBreakdown) => {
    return Object.entries(categoryBreakdown)
      .map(([category, amount]) => ({
        category,
        amount,
        color: getCategoryColor(category)
      }))
      .sort((a, b) => b.amount - a.amount);
  };

  return (
    <Dialog 
      open={isReportsModalOpen} 
      onClose={() => setIsReportsModalOpen(false)}
      maxWidth="lg"
      fullWidth
    >
      <DialogTitle>
        Expense Reports
        <IconButton
          onClick={() => setIsReportsModalOpen(false)}
          className={styles.closeButton}
        >
          <Close />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Tabs value={reportTab} onChange={(e, newValue) => setReportTab(newValue)} className={styles.reportTabs}>
          <Tab label="Monthly Reports" />
          <Tab label="Yearly Reports" />
        </Tabs>

        {reportTab === 0 && (
          <div className={styles.reportContent}>
            <div className={styles.reportCardHeader} style={{ marginBottom: '16px', padding: '0 16px' }}>
              <h3 className={styles.reportSectionTitle}>Monthly Expense Breakdown</h3>
              <div style={{ display: 'flex', gap: '16px' }}>
                <FormControl variant="outlined" size="small" style={{ minWidth: 120 }}>
                  <InputLabel>Year</InputLabel>
                  <Select
                    value={selectedMonthlyYear}
                    onChange={(e) => {
                      setSelectedMonthlyYear(e.target.value);
                      setSelectedMonthlyMonth('All'); // Reset month when year changes
                    }}
                    label="Year"
                  >
                    {[...new Set(expenses.map(e => new Date(e.date).getFullYear()))]
                      .sort((a, b) => b - a)
                      .map(year => (
                        <MenuItem key={year} value={year.toString()}>{year}</MenuItem>
                      ))
                    }
                  </Select>
                </FormControl>
                <FormControl variant="outlined" size="small" style={{ minWidth: 120 }}>
                  <InputLabel>Month</InputLabel>
                  <Select
                    value={selectedMonthlyMonth}
                    onChange={(e) => setSelectedMonthlyMonth(e.target.value)}
                    label="Month"
                  >
                    <MenuItem value="All">All Months</MenuItem>
                    {getAvailableMonthsForYear(selectedMonthlyYear).map(month => (
                      <MenuItem key={month} value={month}>{month}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </div>
            </div>

            {(() => {
              const monthlyReports = getMonthlyReports();
              const filteredReports = Object.entries(monthlyReports).filter(([monthYear]) => {
                const [month, year] = monthYear.split(' ');
                if (year !== selectedMonthlyYear) return false;
                if (selectedMonthlyMonth !== 'All' && month !== selectedMonthlyMonth) return false;
                return true;
              });

              if (filteredReports.length === 0) {
                return <p className={styles.emptyReportMessage}>No expenses data available for the selected period.</p>;
              }

              return filteredReports
                .sort((a, b) => new Date(b[0]) - new Date(a[0]))
                .map(([monthYear, data]) => {
                  const chartData = getCategoryChartData(data.categories);
                  return (
                    <Card key={monthYear} className={styles.reportCard}>
                      <CardContent>
                        <div className={styles.reportCardHeader}>
                          <h4>{monthYear}</h4>
                          <span className={styles.reportTotal}>{formatCurrency(data.total)}</span>
                        </div>
                        
                        <div className={styles.chartContainer}>
                          <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={chartData}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="category" angle={-45} textAnchor="end" height={100} />
                              <YAxis />
                              <Tooltip formatter={(value) => formatCurrency(value)} />
                              <Bar dataKey="amount">
                                {chartData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>

                        <div className={styles.categoryBreakdown}>
                          <h5>Category Breakdown</h5>
                          <div className={styles.categoryList}>
                            {chartData.map(({ category, amount, color }) => (
                              <div key={category} className={styles.categoryBreakdownItem}>
                                <div className={styles.categoryLabelWithColor}>
                                  <div className={styles.categoryColorDot} style={{ backgroundColor: color }} />
                                  <span>{category}</span>
                                </div>
                                <span className={styles.categoryAmount}>{formatCurrency(amount)}</span>
                                <span className={styles.categoryPercentage}>
                                  ({((amount / data.total) * 100).toFixed(1)}%)
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                });
            })()}
          </div>
        )}

        {reportTab === 1 && (
          <div className={styles.reportContent}>
            <div className={styles.reportCardHeader} style={{ marginBottom: '16px', padding: '0 16px' }}>
              <h3 className={styles.reportSectionTitle}>Yearly Expense Breakdown</h3>
              <FormControl variant="outlined" size="small" style={{ minWidth: 120 }}>
                <InputLabel>Year</InputLabel>
                <Select
                  value={selectedReportYear}
                  onChange={(e) => setSelectedReportYear(e.target.value)}
                  label="Year"
                >
                  {[...new Set(expenses.map(e => new Date(e.date).getFullYear()))]
                    .sort((a, b) => b - a)
                    .map(year => (
                      <MenuItem key={year} value={year.toString()}>{year}</MenuItem>
                    ))
                  }
                </Select>
              </FormControl>
            </div>
            
            {(() => {
              const yearlyReports = getYearlyReports();
              const dataForYear = yearlyReports[selectedReportYear];

              if (!dataForYear) {
                return <p className={styles.emptyReportMessage}>No expenses data available for {selectedReportYear}</p>;
              }

              const chartData = getCategoryChartData(dataForYear.categories);
              return (
                <Card key={selectedReportYear} className={styles.reportCard}>
                  <CardContent>
                    <div className={styles.reportCardHeader}>
                      <h4>{selectedReportYear}</h4>
                      <span className={styles.reportTotal}>{formatCurrency(dataForYear.total)}</span>
                    </div>
                    
                    <div className={styles.chartContainer}>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="category" angle={-45} textAnchor="end" height={100} />
                          <YAxis />
                          <Tooltip formatter={(value) => formatCurrency(value)} />
                          <Bar dataKey="amount">
                            {chartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    <div className={styles.categoryBreakdown}>
                      <h5>Category Breakdown</h5>
                      <div className={styles.categoryList}>
                        {chartData.map(({ category, amount, color }) => (
                          <div key={category} className={styles.categoryBreakdownItem}>
                            <div className={styles.categoryLabelWithColor}>
                              <div className={styles.categoryColorDot} style={{ backgroundColor: color }} />
                              <span>{category}</span>
                            </div>
                            <span className={styles.categoryAmount}>{formatCurrency(amount)}</span>
                            <span className={styles.categoryPercentage}>
                              ({((amount / dataForYear.total) * 100).toFixed(1)}%)
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })()}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ExpenseReports;
