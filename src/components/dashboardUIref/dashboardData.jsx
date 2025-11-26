// Demo data for the dashboard

export const statsData = [
  {
    id: 1,
    title: 'Total Revenue',
    value: '$124,500',
    change: '+12.5%',
    trend: 'up',
    icon: 'DollarSign',
    color: '#2b7a8e'
  },
  {
    id: 2,
    title: 'Active Clients',
    value: '86',
    change: '+8',
    trend: 'up',
    icon: 'Users',
    color: '#1a4d5c'
  },
  {
    id: 3,
    title: 'Pending Invoices',
    value: '12',
    change: '-3',
    trend: 'down',
    icon: 'FileText',
    color: '#2b7a8e'
  },
  {
    id: 4,
    title: 'Active Agreements',
    value: '45',
    change: '+5',
    trend: 'up',
    icon: 'FileCheck',
    color: '#1a4d5c'
  }
];

export const birthdaysData = [
  {
    id: 1,
    name: 'Natasha Del Rosario',
    date: 'November 21',
    avatar: 'ND'
  },
  {
    id: 2,
    name: 'kfrhej',
    date: 'November 23',
    avatar: 'KF'
  },
  {
    id: 3,
    name: 'Natasha Del Rosario',
    date: 'November 26',
    avatar: 'ND'
  },
  {
    id: 4,
    name: 'hamdan',
    date: 'November 27',
    avatar: 'HA'
  },
  {
    id: 5,
    name: 'Hey Boy from khiet cheth',
    date: 'November 30',
    avatar: 'HB'
  },
  {
    id: 6,
    name: 'khey khey khyeh nyet iyeh',
    date: 'November 30',
    avatar: 'KK'
  }
];

export const expiringAgreementsData = [
  {
    id: 1,
    client: 'gggggg',
    expireDate: 'Expires on 1/26/2025',
    daysLeft: 61
  },
  {
    id: 2,
    client: 'keeea',
    expireDate: 'Expires on 1/11/2025',
    daysLeft: 46
  },
  {
    id: 3,
    client: 'Ryan Chandran',
    expireDate: 'Expires on 1/18/2025',
    daysLeft: 53
  },
  {
    id: 4,
    client: 'commercial client',
    expireDate: 'Expires on 1/26/2025',
    daysLeft: 61
  }
];

export const unpaidInvoicesData = [
  {
    id: 'INV-WCP2F1-1005',
    client: 'keeea',
    date: '21 Nov 2025',
    amount: 'FC,116',
    description: 'Desk and Chair',
    status: 'Unpaid'
  },
  {
    id: 'INV-WCP2F1-1005',
    client: 'keeea',
    date: '17 Nov 2025',
    amount: 'FC,116',
    description: 'something something 12/25 (Paid 12/17/2025 by 01/11/2025)',
    status: 'Unpaid'
  },
  {
    id: '#Z.dKJWZeyBkf1j1pAjhj',
    client: 'keeea',
    date: '11 Nov 2025',
    amount: 'FC2,695',
    description: 'Desk/Chair/Storage 12/25',
    status: 'Unpaid'
  },
  {
    id: 'INV-WCP2F1-1012',
    client: 'jiyagah',
    date: '17 Nov 2025',
    amount: 'FC,116',
    description: 'Escalata Daedhayi 12/25 (Paid 10/27/2025 To 01/11/2025)',
    status: 'Unpaid'
  },
  {
    id: 'kyB9Dq2iqfiB8monoNnNdofc',
    client: 'Escalata Daedhayi 12/25',
    date: '11 Nov 2025',
    amount: 'FC,116',
    description: 'Desk/Chair/Storage 12/25 (From 10/31/2025 To 01/13/2025)',
    status: 'Unpaid'
  }
];

export const recentClientsData = [
  {
    id: 1,
    name: 'Edgar Miller wiley',
    status: 'Sent email',
    date: 'Today',
    avatar: 'EM'
  },
  {
    id: 2,
    name: 'Iyedu',
    status: 'Contract signed',
    date: 'Today',
    avatar: 'IY'
  },
  {
    id: 3,
    name: 'James doe',
    status: 'Sent email',
    date: 'Yesterday',
    avatar: 'JD'
  }
];

