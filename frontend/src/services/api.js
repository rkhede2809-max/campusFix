const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const TOKEN_KEY = 'campusfix-token';

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

async function request(path, options = {}) {
  let response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
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

export function getComplaint(id) {
  return request(`/complaints/${id}`);
}

export function getDepartments() {
  return request('/departments');
}

export function createComplaint(payload) {
  return request('/complaints', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function updateComplaintStatus(id, status, comment = '') {
  return request(`/complaints/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, comment })
  });
}

export function assignComplaint(id, assignedTo, notes = '') {
  return request(`/complaints/${id}/assignments`, {
    method: 'POST',
    body: JSON.stringify({ assignedTo, notes })
  });
}

export function deleteComplaint(id) {
  return request(`/complaints/${id}`, {
    method: 'DELETE'
  });
}

export function submitFeedback(id, rating, comment) {
  return request(`/complaints/${id}/feedback`, {
    method: 'POST',
    body: JSON.stringify({ rating, comment })
  });
}

export function getNotifications() {
  return request('/notifications');
}

export function markNotificationRead(id) {
  return request(`/notifications/${id}/read`, { method: 'PATCH' });
}

export function markAllNotificationsRead() {
  return request('/notifications/read-all', { method: 'PATCH' });
}

export function getStaff() {
  return request('/users/staff');
}

export function getUsers() {
  return request('/users');
}

export function createUser(payload) {
  return request('/users', { method: 'POST', body: JSON.stringify(payload) });
}

export function updateUser(id, payload) {
  return request(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
}

export function deleteUser(id) {
  return request(`/users/${id}`, { method: 'DELETE' });
}

export function createDepartment(payload) {
  return request('/departments', { method: 'POST', body: JSON.stringify(payload) });
}

export function updateDepartment(id, payload) {
  return request(`/departments/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
}

export function deleteDepartment(id) {
  return request(`/departments/${id}`, { method: 'DELETE' });
}

export function signIn(payload) {
  return request('/auth/login', { method: 'POST', body: JSON.stringify(payload) });
}

export function register(payload) {
  return request('/auth/register', { method: 'POST', body: JSON.stringify(payload) });
}

export function getCurrentUser() {
  return request('/auth/me');
}

export function getHealth() {
  return request('/health');
}
