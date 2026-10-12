const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

async function request(path, options = {}) {
  let response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      },
      ...options
    });
  } catch (_error) {
    throw new Error(
      'Cannot reach the CampusFix server. Start the backend on port 5000 and check VITE_API_URL.'
    );
  }

  let data = {};
  const text = await response.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch (_error) {
      throw new Error('The server sent an unexpected response.');
    }
  }

  if (!response.ok) {
    throw new Error(data.message || 'Request failed. Please try again.');
  }

  return data;
}

export function getComplaints() {
  return request('/complaints');
}

export function createComplaint(payload) {
  return request('/complaints', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function updateComplaintStatus(id, status) {
  return request(`/complaints/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status })
  });
}

export function deleteComplaint(id) {
  return request(`/complaints/${id}`, {
    method: 'DELETE'
  });
}

export function getHealth() {
  return request('/health');
}