// Lead Conversions Data
export const leadConversionsData = {
  week: [
    { label: 'Mon', conversions: 3 },
    { label: 'Tue', conversions: 5 },
    { label: 'Wed', conversions: 4 },
    { label: 'Thu', conversions: 6 },
    { label: 'Fri', conversions: 7 },
    { label: 'Sat', conversions: 2 },
    { label: 'Sun', conversions: 1 }
  ],
  month: [
    { label: 'Week 1', conversions: 5 },
    { label: 'Week 2', conversions: 8 },
    { label: 'Week 3', conversions: 6 },
    { label: 'Week 4', conversions: 9 }
  ],
  year: [
    { label: 'Jan', conversions: 8 },
    { label: 'Feb', conversions: 12 },
    { label: 'Mar', conversions: 6 },
    { label: 'Apr', conversions: 15 },
    { label: 'May', conversions: 10 },
    { label: 'Jun', conversions: 18 },
    { label: 'Jul', conversions: 14 },
    { label: 'Aug', conversions: 20 },
    { label: 'Sep', conversions: 16 },
    { label: 'Oct', conversions: 22 },
    { label: 'Nov', conversions: 25 },
    { label: 'Dec', conversions: 19 }
  ]
};

// Revenue Data
export const revenueData = {
  week: [
    { label: 'Mon', revenue: 2100 },
    { label: 'Tue', revenue: 2800 },
    { label: 'Wed', revenue: 2400 },
    { label: 'Thu', revenue: 3200 },
    { label: 'Fri', revenue: 3600 },
    { label: 'Sat', revenue: 1800 },
    { label: 'Sun', revenue: 1500 }
  ],
  month: [
    { label: 'Week 1', revenue: 9500 },
    { label: 'Week 2', revenue: 12300 },
    { label: 'Week 3', revenue: 11200 },
    { label: 'Week 4', revenue: 15300 }
  ],
  year: [
    { label: 'Jan', revenue: 8500 },
    { label: 'Feb', revenue: 9200 },
    { label: 'Mar', revenue: 8800 },
    { label: 'Apr', revenue: 10500 },
    { label: 'May', revenue: 11200 },
    { label: 'Jun', revenue: 12800 },
    { label: 'Jul', revenue: 11500 },
    { label: 'Aug', revenue: 13200 },
    { label: 'Sep', revenue: 12600 },
    { label: 'Oct', revenue: 14100 },
    { label: 'Nov', revenue: 15300 },
    { label: 'Dec', revenue: 13800 }
  ]
};

// Expense Data
export const expenseData = {
  week: [
    { label: 'Mon', expenses: 680 },
    { label: 'Tue', expenses: 920 },
    { label: 'Wed', expenses: 780 },
    { label: 'Thu', expenses: 1100 },
    { label: 'Fri', expenses: 950 },
    { label: 'Sat', expenses: 520 },
    { label: 'Sun', expenses: 350 }
  ],
  month: [
    { label: 'Week 1', expenses: 3200 },
    { label: 'Week 2', expenses: 4500 },
    { label: 'Week 3', expenses: 3800 },
    { label: 'Week 4', expenses: 5800 }
  ],
  year: [
    { label: 'Jan', expenses: 4200 },
    { label: 'Feb', expenses: 3800 },
    { label: 'Mar', expenses: 4500 },
    { label: 'Apr', expenses: 4100 },
    { label: 'May', expenses: 5200 },
    { label: 'Jun', expenses: 4800 },
    { label: 'Jul', expenses: 5500 },
    { label: 'Aug', expenses: 5100 },
    { label: 'Sep', expenses: 4700 },
    { label: 'Oct', expenses: 5400 },
    { label: 'Nov', expenses: 5800 },
    { label: 'Dec', expenses: 6200 }
  ]
};
