import { redirect, useFetcher, useLoaderData } from "react-router";
import type { Route } from "./+types/index";
import { fetchStudents } from "../api";

export async function loader({ request }: Route.LoaderArgs) {
  try {
    const students = await fetchStudents(request);
    return { students };
  } catch (err) {
    console.error("[dashboard loader] Failed to fetch students:", err);
    // Auth failed or network error — redirect to login
    return redirect("/");
  }
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent");
  if (intent === "logout") {
    return redirect("/", {
      headers: {
        "Set-Cookie": "auth_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0",
      },
    });
  }
  return null;
}

export default function Dashboard({ loaderData }: Route.ComponentProps) {
  const students = loaderData?.students ?? [];
  console.log(students);
  const deleteFetcher = useFetcher();

  return (
    <div className="student-list-container">
      <div className="list-header">
        <h2>Student Directory</h2>
        <div className="list-header-actions">
          <a href="/students/new" className="btn btn-primary">
            Add Student
          </a>
          <deleteFetcher.Form method="post" style={{ display: "inline" }}>
            <input type="hidden" name="intent" value="logout" />
            <button type="submit" className="btn btn-secondary">
              Logout
            </button>
          </deleteFetcher.Form>
        </div>
      </div>

      {students && students?.length === 0 ? (
        <div className="empty-state">
          <p>
            No students registered yet. Click &ldquo;Add Student&rdquo; to get
            started.
          </p>
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
                <td>
                  <a href={`/students/${student.id}`} className="student-link">
                    {student.name}
                  </a>
                </td>
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
                      {deleteFetcher.state !== "idle"
                        ? "Deleting..."
                        : "Delete"}
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
