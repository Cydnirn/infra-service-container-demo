// Package auth provides token-based authentication: session management,
// secure token generation, and an HTTP middleware that validates Bearer tokens.
package auth

import (
	"crypto/rand"
	"fmt"
	"net/http"
	"strings"

	"student-backend/internal/httputil"
)

const tokenLength = 32

// sessionTokens maps token → username. In production, use a proper
// session store (Redis, DynamoDB session table, or JWT).
var sessionTokens = map[string]string{}

// GenerateToken produces a cryptographically random hex-encoded token.
func GenerateToken() (string, error) {
	b := make([]byte, tokenLength)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return fmt.Sprintf("%x", b), nil
}

// StoreSession records that token belongs to username.
func StoreSession(token, username string) {
	sessionTokens[token] = username
}

// Middleware returns middleware that rejects requests without a valid
// Authorization: Bearer <token> header.
func Middleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			httputil.WriteError(w, http.StatusUnauthorized, "missing authorization header")
			return
		}

		token := strings.TrimPrefix(authHeader, "Bearer ")
		if _, ok := sessionTokens[token]; !ok {
			httputil.WriteError(w, http.StatusUnauthorized, "invalid or expired token")
			return
		}

		next(w, r)
	}
}
