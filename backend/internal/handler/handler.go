// Package handler wires HTTP routes to the domain stores and exposes
// a single RegisterRoutes method that attaches all endpoints to a ServeMux.
// Authentication is handled by Amazon Cognito JWTs validated in middleware.
// Note content is encrypted/decrypted via AWS KMS before storage/retrieval.
package handler

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"

	"github.com/google/uuid"

	"student-backend/internal/auth"
	"student-backend/internal/crypto"
	"student-backend/internal/docdb"
	"student-backend/internal/httputil"
	"student-backend/internal/models"
	"student-backend/internal/postgres"
)

// Server holds references to all data stores and services needed by handlers.
type Server struct {
	PG        *postgres.Store
	DocDB     *docdb.Store
	Encryptor *crypto.Encryptor
	Auth      *auth.CognitoAuth
}

// RegisterRoutes attaches all API endpoints to the provided ServeMux.
func (s *Server) RegisterRoutes(mux *http.ServeMux) {
	// ── Health (public, no auth) ────────────────────────────
	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"ok"}`))
	})

	// ── Students (RDS) ──────────────────────────────────────
	mux.HandleFunc("GET /students", s.Auth.Middleware(s.handleListStudents))
	mux.HandleFunc("GET /students/{id}", s.Auth.Middleware(s.handleGetStudent))
	mux.HandleFunc("POST /students", s.Auth.Middleware(s.handleCreateStudent))
	mux.HandleFunc("PUT /students/{id}", s.Auth.Middleware(s.handleUpdateStudent))
	mux.HandleFunc("DELETE /students/{id}", s.Auth.Middleware(s.handleDeleteStudent))

	// ── Notes (DocumentDB + KMS) ────────────────────────────
	mux.HandleFunc("GET /students/{id}/notes", s.Auth.Middleware(s.handleListNotes))
	mux.HandleFunc("POST /students/{id}/notes", s.Auth.Middleware(s.handleCreateNote))
}

// ── Student handlers (RDS) ───────────────────────────────────

func (s *Server) handleListStudents(w http.ResponseWriter, r *http.Request) {
	students, err := s.PG.List(r.Context())
	if err != nil {
		httputil.WriteError(w, http.StatusInternalServerError,
			"failed to list students: "+err.Error())
		return
	}
	httputil.WriteJSON(w, http.StatusOK, students)
}

func (s *Server) handleGetStudent(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	st, err := s.PG.Get(r.Context(), id)
	if err != nil {
		httputil.WriteError(w, http.StatusNotFound, "student not found")
		return
	}
	httputil.WriteJSON(w, http.StatusOK, st)
}

func (s *Server) handleCreateStudent(w http.ResponseWriter, r *http.Request) {
	var st models.Student
	if err := json.NewDecoder(r.Body).Decode(&st); err != nil {
		httputil.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	st.ID = uuid.New().String()
	if err := s.PG.Create(r.Context(), st); err != nil {
		httputil.WriteError(w, http.StatusInternalServerError,
			"failed to create student: "+err.Error())
		return
	}
	httputil.WriteJSON(w, http.StatusCreated, st)
}

func (s *Server) handleUpdateStudent(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	var st models.Student
	if err := json.NewDecoder(r.Body).Decode(&st); err != nil {
		httputil.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if err := s.PG.Update(r.Context(), id, st); err != nil {
		if err == sql.ErrNoRows {
			httputil.WriteError(w, http.StatusNotFound, "student not found")
		} else {
			httputil.WriteError(w, http.StatusInternalServerError,
				"failed to update student: "+err.Error())
		}
		return
	}
	st.ID = id
	httputil.WriteJSON(w, http.StatusOK, st)
}

func (s *Server) handleDeleteStudent(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if err := s.PG.Delete(r.Context(), id); err != nil {
		httputil.WriteError(w, http.StatusNotFound, "student not found")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// ── Note handlers (DocumentDB + KMS) ──────────────────────────

func (s *Server) handleListNotes(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	notes, err := s.DocDB.ListNotes(r.Context(), id)
	if err != nil {
		httputil.WriteError(w, http.StatusInternalServerError,
			"failed to list notes: "+err.Error())
		return
	}

	// Decrypt each note's content via KMS before returning to client.
	decryptedNotes := make([]models.Note, 0, len(notes))
	for _, note := range notes {
		plaintext, err := s.Encryptor.Decrypt(r.Context(), note.Content)
		if err != nil {
			log.Printf("failed to decrypt note %s: %v", note.ID, err)
			httputil.WriteError(w, http.StatusInternalServerError,
				"failed to decrypt note content")
			return
		}
		note.Content = plaintext
		decryptedNotes = append(decryptedNotes, note)
	}

	httputil.WriteJSON(w, http.StatusOK, decryptedNotes)
}

func (s *Server) handleCreateNote(w http.ResponseWriter, r *http.Request) {
	studentID := r.PathValue("id")
	var note models.Note
	if err := json.NewDecoder(r.Body).Decode(&note); err != nil {
		httputil.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	note.StudentID = studentID

	// Encrypt the note content via KMS before storing in DocumentDB.
	ciphertext, err := s.Encryptor.Encrypt(r.Context(), note.Content)
	if err != nil {
		log.Printf("failed to encrypt note: %v", err)
		httputil.WriteError(w, http.StatusInternalServerError,
			"failed to encrypt note content")
		return
	}
	note.Content = ciphertext

	if err := s.DocDB.CreateNote(r.Context(), note); err != nil {
		httputil.WriteError(w, http.StatusInternalServerError,
			"failed to create note: "+err.Error())
		return
	}

	// Return the decrypted content so the client sees plaintext.
	note.Content = "" // The encrypted blob should not be returned.
	// Re-read the note to get the generated ID and timestamp, then return plaintext.
	plaintext, _ := s.Encryptor.Decrypt(r.Context(), ciphertext)
	note.Content = plaintext

	httputil.WriteJSON(w, http.StatusCreated, note)
}
