import { useState } from 'react';
import { register, setToken, signIn } from '../services/api.js';

function AuthScreen({ onAuthenticated }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'STUDENT' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const result = mode === 'login'
        ? await signIn({ email: form.email, password: form.password })
        : await register(form);
      setToken(result.token);
      onAuthenticated(result.user);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  function update(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  return (
    <main className="auth-shell">
      <section className="auth-card panel">
        <div className="brand-mark">CF</div>
        <h1>CampusFix</h1>
        <p className="auth-subtitle">Campus problem reporting</p>
        <div className="auth-tabs">
          <button className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')} type="button">Sign in</button>
          <button className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')} type="button">Create account</button>
        </div>
        {error ? <div className="banner banner-error">{error}</div> : null}
        <form onSubmit={handleSubmit}>
          {mode === 'register' ? (
            <>
              <div className="form-group">
                <label htmlFor="auth-name">Full name</label>
                <input id="auth-name" name="name" autoComplete="name" required minLength="2" maxLength="100" value={form.name} onChange={update} />
              </div>
              <div className="form-group">
                <label htmlFor="auth-role">Account type</label>
                <select id="auth-role" name="role" value={form.role} onChange={update}>
                  <option value="STUDENT">Student</option>
                  <option value="FACULTY">Faculty</option>
                </select>
              </div>
            </>
          ) : null}
          <div className="form-group">
            <label htmlFor="auth-email">Email</label>
            <input id="auth-email" type="email" name="email" autoComplete="email" required maxLength="254" value={form.email} onChange={update} />
          </div>
          <div className="form-group">
            <label htmlFor="auth-password">Password</label>
            <input id="auth-password" type="password" name="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required minLength={mode === 'login' ? 1 : 10} maxLength="128" value={form.password} onChange={update} />
            {mode === 'register' ? <small>Use at least 10 characters.</small> : null}
          </div>
          <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? 'Please wait...' : mode === 'login' ? 'Sign in' : 'Create account'}</button>
        </form>
        <p className="auth-footnote">Staff and administrator accounts are created by an administrator.</p>
      </section>
    </main>
  );
}

export default AuthScreen;
