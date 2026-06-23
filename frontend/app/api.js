// All API calls happen server-side in SSR mode.
// The React Router server runs inside the EKS cluster and can reach
// the backend Service via Kubernetes DNS at http://student-backend:8080.
//
// Auth token is passed via cookies (HttpOnly) — never reaches the browser.

const API_URL = (() => {
  if (typeof process !== "undefined" && process.env.API_URL) {
    return process.env.API_URL;
  }
  return "http://student-backend:8080";
})();

// ── Cookie helpers ────────────────────────────────────────

function getAuthToken(request) {
  const cookie = request?.headers?.get("Cookie") || "";
  const match = cookie.match(/(?:^|;\s*)auth_token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function getAuthHeaders(request) {
  const token = getAuthToken(request);
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

// ── Auth ────────────────────────────────────────────────────

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
  return res.json(); // { token, message }
}

// ── Students (RDS) ──────────────────────────────────────────

export async function fetchStudents(request) {
  const res = await fetch(`${API_URL}/students`, {
    headers: getAuthHeaders(request),
  });
  if (!res.ok) throw new Error("Failed to fetch students");
  return res.json();
}

export async function fetchStudent(id, request) {
  const res = await fetch(`${API_URL}/students/${id}`, {
    headers: getAuthHeaders(request),
  });
  if (!res.ok) throw new Error("Failed to fetch student");
  return res.json();
}

export async function createStudent(data, request) {
  const res = await fetch(`${API_URL}/students`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders(request) },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create student");
  return res.json();
}

export async function updateStudent(id, data, request) {
  const res = await fetch(`${API_URL}/students/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...getAuthHeaders(request) },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update student");
  return res.json();
}

export async function deleteStudent(id, request) {
  const res = await fetch(`${API_URL}/students/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(request),
  });
  if (!res.ok) throw new Error("Failed to delete student");
}

// ── Notes (DocumentDB) ──────────────────────────────────────

export async function fetchNotes(studentId, request) {
  const res = await fetch(`${API_URL}/students/${studentId}/notes`, {
    headers: getAuthHeaders(request),
  });
  if (!res.ok) throw new Error("Failed to fetch notes");
  return res.json();
}

export async function createNote(studentId, content, request) {
  const res = await fetch(`${API_URL}/students/${studentId}/notes`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders(request) },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) throw new Error("Failed to create note");
  return res.json();
}
