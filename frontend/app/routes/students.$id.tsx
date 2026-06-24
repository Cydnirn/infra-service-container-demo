import {
  redirect,
  useFetcher,
  useLoaderData,
  useRevalidator,
} from "react-router";
import { useEffect, useRef } from "react";
import type { Route } from "./+types/students.$id";
import { fetchStudent, fetchNotes, createNote, deleteStudent } from "../api";

export async function loader({ params, request }: Route.LoaderArgs) {
  try {
    const [student, notes] = await Promise.all([
      fetchStudent(params.id, request),
      fetchNotes(params.id, request),
    ]);
    return { student, notes };
  } catch (err) {
    console.error("[student detail loader] Failed:", err);
    return redirect("/");
  }
}

export async function action({ request, params }: Route.ActionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "delete") {
    await deleteStudent(params.id, request);
    return redirect("/dashboard");
  }

  if (intent === "add-note") {
    const content = formData.get("content") as string;
    if (content && content.trim()) {
      await createNote(params.id, content.trim(), request);
    }
    return { ok: true };
  }

  return null;
}

export default function StudentDetail({ loaderData }: Route.ComponentProps) {
  const student = loaderData?.student ?? {
    id: "",
    name: "",
    age: 0,
    major: "",
  };
  const notes = loaderData?.notes ?? [];
  const noteFetcher = useFetcher();
  const deleteFetcher = useFetcher();
  const revalidator = useRevalidator();
  console.log(notes);

  // When the note fetcher completes, re-run the loader to
  // fetch the updated notes from DocumentDB.
  const prevState = useRef(noteFetcher.state);
  useEffect(() => {
    if (prevState.current === "submitting" && noteFetcher.state === "idle") {
      revalidator.revalidate();
    }
    prevState.current = noteFetcher.state;
  }, [noteFetcher.state, revalidator]);

  return (
    <div className="student-detail-container">
      <div className="detail-header">
        <a href="/dashboard" className="btn btn-secondary btn-small">
          &larr; Back
        </a>
        <h2>{student.name}</h2>
        <div className="detail-header-actions">
          <a
            href={`/students/${student.id}/edit`}
            className="btn btn-small btn-secondary"
          >
            Edit
          </a>
        </div>
      </div>

      <div className="student-info-card">
        <h3>Student Information</h3>
        <div className="info-grid">
          <div className="info-item">
            <span className="info-label">ID</span>
            <span className="info-value">{student.id}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Name</span>
            <span className="info-value">{student.name}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Age</span>
            <span className="info-value">{student.age}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Major</span>
            <span className="info-value">{student.major}</span>
          </div>
        </div>
      </div>

      <div className="notes-section">
        <h3>Academic Notes / Remarks</h3>

        <noteFetcher.Form method="post" className="note-form">
          <input type="hidden" name="intent" value="add-note" />
          <div className="note-input-group">
            <textarea
              name="content"
              placeholder="Add a new academic remark..."
              rows={3}
              required
              disabled={noteFetcher.state !== "idle"}
            />
            <button
              type="submit"
              className="btn btn-primary btn-small"
              disabled={noteFetcher.state !== "idle"}
            >
              {noteFetcher.state !== "idle" ? "Adding..." : "Add Note"}
            </button>
          </div>
        </noteFetcher.Form>

        {notes.length === 0 ? (
          <div className="empty-notes">
            <p>No academic remarks recorded yet.</p>
          </div>
        ) : (
          <div className="notes-list">
            {notes.map((note) => (
              <div key={note.id} className="note-card">
                <p className="note-content">{note.content}</p>
                <span className="note-date">
                  {new Date(note.created_at).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="detail-footer">
        <deleteFetcher.Form method="post" className="delete-form">
          <input type="hidden" name="intent" value="delete" />
          <button
            type="submit"
            className="btn btn-danger"
            disabled={deleteFetcher.state !== "idle"}
            onClick={(e) => {
              if (
                !confirm(
                  "Are you sure you want to delete this student and all associated notes?",
                )
              ) {
                e.preventDefault();
              }
            }}
          >
            {deleteFetcher.state !== "idle" ? "Deleting..." : "Delete Student"}
          </button>
        </deleteFetcher.Form>
      </div>
    </div>
  );
}
