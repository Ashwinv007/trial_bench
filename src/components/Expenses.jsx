import { useState, useEffect, useContext, useMemo } from 'react';
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
  CardContent,
  CircularProgress
} from '@mui/material';
import { Close, AddCircleOutline, Edit, Delete, Settings, FileDownload, Assessment } from '@mui/icons-material';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import styles from './Expenses.module.css';
import { db } from '../firebase/config';
import { collection, addDoc, updateDoc, deleteDoc, doc, Timestamp, query, where, writeBatch, getDocs } from 'firebase/firestore';
import { AuthContext } from '../store/Context';
import { usePermissions } from '../auth/usePermissions';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import { useData } from '../store/DataContext'; // Import useData
import { logActivity } from '../utils/logActivity';

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

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

const parseDate = (date) => {
    if (!date) return null;
    if (date.toDate) return date.toDate(); // It's a Timestamp
    return dayjs(date).toDate(); // It's a string or Date object
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
  const { user } = useContext(AuthContext);
  const { hasPermission } = usePermissions();
  const { expenses, expenseCategories: categories, loading, refreshing, refreshData } = useData(); // Use data from DataContext
  // const [expenses, setExpenses] = useState([]); // Removed local state
  // const [categories, setCategories] = useState([]); // Removed local state
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isReportsModalOpen, setIsReportsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [newCategory, setNewCategory] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [dateFrom, setDateFrom] = useState(null);
  const [dateTo, setDateTo] = useState(null);
  const [reportTab, setReportTab] = useState(0); // 0 for Monthly, 1 for Yearly
  const [selectedReportYear, setSelectedReportYear] = useState(new Date().getFullYear().toString());
  const [selectedMonthlyYear, setSelectedMonthlyYear] = useState(new Date().getFullYear().toString());
  const [selectedMonthlyMonth, setSelectedMonthlyMonth] = useState('All');
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [deletingExpenseId, setDeletingExpenseId] = useState(null);
  const [formData, setFormData] = useState({
    category: '',
    amount: '',
    date: null,
    notes: '',
    billNumber: ''
  });

  // Removed fetchExpenses and fetchCategories, now handled by DataContext

  useEffect(() => {
    if (!hasPermission('expenses:view')) {
      // If permission is denied, ensure categories and expenses are empty to prevent issues
      // This might be redundant if DataContext handles permissions correctly by not providing data
    }
  }, [hasPermission]);


  useEffect(() => {
    if (isReportsModalOpen) {
      // Use expenses from DataContext
      const availableYears = [...new Set(expenses.map(e => parseDate(e.date).getFullYear()))].sort((a, b) => b - a);
      if (availableYears.length > 0) {
        setSelectedReportYear(availableYears[0].toString());
        setSelectedMonthlyYear(availableYears[0].toString());
      } else {
        const currentYear = new Date().getFullYear().toString();
        setSelectedReportYear(currentYear);
        setSelectedMonthlyYear(currentYear);
      }
      setSelectedMonthlyMonth('All');
    }
  }, [isReportsModalOpen, expenses]); // Depend on expenses from DataContext

  const handleOpenExpenseModal = () => {
    setIsExpenseModalOpen(true);
    setEditingExpense(null);
    setFormData({
      category: '',
      amount: '',
      date: null,
      notes: '',
      billNumber: ''
    });
  };

  const handleEditExpense = (expense) => {
    setEditingExpense(expense);
    setFormData({
      category: expense.category,
      amount: expense.amount,
      date: parseDate(expense.date),
      notes: expense.notes,
      billNumber: expense.billNumber
    });
    setIsExpenseModalOpen(true);
  };

  const handleDeleteExpense = async (id) => {
    if (!hasPermission('expenses:delete')) {
      toast.error("You don't have permission to delete expenses.");
      return;
    }
    if (window.confirm('Are you sure you want to delete this expense?')) {
      setDeletingExpenseId(id);
      try {
        await deleteDoc(doc(db, 'expenses', id));
        refreshData('expenses'); // Refresh expenses data in context
        toast.success('Expense deleted successfully');
      } catch (error) {
        toast.error('Failed to delete expense.');
      } finally {
        setDeletingExpenseId(null);
      }
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
    const selectedDate = formData.date;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate > today) {
      const confirmFuture = window.confirm('Warning: The selected date is in the future. Do you want to proceed?');
      if (!confirmFuture) {
        return;
      }
    }

    setIsSaving(true);
    const payload = {
        ...formData,
        amount: amount,
        date: Timestamp.fromDate(formData.date)
    };

    try {
      if (editingExpense) {
        const expenseDoc = doc(db, 'expenses', editingExpense.id);
        await updateDoc(expenseDoc, payload);
        toast.success('Expense updated successfully');
      } else {
        payload.addedBy = user.displayName;
        await addDoc(collection(db, 'expenses'), payload);
        toast.success('Expense added successfully');
      }
      refreshData('expenses'); // Refresh expenses data in context
      setIsExpenseModalOpen(false);
      setEditingExpense(null);
    } catch (error) {
      toast.error('Failed to save expense.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenCategoryModal = () => {
    if (!hasPermission('expenses:manage_categories')) {
      toast.error("You don't have permission to manage categories.");
      return;
    }
    setIsCategoryModalOpen(true);
    setEditingCategory(null);
    setNewCategory('');
  };

  const getCategoryUsageCount = (categoryName) => {
    return expenses.filter(expense => expense.category === categoryName).length; // Use expenses from DataContext
  };

  const handleAddCategory = async () => {
    if (!hasPermission('expenses:manage_categories')) {
        toast.error("You don't have permission to add categories.");
        return;
    }
    if (!newCategory.trim()) {
      toast.error('Category name cannot be empty');
      return;
    }
    
    if (categories.some(c => c.name.toLowerCase() === newCategory.trim().toLowerCase())) { // Use categories from DataContext
      toast.error('Category already exists');
      return;
    }
    
    try {
      await addDoc(collection(db, 'expense_categories'), { name: newCategory.trim() });
      setNewCategory('');
      toast.success('Category added successfully');
      refreshData('expenses'); // Refresh expenses data in context after adding category
    } catch (error) {
      toast.error('Failed to add category.');
    }
  };

  const handleEditCategory = (category) => {
    setEditingCategory(category);
    setNewCategory(category.name);
  };

  const handleUpdateCategory = async () => {
    if (!hasPermission('expenses:manage_categories')) {
        toast.error("You don't have permission to update categories.");
        return;
    }
    if (!newCategory.trim()) {
      toast.error('Category name cannot be empty');
      return;
    }

    if (newCategory.trim() && editingCategory) {
      const oldCategoryName = editingCategory.name;
      const newCategoryName = newCategory.trim();

      if (oldCategoryName === newCategoryName) {
        setEditingCategory(null);
        setNewCategory('');
        return;
      }
      
      if (categories.some(c => c.name.toLowerCase() === newCategoryName.toLowerCase() && c.id !== editingCategory.id)) { // Use categories from DataContext
        toast.error('A category with this name already exists.');
        return;
      }

      setIsSaving(true);
      try {
        const batch = writeBatch(db);
        
        const categoryDocRef = doc(db, 'expense_categories', editingCategory.id);
        batch.update(categoryDocRef, { name: newCategoryName });

        // Query expenses to update category name
        const expensesToUpdateSnapshot = await query(collection(db, 'expenses'), where('category', '==', oldCategoryName));
        const expensesSnapshot = await getDocs(expensesToUpdateSnapshot);

        if (!expensesSnapshot.empty) {
          expensesSnapshot.forEach(expenseDoc => {
            batch.update(expenseDoc.ref, { category: newCategoryName });
          });
        }
        
        await batch.commit();

        toast.success(`Category updated successfully. ${expensesSnapshot.size} expense(s) were updated.`);
        
        setEditingCategory(null);
        setNewCategory('');
        refreshData('expenses'); // Refresh expenses and categories data in context
      } catch (error) {
        console.error("Error updating category: ", error);
        toast.error('Failed to update category.');
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleDeleteCategory = async (categoryToDelete) => {
    if (!hasPermission('expenses:manage_categories')) {
      toast.error("You don't have permission to delete categories.");
      return;
    }
    
    const usageCount = getCategoryUsageCount(categoryToDelete.name);
    
    let confirmMessage = 'Are you sure you want to delete this category?';
    if (usageCount > 0) {
      confirmMessage = `This category is used in ${usageCount} expense${usageCount > 1 ? 's' : ''}. Deleting it will NOT affect those expenses, but the category will be removed from the list. Are you sure?`;
    }
    
    if (window.confirm(confirmMessage)) {
      try {
        await deleteDoc(doc(db, 'expense_categories', categoryToDelete.id));
        toast.success('Category deleted successfully');
        refreshData('expenses'); // Refresh expenses and categories data in context
      } catch (error) {
        toast.error('Failed to delete category.');
      }
    }
  };

  const handleExport = async () => {
    if (!hasPermission('expenses:export')) {
        toast.error("You don't have permission to export expenses.");
        return;
    }
    setIsExporting(true);
    try {
        const XLSX = await import('xlsx');
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
        logActivity(
            db,
            user,
            'expenses_exported',
            `Exported ${dataToExport.length} expenses.`,
            {
                count: dataToExport.length,
                filters: {
                    category: filterCategory,
                    from: dateFrom ? formatDate(dateFrom) : 'N/A',
                    to: dateTo ? formatDate(dateTo) : 'N/A',
                }
            }
        );
    } catch (error) {
        console.error("Error exporting expenses:", error);
        toast.error("Failed to export expenses.");
    } finally {
        setIsExporting(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString) => {
    const date = parseDate(dateString);
    return date ? date.toLocaleDateString('en-IN', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    }) : '';
  };

  // Filter expenses based on category and date range
  const handleDateChange = (name, newValue) => {
    const dateValue = newValue ? newValue.toDate() : null;
    if (name === 'dateFrom') {
      setDateFrom(dateValue);
    } else if (name === 'dateTo') {
      setDateTo(dateValue);
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: dateValue,
      }));
    }
  };

  // Filter expenses based on category and date range
  const getFilteredExpenses = () => {
    return expenses.filter(expense => { // Use expenses from DataContext
      const categoryMatch = filterCategory === 'All' || expense.category === filterCategory;
      
      const expenseDate = dayjs(parseDate(expense.date));
      const fromDateObj = dateFrom ? dayjs(dateFrom) : null;
      const toDateObj = dateTo ? dayjs(dateTo) : null;
      
      const dateMatch = (!fromDateObj || expenseDate.isSameOrAfter(fromDateObj, 'day')) && (!toDateObj || expenseDate.isSameOrBefore(toDateObj, 'day'));
      
      return categoryMatch && dateMatch;
    });
  };

  const filteredExpenses = getFilteredExpenses();
  const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + parseFloat(expense.amount || 0), 0);

  const handleResetFilters = () => {
    setFilterCategory('All');
    setDateFrom(null);
    setDateTo(null);
    toast.success('Filters reset');
  };

  // Monthly/Yearly Reports Functions
  const getMonthlyReports = () => {
    const monthlyData = {};
    
    expenses.forEach(expense => { // Use expenses from DataContext
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
    
    expenses.forEach(expense => { // Use expenses from DataContext
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
    expenses.forEach(expense => { // Use expenses from DataContext
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

  // Grouping Functions - Relative time grouping like transaction history
  const getRelativeTimeGroup = (dateField) => {
    const expenseDate = dayjs(parseDate(dateField));
    if (!expenseDate.isValid()) return { key: 'invalid', label: 'Invalid Date', order: 99 };
    const today = dayjs().startOf('day');
    
    const diffDays = today.diff(expenseDate, 'day');
    
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
    const expenseMonth = expenseDate.month();
    const expenseYear = expenseDate.year();
    const currentMonth = today.month();
    const currentYear = today.year();
    
    if (expenseYear === currentYear && expenseMonth === currentMonth && diffDays >= 14) {
      return { key: 'thisMonth', label: 'This Month', order: 4 };
    }
    
    // Last Month
    const lastMonth = dayjs().subtract(1, 'month').startOf('month');
    
    if (expenseDate.year() === lastMonth.year() && expenseDate.month() === lastMonth.month()) {
      return { key: 'lastMonth', label: 'Last Month', order: 5 };
    }
    
    // Earlier - group by month/year
    const monthYear = expenseDate.format('MMMM YYYY');
    return { key: `earlier-${monthYear}`, label: monthYear, order: 6 };
  };

  const getGroupedExpensesByTime = () => {
    const grouped = {};
    const sorted = [...filteredExpenses].sort((a, b) => dayjs(parseDate(b.date)).valueOf() - dayjs(parseDate(a.date)).valueOf());

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
  
  if (!hasPermission('expenses:view')) {
    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div>
                    <h1>Permission Denied</h1>
                    <p className={styles.subtitle}>You do not have permission to view this page.</p>
                </div>
            </div>
        </div>
    );
  }

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
          {hasPermission('expenses:view_reports') && (
            <Button
              variant="outlined"
              startIcon={<Assessment />}
              onClick={() => setIsReportsModalOpen(true)}
              className={styles.reportsButton}
            >
              Reports
            </Button>
          )}
          {hasPermission('expenses:export') && (
            <Button
              variant="outlined"
              startIcon={isExporting ? <CircularProgress size={20} color="inherit" /> : <FileDownload />}
              onClick={handleExport}
              className={styles.exportButton}
              disabled={isExporting}
            >
              {isExporting ? 'Exporting...' : 'Export'}
            </Button>
          )}
          {hasPermission('expenses:manage_categories') && (
            <Button
              variant="outlined"
              startIcon={<Settings />}
              onClick={handleOpenCategoryModal}
              className={styles.categoryButton}
            >
              Manage Categories
            </Button>
          )}
          {hasPermission('expenses:add') && (
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
      <LocalizationProvider dateAdapter={AdapterDayjs}>
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
              <MenuItem key={category.id} value={category.name}>
                {category.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <DatePicker
          label="From Date"
          value={dateFrom ? dayjs(dateFrom) : null}
          onChange={(newValue) => handleDateChange('dateFrom', newValue)}
          format="DD/MM/YYYY"
          className={styles.filterControl}
          slotProps={{ textField: { fullWidth: true, variant: 'outlined', size: 'small' } }}
        />

        <DatePicker
          label="To Date"
          value={dateTo ? dayjs(dateTo) : null}
          onChange={(newValue) => handleDateChange('dateTo', newValue)}
          format="DD/MM/YYYY"
          className={styles.filterControl}
          slotProps={{ textField: { fullWidth: true, variant: 'outlined', size: 'small' } }}
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
      </LocalizationProvider>

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
            {loading.expenses || refreshing.expenses ? ( // Use loading and refreshing state from context
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '20px' }}>
                  <CircularProgress />
                </td>
              </tr>
            ) : filteredExpenses.length === 0 ? (
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
                          {hasPermission('expenses:edit') && (
                            <IconButton 
                              size="small" 
                              onClick={() => handleEditExpense(expense)}
                              className={styles.editButton}
                            >
                              <Edit fontSize="small" />
                            </IconButton>
                          )}
                          {hasPermission('expenses:delete') && (
                            <IconButton 
                              size="small" 
                              onClick={() => handleDeleteExpense(expense.id)}
                              className={styles.deleteButton}
                              disabled={deletingExpenseId === expense.id}
                            >
                              {deletingExpenseId === expense.id ? <CircularProgress size={20} /> : <Delete fontSize="small" />}
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
                      {hasPermission('expenses:edit') && (
                        <IconButton 
                          size="small" 
                          onClick={() => handleEditExpense(expense)}
                          className={styles.editButton}
                        >
                          <Edit fontSize="small" />
                        </IconButton>
                      )}
                      {hasPermission('expenses:delete') && (
                        <IconButton 
                          size="small" 
                          onClick={() => handleDeleteExpense(expense.id)}
                          className={styles.deleteButton}
                          disabled={deletingExpenseId === expense.id}
                        >
                          {deletingExpenseId === expense.id ? <CircularProgress size={20} /> : <Delete fontSize="small" />}
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
                  <MenuItem key={category.id} value={category.name}>
                    {category.name}
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

            <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DatePicker
              label="Date"
              value={formData.date ? dayjs(formData.date) : null}
              onChange={(newValue) => handleDateChange('date', newValue)}
              format="DD/MM/YYYY"
              slotProps={{ textField: { fullWidth: true, variant: 'outlined', size: 'small', required: true } }}
            />
            </LocalizationProvider>

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
              {((editingExpense && hasPermission('expenses:edit')) || (!editingExpense && hasPermission('expenses:add'))) && (
                <Button 
                  onClick={handleSaveExpense}
                  variant="contained"
                  className={styles.saveButton}
                  disabled={isSaving}
                >
                  {isSaving ? <CircularProgress size={24} /> : (editingExpense ? 'Update' : 'Add') + ' Expense'}
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
                label={editingCategory ? 'Edit Category' : 'New Category'}
                fullWidth
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="Enter category name"
              />
              {editingCategory ? (
                <div className={styles.categoryInputActions}>
                  <Button 
                    onClick={handleUpdateCategory}
                    variant="contained"
                    size="small"
                    disabled={!newCategory.trim() || isSaving}
                  >
                    {isSaving ? <CircularProgress size={20}/> : 'Update'}
                  </Button>
                  <Button 
                    onClick={() => {
                      setEditingCategory(null);
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
              {categories.map((category) => {
                const usageCount = getCategoryUsageCount(category.name);
                return (
                  <div key={category.id} className={styles.categoryItem}>
                    <div className={styles.categoryInfo}>
                      <span>{category.name}</span>
                      {usageCount > 0 && (
                        <span className={styles.usageCount}>
                          {usageCount} expense{usageCount > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    <div className={styles.categoryItemActions}>
                      <IconButton 
                        size="small"
                        onClick={() => handleEditCategory(category)}
                        disabled={editingCategory !== null}
                      >
                        <Edit fontSize="small" />
                      </IconButton>
                      <IconButton 
                        size="small"
                        onClick={() => handleDeleteCategory(category)}
                        disabled={editingCategory !== null}
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
    </div>
  );
}