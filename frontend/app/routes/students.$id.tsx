import { Form, redirect, useFetcher, useLoaderData, useNavigation } from "react-router";
import type { Route } from "./+types/students.$id";
import { fetchStudent, fetchNotes, createNote, deleteStudent, isAuthenticated } from "../api";
import { useEffect, useState } from "react";

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  if (!isAuthenticated()) {
    return redirect("/login");
  }
  const student = await fetchStudent(params.id);
  const notes = await fetchNotes(params.id);
  return { student, notes };
}

export async function clientAction({ request, params }: Route.ClientActionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "delete") {
    await deleteStudent(params.id);
    return redirect("/dashboard");
  }

  if (intent === "add-note") {
    const content = formData.get("content") as string;
    if (content && content.trim()) {
      await createNote(params.id, content.trim());
    }
    return null;
  }

  return null;
}

export default function StudentDetail({ loaderData }: Route.ComponentProps) {
  const { student, notes } = loaderData;
  const navigation = useNavigation();
  const noteFetcher = useFetcher();
  const deleteFetcher = useFetcher();
  const isSubmitting = navigation.state === "submitting";

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
                  "Are you sure you want to delete this student and all associated notes?"
                )
              ) {
                e.preventDefault();
              }
            }}
          >
            {deleteFetcher.state !== "idle"
              ? "Deleting..."
              : "Delete Student"}
          </button>
        </deleteFetcher.Form>
      </div>
    </div>
  );
}
