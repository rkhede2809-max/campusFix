import ComplaintCard from './ComplaintCard.jsx';

function ComplaintList({ complaints, loading, loadFailed, onStatusChange, onDelete, busyId }) {
  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner" />
        <p>Loading complaints...</p>
      </div>
    );
  }

  if (loadFailed) {
    return (
      <div className="empty-state">
        <h4>Complaints could not be loaded</h4>
        <p>Start the backend and click Refresh after MongoDB is connected.</p>
      </div>
    );
  }

  if (complaints.length === 0) {
    return (
      <div className="empty-state">
        <h4>No complaints found</h4>
        <p>Submit a new complaint or change the category and status filters.</p>
      </div>
    );
  }

  return (
    <div className="complaint-grid">
      {complaints.map((complaint) => (
        <ComplaintCard
          key={complaint._id}
          complaint={complaint}
          onStatusChange={onStatusChange}
          onDelete={onDelete}
          busyId={busyId}
        />
      ))}
    </div>
  );
}

export default ComplaintList;
