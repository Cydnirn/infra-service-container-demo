const API_URL = (() => {
  if (typeof window !== "undefined" && window.__REACT_APP_API_URL__) {
    return window.__REACT_APP_API_URL__;
  }
  return "http://localhost:8080";
})();

function getAuthHeaders() {
  const token = localStorage.getItem("auth_token");
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

// ── Auth ────────────────────────────────────────────────────

export function getAuthToken() {
  return localStorage.getItem("auth_token");
}

export function setAuthToken(token) {
  localStorage.setItem("auth_token", token);
}

export function clearAuthToken() {
  localStorage.removeItem("auth_token");
}

export function isAuthenticated() {
  return !!localStorage.getItem("auth_token");
}

export async function login(username, password) {
  const res = await fetch(`${API_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Login failed");
  }
  const data = await res.json();
  setAuthToken(data.token);
  return data;
}

export async function logout() {
  clearAuthToken();
}

// ── Students (RDS) ──────────────────────────────────────────

export async function fetchStudents() {
  const res = await fetch(`${API_URL}/students`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch students");
  return res.json();
}

export async function fetchStudent(id) {
  const res = await fetch(`${API_URL}/students/${id}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch student");
  return res.json();
}

export async function createStudent(data) {
  const res = await fetch(`${API_URL}/students`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create student");
  return res.json();
}

export async function updateStudent(id, data) {
  const res = await fetch(`${API_URL}/students/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update student");
  return res.json();
}

export async function deleteStudent(id) {
  const res = await fetch(`${API_URL}/students/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to delete student");
}

// ── Notes (DocumentDB) ──────────────────────────────────────

export async function fetchNotes(studentId) {
  const res = await fetch(`${API_URL}/students/${studentId}/notes`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch notes");
  return res.json();
}

export async function createNote(studentId, content) {
  const res = await fetch(`${API_URL}/students/${studentId}/notes`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) throw new Error("Failed to create note");
  return res.json();
}
