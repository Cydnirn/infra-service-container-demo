const API_URL = (() => {
  if (typeof window !== "undefined" && window.__REACT_APP_API_URL__) {
    return window.__REACT_APP_API_URL__;
  }
  return "http://localhost:8080";
})();

export async function fetchStudents() {
  const res = await fetch(`${API_URL}/students`);
  if (!res.ok) throw new Error("Failed to fetch students");
  return res.json();
}

export async function fetchStudent(id) {
  const res = await fetch(`${API_URL}/students/${id}`);
  if (!res.ok) throw new Error("Failed to fetch student");
  return res.json();
}

export async function createStudent(data) {
  const res = await fetch(`${API_URL}/students`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create student");
  return res.json();
}

export async function updateStudent(id, data) {
  const res = await fetch(`${API_URL}/students/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update student");
  return res.json();
}

export async function deleteStudent(id) {
  const res = await fetch(`${API_URL}/students/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete student");
}
