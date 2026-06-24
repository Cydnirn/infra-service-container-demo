// Command server is the entry point for the Student Management backend.
// It initializes PostgreSQL (RDS via Secrets Manager), DocumentDB (via
// Secrets Manager), AWS KMS for note encryption, and Cognito for JWT
// authentication. All HTTP routes are registered and the server listens
// on the configured port (default 8080).
package main

import (
	"context"
	"log"
	"net/http"
	"os"

	"student-backend/internal/auth"
	"student-backend/internal/crypto"
	"student-backend/internal/docdb"
	"student-backend/internal/handler"
	"student-backend/internal/httputil"
	"student-backend/internal/postgres"
)

func main() {
	ctx := context.Background()

	// ── PostgreSQL (RDS via Proxy) ───────────────────────────
	pgStore, err := postgres.New(ctx)
	if err != nil {
		log.Fatalf("PostgreSQL initialization failed: %v", err)
	}

	// ── DocumentDB ───────────────────────────────────────────
	docStore, err := docdb.New(ctx)
	if err != nil {
		log.Fatalf("DocumentDB initialization failed: %v", err)
	}

	// ── AWS KMS for note encryption ──────────────────────────
	encryptor, err := crypto.New(ctx)
	if err != nil {
		log.Fatalf("KMS encryptor initialization failed: %v", err)
	}

	// ── Amazon Cognito JWT validator ─────────────────────────
	cognitoRegion := httputil.EnvOrDefault("COGNITO_REGION", os.Getenv("AWS_REGION"))
	if cognitoRegion == "" {
		cognitoRegion = "us-east-1"
	}
	cognitoUserPoolID := os.Getenv("COGNITO_USER_POOL_ID")
	if cognitoUserPoolID == "" {
		log.Fatal("COGNITO_USER_POOL_ID environment variable is required")
	}
	cognitoClientID := os.Getenv("COGNITO_CLIENT_ID")
	if cognitoClientID == "" {
		log.Fatal("COGNITO_CLIENT_ID environment variable is required")
	}

	cognitoAuth := auth.NewCognitoAuth(cognitoRegion, cognitoUserPoolID, cognitoClientID)

	// ── HTTP Server ──────────────────────────────────────────
	srv := &handler.Server{
		PG:        pgStore,
		DocDB:     docStore,
		Encryptor: encryptor,
		Auth:      cognitoAuth,
	}

	mux := http.NewServeMux()
	srv.RegisterRoutes(mux)

	allowedOrigin := os.Getenv("CORS_ALLOWED_ORIGIN")
	if allowedOrigin == "" {
		allowedOrigin = "*"
	}

	wrapped := httputil.CORSMiddleware(allowedOrigin)(mux)

	port := httputil.EnvOrDefault("PORT", "8080")
	log.Printf("Backend server starting on :%s", port)
	if err := http.ListenAndServe(":"+port, wrapped); err != nil {
		log.Fatalf("server failed: %v", err)
	}
}
