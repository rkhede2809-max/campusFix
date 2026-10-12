import { useEffect, useMemo, useState } from 'react';
import ComplaintForm from '../components/ComplaintForm.jsx';
import ComplaintList from '../components/ComplaintList.jsx';
import FilterBar from '../components/FilterBar.jsx';
import StatsCards from '../components/StatsCards.jsx';
import {
  createComplaint,
  deleteComplaint,
  getComplaints,
  updateComplaintStatus
} from '../services/api.js';

function Dashboard() {
  const [complaints, setComplaints] = useState([]);
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

  useEffect(() => {
    loadComplaints();
  }, []);

  const filteredComplaints = useMemo(() => {
    return complaints.filter((complaint) => {
      const categoryOk =
        categoryFilter === 'All' || complaint.category === categoryFilter;
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

  async function handleStatusChange(id, status) {
    setBusyId(id);
    setError('');
    setSuccess('');
    try {
      const updated = await updateComplaintStatus(id, status);
      setComplaints((current) =>
        current.map((item) => (item._id === id ? updated : item))
      );
      setSuccess('Complaint status updated.');
    } catch (updateError) {
      setError(updateError.message);
    } finally {
      setBusyId('');
    }
  }

  async function handleDelete(id) {
    const confirmed = window.confirm('Delete this complaint? This cannot be undone.');
    if (!confirmed) return;

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

  return (
    <section id="dashboard">
      <div className="page-header">
        <div>
          <h2>Campus dashboard</h2>
          <p>Track maintenance issues reported across the college campus.</p>
        </div>
        <button type="button" className="btn btn-ghost" onClick={loadComplaints}>
          Refresh
        </button>
      </div>

      {error ? <div className="banner banner-error">{error}</div> : null}
      {success ? <div className="banner banner-success">{success}</div> : null}

      <StatsCards complaints={complaints} />

      <div className="layout-grid">
        <ComplaintForm onSubmit={handleCreate} submitting={submitting} />
        <section className="panel">
          <h3>All complaints</h3>
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
            onDelete={handleDelete}
            busyId={busyId}
          />
        </section>
      </div>
    </section>
  );
}

export default Dashboard;
