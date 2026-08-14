import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Search, Plus, Calendar, ChevronRight, User, Phone, 
  MapPin, CheckCircle2, Lock, CreditCard, Send, Share2, Printer, 
  Download, Eye, AlertCircle, FileText, Check, DollarSign, Building2, Bell, Menu, LogOut
} from 'lucide-react';
import { db } from '../db/localStorageDB';
import { sendWhatsAppReceipt, sendWhatsAppDemandNotice, getBillingPeriod, generateBillingPeriodOptions } from '../utils/whatsapp';

export default function EstablishmentsPanel({ onBackToHome }) {
  // Mobile Screen state (1 to 7)
  const [screen, setScreen] = useState(1);
  
  // Active Route selection (Routes 1 to 7)
  const [activeRouteId, setActiveRouteId] = useState(1);
  
  // All establishments in the active route
  const [establishments, setEstablishments] = useState([]);
  
  // Selected establishment for verification / collection
  const [selectedEstablishment, setSelectedEstablishment] = useState(null);
  
  // Payment history for the selected establishment
  const [paymentHistory, setPaymentHistory] = useState([]);
  
  // Today's payments list (for dashboard reporting)
  const [todayPayments, setTodayPayments] = useState([]);
  
  // Latest generated receipt
  const [latestReceipt, setLatestReceipt] = useState(null);
  
  // Form and Data State
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentMode, setPaymentMode] = useState('Cash'); // 'Cash', 'UPI', 'Other'
  const [amountReceived, setAmountReceived] = useState('0');
  const [remarks, setRemarks] = useState('');
  const [selectedBillingPeriod, setSelectedBillingPeriod] = useState(getBillingPeriod().periodStr);
  const [customBillingPeriod, setCustomBillingPeriod] = useState('');
  const [isCustomPeriod, setIsCustomPeriod] = useState(false);

  // Revisit scheduling states
  const [showRevisitForm, setShowRevisitForm] = useState(false);
  const [revisitDateInput, setRevisitDateInput] = useState('');
  const [todayRevisits, setTodayRevisits] = useState([]);

  const fetchTodayRevisits = async () => {
    try {
      const allEsts = await db.getEstablishments(null);
      const todayStr = new Date().toLocaleDateString('en-CA');
      const revisits = allEsts.filter(e => e.revisitDate === todayStr);
      setTodayRevisits(revisits);
    } catch (err) {
      console.error("Error fetching today's revisits: ", err);
    }
  };

  // Additional UI states
  const [historyTab, setHistoryTab] = useState('history'); // 'history' or 'ledger'
  const [allPayments, setAllPayments] = useState([]); // All receipts for screen 8
  const [receiptSearchQuery, setReceiptSearchQuery] = useState(''); // Search query for screen 8
  const [showMenuDrawer, setShowMenuDrawer] = useState(false); // Drawer visibility
  const [isEditingEst, setIsEditingEst] = useState(false); // Flag for edit vs add
  const [previousScreen, setPreviousScreen] = useState(1); // Tracker for back transitions
  const [estForm, setEstForm] = useState({
    name: '',
    proprietor: '',
    phone: '',
    monthlyFee: '500',
    penalty: '0',
    previousBalance: '0',
    routeId: 1
  });
  
  // Fixed details for the logged-in Executive
  const vehicle = 'AP 28 TA 1234';
  const executiveName = 'Srinivas';
  const executiveId = 'CE-0187';

  const routesList = [
    { id: 1, name: 'GANDHICHOWK' },
    { id: 2, name: 'GATTAIAH CENTER' },
    { id: 3, name: 'IT HUB TO SRI SRI CIRCLE' },
    { id: 4, name: 'KAMAN BAZAR' },
    { id: 5, name: 'KHANAPURAM' },
    { id: 6, name: 'MUSTAFANAGAR' },
    { id: 7, name: 'WYRA ROAD' }
  ];

  const activeRouteName = routesList.find(r => r.id === activeRouteId)?.name || 'GANDHICHOWK';

  const fetchEstablishments = async () => {
    try {
      const list = await db.getEstablishments(activeRouteId, searchQuery);
      setEstablishments(list);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchTodayPayments = async () => {
    try {
      const allPayments = await db.getEstablishmentPaymentsAll();
      const todayStr = new Date().toISOString().split('T')[0];
      const todayList = allPayments.filter(p => p.dateTime && p.dateTime.startsWith(todayStr));
      setTodayPayments(todayList);
    } catch (err) {
      console.error(err);
    }
  };

  // Re-fetch when route changes or search query changes
  useEffect(() => {
    fetchEstablishments();
    fetchTodayRevisits();
  }, [activeRouteId, searchQuery]);

  const fetchAllPayments = async () => {
    try {
      const list = await db.getEstablishmentPaymentsAll();
      setAllPayments(list);
    } catch (err) {
      console.error(err);
    }
  };

  // Re-fetch payments when screen is loaded/changed
  useEffect(() => {
    if (screen === 1) {
      fetchEstablishments();
      fetchTodayPayments();
      fetchTodayRevisits();
    } else if (screen === 8) {
      fetchAllPayments();
    }
  }, [screen]);
  // Load payment history when establishment is selected
  useEffect(() => {
    if (selectedEstablishment) {
      const fetchHistory = async () => {
        const history = await db.getEstablishmentPayments(selectedEstablishment.id);
        setPaymentHistory(history);
      };
      fetchHistory();
    }
  }, [selectedEstablishment]);

  // Handle custom billing period pre-population
  useEffect(() => {
    if (selectedEstablishment) {
      const opts = generateBillingPeriodOptions();
      const matchedOpt = opts.find(o => o.periodStr === selectedBillingPeriod);
      const monthName = matchedOpt ? matchedOpt.monthName : '';
      
      if (selectedEstablishment.previousBalance > 0) {
        setCustomBillingPeriod(`${monthName} & Arrears`);
        setIsCustomPeriod(true);
      } else {
        setCustomBillingPeriod(monthName || selectedBillingPeriod);
        setIsCustomPeriod(false);
      }
    }
  }, [selectedBillingPeriod, selectedEstablishment]);

  const handleGenerateReceipt = async () => {
    if (!selectedEstablishment) return;
    
    try {
      const payment = {
        establishmentId: selectedEstablishment.id,
        establishmentName: selectedEstablishment.name,
        amountPaid: parseFloat(amountReceived) || 0,
        paymentMode: paymentMode,
        remarks: remarks,
        collectorName: executiveName,
        collectorId: executiveId,
        billingPeriod: isCustomPeriod ? customBillingPeriod : selectedBillingPeriod
      };
      
      const saved = await db.addEstablishmentPayment(payment);
      setLatestReceipt(saved);
      // Update selectedestablishment outstanding details
      setSelectedEstablishment(prev => {
        const activePaid = prev.activePeriodPaid || 0;
        const currentMonthDue = Math.max(0, prev.monthlyFee - activePaid);
        const toCurrentMonth = Math.min(payment.amountPaid, currentMonthDue);
        const toArrears = Math.max(0, payment.amountPaid - toCurrentMonth);
        return {
          ...prev,
          activePeriodPaid: activePaid + toCurrentMonth,
          previousBalance: Math.max(0, prev.previousBalance - toArrears)
        };
      });
      
      setScreen(5);
    } catch (err) {
      alert("Error recording payment: " + err.message);
    }
  };

  const handleNextEstablishment = () => {
    // Reset inputs and go back to screen 1
    setRemarks('');
    setPaymentMode('Cash');
    setAmountReceived('0');
    setSelectedEstablishment(null);
    setLatestReceipt(null);
    setScreen(1);
  };

  // Calculate dynamic dashboard stats
  const todayReceiptsCount = todayPayments.length;
  const todayAmountCollected = todayPayments.reduce((sum, p) => sum + (parseFloat(p.amountPaid) || 0), 0);
  const pendingCollectionsCount = establishments.filter(e => (Math.max(0, e.monthlyFee - (e.activePeriodPaid || 0)) + e.penalty + e.previousBalance) > 0).length;

  return (
    <div style={{ 
      width: '100%', 
      height: '100%', 
      minHeight: '100vh', 
      backgroundColor: '#f1f5f9', 
      display: 'flex', 
      flexDirection: 'column',
      fontFamily: 'var(--font-body)'
    }}>
      
      {/* ------------------ ACTIVE SCREEN RENDERER ------------------ */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#f8fafc', position: 'relative' }}>
        
        {/* SCREEN 1: Home Dashboard */}
        {screen === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }} className="animate-fade-in">
            {/* Header */}
            <div style={{ backgroundColor: '#0c5c37', color: '#ffffff', padding: '16px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M2 22C2 22 6 18 10 14C12 12 15 12 18 9C21 6 22 2 22 2C22 2 18 3 15 6C12 9 12 12 10 14C6 18 2 22 2 22Z" fill="#ffffff"/>
                  <path d="M10 14C10 14 7 11 5 11C3 11 2 13 2 13C2 13 4 14 6 15C8 16 10 14 10 14Z" fill="#34d399"/>
                </svg>
                <span style={{ fontWeight: 800, fontSize: '1rem', letterSpacing: '1px' }}>RVS Establishments</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <Bell size={18} />
                <button onClick={onBackToHome} style={{ background: 'transparent', border: 'none', color: '#ffffff', cursor: 'pointer', display: 'flex', alignItems: 'center' }} title="Change Service">
                  <Menu size={18} />
                </button>
              </div>
            </div>

            {/* Profile Info */}
            <div style={{ backgroundColor: '#ffffff', padding: '16px', borderBottom: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#eaf6ee', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0c5c37' }}>
                  <User size={24} />
                </div>
                <div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Good Morning,</div>
                  <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a' }}>{executiveName}</div>
                  <div style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 600 }}>Collection Executive</div>
                </div>
              </div>

              {/* Dynamic Route and Vehicle Selector */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                <div style={{ flex: 1, backgroundColor: '#f1f5f9', borderRadius: '8px', padding: '4px 12px', display: 'flex', flexDirection: 'column', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 600 }}>Active Route</span>
                  <select 
                    value={activeRouteId}
                    onChange={(e) => setActiveRouteId(parseInt(e.target.value))}
                    style={{ 
                      border: 'none', 
                      background: 'transparent', 
                      fontSize: '0.75rem', 
                      fontWeight: 700, 
                      color: '#0c5c37', 
                      padding: '4px 0', 
                      outline: 'none',
                      width: '100%',
                      cursor: 'pointer'
                    }}
                  >
                    {routesList.map(r => (
                      <option key={r.id} value={r.id}>Route {r.id}: {r.name}</option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: 1, backgroundColor: '#f1f5f9', borderRadius: '8px', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>Vehicle</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0f172a' }}>{vehicle}</span>
                </div>
              </div>
            </div>

            {/* Dashboard Content */}
            <div style={{ flex: 1, padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
              
              {/* Today's Revisit Notification Banner */}
              {todayRevisits.length > 0 && (
                <div style={{
                  backgroundColor: '#fff7ed',
                  border: '1.5px solid #ffedd5',
                  borderRadius: '12px',
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  boxShadow: '0 4px 6px -1px rgba(234, 88, 12, 0.05)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                      backgroundColor: '#ea580c',
                      color: '#ffffff',
                      borderRadius: '50%',
                      width: '24px',
                      height: '24px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Bell size={14} />
                    </div>
                    <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#9a3412' }}>
                      Today's Revisit Notifications ({todayRevisits.length})
                    </span>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {todayRevisits.map(est => (
                      <div 
                        key={est.id} 
                        onClick={() => {
                          setSelectedEstablishment(est);
                          setScreen(3);
                        }}
                        style={{
                          backgroundColor: '#ffffff',
                          borderRadius: '8px',
                          padding: '8px 12px',
                          border: '1px solid #fed7aa',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1e293b' }}>{est.name}</span>
                          <span style={{ fontSize: '0.65rem', color: '#64748b' }}>Route: {est.routeName} | Balance: ₹{est.previousBalance}</span>
                        </div>
                        <ChevronRight size={16} style={{ color: '#ea580c' }} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Search Bar Trigger */}
              <div 
                onClick={() => setScreen(2)}
                style={{ 
                  backgroundColor: '#ffffff', 
                  borderRadius: '12px', 
                  border: '1px solid #cbd5e1', 
                  padding: '12px 14px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '10px',
                  cursor: 'pointer',
                  color: '#94a3b8',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                }}
              >
                <Search size={18} style={{ color: '#64748b' }} />
                <span style={{ fontSize: '0.85rem', flex: 1 }}>Search Establishment (Name / Mobile / ID)</span>
              </div>

              {/* Actions Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                <div onClick={() => setScreen(2)} style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '12px 8px', border: '1px solid #e2e8f0', textAlign: 'center', cursor: 'pointer' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#eff6ff', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 6px' }}>
                    <Search size={18} />
                  </div>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#475569' }}>Search Est.</span>
                </div>
                <div onClick={() => {
                  setIsEditingEst(false);
                  setEstForm({
                    name: '',
                    proprietor: '',
                    phone: '',
                    monthlyFee: '500',
                    penalty: '0',
                    previousBalance: '0',
                    routeId: activeRouteId
                  });
                  setScreen(9);
                }} style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '12px 8px', border: '1px solid #e2e8f0', textAlign: 'center', cursor: 'pointer' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#ecfdf5', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 6px' }}>
                    <Plus size={18} />
                  </div>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#475569' }}>Add New</span>
                </div>
                <div onClick={() => setScreen(8)} style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '12px 8px', border: '1px solid #e2e8f0', textAlign: 'center', cursor: 'pointer' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#fffbeb', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 6px' }}>
                    <FileText size={18} />
                  </div>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#475569' }}>Today's Coll.</span>
                </div>
              </div>
 
              {/* Today's Summary */}
              <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '16px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f172a' }}>Today's Summary</span>
                  <span style={{ fontSize: '0.7rem', color: '#3b82f6', fontWeight: 700, cursor: 'pointer' }} onClick={() => setScreen(8)}>View All</span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <div style={{ flex: 1, backgroundColor: '#f8fafc', borderRadius: '8px', padding: '10px', textAlign: 'center', border: '1px solid #f1f5f9' }}>
                    <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 600 }}>Receipts</div>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>{todayReceiptsCount}</div>
                  </div>
                  <div style={{ flex: 1, backgroundColor: '#f8fafc', borderRadius: '8px', padding: '10px', textAlign: 'center', border: '1px solid #f1f5f9' }}>
                    <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 600 }}>Amount</div>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: '#10b981', marginTop: '2px' }}>₹{todayAmountCollected.toLocaleString()}</div>
                  </div>
                  <div style={{ flex: 1, backgroundColor: '#f8fafc', borderRadius: '8px', padding: '10px', textAlign: 'center', border: '1px solid #f1f5f9' }}>
                    <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 600 }}>Pending (Route)</div>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: '#ef4444', marginTop: '2px' }}>{pendingCollectionsCount}</div>
                  </div>
                </div>
              </div>
 
              {/* Recent Summary List */}
              <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '16px', border: '1px solid #e2e8f0', marginBottom: '60px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f172a' }}>Recent Summary</span>
                  <span style={{ fontSize: '0.7rem', color: '#3b82f6', fontWeight: 700, cursor: 'pointer' }} onClick={() => setScreen(8)}>View All</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {todayPayments.length > 0 ? (
                    todayPayments.slice(0, 5).map((item, idx) => (
                      <div 
                        key={idx}
                        onClick={async () => {
                          const ests = await db.getEstablishments(null, item.establishmentId);
                          if (ests && ests.length > 0) {
                            setSelectedEstablishment(ests[0]);
                            setScreen(3);
                          }
                        }}
                        style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center', 
                          padding: '10px 12px', 
                          backgroundColor: '#f8fafc', 
                          borderRadius: '8px', 
                          border: '1px solid #f1f5f9',
                          cursor: 'pointer'
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155' }}>{item.establishmentName}</div>
                          <div style={{ fontSize: '0.65rem', color: '#64748b', marginTop: '2px' }}>₹{item.amountPaid.toLocaleString()} ({item.paymentMode})</div>
                        </div>
                        <span style={{ 
                          fontSize: '0.65rem', 
                          fontWeight: 800, 
                          padding: '2px 8px', 
                          borderRadius: '20px', 
                          backgroundColor: '#d1fae5',
                          color: '#065f46'
                        }}>
                          PAID
                        </span>
                      </div>
                    ))
                  ) : (
                    <div style={{ textAlign: 'center', padding: '16px', color: '#94a3b8', fontSize: '0.75rem' }}>
                      No collections recorded today yet.
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Bottom Tab Bar */}
            <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', backgroundColor: '#ffffff', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-around', padding: '8px 0', zIndex: 10 }}>
              <div style={{ textAlign: 'center', color: '#0c5c37', cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'center' }}><Check size={18} /></div>
                <div style={{ fontSize: '0.6rem', fontWeight: 700, marginTop: '2px' }}>Home</div>
              </div>
              <div onClick={() => setScreen(2)} style={{ textAlign: 'center', color: '#94a3b8', cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'center' }}><Building2 size={18} /></div>
                <div style={{ fontSize: '0.6rem', fontWeight: 600, marginTop: '2px' }}>Establishments</div>
              </div>
              <div onClick={() => setScreen(2)} style={{ transform: 'translateY(-14px)', width: '42px', height: '42px', borderRadius: '50%', backgroundColor: '#0c5c37', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(12, 92, 55, 0.3)', cursor: 'pointer' }}>
                <Plus size={20} />
              </div>
              <div onClick={() => setScreen(8)} style={{ textAlign: 'center', color: '#94a3b8', cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'center' }}><FileText size={18} /></div>
                <div style={{ fontSize: '0.6rem', fontWeight: 600, marginTop: '2px' }}>Receipts</div>
              </div>
              <div onClick={() => setShowMenuDrawer(true)} style={{ textAlign: 'center', color: '#94a3b8', cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'center' }}><Menu size={18} /></div>
                <div style={{ fontSize: '0.6rem', fontWeight: 600, marginTop: '2px' }}>More</div>
              </div>
            </div>
          </div>
        )}

        {/* SCREEN 2: Search Establishment */}
        {screen === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }} className="animate-fade-in">
            {/* Header / Search bar */}
            <div style={{ backgroundColor: '#ffffff', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid #cbd5e1' }}>
              <button onClick={() => setScreen(1)} style={{ background: 'transparent', border: 'none', color: '#475569', cursor: 'pointer' }}>
                <ArrowLeft size={20} />
              </button>
              <div style={{ flex: 1, position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                <input 
                  type="text" 
                  value={searchQuery}
                  placeholder="Search name, phone, or ID..."
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px 8px 32px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
                  autoFocus
                />
              </div>
              <button onClick={() => setSearchQuery('')} style={{ background: 'transparent', border: 'none', color: '#ef4444', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
                Clear
              </button>
            </div>

            {/* Category pills */}
            <div style={{ display: 'flex', gap: '8px', padding: '12px 16px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', overflowX: 'auto' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#0c5c37', backgroundColor: '#eaf6ee', padding: '4px 10px', borderRadius: '15px', border: '1px solid rgba(12,92,55,0.2)', whiteSpace: 'nowrap' }}>
                Route {activeRouteId}: {activeRouteName} ({establishments.length})
              </span>
            </div>

            {/* Search Results */}
            <div style={{ flex: 1, padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {establishments.length > 0 ? (
                establishments.map(est => {
                  const totalDue = Math.max(0, est.monthlyFee - (est.activePeriodPaid || 0)) + est.penalty + est.previousBalance;
                  return (
                    <div 
                      key={est.id}
                      onClick={() => {
                        setSelectedEstablishment(est);
                        setAmountReceived(totalDue.toString());
                        setScreen(3);
                      }}
                      style={{ 
                        backgroundColor: '#ffffff', 
                        borderRadius: '12px', 
                        border: '1px solid #cbd5e1', 
                        padding: '16px', 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        cursor: 'pointer',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0f172a' }}>{est.name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Prop: {est.proprietor || 'N/A'}</div>
                        {est.phone && (
                          <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                            <Phone size={12} style={{ color: '#0c5c37' }} />
                            {est.phone}
                          </div>
                        )}
                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#0c5c37', marginTop: '2px' }}>ID: {est.id}</div>
                      </div>
                      <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                        <div style={{ fontSize: '0.9rem', fontWeight: 800, color: totalDue > 0 ? '#ef4444' : '#10b981' }}>
                          ₹{totalDue.toLocaleString()}
                        </div>
                        <span style={{ 
                          fontSize: '0.6rem', 
                          fontWeight: 700, 
                          padding: '2px 8px', 
                          borderRadius: '4px',
                          backgroundColor: totalDue > 0 ? '#fee2e2' : '#d1fae5',
                          color: totalDue > 0 ? '#ef4444' : '#065f46'
                        }}>
                          {totalDue > 0 ? 'PENDING' : 'PAID'}
                        </span>
                        <ChevronRight size={16} style={{ color: '#94a3b8', marginTop: '4px' }} />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div style={{ textAlign: 'center', padding: '32px', color: '#94a3b8', fontSize: '0.8rem' }}>
                  No establishments match "{searchQuery}" in this route.
                </div>
              )}
            </div>

            {/* Bottom Tip Bar */}
            <div style={{ margin: '16px', padding: '12px', backgroundColor: '#eff6ff', borderRadius: '8px', border: '1px solid #bfdbfe', display: 'flex', gap: '8px' }}>
              <AlertCircle size={16} style={{ color: '#3b82f6', flexShrink: 0, marginTop: '2px' }} />
              <div style={{ fontSize: '0.75rem', color: '#1e3a8a', lineHeight: 1.4 }}>
                <strong>Tip:</strong> You can search by Name, Mobile, ID or Owner Name. Select different routes on the dashboard.
              </div>
            </div>

          </div>
        )}

        {/* SCREEN 3: Establishment Details (Verify) */}
        {screen === 3 && selectedEstablishment && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }} className="animate-fade-in">
            {/* Header */}
            <div style={{ backgroundColor: '#0c5c37', color: '#ffffff', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button onClick={() => setScreen(2)} style={{ background: 'transparent', border: 'none', color: '#ffffff', cursor: 'pointer' }}>
                <ArrowLeft size={20} />
              </button>
              <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>Establishment Details</span>
            </div>

            <div style={{ flex: 1, padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
              
              {/* Profile Card */}
              <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '16px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#eaf6ee', color: '#0c5c37', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                  <Building2 size={24} />
                </div>
                <h3 style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a' }}>{selectedEstablishment.name}</h3>
                <span style={{ 
                  display: 'inline-block', 
                  fontSize: '0.7rem', 
                  backgroundColor: (Math.max(0, selectedEstablishment.monthlyFee - (selectedEstablishment.activePeriodPaid || 0)) + selectedEstablishment.penalty + selectedEstablishment.previousBalance) > 0 ? '#fee2e2' : '#d1fae5', 
                  color: (Math.max(0, selectedEstablishment.monthlyFee - (selectedEstablishment.activePeriodPaid || 0)) + selectedEstablishment.penalty + selectedEstablishment.previousBalance) > 0 ? '#ef4444' : '#065f46', 
                  padding: '2px 8px', 
                  borderRadius: '20px', 
                  fontWeight: 700, 
                  marginTop: '4px' 
                }}>
                  {(Math.max(0, selectedEstablishment.monthlyFee - (selectedEstablishment.activePeriodPaid || 0)) + selectedEstablishment.penalty + selectedEstablishment.previousBalance) > 0 ? 'Payment Pending' : 'Paid'}
                </span>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '6px' }}>ID: {selectedEstablishment.id}</div>
              </div>

              {/* Contact Details Card */}
              <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '16px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f172a' }}>Contact Details</span>
                  <button onClick={() => {
                    setIsEditingEst(true);
                    setEstForm({
                      name: selectedEstablishment.name,
                      proprietor: selectedEstablishment.proprietor || '',
                      phone: selectedEstablishment.phone || '',
                      monthlyFee: String(selectedEstablishment.monthlyFee || '500'),
                      penalty: String(selectedEstablishment.penalty || '0'),
                      previousBalance: String(selectedEstablishment.previousBalance || '0'),
                      routeId: selectedEstablishment.routeId || 1
                    });
                    setScreen(9);
                  }} style={{ border: 'none', background: '#f1f5f9', color: '#0c5c37', padding: '4px 10px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}>Edit</button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div>
                    <span style={{ fontSize: '0.65rem', color: '#64748b', display: 'block' }}>Responsible Person</span>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>{selectedEstablishment.proprietor || 'N/A'}</span>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.65rem', color: '#64748b', display: 'block' }}>Mobile Number</span>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>{selectedEstablishment.phone || 'N/A'}</span>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.65rem', color: '#64748b', display: 'block' }}>Assigned Route</span>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>Route {selectedEstablishment.routeId}: {selectedEstablishment.routeName}</span>
                  </div>
                </div>
              </div>

              {/* Billing Details */}
              <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '16px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f172a', display: 'block', marginBottom: '12px' }}>Billing Details</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ backgroundColor: '#f8fafc', padding: '8px 10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '0.65rem', color: '#64748b', display: 'block', fontWeight: 600 }}>Billing Period</span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0c5c37' }}>
                      {getBillingPeriod().periodStr}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Monthly User Fee</span>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      ₹{selectedEstablishment.monthlyFee.toLocaleString()}
                      <Lock size={12} style={{ color: '#94a3b8' }} />
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Penalty</span>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      ₹{selectedEstablishment.penalty.toLocaleString()}
                      <Lock size={12} style={{ color: '#94a3b8' }} />
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Previous Balance</span>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>₹{selectedEstablishment.previousBalance.toLocaleString()}</span>
                  </div>
                  <hr style={{ border: 'none', borderTop: '1px solid #f1f5f9' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0f172a' }}>Total Payable</span>
                    <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0c5c37' }}>
                      ₹{(Math.max(0, selectedEstablishment.monthlyFee - (selectedEstablishment.activePeriodPaid || 0)) + selectedEstablishment.penalty + selectedEstablishment.previousBalance).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Revisit Scheduling Card */}
              <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '16px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Calendar size={16} style={{ color: '#ea580c' }} />
                    Revisit Schedule
                  </span>
                  {!showRevisitForm && (
                    <button
                      onClick={() => {
                        setShowRevisitForm(true);
                        setRevisitDateInput(selectedEstablishment.revisitDate || '');
                      }}
                      style={{
                        border: 'none',
                        background: '#fff7ed',
                        color: '#ea580c',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        border: '1px solid #ffedd5'
                      }}
                    >
                      {selectedEstablishment.revisitDate ? 'Change Date' : 'Set Date'}
                    </button>
                  )}
                </div>

                {selectedEstablishment.revisitDate && !showRevisitForm && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff7ed', padding: '8px 12px', borderRadius: '8px', border: '1px solid #ffedd5' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#ea580c' }}>
                      Scheduled for: {new Date(selectedEstablishment.revisitDate).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                    </span>
                    <button
                      onClick={async () => {
                        try {
                          const updated = await db.updateEstablishment(selectedEstablishment.id, {
                            ...selectedEstablishment,
                            revisitDate: null
                          });
                          setSelectedEstablishment(updated);
                          fetchTodayRevisits();
                          fetchEstablishments();
                          alert('Revisit schedule cleared!');
                        } catch (err) {
                          alert('Error clearing revisit schedule: ' + err.message);
                        }
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#ef4444',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      Clear
                    </button>
                  </div>
                )}

                {showRevisitForm && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Select Revisit Date</label>
                      <input 
                        type="date"
                        value={revisitDateInput}
                        onChange={(e) => setRevisitDateInput(e.target.value)}
                        style={{
                          padding: '10px 12px',
                          borderRadius: '8px',
                          border: '1px solid #cbd5e1',
                          fontSize: '0.8rem',
                          outline: 'none',
                          backgroundColor: '#ffffff'
                        }}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                      <button
                        onClick={() => setShowRevisitForm(false)}
                        style={{
                          flex: 1,
                          padding: '8px',
                          border: '1px solid #cbd5e1',
                          borderRadius: '8px',
                          backgroundColor: '#ffffff',
                          color: '#475569',
                          fontWeight: 700,
                          fontSize: '0.75rem',
                          cursor: 'pointer'
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={async () => {
                          if (!revisitDateInput) {
                            alert('Please select a date');
                            return;
                          }
                          try {
                            const updated = await db.updateEstablishment(selectedEstablishment.id, {
                              ...selectedEstablishment,
                              revisitDate: revisitDateInput
                            });
                            setSelectedEstablishment(updated);
                            fetchTodayRevisits();
                            fetchEstablishments();
                            setShowRevisitForm(false);
                            alert('Revisit schedule saved successfully!');
                          } catch (err) {
                            alert('Error saving revisit schedule: ' + err.message);
                          }
                        }}
                        style={{
                          flex: 2,
                          padding: '8px',
                          border: 'none',
                          borderRadius: '8px',
                          backgroundColor: '#ea580c',
                          color: '#ffffff',
                          fontWeight: 700,
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                          boxShadow: '0 2px 4px rgba(234, 88, 12, 0.2)'
                        }}
                      >
                        Save Schedule
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Main Actions */}
              {(Math.max(0, selectedEstablishment.monthlyFee - (selectedEstablishment.activePeriodPaid || 0)) + selectedEstablishment.penalty + selectedEstablishment.previousBalance) > 0 && (
                <button 
                  onClick={() => setScreen(4)}
                  style={{ 
                    backgroundColor: '#0c5c37', 
                    color: '#ffffff', 
                    border: 'none', 
                    borderRadius: '12px', 
                    padding: '14px', 
                    fontWeight: 700, 
                    fontSize: '0.95rem', 
                    cursor: 'pointer',
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    gap: '8px',
                    boxShadow: '0 4px 10px rgba(12, 92, 55, 0.2)',
                    marginTop: 'auto'
                  }}
                >
                  <DollarSign size={18} />
                  Collect Payment
                </button>
              )}
              <button 
                onClick={() => setScreen(7)}
                style={{ 
                  backgroundColor: '#ffffff', 
                  color: '#0c5c37', 
                  border: '1.5px solid #0c5c37', 
                  borderRadius: '12px', 
                  padding: '12px', 
                  fontWeight: 700, 
                  fontSize: '0.9rem', 
                  marginTop: (Math.max(0, selectedEstablishment.monthlyFee - (selectedEstablishment.activePeriodPaid || 0)) + selectedEstablishment.penalty + selectedEstablishment.previousBalance) <= 0 ? 'auto' : '0'
                }}
              >
                View Payment History
              </button>

            </div>
          </div>
        )}

        {/* SCREEN 4: Collect Payment */}
        {screen === 4 && selectedEstablishment && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }} className="animate-fade-in">
            {/* Header */}
            <div style={{ backgroundColor: '#0c5c37', color: '#ffffff', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button onClick={() => setScreen(3)} style={{ background: 'transparent', border: 'none', color: '#ffffff', cursor: 'pointer' }}>
                <ArrowLeft size={20} />
              </button>
              <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>Collect Payment</span>
            </div>

            <div style={{ flex: 1, padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
              
              {/* Est ID */}
              <div style={{ backgroundColor: '#f8fafc', borderRadius: '8px', padding: '12px', border: '1px solid #e2e8f0', display: 'flex', gap: '10px', alignItems: 'center' }}>
                <Building2 size={18} style={{ color: '#0c5c37' }} />
                <div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#334155', display: 'block' }}>{selectedEstablishment.name}</span>
                  <span style={{ fontSize: '0.65rem', color: '#64748b' }}>ID: {selectedEstablishment.id}</span>
                </div>
              </div>

              {/* Billing Period Selector */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Choose Billing Period</span>
                <select
                  value={selectedBillingPeriod}
                  onChange={(e) => setSelectedBillingPeriod(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '10px',
                    border: '2px solid #0c5c37',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    outline: 'none',
                    color: '#0c5c37',
                    backgroundColor: '#ecfdf5',
                    cursor: 'pointer'
                  }}
                >
                  {generateBillingPeriodOptions().map((opt, idx) => (
                    <option key={idx} value={opt.periodStr}>
                      🗓️ {opt.periodStr}
                    </option>
                  ))}
                </select>
              </div>

              {/* Custom Billing Period Toggle/Input */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', backgroundColor: '#f8fafc', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700, color: '#334155' }}>
                  <input
                    type="checkbox"
                    checked={isCustomPeriod}
                    onChange={(e) => setIsCustomPeriod(e.target.checked)}
                    style={{ cursor: 'pointer', width: '15px', height: '15px', accentColor: '#0c5c37' }}
                  />
                  Use Custom Billing Period
                </label>
                {isCustomPeriod && (
                  <input
                    type="text"
                    value={customBillingPeriod}
                    onChange={(e) => setCustomBillingPeriod(e.target.value)}
                    placeholder="e.g. July 2026 & Arrears"
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '8px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      outline: 'none',
                      marginTop: '4px'
                    }}
                  />
                )}
              </div>

              {/* Amount Details Box */}
              <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '16px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '10px' }}>Amount Details</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', backgroundColor: '#f8fafc', padding: '6px 8px', borderRadius: '6px', marginBottom: '2px' }}>
                    <span style={{ color: '#64748b', fontSize: '0.75rem' }}>Billing Period</span>
                    <span style={{ fontWeight: 700, fontSize: '0.75rem', color: '#0c5c37' }}>{isCustomPeriod ? customBillingPeriod : selectedBillingPeriod}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Monthly Fee</span>
                    <span style={{ fontWeight: 700 }}>₹{selectedEstablishment.monthlyFee.toLocaleString()}</span>
                  </div>
                  {(selectedEstablishment.activePeriodPaid || 0) > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#10b981' }}>
                      <span style={{ fontSize: '0.75rem' }}>Paid This Month</span>
                      <span style={{ fontWeight: 700 }}>-₹{(selectedEstablishment.activePeriodPaid || 0).toLocaleString()}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Penalty</span>
                    <span style={{ fontWeight: 700 }}>₹{selectedEstablishment.penalty.toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Previous Balance</span>
                    <span style={{ fontWeight: 700 }}>₹{selectedEstablishment.previousBalance.toLocaleString()}</span>
                  </div>
                  <hr style={{ border: 'none', borderTop: '1px solid #f1f5f9' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, color: '#0f172a' }}>Total Payable</span>
                    <span style={{ fontSize: '1rem', fontWeight: 800, color: '#ef4444' }}>
                      ₹{(Math.max(0, selectedEstablishment.monthlyFee - (selectedEstablishment.activePeriodPaid || 0)) + selectedEstablishment.penalty + selectedEstablishment.previousBalance).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Payment Mode Selector */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Payment Mode</span>
                <div style={{ display: 'flex', gap: '10px' }}>
                  {['Cash', 'UPI', 'Other'].map(mode => (
                    <button
                      key={mode}
                      onClick={() => setPaymentMode(mode)}
                      style={{
                        flex: 1,
                        padding: '12px',
                        borderRadius: '10px',
                        border: paymentMode === mode ? '2px solid #0c5c37' : '1px solid #cbd5e1',
                        backgroundColor: paymentMode === mode ? '#eaf6ee' : '#ffffff',
                        color: paymentMode === mode ? '#0c5c37' : '#475569',
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        transition: 'all 0.2s'
                      }}
                    >
                      {paymentMode === mode && <Check size={14} />}
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount Received Input */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Amount Received</span>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontWeight: 700, color: '#334155', fontSize: '0.95rem' }}>₹</span>
                  <input 
                    type="number"
                    value={amountReceived}
                    onChange={(e) => setAmountReceived(e.target.value)}
                    style={{ 
                      width: '100%', 
                      padding: '12px 14px 12px 28px', 
                      borderRadius: '10px', 
                      border: '1.5px solid #cbd5e1', 
                      fontWeight: 800, 
                      fontSize: '0.95rem',
                      outline: 'none',
                      color: '#0c5c37'
                    }}
                  />
                </div>
              </div>

              {/* Remarks */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Remarks (Optional)</span>
                <input 
                  type="text" 
                  placeholder="Enter remarks"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
                />
              </div>

              {/* Generate Receipt */}
              <button 
                onClick={handleGenerateReceipt}
                style={{ 
                  backgroundColor: '#0c5c37', 
                  color: '#ffffff', 
                  border: 'none', 
                  borderRadius: '12px', 
                  padding: '14px', 
                  fontWeight: 700, 
                  fontSize: '0.95rem', 
                  cursor: 'pointer',
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  gap: '8px',
                  boxShadow: '0 4px 10px rgba(12, 92, 55, 0.2)',
                  marginTop: 'auto'
                }}
              >
                Generate Receipt
              </button>

            </div>
          </div>
        )}

        {/* SCREEN 5: Payment Success */}
        {screen === 5 && latestReceipt && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center', padding: '24px' }} className="animate-fade-in">
            
            {/* Success Emblem */}
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: '#ecfdf5', width: '90px', height: '90px', borderRadius: '50%', marginBottom: '16px', border: '2px dashed #10b981' }}>
                <div style={{ width: '70px', height: '70px', borderRadius: '50%', backgroundColor: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff' }}>
                  <CheckCircle2 size={44} />
                </div>
              </div>
              <h2 style={{ color: '#0c5c37', fontWeight: 800, fontSize: '1.4rem' }}>Payment Recorded Successfully!</h2>
            </div>

            {/* Receipt Summary Grid */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '16px', border: '1px solid #cbd5e1', display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                <span style={{ color: '#64748b' }}>Receipt No.</span>
                <span style={{ fontWeight: 700, color: '#334155' }}>{latestReceipt.receiptNo}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                <span style={{ color: '#64748b' }}>Amount Received</span>
                <span style={{ fontWeight: 800, color: '#10b981' }}>₹{latestReceipt.amountPaid.toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                <span style={{ color: '#64748b' }}>Paid On</span>
                <span style={{ fontWeight: 700, color: '#334155' }}>
                  {new Date(latestReceipt.dateTime).toLocaleString()}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                <span style={{ color: '#64748b' }}>Billing Period</span>
                <span style={{ fontWeight: 700, color: '#0c5c37' }}>
                  {latestReceipt.billingPeriod || getBillingPeriod(latestReceipt.dateTime).periodStr}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                <span style={{ color: '#64748b' }}>Payment Mode</span>
                <span style={{ fontWeight: 700, color: '#334155' }}>{latestReceipt.paymentMode}</span>
              </div>
            </div>

            {/* Buttons stack */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button 
                onClick={() => {
                  setPreviousScreen(5);
                  setScreen(6);
                }}
                style={{ 
                  backgroundColor: '#0c5c37', 
                  color: '#ffffff', 
                  border: 'none', 
                  borderRadius: '12px', 
                  padding: '14px', 
                  fontWeight: 700, 
                  fontSize: '0.9rem', 
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <Eye size={16} />
                View Receipt
              </button>
              
              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  onClick={() => sendWhatsAppReceipt(latestReceipt, selectedEstablishment)}
                  style={{ 
                    flex: 1,
                    backgroundColor: '#ffffff', 
                    color: '#475569', 
                    border: '1px solid #cbd5e1', 
                    borderRadius: '10px', 
                    padding: '10px', 
                    fontWeight: 700, 
                    fontSize: '0.75rem', 
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <Share2 size={14} />
                  Share Receipt
                </button>
                <button 
                  onClick={() => sendWhatsAppReceipt(latestReceipt, selectedEstablishment)}
                  style={{ 
                    flex: 1,
                    backgroundColor: '#25D366', 
                    color: '#ffffff', 
                    border: 'none', 
                    borderRadius: '10px', 
                    padding: '10px', 
                    fontWeight: 700, 
                    fontSize: '0.75rem', 
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 4px rgba(37, 211, 102, 0.25)'
                  }}
                >
                  <Send size={14} />
                  WhatsApp
                </button>
              </div>

              <button 
                onClick={handleNextEstablishment}
                style={{ 
                  backgroundColor: 'transparent', 
                  color: '#0c5c37', 
                  border: '1.5px solid #0c5c37', 
                  borderRadius: '12px', 
                  padding: '12px', 
                  fontWeight: 700, 
                  fontSize: '0.9rem', 
                  cursor: 'pointer',
                  marginTop: '12px'
                }}
              >
                Next Establishment →
              </button>
            </div>

          </div>
        )}

        {/* SCREEN 6: Receipt Preview */}
        {screen === 6 && selectedEstablishment && latestReceipt && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }} className="animate-fade-in">
            {/* Header */}
            <div style={{ backgroundColor: '#0c5c37', color: '#ffffff', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button onClick={() => {
                  if (previousScreen === 8) {
                    setScreen(8);
                  } else {
                    setScreen(5);
                  }
                }} style={{ background: 'transparent', border: 'none', color: '#ffffff', cursor: 'pointer' }}>
                  <ArrowLeft size={20} />
                </button>
                <span style={{ fontWeight: 800, fontSize: '0.9rem' }}>Receipt</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <Send size={16} style={{ cursor: 'pointer', color: '#4ade80' }} onClick={() => sendWhatsAppReceipt(latestReceipt, selectedEstablishment)} title="Send via WhatsApp" />
                <Share2 size={16} style={{ cursor: 'pointer' }} onClick={() => sendWhatsAppReceipt(latestReceipt, selectedEstablishment)} title="Share Receipt" />
                <Printer size={16} style={{ cursor: 'pointer' }} onClick={() => window.print()} title="Print Receipt" />
              </div>
            </div>

            {/* Receipt Body */}
            <div style={{ flex: 1, padding: '16px', overflowY: 'auto' }}>
              <div style={{ 
                backgroundColor: '#ffffff', 
                borderRadius: '8px', 
                border: '1px solid #cbd5e1', 
                boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
                padding: '20px',
                fontFamily: 'monospace'
              }}>
                <div style={{ textAlign: 'center', borderBottom: '1.5px dashed #cbd5e1', paddingBottom: '12px', marginBottom: '12px' }}>
                  <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0c5c37' }}>RVS ECO PROJECTS</div>
                  <div style={{ fontSize: '0.65rem', color: '#64748b', marginTop: '2px' }}>Authorised Agency</div>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#334155' }}>Khammam Municipal Corporation</div>
                  <div style={{ fontSize: '0.65rem', background: '#0f172a', color: '#ffffff', display: 'inline-block', padding: '2px 8px', borderRadius: '4px', marginTop: '6px', fontWeight: 'bold' }}>COMMERCIAL USER FEE RECEIPT</div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.7rem', borderBottom: '1.5px dashed #cbd5e1', paddingBottom: '10px', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Receipt No:</span>
                    <span style={{ fontWeight: 'bold' }}>{latestReceipt.receiptNo}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Date:</span>
                    <span>{new Date(latestReceipt.dateTime).toLocaleDateString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Billing Period:</span>
                    <span style={{ fontWeight: 'bold' }}>{latestReceipt.billingPeriod || getBillingPeriod(latestReceipt.dateTime).periodStr}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.7rem', borderBottom: '1.5px dashed #cbd5e1', paddingBottom: '10px', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Establishment:</span>
                    <span style={{ fontWeight: 'bold' }}>{selectedEstablishment.name}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Owner Name:</span>
                    <span>{selectedEstablishment.proprietor || 'N/A'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Mobile:</span>
                    <span>{selectedEstablishment.phone || 'N/A'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>ID:</span>
                    <span>{selectedEstablishment.id}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Route:</span>
                    <span>{selectedEstablishment.routeName}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.7rem', borderBottom: '1.5px dashed #cbd5e1', paddingBottom: '10px', marginBottom: '12px' }}>
                  {(() => {
                    const outstandingAfter = Math.max(0, Math.max(0, selectedEstablishment.monthlyFee - (selectedEstablishment.activePeriodPaid || 0)) + selectedEstablishment.penalty + selectedEstablishment.previousBalance);
                    const totalPayableBefore = outstandingAfter + latestReceipt.amountPaid;
                    const arrearsBefore = Math.max(0, totalPayableBefore - selectedEstablishment.monthlyFee - selectedEstablishment.penalty);
                    return (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Monthly User Fee:</span>
                          <span>₹{selectedEstablishment.monthlyFee.toFixed(2)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Penalty:</span>
                          <span>₹{selectedEstablishment.penalty.toFixed(2)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Previous Balance:</span>
                          <span>₹{arrearsBefore.toFixed(2)}</span>
                        </div>
                        <hr style={{ border: 'none', borderTop: '1px dotted #cbd5e1' }} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                          <span>Total Payable:</span>
                          <span>₹{totalPayableBefore.toFixed(2)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', color: '#0c5c37' }}>
                          <span>Amount Received:</span>
                          <span>₹{latestReceipt.amountPaid.toFixed(2)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Outstanding:</span>
                          <span>₹{outstandingAfter.toFixed(2)}</span>
                        </div>
                      </>
                    );
                  })()}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.7rem', marginBottom: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Payment Mode:</span>
                    <span>{latestReceipt.paymentMode}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Collected By:</span>
                    <span>{latestReceipt.collectorName} ({latestReceipt.collectorId})</span>
                  </div>
                </div>

                {/* Signatures mock */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '30px', fontSize: '0.6rem' }}>
                  <div style={{ textAlign: 'center', width: '45%' }}>
                    <div style={{ height: '30px', borderBottom: '1px solid #94a3b8', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', fontStyle: 'italic', color: '#64748b' }}>
                      {selectedEstablishment.proprietor ? selectedEstablishment.proprietor.split(' ')[0] : 'Customer'}
                    </div>
                    <div style={{ marginTop: '4px' }}>Customer Signature</div>
                  </div>
                  <div style={{ textAlign: 'center', width: '45%' }}>
                    <div style={{ height: '30px', borderBottom: '1px solid #94a3b8', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', fontStyle: 'italic', color: '#0c5c37', fontWeight: 'bold' }}>
                      {latestReceipt.collectorName}
                    </div>
                    <div style={{ marginTop: '4px' }}>Collector Signature</div>
                  </div>
                </div>

                <div style={{ textAlign: 'center', fontSize: '0.65rem', color: '#10b981', fontWeight: 'bold', marginTop: '24px' }}>
                  Thank you for keeping Khammam Clean & Green
                </div>

              </div>
            </div>

            {/* Bottom Actions */}
            <div style={{ padding: '16px', borderTop: '1px solid #e2e8f0', backgroundColor: '#ffffff' }}>
              <button 
                onClick={handleNextEstablishment}
                style={{ 
                  width: '100%',
                  backgroundColor: '#0c5c37', 
                  color: '#ffffff', 
                  border: 'none', 
                  borderRadius: '12px', 
                  padding: '14px', 
                  fontWeight: 700, 
                  fontSize: '0.9rem', 
                  cursor: 'pointer'
                }}
              >
                Close & Next
              </button>
            </div>

          </div>
        )}

        {/* SCREEN 7: Payment History */}
        {screen === 7 && selectedEstablishment && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }} className="animate-fade-in">
            {/* Header */}
            <div style={{ backgroundColor: '#0c5c37', color: '#ffffff', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button onClick={() => setScreen(3)} style={{ background: 'transparent', border: 'none', color: '#ffffff', cursor: 'pointer' }}>
                <ArrowLeft size={20} />
              </button>
              <div>
                <span style={{ fontWeight: 800, fontSize: '0.9rem', display: 'block' }}>{selectedEstablishment.name}</span>
                <span style={{ fontSize: '0.65rem', color: '#a7f3d0' }}>ID: {selectedEstablishment.id}</span>
              </div>
            </div>

            {/* History stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', padding: '16px', backgroundColor: '#ffffff', borderBottom: '1px solid #cbd5e1' }}>
              <div style={{ textAlign: 'center', borderRight: '1px solid #cbd5e1' }}>
                <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 600 }}>Total Paid</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#10b981', marginTop: '2px' }}>
                  ₹{paymentHistory.reduce((sum, p) => sum + p.amountPaid, 0).toLocaleString()}
                </div>
              </div>
              <div style={{ textAlign: 'center', borderRight: '1px solid #cbd5e1' }}>
                <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 600 }}>Outstanding</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#ef4444', marginTop: '2px' }}>
                  ₹{(Math.max(0, selectedEstablishment.monthlyFee - (selectedEstablishment.activePeriodPaid || 0)) + selectedEstablishment.penalty + selectedEstablishment.previousBalance).toLocaleString()}
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 600 }}>Receipts</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#3b82f6', marginTop: '2px' }}>{paymentHistory.length}</div>
              </div>
            </div>
            <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', backgroundColor: '#ffffff' }}>
              <div 
                onClick={() => setHistoryTab('history')}
                style={{ 
                  flex: 1, 
                  textAlign: 'center', 
                  padding: '12px', 
                  fontSize: '0.8rem', 
                  fontWeight: historyTab === 'history' ? 700 : 600, 
                  color: historyTab === 'history' ? '#0c5c37' : '#64748b', 
                  borderBottom: historyTab === 'history' ? '2.5px solid #0c5c37' : 'none', 
                  cursor: 'pointer' 
                }}
              >
                History
              </div>
              <div 
                onClick={() => setHistoryTab('ledger')}
                style={{ 
                  flex: 1, 
                  textAlign: 'center', 
                  padding: '12px', 
                  fontSize: '0.8rem', 
                  fontWeight: historyTab === 'ledger' ? 700 : 600, 
                  color: historyTab === 'ledger' ? '#0c5c37' : '#64748b', 
                  borderBottom: historyTab === 'ledger' ? '2.5px solid #0c5c37' : 'none', 
                  cursor: 'pointer' 
                }}
              >
                Ledger View
              </div>
            </div>

            {/* History Tab Contents */}
            {historyTab === 'history' ? (
              <div style={{ flex: 1, padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {paymentHistory.length > 0 ? (
                  paymentHistory.map((p, idx) => (
                    <div key={p.id || idx} style={{ backgroundColor: '#ffffff', borderRadius: '10px', padding: '12px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155' }}>
                          {new Date(p.dateTime).toLocaleDateString()}
                        </div>
                        <div style={{ fontSize: '0.65rem', color: '#64748b', marginTop: '2px' }}>Receipt: {p.receiptNo}</div>
                        <div style={{ display: 'flex', gap: '10px', marginTop: '4px', fontSize: '0.65rem', color: '#475569' }}>
                          <span>Amount: <strong>₹{p.amountPaid.toLocaleString()}</strong></span>
                          <span>Mode: <strong>{p.paymentMode}</strong></span>
                        </div>
                      </div>
                      <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#065f46', backgroundColor: '#d1fae5', padding: '2px 8px', borderRadius: '20px' }}>Paid</span>
                    </div>
                  ))
                ) : (
                  <div style={{ textAlign: 'center', fontSize: '0.75rem', color: '#94a3b8', marginTop: '24px' }}>
                    No payment records found.
                  </div>
                )}
              </div>
            ) : (
              <div style={{ flex: 1, padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ backgroundColor: '#ffffff', borderRadius: '10px', padding: '14px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px', marginBottom: '8px' }}>
                    <span>Transaction / Date</span>
                    <span>Amount</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {selectedEstablishment.previousBalance > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                        <div>
                          <div style={{ fontWeight: 700, color: '#475569' }}>Opening Balance / Previous Arrears</div>
                          <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Carried Forward</div>
                        </div>
                        <span style={{ fontWeight: 700, color: '#ef4444' }}>+₹{selectedEstablishment.previousBalance.toLocaleString()} (Dr)</span>
                      </div>
                    )}
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                      <div>
                        <div style={{ fontWeight: 700, color: '#475569' }}>Monthly User Fee (Current Period)</div>
                        <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Service Charge</div>
                      </div>
                      <span style={{ fontWeight: 700, color: '#ef4444' }}>+₹{selectedEstablishment.monthlyFee.toLocaleString()} (Dr)</span>
                    </div>

                    {selectedEstablishment.penalty > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                        <div>
                          <div style={{ fontWeight: 700, color: '#475569' }}>Penalty / Fine Assessed</div>
                          <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Late charges</div>
                        </div>
                        <span style={{ fontWeight: 700, color: '#ef4444' }}>+₹{selectedEstablishment.penalty.toLocaleString()} (Dr)</span>
                      </div>
                    )}

                    {paymentHistory.map((p, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', borderTop: '1px solid #f1f5f9', paddingTop: '8px' }}>
                        <div>
                          <div style={{ fontWeight: 700, color: '#0c5c37' }}>Payment Received ({p.paymentMode})</div>
                          <div style={{ fontSize: '0.65rem', color: '#64748b' }}>{new Date(p.dateTime).toLocaleDateString()} • Receipt: {p.receiptNo}</div>
                        </div>
                        <span style={{ fontWeight: 700, color: '#10b981' }}>-₹{p.amountPaid.toLocaleString()} (Cr)</span>
                      </div>
                    ))}

                    <hr style={{ border: 'none', borderTop: '1.5px solid #cbd5e1', margin: '4px 0' }} />

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 800 }}>
                      <span style={{ color: '#0f172a' }}>Net Outstanding Balance</span>
                      <span style={{ color: '#ef4444' }}>
                        ₹{(Math.max(0, selectedEstablishment.monthlyFee - (selectedEstablishment.activePeriodPaid || 0)) + selectedEstablishment.penalty + selectedEstablishment.previousBalance).toLocaleString()} (Dr)
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* SCREEN 8: All Receipts / Collections Journal */}
        {screen === 8 && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }} className="animate-fade-in">
            {/* Header */}
            <div style={{ backgroundColor: '#0c5c37', color: '#ffffff', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button onClick={() => setScreen(1)} style={{ background: 'transparent', border: 'none', color: '#ffffff', cursor: 'pointer' }}>
                <ArrowLeft size={20} />
              </button>
              <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>Receipts Journal</span>
            </div>

            {/* Filter Bar */}
            <div style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #cbd5e1', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                <input 
                  type="text" 
                  value={receiptSearchQuery}
                  placeholder="Search receipt no / establishment..."
                  onChange={(e) => setReceiptSearchQuery(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px 8px 32px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.8rem', outline: 'none' }}
                />
              </div>
            </div>

            {/* Receipts List */}
            <div style={{ flex: 1, padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {allPayments && allPayments.length > 0 ? (
                allPayments
                  .filter(p => {
                    const q = receiptSearchQuery.toLowerCase();
                    return (
                      !q ||
                      (p.receiptNo && p.receiptNo.toLowerCase().includes(q)) ||
                      (p.establishmentName && p.establishmentName.toLowerCase().includes(q))
                    );
                  })
                  .map((p, idx) => (
                    <div 
                      key={p.id || idx} 
                      onClick={async () => {
                        setPreviousScreen(8);
                        const ests = await db.getEstablishments(null, p.establishmentId);
                        if (ests && ests.length > 0) {
                          setSelectedEstablishment(ests[0]);
                          setLatestReceipt(p);
                          setScreen(6);
                        } else {
                          setSelectedEstablishment({
                            id: p.establishmentId,
                            name: p.establishmentName,
                            proprietor: p.proprietor || 'N/A',
                            phone: p.phone || 'N/A',
                            monthlyFee: parseFloat(p.amountPaid) || 500,
                            penalty: 0,
                            previousBalance: 0,
                            routeName: 'GANDHICHOWK',
                            routeId: 1
                          });
                          setLatestReceipt(p);
                          setScreen(6);
                        }
                      }}
                      style={{ 
                        backgroundColor: '#ffffff', 
                        borderRadius: '10px', 
                        padding: '12px', 
                        border: '1px solid #cbd5e1', 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        cursor: 'pointer',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.01)'
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#1e293b' }}>
                          {p.establishmentName}
                        </div>
                        <div style={{ fontSize: '0.65rem', color: '#64748b', marginTop: '2px' }}>
                          Receipt: {p.receiptNo} • {new Date(p.dateTime).toLocaleDateString()}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#10b981' }}>
                            ₹{p.amountPaid.toLocaleString()}
                          </div>
                          <span style={{ 
                            fontSize: '0.55rem', 
                            fontWeight: 800, 
                            color: p.paymentMode === 'UPI' ? '#2563eb' : '#059669', 
                            backgroundColor: p.paymentMode === 'UPI' ? '#dbeafe' : '#d1fae5', 
                            padding: '2px 8px', 
                            borderRadius: '10px',
                            display: 'inline-block',
                            marginTop: '4px'
                          }}>
                            {p.paymentMode}
                          </span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            sendWhatsAppReceipt(p, { name: p.establishmentName, id: p.establishmentId });
                          }}
                          style={{
                            backgroundColor: '#25D366',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '6px 10px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '0.65rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            flexShrink: 0
                          }}
                          title="Send receipt to WhatsApp"
                        >
                          <Send size={12} /> WhatsApp
                        </button>
                      </div>
                    </div>
                  ))
              ) : (
                <div style={{ textAlign: 'center', fontSize: '0.75rem', color: '#94a3b8', marginTop: '24px' }}>
                  No receipts recorded yet.
                </div>
              )}
            </div>
          </div>
        )}

        {/* SCREEN 9: Add / Edit Establishment Form */}
        {screen === 9 && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }} className="animate-fade-in">
            {/* Header */}
            <div style={{ backgroundColor: '#0c5c37', color: '#ffffff', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button onClick={() => setScreen(isEditingEst ? 3 : 1)} style={{ background: 'transparent', border: 'none', color: '#ffffff', cursor: 'pointer' }}>
                <ArrowLeft size={20} />
              </button>
              <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>
                {isEditingEst ? 'Edit Details' : 'Register Establishment'}
              </span>
            </div>

            {/* Form */}
            <div style={{ flex: 1, padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto' }}>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Business Name *</label>
                <input 
                  type="text" 
                  value={estForm.name}
                  onChange={(e) => setEstForm({ ...estForm, name: e.target.value })}
                  placeholder="e.g. Sri Venkateswara Kirana"
                  style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.8rem', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Proprietor / Owner Name</label>
                <input 
                  type="text" 
                  value={estForm.proprietor}
                  onChange={(e) => setEstForm({ ...estForm, proprietor: e.target.value })}
                  placeholder="e.g. Ramesh Kumar"
                  style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.8rem', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Mobile Number</label>
                <input 
                  type="text" 
                  value={estForm.phone}
                  onChange={(e) => setEstForm({ ...estForm, phone: e.target.value })}
                  placeholder="e.g. 9876543210"
                  style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.8rem', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Assigned Collection Route *</label>
                <select 
                  value={estForm.routeId}
                  onChange={(e) => setEstForm({ ...estForm, routeId: parseInt(e.target.value) })}
                  style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.8rem', outline: 'none', backgroundColor: '#ffffff' }}
                >
                  {routesList.map(r => (
                    <option key={r.id} value={r.id}>Route {r.id}: {r.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Monthly Fee (₹)</label>
                  <input 
                    type="number" 
                    value={estForm.monthlyFee}
                    onChange={(e) => setEstForm({ ...estForm, monthlyFee: e.target.value })}
                    style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.8rem', outline: 'none' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Penalty (₹)</label>
                  <input 
                    type="number" 
                    value={estForm.penalty}
                    onChange={(e) => setEstForm({ ...estForm, penalty: e.target.value })}
                    style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.8rem', outline: 'none' }}
                  />
                </div>
              </div>

              {!isEditingEst && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Opening Arrears Balance (₹)</label>
                  <input 
                    type="number" 
                    value={estForm.previousBalance}
                    onChange={(e) => setEstForm({ ...estForm, previousBalance: e.target.value })}
                    style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.8rem', outline: 'none' }}
                  />
                </div>
              )}

              {/* Submit Button */}
              <button
                onClick={async () => {
                  if (!estForm.name.trim()) {
                    alert('Business Name is required');
                    return;
                  }
                  try {
                    if (isEditingEst) {
                      const updated = await db.updateEstablishment(selectedEstablishment.id, {
                        name: estForm.name,
                        proprietor: estForm.proprietor,
                        phone: estForm.phone,
                        monthlyFee: parseFloat(estForm.monthlyFee) || 0,
                        penalty: parseFloat(estForm.penalty) || 0,
                        previousBalance: parseFloat(estForm.previousBalance) || 0,
                        routeId: estForm.routeId
                      });
                      setSelectedEstablishment(updated);
                      alert('Establishment updated successfully!');
                      setScreen(3);
                    } else {
                      const created = await db.addEstablishment({
                        name: estForm.name,
                        proprietor: estForm.proprietor,
                        phone: estForm.phone,
                        monthlyFee: parseFloat(estForm.monthlyFee) || 0,
                        penalty: parseFloat(estForm.penalty) || 0,
                        previousBalance: parseFloat(estForm.previousBalance) || 0,
                        routeId: estForm.routeId
                      });
                      alert('Establishment registered successfully!');
                      fetchEstablishments();
                      setScreen(2);
                    }
                  } catch (err) {
                    alert('Error saving establishment: ' + err.message);
                  }
                }}
                style={{
                  backgroundColor: '#0c5c37',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '14px',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  marginTop: '16px',
                  boxShadow: '0 4px 10px rgba(12, 92, 55, 0.2)'
                }}
              >
                {isEditingEst ? 'Save Changes' : 'Register Establishment'}
              </button>
            </div>
          </div>
        )}

        {/* Menu Drawer Overlay */}
        {showMenuDrawer && (
          <div 
            style={{ 
              position: 'absolute', 
              top: 0, 
              left: 0, 
              width: '100%', 
              height: '100%', 
              backgroundColor: 'rgba(0,0,0,0.5)', 
              zIndex: 100, 
              display: 'flex', 
              justifyContent: 'flex-end' 
            }}
            onClick={() => setShowMenuDrawer(false)}
          >
            <div 
              style={{ 
                width: '75%', 
                height: '100%', 
                backgroundColor: '#ffffff', 
                boxShadow: '-4px 0 10px rgba(0,0,0,0.1)',
                display: 'flex',
                flexDirection: 'column'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Drawer Header */}
              <div style={{ backgroundColor: '#0c5c37', color: '#ffffff', padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '1rem', fontWeight: 800 }}>RVS Operator Portal</span>
                <span style={{ fontSize: '0.7rem', color: '#a7f3d0' }}>Executive ID: {executiveId}</span>
              </div>

              {/* Drawer List */}
              <div style={{ flex: 1, padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div onClick={() => { setShowMenuDrawer(false); setScreen(1); }} style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.85rem', fontWeight: 700, color: '#334155', cursor: 'pointer', padding: '8px 0' }}>
                  <Building2 size={18} style={{ color: '#0c5c37' }} />
                  <span>Dashboard Home</span>
                </div>
                <div onClick={() => { setShowMenuDrawer(false); setScreen(2); }} style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.85rem', fontWeight: 700, color: '#334155', cursor: 'pointer', padding: '8px 0' }}>
                  <Search size={18} style={{ color: '#0c5c37' }} />
                  <span>Search Establishments</span>
                </div>
                <div onClick={() => { setShowMenuDrawer(false); setScreen(8); }} style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.85rem', fontWeight: 700, color: '#334155', cursor: 'pointer', padding: '8px 0' }}>
                  <FileText size={18} style={{ color: '#0c5c37' }} />
                  <span>All Receipts & Journal</span>
                </div>
                <div onClick={() => { setShowMenuDrawer(false); onBackToHome(); }} style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.85rem', fontWeight: 700, color: '#ef4444', cursor: 'pointer', padding: '8px 0', borderTop: '1px solid #e2e8f0', marginTop: 'auto' }}>
                  <LogOut size={18} />
                  <span>Switch Workspace</span>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
