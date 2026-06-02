import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import './AdminLogin.css';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [locked, setLocked] = useState(false);
  const [configMissing, setConfigMissing] = useState(false);
  const attempts = useRef(0);

  useEffect(() => {
    if (!supabase || !import.meta.env.VITE_ADMIN_EMAIL) {
      setConfigMissing(true);
      return;
    }
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate('/admin/dashboard', { replace: true });
      }
    });
  }, [navigate]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (locked || !supabase) return;
    setLoading(true);
    setError('');

    try {
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInErr) throw signInErr;

      attempts.current = 0;
      navigate('/admin/dashboard', { replace: true });
    } catch (err) {
      attempts.current++;
      if (attempts.current >= 5) {
        setLocked(true);
        setError('Too many attempts. Refresh page to try again.');
        setTimeout(() => { setLocked(false); attempts.current = 0; }, 30000);
      } else {
        setError(`Invalid email or password (${attempts.current}/5)`);
      }
    }
    setLoading(false);
  }

  if (configMissing) {
    return (
      <div className="admin-login">
        <div className="login-card">
          <h1>Wrappd Gift</h1>
          <h2>Admin Login</h2>
          <p className="login-error">Admin access requires <code>VITE_ADMIN_EMAIL</code> and <code>VITE_SUPABASE_URL</code> + <code>VITE_SUPABASE_ANON_KEY</code> in your environment.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-login">
      <div className="login-card">
        <h1>Wrappd Gift</h1>
        <h2>Admin Login</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Admin email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            autoFocus
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
          {error && <p className="login-error">{error}</p>}
          <button type="submit" disabled={locked || loading}>
            {loading ? 'Signing in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}