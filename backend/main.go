package main

import (
	"crypto/rand"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"sync"
)

// Student represents the student data model.
type Student struct {
	ID    string `json:"id"`
	Name  string `json:"name"`
	Age   int    `json:"age"`
	Major string `json:"major"`
}

// Store provides a thread-safe in-memory storage for students.
type Store struct {
	mu    sync.RWMutex
	items map[string]Student
}

func newStore() *Store {
	return &Store{items: make(map[string]Student)}
}

func (s *Store) list() []Student {
	s.mu.RLock()
	defer s.mu.RUnlock()

	result := make([]Student, 0, len(s.items))
	for _, st := range s.items {
		result = append(result, st)
	}
	return result
}

func (s *Store) get(id string) (Student, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	st, ok := s.items[id]
	return st, ok
}

func (s *Store) create(st Student) {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.items[st.ID] = st
}

func (s *Store) update(st Student) bool {
	s.mu.Lock()
	defer s.mu.Unlock()

	if _, ok := s.items[st.ID]; !ok {
		return false
	}
	s.items[st.ID] = st
	return true
}

func (s *Store) delete(id string) bool {
	s.mu.Lock()
	defer s.mu.Unlock()

	if _, ok := s.items[id]; !ok {
		return false
	}
	delete(s.items, id)
	return true
}

func generateID() string {
	b := make([]byte, 16)
	_, err := rand.Read(b)
	if err != nil {
		panic(fmt.Sprintf("failed to generate random ID: %v", err))
	}
	return fmt.Sprintf("%x-%x-%x-%x-%x", b[0:4], b[4:6], b[6:8], b[8:10], b[10:])
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(v); err != nil {
		log.Printf("error encoding JSON response: %v", err)
	}
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}

func main() {
	store := newStore()

	mux := http.NewServeMux()

	mux.HandleFunc("GET /students", func(w http.ResponseWriter, r *http.Request) {
		students := store.list()
		writeJSON(w, http.StatusOK, students)
	})

	mux.HandleFunc("GET /students/{id}", func(w http.ResponseWriter, r *http.Request) {
		id := r.PathValue("id")
		st, ok := store.get(id)
		if !ok {
			writeError(w, http.StatusNotFound, "student not found")
			return
		}
		writeJSON(w, http.StatusOK, st)
	})

	mux.HandleFunc("POST /students", func(w http.ResponseWriter, r *http.Request) {
		var st Student
		if err := json.NewDecoder(r.Body).Decode(&st); err != nil {
			writeError(w, http.StatusBadRequest, "invalid request body")
			return
		}
		st.ID = generateID()
		store.create(st)
		writeJSON(w, http.StatusCreated, st)
	})

	mux.HandleFunc("PUT /students/{id}", func(w http.ResponseWriter, r *http.Request) {
		id := r.PathValue("id")
		var st Student
		if err := json.NewDecoder(r.Body).Decode(&st); err != nil {
			writeError(w, http.StatusBadRequest, "invalid request body")
			return
		}
		st.ID = id
		if !store.update(st) {
			writeError(w, http.StatusNotFound, "student not found")
			return
		}
		writeJSON(w, http.StatusOK, st)
	})

	mux.HandleFunc("DELETE /students/{id}", func(w http.ResponseWriter, r *http.Request) {
		id := r.PathValue("id")
		if !store.delete(id) {
			writeError(w, http.StatusNotFound, "student not found")
			return
		}
		w.WriteHeader(http.StatusNoContent)
	})

	handler := corsMiddleware(mux)

	log.Println("Backend server starting on :8080")
	if err := http.ListenAndServe(":8080", handler); err != nil {
		log.Fatalf("server failed: %v", err)
	}
}
