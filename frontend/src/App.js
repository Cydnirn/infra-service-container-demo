import {
  createBrowserRouter,
  useFetcher,
  useLoaderData,
  Outlet,
  useNavigation,
  redirect,
} from "react-router";

const API_URL =
  import.meta.env.REACT_APP_API_URL ||
  import.meta.env.VITE_API_URL ||
  "http://localhost:8080";

async function fetchStudents() {
  const res = await fetch(`${API_URL}/students`);
  if (!res.ok) throw new Error("Failed to fetch students");
  return res.json();
}

async function fetchStudent(id) {
  const res = await fetch(`${API_URL}/students/${id}`);
  if (!res.ok) throw new Error("Failed to fetch student");
  return res.json();
}

async function createStudent(data) {
  const res = await fetch(`${API_URL}/students`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create student");
  return res.json();
}

async function updateStudent(id, data) {
  const res = await fetch(`${API_URL}/students/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update student");
  return res.json();
}

async function deleteStudent(id) {
  const res = await fetch(`${API_URL}/students/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete student");
}

function Layout() {
  const navigation = useNavigation();
  const isLoading = navigation.state === "loading";

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Student Management System</h1>
      </header>
      <main className="app-main">
        {isLoading && <div className="loading-bar" />}
        <Outlet />
      </main>
    </div>
  );
}

function StudentList() {
  const students = useLoaderData();
  const deleteFetcher = useFetcher();

  return (
    <div className="student-list-container">
      <div className="list-header">
        <h2>Students</h2>
        <a href="/students/new" className="btn btn-primary">
          Add Student
        </a>
      </div>

      {students.length === 0 ? (
        <div className="empty-state">
          <p>No students registered yet. Click "Add Student" to get started.</p>
        </div>
      ) : (
        <table className="student-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Age</th>
              <th>Major</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <tr key={student.id}>
                <td>{student.name}</td>
                <td>{student.age}</td>
                <td>{student.major}</td>
                <td className="actions-cell">
                  <a
                    href={`/students/${student.id}/edit`}
                    className="btn btn-small btn-secondary"
                  >
                    Edit
                  </a>
                  <deleteFetcher.Form
                    method="post"
                    action={`/students/${student.id}/delete`}
                    style={{ display: "inline" }}
                  >
                    <button
                      type="submit"
                      className="btn btn-small btn-danger"
                      disabled={deleteFetcher.state !== "idle"}
                    >
                      {deleteFetcher.state !== "idle" ? "..." : "Delete"}
                    </button>
                  </deleteFetcher.Form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function StudentForm() {
  const { student, isEdit } = useLoaderData();
  const fetcher = useFetcher();
  const isSubmitting = fetcher.state !== "idle";

  return (
    <div className="student-form-container">
      <h2>{isEdit ? "Edit Student" : "Add New Student"}</h2>

      <fetcher.Form method="post" className="student-form">
        <div className="form-group">
          <label htmlFor="name">Name</label>
          <input
            type="text"
            id="name"
            name="name"
            defaultValue={student?.name || ""}
            required
            disabled={isSubmitting}
          />
        </div>

        <div className="form-group">
          <label htmlFor="age">Age</label>
          <input
            type="number"
            id="age"
            name="age"
            defaultValue={student?.age || ""}
            min="1"
            max="120"
            required
            disabled={isSubmitting}
          />
        </div>

        <div className="form-group">
          <label htmlFor="major">Major</label>
          <input
            type="text"
            id="major"
            name="major"
            defaultValue={student?.major || ""}
            required
            disabled={isSubmitting}
          />
        </div>

        <div className="form-actions">
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSubmitting}
          >
            {isSubmitting
              ? "Saving..."
              : isEdit
                ? "Update Student"
                : "Create Student"}
          </button>
          <a href="/" className="btn btn-secondary">
            Cancel
          </a>
        </div>
      </fetcher.Form>
    </div>
  );
}

export const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      {
        path: "/",
        loader: async () => {
          return fetchStudents();
        },
        Component: StudentList,
      },
      {
        path: "/students/new",
        loader: () => {
          return { student: null, isEdit: false };
        },
        action: async ({ request }) => {
          const formData = await request.formData();
          const student = {
            name: formData.get("name"),
            age: parseInt(formData.get("age"), 10),
            major: formData.get("major"),
          };
          await createStudent(student);
          return redirect("/");
        },
        Component: StudentForm,
      },
      {
        path: "/students/:id/edit",
        loader: async ({ params }) => {
          const student = await fetchStudent(params.id);
          return { student, isEdit: true };
        },
        action: async ({ request, params }) => {
          const formData = await request.formData();
          const student = {
            name: formData.get("name"),
            age: parseInt(formData.get("age"), 10),
            major: formData.get("major"),
          };
          await updateStudent(params.id, student);
          return redirect("/");
        },
        Component: StudentForm,
      },
      {
        path: "/students/:id/delete",
        action: async ({ params }) => {
          await deleteStudent(params.id);
          return redirect("/");
        },
      },
    ],
  },
]);
