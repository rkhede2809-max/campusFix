import { useState } from 'react';

function AdminTools({ departments, users, onCreateDepartment, onUpdateDepartment, onDeleteDepartment, onCreateUser, onUpdateUser, onDeleteUser }) {
  const [departmentForm, setDepartmentForm] = useState({ name: '', description: '', contactEmail: '' });
  const [userForm, setUserForm] = useState({ name: '', email: '', password: '', role: 'STAFF', departmentId: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);

  async function perform(action, message) {
    setError('');
    setSuccess('');
    setBusy(true);
    try {
      await action();
      setSuccess(message);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  async function submitDepartment(event) {
    event.preventDefault();
    await perform(async () => {
      await onCreateDepartment(departmentForm);
      setDepartmentForm({ name: '', description: '', contactEmail: '' });
    }, 'Department created.');
  }

  async function submitUser(event) {
    event.preventDefault();
    await perform(async () => {
      await onCreateUser(userForm);
      setUserForm({ name: '', email: '', password: '', role: 'STAFF', departmentId: '' });
    }, 'User created.');
  }

  async function editDepartment(department) {
    const name = window.prompt('Department name', department.name);
    if (name === null) return;
    const description = window.prompt('Department description', department.description || '');
    if (description === null) return;
    const contactEmail = window.prompt('Department contact email', department.contactEmail || '');
    if (contactEmail === null) return;
    await perform(() => onUpdateDepartment(department._id, { name, description, contactEmail }), 'Department updated.');
  }

  return (
    <section className="admin-tools">
      {error ? <div className="banner banner-error">{error}</div> : null}
      {success ? <div className="banner banner-success">{success}</div> : null}
      <div className="admin-tools-grid">
        <section className="panel">
          <h3>Departments</h3>
          <form onSubmit={submitDepartment}>
            <div className="form-group"><label htmlFor="department-name">Name</label><input id="department-name" required minLength="2" maxLength="100" value={departmentForm.name} onChange={(event) => setDepartmentForm({ ...departmentForm, name: event.target.value })} /></div>
            <div className="form-group"><label htmlFor="department-description">Description</label><textarea id="department-description" maxLength="500" value={departmentForm.description} onChange={(event) => setDepartmentForm({ ...departmentForm, description: event.target.value })} /></div>
            <div className="form-group"><label htmlFor="department-email">Contact email</label><input id="department-email" type="email" value={departmentForm.contactEmail} onChange={(event) => setDepartmentForm({ ...departmentForm, contactEmail: event.target.value })} /></div>
            <button className="btn btn-primary" disabled={busy} type="submit">Add department</button>
          </form>
          <ul className="management-list">
            {departments.map((department) => (
              <li key={department._id}>
                <span><strong>{department.name}</strong><small>{department.contactEmail || 'No contact email'}</small></span>
                <div>
                  <button className="text-button" type="button" onClick={() => editDepartment(department)}>Edit</button>
                  <button className="text-button danger-text" type="button" onClick={() => window.confirm(`Delete ${department.name}?`) && perform(() => onDeleteDepartment(department._id), 'Department deleted.')}>Delete</button>
                </div>
              </li>
            ))}
          </ul>
        </section>
        <section className="panel">
          <h3>Users</h3>
          <form onSubmit={submitUser}>
            <div className="form-group"><label htmlFor="user-name">Full name</label><input id="user-name" required minLength="2" maxLength="100" value={userForm.name} onChange={(event) => setUserForm({ ...userForm, name: event.target.value })} /></div>
            <div className="form-group"><label htmlFor="user-email">Email</label><input id="user-email" type="email" required value={userForm.email} onChange={(event) => setUserForm({ ...userForm, email: event.target.value })} /></div>
            <div className="form-group"><label htmlFor="user-password">Temporary password</label><input id="user-password" type="password" required minLength="10" maxLength="128" value={userForm.password} onChange={(event) => setUserForm({ ...userForm, password: event.target.value })} /></div>
            <div className="form-group"><label htmlFor="user-role">Role</label><select id="user-role" value={userForm.role} onChange={(event) => setUserForm({ ...userForm, role: event.target.value })}>{['STUDENT', 'FACULTY', 'STAFF', 'ADMIN'].map((role) => <option key={role}>{role}</option>)}</select></div>
            <div className="form-group"><label htmlFor="user-department">Department (optional)</label><select id="user-department" value={userForm.departmentId} onChange={(event) => setUserForm({ ...userForm, departmentId: event.target.value })}><option value="">No department</option>{departments.map((department) => <option key={department._id} value={department._id}>{department.name}</option>)}</select></div>
            <button className="btn btn-primary" disabled={busy} type="submit">Create user</button>
          </form>
          <ul className="management-list">
            {users.map((person) => (
              <li key={person._id}>
                <span><strong>{person.name}</strong><small>{person.email}</small></span>
                <div>
                  <select aria-label={`Role for ${person.name}`} value={person.role} onChange={(event) => perform(() => onUpdateUser(person._id, { role: event.target.value }), 'User role updated.')}>
                    {['STUDENT', 'FACULTY', 'STAFF', 'ADMIN'].map((role) => <option key={role}>{role}</option>)}
                  </select>
                  <button className="text-button danger-text" type="button" onClick={() => window.confirm(`Delete ${person.name}?`) && perform(() => onDeleteUser(person._id), 'User deleted.')}>Delete</button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </section>
  );
}

export default AdminTools;
