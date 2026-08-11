import React, { useState } from 'react';
import { Shield } from 'lucide-react';
import { db } from '../db/localStorageDB';

export default function LandingScreen({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      alert('Please enter both username and password.');
      return;
    }
    setLoading(true);
    try {
      const usersList = await db.getUsers();
      const matchedUser = usersList.find(u => u.username.toLowerCase() === username.trim().toLowerCase());
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
      if (onLoginSuccess) {
        onLoginSuccess(matchedUser);
      }
    } catch (err) {
      alert('Login error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="landing-background">
      {/* Floating Particles for Ambient Eco Visuals */}
      <div className="landing-particle" style={{ width: '40px', height: '40px', left: '15%', top: '25%', animationDelay: '0s' }}></div>
      <div className="landing-particle" style={{ width: '60px', height: '60px', right: '12%', top: '15%', animationDelay: '2s' }}></div>
      <div className="landing-particle" style={{ width: '30px', height: '30px', left: '25%', bottom: '20%', animationDelay: '4s' }}></div>
      <div className="landing-particle" style={{ width: '50px', height: '50px', right: '20%', bottom: '25%', animationDelay: '1s' }}></div>

      <div 
        className="glass-panel" 
        style={{ 
          width: '100%', 
          maxWidth: '440px', 
          padding: '40px 32px', 
          textAlign: 'center', 
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '24px'
        }}
      >
        {/* Animated Emblem */}
        <div 
          className="animate-leaf" 
          style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            background: 'rgba(16, 185, 129, 0.15)', 
            width: '100px', 
            height: '100px', 
            borderRadius: '30px',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            boxShadow: '0 10px 30px rgba(16, 185, 129, 0.2)'
          }}
        >
          <svg width="60" height="60" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M2 22C2 22 6 18 10 14C12 12 15 12 18 9C21 6 22 2 22 2C22 2 18 3 15 6C12 9 12 12 10 14C6 18 2 22 2 22Z" fill="#10b981"/>
            <path d="M10 14C10 14 7 11 5 11C3 11 2 13 2 13C2 13 4 14 6 15C8 16 10 14 10 14Z" fill="#34d399"/>
          </svg>
        </div>

        {/* Animated App Name Title */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <h1 
            className="animate-title" 
            style={{ 
              fontSize: '3rem', 
              fontWeight: 800, 
              color: '#ffffff', 
              letterSpacing: '-1.5px',
              lineHeight: 1,
              textShadow: '0 4px 12px rgba(0,0,0,0.15)'
            }}
          >
            RVS
          </h1>
          <p 
            className="animate-subtitle" 
            style={{ 
              textTransform: 'uppercase', 
              fontSize: '1rem', 
              letterSpacing: '5px', 
              fontWeight: 700, 
              color: '#10b981',
              marginTop: '4px'
            }}
          >
            Eco Projects
          </p>
        </div>

        {/* Division/Sub-heading */}
        <div className="animate-subtitle" style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <span style={{ fontSize: '0.9rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>
            Khammam Municipal Corporation
          </span>
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
            Resource Value Recovery System
          </span>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="animate-controls" style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '12px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', textAlign: 'left' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'rgba(255, 255, 255, 0.8)', letterSpacing: '0.5px' }}>Username</label>
            <input 
              type="text" 
              placeholder="Enter username" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px 16px',
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '10px',
                color: '#ffffff',
                fontSize: '0.95rem',
                outline: 'none',
                transition: 'all 0.2s'
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', textAlign: 'left' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'rgba(255, 255, 255, 0.8)', letterSpacing: '0.5px' }}>Password</label>
            <input 
              type="password" 
              placeholder="Enter password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px 16px',
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '10px',
                color: '#ffffff',
                fontSize: '0.95rem',
                outline: 'none',
                transition: 'all 0.2s'
              }}
            />
          </div>

          <button 
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              backgroundColor: '#10b981',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              fontSize: '1rem',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 8px 20px rgba(16, 185, 129, 0.25)',
              transition: 'all 0.2s',
              marginTop: '8px'
            }}
          >
            {loading ? 'LOGGING IN...' : 'LOGIN TO PORTAL'}
          </button>
        </form>

        {/* Footer Authority */}
        <span 
          className="animate-controls" 
          style={{ 
            fontSize: '0.75rem', 
            color: '#64748b', 
            marginTop: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <Shield size={12} />
          Official Management Console v1.2.0
        </span>
      </div>
    </div>
  );
}
