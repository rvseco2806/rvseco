import React, { useState, useEffect } from 'react';
import { db } from '../db/localStorageDB';
import { 
  Lock, User, MapPin, Menu, Bell, Plus, FileText, Trash2,
  UserCheck, ArrowLeft, Truck, CheckCircle2, Search, Calendar, ChevronRight, LogOut
} from 'lucide-react';

export default function OperatorApp({ onLogout, currentRates, onNewEntrySaved, onAdminLogin, currentUser }) {
  // Navigation steps: 
  // 'login', 'dashboard', 'division', 'vehicle-type', 'details', 'entry', 'review', 'success', 'records'
  const [step, setStep] = useState('dashboard');
  
  // Login State
  const [loginId, setLoginId] = useState('operator');
  const [password, setPassword] = useState('operator123');
  const [rememberMe, setRememberMe] = useState(true);
  const [gpsError, setGpsError] = useState(null);
  const [gpsCoords, setGpsCoords] = useState(null);

  // New Entry State
  const [selectedDivision, setSelectedDivision] = useState('');
  const [selectedVehicleType, setSelectedVehicleType] = useState('AUTO');
  const [vehicleNo, setVehicleNo] = useState('');
  const [isRegularDriver, setIsRegularDriver] = useState(true);
  const [selectedDriver, setSelectedDriver] = useState('');
  const [amountPaid, setAmountPaid] = useState('');
  
  // Materials weights State
  const [weights, setWeights] = useState({
    plastic: '',
    cardboard: '',
    glass: '',
    others: ''
  });

  // Success details state
  const [latestReceipt, setLatestReceipt] = useState(null);

  // Others material entries: Array of { id, subtype, weight }
  const [othersEntries, setOthersEntries] = useState([
    { id: 1, subtype: 'others', weight: '' }
  ]);

  // Driver previous balance state
  const [driverPrevBalance, setDriverPrevBalance] = useState(0);

  // Others material subtype: 'others', 'others_iron', 'others_babybox', 'others_blackplastic'
  const [othersSubtype, setOthersSubtype] = useState('others');

  const fetchDriverPreviousBalance = async (driverName) => {
    if (!driverName) {
      setDriverPrevBalance(0);
      return;
    }
    const allRecs = await db.getRecords();
    const driverRecs = allRecs
      .filter(r => r.driver === driverName)
      .sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime));
    
    if (driverRecs.length > 0) {
      setDriverPrevBalance(driverRecs[0].balanceAmount || 0);
    } else {
      setDriverPrevBalance(0);
    }
  };

  useEffect(() => {
    fetchDriverPreviousBalance(selectedDriver);
  }, [selectedDriver]);

  // Records Search State
  const [recordsTab, setRecordsTab] = useState('today'); // 'today' or 'history'
  const [searchDate, setSearchDate] = useState('2026-06-20');
  const [searchDivision, setSearchDivision] = useState('All');
  const [searchVehicleType, setSearchVehicleType] = useState('All');
  const [searchDriver, setSearchDriver] = useState('All');
  const [filteredRecords, setFilteredRecords] = useState([]);

  // Database lists
  const [divisions, setDivisions] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [todayRecords, setTodayRecords] = useState([]);
  const [todayStats, setTodayStats] = useState({ purchase: 0, weight: 0 });

  // Load lists on mount
  useEffect(() => {
    const loadAllData = async () => {
      setDivisions(await db.getDivisions());
      setVehicles(await db.getVehicles());
      setDrivers(await db.getDrivers());
      
      const allRecs = await db.getRecords();
      const localToday = new Date().toLocaleDateString('en-CA');
      const hasTodayRecords = allRecs.some(r => r.dateTime.startsWith(localToday));
      if (hasTodayRecords) {
        setSearchDate(localToday);
      }
      
      await loadTodayData();
    };
    loadAllData();
    requestGPS();
  }, []);

  const loadTodayData = async () => {
    const allRecs = await db.getRecords();
    
    // Filter records for today: use localToday if records exist, otherwise fallback to '2026-06-26'
    const localToday = new Date().toLocaleDateString('en-CA');
    const hasTodayRecords = allRecs.some(r => r.dateTime.startsWith(localToday));
    const todayStr = hasTodayRecords ? localToday : '2026-06-26';
    
    const recsToday = allRecs.filter(r => r.dateTime.startsWith(todayStr));
    setTodayRecords(recsToday);
    
    // Calculate today's stats
    const totalWt = recsToday.reduce((sum, r) => sum + r.totalWeight, 0);
    const totalAmt = recsToday.reduce((sum, r) => sum + r.totalAmount, 0);
    setTodayStats({
      weight: Math.round(totalWt * 100) / 100,
      purchase: Math.round(totalAmt * 100) / 100
    });
  };

  const requestGPS = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGpsCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setGpsError(null);
        },
        (err) => {
          console.warn('Geolocation permission not granted. Falling back to mock coordinates.');
          setGpsCoords({ lat: 17.2473, lng: 80.1514 });
        }
      );
    } else {
      setGpsCoords({ lat: 17.2473, lng: 80.1514 });
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    const id = loginId.trim().toLowerCase();
    try {
      const usersList = await db.getUsers();
      const matchedUser = usersList.find(u => u.username.toLowerCase() === id);
      if (!matchedUser) {
        alert('Invalid credentials. User not found.');
        return;
      }
      if (matchedUser.password !== password) {
        alert('Incorrect password.');
        return;
      }
      if (matchedUser.status === 'inactive') {
        alert('Your account has been deactivated. Please contact the Admin.');
        return;
      }
      if (matchedUser.role === 'admin') {
        if (onAdminLogin) onAdminLogin();
      } else {
        setStep('dashboard');
        loadTodayData();
      }
    } catch (err) {
      alert('Login error: ' + err.message);
    }
  };

  // Get dynamic division metadata
  const activeDivData = divisions.find(d => String(d.id) === String(selectedDivision)) || (selectedDivision ? {
    id: selectedDivision,
    name: `Division-${selectedDivision}`,
    vehicles: 3,
    activeVehicles: 3
  } : null);

  // Filter vehicles of selected type and division
  const matchingVehicles = vehicles.filter(v => 
    v.type === selectedVehicleType && 
    String(v.division) === String(selectedDivision)
  );


  // Trigger when vehicle changes to prefill driver
  const handleVehicleChange = (val) => {
    setVehicleNo(val);
    const matchedVehicle = vehicles.find(v => v.number === val);
    if (matchedVehicle) {
      setSelectedDriver(matchedVehicle.regularDriver);
      setIsRegularDriver(true);
    }
  };

  // Dynamic calculations for materials entry
  const getMaterialAmount = (type, weight, subtype = null) => {
    const key = type === 'others' ? (subtype || 'others') : type;
    const rate = currentRates[key] || 0;
    const wtNum = parseFloat(weight) || 0;
    return Math.round(wtNum * rate * 100) / 100;
  };

  const totalInputWeight = Math.round(
    (
      (parseFloat(weights.plastic) || 0) +
      (parseFloat(weights.cardboard) || 0) +
      (parseFloat(weights.glass) || 0) +
      othersEntries.reduce((sum, entry) => sum + (parseFloat(entry.weight) || 0), 0)
    ) * 100
  ) / 100;

  const grandInputTotal = Math.round(
    (
      getMaterialAmount('plastic', weights.plastic) +
      getMaterialAmount('cardboard', weights.cardboard) +
      getMaterialAmount('glass', weights.glass) +
      othersEntries.reduce((sum, entry) => sum + getMaterialAmount('others', entry.weight, entry.subtype), 0)
    ) * 100
  ) / 100;

  const handleConfirmAndSave = async () => {
    const paidNum = parseFloat(amountPaid) || 0;
    const balNum = Math.round(((grandInputTotal + driverPrevBalance) - paidNum) * 100) / 100;

    const record = {
      division: selectedDivision,
      divisionName: activeDivData?.name || '',
      vehicleType: selectedVehicleType,
      vehicleNo: vehicleNo,
      driver: selectedDriver,
      plastic: parseFloat(weights.plastic) || 0,
      cardboard: parseFloat(weights.cardboard) || 0,
      glass: parseFloat(weights.glass) || 0,
      others: othersEntries.reduce((sum, entry) => sum + (parseFloat(entry.weight) || 0), 0),
      totalWeight: totalInputWeight,
      totalAmount: grandInputTotal,
      amountPaid: paidNum,
      balanceAmount: balNum,
      ratesUsed: { 
        ...currentRates,
        others: currentRates[othersEntries[0]?.subtype || 'others'] || 0,
        othersSubtype: othersEntries[0]?.subtype || 'others',
        othersEntries: othersEntries.map(e => ({
          subtype: e.subtype,
          weight: parseFloat(e.weight) || 0,
          rate: currentRates[e.subtype] || 0
        }))
      },
      gps: gpsCoords || { lat: 17.2473, lng: 80.1514 }
    };

    const saved = await db.addRecord(record);
    setLatestReceipt(saved);
    setSearchDate(new Date().toLocaleDateString('en-CA'));
    await loadTodayData();
    
    // Notify parent to update charts/stats if dashboard is open
    if (onNewEntrySaved) onNewEntrySaved();

    setStep('success');
  };

  const resetNewEntryForm = () => {
    setSelectedDivision('');
    setSelectedVehicleType('AUTO');
    setVehicleNo('');
    setIsRegularDriver(true);
    setSelectedDriver('');
    setAmountPaid('');
    setWeights({ plastic: '', cardboard: '', glass: '', others: '' });
    setOthersEntries([{ id: 1, subtype: 'others', weight: '' }]);
    setDriverPrevBalance(0);
    setOthersSubtype('others');
  };

  // Perform history search
  const handleSearch = async () => {
    let allRecords = await db.getRecords();
    
    // Filter by date
    if (searchDate) {
      allRecords = allRecords.filter(r => r.dateTime.startsWith(searchDate));
    }
    // Filter by division
    if (searchDivision !== 'All') {
      allRecords = allRecords.filter(r => r.division === searchDivision);
    }
    // Filter by vehicle type
    if (searchVehicleType !== 'All') {
      allRecords = allRecords.filter(r => r.vehicleType === searchVehicleType);
    }
    // Filter by driver
    if (searchDriver !== 'All') {
      allRecords = allRecords.filter(r => r.driver === searchDriver);
    }

    setFilteredRecords(allRecords);
  };

  // Initialize Search results
  useEffect(() => {
    if (step === 'records') {
      handleSearch();
    }
  }, [step, searchDate, searchDivision, searchVehicleType, searchDriver]);

  // Compute breakdown for today's dashboard matching the screenshot
  const getTodayMaterialTotals = (type) => {
    return todayRecords.reduce((sum, r) => sum + (r[type] || 0), 0);
  };

  const getTodayMaterialAmounts = (type) => {
    return todayRecords.reduce((sum, r) => {
      // Use the rate used in the record itself
      const rate = r.ratesUsed?.[type] || currentRates[type] || 0;
      return sum + ((r[type] || 0) * rate);
    }, 0);
  };

  return (
    <div className="smartphone-screen">
      
      {/* ----------------- SCREEN 1: LOGIN ----------------- */}
      {step === 'login' && (
        <div className="operator-content animate-fade-in" style={{ justifyContent: 'center', height: '100%', padding: '24px' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            {/* RVS Leaf Logo SVG */}
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: '#eaf6ee', width: '90px', height: '90px', borderRadius: '50%', marginBottom: '16px' }}>
              <svg width="54" height="54" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM13 17H11V15H13V17ZM13 13H11V7H13V13Z" fill="#0c5c37" style={{ display: 'none' }}/>
                <path d="M2 22C2 22 6 18 10 14C12 12 15 12 18 9C21 6 22 2 22 2C22 2 18 3 15 6C12 9 12 12 10 14C6 18 2 22 2 22Z" fill="#0c5c37"/>
                <path d="M10 14C10 14 7 11 5 11C3 11 2 13 2 13C2 13 4 14 6 15C8 16 10 14 10 14Z" fill="#10b981"/>
              </svg>
            </div>
            <h1 style={{ color: '#0c5c37', fontWeight: 800, fontSize: '1.75rem', letterSpacing: '-0.5px' }}>RVS</h1>
            <p style={{ textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '2px', fontWeight: 700, color: '#10b981', marginBottom: '16px' }}>Eco Projects</p>
            
            <h3 style={{ fontSize: '1.15rem', color: '#1e293b', fontWeight: 700 }}>DRCC Operator Login</h3>
            <p style={{ fontSize: '0.8rem', color: '#64748b' }}>Khammam Municipal Corporation</p>
          </div>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Login ID</label>
              <div style={{ position: 'relative' }}>
                <User size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                <input 
                  type="text" 
                  className="form-input" 
                  style={{ paddingLeft: '38px' }}
                  placeholder="Enter Login ID"
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                <input 
                  type="password" 
                  className="form-input" 
                  style={{ paddingLeft: '38px' }}
                  placeholder="Enter Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
              <input 
                type="checkbox" 
                id="remember" 
                checked={rememberMe} 
                onChange={(e) => setRememberMe(e.target.checked)}
                style={{ accentColor: '#0c5c37', width: '16px', height: '16px' }}
              />
              <label htmlFor="remember" style={{ color: '#475569', cursor: 'pointer' }}>Remember me</label>
            </div>

            <button type="submit" className="btn-primary" style={{ padding: '14px', marginTop: '8px' }}>
              LOGIN
            </button>
          </form>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '10px 12px', background: '#fef3c7', borderRadius: '8px', border: '1px solid #fde68a', fontSize: '0.75rem', color: '#b45309', marginTop: '16px' }}>
            <MapPin size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>GPS permission is required to continue. Location captured on every entry.</span>
          </div>

          <span style={{ fontSize: '0.75rem', color: '#94a3b8', textAlign: 'center', marginTop: '24px' }}>v1.0.5</span>
        </div>
      )}

      {/* ----------------- SCREEN 2: WORKER DASHBOARD (TODAY) ----------------- */}
      {step === 'dashboard' && (
        <>
          <div className="operator-header">
            <div className="title">
              <Menu size={20} />
              <span>DRCC Dashboard</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Bell size={20} />
              <button onClick={() => { if (onLogout) onLogout(); }} title="Logout">
                <LogOut size={18} />
              </button>
            </div>
          </div>

          <div className="operator-content animate-fade-in" style={{ paddingBottom: '70px' }}>
            {/* Today's Date */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
              <span style={{ color: '#64748b', fontWeight: 500 }}>Today's Date</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: '#1e293b', background: '#ffffff', padding: '4px 10px', borderRadius: '30px', border: '1px solid #e2e8f0' }}>
                <Calendar size={14} style={{ color: '#0c5c37' }} />
                {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
              </span>
            </div>

            {/* Quick Stats Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="card" style={{ borderLeft: '4px solid #3b82f6', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Total Purchase</span>
                <span style={{ fontSize: '1.4rem', fontWeight: 700, color: '#3b82f6' }}>₹{todayStats.purchase.toLocaleString()}</span>
              </div>
              <div className="card" style={{ borderLeft: '4px solid #10b981', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Total Weight</span>
                <span style={{ fontSize: '1.4rem', fontWeight: 700, color: '#10b981' }}>{todayStats.weight} Kg</span>
              </div>
            </div>

            {/* Materials Breakdown list */}
            <div className="card" style={{ padding: '4px 12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {[
                  { key: 'plastic', label: 'Plastic', color: '#10b981', emoji: '♻️' },
                  { key: 'cardboard', label: 'Cardboard', color: '#f59e0b', emoji: '📦' },
                  { key: 'glass', label: 'Glass', color: '#3b82f6', emoji: '🍾' },
                  { key: 'others', label: 'Others', color: '#8b5cf6', emoji: '🔬' }
                ].map((item, idx, arr) => {
                  const wt = getTodayMaterialTotals(item.key);
                  const amt = getTodayMaterialAmounts(item.key);
                  return (
                    <div key={item.key} style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      padding: '12px 0',
                      borderBottom: idx === arr.length - 1 ? 'none' : '1px solid #f1f5f9'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '1.2rem' }}>{item.emoji}</span>
                        <span style={{ fontWeight: 600, color: '#334155', fontSize: '0.9rem' }}>{item.label}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 500 }}>{wt.toFixed(1)} Kg</span>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0c5c37', minWidth: '50px', textAlign: 'right' }}>₹{Math.round(amt).toLocaleString()}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Button "+ NEW ENTRY" */}
            <button 
              className="btn-primary" 
              style={{ padding: '14px', borderRadius: '12px', marginTop: '4px', animation: 'pulseGlow 2s infinite' }}
              onClick={() => {
                resetNewEntryForm();
                setStep('division');
              }}
            >
              <Plus size={20} />
              NEW ENTRY
            </button>
          </div>

          {/* Bottom Navigation */}
          <div style={{ 
            position: 'absolute', 
            bottom: 0, 
            left: 0, 
            width: '100%', 
            background: '#ffffff', 
            borderTop: '1px solid #e2e8f0', 
            padding: '10px 16px',
            display: 'flex',
            justifyContent: 'space-around',
            gap: '12px',
            boxShadow: '0 -2px 10px rgba(0,0,0,0.05)'
          }}>
            <button 
              className="btn-secondary" 
              style={{ flex: 1, padding: '10px', fontSize: '0.85rem', borderWidth: '1px' }}
              onClick={() => {
                setRecordsTab('today');
                setStep('records');
              }}
            >
              <FileText size={16} />
              RECORDS
            </button>
            <button 
              className="btn-secondary" 
              style={{ flex: 1, padding: '10px', fontSize: '0.85rem', borderWidth: '1px' }}
              onClick={() => alert('Worker Profile:\nRole: DRCC Operator\nStation: Khammam Municipal Corporation')}
            >
              <User size={16} />
              PROFILE
            </button>
          </div>
        </>
      )}

      {/* ----------------- SCREEN 3: ENTER DIVISION ----------------- */}
      {step === 'division' && (
        <>
          <div className="operator-header">
            <button onClick={() => setStep('dashboard')}><ArrowLeft size={20} /></button>
            <span>Enter Division</span>
            <div style={{ width: '20px' }}></div>
          </div>

          <div className="operator-content animate-fade-in">
            <div className="form-group">
              <label className="form-label">Select Division</label>
              <select 
                className="form-select"
                value={selectedDivision}
                onChange={(e) => setSelectedDivision(e.target.value)}
              >
                <option value="">-- Choose Division --</option>
                {Array.from({ length: 60 }, (_, i) => i + 1).map(num => {
                  const divId = String(num);
                  return (
                    <option key={divId} value={divId}>Division {divId}</option>
                  );
                })}
              </select>
            </div>

            {selectedDivision && activeDivData && (
              <div className="card animate-fade-in" style={{ backgroundColor: '#ffffff', display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Division Name</span>
                  <span style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0c5c37' }}>Division {selectedDivision}</span>
                </div>
                
                <hr style={{ border: 'none', borderTop: '1px solid #f1f5f9' }} />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem', color: '#475569' }}>Total Vehicles</span>
                  <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1e293b', background: '#f1f5f9', padding: '2px 10px', borderRadius: '12px' }}>
                    {activeDivData.vehicles}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem', color: '#475569' }}>Active Vehicles</span>
                  <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#10b981', background: '#ecfdf5', padding: '2px 10px', borderRadius: '12px' }}>
                    {activeDivData.activeVehicles}
                  </span>
                </div>
              </div>
            )}

            <button 
              className="btn-primary" 
              style={{ marginTop: 'auto', padding: '14px' }}
              disabled={!selectedDivision}
              onClick={() => setStep('vehicle-type')}
            >
              CONTINUE
            </button>
          </div>
        </>
      )}

      {/* ----------------- SCREEN 4: SELECT VEHICLE TYPE ----------------- */}
      {step === 'vehicle-type' && (
        <>
          <div className="operator-header">
            <button onClick={() => setStep('division')}><ArrowLeft size={20} /></button>
            <span>Select Vehicle Type</span>
            <div style={{ width: '20px' }}></div>
          </div>

          <div className="operator-content animate-fade-in">
            <div style={{ marginBottom: '8px' }}>
              <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Division</span>
              <h3 style={{ color: '#0c5c37', fontSize: '1.2rem', fontWeight: 700 }}>Division {selectedDivision}</h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                { type: 'AUTO', label: 'AUTO', emoji: '🛺' },
                { type: 'TRACTOR', label: 'TRACTOR', emoji: '🚜' },
                { type: 'PRIVATE AUTO', label: 'PRIVATE AUTO', emoji: '🛺' }
              ].map(item => (
                <div 
                  key={item.type} 
                  className={`card ${selectedVehicleType === item.type ? 'active' : ''}`}
                  style={{ 
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px',
                    borderColor: selectedVehicleType === item.type ? '#0c5c37' : '#e2e8f0',
                    backgroundColor: selectedVehicleType === item.type ? '#eaf6ee' : '#ffffff',
                    borderWidth: selectedVehicleType === item.type ? '2px' : '1px',
                    transition: 'all 0.2s'
                  }}
                  onClick={() => {
                    setSelectedVehicleType(item.type);
                    // Reset selected vehicle and driver because type changed
                    setVehicleNo('');
                    setSelectedDriver('');
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '1.6rem' }}>{item.emoji}</span>
                    <span style={{ fontWeight: 700, color: '#1e293b' }}>{item.label}</span>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={selectedVehicleType === item.type}
                    onChange={() => {}} // Controlled by card click
                    style={{ accentColor: '#0c5c37', width: '18px', height: '18px' }}
                  />
                </div>
              ))}
            </div>

            <p style={{ fontSize: '0.75rem', color: '#64748b', textAlign: 'center', marginTop: '12px' }}>
              💡 Tick the vehicle type that has arrived at DRCC today.
            </p>

            <button 
              className="btn-primary" 
              style={{ marginTop: 'auto', padding: '14px' }}
              onClick={() => {
                // Pre-select first vehicle of this type and division if any
                const defaultVeh = vehicles.find(v => 
                  v.type === selectedVehicleType && 
                  String(v.division) === String(selectedDivision)
                );
                if (defaultVeh) {
                  handleVehicleChange(defaultVeh.number);
                } else {
                  setVehicleNo('');
                  setSelectedDriver('');
                }
                setStep('details');
              }}
            >
              CONTINUE
            </button>
          </div>
        </>
      )}

      {/* ----------------- SCREEN 5: VEHICLE & DRIVER DETAILS ----------------- */}
      {step === 'details' && (
        <>
          <div className="operator-header">
            <button onClick={() => setStep('vehicle-type')}><ArrowLeft size={20} /></button>
            <span>Vehicle & Driver Details</span>
            <div style={{ width: '20px' }}></div>
          </div>

          <div className="operator-content animate-fade-in">
            {/* Vehicle Type Card */}
            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#f8fafc', padding: '12px' }}>
              <Truck size={20} style={{ color: '#0c5c37' }} />
              <div>
                <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>Vehicle Type</div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{selectedVehicleType}</div>
              </div>
            </div>

            {/* Vehicle Select */}
            <div className="form-group">
              <label className="form-label">Vehicle No.</label>
              <select 
                className="form-select"
                value={vehicleNo}
                onChange={(e) => handleVehicleChange(e.target.value)}
              >
                <option value="">-- Choose Vehicle --</option>
                {matchingVehicles.map(v => (
                  <option key={v.number} value={v.number}>{v.number}</option>
                ))}
                <option value="NEW_VEHICLE">Add New Vehicle...</option>
              </select>
            </div>

            {/* Add Custom Vehicle number inline if "NEW_VEHICLE" is picked */}
            {vehicleNo === 'NEW_VEHICLE' && (
              <div className="form-group animate-fade-in">
                <label className="form-label">Enter New Vehicle Number</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="e.g. AP28 TA 9999"
                  onChange={(e) => {
                    // Let them type it in, custom driver logic
                    setIsRegularDriver(false);
                  }}
                  onBlur={async (e) => {
                    const num = e.target.value.trim().toUpperCase();
                    if (num) {
                      // Temp add to list
                      const newVeh = { type: selectedVehicleType, number: num, regularDriver: 'LOKESH' };
                      await db.addVehicle(newVeh);
                      const list = await db.getVehicles();
                      setVehicles(list);
                      setVehicleNo(num);
                      setSelectedDriver('LOKESH');
                    }
                  }}
                />
              </div>
            )}

            {vehicleNo && vehicleNo !== 'NEW_VEHICLE' && (
              <>
                <div className="form-group">
                  <label className="form-label">Regular Driver</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px', backgroundColor: '#ffffff' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#eaf6ee', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center' }}>
                      <User size={16} style={{ color: '#0c5c37' }} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1e293b' }}>{selectedDriver || 'N/A'}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Assigned Driver</div>
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Is regular driver present today?</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '10px', 
                      padding: '10px 12px', 
                      border: '1px solid #e2e8f0', 
                      borderRadius: '8px', 
                      cursor: 'pointer',
                      backgroundColor: isRegularDriver ? '#eaf6ee' : '#ffffff',
                      borderColor: isRegularDriver ? '#0c5c37' : '#e2e8f0'
                    }}>
                      <input 
                        type="radio" 
                        name="driverPresence" 
                        checked={isRegularDriver} 
                        onChange={() => {
                          setIsRegularDriver(true);
                          // Reset driver to regular assigned
                          const matched = vehicles.find(v => v.number === vehicleNo);
                          if (matched) setSelectedDriver(matched.regularDriver);
                        }}
                        style={{ accentColor: '#0c5c37' }}
                      />
                      <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Yes, Regular Driver Present</span>
                    </label>

                    <label style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '10px', 
                      padding: '10px 12px', 
                      border: '1px solid #e2e8f0', 
                      borderRadius: '8px', 
                      cursor: 'pointer',
                      backgroundColor: !isRegularDriver ? '#eaf6ee' : '#ffffff',
                      borderColor: !isRegularDriver ? '#0c5c37' : '#e2e8f0'
                    }}>
                      <input 
                        type="radio" 
                        name="driverPresence" 
                        checked={!isRegularDriver} 
                        onChange={() => {
                          setIsRegularDriver(false);
                          setSelectedDriver('');
                        }}
                        style={{ accentColor: '#0c5c37' }}
                      />
                      <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>No, Different Driver</span>
                    </label>
                  </div>
                </div>

                {!isRegularDriver && (
                  <div className="form-group animate-fade-in">
                    <label className="form-label">Driver Name</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="Enter Driver Name"
                      value={selectedDriver}
                      onChange={(e) => setSelectedDriver(e.target.value)}
                    />
                  </div>
                )}
              </>
            )}

            <button 
              className="btn-primary" 
              style={{ marginTop: 'auto', padding: '14px' }}
              disabled={!vehicleNo || !selectedDriver}
              onClick={() => setStep('entry')}
            >
              CONTINUE
            </button>
          </div>
        </>
      )}

      {/* ----------------- SCREEN 6: MATERIAL ENTRY ----------------- */}
      {step === 'entry' && (
        <>
          <div className="operator-header">
            <button onClick={() => setStep('details')}><ArrowLeft size={20} /></button>
            <span>Material Entry</span>
            <div style={{ width: '20px' }}></div>
          </div>

          <div className="operator-content animate-fade-in">
            <div style={{ fontSize: '0.75rem', color: '#64748b', textAlign: 'center', background: '#f8fafc', padding: '6px', borderRadius: '4px', fontWeight: 600 }}>
              Rates fixed by Admin
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { key: 'plastic', label: 'Plastic', emoji: '♻️' },
                { key: 'cardboard', label: 'Cardboard', emoji: '📦' },
                { key: 'glass', label: 'Glass', emoji: '🍾' }
              ].map(item => {
                const rate = currentRates[item.key] || 0;
                const amt = getMaterialAmount(item.key, weights[item.key]);
                return (
                  <div key={item.key} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>{item.emoji}</span>
                        <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{item.label}</span>
                      </div>
                      <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Rate: ₹{rate}/Kg</span>
                    </div>

                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <div style={{ flex: 1, position: 'relative' }}>
                        <input 
                          type="number" 
                          step="0.01"
                          className="form-input" 
                          style={{ paddingRight: '38px', textAlign: 'right', fontWeight: 700 }}
                          placeholder="0.00"
                          value={weights[item.key]}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === '' || parseFloat(val) >= 0) {
                              setWeights(prev => ({ ...prev, [item.key]: val }));
                            }
                          }}
                        />
                        <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>Kg</span>
                      </div>
                      <div style={{ minWidth: '80px', textAlign: 'right' }}>
                        <div style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Amount</div>
                        <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0c5c37' }}>₹{amt.toFixed(2)}</div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Dynamic Others Material Entries */}
              {othersEntries.map((entry, index) => {
                const rate = currentRates[entry.subtype] || 0;
                const amt = getMaterialAmount('others', entry.weight, entry.subtype);
                return (
                  <div key={entry.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '12px', borderLeft: '4px solid #3b82f6' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                        <span>🔬</span>
                        <select
                          value={entry.subtype}
                          onChange={(e) => {
                            const newSubtype = e.target.value;
                            setOthersEntries(prev => prev.map(item => item.id === entry.id ? { ...item, subtype: newSubtype } : item));
                          }}
                          style={{
                            fontWeight: 700,
                            fontSize: '0.95rem',
                            border: '1px solid #cbd5e1',
                            borderRadius: '6px',
                            padding: '4px 28px 4px 10px',
                            backgroundColor: '#ffffff',
                            color: '#1e293b',
                            cursor: 'pointer',
                            backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23475569' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'right 8px center',
                            backgroundSize: '16px',
                            appearance: 'none',
                            outline: 'none',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                            flex: 1,
                            maxWidth: '160px'
                          }}
                        >
                          <option value="others">Others</option>
                          <option value="others_iron">Iron</option>
                          <option value="others_babybox">Baby Box</option>
                          <option value="others_blackplastic">Black Plastic</option>
                        </select>
                        {index > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              setOthersEntries(prev => prev.filter(item => item.id !== entry.id));
                            }}
                            style={{
                              backgroundColor: 'transparent',
                              border: 'none',
                              color: '#ef4444',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              padding: '4px'
                            }}
                            title="Remove entry"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                      <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Rate: ₹{rate}/Kg</span>
                    </div>

                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <div style={{ flex: 1, position: 'relative' }}>
                        <input 
                          type="number" 
                          step="0.01"
                          className="form-input" 
                          style={{ paddingRight: '38px', textAlign: 'right', fontWeight: 700 }}
                          placeholder="0.00"
                          value={entry.weight}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === '' || parseFloat(val) >= 0) {
                              setOthersEntries(prev => prev.map(item => item.id === entry.id ? { ...item, weight: val } : item));
                            }
                          }}
                        />
                        <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>Kg</span>
                      </div>
                      <div style={{ minWidth: '80px', textAlign: 'right' }}>
                        <div style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Amount</div>
                        <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0c5c37' }}>₹{amt.toFixed(2)}</div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Add Other Material Button */}
              {othersEntries.length < 3 && (
                <button
                  type="button"
                  onClick={() => {
                    setOthersEntries(prev => [...prev, { id: Date.now(), subtype: 'others', weight: '' }]);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '10px',
                    backgroundColor: '#eff6ff',
                    color: '#2563eb',
                    border: '1.5px dashed #2563eb',
                    borderRadius: '10px',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    width: '100%',
                    transition: 'all 0.2s',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                  }}
                >
                  <Plus size={16} /> Add Other Material
                </button>
              )}
            </div>

            {/* Totals Summary */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: '10px', marginTop: '10px' }}>
              <div className="card" style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: '2px', background: '#f8fafc' }}>
                <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Total Weight</span>
                <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>{totalInputWeight.toFixed(2)} Kg</span>
              </div>
              <div className="card" style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: '2px', background: '#0c5c37', color: '#ffffff' }}>
                <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.7)', fontWeight: 600, textTransform: 'uppercase' }}>Grand Total</span>
                <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ffffff' }}>₹{grandInputTotal.toFixed(2)}</span>
              </div>
            </div>

            <button 
              className="btn-primary" 
              style={{ marginTop: 'auto', padding: '14px' }}
              disabled={totalInputWeight <= 0}
              onClick={() => setStep('review')}
            >
              REVIEW
            </button>
          </div>
        </>
      )}

      {/* ----------------- SCREEN 7: REVIEW & CONFIRM ----------------- */}
      {step === 'review' && (
        <>
          <div className="operator-header">
            <button onClick={() => setStep('entry')}><ArrowLeft size={20} /></button>
            <span>Review & Confirm</span>
            <div style={{ width: '20px' }}></div>
          </div>

          <div className="operator-content animate-fade-in" style={{ gap: '12px' }}>
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '8px', backgroundColor: '#ffffff' }}>
              <h4 style={{ fontSize: '0.85rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Review Details</h4>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.85rem' }}>
                <div>
                  <div style={{ color: '#64748b', fontSize: '0.75rem' }}>Division</div>
                  <div style={{ fontWeight: 700, color: '#1e293b' }}>{selectedDivision} - {activeDivData?.name}</div>
                </div>
                <div>
                  <div style={{ color: '#64748b', fontSize: '0.75rem' }}>Vehicle Type</div>
                  <div style={{ fontWeight: 700, color: '#1e293b' }}>{selectedVehicleType}</div>
                </div>
                <div>
                  <div style={{ color: '#64748b', fontSize: '0.75rem' }}>Vehicle No.</div>
                  <div style={{ fontWeight: 700, color: '#1e293b' }}>{vehicleNo}</div>
                </div>
                <div>
                  <div style={{ color: '#64748b', fontSize: '0.75rem' }}>Driver</div>
                  <div style={{ fontWeight: 700, color: '#1e293b' }}>{selectedDriver}</div>
                </div>
              </div>
            </div>

            {/* Weights summary table */}
            <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#64748b' }}>Item</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, color: '#64748b' }}>Weight (Kg)</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, color: '#64748b' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { key: 'plastic', label: 'Plastic' },
                    { key: 'cardboard', label: 'Cardboard' },
                    { key: 'glass', label: 'Glass' }
                  ].map(item => {
                    const wt = parseFloat(weights[item.key]) || 0;
                    if (wt <= 0) return null;
                    return (
                      <tr key={item.key} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px 12px', fontWeight: 600 }}>{item.label}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', color: '#475569' }}>{wt.toFixed(2)}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#0c5c37' }}>₹{getMaterialAmount(item.key, wt).toFixed(2)}</td>
                      </tr>
                    );
                  })}
                  {othersEntries.map((entry, idx) => {
                    const wt = parseFloat(entry.weight) || 0;
                    if (wt <= 0) return null;
                    const labelMap = {
                      others: 'Others',
                      others_iron: 'Others (Iron)',
                      others_babybox: 'Others (Baby Box)',
                      others_blackplastic: 'Others (Black Plastic)'
                    };
                    const displayLabel = labelMap[entry.subtype] || 'Others';
                    return (
                      <tr key={`other-${idx}`} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px 12px', fontWeight: 600 }}>{displayLabel}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', color: '#475569' }}>{wt.toFixed(2)}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#0c5c37' }}>₹{getMaterialAmount('others', wt, entry.subtype).toFixed(2)}</td>
                      </tr>
                    );
                  })}
                  <tr style={{ background: '#f8fafc', fontWeight: 700 }}>
                    <td style={{ padding: '12px' }}>Total Weight</td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>{totalInputWeight.toFixed(2)} Kg</td>
                    <td style={{ padding: '12px', textAlign: 'right', color: '#0c5c37', fontSize: '1rem' }}></td>
                  </tr>
                  <tr style={{ background: '#eaf6ee', fontWeight: 800 }}>
                    <td style={{ padding: '12px', color: '#0c5c37' }}>Total Amount</td>
                    <td style={{ padding: '12px' }}></td>
                    <td style={{ padding: '12px', textAlign: 'right', color: '#0c5c37', fontSize: '1.05rem' }}>₹{grandInputTotal.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="card animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '12px', backgroundColor: '#ffffff', marginTop: '4px' }}>
              <h4 style={{ fontSize: '0.85rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0' }}>Payment Details</h4>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Today's Bill:</span>
                  <span style={{ fontWeight: 700 }}>₹{grandInputTotal.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: driverPrevBalance >= 0 ? '#ef4444' : '#10b981' }}>
                  <span>Previous Balance:</span>
                  <span style={{ fontWeight: 700 }}>{driverPrevBalance >= 0 ? '+' : ''}₹{driverPrevBalance.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '0.9rem', color: '#1e293b', paddingTop: '4px' }}>
                  <span>Net Payable:</span>
                  <span>₹{(grandInputTotal + driverPrevBalance).toFixed(2)}</span>
                </div>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '6px' }}>Amount Paid (₹)</label>
                <input 
                  type="number" 
                  className="form-input" 
                  placeholder="e.g. 150"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                  style={{ fontSize: '0.95rem', padding: '10px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '4px', borderTop: '1px dashed #e2e8f0' }}>
                <span style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 600 }}>New Outstanding Balance</span>
                <span style={{ fontSize: '1.1rem', fontWeight: 800, color: ((grandInputTotal + driverPrevBalance) - (parseFloat(amountPaid) || 0)) > 0 ? '#ef4444' : '#0c5c37' }}>
                  {((grandInputTotal + driverPrevBalance) - (parseFloat(amountPaid) || 0)) < 0 ? '-' : ''}₹{Math.abs(Math.round(((grandInputTotal + driverPrevBalance) - (parseFloat(amountPaid) || 0)) * 100) / 100).toFixed(2)}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: 'auto' }}>
              <button 
                className="btn-secondary" 
                style={{ flex: 1, padding: '14px' }}
                onClick={() => setStep('entry')}
              >
                EDIT
              </button>
              <button 
                className="btn-primary" 
                style={{ flex: 2, padding: '14px' }}
                onClick={handleConfirmAndSave}
              >
                CONFIRM & SAVE
              </button>
            </div>
          </div>
        </>
      )}

      {/* ----------------- SCREEN 8: SUCCESS ----------------- */}
      {step === 'success' && latestReceipt && (
        <>
          <div className="operator-header" style={{ justifyContent: 'center' }}>
            <span>Success</span>
          </div>

          <div className="operator-content animate-fade-in" style={{ alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '24px' }}>
            
            {/* Animated Check icon */}
            <div style={{ 
              width: '72px', 
              height: '72px', 
              borderRadius: '50%', 
              backgroundColor: '#ecfdf5', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              margin: '0 auto 16px auto',
              border: '2px solid #10b981',
              color: '#10b981'
            }}>
              <CheckCircle2 size={40} />
            </div>

            <h2 style={{ color: '#0c5c37', fontWeight: 800, fontSize: '1.4rem', marginBottom: '4px' }}>Entry Saved Successfully!</h2>
            <p style={{ color: '#64748b', fontSize: '0.8rem', marginBottom: '20px' }}>Receipt Generated</p>

            {/* Receipt Summary Card */}
            <div className="card" style={{ width: '100%', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem', borderStyle: 'dashed', borderWidth: '1.5px', background: '#fcfdfd' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>
                <span style={{ color: '#64748b' }}>Receipt No.</span>
                <span style={{ fontWeight: 700, color: '#1e293b' }}>{latestReceipt.receiptNo}</span>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Date & Time</span>
                <span style={{ fontWeight: 600, color: '#1e293b' }}>
                  {new Date(latestReceipt.dateTime).toLocaleString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                  })}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Division</span>
                <span style={{ fontWeight: 600, color: '#1e293b' }}>{latestReceipt.division} - {latestReceipt.divisionName}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Vehicle</span>
                <span style={{ fontWeight: 600, color: '#1e293b' }}>{latestReceipt.vehicleType} - {latestReceipt.vehicleNo}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Driver</span>
                <span style={{ fontWeight: 600, color: '#1e293b' }}>{latestReceipt.driver}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dotted #e2e8f0', paddingTop: '8px', fontSize: '1rem', fontWeight: 800 }}>
                <span style={{ color: '#0c5c37' }}>Total Amount</span>
                <span style={{ color: '#0c5c37' }}>₹{latestReceipt.totalAmount.toFixed(2)}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', fontWeight: 600 }}>
                <span style={{ color: '#475569' }}>Amount Paid</span>
                <span style={{ color: '#0c5c37' }}>₹{(latestReceipt.amountPaid || 0).toFixed(2)}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', fontWeight: 700 }}>
                <span style={{ color: '#475569' }}>Balance Amount</span>
                <span style={{ color: (latestReceipt.balanceAmount || 0) > 0 ? '#ef4444' : '#0c5c37' }}>
                  ₹{(latestReceipt.balanceAmount || 0).toFixed(2)}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', marginTop: '30px' }}>
              <button 
                className="btn-primary" 
                style={{ padding: '12px' }}
                onClick={() => {
                  resetNewEntryForm();
                  setStep('division');
                }}
              >
                <Plus size={16} />
                NEW ENTRY
              </button>
              
              <button 
                className="btn-secondary" 
                style={{ padding: '11px', borderWidth: '1px' }}
                onClick={() => setStep('dashboard')}
              >
                BACK TO DASHBOARD
              </button>
            </div>
          </div>
        </>
      )}

      {/* ----------------- RECORDS & SEARCH HISTORY VIEW ----------------- */}
      {step === 'records' && (
        <>
          <div className="operator-header">
            <button onClick={() => setStep('dashboard')}><ArrowLeft size={20} /></button>
            <span>RECORDS</span>
            <div style={{ width: '20px' }}></div>
          </div>

          <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', background: '#ffffff' }}>
            <button 
              style={{ 
                flex: 1, 
                padding: '12px 6px', 
                border: 'none', 
                background: 'transparent',
                fontWeight: 600,
                fontSize: '0.85rem',
                color: recordsTab === 'today' ? '#0c5c37' : '#64748b',
                borderBottom: recordsTab === 'today' ? '3px solid #0c5c37' : 'none',
                cursor: 'pointer'
              }}
              onClick={() => setRecordsTab('today')}
            >
              Today's Records
            </button>
            <button 
              style={{ 
                flex: 1, 
                padding: '12px 6px', 
                border: 'none', 
                background: 'transparent',
                fontWeight: 600,
                fontSize: '0.85rem',
                color: recordsTab === 'history' ? '#0c5c37' : '#64748b',
                borderBottom: recordsTab === 'history' ? '3px solid #0c5c37' : 'none',
                cursor: 'pointer'
              }}
              onClick={() => setRecordsTab('history')}
            >
              History (Search)
            </button>
          </div>

          <div className="operator-content animate-fade-in" style={{ paddingBottom: '20px', overflowY: 'auto' }}>
            {recordsTab === 'history' && (
              <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', background: '#ffffff', marginBottom: '8px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.65rem' }}>Select Date</label>
                    <input 
                      type="date" 
                      className="form-input" 
                      style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                      value={searchDate}
                      onChange={(e) => setSearchDate(e.target.value)}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.65rem' }}>Division</label>
                    <select 
                      className="form-select" 
                      style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                      value={searchDivision}
                      onChange={(e) => setSearchDivision(e.target.value)}
                    >
                      <option value="All">All</option>
                      {divisions.map(d => (
                        <option key={d.id} value={d.id}>Division {d.id}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.65rem' }}>Vehicle Type</label>
                    <select 
                      className="form-select" 
                      style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                      value={searchVehicleType}
                      onChange={(e) => setSearchVehicleType(e.target.value)}
                    >
                      <option value="All">All</option>
                      <option value="AUTO">AUTO</option>
                      <option value="TRACTOR">TRACTOR</option>
                      <option value="PRIVATE AUTO">PRIVATE AUTO</option>
                    </select>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.65rem' }}>Driver</label>
                    <select 
                      className="form-select" 
                      style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                      value={searchDriver}
                      onChange={(e) => setSearchDriver(e.target.value)}
                    >
                      <option value="All">All</option>
                      {drivers.map(d => (
                        <option key={d.name} value={d.name}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <button 
                  className="btn-primary" 
                  style={{ padding: '8px', fontSize: '0.8rem', marginTop: '4px' }}
                  onClick={handleSearch}
                >
                  <Search size={14} />
                  SEARCH
                </button>
              </div>
            )}

            {/* Records List / Grid */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {(recordsTab === 'today' ? todayRecords : filteredRecords).length === 0 ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
                  No records found.
                </div>
              ) : (
                (recordsTab === 'today' ? todayRecords : filteredRecords).map((rec) => (
                  <div key={rec.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '12px', fontSize: '0.8rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '4px' }}>
                      <span style={{ fontWeight: 700, color: '#334155' }}>{rec.receiptNo}</span>
                      <span className="status-badge completed">Completed</span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '4px' }}>
                      <div>
                        <span style={{ color: '#64748b' }}>Time: </span>
                        <strong>{new Date(rec.dateTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}</strong>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ color: '#64748b' }}>Div: </span>
                        <strong>{rec.division}</strong>
                      </div>
                      <div>
                        <span style={{ color: '#64748b' }}>Driver: </span>
                        <strong>{rec.driver}</strong>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ color: '#64748b' }}>Veh: </span>
                        <strong>{rec.vehicleType}</strong>
                      </div>
                    </div>

                    <div style={{ 
                      background: '#f8fafc', 
                      padding: '6px', 
                      borderRadius: '6px', 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      fontSize: '0.75rem',
                      color: '#475569',
                      marginTop: '4px'
                    }}>
                      <span>P: {rec.plastic}kg</span>
                      <span>C: {rec.cardboard}kg</span>
                      <span>G: {rec.glass}kg</span>
                      <span>O: {rec.others}kg</span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px', fontWeight: 700 }}>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Total Wt: {rec.totalWeight} Kg</span>
                      <span style={{ color: '#0c5c37', fontSize: '0.9rem' }}>₹{rec.totalAmount.toFixed(2)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px 12px', background: '#f1f5f9', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.75rem', color: '#64748b', textAlign: 'center', marginTop: '12px' }}>
              <div>ℹ️ Operators can view records of any date. Download is disabled for operator role.</div>
              <div style={{ fontWeight: 600 }}>🔒 Only Admin can download / export any report.</div>
            </div>
          </div>
        </>
      )}

    </div>
  );
}
