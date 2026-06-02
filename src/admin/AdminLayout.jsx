import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { IconGrid, IconPackage, IconFolder, IconClipboard, IconMail, IconMessageCircle } from '../components/Icons';
import { supabase } from '../lib/supabase';
import './AdminLayout.css';

const SESSION_TIMEOUT = 900000; // 15 minutes

const navItems = [
  { label: 'Dashboard', path: '/admin/dashboard', icon: <IconGrid size={18} /> },
  { label: 'Products', path: '/admin/products', icon: <IconPackage size={18} /> },
  { label: 'Categories', path: '/admin/categories', icon: <IconFolder size={18} /> },
  { label: 'Orders', path: '/admin/orders', icon: <IconClipboard size={18} /> },
  { label: 'Messages', path: '/admin/messages', icon: <IconMessageCircle size={18} /> },
  { label: 'Newsletter', path: '/admin/newsletter', icon: <IconMail size={18} /> },
];

export default function AdminLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const timerRef = useRef(null);

  const resetTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(handleLogout, SESSION_TIMEOUT);
  };

  useEffect(() => {
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    resetTimer();
    events.forEach(e => window.addEventListener(e, resetTimer));
    return () => {
      events.forEach(e => window.removeEventListener(e, resetTimer));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleLogout = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (supabase) supabase.auth.signOut();
    window.location.href = '/admin';
  };

  return (
    <div className="admin-layout">
      <div className="admin-mobile-header">
        <button className="admin-hamburger" onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="Toggle menu">
          <span></span><span></span><span></span>
        </button>
        <span className="admin-mobile-title">Wrappd Gift</span>
      </div>
      {sidebarOpen && <div className="admin-overlay" onClick={() => setSidebarOpen(false)} />}
      <aside className={`admin-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <Link to="/admin/dashboard" className="admin-sidebar-logo">Wrappd Gift</Link>
        <nav className="admin-sidebar-nav">
          {navItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={`admin-nav-item ${location.pathname === item.path ? 'active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="admin-sidebar-bottom">
          <Link to="/" className="admin-view-site">View Site</Link>
          <button onClick={handleLogout} className="admin-logout-btn">Logout</button>
        </div>
      </aside>
      <main className="admin-content">
        {children}
      </main>
    </div>
  );
}
