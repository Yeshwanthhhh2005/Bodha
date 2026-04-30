import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App.jsx';
import { authAPI } from '../api/index.js';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await authAPI.login(email, password);
      login(data.token, data.user);
      navigate('/');
    } catch (err) {
      setError(err?.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logoRow}>
          <span style={styles.logoIcon}>⚡</span>
          <h1 style={styles.title}>Bodha Admin</h1>
        </div>
        <p style={styles.subtitle}>Sign in to manage your LMS</p>

        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.label}>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@bodha.com"
            required
            style={styles.input}
          />

          <label style={styles.label}>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            style={styles.input}
          />

          <button type="submit" disabled={loading} style={styles.btn}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh', display: 'flex', alignItems: 'center',
    justifyContent: 'center', background: '#F5F3FF',
  },
  card: {
    background: '#fff', borderRadius: 16, padding: '40px 36px',
    width: '100%', maxWidth: 400, boxShadow: '0 4px 24px rgba(79,70,229,0.1)',
  },
  logoRow: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 },
  logoIcon: { fontSize: 28 },
  title: { fontSize: 22, fontWeight: 700, color: '#1E1B4B' },
  subtitle: { fontSize: 14, color: '#6B7280', marginBottom: 28 },
  error: {
    background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8,
    color: '#DC2626', padding: '10px 14px', fontSize: 13, marginBottom: 20,
  },
  form: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 2 },
  input: {
    padding: '10px 14px', border: '1.5px solid #E5E7EB', borderRadius: 8,
    fontSize: 14, outline: 'none', marginBottom: 14,
    transition: 'border-color 0.15s',
  },
  btn: {
    marginTop: 8, padding: '12px 0', background: '#4F46E5', color: '#fff',
    border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 15,
    cursor: 'pointer', transition: 'background 0.15s',
  },
};
