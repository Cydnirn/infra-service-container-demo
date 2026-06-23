import { useFetcher, useLoaderData } from "react-router";
import type { Route } from "./+types/index";
import { fetchStudents } from "../api";

export async function clientLoader() {
  const students = await fetchStudents();
  return { students };
}

export default function StudentList({ loaderData }: Route.ComponentProps) {
  const { students } = loaderData;
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
                      {deleteFetcher.state !== "idle" ? "Deleting..." : "Delete"}
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
