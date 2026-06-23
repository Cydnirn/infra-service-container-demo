// Command seed populates the DynamoDB users table with a default
// administrator account if the table is empty. Safe to run repeatedly
// (idempotent — skips seeding when users already exist).
//
// Environment variables:
//
//	DYNAMODB_TABLE_NAME   — table name (default: "users")
//	SEED_USERNAME         — default admin username (default: "admin")
//	SEED_PASSWORD         — default admin password (default: "admin123")
package main

import (
	"context"
	"log"
	"os"

	"golang.org/x/crypto/bcrypt"

	"student-backend/internal/dynamo"
	"student-backend/internal/httputil"
	"student-backend/internal/models"
)

func main() {
	ctx := context.Background()

	store, err := dynamo.New(ctx)
	if err != nil {
		log.Fatalf("DynamoDB initialization failed: %v", err)
	}

	empty, err := store.IsEmpty(ctx)
	if err != nil {
		log.Fatalf("failed to check table: %v", err)
	}

	if !empty {
		log.Println("Users table already populated — nothing to seed.")
		return
	}

	username := httputil.EnvOrDefault("SEED_USERNAME", "admin")
	password := httputil.EnvOrDefault("SEED_PASSWORD", "admin123")

	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		log.Fatalf("failed to hash password: %v", err)
	}

	user := &models.User{
		Username:     username,
		PasswordHash: string(hash),
	}

	if err := store.PutUser(ctx, user); err != nil {
		log.Fatalf("failed to insert seed user: %v", err)
	}

	log.Printf("Seed user created: username=%s", username)
	os.Exit(0)
}
