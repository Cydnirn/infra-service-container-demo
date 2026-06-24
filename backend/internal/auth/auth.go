// Package auth provides Amazon Cognito JWT validation middleware.
// It intercepts incoming requests, extracts the Bearer token, and
// validates it against the Cognito User Pool's JWKS endpoint.
package auth

import (
	"context"
	"crypto/rsa"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"math/big"
	"net/http"
	"strings"
	"sync"

	"github.com/golang-jwt/jwt/v5"

	"student-backend/internal/httputil"
)

// CognitoAuth holds the configuration needed to validate Cognito tokens.
type CognitoAuth struct {
	region     string
	userPoolID string
	clientID   string
	jwksURL    string

	mu     sync.RWMutex
	keyMap map[string]*rsa.PublicKey
}

// JWKS represents the JSON Web Key Set response from Cognito.
type JWKS struct {
	Keys []JWK `json:"keys"`
}

// JWK represents a single JSON Web Key.
type JWK struct {
	KTY string `json:"kty"`
	ALG string `json:"alg"`
	USE string `json:"use"`
	KID string `json:"kid"`
	N   string `json:"n"`
	E   string `json:"e"`
}

// NewCognitoAuth creates a new Cognito JWT validator.
func NewCognitoAuth(region, userPoolID, clientID string) *CognitoAuth {
	jwksURL := fmt.Sprintf(
		"https://cognito-idp.%s.amazonaws.com/%s/.well-known/jwks.json",
		region, userPoolID,
	)
	return &CognitoAuth{
		region:     region,
		userPoolID: userPoolID,
		clientID:   clientID,
		jwksURL:    jwksURL,
		keyMap:     make(map[string]*rsa.PublicKey),
	}
}

// Middleware returns an HTTP middleware that validates Cognito JWT tokens.
func (c *CognitoAuth) Middleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			httputil.WriteError(w, http.StatusUnauthorized, "missing authorization header")
			return
		}

		tokenString := strings.TrimPrefix(authHeader, "Bearer ")
		if tokenString == authHeader {
			httputil.WriteError(w, http.StatusUnauthorized, "authorization header must start with Bearer")
			return
		}

		token, err := c.validateToken(r.Context(), tokenString)
		if err != nil {
			httputil.WriteError(w, http.StatusUnauthorized, fmt.Sprintf("invalid token: %v", err))
			return
		}

		if !token.Valid {
			httputil.WriteError(w, http.StatusUnauthorized, "invalid token")
			return
		}

		next(w, r)
	}
}

// validateToken parses and validates a Cognito JWT token.
func (c *CognitoAuth) validateToken(ctx context.Context, tokenString string) (*jwt.Token, error) {
	parser := jwt.NewParser(
		jwt.WithValidMethods([]string{"RS256"}),
		jwt.WithIssuer(fmt.Sprintf(
			"https://cognito-idp.%s.amazonaws.com/%s",
			c.region, c.userPoolID,
		)),
	)

	token, err := parser.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		kid, ok := token.Header["kid"].(string)
		if !ok {
			return nil, fmt.Errorf("kid header missing")
		}

		key, err := c.getKey(ctx, kid)
		if err != nil {
			return nil, fmt.Errorf("fetch JWK: %w", err)
		}
		return key, nil
	})

	if err != nil {
		return nil, fmt.Errorf("parse token: %w", err)
	}

	// Validate the token_use claim — must be "access" or "id".
	// The frontend sends the Access Token.
	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return nil, fmt.Errorf("invalid claims format")
	}

	tokenUse, _ := claims["token_use"].(string)
	if tokenUse != "access" && tokenUse != "id" {
		return nil, fmt.Errorf("invalid token_use claim: %q", tokenUse)
	}

	// Validate the client_id matches our app client.
	if clientID, ok := claims["client_id"].(string); ok {
		if clientID != c.clientID {
			return nil, fmt.Errorf("token was not issued for this app client")
		}
	}

	return token, nil
}

// getKey fetches the JWKS from Cognito and returns the matching public key.
func (c *CognitoAuth) getKey(ctx context.Context, kid string) (*rsa.PublicKey, error) {
	c.mu.RLock()
	key, ok := c.keyMap[kid]
	c.mu.RUnlock()
	if ok {
		return key, nil
	}

	resp, err := http.Get(c.jwksURL)
	if err != nil {
		return nil, fmt.Errorf("fetch JWKS: %w", err)
	}
	defer resp.Body.Close()

	var jwks JWKS
	if err := json.NewDecoder(resp.Body).Decode(&jwks); err != nil {
		return nil, fmt.Errorf("decode JWKS: %w", err)
	}

	c.mu.Lock()
	defer c.mu.Unlock()

	for _, jwk := range jwks.Keys {
		if jwk.KID == "" {
			continue
		}

		nBytes, err := base64.RawURLEncoding.DecodeString(jwk.N)
		if err != nil {
			return nil, fmt.Errorf("decode JWK n: %w", err)
		}
		eBytes, err := base64.RawURLEncoding.DecodeString(jwk.E)
		if err != nil {
			return nil, fmt.Errorf("decode JWK e: %w", err)
		}

		e := 0
		for _, b := range eBytes {
			e = e<<8 | int(b)
		}

		pub := &rsa.PublicKey{
			N: new(big.Int).SetBytes(nBytes),
			E: e,
		}
		c.keyMap[jwk.KID] = pub
	}

	cached, ok := c.keyMap[kid]
	if !ok {
		return nil, fmt.Errorf("key %q not found in JWKS", kid)
	}
	return cached, nil
}
