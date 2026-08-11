import React, { useState, useEffect } from 'react';
import { db } from './db/localStorageDB';
import OperatorApp from './components/OperatorApp';
import AdminPanel from './components/AdminPanel';
import LandingScreen from './components/LandingScreen';
import EstablishmentsPanel from './components/EstablishmentsPanel';

export default function App() {
  // Service selection: 'landing', 'drcc', 'establishments', 'establishments_admin'
  const [activeService, setActiveService] = useState('landing');
  const [role, setRole] = useState('operator');
  const [currentUser, setCurrentUser] = useState(null);
  const [rates, setRates] = useState({ 
    plastic: 16, 
    cardboard: 10, 
    glass: 3, 
    others: 3,
    others_iron: 25,
    others_babybox: 3,
    others_blackplastic: 3
  });

  // Sync rates on mount
  useEffect(() => {
    const fetchRates = async () => {
      const r = await db.getRates();
      setRates(r);
    };
    fetchRates();
  }, []);

  const handleRatesUpdated = (newRates) => {
    setRates(newRates);
  };

  const handleNewEntrySaved = () => {
    // Sync triggers if necessary
  };

  // Detect if screen width is mobile to make admin panel responsive if loaded on phone
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#f8fafc' }}>
      
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        
        {/* LANDING WELCOME SCREEN */}
        {activeService === 'landing' && (
          <LandingScreen onLoginSuccess={(user) => {
            setCurrentUser(user);
            if (user.role === 'admin_drcc') {
              setActiveService('drcc');
              setRole('admin');
            } else if (user.role === 'admin_est') {
              setActiveService('establishments_admin');
              setRole('admin');
            } else if (user.role === 'operator_drcc') {
              setActiveService('drcc');
              setRole('operator');
            } else if (user.role === 'operator_est') {
              setActiveService('establishments');
              setRole('operator');
            }
          }} />
        )}

        {/* WORKER / DRCC FLOW */}
        {activeService === 'drcc' && role === 'operator' && (
          <OperatorApp 
            onLogout={() => {
              setCurrentUser(null);
              setActiveService('landing');
              setRole('operator');
            }} 
            currentUser={currentUser}
            currentRates={rates}
            onNewEntrySaved={handleNewEntrySaved}
            onAdminLogin={() => setRole('admin')}
          />
        )}

        {/* ADMIN WEB PANEL */}
        {(activeService === 'drcc' || activeService === 'establishments_admin') && role === 'admin' && (
          <AdminPanel 
            onLogout={() => {
              setCurrentUser(null);
              setActiveService('landing');
              setRole('operator');
            }} 
            currentUser={currentUser}
            adminType={activeService === 'establishments_admin' ? 'est' : 'drcc'}
            currentRates={rates}
            onRatesUpdated={handleRatesUpdated}
            isMobile={isMobile}
          />
        )}

        {/* ESTABLISHMENTS PORTAL */}
        {activeService === 'establishments' && (
          <EstablishmentsPanel 
            onBackToHome={() => {
              setCurrentUser(null);
              setActiveService('landing');
              setRole('operator');
            }} 
            currentUser={currentUser}
          />
        )}

      </div>
    </div>
  );
}

