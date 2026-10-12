const STATUSES = ['Pending', 'In Progress', 'Resolved'];

function badgeClass(status) {
  if (status === 'Resolved') return 'badge badge-resolved';
  if (status === 'In Progress') return 'badge badge-progress';
  return 'badge badge-pending';
}

function formatDate(value) {
  return new Date(value).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  });
}

function ComplaintCard({ complaint, onStatusChange, onDelete, busyId }) {
  const isBusy = busyId === complaint._id;

  return (
    <article className="complaint-card">
      <header>
        <div>
          <h4>{complaint.title}</h4>
          <p>{complaint.description}</p>
        </div>
        <span className={badgeClass(complaint.status)}>{complaint.status}</span>
      </header>
      <div className="meta">
        <span className="chip">{complaint.category}</span>
        <span className="chip">{complaint.location}</span>
        <span className="chip">{formatDate(complaint.createdAt)}</span>
      </div>
      <div className="card-actions">
        <select
          className="status-select"
          value={complaint.status}
          disabled={isBusy}
          onChange={(event) => onStatusChange(complaint._id, event.target.value)}
        >
          {STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="btn btn-danger"
          disabled={isBusy}
          onClick={() => onDelete(complaint._id)}
        >
          {isBusy ? 'Working...' : 'Delete'}
        </button>
      </div>
    </article>
  );
}

export default ComplaintCard;
