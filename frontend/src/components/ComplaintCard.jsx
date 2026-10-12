import { useState } from 'react';
import { getComplaint, submitFeedback } from '../services/api.js';

const STATUSES = ['Pending', 'In Progress', 'Resolved'];

function badgeClass(status) {
  if (status === 'Resolved') return 'badge badge-resolved';
  if (status === 'In Progress') return 'badge badge-progress';
  return 'badge badge-pending';
}

function formatDate(value) {
  return new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function ComplaintCard({
  complaint,
  user,
  staff,
  onStatusChange,
  onAssign,
  onDelete,
  busyId
}) {
  const [details, setDetails] = useState(null);
  const [detailError, setDetailError] = useState('');
  const [detailLoading, setDetailLoading] = useState(false);
  const [note, setNote] = useState('');
  const [staffId, setStaffId] = useState('');
  const [rating, setRating] = useState(5);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [feedbackError, setFeedbackError] = useState('');
  const [feedbackBusy, setFeedbackBusy] = useState(false);
  const isBusy = busyId === complaint._id;
  const canChangeStatus = user.role === 'ADMIN' || user.role === 'STAFF';
  const canManage = user.role === 'ADMIN';
  const complaintDepartmentId = complaint.departmentId?._id || complaint.departmentId;
  const eligibleStaff = complaintDepartmentId
    ? staff.filter((person) => String(person.departmentId?._id || person.departmentId || '') === String(complaintDepartmentId))
    : staff;
  const reporterId = complaint.reportedBy?._id || complaint.reportedBy;
  const isReporter = reporterId && String(reporterId) === user._id;
  const canGiveFeedback = ['STUDENT', 'FACULTY'].includes(user.role) && isReporter && complaint.status === 'Resolved';

  async function loadDetails() {
    if (details || detailLoading) return;
    setDetailLoading(true);
    setDetailError('');
    try {
      setDetails(await getComplaint(complaint._id));
    } catch (error) {
      setDetailError(error.message);
    } finally {
      setDetailLoading(false);
    }
  }

  async function handleFeedback(event) {
    event.preventDefault();
    setFeedbackError('');
    setFeedbackBusy(true);
    try {
      const feedback = await submitFeedback(complaint._id, Number(rating), feedbackComment.trim());
      setDetails((current) => ({ ...current, feedback: { ...feedback, userId: user } }));
    } catch (error) {
      setFeedbackError(error.message);
    } finally {
      setFeedbackBusy(false);
    }
  }

  const activeAssignment = details?.currentAssignment || complaint.currentAssignment;

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
        <span className="chip">{complaint.departmentId?.name || 'Unassigned department'}</span>
        <span className="chip">{complaint.location}</span>
        {complaint.priority ? <span className="chip">Priority: {complaint.priority}</span> : null}
        <span className="chip">{formatDate(complaint.createdAt)}</span>
        {complaint.reportedBy?.name ? <span className="chip">Reported by {complaint.reportedBy.name}</span> : null}
      </div>
      {activeAssignment ? (
        <p className="assigned-line">Assigned to <strong>{activeAssignment.assignedTo?.name || 'Staff member'}</strong> · {activeAssignment.status}</p>
      ) : null}
      <div className="card-actions">
        {canChangeStatus ? (
          <select
            className="status-select"
            aria-label={`Update status for ${complaint.title}`}
            value={complaint.status}
            disabled={isBusy}
            onChange={(event) => onStatusChange(complaint._id, event.target.value, note)}
          >
            {STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
        ) : null}
        {canManage ? (
          <>
            <select aria-label={`Choose staff for ${complaint.title}`} value={staffId} onChange={(event) => setStaffId(event.target.value)}>
              <option value="">{eligibleStaff.length ? 'Assign staff...' : 'No staff in this department'}</option>
              {eligibleStaff.map((person) => <option key={person._id} value={person._id}>{person.name}</option>)}
            </select>
            <button type="button" className="btn btn-ghost" disabled={!staffId || isBusy} onClick={() => onAssign(complaint._id, staffId)}>Assign / reassign</button>
            <button type="button" className="btn btn-danger" disabled={isBusy} onClick={() => onDelete(complaint._id)}>{isBusy ? 'Working...' : 'Delete'}</button>
          </>
        ) : null}
      </div>
      {canChangeStatus ? (
        <label className="comment-input">
          Repair progress comment
          <input value={note} maxLength="1000" onChange={(event) => setNote(event.target.value)} placeholder="Optional update for the reporter" />
        </label>
      ) : null}
      <details className="complaint-details" onToggle={(event) => { if (event.currentTarget.open) loadDetails(); }}>
        <summary>Details, history{canGiveFeedback ? ' & feedback' : ''}</summary>
        {detailLoading ? <p className="detail-message">Loading complaint details...</p> : null}
        {detailError ? <p className="inline-error">{detailError}</p> : null}
        {details ? (
          <div className="detail-content">
            {details.currentAssignment ? (
              <p><strong>Current assignee:</strong> {details.currentAssignment.assignedTo?.name} ({details.currentAssignment.assignedTo?.email})</p>
            ) : <p><strong>Current assignee:</strong> Not assigned</p>}
            {details.assignments?.length ? (
              <>
                <h5>Assignment history</h5>
                <ul className="assignment-history">
                  {details.assignments.map((assignment) => (
                    <li key={assignment._id}>
                      <strong>{assignment.assignedTo?.name || 'Staff member'} · {assignment.status}</strong>
                      <span>Assigned by {assignment.assignedBy?.name || 'Administrator'} · {formatDate(assignment.assignedAt)}</span>
                      {assignment.notes ? <p>{assignment.notes}</p> : null}
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
            <h5>Status timeline</h5>
            {details.history?.length ? (
              <ol className="timeline">
                {details.history.map((item) => (
                  <li key={item._id}>
                    <strong>{item.oldStatus ? `${item.oldStatus} → ${item.newStatus}` : `Submitted · ${item.newStatus}`}</strong>
                    <span>{item.changedBy?.name || 'System'} · {formatDate(item.changedAt)}</span>
                    {item.comment ? <p>{item.comment}</p> : null}
                  </li>
                ))}
              </ol>
            ) : <p className="detail-message">No status history yet.</p>}
            {details.feedback ? (
              <div className="feedback-result">
                <h5>Resolution feedback</h5>
                <strong>{'★'.repeat(details.feedback.rating)}{'☆'.repeat(5 - details.feedback.rating)} ({details.feedback.rating}/5)</strong>
                {details.feedback.comment ? <p>{details.feedback.comment}</p> : null}
              </div>
            ) : canGiveFeedback ? (
              <form className="feedback-form" onSubmit={handleFeedback}>
                <h5>Rate the resolution</h5>
                {feedbackError ? <p className="inline-error">{feedbackError}</p> : null}
                <label>Rating
                  <select value={rating} onChange={(event) => setRating(event.target.value)}>
                    {[5, 4, 3, 2, 1].map((value) => <option key={value} value={value}>{value} / 5</option>)}
                  </select>
                </label>
                <label>Comment
                  <textarea maxLength="1000" value={feedbackComment} onChange={(event) => setFeedbackComment(event.target.value)} placeholder="Tell us how the resolution went (optional)" />
                </label>
                <button className="btn btn-primary" disabled={feedbackBusy} type="submit">{feedbackBusy ? 'Submitting...' : 'Submit feedback'}</button>
              </form>
            ) : null}
          </div>
        ) : null}
      </details>
    </article>
  );
}

export default ComplaintCard;
