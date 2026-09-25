import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('demo@example.com');
  const [password, setPassword] = useState('demo');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [remember, setRemember] = useState(true);
  const submit = async (event) => {
    event.preventDefault(); setError(''); setSubmitting(true);
    try { await login(email, password); navigate('/'); }
    catch (requestError) { setError(requestError.response?.data?.message || 'Unable to sign in.'); }
    finally { setSubmitting(false); }
  };
  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-form">
          <div className="auth-brand"><img alt="Ledgerwise logo" src="../ledgerwise-logo.png"> Ledger<span>wise</span></div>
          <h1>Welcome to Ledgerwise</h1>
          <p className="auth-subtitle">Sign in by entering information below</p>
          <form onSubmit={submit}>
            <label>Email <em>*</em><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
            <label>Password <em>*</em><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
            <label className="remember-option"><input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} /> <span>Remember my preference</span></label>
            {error && <p className="form-error">{error}</p>}
            <button className="primary-button auth-submit" disabled={submitting}>{submitting ? 'Signing in...' : 'Sign In'}</button>
          </form>
          <p className="auth-signup">Don't have an account? <button type="button">Sign up</button></p>
        </div>
        <aside className="auth-visual">
          <div className="auth-visual-orb orb-one" />
          <div className="auth-visual-orb orb-two" />
          <div className="auth-visual-content"><div className="auth-visual-mark">L</div><strong>Ledgerwise</strong><p>Simple, confident bookkeeping for Canadian businesses.</p></div>
        </aside>
      </section>
    </main>
  );
}
