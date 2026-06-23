// Command server is the entry point for the Student Management backend.
// It initializes PostgreSQL (RDS), DocumentDB, and DynamoDB stores, registers
// all HTTP routes, and starts listening on the configured port.
package main

import (
	"context"
	"log"
	"net/http"
	"os"

	"student-backend/internal/docdb"
	"student-backend/internal/dynamo"
	"student-backend/internal/handler"
	"student-backend/internal/httputil"
	"student-backend/internal/postgres"
)

func main() {
	ctx := context.Background()

	pgStore, err := postgres.New()
	if err != nil {
		log.Fatalf("PostgreSQL initialization failed: %v", err)
	}

	docStore, err := docdb.New(ctx)
	if err != nil {
		log.Fatalf("DocumentDB initialization failed: %v", err)
	}

	dynStore, err := dynamo.New(ctx)
	if err != nil {
		log.Fatalf("DynamoDB initialization failed: %v", err)
	}

	srv := &handler.Server{
		PG:     pgStore,
		DocDB:  docStore,
		Dynamo: dynStore,
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
