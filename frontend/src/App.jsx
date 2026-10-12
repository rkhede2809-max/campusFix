import Navbar from './components/Navbar.jsx';
import Dashboard from './pages/Dashboard.jsx';

function App() {
  function jumpToForm() {
    const form = document.getElementById('complaint-form');
    if (form) {
      form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  return (
    <div className="app-shell">
      <Navbar onJumpToForm={jumpToForm} />
      <main className="main">
        <Navbar variant="top" onJumpToForm={jumpToForm} />
        <Dashboard />
      </main>
    </div>
  );
}

export default App;
