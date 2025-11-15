import { useState, useEffect, useContext } from 'react';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  TextField, 
  Button, 
  IconButton, 
  Select, 
  MenuItem, 
  FormControl, 
  InputLabel,
  Tabs,
  Tab,
  Card,
  CardContent
} from '@mui/material';
import { Close, AddCircleOutline, Edit, Delete, Settings, FileDownload, Assessment } from '@mui/icons-material';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import styles from './Expenses.module.css';
import { db } from '../firebase/config';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { AuthContext } from '../store/Context';
import * as XLSX from 'xlsx';

const initialCategories = [
  'Rent',
  'Electricity & Utilities',
  'Internet',
  'Salaries',
  'Pantry',
  'Maintenance',
  'Marketing',
  'Other Expenses'
];

// Category color mapping
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

// Function to get color for a category (with fallback for new categories)
const getCategoryColor = (category) => {
  if (categoryColors[category]) {
    return categoryColors[category];
  }
  // Generate a consistent color for new categories based on hash
  const hash = category.split('').reduce((acc, char) => char.charCodeAt(0) + acc, 0);
  const hue = hash % 360;
  return `hsl(${hue}, 65%, 60%)`;
};

export default function Expenses() {
  const { user, hasPermission } = useContext(AuthContext);
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState(initialCategories);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isReportsModalOpen, setIsReportsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [editingCategoryIndex, setEditingCategoryIndex] = useState(null);
  const [newCategory, setNewCategory] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [reportTab, setReportTab] = useState(0); // 0 for Monthly, 1 for Yearly
  const [formData, setFormData] = useState({
    category: '',
    amount: '',
    date: '',
    notes: '',
    billNumber: ''
  });

  const fetchExpenses = async () => {
    const expensesCollection = collection(db, 'expenses');
    const expensesSnapshot = await getDocs(expensesCollection);
    const expensesList = expensesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setExpenses(expensesList);
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const handleOpenExpenseModal = () => {
    setIsExpenseModalOpen(true);
    setEditingExpense(null);
    setFormData({
      category: '',
      amount: '',
      date: '',
      notes: '',
      billNumber: ''
    });
  };

  const handleEditExpense = (expense) => {
    setEditingExpense(expense);
    setFormData({
      category: expense.category,
      amount: expense.amount,
      date: expense.date,
      notes: expense.notes,
      billNumber: expense.billNumber
    });
    setIsExpenseModalOpen(true);
  };

  const handleDeleteExpense = async (id) => {
    if (window.confirm('Are you sure you want to delete this expense?')) {
      await deleteDoc(doc(db, 'expenses', id));
      fetchExpenses();
      toast.success('Expense deleted successfully');
    }
  };

  const handleSaveExpense = async () => {
    // Validation
    if (!formData.category || !formData.amount || !formData.date) {
      toast.error('Please fill in all required fields (Category, Amount, Date)');
      return;
    }

    // Validate amount is not negative
    const amount = parseFloat(formData.amount);
    if (amount < 0) {
      toast.error('Amount cannot be negative');
      return;
    }

    if (amount === 0) {
      toast.error('Amount must be greater than zero');
      return;
    }

    // Check if date is in the future
    const selectedDate = new Date(formData.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate > today) {
      const confirmFuture = window.confirm('Warning: The selected date is in the future. Do you want to proceed?');
      if (!confirmFuture) {
        return;
      }
    }

    if (editingExpense) {
      const expenseDoc = doc(db, 'expenses', editingExpense.id);
      await updateDoc(expenseDoc, { ...formData, amount: amount });
      toast.success('Expense updated successfully');
    } else {
      await addDoc(collection(db, 'expenses'), { ...formData, amount: amount, addedBy: user.displayName });
      toast.success('Expense added successfully');
    }

    fetchExpenses();
    setIsExpenseModalOpen(false);
    setEditingExpense(null);
  };

  const handleOpenCategoryModal = () => {
    setIsCategoryModalOpen(true);
    setEditingCategoryIndex(null);
    setNewCategory('');
  };

  const getCategoryUsageCount = (category) => {
    return expenses.filter(expense => expense.category === category).length;
  };

  const handleAddCategory = () => {
    if (!newCategory.trim()) {
      toast.error('Category name cannot be empty');
      return;
    }
    
    if (categories.includes(newCategory.trim())) {
      toast.error('Category already exists');
      return;
    }
    
    setCategories([...categories, newCategory.trim()]);
    setNewCategory('');
    toast.success('Category added successfully');
  };

  const handleEditCategory = (index) => {
    setEditingCategoryIndex(index);
    setNewCategory(categories[index]);
  };

  const handleUpdateCategory = () => {
    if (!newCategory.trim()) {
      toast.error('Category name cannot be empty');
      return;
    }

    if (newCategory.trim() && editingCategoryIndex !== null) {
      const updatedCategories = [...categories];
      const oldCategory = categories[editingCategoryIndex];
      updatedCategories[editingCategoryIndex] = newCategory.trim();
      setCategories(updatedCategories);
      
      // Update expenses that use this category
      setExpenses(expenses.map(expense => 
        expense.category === oldCategory 
          ? { ...expense, category: newCategory.trim() }
          : expense
      ));
      
      setEditingCategoryIndex(null);
      setNewCategory('');
      toast.success('Category updated successfully');
    }
  };

  const handleDeleteCategory = (index, category) => {
    const usageCount = getCategoryUsageCount(category);
    
    let confirmMessage = 'Are you sure you want to delete this category?';
    if (usageCount > 0) {
      confirmMessage = `This category is used in ${usageCount} expense${usageCount > 1 ? 's' : ''}. Deleting the category will not delete the expenses. Are you sure you want to proceed?`;
    }
    
    if (window.confirm(confirmMessage)) {
      setCategories(categories.filter((_, i) => i !== index));
      toast.success('Category deleted successfully');
    }
  };

  const handleExport = () => {
    const dataToExport = filteredExpenses.map(expense => ({
      Date: formatDate(expense.date),
      Category: expense.category,
      Amount: parseFloat(expense.amount),
      'Bill Number': expense.billNumber || '-',
      Notes: expense.notes || '-',
      'Added By': expense.addedBy || 'N/A',
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Expenses");
    XLSX.writeFile(wb, "expenses.xlsx");
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  // Filter expenses based on category and date range
  const getFilteredExpenses = () => {
    return expenses.filter(expense => {
      const categoryMatch = filterCategory === 'All' || expense.category === filterCategory;
      
      const expenseDate = new Date(expense.date);
      const fromDate = dateFrom ? new Date(dateFrom) : null;
      const toDate = dateTo ? new Date(dateTo) : null;
      
      const dateMatch = (!fromDate || expenseDate >= fromDate) && (!toDate || expenseDate <= toDate);
      
      return categoryMatch && dateMatch;
    });
  };

  const filteredExpenses = getFilteredExpenses();
  const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + parseFloat(expense.amount || 0), 0);

  const handleResetFilters = () => {
    setFilterCategory('All');
    setDateFrom('');
    setDateTo('');
    toast.success('Filters reset');
  };

  // Monthly/Yearly Reports Functions
  const getMonthlyReports = () => {
    const monthlyData = {};
    
    expenses.forEach(expense => {
      const date = new Date(expense.date);
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
      const date = new Date(expense.date);
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

  const getCategoryChartData = (categoryBreakdown) => {
    return Object.entries(categoryBreakdown)
      .map(([category, amount]) => ({
        category,
        amount,
        color: getCategoryColor(category)
      }))
      .sort((a, b) => b.amount - a.amount);
  };

  // Grouping Functions - Relative time grouping like transaction history
  const getRelativeTimeGroup = (dateString) => {
    const expenseDate = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const expenseDateOnly = new Date(expenseDate);
    expenseDateOnly.setHours(0, 0, 0, 0);
    
    const diffTime = today - expenseDateOnly;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    // Today
    if (diffDays === 0) {
      return { key: 'today', label: 'Today', order: 0 };
    }
    
    // Yesterday
    if (diffDays === 1) {
      return { key: 'yesterday', label: 'Yesterday', order: 1 };
    }
    
    // This Week (within last 7 days, excluding today and yesterday)
    if (diffDays > 1 && diffDays < 7) {
      return { key: 'thisWeek', label: 'This Week', order: 2 };
    }
    
    // Last Week (7-14 days ago)
    if (diffDays >= 7 && diffDays < 14) {
      return { key: 'lastWeek', label: 'Last Week', order: 3 };
    }
    
    // This Month (within current month but older than 2 weeks)
    const expenseMonth = expenseDate.getMonth();
    const expenseYear = expenseDate.getFullYear();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    if (expenseYear === currentYear && expenseMonth === currentMonth && diffDays >= 14) {
      return { key: 'thisMonth', label: 'This Month', order: 4 };
    }
    
    // Last Month
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastMonthYear = lastMonth.getFullYear();
    const lastMonthMonth = lastMonth.getMonth();
    
    if (expenseYear === lastMonthYear && expenseMonth === lastMonthMonth) {
      return { key: 'lastMonth', label: 'Last Month', order: 5 };
    }
    
    // Earlier - group by month/year
    const monthYear = `${expenseDate.toLocaleString('default', { month: 'long' })} ${expenseYear}`;
    return { key: `earlier-${monthYear}`, label: monthYear, order: 6 };
  };

  const getGroupedExpensesByTime = () => {
    const grouped = {};
    const sorted = [...filteredExpenses].sort((a, b) => new Date(b.date) - new Date(a.date));

    sorted.forEach(expense => {
      const groupInfo = getRelativeTimeGroup(expense.date);
      const groupKey = groupInfo.key;

      if (!grouped[groupKey]) {
        grouped[groupKey] = {
          label: groupInfo.label,
          order: groupInfo.order,
          expenses: []
        };
      }
      grouped[groupKey].expenses.push(expense);
    });

    // Sort groups by order
    const sortedGroups = Object.entries(grouped).sort((a, b) => a[1].order - b[1].order);
    
    return sortedGroups;
  };

  const groupedExpensesByTime = getGroupedExpensesByTime();
  const calculateGroupTotal = (expenseGroup) => {
    return expenseGroup.reduce((sum, expense) => sum + parseFloat(expense.amount || 0), 0);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1>Expenses</h1>
          <p className={styles.subtitle}>
            Total Expenses: <span className={styles.totalAmount}>{formatCurrency(totalExpenses)}</span>
            {filteredExpenses.length !== expenses.length && (
              <span className={styles.filterInfo}> (Filtered: {filteredExpenses.length} of {expenses.length})</span>
            )}
          </p>
        </div>
        <div className={styles.headerButtons}>
          {hasPermission('view_expense_reports') && (
            <Button
              variant="outlined"
              startIcon={<Assessment />}
              onClick={() => setIsReportsModalOpen(true)}
              className={styles.reportsButton}
            >
              Reports
            </Button>
          )}
          {hasPermission('export_expenses') && (
            <Button
              variant="outlined"
              startIcon={<FileDownload />}
              onClick={handleExport}
              className={styles.exportButton}
            >
              Export
            </Button>
          )}
          {hasPermission('manage_settings') && (
            <Button
              variant="outlined"
              startIcon={<Settings />}
              onClick={handleOpenCategoryModal}
              className={styles.categoryButton}
            >
              Manage Categories
            </Button>
          )}
          {hasPermission('add_expenses') && (
            <Button
              variant="contained"
              startIcon={<AddCircleOutline />}
              onClick={handleOpenExpenseModal}
              className={styles.addButton}
            >
              Add Expense
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className={styles.filtersContainer}>
        <FormControl className={styles.filterControl}>
          <InputLabel>Category</InputLabel>
          <Select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            label="Category"
          >
            <MenuItem value="All">All Categories</MenuItem>
            {categories.map((category) => (
              <MenuItem key={category} value={category}>
                {category}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          label="From Date"
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          InputLabelProps={{ shrink: true }}
          className={styles.filterControl}
        />

        <TextField
          label="To Date"
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          InputLabelProps={{ shrink: true }}
          className={styles.filterControl}
        />

        {(filterCategory !== 'All' || dateFrom || dateTo) && (
          <Button
            variant="outlined"
            onClick={handleResetFilters}
            className={styles.resetButton}
          >
            Reset Filters
          </Button>
        )}
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Date</th>
              <th>Category</th>
              <th>Amount</th>
              <th>Bill Number</th>
              <th>Notes</th>
              <th>Added By</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredExpenses.length === 0 ? (
              <tr>
                <td colSpan="7" className={styles.emptyState}>
                  {expenses.length === 0 
                    ? 'No expenses recorded yet. Click "Add Expense" to get started.'
                    : 'No expenses match the selected filters.'}
                </td>
              </tr>
            ) : groupedExpensesByTime ? (
              // Grouped view
              groupedExpensesByTime.map(([groupKey, groupData]) => (
                <>
                  <tr key={`group-${groupKey}`} className={styles.groupHeader}>
                    <td colSpan="7">
                      <div className={styles.groupHeaderContent}>
                        <span className={styles.groupLabel}>{groupData.label}</span>
                        <span className={styles.groupTotal}>
                          {groupData.expenses.length} expense{groupData.expenses.length > 1 ? 's' : ''} • {formatCurrency(calculateGroupTotal(groupData.expenses))}
                        </span>
                      </div>
                    </td>
                  </tr>
                  {groupData.expenses.map((expense) => (
                    <tr key={expense.id} className={styles.groupedRow}>
                      <td>{formatDate(expense.date)}</td>
                      <td>
                        <span 
                          className={styles.categoryBadge}
                          style={{ 
                            backgroundColor: getCategoryColor(expense.category) + '20',
                            color: getCategoryColor(expense.category),
                            borderLeft: `3px solid ${getCategoryColor(expense.category)}`
                          }}
                        >
                          {expense.category}
                        </span>
                      </td>
                      <td className={styles.amount}>{formatCurrency(expense.amount)}</td>
                      <td>{expense.billNumber || '-'}</td>
                      <td className={styles.notes}>{expense.notes || '-'}</td>
                      <td>{expense.addedBy || 'N/A'}</td>
                      <td>
                        <div className={styles.actions}>
                          {hasPermission('edit_expenses') && (
                            <IconButton 
                              size="small" 
                              onClick={() => handleEditExpense(expense)}
                              className={styles.editButton}
                            >
                              <Edit fontSize="small" />
                            </IconButton>
                          )}
                          {hasPermission('delete_expenses') && (
                            <IconButton 
                              size="small" 
                              onClick={() => handleDeleteExpense(expense.id)}
                              className={styles.deleteButton}
                            >
                              <Delete fontSize="small" />
                            </IconButton>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </>
              ))
            ) : (
              // Ungrouped view
              filteredExpenses.sort((a, b) => new Date(b.date) - new Date(a.date)).map((expense) => (
                <tr key={expense.id}>
                  <td>{formatDate(expense.date)}</td>
                  <td>
                    <span 
                      className={styles.categoryBadge}
                      style={{ 
                        backgroundColor: getCategoryColor(expense.category) + '20',
                        color: getCategoryColor(expense.category),
                        borderLeft: `3px solid ${getCategoryColor(expense.category)}`
                      }}
                    >
                      {expense.category}
                    </span>
                  </td>
                  <td className={styles.amount}>{formatCurrency(expense.amount)}</td>
                  <td>{expense.billNumber || '-'}</td>
                  <td className={styles.notes}>{expense.notes || '-'}</td>
                  <td>{expense.addedBy || 'N/A'}</td>
                  <td>
                    <div className={styles.actions}>
                      {hasPermission('edit_expenses') && (
                        <IconButton 
                          size="small" 
                          onClick={() => handleEditExpense(expense)}
                          className={styles.editButton}
                        >
                          <Edit fontSize="small" />
                        </IconButton>
                      )}
                      {hasPermission('delete_expenses') && (
                        <IconButton 
                          size="small" 
                          onClick={() => handleDeleteExpense(expense.id)}
                          className={styles.deleteButton}
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Expense Modal */}
      <Dialog 
        open={isExpenseModalOpen} 
        onClose={() => setIsExpenseModalOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editingExpense ? 'Edit Expense' : 'Add Expense'}
          <IconButton
            onClick={() => setIsExpenseModalOpen(false)}
            className={styles.closeButton}
          >
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <div className={styles.form}>
            <FormControl fullWidth required>
              <InputLabel>Category</InputLabel>
              <Select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                label="Category"
              >
                {categories.map((category) => (
                  <MenuItem key={category} value={category}>
                    {category}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Amount"
              type="number"
              fullWidth
              required
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              InputProps={{
                startAdornment: <span style={{ marginRight: '8px' }}>₹</span>
              }}
              inputProps={{ min: 0, step: 0.01 }}
            />

            <TextField
              label="Date"
              type="date"
              fullWidth
              required
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />

            <TextField
              label="Bill Number"
              fullWidth
              value={formData.billNumber}
              onChange={(e) => setFormData({ ...formData, billNumber: e.target.value })}
              placeholder="Optional"
            />

            <TextField
              label="Notes"
              fullWidth
              multiline
              rows={3}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Optional"
            />

            <div className={styles.modalActions}>
              <Button 
                onClick={() => setIsExpenseModalOpen(false)}
                variant="outlined"
              >
                Cancel
              </Button>
              {((editingExpense && hasPermission('edit_expenses')) || (!editingExpense && hasPermission('add_expenses'))) && (
                <Button 
                  onClick={handleSaveExpense}
                  variant="contained"
                  className={styles.saveButton}
                >
                  {editingExpense ? 'Update' : 'Add'} Expense
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Manage Categories Modal */}
      <Dialog 
        open={isCategoryModalOpen} 
        onClose={() => setIsCategoryModalOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Manage Expense Categories
          <IconButton
            onClick={() => setIsCategoryModalOpen(false)}
            className={styles.closeButton}
          >
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <div className={styles.categoryForm}>
            <div className={styles.categoryInput}>
              <TextField
                label={editingCategoryIndex !== null ? 'Edit Category' : 'New Category'}
                fullWidth
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="Enter category name"
              />
              {editingCategoryIndex !== null ? (
                <div className={styles.categoryInputActions}>
                  <Button 
                    onClick={handleUpdateCategory}
                    variant="contained"
                    size="small"
                    disabled={!newCategory.trim()}
                  >
                    Update
                  </Button>
                  <Button 
                    onClick={() => {
                      setEditingCategoryIndex(null);
                      setNewCategory('');
                    }}
                    variant="outlined"
                    size="small"
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button 
                  onClick={handleAddCategory}
                  variant="contained"
                  disabled={!newCategory.trim()}
                >
                  Add
                </Button>
              )}
            </div>

            <div className={styles.categoryList}>
              <h3>Existing Categories</h3>
              {categories.map((category, index) => {
                const usageCount = getCategoryUsageCount(category);
                return (
                  <div key={category} className={styles.categoryItem}>
                    <div className={styles.categoryInfo}>
                      <span>{category}</span>
                      {usageCount > 0 && (
                        <span className={styles.usageCount}>
                          {usageCount} expense{usageCount > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    <div className={styles.categoryItemActions}>
                      <IconButton 
                        size="small"
                        onClick={() => handleEditCategory(index)}
                        disabled={editingCategoryIndex !== null}
                      >
                        <Edit fontSize="small" />
                      </IconButton>
                      <IconButton 
                        size="small"
                        onClick={() => handleDeleteCategory(index, category)}
                        disabled={editingCategoryIndex !== null}
                        className={styles.deleteButton}
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reports Modal */}
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
              <h3 className={styles.reportSectionTitle}>Monthly Expense Breakdown</h3>
              {Object.keys(getMonthlyReports()).length === 0 ? (
                <p className={styles.emptyReportMessage}>No expenses data available for monthly reports</p>
              ) : (
                Object.entries(getMonthlyReports())
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
                  })
              )}
            </div>
          )}

          {reportTab === 1 && (
            <div className={styles.reportContent}>
              <h3 className={styles.reportSectionTitle}>Yearly Expense Breakdown</h3>
              {Object.keys(getYearlyReports()).length === 0 ? (
                <p className={styles.emptyReportMessage}>No expenses data available for yearly reports</p>
              ) : (
                Object.entries(getYearlyReports())
                  .sort((a, b) => b[0] - a[0])
                  .map(([year, data]) => {
                    const chartData = getCategoryChartData(data.categories);
                    return (
                      <Card key={year} className={styles.reportCard}>
                        <CardContent>
                          <div className={styles.reportCardHeader}>
                            <h4>{year}</h4>
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
                  })
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}