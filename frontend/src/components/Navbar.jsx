import './Navbar.css';
import NotificationBell from './NotificationBell.jsx';

function Navbar({ onJumpToForm, user, onLogout, variant = 'sidebar' }) {
  if (variant === 'top') {
    return (
      <div className="topbar">
        <div>
          <strong>CampusFix</strong>
          <p>{user.name} · {user.role}</p>
        </div>
        <div className="topbar-actions">
          {['STUDENT', 'FACULTY'].includes(user.role) ? <button type="button" className="btn btn-ghost" onClick={onJumpToForm}>New complaint</button> : null}
          <NotificationBell />
          <button type="button" className="btn btn-ghost" onClick={onLogout}>Sign out</button>
        </div>
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
          {user.role === 'ADMIN' ? 'All complaints' : user.role === 'STAFF' ? 'Assigned to me' : 'My complaints'}
        </a>
        {['STUDENT', 'FACULTY'].includes(user.role) ? <button type="button" onClick={onJumpToForm}>New complaint</button> : null}
      </nav>
      <div className="sidebar-user">
        <strong>{user.name}</strong>
        <span>{user.role}</span>
        <NotificationBell />
        <button type="button" className="sidebar-signout" onClick={onLogout}>Sign out</button>
      </div>
      <div className="sidebar-note">
        Use this tool for electrical, plumbing, furniture, cleanliness, and Wi-Fi issues.
      </div>
    </aside>
  );
}

export default Navbar;
