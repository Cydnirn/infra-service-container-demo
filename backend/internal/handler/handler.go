// Package handler wires HTTP routes to the domain stores and exposes
// a single RegisterRoutes method that attaches all endpoints to a ServeMux.
package handler

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"

	"student-backend/internal/auth"
	"student-backend/internal/docdb"
	"student-backend/internal/dynamo"
	"student-backend/internal/httputil"
	"student-backend/internal/models"
	"student-backend/internal/postgres"
)

// Server holds references to all data stores needed by the HTTP handlers.
type Server struct {
	PG     *postgres.Store
	DocDB  *docdb.Store
	Dynamo *dynamo.Store
}

// RegisterRoutes attaches all API endpoints to the provided ServeMux.
func (s *Server) RegisterRoutes(mux *http.ServeMux) {
	// ── Health (public, no auth) ────────────────────────────
	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"ok"}`))
	})

	// ── Public ──────────────────────────────────────────────
	mux.HandleFunc("POST /login", s.handleLogin)

	// ── Students (RDS) ──────────────────────────────────────
	mux.HandleFunc("GET /students", auth.Middleware(s.handleListStudents))
	mux.HandleFunc("GET /students/{id}", auth.Middleware(s.handleGetStudent))
	mux.HandleFunc("POST /students", auth.Middleware(s.handleCreateStudent))
	mux.HandleFunc("PUT /students/{id}", auth.Middleware(s.handleUpdateStudent))
	mux.HandleFunc("DELETE /students/{id}", auth.Middleware(s.handleDeleteStudent))

	// ── Notes (DocumentDB) ──────────────────────────────────
	mux.HandleFunc("GET /students/{id}/notes", auth.Middleware(s.handleListNotes))
	mux.HandleFunc("POST /students/{id}/notes", auth.Middleware(s.handleCreateNote))
}

// ── Login handler ────────────────────────────────────────────

func (s *Server) handleLogin(w http.ResponseWriter, r *http.Request) {
	var req models.LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.Username == "" || req.Password == "" {
		httputil.WriteError(w, http.StatusBadRequest, "username and password are required")
		return
	}

	user, err := s.Dynamo.GetUser(r.Context(), req.Username)
	if err != nil {
		httputil.WriteError(w, http.StatusUnauthorized, "invalid credentials")
		return
	}

	if err := bcrypt.CompareHashAndPassword(
		[]byte(user.PasswordHash), []byte(req.Password),
	); err != nil {
		httputil.WriteError(w, http.StatusUnauthorized, "invalid credentials")
		return
	}

	token, err := auth.GenerateToken()
	if err != nil {
		httputil.WriteError(w, http.StatusInternalServerError, "failed to generate session token")
		return
	}
	auth.StoreSession(token, req.Username)

	httputil.WriteJSON(w, http.StatusOK, models.LoginResponse{
		Token:   token,
		Message: "login successful",
	})
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

// ── Note handlers (DocumentDB) ────────────────────────────────

func (s *Server) handleListNotes(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	notes, err := s.DocDB.ListNotes(r.Context(), id)
	log.Default().Printf("list notes for student %s", id)
	log.Default().Printf("notes: %v", notes)
	if err != nil {
		httputil.WriteError(w, http.StatusInternalServerError,
			"failed to list notes: "+err.Error())
		return
	}
	httputil.WriteJSON(w, http.StatusOK, notes)
}

func (s *Server) handleCreateNote(w http.ResponseWriter, r *http.Request) {
	studentID := r.PathValue("id")
	log.Default().Printf("creating note for student %s", studentID)
	log.Default().Printf("note content: %s", r.Body)
	var note models.Note
	if err := json.NewDecoder(r.Body).Decode(&note); err != nil {
		httputil.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	note.StudentID = studentID
	if err := s.DocDB.CreateNote(r.Context(), note); err != nil {
		httputil.WriteError(w, http.StatusInternalServerError,
			"failed to create note: "+err.Error())
		return
	}
	log.Default().Printf("note created: %v", note)
	httputil.WriteJSON(w, http.StatusCreated, note)
}
