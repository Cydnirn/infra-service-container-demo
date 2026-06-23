// Package postgres implements the RDS (PostgreSQL) driver for student records.
package postgres

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"time"

	"github.com/google/uuid"
	_ "github.com/lib/pq"

	"student-backend/internal/httputil"
	"student-backend/internal/models"
)

// Store manages student records in Amazon RDS (PostgreSQL).
type Store struct {
	db *sql.DB
}

// New creates a new Store, connects to PostgreSQL, and runs migrations.
func New() (*Store, error) {
	host := httputil.EnvOrDefault("DB_HOST", "localhost")
	port := httputil.EnvOrDefault("DB_PORT", "5432")
	user := httputil.EnvOrDefault("DB_USERNAME", "postgres")
	password := httputil.EnvOrDefault("DB_PASSWORD", "postgres")
	dbname := httputil.EnvOrDefault("DB_NAME", "student_management")

	dsn := fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=require",
		host, port, user, password, dbname,
	)

	db, err := sql.Open("postgres", dsn)
	if err != nil {
		return nil, fmt.Errorf("open PostgreSQL: %w", err)
	}

	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(10)
	db.SetConnMaxLifetime(5 * time.Minute)

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := db.PingContext(ctx); err != nil {
		return nil, fmt.Errorf("ping PostgreSQL: %w", err)
	}

	if err := migrate(db); err != nil {
		return nil, fmt.Errorf("migrate PostgreSQL: %w", err)
	}

	log.Println("Connected to PostgreSQL (RDS)")
	return &Store{db: db}, nil
}

func migrate(db *sql.DB) error {
	_, err := db.Exec(`
		CREATE TABLE IF NOT EXISTS students (
			id    UUID PRIMARY KEY,
			name  VARCHAR(255) NOT NULL,
			age   INT          NOT NULL,
			major VARCHAR(255) NOT NULL
		)`,
	)
	return err
}

// List returns all students ordered by name.
func (s *Store) List(ctx context.Context) ([]models.Student, error) {
	rows, err := s.db.QueryContext(ctx,
		"SELECT id, name, age, major FROM students ORDER BY name")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var students []models.Student
	for rows.Next() {
		var st models.Student
		if err := rows.Scan(&st.ID, &st.Name, &st.Age, &st.Major); err != nil {
			return nil, err
		}
		students = append(students, st)
	}
	return students, rows.Err()
}

// Get returns a single student by ID.
func (s *Store) Get(ctx context.Context, id string) (models.Student, error) {
	var st models.Student
	err := s.db.QueryRowContext(ctx,
		"SELECT id, name, age, major FROM students WHERE id = $1", id,
	).Scan(&st.ID, &st.Name, &st.Age, &st.Major)
	if err == sql.ErrNoRows {
		return st, err
	}
	return st, err
}

// Create inserts a new student. If st.ID is empty a new UUID is generated.
func (s *Store) Create(ctx context.Context, st models.Student) error {
	if st.ID == "" {
		st.ID = uuid.New().String()
	}
	_, err := s.db.ExecContext(ctx,
		"INSERT INTO students (id, name, age, major) VALUES ($1, $2, $3, $4)",
		st.ID, st.Name, st.Age, st.Major,
	)
	return err
}

// Update modifies an existing student. Returns sql.ErrNoRows if not found.
func (s *Store) Update(ctx context.Context, id string, st models.Student) error {
	result, err := s.db.ExecContext(ctx,
		"UPDATE students SET name = $1, age = $2, major = $3 WHERE id = $4",
		st.Name, st.Age, st.Major, id,
	)
	if err != nil {
		return err
	}
	if affected, _ := result.RowsAffected(); affected == 0 {
		return sql.ErrNoRows
	}
	return nil
}

// Delete removes a student by ID. Returns sql.ErrNoRows if not found.
func (s *Store) Delete(ctx context.Context, id string) error {
	result, err := s.db.ExecContext(ctx,
		"DELETE FROM students WHERE id = $1", id)
	if err != nil {
		return err
	}
	if affected, _ := result.RowsAffected(); affected == 0 {
		return sql.ErrNoRows
	}
	return nil
}
