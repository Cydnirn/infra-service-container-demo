// Package docdb implements the Amazon DocumentDB (MongoDB API) driver
// for storing KMS-encrypted student notes.
// Database credentials are fetched from AWS Secrets Manager — never from
// environment variables.
package docdb

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/google/uuid"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"

	"student-backend/internal/httputil"
	"student-backend/internal/models"
	"student-backend/internal/secrets"
)

// Store manages student notes in Amazon DocumentDB.
type Store struct {
	client     *mongo.Client
	collection *mongo.Collection
}

// New creates a new Store connected to DocumentDB.
// Credentials are fetched from AWS Secrets Manager.
func New(ctx context.Context) (*Store, error) {
	creds, err := secrets.FetchCredentials(ctx)
	if err != nil {
		return nil, fmt.Errorf("fetch DocumentDB credentials from Secrets Manager: %w", err)
	}

	uri := httputil.EnvOrDefault("DOCDB_CONNECTION_STRING", "mongodb://localhost:27017")
	username := creds.Username
	password := creds.Password

	clientOpts := options.Client().ApplyURI(uri).
		SetRetryWrites(false).
		SetDirect(true)

	if username != "" && password != "" {
		clientOpts.SetAuth(options.Credential{
			Username: username,
			Password: password,
		})
	}

	client, err := mongo.Connect(ctx, clientOpts)
	if err != nil {
		return nil, fmt.Errorf("connect to DocumentDB: %w", err)
	}

	if err := client.Ping(ctx, nil); err != nil {
		return nil, fmt.Errorf("ping DocumentDB: %w", err)
	}

	dbName := httputil.EnvOrDefault("DOCDB_DB_NAME", "student_management")
	collName := httputil.EnvOrDefault("DOCDB_COLLECTION", "notes")
	collection := client.Database(dbName).Collection(collName)

	log.Println("Connected to DocumentDB")
	return &Store{client: client, collection: collection}, nil
}

// ListNotes returns all notes for the given student ID.
// Note: Content is returned as KMS-encrypted ciphertext; decryption
// is handled by the caller (handler layer).
func (s *Store) ListNotes(ctx context.Context, studentID string) ([]models.Note, error) {
	cursor, err := s.collection.Find(ctx, bson.M{"student_id": studentID})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var notes []models.Note
	if err := cursor.All(ctx, &notes); err != nil {
		return nil, err
	}
	if notes == nil {
		notes = []models.Note{}
	}
	return notes, nil
}

// CreateNote inserts a new note. If note.ID is empty a new UUID is generated.
// The Content field should already be KMS-encrypted ciphertext.
func (s *Store) CreateNote(ctx context.Context, note models.Note) error {
	if note.ID == "" {
		note.ID = uuid.New().String()
	}
	note.CreatedAt = time.Now().UTC().Format(time.RFC3339)
	_, err := s.collection.InsertOne(ctx, note)
	return err
}
