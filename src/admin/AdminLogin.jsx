import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminLogin.css';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const hasCookie = document.cookie.split(';').some(c => c.trim().startsWith('admin_auth='));
    if (hasCookie) {
      sessionStorage.setItem('admin_auth', 'true');
      navigate('/admin/dashboard', { replace: true });
    }
  }, [navigate]);

  function handleSubmit(e) {
    e.preventDefault();
    if (password === 'admin123') {
      document.cookie = 'admin_auth=true; Path=/; SameSite=Strict; Max-Age=86400';
      sessionStorage.setItem('admin_auth', 'true');
      navigate('/admin/dashboard', { replace: true });
    } else {
      setError('Incorrect password');
    }
  }

  return (
    <div className="admin-login">
      <div className="login-card">
        <h1>EVA</h1>
        <h2>Admin Login</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            name="password"
            placeholder="Admin password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoFocus
            required
          />
          {error && <p className="login-error">{error}</p>}
          <button type="submit">Login</button>
        </form>
      </div>
    </div>
  );
}
