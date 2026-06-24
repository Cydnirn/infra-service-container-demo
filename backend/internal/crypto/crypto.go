// Package crypto provides envelope encryption using AWS KMS.
// Notes stored in DocumentDB are encrypted at the application layer
// before storage and decrypted on retrieval.
package crypto

import (
	"context"
	"encoding/base64"
	"fmt"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/kms"

	"student-backend/internal/httputil"
)

// Encryptor wraps an AWS KMS client for encrypting and decrypting note content.
type Encryptor struct {
	client *kms.Client
	keyID  string
}

// New returns an Encryptor configured with the KMS key from the environment.
func New(ctx context.Context) (*Encryptor, error) {
	keyID := httputil.EnvOrDefault("KMS_KEY_ID", "")
	if keyID == "" {
		return nil, fmt.Errorf("KMS_KEY_ID environment variable is required")
	}

	cfg, err := config.LoadDefaultConfig(ctx)
	if err != nil {
		return nil, fmt.Errorf("load AWS config: %w", err)
	}

	client := kms.NewFromConfig(cfg)

	return &Encryptor{client: client, keyID: keyID}, nil
}

// Encrypt encrypts plaintext using AWS KMS and returns a base64-encoded
// ciphertext blob suitable for storage.
func (e *Encryptor) Encrypt(ctx context.Context, plaintext string) (string, error) {
	result, err := e.client.Encrypt(ctx, &kms.EncryptInput{
		KeyId:     aws.String(e.keyID),
		Plaintext: []byte(plaintext),
	})
	if err != nil {
		return "", fmt.Errorf("kms encrypt: %w", err)
	}

	return base64.StdEncoding.EncodeToString(result.CiphertextBlob), nil
}

// Decrypt decrypts a base64-encoded ciphertext blob using AWS KMS and returns
// the original plaintext.
func (e *Encryptor) Decrypt(ctx context.Context, ciphertextB64 string) (string, error) {
	ciphertext, err := base64.StdEncoding.DecodeString(ciphertextB64)
	if err != nil {
		return "", fmt.Errorf("decode base64 ciphertext: %w", err)
	}

	result, err := e.client.Decrypt(ctx, &kms.DecryptInput{
		KeyId:          aws.String(e.keyID),
		CiphertextBlob: ciphertext,
	})
	if err != nil {
		return "", fmt.Errorf("kms decrypt: %w", err)
	}

	return string(result.Plaintext), nil
}
