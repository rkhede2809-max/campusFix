import { useEffect, useState } from 'react';
import Navbar from './components/Navbar.jsx';
import AuthScreen from './components/AuthScreen.jsx';
import Dashboard from './pages/Dashboard.jsx';
import { getCurrentUser, getToken, setToken } from './services/api.js';

function App() {
  const [user, setUser] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    if (!getToken()) {
      setCheckingSession(false);
      return;
    }
    getCurrentUser()
      .then((result) => setUser(result.user))
      .catch(() => setToken(null))
      .finally(() => setCheckingSession(false));
  }, []);

  function jumpToForm() {
    const form = document.getElementById('complaint-form');
    if (form) {
      form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  if (checkingSession) {
    return <div className="loading-state auth-loading"><div className="spinner" /><p>Loading CampusFix...</p></div>;
  }

  if (!user) {
    return <AuthScreen onAuthenticated={setUser} />;
  }

  function logout() {
    setToken(null);
    setUser(null);
  }

  return (
    <div className="app-shell">
      <Navbar user={user} onLogout={logout} onJumpToForm={jumpToForm} />
      <main className="main">
        <Navbar variant="top" user={user} onLogout={logout} onJumpToForm={jumpToForm} />
        <Dashboard user={user} />
      </main>
    </div>
  );
}

export default App;
