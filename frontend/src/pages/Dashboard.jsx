import { useEffect, useMemo, useState } from 'react';
import ComplaintForm from '../components/ComplaintForm.jsx';
import ComplaintList from '../components/ComplaintList.jsx';
import FilterBar from '../components/FilterBar.jsx';
import StatsCards from '../components/StatsCards.jsx';
import AdminTools from '../components/AdminTools.jsx';
import {
  assignComplaint,
  createComplaint,
  createDepartment,
  createUser,
  deleteComplaint,
  deleteDepartment,
  deleteUser,
  getComplaints,
  getDepartments,
  getStaff,
  getUsers,
  updateComplaintStatus,
  updateDepartment,
  updateUser
} from '../services/api.js';

function Dashboard({ user }) {
  const [complaints, setComplaints] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [staff, setStaff] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loadFailed, setLoadFailed] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  async function loadComplaints() {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const data = await getComplaints();
      setComplaints(data);
      setLoadFailed(false);
    } catch (loadError) {
      setError(loadError.message);
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  }

  async function loadSupportingData() {
    try {
      setDepartments(await getDepartments());
      if (user.role === 'ADMIN') {
        const [staffList, userList] = await Promise.all([getStaff(), getUsers()]);
        setStaff(staffList);
        setUsers(userList);
      }
    } catch (loadError) {
      setError(loadError.message);
    }
  }

  useEffect(() => {
    loadComplaints();
    loadSupportingData();
  }, [user._id, user.role]);

  const filteredComplaints = useMemo(() => {
    return complaints.filter((complaint) => {
      const categoryOk = categoryFilter === 'All' || complaint.category === categoryFilter;
      const statusOk = statusFilter === 'All' || complaint.status === statusFilter;
      return categoryOk && statusOk;
    });
  }, [complaints, categoryFilter, statusFilter]);

  async function handleCreate(payload) {
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const created = await createComplaint(payload);
      setComplaints((current) => [created, ...current]);
      setLoadFailed(false);
      setSuccess('Complaint submitted successfully.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStatusChange(id, status, comment) {
    setBusyId(id);
    setError('');
    setSuccess('');
    try {
      const updated = await updateComplaintStatus(id, status, comment);
      setComplaints((current) => current.map((item) => (item._id === id ? updated : item)));
      setSuccess('Complaint status updated.');
    } catch (updateError) {
      setError(updateError.message);
    } finally {
      setBusyId('');
    }
  }

  async function handleAssign(id, assignedTo) {
    setBusyId(id);
    setError('');
    setSuccess('');
    try {
      await assignComplaint(id, assignedTo);
      await loadComplaints();
      setSuccess('Complaint assigned successfully.');
    } catch (assignError) {
      setError(assignError.message);
    } finally {
      setBusyId('');
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this complaint and its history, assignments, and feedback? This cannot be undone.')) return;
    setBusyId(id);
    setError('');
    setSuccess('');
    try {
      await deleteComplaint(id);
      setComplaints((current) => current.filter((item) => item._id !== id));
      setSuccess('Complaint deleted.');
    } catch (deleteError) {
      setError(deleteError.message);
    } finally {
      setBusyId('');
    }
  }

  async function refreshDepartments() {
    setDepartments(await getDepartments());
  }

  async function refreshUsers() {
    const [staffList, userList] = await Promise.all([getStaff(), getUsers()]);
    setStaff(staffList);
    setUsers(userList);
  }

  return (
    <section id="dashboard">
      <div className="page-header">
        <div>
          <h2>{user.role === 'ADMIN' ? 'Campus dashboard' : user.role === 'STAFF' ? 'Assigned complaints' : 'My complaints'}</h2>
          <p>{user.role === 'ADMIN' ? 'Monitor and manage campus maintenance issues.' : user.role === 'STAFF' ? 'Update repair progress for complaints assigned to you.' : 'Track maintenance issues you have reported.'}</p>
        </div>
        <button type="button" className="btn btn-ghost" onClick={loadComplaints}>Refresh</button>
      </div>

      {error ? <div className="banner banner-error">{error}</div> : null}
      {success ? <div className="banner banner-success">{success}</div> : null}

      <StatsCards complaints={complaints} />

      <div className={`layout-grid ${['STUDENT', 'FACULTY'].includes(user.role) ? '' : 'single-column'}`}>
        {['STUDENT', 'FACULTY'].includes(user.role) ? (
          <ComplaintForm onSubmit={handleCreate} submitting={submitting} departments={departments} />
        ) : null}
        <section className="panel complaints-panel">
          <h3>{user.role === 'ADMIN' ? 'All complaints' : user.role === 'STAFF' ? 'Assigned to me' : 'My complaints'}</h3>
          <FilterBar
            category={categoryFilter}
            status={statusFilter}
            onCategoryChange={setCategoryFilter}
            onStatusChange={setStatusFilter}
          />
          <ComplaintList
            complaints={filteredComplaints}
            loading={loading}
            loadFailed={loadFailed}
            onStatusChange={handleStatusChange}
            onAssign={handleAssign}
            onDelete={handleDelete}
            busyId={busyId}
            user={user}
            staff={staff}
          />
        </section>
      </div>

      {user.role === 'ADMIN' ? (
        <section className="management-section">
          <div className="page-header"><div><h2>Administration</h2><p>Manage campus service departments and user accounts.</p></div></div>
          <AdminTools
            departments={departments}
            users={users}
            onCreateDepartment={async (payload) => { await createDepartment(payload); await refreshDepartments(); }}
            onUpdateDepartment={async (id, payload) => { await updateDepartment(id, payload); await refreshDepartments(); }}
            onDeleteDepartment={async (id) => { await deleteDepartment(id); await refreshDepartments(); }}
            onCreateUser={async (payload) => { await createUser(payload); await refreshUsers(); }}
            onUpdateUser={async (id, payload) => { await updateUser(id, payload); await refreshUsers(); }}
            onDeleteUser={async (id) => { await deleteUser(id); await refreshUsers(); }}
          />
        </section>
      ) : null}
    </section>
  );
}

export default Dashboard;
