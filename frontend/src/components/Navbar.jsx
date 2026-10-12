import './Navbar.css';

function Navbar({ onJumpToForm, variant = 'sidebar' }) {
  if (variant === 'top') {
    return (
      <div className="topbar">
        <div>
          <strong>CampusFix</strong>
          <p>Campus problem reporting</p>
        </div>
        <button type="button" className="btn btn-ghost" onClick={onJumpToForm}>
          New complaint
        </button>
      </div>
    );
  }

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">CF</div>
        <h1>CampusFix</h1>
        <p>Report campus problems and track their status in one place.</p>
      </div>
      <nav className="nav-links">
        <a className="active" href="#dashboard">
          Dashboard
        </a>
        <button type="button" onClick={onJumpToForm}>
          New complaint
        </button>
      </nav>
      <div className="sidebar-note">
        Use this tool for electrical, plumbing, furniture, cleanliness, and Wi-Fi issues.
      </div>
    </aside>
  );
}

export default Navbar;
