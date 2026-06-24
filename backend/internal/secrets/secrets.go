// Package secrets fetches database credentials from AWS Secrets Manager
// on startup. The backend never reads DB passwords from environment variables.
package secrets

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/secretsmanager"

	"student-backend/internal/httputil"
)

// DBCredentials holds the JSON payload stored in Secrets Manager.
type DBCredentials struct {
	Username string `json:"username"`
	Password string `json:"password"`
	Engine   string `json:"engine"`
	Host     string `json:"host"`
	Port     int    `json:"port"`
	DBName   string `json:"dbname"`
}

// FetchCredentials retrieves the database credentials from the specified
// Secrets Manager secret. Returns parsed credentials or an error.
func FetchCredentials(ctx context.Context) (*DBCredentials, error) {
	secretID := httputil.EnvOrDefault("DB_SECRET_ARN", "")
	if secretID == "" {
		return nil, fmt.Errorf("DB_SECRET_ARN environment variable is required")
	}

	cfg, err := config.LoadDefaultConfig(ctx)
	if err != nil {
		return nil, fmt.Errorf("load AWS config: %w", err)
	}

	client := secretsmanager.NewFromConfig(cfg)

	result, err := client.GetSecretValue(ctx, &secretsmanager.GetSecretValueInput{
		SecretId: aws.String(secretID),
	})
	if err != nil {
		return nil, fmt.Errorf("fetch secret %q from Secrets Manager: %w", secretID, err)
	}

	if result.SecretString == nil {
		return nil, fmt.Errorf("secret %q has no SecretString value", secretID)
	}

	var creds DBCredentials
	if err := json.Unmarshal([]byte(*result.SecretString), &creds); err != nil {
		return nil, fmt.Errorf("unmarshal secret JSON: %w", err)
	}

	return &creds, nil
}
