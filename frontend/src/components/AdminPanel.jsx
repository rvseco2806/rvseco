import React, { useState, useEffect } from 'react';
import { db } from '../db/localStorageDB';
import { 
  BarChart2, FileText, Database, ShieldAlert, DollarSign, 
  Download, Plus, Trash2, Edit2, Calendar, Settings,
  Users, Activity, ChevronRight, LogOut, Search, TrendingUp, RefreshCw, Menu,
  Building2, X, Send
} from 'lucide-react';
import { sendWhatsAppDemandNotice, sendWhatsAppReceipt } from '../utils/whatsapp';
import { 
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend,
  LineChart, Line, XAxis, YAxis, CartesianGrid
} from 'recharts';

const EST_ROUTES = [
  { id: '1', name: 'GANDHICHOWK' },
  { id: '2', name: 'GATTAIAH CENTER' },
  { id: '3', name: 'IT HUB TO SRI SRI CIRCLE' },
  { id: '4', name: 'KAMAN BAZAR' },
  { id: '5', name: 'KHANAPURAM' },
  { id: '6', name: 'MUSTAFANAGAR' },
  { id: '7', name: 'WYRA ROAD' }
];

export default function AdminPanel({ onLogout, currentRates, onRatesUpdated, isMobile = false, adminType = 'drcc', currentUser }) {
  // Navigation: 'dashboard', 'records', 'master-divisions', 'master-vehicles', 'master-drivers', 'rates', 'reports', 'users', 'logs', 'settings'
  const [activeTab, setActiveTab] = useState('dashboard');
  const [masterOpen, setMasterOpen] = useState(true); // Toggle Master Data submenu
  const [menuOpen, setMenuOpen] = useState(false); // Mobile menu toggle
  
  // Date range filter for dashboard ('today', '7days', 'all')
  const [dateRange, setDateRange] = useState('today');

  // Database lists state
  const [records, setRecords] = useState([]);
  const [divisions, setDivisions] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [rates, setRates] = useState({ 
    plastic: 16, 
    cardboard: 10, 
    glass: 3, 
    others: 3,
    others_iron: 25,
    others_babybox: 3,
    others_blackplastic: 3
  });
  const [activityLogs, setActivityLogs] = useState([]);

  // Form states for adding master data
  const [newDivName, setNewDivName] = useState('');
  const [newVehType, setNewVehType] = useState('AUTO');
  const [newVehNo, setNewVehNo] = useState('');
  const [newVehDriver, setNewVehDriver] = useState('');
  const [newVehDivision, setNewVehDivision] = useState('');
  const [newDriverName, setNewDriverName] = useState('');
  const [newDriverPhone, setNewDriverPhone] = useState('');


  // Rates edit state
  const [editRates, setEditRates] = useState({ 
    plastic: 16, 
    cardboard: 10, 
    glass: 3, 
    others: 3,
    others_iron: 25,
    others_babybox: 3,
    others_blackplastic: 3
  });

  // Helper to get local date ISO string (YYYY-MM-DD)
  const getLocalDateISO = (offsetDays = 0) => {
    const d = new Date();
    if (offsetDays !== 0) {
      d.setDate(d.getDate() + offsetDays);
    }
    const tzOffset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - tzOffset).toISOString().split('T')[0];
  };

  // Records page filter state
  // Records page filter state
  const [filterDate, setFilterDate] = useState(() => getLocalDateISO());
  const [filterDivision, setFilterDivision] = useState('All');
  const [filterVehicleType, setFilterVehicleType] = useState('All');
  const [filterDriver, setFilterDriver] = useState('All');
  const [recordSearchResults, setRecordSearchResults] = useState([]);

  // User Management State
  const [users, setUsers] = useState([]);
  const [newUsername, setNewUsername] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState('operator');
  const [newUserStatus, setNewUserStatus] = useState('active');
  const [changePasswordUsername, setChangePasswordUsername] = useState('');
  const [changePasswordValue, setChangePasswordValue] = useState('');

  // Quick & Custom Reports State
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [reportStartDate, setReportStartDate] = useState(() => getLocalDateISO(-7));
  const [reportEndDate, setReportEndDate] = useState(() => getLocalDateISO());
  const [reportDivision, setReportDivision] = useState('All');
  const [reportVehicle, setReportVehicle] = useState('All');
  const [reportDriver, setReportDriver] = useState('All');
  const [reportItem, setReportItem] = useState('All');

  // Establishments Administration State
  const [estReportOption, setEstReportOption] = useState('daily');
  const [estSelectedCollector, setEstSelectedCollector] = useState('All');
  const [estSelectedRoute, setEstSelectedRoute] = useState('All');
  const [estReportMonth, setEstReportMonth] = useState(new Date().getMonth());
  const [estReportYear, setEstReportYear] = useState(new Date().getFullYear());
  const [estReportStartDate, setEstReportStartDate] = useState(new Date().toLocaleDateString('en-CA'));
  const [estReportEndDate, setEstReportEndDate] = useState(new Date().toLocaleDateString('en-CA'));
  const [establishmentsList, setEstablishmentsList] = useState([]);
  const [establishmentPaymentsList, setEstablishmentPaymentsList] = useState([]);
  const [estActiveAction, setEstActiveAction] = useState('update-fees');
  const [estAdminSearch, setEstAdminSearch] = useState('');

  // Fix/Update User Fee State
  const [feeRoute, setFeeRoute] = useState('All');
  const [feeSelectedEstId, setFeeSelectedEstId] = useState('');
  const [feeNewAmount, setFeeNewAmount] = useState('');
  const [feeSuccessMsg, setFeeSuccessMsg] = useState('');

  // Apply Penalty State
  const [penaltyRoute, setPenaltyRoute] = useState('All');
  const [penaltyEstId, setPenaltyEstId] = useState('');
  const [penaltyAmount, setPenaltyAmount] = useState('');
  const [penaltyRemarks, setPenaltyRemarks] = useState('');
  const [penaltySuccessMsg, setPenaltySuccessMsg] = useState('');

  // Establishment Master Data Management State
  const [estMasterRoute, setEstMasterRoute] = useState('All');
  const [estMasterSearch, setEstMasterSearch] = useState('');
  const [estMasterStatus, setEstMasterStatus] = useState('All');
  const [isEstModalOpen, setIsEstModalOpen] = useState(false);
  const [editingEst, setEditingEst] = useState(null);
  const [estFormId, setEstFormId] = useState('');
  const [estFormName, setEstFormName] = useState('');
  const [estFormProprietor, setEstFormProprietor] = useState('');
  const [estFormPhone, setEstFormPhone] = useState('');
  const [estFormRouteId, setEstFormRouteId] = useState('1');
  const [estFormMonthlyFee, setEstFormMonthlyFee] = useState('');
  const [estFormPreviousBalance, setEstFormPreviousBalance] = useState('');
  const [estFormPenalty, setEstFormPenalty] = useState('');
  const [estFormStatus, setEstFormStatus] = useState('active');
  const [estMasterSuccessMsg, setEstMasterSuccessMsg] = useState('');

  // Load database on mount
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    const recs = await db.getRecords();
    setRecords(recs);
    
    const localToday = getLocalDateISO();
    const hasTodayRecords = recs.some(r => r.dateTime.startsWith(localToday));
    const defaultSearchDate = localToday;
    
    setFilterDate(defaultSearchDate);
    setRecordSearchResults(recs.filter(r => r.dateTime.startsWith(defaultSearchDate)));
    
    setDivisions(await db.getDivisions());
    setVehicles(await db.getVehicles());
    setDrivers(await db.getDrivers());
    setUsers(await db.getUsers());
    
    const fetchedRates = await db.getRates();
    setRates(fetchedRates);
    setEditRates(fetchedRates);

    // Initial seed of activity log if empty
    if (!localStorage.getItem('rvs_logs')) {
      const initialLogs = [
        { time: '2026-06-26T10:45:00', user: 'Operator (AP28 TA 1234)', action: 'Created collection entry #DRCC2606260007' },
        { time: '2026-06-26T09:15:00', user: 'Admin', action: 'Exported daily collection report to Excel' },
        { time: '2026-06-25T17:30:00', user: 'Admin', action: 'Updated cardboard rate from ₹9 to ₹10' },
        { time: '2026-06-24T11:00:00', user: 'Operator (AP28 TB 4321)', action: 'Created collection entry #DRCC2406260012' }
      ];
      localStorage.setItem('rvs_logs', JSON.stringify(initialLogs));
      setActivityLogs(initialLogs);
    } else {
      setActivityLogs(JSON.parse(localStorage.getItem('rvs_logs')));
    }

    try {
      const ests = await db.getEstablishments();
      setEstablishmentsList(ests || []);
      const pmts = await db.getEstablishmentPaymentsAll();
      setEstablishmentPaymentsList(pmts || []);
    } catch (err) {
      console.error('Error loading establishments data in admin panel:', err);
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    if (!newUsername.trim() || !newUserPassword.trim()) {
      alert('Username and Password are required.');
      return;
    }
    try {
      await db.addUser({
        username: newUsername.trim().toLowerCase(),
        password: newUserPassword,
        role: newUserRole,
        status: newUserStatus
      });
      addLog(`Added new user: ${newUsername.trim().toLowerCase()} (${newUserRole})`);
      setNewUsername('');
      setNewUserPassword('');
      setNewUserRole('operator');
      setNewUserStatus('active');
      setUsers(await db.getUsers());
      alert('User added successfully!');
    } catch (err) {
      alert('Error adding user: ' + err.message);
    }
  };

  const handleToggleStatus = async (username, currentStatus) => {
    const nextStatus = currentStatus === 'active' ? 'inactive' : 'active';
    try {
      await db.updateUser(username, { status: nextStatus });
      addLog(`Toggled user status of ${username} to ${nextStatus}`);
      setUsers(await db.getUsers());
    } catch (err) {
      alert('Error toggling status: ' + err.message);
    }
  };

  const handleChangeUserPassword = async (e) => {
    e.preventDefault();
    if (!changePasswordUsername || !changePasswordValue.trim()) {
      alert('Select a user and enter a new password.');
      return;
    }
    try {
      await db.updateUser(changePasswordUsername, { password: changePasswordValue });
      addLog(`Changed password of user ${changePasswordUsername}`);
      setChangePasswordUsername('');
      setChangePasswordValue('');
      setUsers(await db.getUsers());
      alert('Password updated successfully!');
    } catch (err) {
      alert('Error changing password: ' + err.message);
    }
  };

  const downloadDailyReport = () => {
    const localToday = new Date().toLocaleDateString('en-CA');
    const daily = records.filter(r => {
      const recLocal = new Date(r.dateTime).toLocaleDateString('en-CA');
      return recLocal === localToday;
    });
    if (daily.length === 0) {
      alert(`No records found for today's date (${localToday}).`);
      return;
    }
    exportToCSV(daily, `DRCC_Daily_Report_${localToday}.csv`);
  };

  const downloadMonthlyReport = () => {
    const monthly = records.filter(r => {
      const d = new Date(r.dateTime);
      return d.getMonth() === parseInt(selectedMonth) && d.getFullYear() === parseInt(selectedYear);
    });
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    if (monthly.length === 0) {
      alert(`No records found for ${monthNames[selectedMonth]} ${selectedYear}.`);
      return;
    }
    exportToCSV(monthly, `DRCC_Monthly_Report_${monthNames[selectedMonth]}_${selectedYear}.csv`);
  };

  const downloadFilteredReport = () => {
    const filtered = records.filter(r => {
      // Date check
      const d = new Date(r.dateTime);
      const start = new Date(reportStartDate);
      start.setHours(0,0,0,0);
      const end = new Date(reportEndDate);
      end.setHours(23,59,59,999);
      if (d < start || d > end) return false;

      // Division check
      if (reportDivision !== 'All' && String(r.division) !== String(reportDivision)) return false;

      // Vehicle check
      if (reportVehicle !== 'All' && r.vehicleNo !== reportVehicle) return false;

      // Driver check
      if (reportDriver !== 'All' && r.driver !== reportDriver) return false;

      // Item check
      if (reportItem !== 'All') {
        if (reportItem === 'plastic') {
          if (!r.plastic || r.plastic <= 0) return false;
        } else if (reportItem === 'cardboard') {
          if (!r.cardboard || r.cardboard <= 0) return false;
        } else if (reportItem === 'glass') {
          if (!r.glass || r.glass <= 0) return false;
        } else if (reportItem === 'others') {
          if (!r.others || r.others <= 0) return false;
          const subtype = r.ratesUsed ? r.ratesUsed.othersSubtype : 'others';
          if (subtype && subtype !== 'others') return false;
        } else if (reportItem === 'others_iron') {
          if (!r.others || r.others <= 0) return false;
          const subtype = r.ratesUsed ? r.ratesUsed.othersSubtype : 'others';
          if (subtype !== 'others_iron') return false;
        } else if (reportItem === 'others_babybox') {
          if (!r.others || r.others <= 0) return false;
          const subtype = r.ratesUsed ? r.ratesUsed.othersSubtype : 'others';
          if (subtype !== 'others_babybox') return false;
        } else if (reportItem === 'others_blackplastic') {
          if (!r.others || r.others <= 0) return false;
          const subtype = r.ratesUsed ? r.ratesUsed.othersSubtype : 'others';
          if (subtype !== 'others_blackplastic') return false;
        }
      }
      return true;
    });

    if (filtered.length === 0) {
      alert('No records matched the selected filters.');
      return;
    }
    exportToCSV(filtered, 'DRCC_Filtered_Report.csv');
  };

  const addLog = (action) => {
    const logs = JSON.parse(localStorage.getItem('rvs_logs')) || [];
    const newLog = {
      time: new Date().toISOString(),
      user: 'Admin',
      action: action
    };
    logs.unshift(newLog);
    localStorage.setItem('rvs_logs', JSON.stringify(logs));
    setActivityLogs(logs);
  };

  // Switch tab helper
  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  // Filter records based on selected dashboard date range
  const getFilteredDashboardRecords = () => {
    const localToday = getLocalDateISO();

    if (dateRange === 'today') {
      return records.filter(r => r.dateTime.startsWith(localToday));
    }
    
    // Last 7 days: calculate range
    const pastStr = getLocalDateISO(-7);
    return records.filter(r => {
      const d = r.dateTime.split('T')[0];
      return d >= pastStr && d <= localToday;
    });
  };

  const dashboardRecords = getFilteredDashboardRecords();

  // Metrics calculations for dashboard Cards
  // Total Purchase (Today / Selected Range)
  const totalPurchase = dashboardRecords.reduce((sum, r) => sum + r.totalAmount, 0);
  // Total Weight
  const totalWeight = dashboardRecords.reduce((sum, r) => sum + r.totalWeight, 0);
  // Total Transactions
  const totalTransactions = dashboardRecords.length;
  // Active Divisions (Divisions with at least 1 transaction in date range)
  const activeDivisionsCount = new Set(dashboardRecords.map(r => r.division)).size;
  // Active Vehicles (Vehicles with at least 1 transaction in date range)
  const activeVehiclesCount = new Set(dashboardRecords.map(r => r.vehicleNo)).size;

  // Pie Chart Data (Collection by Item Weight)
  const getPieData = () => {
    const totals = { plastic: 0, cardboard: 0, glass: 0, others: 0 };
    dashboardRecords.forEach(r => {
      totals.plastic += r.plastic || 0;
      totals.cardboard += r.cardboard || 0;
      totals.glass += r.glass || 0;
      totals.others += r.others || 0;
    });

    const sum = totals.plastic + totals.cardboard + totals.glass + totals.others;
    if (sum === 0) return [];

    return [
      { name: 'Plastic', value: Math.round(totals.plastic * 10) / 10, color: '#10b981' },
      { name: 'Cardboard', value: Math.round(totals.cardboard * 10) / 10, color: '#f59e0b' },
      { name: 'Glass', value: Math.round(totals.glass * 10) / 10, color: '#3b82f6' },
      { name: 'Others', value: Math.round(totals.others * 10) / 10, color: '#8b5cf6' }
    ];
  };

  const pieData = getPieData();
  const totalPieWeight = pieData.reduce((sum, item) => sum + item.value, 0);

  // Line Chart Data (Collection Trend over dates)
  const getLineData = () => {
    const dateMap = {};
    const today = new Date();
    for (let i = 7; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dateKey = d.toLocaleDateString('en-CA');
      dateMap[dateKey] = { amount: 0, weight: 0, count: 0 };
    }

    records.forEach(r => {
      const d = r.dateTime.split('T')[0];
      if (dateMap[d]) {
        dateMap[d].amount += r.totalAmount;
        dateMap[d].weight += r.totalWeight;
        dateMap[d].count += 1;
      }
    });

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return Object.entries(dateMap).map(([date, data]) => {
      const [year, month, day] = date.split('-').map(Number);
      const label = `${day} ${monthNames[month - 1]}`;
      return {
        dateStr: label,
        Amount: Math.round(data.amount),
        Weight: Math.round(data.weight)
      };
    });
  };

  const lineData = getLineData();

  // Establishments Dashboard state and metrics calculations
  const [estDateRange, setEstDateRange] = useState('today');

  const getFilteredEstDashboardPayments = () => {
    const localToday = new Date().toLocaleDateString('en-CA');

    if (estDateRange === 'today') {
      return establishmentPaymentsList.filter(p => p.dateTime.startsWith(localToday));
    }
    
    // Last 7 days
    const todayDate = new Date(localToday);
    const pastDate = new Date(todayDate);
    pastDate.setDate(todayDate.getDate() - 7);
    const pastStr = pastDate.toLocaleDateString('en-CA');
    return establishmentPaymentsList.filter(p => {
      const d = p.dateTime.split('T')[0];
      return d >= pastStr && d <= localToday;
    });
  };

  const estDashboardPayments = getFilteredEstDashboardPayments();

  // Metrics:
  // 1. Total Collection
  const estTotalCollection = estDashboardPayments.reduce((sum, p) => sum + (parseFloat(p.amountPaid) || 0), 0);
  // 2. Total Establishments
  const estTotalCount = establishmentsList.length;
  // 3. Active Collectors
  const estActiveCollectorsCount = new Set(estDashboardPayments.map(p => p.collectorName).filter(Boolean)).size;
  // 4. Pending Shops / Outstanding (establishments with outstanding > 0)
  const estPendingShopsCount = establishmentsList.filter(e => (e.monthlyFee || 0) + (e.penalty || 0) + (e.previousBalance || 0) > 0).length;
  // 5. Total Transactions
  const estTotalTransactions = estDashboardPayments.length;

  // Donut Chart: Collection by Payment Mode
  const getEstPieData = () => {
    const totals = { UPI: 0, Cash: 0, Card: 0 };
    estDashboardPayments.forEach(p => {
      const mode = p.paymentMode || 'UPI';
      if (totals[mode] !== undefined) {
        totals[mode] += parseFloat(p.amountPaid) || 0;
      } else {
        totals.UPI += parseFloat(p.amountPaid) || 0; // fallback
      }
    });

    const sum = totals.UPI + totals.Cash + totals.Card;
    if (sum === 0) return [];

    return [
      { name: 'UPI', value: Math.round(totals.UPI), color: '#10b981' },
      { name: 'Cash', value: Math.round(totals.Cash), color: '#f59e0b' },
      { name: 'Card', value: Math.round(totals.Card), color: '#3b82f6' }
    ];
  };

  const estPieData = getEstPieData();
  const estTotalPieAmount = estPieData.reduce((sum, item) => sum + item.value, 0);

  // Line Chart: Daily collection trend
  const getEstLineData = () => {
    const dateMap = {};
    const today = new Date();
    for (let i = 7; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dateKey = d.toLocaleDateString('en-CA');
      dateMap[dateKey] = { amount: 0 };
    }

    establishmentPaymentsList.forEach(p => {
      const d = p.dateTime.split('T')[0];
      if (dateMap[d]) {
        dateMap[d].amount += parseFloat(p.amountPaid) || 0;
      }
    });

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return Object.entries(dateMap).map(([date, data]) => {
      const [year, month, day] = date.split('-').map(Number);
      const label = `${day} ${monthNames[month - 1]}`;
      return {
        dateStr: label,
        Amount: Math.round(data.amount)
      };
    });
  };

  const estLineData = getEstLineData();

  // Excel / CSV Export helper
  const exportToCSV = (recs, filename = 'DRCC_Records_Report.csv') => {
    // CSV headers
    const headers = [
      'Receipt No', 'Date & Time', 'Division ID', 'Division Name', 'Vehicle Type', 
      'Vehicle No', 'Driver', 'Plastic (Kg)', 'Cardboard (Kg)', 
      'Glass (Kg)', 'Others (Kg)', 'Total Weight (Kg)', 'Amount (Rs)', 'Status'
    ];
    
    // Rows
    const rows = recs.map(r => [
      r.receiptNo,
      new Date(r.dateTime).toLocaleString(),
      r.division,
      r.divisionName,
      r.vehicleType,
      r.vehicleNo,
      r.driver,
      r.plastic.toFixed(2),
      r.cardboard.toFixed(2),
      r.glass.toFixed(2),
      r.others.toFixed(2),
      r.totalWeight.toFixed(2),
      r.totalAmount.toFixed(2),
      r.status
    ]);

    // Build content
    const csvContent = [headers.join(','), ...rows.map(row => row.map(val => `"${val}"`).join(','))].join('\n');
    
    // Check if running in mobile app webview
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'DOWNLOAD_FILE',
        filename: filename,
        content: csvContent,
        mimeType: 'text/csv'
      }));
      addLog(`Exported records CSV via Mobile App: ${filename}`);
      return;
    }

    // Web Browser Download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    addLog(`Exported records CSV: ${filename}`);
  };

  // Establishments Administration Methods
  const exportEstToCSV = (headers, rows, filename = 'Establishment_Report.csv') => {
    const csvContent = [headers.join(','), ...rows.map(row => row.map(val => `"${val}"`).join(','))].join('\n');
    
    // Check if running in mobile app webview
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'DOWNLOAD_FILE',
        filename: filename,
        content: csvContent,
        mimeType: 'text/csv'
      }));
      addLog(`Exported establishment CSV via Mobile App: ${filename}`);
      return;
    }

    // Web Browser Download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addLog(`Exported establishment CSV: ${filename}`);
  };

  const downloadEstDailyReport = () => {
    const start = estReportStartDate;
    const end = estReportEndDate;
    const daily = establishmentPaymentsList.filter(p => {
      const pDate = p.dateTime.split('T')[0];
      return pDate >= start && pDate <= end;
    });
    if (daily.length === 0) {
      alert(`No collection records found for date range ${start} to ${end}.`);
      return;
    }
    const headers = ['Receipt No', 'Date & Time', 'Establishment ID', 'Establishment Name', 'Amount Paid (Rs)', 'Payment Mode', 'Remarks', 'Collector Name', 'Collector ID'];
    const rows = daily.map(p => [
      p.receiptNo,
      new Date(p.dateTime).toLocaleString(),
      p.establishmentId,
      p.establishmentName,
      p.amountPaid,
      p.paymentMode,
      p.remarks || '',
      p.collectorName,
      p.collectorId
    ]);
    exportEstToCSV(headers, rows, `Est_Collection_Report_${start}_to_${end}.csv`);
  };

  const downloadEstCollectorReport = () => {
    let filtered = establishmentPaymentsList;
    if (estSelectedCollector !== 'All') {
      filtered = filtered.filter(p => p.collectorName === estSelectedCollector);
    }
    if (filtered.length === 0) {
      alert('No collection records found for selected collector.');
      return;
    }
    const headers = ['Receipt No', 'Date & Time', 'Establishment ID', 'Establishment Name', 'Amount Paid (Rs)', 'Payment Mode', 'Remarks', 'Collector Name', 'Collector ID'];
    const rows = filtered.map(p => [
      p.receiptNo,
      new Date(p.dateTime).toLocaleString(),
      p.establishmentId,
      p.establishmentName,
      p.amountPaid,
      p.paymentMode,
      p.remarks || '',
      p.collectorName,
      p.collectorId
    ]);
    exportEstToCSV(headers, rows, `Est_Collector_Report_${estSelectedCollector}.csv`);
  };

  const downloadEstRouteReport = () => {
    const routesMap = {
      1: 'GANDHICHOWK',
      2: 'GATTAIAH CENTER',
      3: 'IT HUB TO SRI SRI CIRCLE',
      4: 'KAMAN BAZAR',
      5: 'KHANAPURAM',
      6: 'MUSTAFANAGAR',
      7: 'WYRA ROAD'
    };
    
    if (estSelectedRoute === 'All') {
      const headers = ['Route ID', 'Route Name', 'Number of Establishments', 'Total Monthly Fee (Rs)', 'Total Penalty (Rs)', 'Total Arrears (Rs)', 'Total Collected (Rs)', 'Current Outstanding (Rs)'];
      const rows = Object.entries(routesMap).map(([rId, rName]) => {
        const routeEsts = establishmentsList.filter(e => String(e.routeId) === String(rId));
        const estIds = routeEsts.map(e => e.id);
        const routePayments = establishmentPaymentsList.filter(p => estIds.includes(p.establishmentId));
        
        const totalMonthlyFee = routeEsts.reduce((sum, e) => sum + (e.monthlyFee || 0), 0);
        const totalPenalty = routeEsts.reduce((sum, e) => sum + (e.penalty || 0), 0);
        const totalArrears = routeEsts.reduce((sum, e) => sum + (e.previousBalance || 0), 0);
        const totalCollected = routePayments.reduce((sum, p) => sum + (parseFloat(p.amountPaid) || 0), 0);
        const totalOutstanding = routeEsts.reduce((sum, e) => sum + (e.previousBalance + e.monthlyFee + e.penalty), 0) - totalCollected;
        
        return [
          rId,
          rName,
          routeEsts.length,
          totalMonthlyFee,
          totalPenalty,
          totalArrears,
          totalCollected,
          Math.max(0, totalOutstanding)
        ];
      });
      exportEstToCSV(headers, rows, `Est_All_Routes_Summary.csv`);
    } else {
      const routeName = routesMap[estSelectedRoute] || 'Route';
      const routeEsts = establishmentsList.filter(e => String(e.routeId) === String(estSelectedRoute));
      if (routeEsts.length === 0) {
        alert(`No establishments found for ${routeName}.`);
        return;
      }
      const headers = ['Establishment ID', 'Business Name', 'Proprietor', 'Phone', 'Monthly Fee (Rs)', 'Penalty (Rs)', 'Previous Balance (Rs)', 'Total Outstanding (Rs)', 'Status'];
      const rows = routeEsts.map(e => [
        e.id,
        e.name,
        e.proprietor || '',
        e.phone || '',
        e.monthlyFee,
        e.penalty,
        e.previousBalance,
        e.monthlyFee + e.penalty + e.previousBalance,
        e.status || 'active'
      ]);
      exportEstToCSV(headers, rows, `Est_Route_Detail_${routeName}.csv`);
    }
  };

  const downloadEstPendingReport = () => {
    const start = estReportStartDate;
    const end = estReportEndDate;
    
    const rows = [];
    establishmentsList.forEach(e => {
      // Get payments of this establishment in the selected date range
      const estPayments = establishmentPaymentsList.filter(p => {
        const pDate = p.dateTime.split('T')[0];
        return p.establishmentId === e.id && pDate >= start && pDate <= end;
      });
      
      const totalPaidInPeriod = estPayments.reduce((sum, p) => sum + (parseFloat(p.amountPaid) || 0), 0);
      const totalDueInPeriod = (e.monthlyFee || 0) + (e.penalty || 0) + (e.previousBalance || 0);
      const outstanding = totalDueInPeriod - totalPaidInPeriod;
      
      if (outstanding > 0) {
        rows.push([
          e.id,
          e.name,
          e.proprietor || '',
          e.phone || '',
          e.routeName || `Route ${e.routeId}`,
          e.monthlyFee,
          e.penalty,
          e.previousBalance,
          totalDueInPeriod,
          totalPaidInPeriod,
          outstanding
        ]);
      }
    });
    
    if (rows.length === 0) {
      alert(`No pending establishments found in the range ${start} to ${end}.`);
      return;
    }
    
    const headers = ['Establishment ID', 'Business Name', 'Proprietor', 'Phone', 'Route Name', 'Monthly Fee (Rs)', 'Penalty (Rs)', 'Previous Balance (Rs)', 'Total Due (Rs)', 'Total Paid in Period (Rs)', 'Outstanding Balance (Rs)'];
    exportEstToCSV(headers, rows, `Est_Pending_Report_${start}_to_${end}.csv`);
  };

  const downloadEstNewReport = () => {
    if (establishmentsList.length === 0) {
      alert('No establishments found.');
      return;
    }
    const headers = ['Establishment ID', 'Business Name', 'Proprietor', 'Phone', 'Route ID', 'Route Name', 'Monthly Fee (Rs)', 'Penalty (Rs)', 'Opening Balance (Rs)', 'Status'];
    const rows = establishmentsList.map(e => [
      e.id,
      e.name,
      e.proprietor || '',
      e.phone || '',
      e.routeId,
      e.routeName,
      e.monthlyFee,
      e.penalty,
      e.previousBalance,
      e.status || 'active'
    ]);
    exportEstToCSV(headers, rows, 'Est_New_Registrations_Report.csv');
  };

  const downloadEstFeeRevisionReport = () => {
    if (establishmentsList.length === 0) {
      alert('No establishments found.');
      return;
    }
    const headers = ['Establishment ID', 'Business Name', 'Proprietor', 'Route Name', 'Current User Fee (Rs)', 'Current Penalty (Rs)'];
    const rows = establishmentsList.map(e => [
      e.id,
      e.name,
      e.proprietor || '',
      e.routeName,
      e.monthlyFee,
      e.penalty
    ]);
    exportEstToCSV(headers, rows, 'Est_Fee_Revision_Report.csv');
  };

  const downloadEstMonthlyReport = () => {
    const monthly = establishmentPaymentsList.filter(p => {
      const date = new Date(p.dateTime);
      return date.getMonth() === parseInt(estReportMonth) && date.getFullYear() === parseInt(estReportYear);
    });
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    if (monthly.length === 0) {
      alert(`No collection records found for ${monthNames[estReportMonth]} ${estReportYear}.`);
      return;
    }
    const headers = ['Receipt No', 'Date & Time', 'Establishment ID', 'Establishment Name', 'Amount Paid (Rs)', 'Payment Mode', 'Collector Name'];
    const rows = monthly.map(p => [
      p.receiptNo,
      new Date(p.dateTime).toLocaleString(),
      p.establishmentId,
      p.establishmentName,
      p.amountPaid,
      p.paymentMode,
      p.collectorName
    ]);
    exportEstToCSV(headers, rows, `Est_Monthly_Collection_${monthNames[estReportMonth]}_${estReportYear}.csv`);
  };

  const handleDownloadEstReport = () => {
    switch (estReportOption) {
      case 'daily':
        downloadEstDailyReport();
        break;
      case 'collector':
        downloadEstCollectorReport();
        break;
      case 'route':
        downloadEstRouteReport();
        break;
      case 'pending':
        downloadEstPendingReport();
        break;
      case 'new_est':
        downloadEstNewReport();
        break;
      case 'fee_revision':
        downloadEstFeeRevisionReport();
        break;
      case 'monthly':
        downloadEstMonthlyReport();
        break;
      default:
        alert('Invalid report option selected.');
    }
  };


  // Master Data Add Handlers
  const handleAddDivision = async (e) => {
    e.preventDefault();
    if (!newDivName.trim()) return;
    const added = await db.addDivision({ name: newDivName.trim() });
    setNewDivName('');
    setDivisions(await db.getDivisions());
    addLog(`Added Division: ${added.id} - ${added.name}`);
  };

  const handleAddVehicle = async (e) => {
    e.preventDefault();
    if (!newVehNo.trim() || !newVehDriver || !newVehDivision) return;
    const added = await db.addVehicle({
      type: newVehType,
      number: newVehNo.trim().toUpperCase(),
      regularDriver: newVehDriver,
      division: newVehDivision
    });
    setNewVehNo('');
    setNewVehDivision('');
    setVehicles(await db.getVehicles());
    setDivisions(await db.getDivisions()); // syncing vehicle count
    addLog(`Added Vehicle: ${added.number} (${added.type}) to Division ${added.division}`);
  };


  const handleAddDriver = async (e) => {
    e.preventDefault();
    if (!newDriverName.trim() || !newDriverPhone.trim()) return;
    const added = await db.addDriver({
      name: newDriverName.trim().toUpperCase(),
      phone: newDriverPhone.trim(),
      isRegular: true
    });
    setNewDriverName('');
    setNewDriverPhone('');
    setDrivers(await db.getDrivers());
    addLog(`Added Driver: ${added.name}`);
  };

  // Master Data Delete Handlers
  const handleDeleteDivision = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete Division ${id} - ${name}?`)) {
      await db.deleteDivision(id);
      setDivisions(await db.getDivisions());
      addLog(`Deleted Division ${id} - ${name}`);
    }
  };

  const handleDeleteVehicle = async (number) => {
    if (window.confirm(`Are you sure you want to delete Vehicle ${number}?`)) {
      await db.deleteVehicle(number);
      setVehicles(await db.getVehicles());
      setDivisions(await db.getDivisions());
      addLog(`Deleted Vehicle ${number}`);
    }
  };

  const handleDeleteDriver = async (name) => {
    if (window.confirm(`Are you sure you want to delete Driver ${name}?`)) {
      await db.deleteDriver(name);
      setDrivers(await db.getDrivers());
      addLog(`Deleted Driver ${name}`);
    }
  };

  // Rates Update Handler
  const handleUpdateRates = async (e) => {
    e.preventDefault();
    const updated = await db.updateRates({
      plastic: parseFloat(editRates.plastic) || 0,
      cardboard: parseFloat(editRates.cardboard) || 0,
      glass: parseFloat(editRates.glass) || 0,
      others: parseFloat(editRates.others) || 0,
      others_iron: parseFloat(editRates.others_iron) || 0,
      others_babybox: parseFloat(editRates.others_babybox) || 0,
      others_blackplastic: parseFloat(editRates.others_blackplastic) || 0
    });
    setRates(updated);
    if (onRatesUpdated) onRatesUpdated(updated);
    addLog(`Updated collection rates: Plastic ₹${updated.plastic}/kg, Cardboard ₹${updated.cardboard}/kg, Glass ₹${updated.glass}/kg, Iron ₹${updated.others_iron}/kg, Baby Box ₹${updated.others_babybox}/kg, Black Plastic ₹${updated.others_blackplastic}/kg`);
    alert('Rates updated successfully! Operators will see these rates immediately.');
  };

  // Records Page Search Handler
  const handleRecordSearch = () => {
    let results = records;
    if (filterDate) {
      results = results.filter(r => r.dateTime.startsWith(filterDate));
    }
    if (filterDivision !== 'All') {
      results = results.filter(r => r.division === filterDivision);
    }
    if (filterVehicleType !== 'All') {
      results = results.filter(r => r.vehicleType === filterVehicleType);
    }
    if (filterDriver !== 'All') {
      results = results.filter(r => r.driver === filterDriver);
    }
    setRecordSearchResults(results);
  };

  // Reset database entirely
  const handleResetDB = async () => {
    if (window.confirm('WARNING: This will reset the database back to original defaults. All new entries will be lost. Continue?')) {
      await db.resetDB();
      await loadAllData();
      if (onRatesUpdated) onRatesUpdated(await db.getRates());
      addLog('Reset database to default seed state');
      alert('Database reset completed successfully.');
    }
  };

  // CONSTANTS - route list for est admin
  const EST_ROUTES = [
    { id: '1', name: 'GANDHICHOWK' },
    { id: '2', name: 'GATTAIAH CENTER' },
    { id: '3', name: 'IT HUB TO SRI SRI CIRCLE' },
    { id: '4', name: 'KAMAN BAZAR' },
    { id: '5', name: 'KHANAPURAM' },
    { id: '6', name: 'MUSTAFANAGAR' },
    { id: '7', name: 'WYRA ROAD' }
  ];

  // Helper: establishments filtered by route
  const getEstsByRoute = (routeId) => {
    if (!routeId || routeId === 'All') return establishmentsList;
    return establishmentsList.filter(e => String(e.routeId) === String(routeId));
  };

  // Fix / Update User Fee handler
  const handleUpdateFee = async (e) => {
    e.preventDefault();
    if (!feeSelectedEstId || !feeNewAmount) {
      alert('Please select an establishment and enter the new fee.');
      return;
    }
    const est = establishmentsList.find(e => e.id === feeSelectedEstId);
    if (!est) { alert('Establishment not found.'); return; }
    db.updateEstablishmentFee(feeSelectedEstId, feeNewAmount);
    addLog(`Updated monthly fee for ${est.name} (${feeSelectedEstId}) to ₹${feeNewAmount}`);
    const ests = await db.getEstablishments();
    setEstablishmentsList(ests || []);
    setFeeSuccessMsg(`✅ Fee updated to ₹${feeNewAmount} for ${est.name}`);
    setFeeNewAmount('');
    setTimeout(() => setFeeSuccessMsg(''), 4000);
  };

  // Approve/Reject establishment
  const handleApproveEst = async (id) => {
    db.approveEstablishment(id);
    addLog(`Approved new establishment ${id}`);
    const ests = await db.getEstablishments();
    setEstablishmentsList(ests || []);
  };

  const handleRejectEst = async (id, name) => {
    if (!window.confirm(`Reject and remove establishment "${name}"?`)) return;
    db.rejectEstablishment(id);
    addLog(`Rejected and removed pending establishment ${id}`);
    const ests = await db.getEstablishments();
    setEstablishmentsList(ests || []);
  };

  // Apply penalty handler
  const handleApplyPenalty = async (e) => {
    e.preventDefault();
    if (!penaltyEstId || !penaltyAmount || parseFloat(penaltyAmount) <= 0) {
      alert('Please select an establishment and enter a valid penalty amount.');
      return;
    }
    const est = establishmentsList.find(e => e.id === penaltyEstId);
    if (!est) { alert('Establishment not found.'); return; }
    db.applyPenalty(penaltyEstId, penaltyAmount, penaltyRemarks);
    addLog(`Applied penalty of ₹${penaltyAmount} to ${est.name} (${penaltyEstId}): ${penaltyRemarks}`);
    const ests = await db.getEstablishments();
    setEstablishmentsList(ests || []);
    setPenaltySuccessMsg(`✅ Penalty of ₹${penaltyAmount} applied to ${est.name}`);
    setPenaltyEstId('');
    setPenaltyAmount('');
    setPenaltyRemarks('');
    setPenaltyRoute('All');
    setTimeout(() => setPenaltySuccessMsg(''), 4000);
  };

  // Establishments Master Data Handlers
  const handleOpenAddEstModal = () => {
    setEditingEst(null);
    setEstFormId('');
    setEstFormName('');
    setEstFormProprietor('');
    setEstFormPhone('');
    setEstFormRouteId(estMasterRoute !== 'All' ? estMasterRoute : '1');
    setEstFormMonthlyFee('200');
    setEstFormPreviousBalance('0');
    setEstFormPenalty('0');
    setEstFormStatus('active');
    setIsEstModalOpen(true);
  };

  const handleOpenEditEstModal = (est) => {
    setEditingEst(est);
    setEstFormId(est.id || '');
    setEstFormName(est.name || '');
    setEstFormProprietor(est.proprietor || '');
    setEstFormPhone(est.phone || '');
    setEstFormRouteId(String(est.routeId || 1));
    setEstFormMonthlyFee(String(est.monthlyFee || 0));
    setEstFormPreviousBalance(String(est.previousBalance || 0));
    setEstFormPenalty(String(est.penalty || 0));
    setEstFormStatus(est.status || 'active');
    setIsEstModalOpen(true);
  };

  const handleSaveMasterEst = async (e) => {
    e.preventDefault();
    if (!estFormName.trim()) {
      alert('Please enter establishment name.');
      return;
    }

    const payload = {
      id: estFormId.trim() || undefined,
      name: estFormName.trim(),
      proprietor: estFormProprietor.trim(),
      phone: estFormPhone.trim(),
      routeId: parseInt(estFormRouteId) || 1,
      monthlyFee: parseFloat(estFormMonthlyFee) || 0,
      previousBalance: parseFloat(estFormPreviousBalance) || 0,
      penalty: parseFloat(estFormPenalty) || 0,
      status: estFormStatus || 'active'
    };

    if (editingEst) {
      await db.updateEstablishment(editingEst.id, payload);
      addLog(`Updated establishment master data: ${editingEst.id} - ${payload.name}`);
      setEstMasterSuccessMsg(`✅ Updated establishment "${payload.name}" successfully!`);
    } else {
      const added = await db.addEstablishment(payload);
      addLog(`Added new establishment master data: ${added.id} - ${added.name}`);
      setEstMasterSuccessMsg(`✅ Added new establishment "${added.name}" (ID: ${added.id}) successfully!`);
    }

    const ests = await db.getEstablishments();
    setEstablishmentsList(ests || []);
    setIsEstModalOpen(false);
    setTimeout(() => setEstMasterSuccessMsg(''), 4000);
  };

  const handleDeleteMasterEst = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete establishment "${name}" (${id}) from master data?`)) return;
    await db.deleteEstablishment(id);
    addLog(`Deleted establishment master data: ${id} - ${name}`);
    const ests = await db.getEstablishments();
    setEstablishmentsList(ests || []);
    setEstMasterSuccessMsg(`✅ Deleted establishment "${name}" from master data.`);
    setTimeout(() => setEstMasterSuccessMsg(''), 4000);
  };

  const handleExportEstMasterCSV = () => {
    let list = establishmentsList;
    if (estMasterRoute !== 'All') {
      list = list.filter(e => String(e.routeId) === String(estMasterRoute));
    }
    if (estMasterStatus !== 'All') {
      list = list.filter(e => e.status === estMasterStatus);
    }
    if (estMasterSearch.trim()) {
      const q = estMasterSearch.toLowerCase();
      list = list.filter(e => 
        (e.name || '').toLowerCase().includes(q) ||
        (e.id || '').toLowerCase().includes(q) ||
        (e.proprietor || '').toLowerCase().includes(q) ||
        (e.phone || '').includes(q)
      );
    }

    if (list.length === 0) {
      alert('No establishment records match your filter criteria to export.');
      return;
    }

    const headers = ['ID', 'Establishment Name', 'Proprietor', 'Phone', 'Route ID', 'Route Name', 'Monthly Fee (Rs)', 'Arrears (Rs)', 'Penalty (Rs)', 'Total Due (Rs)', 'Status'];
    const rows = list.map(e => [
      `"${e.id}"`,
      `"${(e.name || '').replace(/"/g, '""')}"`,
      `"${(e.proprietor || '').replace(/"/g, '""')}"`,
      `"${e.phone || ''}"`,
      e.routeId,
      `"${e.routeName}"`,
      e.monthlyFee || 0,
      e.previousBalance || 0,
      e.penalty || 0,
      (e.monthlyFee || 0) + (e.previousBalance || 0) + (e.penalty || 0),
      e.status
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const routeLabel = estMasterRoute === 'All' ? 'ALL_ROUTES' : `ROUTE_${estMasterRoute}`;
    link.setAttribute('download', `Establishments_MasterData_${routeLabel}_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className={`admin-layout ${isMobile ? 'mobile-view' : ''}`}>
      {/* Mobile Header Navigation */}
      {isMobile && (
        <div className="admin-mobile-header">
          <button onClick={() => setMenuOpen(!menuOpen)} className="menu-toggle-btn">
            <Menu size={24} />
          </button>
          <span className="mobile-header-title">
            Admin: {
              activeTab === 'dashboard' ? 'Dashboard' : 
              activeTab === 'records' ? 'Records' :
              activeTab.startsWith('master') ? 'Master Data' :
              activeTab === 'rates' ? 'Rates' :
              activeTab === 'reports' ? 'Reports' :
              activeTab === 'users' ? 'Users' :
              activeTab === 'logs' ? 'Logs' :
              activeTab === 'master-establishments' ? 'Master Data' :
              activeTab === 'update-fees' ? 'Update User Fee' :
              activeTab === 'approve-est' ? 'Approve Establishments' :
              activeTab === 'apply-penalty' ? 'Apply Penalties' : 'Settings'
            }
          </span>
          <button onClick={onLogout} style={{ color: '#ef4444', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <LogOut size={20} />
          </button>
        </div>
      )}

      {/* Mobile Dropdown Menu Drawer */}
      {isMobile && menuOpen && (
        <div className="admin-mobile-dropdown animate-fade-in">
          {adminType === 'drcc' && (
            <>
              <div className={`admin-mobile-menu-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => { setActiveTab('dashboard'); setMenuOpen(false); }}>
                <BarChart2 size={16} />
                <span>Dashboard</span>
              </div>
              <div className={`admin-mobile-menu-item ${activeTab === 'records' ? 'active' : ''}`} onClick={() => { setActiveTab('records'); setMenuOpen(false); }}>
                <FileText size={16} />
                <span>Records</span>
              </div>
              
              <div className="admin-mobile-menu-item" style={{ justifyContent: 'space-between' }} onClick={() => setMasterOpen(!masterOpen)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Database size={16} />
                  <span>Master Data</span>
                </div>
                <ChevronRight size={14} style={{ transform: masterOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
              </div>

              {masterOpen && (
                <div className="admin-mobile-submenu">
                  <div className={`admin-mobile-subitem ${activeTab === 'master-divisions' ? 'active' : ''}`} onClick={() => { setActiveTab('master-divisions'); setMenuOpen(false); }}>Divisions</div>
                  <div className={`admin-mobile-subitem ${activeTab === 'master-vehicles' ? 'active' : ''}`} onClick={() => { setActiveTab('master-vehicles'); setMenuOpen(false); }}>Vehicles</div>
                  <div className={`admin-mobile-subitem ${activeTab === 'master-drivers' ? 'active' : ''}`} onClick={() => { setActiveTab('master-drivers'); setMenuOpen(false); }}>Drivers</div>
                </div>
              )}

              <div className={`admin-mobile-menu-item ${activeTab === 'rates' ? 'active' : ''}`} onClick={() => { setActiveTab('rates'); setMenuOpen(false); }}>
                <DollarSign size={16} />
                <span>Rates (Fixed by Admin)</span>
              </div>
              <div className={`admin-mobile-menu-item ${activeTab === 'reports' ? 'active' : ''}`} onClick={() => { setActiveTab('reports'); setMenuOpen(false); }}>
                <Download size={16} />
                <span>Reports & Export</span>
              </div>
              <div className={`admin-mobile-menu-item ${activeTab === 'logs' ? 'active' : ''}`} onClick={() => { setActiveTab('logs'); setMenuOpen(false); }}>
                <Activity size={16} />
                <span>Activity Log</span>
              </div>
            </>
          )}

          {adminType === 'est' && (
            <>
              <div className={`admin-mobile-menu-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => { setActiveTab('dashboard'); setMenuOpen(false); }}>
                <BarChart2 size={16} />
                <span>Dashboard</span>
              </div>
              <div className={`admin-mobile-menu-item ${activeTab === 'master-establishments' ? 'active' : ''}`} onClick={() => { setActiveTab('master-establishments'); setMenuOpen(false); }}>
                <Database size={16} />
                <span>Master Data</span>
              </div>
              <div className={`admin-mobile-menu-item ${activeTab === 'update-fees' ? 'active' : ''}`} onClick={() => { setActiveTab('update-fees'); setMenuOpen(false); }}>
                <DollarSign size={16} />
                <span>Fix / Update User Fee</span>
              </div>
              <div className={`admin-mobile-menu-item ${activeTab === 'approve-est' ? 'active' : ''}`} onClick={() => { setActiveTab('approve-est'); setMenuOpen(false); }}>
                <Building2 size={16} />
                <span>Approve New Establishments</span>
              </div>
              <div className={`admin-mobile-menu-item ${activeTab === 'apply-penalty' ? 'active' : ''}`} onClick={() => { setActiveTab('apply-penalty'); setMenuOpen(false); }}>
                <ShieldAlert size={16} />
                <span>Apply Penalties</span>
              </div>
              <div className={`admin-mobile-menu-item ${activeTab === 'reports' ? 'active' : ''}`} onClick={() => { setActiveTab('reports'); setMenuOpen(false); }}>
                <Download size={16} />
                <span>Reports</span>
              </div>
            </>
          )}

          <div className={`admin-mobile-menu-item ${activeTab === 'users' ? 'active' : ''}`} onClick={() => { setActiveTab('users'); setMenuOpen(false); }}>
            <Users size={16} />
            <span>User Management</span>
          </div>
          
          <div className={`admin-mobile-menu-item ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => { setActiveTab('settings'); setMenuOpen(false); }}>
            <Settings size={16} />
            <span>Settings</span>
          </div>
        </div>
      )}

      {/* Sidebar Navigation */}
      {!isMobile && (
        <aside className="admin-sidebar">
          <ul className="admin-sidebar-menu">
            {adminType === 'drcc' && (
              <>
                <li 
                  className={`admin-menu-item ${activeTab === 'dashboard' ? 'active' : ''}`}
                  onClick={() => handleTabChange('dashboard')}
                >
                  <BarChart2 size={18} />
                  <span>Dashboard</span>
                </li>
                
                <li 
                  className={`admin-menu-item ${activeTab === 'records' ? 'active' : ''}`}
                  onClick={() => handleTabChange('records')}
                >
                  <FileText size={18} />
                  <span>Records</span>
                </li>

                {/* Master Data Menu Header */}
                <li 
                  className="admin-menu-item"
                  style={{ justifyContent: 'space-between' }}
                  onClick={() => setMasterOpen(!masterOpen)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Database size={18} />
                    <span>Master Data</span>
                  </div>
                  <ChevronRight 
                    size={16} 
                    style={{ 
                      transform: masterOpen ? 'rotate(90deg)' : 'none', 
                      transition: 'transform 0.2s' 
                    }} 
                  />
                </li>

                {/* Master Data Submenu Items */}
                {masterOpen && (
                  <ul className="admin-menu-dropdown animate-fade-in">
                    <li 
                      className={`admin-menu-subitem ${activeTab === 'master-divisions' ? 'active' : ''}`}
                      onClick={() => handleTabChange('master-divisions')}
                    >
                      Divisions
                    </li>
                    <li 
                      className={`admin-menu-subitem ${activeTab === 'master-vehicles' ? 'active' : ''}`}
                      onClick={() => handleTabChange('master-vehicles')}
                    >
                      Vehicles
                    </li>
                    <li 
                      className={`admin-menu-subitem ${activeTab === 'master-drivers' ? 'active' : ''}`}
                      onClick={() => handleTabChange('master-drivers')}
                    >
                      Drivers
                    </li>
                  </ul>
                )}

                <li 
                  className={`admin-menu-item ${activeTab === 'rates' ? 'active' : ''}`}
                  onClick={() => handleTabChange('rates')}
                >
                  <DollarSign size={18} />
                  <span>Rates (Fixed by Admin)</span>
                </li>

                <li 
                  className={`admin-menu-item ${activeTab === 'reports' ? 'active' : ''}`}
                  onClick={() => handleTabChange('reports')}
                >
                  <Download size={18} />
                  <span>Reports & Export</span>
                </li>

                <li 
                  className={`admin-menu-item ${activeTab === 'logs' ? 'active' : ''}`}
                  onClick={() => handleTabChange('logs')}
                >
                  <Activity size={18} />
                  <span>Activity Log</span>
                </li>
              </>
            )}

            {adminType === 'est' && (
              <>
                <li 
                  className={`admin-menu-item ${activeTab === 'dashboard' ? 'active' : ''}`}
                  onClick={() => handleTabChange('dashboard')}
                >
                  <BarChart2 size={18} />
                  <span>Dashboard</span>
                </li>
                <li 
                  className={`admin-menu-item ${activeTab === 'master-establishments' ? 'active' : ''}`}
                  onClick={() => handleTabChange('master-establishments')}
                >
                  <Database size={18} />
                  <span>Master Data</span>
                </li>
                <li 
                  className={`admin-menu-item ${activeTab === 'update-fees' ? 'active' : ''}`}
                  onClick={() => handleTabChange('update-fees')}
                >
                  <DollarSign size={18} />
                  <span>Fix / Update User Fee</span>
                </li>
                <li 
                  className={`admin-menu-item ${activeTab === 'approve-est' ? 'active' : ''}`}
                  onClick={() => handleTabChange('approve-est')}
                >
                  <Building2 size={18} />
                  <span>Approve New Establishments</span>
                </li>
                <li 
                  className={`admin-menu-item ${activeTab === 'apply-penalty' ? 'active' : ''}`}
                  onClick={() => handleTabChange('apply-penalty')}
                >
                  <ShieldAlert size={18} />
                  <span>Apply Penalties</span>
                </li>
                <li 
                  className={`admin-menu-item ${activeTab === 'reports' ? 'active' : ''}`}
                  onClick={() => handleTabChange('reports')}
                >
                  <Download size={18} />
                  <span>Reports</span>
                </li>
              </>
            )}

            <li 
              className={`admin-menu-item ${activeTab === 'users' ? 'active' : ''}`}
              onClick={() => handleTabChange('users')}
            >
              <Users size={18} />
              <span>User Management</span>
            </li>

            <li 
              className={`admin-menu-item ${activeTab === 'settings' ? 'active' : ''}`}
              onClick={() => handleTabChange('settings')}
            >
              <Settings size={18} />
              <span>Settings</span>
            </li>

            <li 
              className="admin-menu-item"
              style={{ marginTop: 'auto', color: '#ef4444' }}
              onClick={onLogout}
            >
              <LogOut size={18} />
              <span>Logout Panel</span>
            </li>
          </ul>
        </aside>
      )}

      {/* Main Content Pane */}
      <main className="admin-main">

        {/* ----------------- TAB 1: DASHBOARD VIEW ----------------- */}
        {activeTab === 'dashboard' && adminType === 'drcc' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="admin-section-header">
              <div className="admin-section-title">
                <h2>RVS Eco Projects Dashboard</h2>
                <p>Welcome, Administrator. Here are the latest collections metrics.</p>
              </div>

              {/* Date Filters */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '4px 12px' }}>
                  <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Date Range:</span>
                  <select 
                    className="form-select" 
                    style={{ border: 'none', padding: '4px', fontSize: '0.85rem', width: 'auto', fontWeight: 600 }}
                    value={dateRange}
                    onChange={(e) => setDateRange(e.target.value)}
                  >
                    <option value="today">Today ({(() => {
                      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                      const d = new Date();
                      return `${String(d.getDate()).padStart(2, '0')}-${months[d.getMonth()]}-${d.getFullYear()}`;
                    })()})</option>
                    <option value="7days">Last 7 Days ({(() => {
                      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                      const today = new Date();
                      const past = new Date();
                      past.setDate(today.getDate() - 7);
                      return `${past.getDate()} ${months[past.getMonth()]} - ${today.getDate()} ${months[today.getMonth()]}`;
                    })()})</option>
                  </select>
                </div>
                
                <button 
                  className="btn-primary" 
                  style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                  onClick={() => exportToCSV(dashboardRecords, `DRCC_Collection_Report_${dateRange}.csv`)}
                >
                  <Download size={16} />
                  EXPORT EXCEL
                </button>
              </div>
            </div>

            {/* Dashboard Metric cards */}
            <div className="metrics-grid">
              <div className="metric-card purchase">
                <span className="metric-card-label">Total Purchase</span>
                <span className="metric-card-value">₹{Math.round(totalPurchase).toLocaleString('en-IN')}</span>
              </div>
              
              <div className="metric-card weight">
                <span className="metric-card-label">Total Weight</span>
                <span className="metric-card-value">{Math.round(totalWeight * 10) / 10} Kg</span>
              </div>

              <div className="metric-card transactions">
                <span className="metric-card-label">Total Transactions</span>
                <span className="metric-card-value">{totalTransactions}</span>
              </div>

              <div className="metric-card divisions">
                <span className="metric-card-label">Active Divisions</span>
                <span className="metric-card-value">{activeDivisionsCount}</span>
              </div>

              <div className="metric-card vehicles">
                <span className="metric-card-label">Active Vehicles</span>
                <span className="metric-card-value">{activeVehiclesCount}</span>
              </div>
            </div>

            {/* Charts Section */}
            <div className="charts-grid">
              {/* Pie chart Card */}
              <div className="chart-card">
                <span className="chart-card-title">Collection by Item (Weight)</span>
                {totalPieWeight === 0 ? (
                  <div style={{ height: '240px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                    No collections data for this range.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '100%', height: '200px' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={85}
                            paddingAngle={3}
                            dataKey="value"
                          >
                            {pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => `${value} Kg`} />
                        </PieChart>
                      </ResponsiveContainer>
                      {/* Central label inside Donut chart */}
                      <div style={{ position: 'relative', top: '-130px', textAlign: 'center' }}>
                        <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b' }}>{totalPieWeight.toFixed(1)} Kg</div>
                        <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 600 }}>Total</div>
                      </div>
                    </div>

                    {/* custom Legend */}
                    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.8rem', marginTop: '-20px' }}>
                      {pieData.map(item => {
                        const percent = ((item.value / totalPieWeight) * 100).toFixed(1);
                        return (
                          <div key={item.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: item.color }}></span>
                              <span style={{ fontWeight: 600 }}>{item.name}</span>
                            </div>
                            <span style={{ color: '#64748b' }}>{item.value} Kg ({percent}%)</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Line chart Card */}
              <div className="chart-card">
                <span className="chart-card-title">Collection Trend (Amount)</span>
                <div style={{ width: '100%', height: '300px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={lineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="dateStr" tickLine={false} axisLine={false} style={{ fontSize: '0.75rem', fill: '#64748b' }} />
                      <YAxis tickLine={false} axisLine={false} style={{ fontSize: '0.75rem', fill: '#64748b' }} />
                      <Tooltip formatter={(value) => [`₹${value}`, 'Amount']} />
                      <Line 
                        type="monotone" 
                        dataKey="Amount" 
                        stroke="#0c5c37" 
                        strokeWidth={3} 
                        dot={{ r: 4, fill: '#0c5c37', strokeWidth: 2 }} 
                        activeDot={{ r: 6 }} 
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Quick Reports Panel */}
            <div className="chart-card">
              <span className="chart-card-title">Quick Reports Download</span>
              <div className="quick-reports-grid">
                {[
                  { label: 'Daily Report', id: 'daily' },
                  { label: 'Monthly Report', id: 'monthly' },
                  { label: 'Custom Date Report', id: 'custom' },
                  { label: 'Division Wise Report', id: 'division' },
                  { label: 'Vehicle Wise Report', id: 'vehicle' },
                  { label: 'Driver Wise Report', id: 'driver' },
                  { label: 'Item Wise Report', id: 'item' }
                ].map(r => (
                  <button 
                    key={r.id} 
                    className="quick-report-btn"
                    onClick={() => {
                      exportToCSV(records, `DRCC_${r.label.replace(/ /g, '_')}_2026.csv`);
                    }}
                  >
                    <FileText size={20} style={{ color: '#0c5c37' }} />
                    <span>{r.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'dashboard' && adminType === 'est' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="admin-section-header">
              <div className="admin-section-title">
                <h2>RVS Eco Projects Dashboard</h2>
                <p>Welcome, Administrator. Here are the latest collections metrics.</p>
              </div>

              {/* Date Filters */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '4px 12px' }}>
                  <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Date Range:</span>
                  <select 
                    className="form-select" 
                    style={{ border: 'none', padding: '4px', fontSize: '0.85rem', width: 'auto', fontWeight: 600 }}
                    value={estDateRange}
                    onChange={(e) => setEstDateRange(e.target.value)}
                  >
                    <option value="today">Today (26-Jun-2026)</option>
                    <option value="7days">Last 7 Days (19 Jun - 26 Jun)</option>
                  </select>
                </div>
                
                <button 
                  className="btn-primary" 
                  style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                  onClick={() => {
                    const headers = ['Receipt No', 'Date & Time', 'Establishment ID', 'Establishment Name', 'Amount Paid (Rs)', 'Payment Mode', 'Remarks', 'Collector Name', 'Collector ID'];
                    const rows = estDashboardPayments.map(p => [
                      p.receiptNo,
                      new Date(p.dateTime).toLocaleString(),
                      p.establishmentId,
                      p.establishmentName,
                      p.amountPaid,
                      p.paymentMode,
                      p.remarks || '',
                      p.collectorName,
                      p.collectorId
                    ]);
                    exportEstToCSV(headers, rows, `Est_Collection_Report_${estDateRange}.csv`);
                  }}
                >
                  <Download size={16} />
                  EXPORT EXCEL
                </button>
              </div>
            </div>

            {/* Dashboard Metric cards */}
            <div className="metrics-grid">
              <div className="metric-card purchase">
                <span className="metric-card-label">Total Collection</span>
                <span className="metric-card-value">₹{Math.round(estTotalCollection).toLocaleString('en-IN')}</span>
              </div>
              
              <div className="metric-card weight">
                <span className="metric-card-label">Total Establishments</span>
                <span className="metric-card-value">{estTotalCount.toLocaleString('en-IN')}</span>
              </div>

              <div className="metric-card transactions">
                <span className="metric-card-label">Total Transactions</span>
                <span className="metric-card-value">{estTotalTransactions}</span>
              </div>

              <div className="metric-card divisions">
                <span className="metric-card-label">Active Collectors</span>
                <span className="metric-card-value">{estActiveCollectorsCount}</span>
              </div>

              <div className="metric-card vehicles">
                <span className="metric-card-label">Pending Shops</span>
                <span className="metric-card-value">{estPendingShopsCount.toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* Charts Section */}
            <div className="charts-grid">
              {/* Pie chart Card */}
              <div className="chart-card">
                <span className="chart-card-title">Collection by Payment Mode (Amount)</span>
                {estTotalPieAmount === 0 ? (
                  <div style={{ height: '240px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                    No collections data for this range.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '100%', height: '200px' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={estPieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={85}
                            paddingAngle={3}
                            dataKey="value"
                          >
                            {estPieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => `₹${value}`} />
                        </PieChart>
                      </ResponsiveContainer>
                      {/* Central label inside Donut chart */}
                      <div style={{ position: 'relative', top: '-130px', textAlign: 'center' }}>
                        <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b' }}>₹{estTotalPieAmount.toLocaleString('en-IN')}</div>
                        <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 600 }}>Total</div>
                      </div>
                    </div>

                    {/* custom Legend */}
                    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.8rem', marginTop: '-20px' }}>
                      {estPieData.map(item => {
                        const percent = ((item.value / estTotalPieAmount) * 100).toFixed(1);
                        return (
                          <div key={item.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: item.color }}></span>
                              <span style={{ fontWeight: 600 }}>{item.name}</span>
                            </div>
                            <span style={{ color: '#64748b' }}>₹{item.value.toLocaleString('en-IN')} ({percent}%)</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Line chart Card */}
              <div className="chart-card">
                <span className="chart-card-title">Collection Trend (Amount)</span>
                <div style={{ width: '100%', height: '300px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={estLineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="dateStr" tickLine={false} axisLine={false} style={{ fontSize: '0.75rem', fill: '#64748b' }} />
                      <YAxis tickLine={false} axisLine={false} style={{ fontSize: '0.75rem', fill: '#64748b' }} />
                      <Tooltip formatter={(value) => [`₹${value}`, 'Amount']} />
                      <Line 
                        type="monotone" 
                        dataKey="Amount" 
                        stroke="#0c5c37" 
                        strokeWidth={3} 
                        dot={{ r: 4, fill: '#0c5c37', strokeWidth: 2 }} 
                        activeDot={{ r: 6 }} 
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Quick Actions Panel */}
            <div className="chart-card">
              <span className="chart-card-title">Quick Actions & Reports</span>
              <div className="quick-reports-grid">
                {[
                  { label: 'Establishments Master Data', action: () => setActiveTab('master-establishments'), icon: <Database size={20} style={{ color: '#0c5c37' }} /> },
                  { label: 'Fix / Update User Fee', action: () => setActiveTab('update-fees'), icon: <DollarSign size={20} style={{ color: '#0c5c37' }} /> },
                  { label: 'Approve New Establishments', action: () => setActiveTab('approve-est'), icon: <Building2 size={20} style={{ color: '#0c5c37' }} /> },
                  { label: 'Apply Penalties', action: () => setActiveTab('apply-penalty'), icon: <ShieldAlert size={20} style={{ color: '#dc2626' }} /> },
                  { label: 'Daily Wise Report', action: () => { setActiveTab('reports'); setEstReportOption('daily'); }, icon: <FileText size={20} style={{ color: '#0c5c37' }} /> },
                  { label: 'Pending Shops Report', action: () => { setActiveTab('reports'); setEstReportOption('pending'); }, icon: <FileText size={20} style={{ color: '#0c5c37' }} /> },
                  { label: 'Monthly Report', action: () => { setActiveTab('reports'); setEstReportOption('monthly'); }, icon: <Download size={20} style={{ color: '#0c5c37' }} /> }
                ].map(r => (
                  <button 
                    key={r.label} 
                    className="quick-report-btn"
                    onClick={r.action}
                  >
                    {r.icon}
                    <span>{r.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ----------------- TAB 2: RECORDS LIST VIEW ----------------- */}
        {activeTab === 'records' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="admin-section-header">
              <div className="admin-section-title">
                <h2>Collection Records</h2>
                <p>Search, filter, and export all DRCC collection historical receipts.</p>
              </div>
              
              <button 
                className="btn-primary" 
                onClick={() => exportToCSV(recordSearchResults, `DRCC_Filtered_Records.csv`)}
              >
                <Download size={16} />
                Export CSV
              </button>
            </div>

            {/* Filter Panel */}
            <div className="card" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px', alignItems: 'end', background: '#ffffff' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Date</label>
                <input 
                  type="date" 
                  className="form-input"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Division</label>
                <select 
                  className="form-select"
                  value={filterDivision}
                  onChange={(e) => setFilterDivision(e.target.value)}
                >
                  <option value="All">All Divisions</option>
                  {divisions.map(d => (
                    <option key={d.id} value={d.id}>{d.id} - {d.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Vehicle Type</label>
                <select 
                  className="form-select"
                  value={filterVehicleType}
                  onChange={(e) => setFilterVehicleType(e.target.value)}
                >
                  <option value="All">All Types</option>
                  <option value="AUTO">AUTO</option>
                  <option value="TRACTOR">TRACTOR</option>
                  <option value="PRIVATE AUTO">PRIVATE AUTO</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Driver</label>
                <select 
                  className="form-select"
                  value={filterDriver}
                  onChange={(e) => setFilterDriver(e.target.value)}
                >
                  <option value="All">All Drivers</option>
                  {drivers.map(d => (
                    <option key={d.name} value={d.name}>{d.name}</option>
                  ))}
                </select>
              </div>

              <button 
                className="btn-primary" 
                style={{ padding: '11px', display: 'flex', justifyContent: 'center' }}
                onClick={handleRecordSearch}
              >
                <Search size={16} />
                SEARCH RECORDS
              </button>
            </div>

            {/* Grid Table */}
            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Date & Time</th>
                    <th>Division</th>
                    <th>Vehicle Type</th>
                    <th>Vehicle No.</th>
                    <th>Driver</th>
                    <th>Plastic (Kg)</th>
                    <th>Cardboard (Kg)</th>
                    <th>Glass (Kg)</th>
                    <th>Others (Kg)</th>
                    <th>Total Wt (Kg)</th>
                    <th>Amount (₹)</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recordSearchResults.length === 0 ? (
                    <tr>
                      <td colSpan="13" style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                        No records match the current filters. Click search or change dates.
                      </td>
                    </tr>
                  ) : (
                    recordSearchResults.map((rec, index) => (
                      <tr key={rec.id}>
                        <td>{index + 1}</td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{rec.receiptNo}</div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            {new Date(rec.dateTime).toLocaleString('en-IN', {
                              day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                            })}
                          </div>
                        </td>
                        <td>{rec.division}</td>
                        <td>{rec.vehicleType}</td>
                        <td>{rec.vehicleNo}</td>
                        <td>{rec.driver}</td>
                        <td>{rec.plastic.toFixed(2)}</td>
                        <td>{rec.cardboard.toFixed(2)}</td>
                        <td>{rec.glass.toFixed(2)}</td>
                        <td>{rec.others.toFixed(2)}</td>
                        <td style={{ fontWeight: 600 }}>{rec.totalWeight.toFixed(2)}</td>
                        <td style={{ fontWeight: 700, color: '#0c5c37' }}>₹{rec.totalAmount.toLocaleString()}</td>
                        <td>
                          <span className="status-badge completed">Completed</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ----------------- MASTER DATA: DIVISIONS ----------------- */}
        {activeTab === 'master-divisions' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="admin-section-header">
              <div className="admin-section-title">
                <h2>Master Data: Divisions</h2>
                <p>Manage and configure municipal wards/divisions assigned to DRCC collections.</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '4fr 8fr', gap: '20px', alignItems: 'start' }}>
              {/* Add form */}
              <div className="card">
                <span className="chart-card-title" style={{ display: 'block', marginBottom: '12px' }}>Add New Division</span>
                <form onSubmit={handleAddDivision} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Division Name</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g. Dhanavaigudem"
                      value={newDivName}
                      onChange={(e) => setNewDivName(e.target.value)}
                      required
                    />
                  </div>
                  <button type="submit" className="btn-primary">
                    <Plus size={16} /> Add Division
                  </button>
                </form>
              </div>

              {/* List */}
              <div className="table-container">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Division ID</th>
                      <th>Division Name</th>
                      <th>Registered Vehicles</th>
                      <th>Active Today</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {divisions.map(div => (
                      <tr key={div.id}>
                        <td style={{ fontWeight: 700 }}>{div.id}</td>
                        <td>{div.name}</td>
                        <td>{div.vehicles}</td>
                        <td style={{ color: '#10b981', fontWeight: 600 }}>{div.activeVehicles}</td>
                        <td>
                          <button 
                            style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                            onClick={() => handleDeleteDivision(div.id, div.name)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ----------------- MASTER DATA: VEHICLES ----------------- */}
        {activeTab === 'master-vehicles' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="admin-section-header">
              <div className="admin-section-title">
                <h2>Master Data: Vehicles</h2>
                <p>Register collection vehicles, their types, and assign default drivers.</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '4fr 8fr', gap: '20px', alignItems: 'start' }}>
              {/* Add form */}
              <div className="card">
                <span className="chart-card-title" style={{ display: 'block', marginBottom: '12px' }}>Register Vehicle</span>
                <form onSubmit={handleAddVehicle} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Vehicle Type</label>
                    <select 
                      className="form-select"
                      value={newVehType}
                      onChange={(e) => setNewVehType(e.target.value)}
                    >
                      <option value="AUTO">AUTO</option>
                      <option value="TRACTOR">TRACTOR</option>
                      <option value="PRIVATE AUTO">PRIVATE AUTO</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Assign Division</label>
                    <select 
                      className="form-select"
                      value={newVehDivision}
                      onChange={(e) => setNewVehDivision(e.target.value)}
                      required
                    >
                      <option value="">-- Choose Division --</option>
                      {divisions.map(d => (
                        <option key={d.id} value={d.id}>{d.id} - {d.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Vehicle No.</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g. AP28 TA 1234"
                      value={newVehNo}
                      onChange={(e) => setNewVehNo(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Assign Regular Driver</label>
                    <select 
                      className="form-select"
                      value={newVehDriver}
                      onChange={(e) => setNewVehDriver(e.target.value)}
                      required
                    >
                      <option value="">-- Choose Driver --</option>
                      {drivers.map(d => (
                        <option key={d.name} value={d.name}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                  <button type="submit" className="btn-primary">
                    <Plus size={16} /> Register
                  </button>
                </form>
              </div>

              {/* List */}
              <div className="table-container">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Vehicle Number</th>
                      <th>Vehicle Type</th>
                      <th>Assigned Division</th>
                      <th>Assigned Regular Driver</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vehicles.map(veh => (
                      <tr key={veh.number}>
                        <td style={{ fontWeight: 700 }}>{veh.number}</td>
                        <td>{veh.type}</td>
                        <td style={{ fontWeight: 600 }}>{veh.division ? `Division ${veh.division}` : 'N/A'}</td>
                        <td>{veh.regularDriver}</td>
                        <td>
                          <button 
                            style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                            onClick={() => handleDeleteVehicle(veh.number)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

              </div>
            </div>
          </div>
        )}

        {/* ----------------- MASTER DATA: DRIVERS ----------------- */}
        {activeTab === 'master-drivers' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="admin-section-header">
              <div className="admin-section-title">
                <h2>Master Data: Drivers</h2>
                <p>Manage garbage truck / auto drivers and their registration info.</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '4fr 8fr', gap: '20px', alignItems: 'start' }}>
              {/* Add form */}
              <div className="card">
                <span className="chart-card-title" style={{ display: 'block', marginBottom: '12px' }}>Register Driver</span>
                <form onSubmit={handleAddDriver} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Driver Name</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g. NAGARAJU"
                      value={newDriverName}
                      onChange={(e) => setNewDriverName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phone Number</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g. +91 9876543210"
                      value={newDriverPhone}
                      onChange={(e) => setNewDriverPhone(e.target.value)}
                      required
                    />
                  </div>
                  <button type="submit" className="btn-primary">
                    <Plus size={16} /> Add Driver
                  </button>
                </form>
              </div>

              {/* List */}
              <div className="table-container">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Driver Name</th>
                      <th>Phone Number</th>
                      <th>Driver Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {drivers.map(drv => (
                      <tr key={drv.name}>
                        <td style={{ fontWeight: 700 }}>{drv.name}</td>
                        <td>{drv.phone}</td>
                        <td>
                          <span className={`status-badge ${drv.isRegular ? 'completed' : 'pending'}`}>
                            {drv.isRegular ? 'Regular' : 'Reliever'}
                          </span>
                        </td>
                        <td>
                          <button 
                            style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                            onClick={() => handleDeleteDriver(drv.name)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ----------------- TAB 3: RATES CONFIGURATION ----------------- */}
        {activeTab === 'rates' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="admin-section-header">
              <div className="admin-section-title">
                <h2>Material Purchase Rates (Fixed by Admin)</h2>
                <p>Modify the price-per-kilogram rates. Changes affect operator entries immediately.</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '5fr 7fr', gap: '24px', alignItems: 'start' }}>
              <div className="card">
                <span className="chart-card-title" style={{ display: 'block', marginBottom: '16px' }}>Configure Rates (₹ per Kg)</span>
                
                <form onSubmit={handleUpdateRates} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">♻️ Plastic Rate (₹)</label>
                    <input 
                      type="number" 
                      step="0.1" 
                      className="form-input"
                      value={editRates.plastic}
                      onChange={(e) => setEditRates(prev => ({ ...prev, plastic: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">📦 Cardboard Rate (₹)</label>
                    <input 
                      type="number" 
                      step="0.1" 
                      className="form-input"
                      value={editRates.cardboard}
                      onChange={(e) => setEditRates(prev => ({ ...prev, cardboard: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">🍾 Glass Rate (₹)</label>
                    <input 
                      type="number" 
                      step="0.1" 
                      className="form-input"
                      value={editRates.glass}
                      onChange={(e) => setEditRates(prev => ({ ...prev, glass: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">🔬 Others Rate (₹)</label>
                    <input 
                      type="number" 
                      step="0.1" 
                      className="form-input"
                      value={editRates.others || ''}
                      onChange={(e) => setEditRates(prev => ({ ...prev, others: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">⚙️ Others - Iron Rate (₹)</label>
                    <input 
                      type="number" 
                      step="0.1" 
                      className="form-input"
                      value={editRates.others_iron || ''}
                      onChange={(e) => setEditRates(prev => ({ ...prev, others_iron: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">📦 Others - Baby Box Rate (₹)</label>
                    <input 
                      type="number" 
                      step="0.1" 
                      className="form-input"
                      value={editRates.others_babybox || ''}
                      onChange={(e) => setEditRates(prev => ({ ...prev, others_babybox: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">♻️ Others - Black Plastic Rate (₹)</label>
                    <input 
                      type="number" 
                      step="0.1" 
                      className="form-input"
                      value={editRates.others_blackplastic || ''}
                      onChange={(e) => setEditRates(prev => ({ ...prev, others_blackplastic: e.target.value }))}
                      required
                    />
                  </div>

                  <button type="submit" className="btn-primary" style={{ padding: '12px' }}>
                    Save Collection Rates
                  </button>
                </form>
              </div>

              {/* Informational guide */}
              <div className="card" style={{ background: '#f8fafc', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <span className="chart-card-title" style={{ color: '#0c5c37' }}>How Rates Apply</span>
                <p style={{ fontSize: '0.9rem', color: '#475569', lineHeight: '1.5' }}>
                  When an operator starts a new collection entry, the application uses these live values to compute the purchase amount dynamically. 
                </p>
                <p style={{ fontSize: '0.9rem', color: '#475569', lineHeight: '1.5' }}>
                  Updating the rates here will <strong>not</strong> retroactively modify past collection amounts. Historical receipts preserve the exact rates that were active at their specific creation date & time.
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '8px', fontSize: '0.8rem', color: '#047857' }}>
                  <ShieldAlert size={16} />
                  <span>Only administrator accounts can view or modify rates.</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ---- ESTABLISHMENTS MASTER DATA ---- */}
        {activeTab === 'master-establishments' && adminType === 'est' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="admin-section-header">
              <div className="admin-section-title">
                <h2>Establishments Master Data</h2>
                <p>Manage, search, edit, add, and export establishment records across all 7 routes.</p>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  className="btn-primary"
                  onClick={handleOpenAddEstModal}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px' }}
                >
                  <Plus size={16} /> Add Establishment
                </button>
                <button
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px',
                    background: '#0c5c37', color: '#ffffff', border: 'none', borderRadius: '6px',
                    cursor: 'pointer', fontWeight: 600
                  }}
                  onClick={handleExportEstMasterCSV}
                >
                  <Download size={16} /> Export CSV
                </button>
              </div>
            </div>

            {estMasterSuccessMsg && (
              <div style={{ padding: '12px 16px', background: '#dcfce7', border: '1px solid #86efac', borderRadius: '8px', color: '#166534', fontWeight: 600 }}>
                {estMasterSuccessMsg}
              </div>
            )}

            {/* Filter and Search Bar */}
            <div className="card" style={{ padding: '16px 20px', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 2fr 1fr', gap: '14px', alignItems: 'center' }}>
              {/* Route Filter */}
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Route Filter</label>
                <select
                  className="form-select"
                  value={estMasterRoute}
                  onChange={(e) => setEstMasterRoute(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px' }}
                >
                  <option value="All">All 7 Routes</option>
                  {EST_ROUTES.map(r => (
                    <option key={r.id} value={r.id}>Route {r.id}: {r.name}</option>
                  ))}
                </select>
              </div>

              {/* Search Bar */}
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Search Shop Name / Proprietor / ID / Phone</label>
                <div style={{ position: 'relative' }}>
                  <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Search by shop name, owner, ID or phone..."
                    value={estMasterSearch}
                    onChange={(e) => setEstMasterSearch(e.target.value)}
                    style={{ paddingLeft: '36px', width: '100%' }}
                  />
                </div>
              </div>

              {/* Status Filter */}
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Status Filter</label>
                <select
                  className="form-select"
                  value={estMasterStatus}
                  onChange={(e) => setEstMasterStatus(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px' }}
                >
                  <option value="All">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="pending">Pending Approval</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            {/* Summary Stats Cards */}
            {(() => {
              let filtered = establishmentsList;
              if (estMasterRoute !== 'All') filtered = filtered.filter(e => String(e.routeId) === String(estMasterRoute));
              if (estMasterStatus !== 'All') filtered = filtered.filter(e => e.status === estMasterStatus);
              if (estMasterSearch.trim()) {
                const q = estMasterSearch.toLowerCase();
                filtered = filtered.filter(e =>
                  (e.name || '').toLowerCase().includes(q) ||
                  (e.id || '').toLowerCase().includes(q) ||
                  (e.proprietor || '').toLowerCase().includes(q) ||
                  (e.phone || '').includes(q)
                );
              }
              const totalMonthlyFee = filtered.reduce((acc, e) => acc + (parseFloat(e.monthlyFee) || 0), 0);
              const totalDue = filtered.reduce((acc, e) => acc + (parseFloat(e.monthlyFee) || 0) + (parseFloat(e.previousBalance) || 0) + (parseFloat(e.penalty) || 0), 0);

              return (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: '16px' }}>
                    <div className="metric-card" style={{ background: '#ffffff', border: '1px solid #e2e8f0' }}>
                      <span className="metric-card-label">Filtered Shops</span>
                      <span className="metric-card-value" style={{ color: '#0c5c37' }}>{filtered.length}</span>
                    </div>
                    <div className="metric-card" style={{ background: '#ffffff', border: '1px solid #e2e8f0' }}>
                      <span className="metric-card-label">Monthly Potential</span>
                      <span className="metric-card-value" style={{ color: '#10b981' }}>₹{totalMonthlyFee.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="metric-card" style={{ background: '#ffffff', border: '1px solid #e2e8f0' }}>
                      <span className="metric-card-label">Total Outstanding</span>
                      <span className="metric-card-value" style={{ color: '#ef4444' }}>₹{totalDue.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="metric-card" style={{ background: '#ffffff', border: '1px solid #e2e8f0' }}>
                      <span className="metric-card-label">Active / Pending</span>
                      <span className="metric-card-value" style={{ color: '#3b82f6', fontSize: '1.2rem' }}>
                        {filtered.filter(e => e.status === 'active').length} / <span style={{ color: '#f59e0b' }}>{filtered.filter(e => e.status === 'pending').length}</span>
                      </span>
                    </div>
                  </div>

                  {/* Master Data Table */}
                  <div className="card" style={{ padding: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <h3 style={{ color: '#0c5c37', fontWeight: 700, fontSize: '1.05rem' }}>
                        Master Records List ({filtered.length} establishments)
                      </h3>
                      <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                        {estMasterRoute === 'All' ? 'Showing all routes' : `Route ${estMasterRoute}: ${EST_ROUTES.find(r => r.id === estMasterRoute)?.name}`}
                      </span>
                    </div>

                    <div className="table-container" style={{ maxHeight: '600px', overflowY: 'auto' }}>
                      <table className="custom-table">
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>Shop ID</th>
                            <th>Establishment Name</th>
                            <th>Proprietor</th>
                            <th>Phone</th>
                            <th>Route</th>
                            <th>Monthly Fee</th>
                            <th>Arrears</th>
                            <th>Penalty</th>
                            <th>Total Due</th>
                            <th>Status</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filtered.length === 0 ? (
                            <tr>
                              <td colSpan="12" style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                                No establishment records match your filter criteria.
                              </td>
                            </tr>
                          ) : (
                            filtered.map((est, idx) => {
                              const totalEstDue = (parseFloat(est.monthlyFee) || 0) + (parseFloat(est.previousBalance) || 0) + (parseFloat(est.penalty) || 0);
                              return (
                                <tr key={est.id}>
                                  <td>{idx + 1}</td>
                                  <td style={{ fontWeight: 700, fontSize: '0.75rem', color: '#0c5c37' }}>{est.id}</td>
                                  <td style={{ fontWeight: 600 }}>{est.name}</td>
                                  <td>{est.proprietor || '—'}</td>
                                  <td style={{ fontSize: '0.8rem' }}>{est.phone || '—'}</td>
                                  <td style={{ fontSize: '0.75rem', color: '#475569' }}>
                                    Route {est.routeId}: {est.routeName}
                                  </td>
                                  <td style={{ fontWeight: 700, color: '#0c5c37' }}>₹{est.monthlyFee || 0}</td>
                                  <td style={{ color: (est.previousBalance || 0) > 0 ? '#ef4444' : '#64748b' }}>
                                    ₹{est.previousBalance || 0}
                                  </td>
                                  <td style={{ color: (est.penalty || 0) > 0 ? '#dc2626' : '#64748b', fontWeight: (est.penalty || 0) > 0 ? 700 : 400 }}>
                                    ₹{est.penalty || 0}
                                  </td>
                                  <td style={{ fontWeight: 700, color: totalEstDue > 0 ? '#b91c1c' : '#166534' }}>
                                    ₹{totalEstDue}
                                  </td>
                                  <td>
                                    <span style={{
                                      padding: '3px 10px',
                                      borderRadius: '12px',
                                      fontSize: '0.75rem',
                                      fontWeight: 700,
                                      background: est.status === 'active' ? '#dcfce7' : est.status === 'pending' ? '#fef3c7' : '#fee2e2',
                                      color: est.status === 'active' ? '#166534' : est.status === 'pending' ? '#92400e' : '#991b1b'
                                    }}>
                                      {est.status ? est.status.toUpperCase() : 'ACTIVE'}
                                    </span>
                                  </td>
                                  <td>
                                    <div style={{ display: 'flex', gap: '6px' }}>
                                      <button
                                        style={{ padding: '6px', background: '#dcfce7', border: '1px solid #86efac', borderRadius: '4px', cursor: 'pointer', color: '#166534' }}
                                        onClick={() => sendWhatsAppDemandNotice(est)}
                                        title="Send Commercial Fee Notice / Demand via WhatsApp"
                                      >
                                        <Send size={14} />
                                      </button>
                                      <button
                                        style={{ padding: '6px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', color: '#0c5c37' }}
                                        onClick={() => handleOpenEditEstModal(est)}
                                        title="Edit Establishment Master Data"
                                      >
                                        <Edit2 size={14} />
                                      </button>
                                      <button
                                        style={{ padding: '6px', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '4px', cursor: 'pointer', color: '#dc2626' }}
                                        onClick={() => handleDeleteMasterEst(est.id, est.name)}
                                        title="Delete Establishment Record"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              );
            })()}

            {/* Add / Edit Establishment Master Modal */}
            {isEstModalOpen && (
              <div style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px'
              }}>
                <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '550px', padding: '24px', position: 'relative', maxHeight: '90vh', overflowY: 'auto' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
                    <h3 style={{ color: '#0c5c37', fontWeight: 700, fontSize: '1.1rem' }}>
                      {editingEst ? `Edit Establishment: ${editingEst.name}` : 'Add New Master Establishment'}
                    </h3>
                    <button onClick={() => setIsEstModalOpen(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                      <X size={20} />
                    </button>
                  </div>

                  <form onSubmit={handleSaveMasterEst} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {/* ID */}
                    <div className="form-group">
                      <label className="form-label">Establishment ID (Optional / Auto-generated)</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. EST26060001 (leave blank for auto)"
                        value={estFormId}
                        onChange={(e) => setEstFormId(e.target.value)}
                        disabled={!!editingEst}
                      />
                    </div>

                    {/* Name */}
                    <div className="form-group">
                      <label className="form-label">Shop / Establishment Name *</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. Sri Venkateswara Kirana"
                        value={estFormName}
                        onChange={(e) => setEstFormName(e.target.value)}
                        required
                      />
                    </div>

                    {/* Proprietor & Phone */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div className="form-group">
                        <label className="form-label">Proprietor Name</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="Owner name"
                          value={estFormProprietor}
                          onChange={(e) => setEstFormProprietor(e.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Phone Number</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="e.g. 9848012345"
                          value={estFormPhone}
                          onChange={(e) => setEstFormPhone(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Route */}
                    <div className="form-group">
                      <label className="form-label">Assigned Route *</label>
                      <select
                        className="form-select"
                        value={estFormRouteId}
                        onChange={(e) => setEstFormRouteId(e.target.value)}
                        required
                      >
                        {EST_ROUTES.map(r => (
                          <option key={r.id} value={r.id}>Route {r.id}: {r.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Fee, Arrears, Penalty */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                      <div className="form-group">
                        <label className="form-label">Monthly Fee (₹)</label>
                        <input
                          type="number"
                          className="form-input"
                          value={estFormMonthlyFee}
                          onChange={(e) => setEstFormMonthlyFee(e.target.value)}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Arrears (₹)</label>
                        <input
                          type="number"
                          className="form-input"
                          value={estFormPreviousBalance}
                          onChange={(e) => setEstFormPreviousBalance(e.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Penalty (₹)</label>
                        <input
                          type="number"
                          className="form-input"
                          value={estFormPenalty}
                          onChange={(e) => setEstFormPenalty(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Status */}
                    <div className="form-group">
                      <label className="form-label">Status *</label>
                      <select
                        className="form-select"
                        value={estFormStatus}
                        onChange={(e) => setEstFormStatus(e.target.value)}
                      >
                        <option value="active">Active</option>
                        <option value="pending">Pending Approval</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>

                    <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                      <button type="submit" className="btn-primary" style={{ flex: 1, padding: '12px', fontWeight: 700 }}>
                        {editingEst ? 'Update Master Establishment' : 'Add Establishment'}
                      </button>
                      <button
                        type="button"
                        style={{ padding: '12px 20px', background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
                        onClick={() => setIsEstModalOpen(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ---- FIX / UPDATE USER FEE ---- */}
        {activeTab === 'update-fees' && adminType === 'est' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="admin-section-header">
              <div className="admin-section-title">
                <h2>Fix / Update User Fee</h2>
                <p>Select a route, then select an establishment by name or ID and update its monthly user fee.</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '5fr 7fr', gap: '24px', alignItems: 'start' }}>
              {/* Form Card */}
              <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <h3 style={{ color: '#0c5c37', fontSize: '1.05rem', fontWeight: 700, borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
                  Update Monthly Fee
                </h3>
                <form onSubmit={handleUpdateFee} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Route Select */}
                  <div className="form-group">
                    <label className="form-label">1. Select Route</label>
                    <select
                      className="form-select"
                      value={feeRoute}
                      onChange={(e) => { setFeeRoute(e.target.value); setFeeSelectedEstId(''); }}
                    >
                      <option value="All">— All Routes —</option>
                      {EST_ROUTES.map(r => (
                        <option key={r.id} value={r.id}>Route {r.id}: {r.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Shop Select */}
                  <div className="form-group">
                    <label className="form-label">2. Select Shop (by Name or ID)</label>
                    <select
                      className="form-select"
                      value={feeSelectedEstId}
                      onChange={(e) => {
                        setFeeSelectedEstId(e.target.value);
                        const est = establishmentsList.find(x => x.id === e.target.value);
                        if (est) setFeeNewAmount(String(est.monthlyFee || ''));
                      }}
                      required
                    >
                      <option value="">— Select Establishment —</option>
                      {getEstsByRoute(feeRoute).filter(e => e.status !== 'pending').map(est => (
                        <option key={est.id} value={est.id}>
                          [{est.id}] {est.name} — ₹{est.monthlyFee}/mo
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Current Fee Display */}
                  {feeSelectedEstId && (() => {
                    const selected = establishmentsList.find(e => e.id === feeSelectedEstId);
                    return selected ? (
                      <div style={{ padding: '12px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', fontSize: '0.85rem' }}>
                        <div style={{ fontWeight: 700, color: '#166534', marginBottom: '4px' }}>{selected.name}</div>
                        <div style={{ color: '#374151' }}>ID: <strong>{selected.id}</strong> &nbsp;|&nbsp; Route: <strong>{selected.routeName}</strong></div>
                        <div style={{ color: '#374151', marginTop: '4px' }}>Current Monthly Fee: <strong style={{ color: '#0c5c37', fontSize: '1rem' }}>₹{selected.monthlyFee}</strong></div>
                        <div style={{ color: '#374151' }}>Pending Balance: <strong style={{ color: selected.previousBalance > 0 ? '#ef4444' : '#166534' }}>₹{(selected.previousBalance || 0) + (selected.penalty || 0)}</strong></div>
                      </div>
                    ) : null;
                  })()}

                  {/* New Fee Input */}
                  <div className="form-group">
                    <label className="form-label">3. New Monthly Fee (₹)</label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      className="form-input"
                      placeholder="e.g. 200"
                      value={feeNewAmount}
                      onChange={(e) => setFeeNewAmount(e.target.value)}
                      required
                    />
                  </div>

                  {feeSuccessMsg && (
                    <div style={{ padding: '10px 14px', background: '#dcfce7', border: '1px solid #86efac', borderRadius: '8px', color: '#166534', fontWeight: 600, fontSize: '0.9rem' }}>
                      {feeSuccessMsg}
                    </div>
                  )}

                  <button type="submit" className="btn-primary" style={{ padding: '13px', fontSize: '0.95rem', fontWeight: 700 }}>
                    <DollarSign size={16} /> Save Updated Fee
                  </button>
                </form>
              </div>

              {/* Info / Summary Panel */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="card" style={{ padding: '20px', background: '#f8fafc' }}>
                  <h3 style={{ color: '#0c5c37', fontWeight: 700, marginBottom: '12px', fontSize: '1rem' }}>
                    Current Fees – {feeRoute === 'All' ? 'All Routes' : `Route ${feeRoute}: ${EST_ROUTES.find(r => r.id === feeRoute)?.name}`}
                  </h3>
                  <div className="table-container">
                    <table className="custom-table">
                      <thead>
                        <tr>
                          <th>Shop ID</th>
                          <th>Shop Name</th>
                          <th>Route</th>
                          <th>Monthly Fee</th>
                          <th>Pending Balance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {getEstsByRoute(feeRoute).filter(e => e.status !== 'pending').slice(0, 30).map(est => (
                          <tr
                            key={est.id}
                            style={{ cursor: 'pointer', background: feeSelectedEstId === est.id ? '#ecfdf5' : '' }}
                            onClick={() => {
                              setFeeSelectedEstId(est.id);
                              setFeeNewAmount(String(est.monthlyFee || ''));
                            }}
                          >
                            <td style={{ fontWeight: 700, fontSize: '0.75rem' }}>{est.id}</td>
                            <td>{est.name}</td>
                            <td style={{ fontSize: '0.75rem', color: '#64748b' }}>{est.routeName}</td>
                            <td style={{ fontWeight: 700, color: '#0c5c37' }}>₹{est.monthlyFee}</td>
                            <td style={{ color: (est.previousBalance || 0) + (est.penalty || 0) > 0 ? '#ef4444' : '#166534', fontWeight: 600 }}>
                              ₹{(est.previousBalance || 0) + (est.penalty || 0)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ---- APPROVE NEW ESTABLISHMENTS ---- */}
        {activeTab === 'approve-est' && adminType === 'est' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="admin-section-header">
              <div className="admin-section-title">
                <h2>Approve New Establishments</h2>
                <p>Review establishments registered by operators that are awaiting admin approval.</p>
              </div>
            </div>

            {(() => {
              const pending = establishmentsList.filter(e => e.status === 'pending');
              return pending.length === 0 ? (
                <div className="card" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                  <Building2 size={48} style={{ margin: '0 auto 16px', color: '#cbd5e1' }} />
                  <h3 style={{ fontWeight: 700, marginBottom: '8px' }}>No Pending Establishments</h3>
                  <p style={{ fontSize: '0.9rem' }}>All newly registered establishments have been reviewed. When an operator registers a new shop, it will appear here for approval.</p>
                </div>
              ) : (
                <div className="card" style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ color: '#0c5c37', fontWeight: 700, fontSize: '1rem' }}>
                      Pending Approval <span style={{ background: '#fef3c7', color: '#92400e', borderRadius: '12px', padding: '2px 10px', fontSize: '0.8rem', marginLeft: '8px' }}>{pending.length} pending</span>
                    </h3>
                  </div>
                  <div className="table-container">
                    <table className="custom-table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Establishment ID</th>
                          <th>Shop Name</th>
                          <th>Proprietor</th>
                          <th>Phone</th>
                          <th>Route</th>
                          <th>Monthly Fee</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pending.map((est, idx) => (
                          <tr key={est.id}>
                            <td>{idx + 1}</td>
                            <td style={{ fontWeight: 700, fontSize: '0.75rem' }}>{est.id}</td>
                            <td style={{ fontWeight: 600 }}>{est.name}</td>
                            <td>{est.proprietor || '—'}</td>
                            <td>{est.phone || '—'}</td>
                            <td style={{ fontSize: '0.8rem' }}>{est.routeName}</td>
                            <td style={{ fontWeight: 700, color: '#0c5c37' }}>₹{est.monthlyFee}</td>
                            <td>
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                  className="btn-primary"
                                  style={{ padding: '6px 14px', fontSize: '0.8rem', background: '#10b981', border: 'none' }}
                                  onClick={() => handleApproveEst(est.id)}
                                >
                                  ✓ Approve
                                </button>
                                <button
                                  style={{ padding: '6px 14px', fontSize: '0.8rem', background: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
                                  onClick={() => handleRejectEst(est.id, est.name)}
                                >
                                  ✗ Reject
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}

            {/* Active Establishments count card */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '16px' }}>
              {[
                { label: 'Total Registered', value: establishmentsList.length, color: '#0c5c37' },
                { label: 'Active', value: establishmentsList.filter(e => e.status === 'active').length, color: '#10b981' },
                { label: 'Pending Approval', value: establishmentsList.filter(e => e.status === 'pending').length, color: '#f59e0b' }
              ].map(card => (
                <div key={card.label} className="metric-card" style={{ background: '#ffffff', border: '1px solid #e2e8f0' }}>
                  <span className="metric-card-label">{card.label}</span>
                  <span className="metric-card-value" style={{ color: card.color }}>{card.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ---- APPLY PENALTIES ---- */}
        {activeTab === 'apply-penalty' && adminType === 'est' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="admin-section-header">
              <div className="admin-section-title">
                <h2>Apply Penalties</h2>
                <p>Select a route and establishment, enter penalty amount and reason. The penalty will be added to the shop's outstanding balance.</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '5fr 7fr', gap: '24px', alignItems: 'start' }}>
              {/* Form Card */}
              <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <h3 style={{ color: '#dc2626', fontSize: '1.05rem', fontWeight: 700, borderBottom: '1px solid #fecaca', paddingBottom: '8px' }}>
                  Impose Penalty
                </h3>
                <form onSubmit={handleApplyPenalty} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Route Select */}
                  <div className="form-group">
                    <label className="form-label">1. Select Route</label>
                    <select
                      className="form-select"
                      value={penaltyRoute}
                      onChange={(e) => { setPenaltyRoute(e.target.value); setPenaltyEstId(''); }}
                    >
                      <option value="All">— All Routes —</option>
                      {EST_ROUTES.map(r => (
                        <option key={r.id} value={r.id}>Route {r.id}: {r.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Shop Select */}
                  <div className="form-group">
                    <label className="form-label">2. Select Shop (by Name or ID)</label>
                    <select
                      className="form-select"
                      value={penaltyEstId}
                      onChange={(e) => setPenaltyEstId(e.target.value)}
                      required
                    >
                      <option value="">— Select Establishment —</option>
                      {getEstsByRoute(penaltyRoute).filter(e => e.status !== 'pending').map(est => (
                        <option key={est.id} value={est.id}>
                          [{est.id}] {est.name} (penalty: ₹{est.penalty || 0})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Selected Shop Info */}
                  {penaltyEstId && (() => {
                    const selected = establishmentsList.find(e => e.id === penaltyEstId);
                    return selected ? (
                      <div style={{ padding: '12px', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '8px', fontSize: '0.85rem' }}>
                        <div style={{ fontWeight: 700, color: '#9a3412', marginBottom: '4px' }}>{selected.name}</div>
                        <div style={{ color: '#374151' }}>Monthly Fee: <strong>₹{selected.monthlyFee}</strong> &nbsp;|&nbsp; Existing Penalty: <strong style={{ color: '#dc2626' }}>₹{selected.penalty || 0}</strong></div>
                        <div style={{ color: '#374151', marginTop: '4px' }}>Total Due: <strong style={{ color: '#dc2626', fontSize: '1rem' }}>₹{(selected.monthlyFee || 0) + (selected.penalty || 0) + (selected.previousBalance || 0)}</strong></div>
                      </div>
                    ) : null;
                  })()}

                  {/* Penalty Amount */}
                  <div className="form-group">
                    <label className="form-label">3. Penalty Amount (₹)</label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      className="form-input"
                      placeholder="e.g. 500"
                      value={penaltyAmount}
                      onChange={(e) => setPenaltyAmount(e.target.value)}
                      required
                    />
                  </div>

                  {/* Remarks */}
                  <div className="form-group">
                    <label className="form-label">4. Reason / Remarks</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Non-compliance, late payment, etc."
                      value={penaltyRemarks}
                      onChange={(e) => setPenaltyRemarks(e.target.value)}
                    />
                  </div>

                  {penaltySuccessMsg && (
                    <div style={{ padding: '10px 14px', background: '#dcfce7', border: '1px solid #86efac', borderRadius: '8px', color: '#166534', fontWeight: 600, fontSize: '0.9rem' }}>
                      {penaltySuccessMsg}
                    </div>
                  )}

                  <button type="submit" className="btn-primary" style={{ padding: '13px', fontSize: '0.95rem', fontWeight: 700, background: '#dc2626' }}>
                    <ShieldAlert size={16} /> Apply Penalty
                  </button>
                </form>
              </div>

              {/* Establishments with penalties */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="card" style={{ padding: '20px', background: '#fff8f5' }}>
                  <h3 style={{ color: '#9a3412', fontWeight: 700, marginBottom: '12px', fontSize: '1rem' }}>
                    Establishments with Outstanding Penalties – {penaltyRoute === 'All' ? 'All Routes' : `Route ${penaltyRoute}`}
                  </h3>
                  <div className="table-container">
                    <table className="custom-table">
                      <thead>
                        <tr>
                          <th>Shop ID</th>
                          <th>Shop Name</th>
                          <th>Route</th>
                          <th>Monthly Fee</th>
                          <th>Penalty</th>
                          <th>Total Due</th>
                        </tr>
                      </thead>
                      <tbody>
                        {getEstsByRoute(penaltyRoute)
                          .filter(e => e.status !== 'pending')
                          .sort((a, b) => (b.penalty || 0) - (a.penalty || 0))
                          .slice(0, 30)
                          .map(est => (
                          <tr
                            key={est.id}
                            style={{ cursor: 'pointer', background: penaltyEstId === est.id ? '#fee2e2' : '' }}
                            onClick={() => { setPenaltyEstId(est.id); setPenaltyRoute(String(est.routeId)); }}
                          >
                            <td style={{ fontWeight: 700, fontSize: '0.75rem' }}>{est.id}</td>
                            <td>{est.name}</td>
                            <td style={{ fontSize: '0.75rem', color: '#64748b' }}>{est.routeName}</td>
                            <td>₹{est.monthlyFee}</td>
                            <td style={{ color: (est.penalty || 0) > 0 ? '#dc2626' : '#166534', fontWeight: 700 }}>₹{est.penalty || 0}</td>
                            <td style={{ fontWeight: 700, color: '#9a3412' }}>₹{(est.monthlyFee || 0) + (est.penalty || 0) + (est.previousBalance || 0)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ----------------- TAB 4: REPORTS GENERATOR ----------------- */}
        {activeTab === 'reports' && adminType === 'drcc' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="admin-section-header">
              <div className="admin-section-title">
                <h2>Reports & Export Center</h2>
                <p>Generate detailed CSV summaries of waste collections for accounting.</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '20px' }}>
              {/* Quick Reports Card */}
              <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h3 style={{ color: '#0c5c37', fontSize: '1.1rem', fontWeight: 700, borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>Quick Reports</h3>
                
                {/* Daily Report */}
                <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <h4 style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '4px' }}>Daily Collection Report</h4>
                  <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '12px' }}>Download all collection entries recorded on today's date ({new Date().toLocaleDateString('en-CA')}).</p>
                  <button className="btn-primary" onClick={downloadDailyReport} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.85rem', padding: '8px 12px' }}>
                    <Download size={14} /> Download Daily Report
                  </button>
                </div>

                {/* Monthly Report */}
                <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <h4 style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '8px' }}>Monthly Collection Report</h4>
                  <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
                    <div style={{ flex: 2 }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>Month</label>
                      <select value={selectedMonth} onChange={(e) => setSelectedMonth(parseInt(e.target.value))} className="form-input" style={{ width: '100%', padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1' }}>
                        {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((m, idx) => (
                          <option key={m} value={idx}>{m}</option>
                        ))}
                      </select>
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>Year</label>
                      <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))} className="form-input" style={{ width: '100%', padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1' }}>
                        {[2026, 2025, 2024].map(y => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <button className="btn-primary" onClick={downloadMonthlyReport} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.85rem', padding: '8px 12px' }}>
                    <Download size={14} /> Download Monthly Report
                  </button>
                </div>
              </div>

              {/* Custom Parameterized Reports Card */}
              <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h3 style={{ color: '#0c5c37', fontSize: '1.1rem', fontWeight: 700, borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>Custom Parameterized Reports</h3>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  {/* Start Date */}
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>Start Date</label>
                    <input type="date" value={reportStartDate} onChange={(e) => setReportStartDate(e.target.value)} className="form-input" style={{ width: '100%', padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                  </div>
                  {/* End Date */}
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>End Date</label>
                    <input type="date" value={reportEndDate} onChange={(e) => setReportEndDate(e.target.value)} className="form-input" style={{ width: '100%', padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                  </div>
                  {/* Division */}
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>Division</label>
                    <select value={reportDivision} onChange={(e) => setReportDivision(e.target.value)} className="form-input" style={{ width: '100%', padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1' }}>
                      <option value="All">All Divisions</option>
                      {divisions.map(div => (
                        <option key={div.id} value={div.id}>{div.id} - {div.name}</option>
                      ))}
                    </select>
                  </div>
                  {/* Vehicle */}
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>Vehicle</label>
                    <select value={reportVehicle} onChange={(e) => setReportVehicle(e.target.value)} className="form-input" style={{ width: '100%', padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1' }}>
                      <option value="All">All Vehicles</option>
                      {vehicles.map(v => (
                        <option key={v.vehicleNo} value={v.vehicleNo}>{v.vehicleNo} ({v.type})</option>
                      ))}
                    </select>
                  </div>
                  {/* Driver */}
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>Driver</label>
                    <select value={reportDriver} onChange={(e) => setReportDriver(e.target.value)} className="form-input" style={{ width: '100%', padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1' }}>
                      <option value="All">All Drivers</option>
                      {drivers.map(drv => (
                        <option key={drv.name} value={drv.name}>{drv.name}</option>
                      ))}
                    </select>
                  </div>
                  {/* Item */}
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>Waste Item Category</label>
                    <select value={reportItem} onChange={(e) => setReportItem(e.target.value)} className="form-input" style={{ width: '100%', padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1' }}>
                      <option value="All">All Items</option>
                      <option value="plastic">Plastic</option>
                      <option value="cardboard">Cardboard</option>
                      <option value="glass">Glass</option>
                      <option value="others">Others (₹3/kg)</option>
                      <option value="others_iron">Others - Iron (₹25/kg)</option>
                      <option value="others_babybox">Others - Baby Box (₹3/kg)</option>
                      <option value="others_blackplastic">Others - Black Plastic (₹3/kg)</option>
                    </select>
                  </div>
                </div>

                <button className="btn-primary" onClick={downloadFilteredReport} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.9rem', padding: '10px 14px', marginTop: '10px' }}>
                  <Download size={16} /> Download Filtered Report
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ----------------- ESTABLISHMENTS REPORTS GENERATOR ----------------- */}
        {activeTab === 'reports' && adminType === 'est' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="admin-section-header">
              <div className="admin-section-title">
                <h2>Establishments Reports Center</h2>
                <p>Configure filters and download Excel (CSV) summaries for commercial collection services.</p>
              </div>
            </div>

            <div style={{ maxWidth: '600px' }}>
              {/* Box 1: Admin (Office) - Reports & Downloads */}
              <div className="card" style={{ border: '2px solid #0c5c37', padding: '24px', borderRadius: '14px', backgroundColor: '#ffffff' }}>
                <h3 style={{ color: '#0c5c37', fontSize: '1.2rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '20px', borderBottom: '2px solid #0c5c37', paddingBottom: '12px', textAlign: 'left', fontFamily: "'Outfit', 'Inter', sans-serif" }}>
                  ADMIN (OFFICE) - REPORTS & DOWNLOADS
                </h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px' }}>
                  {/* Option 1: Daily wise report */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.95rem', fontWeight: 700, color: '#1e293b', cursor: 'pointer', padding: '2px 0' }}>
                      <input 
                        type="radio" 
                        name="estReportOption" 
                        value="daily" 
                        checked={estReportOption === 'daily'}
                        onChange={(e) => setEstReportOption(e.target.value)}
                        style={{ accentColor: '#0c5c37', width: '18px', height: '18px' }}
                      />
                      <span>Daily wise report</span>
                    </label>
                    {estReportOption === 'daily' && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginLeft: '30px', marginTop: '6px' }}>
                        <div>
                          <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>Start Date</label>
                          <input 
                            type="date" 
                            value={estReportStartDate} 
                            onChange={(e) => setEstReportStartDate(e.target.value)} 
                            className="form-input" 
                            style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }} 
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>End Date</label>
                          <input 
                            type="date" 
                            value={estReportEndDate} 
                            onChange={(e) => setEstReportEndDate(e.target.value)} 
                            className="form-input" 
                            style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }} 
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Option 2: Collector-wise Report */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.95rem', fontWeight: 700, color: '#1e293b', cursor: 'pointer', padding: '2px 0' }}>
                      <input 
                        type="radio" 
                        name="estReportOption" 
                        value="collector" 
                        checked={estReportOption === 'collector'}
                        onChange={(e) => setEstReportOption(e.target.value)}
                        style={{ accentColor: '#0c5c37', width: '18px', height: '18px' }}
                      />
                      <span>Collector-wise Report</span>
                    </label>
                    {estReportOption === 'collector' && (
                      <select 
                        className="form-select" 
                        value={estSelectedCollector}
                        onChange={(e) => setEstSelectedCollector(e.target.value)}
                        style={{ marginLeft: '30px', width: 'calc(100% - 30px)', padding: '8px 12px', fontSize: '0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                      >
                        <option value="All">All Collectors</option>
                        {Array.from(new Set(establishmentPaymentsList.map(p => p.collectorName))).filter(Boolean).map(cName => (
                          <option key={cName} value={cName}>{cName}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Option 3: Route-wise Report */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.95rem', fontWeight: 700, color: '#1e293b', cursor: 'pointer', padding: '2px 0' }}>
                      <input 
                        type="radio" 
                        name="estReportOption" 
                        value="route" 
                        checked={estReportOption === 'route'}
                        onChange={(e) => setEstReportOption(e.target.value)}
                        style={{ accentColor: '#0c5c37', width: '18px', height: '18px' }}
                      />
                      <span>Route-wise Report</span>
                    </label>
                    {estReportOption === 'route' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginLeft: '30px' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '2px' }}>Select Route</label>
                        <select 
                          className="form-select" 
                          value={estSelectedRoute}
                          onChange={(e) => setEstSelectedRoute(e.target.value)}
                          style={{ width: '100%', padding: '8px 12px', fontSize: '0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                        >
                          <option value="All">All Routes</option>
                          <option value="1">Route 1: GANDHICHOWK</option>
                          <option value="2">Route 2: GATTAIAH CENTER</option>
                          <option value="3">Route 3: IT HUB TO SRI SRI CIRCLE</option>
                          <option value="4">Route 4: KAMAN BAZAR</option>
                          <option value="5">Route 5: KHANAPURAM</option>
                          <option value="6">Route 6: MUSTAFANAGAR</option>
                          <option value="7">Route 7: WYRA ROAD</option>
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Option 4: Pending Report */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.95rem', fontWeight: 700, color: '#1e293b', cursor: 'pointer', padding: '2px 0' }}>
                      <input 
                        type="radio" 
                        name="estReportOption" 
                        value="pending" 
                        checked={estReportOption === 'pending'}
                        onChange={(e) => setEstReportOption(e.target.value)}
                        style={{ accentColor: '#0c5c37', width: '18px', height: '18px' }}
                      />
                      <span>Pending Report</span>
                    </label>
                    {estReportOption === 'pending' && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginLeft: '30px', marginTop: '6px' }}>
                        <div>
                          <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>Start Date</label>
                          <input 
                            type="date" 
                            value={estReportStartDate} 
                            onChange={(e) => setEstReportStartDate(e.target.value)} 
                            className="form-input" 
                            style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }} 
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>End Date</label>
                          <input 
                            type="date" 
                            value={estReportEndDate} 
                            onChange={(e) => setEstReportEndDate(e.target.value)} 
                            className="form-input" 
                            style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }} 
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Option 5: New Establishments */}
                  <label style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.95rem', fontWeight: 700, color: '#1e293b', cursor: 'pointer', padding: '2px 0' }}>
                    <input 
                      type="radio" 
                      name="estReportOption" 
                      value="new_est" 
                      checked={estReportOption === 'new_est'}
                      onChange={(e) => setEstReportOption(e.target.value)}
                      style={{ accentColor: '#0c5c37', width: '18px', height: '18px' }}
                    />
                    <span>New Establishments</span>
                  </label>

                  {/* Option 6: Fee Revision Report */}
                  <label style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.95rem', fontWeight: 700, color: '#1e293b', cursor: 'pointer', padding: '2px 0' }}>
                    <input 
                      type="radio" 
                      name="estReportOption" 
                      value="fee_revision" 
                      checked={estReportOption === 'fee_revision'}
                      onChange={(e) => setEstReportOption(e.target.value)}
                      style={{ accentColor: '#0c5c37', width: '18px', height: '18px' }}
                    />
                    <span>Fee Revision Report</span>
                  </label>

                  {/* Option 7: Monthly Collection Report */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.95rem', fontWeight: 700, color: '#1e293b', cursor: 'pointer', padding: '2px 0' }}>
                      <input 
                        type="radio" 
                        name="estReportOption" 
                        value="monthly" 
                        checked={estReportOption === 'monthly'}
                        onChange={(e) => setEstReportOption(e.target.value)}
                        style={{ accentColor: '#0c5c37', width: '18px', height: '18px' }}
                      />
                      <span>Monthly Collection Report</span>
                    </label>
                    {estReportOption === 'monthly' && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginLeft: '30px' }}>
                        <select 
                          className="form-select" 
                          value={estReportMonth}
                          onChange={(e) => setEstReportMonth(parseInt(e.target.value))}
                          style={{ padding: '8px 12px', fontSize: '0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                        >
                          <option value="0">January</option>
                          <option value="1">February</option>
                          <option value="2">March</option>
                          <option value="3">April</option>
                          <option value="4">May</option>
                          <option value="5">June</option>
                          <option value="6">July</option>
                          <option value="7">August</option>
                          <option value="8">September</option>
                          <option value="9">October</option>
                          <option value="10">November</option>
                          <option value="11">December</option>
                        </select>
                        <select 
                          className="form-select" 
                          value={estReportYear}
                          onChange={(e) => setEstReportYear(parseInt(e.target.value))}
                          style={{ padding: '8px 12px', fontSize: '0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                        >
                          <option value="2026">2026</option>
                          <option value="2027">2027</option>
                        </select>
                      </div>
                    )}
                  </div>
                </div>

                {/* Download Button */}
                <button 
                  onClick={handleDownloadEstReport}
                  className="btn-primary" 
                  style={{ 
                    width: '100%', 
                    padding: '16px', 
                    borderRadius: '12px', 
                    fontWeight: 800, 
                    letterSpacing: '0.5px',
                    backgroundColor: '#0c5c37',
                    color: '#ffffff',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    fontSize: '0.95rem',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(12, 92, 55, 0.15)',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0a4f2f'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0c5c37'}
                >
                  <Download size={18} />
                  DOWNLOAD EXCEL
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ----------------- TAB 5: USER MANAGEMENT ----------------- */}
        {activeTab === 'users' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="admin-section-header">
              <div className="admin-section-title">
                <h2>User Management</h2>
                <p>Create and manage administrator and operator logins.</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.5fr 1fr', gap: '20px', alignItems: 'start' }}>
              {/* Left Column: Users List Table */}
              <div className="card" style={{ padding: '20px' }}>
                <h3 style={{ color: '#0c5c37', fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px' }}>User Accounts</h3>
                <div className="table-container" style={{ overflowX: 'auto' }}>
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>Username</th>
                        <th>Role</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map(u => (
                        <tr key={u.username}>
                          <td style={{ fontWeight: 700 }}>{u.username}</td>
                          <td>
                            <span className={`role-badge ${u.role === 'admin' ? 'admin' : 'operator'}`} style={{
                              padding: '4px 8px',
                              borderRadius: '12px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              backgroundColor: u.role === 'admin' ? '#fee2e2' : '#e0f2fe',
                              color: u.role === 'admin' ? '#991b1b' : '#0369a1'
                            }}>
                              {u.role === 'admin' ? 'Administrator' : 'Operator'}
                            </span>
                          </td>
                          <td>
                            <span className={`status-badge ${u.status === 'active' ? 'completed' : 'cancelled'}`} style={{
                              padding: '4px 8px',
                              borderRadius: '12px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              backgroundColor: u.status === 'active' ? '#dcfce7' : '#fee2e2',
                              color: u.status === 'active' ? '#166534' : '#991b1b'
                            }}>
                              {u.status === 'active' ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td>
                            <button
                              onClick={() => handleToggleStatus(u.username, u.status)}
                              className="btn-secondary"
                              style={{
                                padding: '6px 12px',
                                fontSize: '0.75rem',
                                color: u.status === 'active' ? '#dc2626' : '#16a34a',
                                borderColor: u.status === 'active' ? '#fca5a5' : '#86efac',
                                backgroundColor: 'transparent',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = u.status === 'active' ? '#fef2f2' : '#f0fdf4';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'transparent';
                              }}
                            >
                              {u.status === 'active' ? 'Deactivate' : 'Activate'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Right Column: User Modification & Creation Forms */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Form 1: Add New User */}
                <div className="card" style={{ padding: '20px' }}>
                  <h3 style={{ color: '#0c5c37', fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px' }}>Add New User</h3>
                  <form onSubmit={handleAddUser} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div className="form-group">
                      <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem' }}>Username</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Enter username"
                        value={newUsername}
                        onChange={(e) => setNewUsername(e.target.value)}
                        required
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem' }}>Password</label>
                      <input
                        type="password"
                        className="form-input"
                        placeholder="Enter password"
                        value={newUserPassword}
                        onChange={(e) => setNewUserPassword(e.target.value)}
                        required
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem' }}>Role</label>
                      <select
                        value={newUserRole}
                        onChange={(e) => setNewUserRole(e.target.value)}
                        className="form-input"
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                      >
                        <option value="operator">Operator (Field/Worker)</option>
                        <option value="admin">Administrator</option>
                      </select>
                    </div>
                    <button type="submit" className="btn-primary" style={{ padding: '10px', width: '100%', marginTop: '8px' }}>
                      Add User Account
                    </button>
                  </form>
                </div>

                {/* Form 2: Change User Password */}
                <div className="card" style={{ padding: '20px' }}>
                  <h3 style={{ color: '#0c5c37', fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px' }}>Change User Password</h3>
                  <form onSubmit={handleChangeUserPassword} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div className="form-group">
                      <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem' }}>Select User</label>
                      <select
                        value={changePasswordUsername}
                        onChange={(e) => setChangePasswordUsername(e.target.value)}
                        className="form-input"
                        required
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                      >
                        <option value="">-- Choose Account --</option>
                        {users.map(u => (
                          <option key={u.username} value={u.username}>
                            {u.username} ({u.role})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem' }}>New Password</label>
                      <input
                        type="password"
                        className="form-input"
                        placeholder="Enter new password"
                        value={changePasswordValue}
                        onChange={(e) => setChangePasswordValue(e.target.value)}
                        required
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                      />
                    </div>
                    <button type="submit" className="btn-primary" style={{ padding: '10px', width: '100%', marginTop: '8px' }}>
                      Update Password
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ----------------- TAB 6: ACTIVITY LOG ----------------- */}
        {activeTab === 'logs' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="admin-section-header">
              <div className="admin-section-title">
                <h2>System Activity Log</h2>
                <p>Audit trail of actions taken in the Operator app and Admin web panel.</p>
              </div>
            </div>

            <div className="card">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {activityLogs.map((log, index) => (
                  <div key={index} style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', paddingBottom: '12px', borderBottom: index === activityLogs.length - 1 ? 'none' : '1px solid #f1f5f9' }}>
                    <div style={{ 
                      width: '32px', height: '32px', borderRadius: '50%', background: log.user === 'Admin' ? '#eff6ff' : '#eaf6ee',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                    }}>
                      {log.user === 'Admin' ? <Settings size={14} style={{ color: '#2563eb' }} /> : <FileText size={14} style={{ color: '#0c5c37' }} />}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e293b' }}>
                        {log.action}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                        By <strong>{log.user}</strong> • {new Date(log.time).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ----------------- TAB 7: SETTINGS / UTILITIES ----------------- */}
        {activeTab === 'settings' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="admin-section-header">
              <div className="admin-section-title">
                <h2>Application Settings</h2>
                <p>System tools, data resets, and deployment variables configuration.</p>
              </div>
            </div>

            <div className="card" style={{ borderLeft: '4px solid #ef4444' }}>
              <h3 style={{ fontSize: '1rem', color: '#b91c1c', marginBottom: '8px' }}>Danger Zone</h3>
              <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '16px' }}>
                Resetting the database deletes all custom records, vehicles, divisions, and drivers, reinstating default demo values. This action is irreversible.
              </p>
              <button 
                className="btn-secondary" 
                style={{ color: '#ef4444', borderColor: '#ef4444', background: 'transparent' }}
                onClick={handleResetDB}
              >
                <RefreshCw size={16} /> Reset System Database
              </button>
            </div>

            <div className="card">
              <span className="chart-card-title" style={{ display: 'block', marginBottom: '12px' }}>System Info</span>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.85rem' }}>
                <div><strong>Application Version:</strong> v1.0.5</div>
                <div><strong>Developer:</strong> Antigravity AI</div>
                <div><strong>Station Location:</strong> Khammam, Telangana</div>
                <div><strong>Database Engine:</strong> Web LocalStorage Client</div>
              </div>
            </div>
          </div>
        )}

        {/* ----------------- TAB 8: ESTABLISHMENTS PORTAL CONTROL ----------------- */}
        {activeTab === 'establishments' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Header */}
            <div className="admin-section-header">
              <div className="admin-section-title">
                <h2>Establishments Portal Controls</h2>
                <p>Manage commercial collections, generate reports, approve registrations, update fees, and apply penalties.</p>
              </div>
            </div>

            {/* Dashboard Content Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '350px 1fr', gap: '24px', alignItems: 'start' }}>
              
              {/* Left Column: Quick Actions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                {/* Box: Only Admin can: */}
                <div className="card" style={{ backgroundColor: '#fffdf4', border: '1px solid #fde047', padding: '24px', borderRadius: '14px' }}>
                  <h3 style={{ color: '#854d0e', fontSize: '1.2rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '20px', borderBottom: '2px solid #fde047', paddingBottom: '12px', textAlign: 'left', fontFamily: "'Outfit', 'Inter', sans-serif" }}>
                    ONLY ADMIN CAN:
                  </h3>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <button 
                      onClick={() => setEstActiveAction('update-fees')}
                      style={{ 
                        display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '14px 18px', 
                        borderRadius: '10px', border: estActiveAction === 'update-fees' ? '2px solid #ca8a04' : '1px solid #fef08a',
                        backgroundColor: estActiveAction === 'update-fees' ? '#fef9c3' : '#ffffff',
                        color: '#854d0e', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s',
                        boxShadow: estActiveAction === 'update-fees' ? '0 4px 6px rgba(202, 138, 4, 0.08)' : 'none'
                      }}
                    >
                      <span style={{ color: '#ca8a04', fontWeight: 900, fontSize: '1.2rem', lineHeight: '1' }}>•</span> Fix/Update User Fee
                    </button>

                    <button 
                      onClick={() => setEstActiveAction('approve-new')}
                      style={{ 
                        display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '14px 18px', 
                        borderRadius: '10px', border: estActiveAction === 'approve-new' ? '2px solid #ca8a04' : '1px solid #fef08a',
                        backgroundColor: estActiveAction === 'approve-new' ? '#fef9c3' : '#ffffff',
                        color: '#854d0e', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s',
                        boxShadow: estActiveAction === 'approve-new' ? '0 4px 6px rgba(202, 138, 4, 0.08)' : 'none'
                      }}
                    >
                      <span style={{ color: '#ca8a04', fontWeight: 900, fontSize: '1.2rem', lineHeight: '1' }}>•</span> Approve New Establishments
                    </button>

                    <button 
                      onClick={() => setEstActiveAction('apply-penalty')}
                      style={{ 
                        display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '14px 18px', 
                        borderRadius: '10px', border: estActiveAction === 'apply-penalty' ? '2px solid #ca8a04' : '1px solid #fef08a',
                        backgroundColor: estActiveAction === 'apply-penalty' ? '#fef9c3' : '#ffffff',
                        color: '#854d0e', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s',
                        boxShadow: estActiveAction === 'apply-penalty' ? '0 4px 6px rgba(202, 138, 4, 0.08)' : 'none'
                      }}
                    >
                      <span style={{ color: '#ca8a04', fontWeight: 900, fontSize: '1.2rem', lineHeight: '1' }}>•</span> Apply Penalties
                    </button>

                    <button 
                      onClick={() => handleTabChange('reports')}
                      style={{ 
                        display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '14px 18px', 
                        borderRadius: '10px', border: '1px solid #fef08a', backgroundColor: '#ffffff',
                        color: '#854d0e', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s'
                      }}
                    >
                      <span style={{ color: '#ca8a04', fontWeight: 900, fontSize: '1.2rem', lineHeight: '1' }}>•</span> Download Reports
                    </button>

                    <button 
                      onClick={() => handleTabChange('users')}
                      style={{ 
                        display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '14px 18px', 
                        borderRadius: '10px', border: '1px solid #fef08a', backgroundColor: '#ffffff',
                        color: '#854d0e', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s'
                      }}
                    >
                      <span style={{ color: '#ca8a04', fontWeight: 900, fontSize: '1.2rem', lineHeight: '1' }}>•</span> Manage Users & Routes
                    </button>
                  </div>
                </div>

              </div>

              {/* Right Column: Dynamic Sub-panel depending on selected quick action */}
              <div className="card" style={{ padding: '24px', minHeight: '400px', overflowX: 'auto' }}>
                
                {/* 1. Sub-panel: Fix/Update User Fee */}
                {estActiveAction === 'update-fees' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', gap: '12px' }}>
                      <h3 style={{ color: '#0c5c37', fontSize: '1.2rem', fontWeight: 700 }}>Fix / Update User Fee</h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#f1f5f9', padding: '6px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                        <Search size={14} style={{ color: '#64748b' }} />
                        <input 
                          type="text" 
                          placeholder="Search Business / Owner..." 
                          value={estAdminSearch}
                          onChange={(e) => setEstAdminSearch(e.target.value)}
                          style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.8rem', width: '180px' }}
                        />
                      </div>
                    </div>

                    <div className="table-container" style={{ border: 'none', boxShadow: 'none' }}>
                      <table className="custom-table">
                        <thead>
                          <tr>
                            <th>Business Name</th>
                            <th>Route</th>
                            <th style={{ width: '130px' }}>Monthly Fee (₹)</th>
                            <th style={{ width: '130px' }}>Penalty (₹)</th>
                            <th style={{ width: '100px', textAlign: 'center' }}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {establishmentsList
                            .filter(e => e.name.toLowerCase().includes(estAdminSearch.toLowerCase()) || (e.proprietor && e.proprietor.toLowerCase().includes(estAdminSearch.toLowerCase())))
                            .map(est => {
                              return (
                                <tr key={est.id}>
                                  <td>
                                    <div style={{ fontWeight: 600, color: '#1e293b' }}>{est.name}</div>
                                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Owner: {est.proprietor || 'N/A'} • {est.phone || 'No Phone'}</div>
                                  </td>
                                  <td style={{ fontSize: '0.8rem', fontWeight: 500 }}>{est.routeName}</td>
                                  <td>
                                    <input 
                                      type="number" 
                                      defaultValue={est.monthlyFee}
                                      onBlur={(e) => {
                                        est.monthlyFeeInputVal = e.target.value;
                                      }}
                                      style={{ width: '100px', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                                    />
                                  </td>
                                  <td>
                                    <input 
                                      type="number" 
                                      defaultValue={est.penalty}
                                      onBlur={(e) => {
                                        est.penaltyInputVal = e.target.value;
                                      }}
                                      style={{ width: '100px', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                                    />
                                  </td>
                                  <td style={{ textAlign: 'center' }}>
                                    <button 
                                      onClick={() => {
                                        const f = est.monthlyFeeInputVal !== undefined ? est.monthlyFeeInputVal : est.monthlyFee;
                                        const p = est.penaltyInputVal !== undefined ? est.penaltyInputVal : est.penalty;
                                        handleUpdateEstFee(est.id, f, p);
                                      }}
                                      className="btn-primary" 
                                      style={{ padding: '6px 12px', fontSize: '0.75rem', borderRadius: '6px' }}
                                    >
                                      Save
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 2. Sub-panel: Approve New Establishments */}
                {estActiveAction === 'approve-new' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', gap: '12px' }}>
                      <h3 style={{ color: '#0c5c37', fontSize: '1.2rem', fontWeight: 700 }}>Approve / Deactivate Registrations</h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#f1f5f9', padding: '6px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                        <Search size={14} style={{ color: '#64748b' }} />
                        <input 
                          type="text" 
                          placeholder="Search establishments..." 
                          value={estAdminSearch}
                          onChange={(e) => setEstAdminSearch(e.target.value)}
                          style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.8rem', width: '180px' }}
                        />
                      </div>
                    </div>

                    <div className="table-container" style={{ border: 'none', boxShadow: 'none' }}>
                      <table className="custom-table">
                        <thead>
                          <tr>
                            <th>Business Name</th>
                            <th>Route</th>
                            <th>Arrears / Fee</th>
                            <th>Status</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {establishmentsList
                            .filter(e => e.name.toLowerCase().includes(estAdminSearch.toLowerCase()) || (e.proprietor && e.proprietor.toLowerCase().includes(estAdminSearch.toLowerCase())))
                            .map(est => (
                              <tr key={est.id}>
                                <td>
                                  <div style={{ fontWeight: 600, color: '#1e293b' }}>{est.name}</div>
                                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Owner: {est.proprietor || 'N/A'} • {est.phone || 'No Phone'}</div>
                                </td>
                                <td style={{ fontSize: '0.8rem', fontWeight: 500 }}>{est.routeName}</td>
                                <td>
                                  <div style={{ fontSize: '0.85rem' }}>Arrears: ₹{est.previousBalance}</div>
                                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Monthly: ₹{est.monthlyFee}</div>
                                </td>
                                <td>
                                  <span style={{ 
                                    padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700,
                                    backgroundColor: (est.status || 'active') === 'active' ? '#ecfdf5' : '#fef2f2',
                                    color: (est.status || 'active') === 'active' ? '#059669' : '#dc2626'
                                  }}>
                                    {(est.status || 'active') === 'active' ? 'Active / Approved' : 'Deactivated'}
                                  </span>
                                </td>
                                <td>
                                  <button 
                                    onClick={() => handleToggleEstActive(est.id, est.status || 'active')}
                                    className="btn-secondary" 
                                    style={{ 
                                      padding: '6px 12px', fontSize: '0.75rem', borderRadius: '6px',
                                      color: (est.status || 'active') === 'active' ? '#dc2626' : '#059669',
                                      borderColor: (est.status || 'active') === 'active' ? '#dc2626' : '#059669'
                                    }}
                                  >
                                    {(est.status || 'active') === 'active' ? 'Deactivate' : 'Approve & Activate'}
                                  </button>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 3. Sub-panel: Apply Penalties */}
                {estActiveAction === 'apply-penalty' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
                      <h3 style={{ color: '#0c5c37', fontSize: '1.2rem', fontWeight: 700 }}>Apply One-Time Penalty</h3>
                      <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>Add a one-time penal charge to an establishment's ledger balance.</p>
                    </div>

                    <form onSubmit={handleApplyPenalty} style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '500px' }}>
                      <div className="form-group">
                        <label className="form-label" style={{ fontWeight: 700, fontSize: '0.75rem' }}>Select Establishment</label>
                        <select 
                          className="form-select" 
                          value={penaltyEstId}
                          onChange={(e) => setPenaltyEstId(e.target.value)}
                          required
                          style={{ padding: '10px', fontSize: '0.85rem', backgroundColor: '#ffffff' }}
                        >
                          <option value="">-- Choose Business --</option>
                          {establishmentsList.map(est => (
                            <option key={est.id} value={est.id}>
                              {est.name} ({est.routeName}) - Bal: ₹{est.previousBalance + est.monthlyFee + est.penalty}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="form-group">
                        <label className="form-label" style={{ fontWeight: 700, fontSize: '0.75rem' }}>Penalty Amount (₹) *</label>
                        <input 
                          type="number" 
                          className="form-input" 
                          placeholder="e.g. 500" 
                          value={penaltyAmount}
                          onChange={(e) => setPenaltyAmount(e.target.value)}
                          required
                          min="1"
                          style={{ padding: '10px', fontSize: '0.85rem' }}
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label" style={{ fontWeight: 700, fontSize: '0.75rem' }}>Penalty Reason / Remarks</label>
                        <input 
                          type="text" 
                          className="form-input" 
                          placeholder="e.g. Delayed waste handover, mixing hazardous waste" 
                          value={penaltyRemarks}
                          onChange={(e) => setPenaltyRemarks(e.target.value)}
                          style={{ padding: '10px', fontSize: '0.85rem' }}
                        />
                      </div>

                      <button type="submit" className="btn-primary" style={{ padding: '12px', fontWeight: 700, alignSelf: 'start', marginTop: '8px' }}>
                        Apply Penal Charge
                      </button>
                    </form>
                  </div>
                )}

              </div>

            </div>
          </div>
        )}

      </main>
    </div>
  );
}
