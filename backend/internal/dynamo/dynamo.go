// Package dynamo implements the Amazon DynamoDB driver for user authentication.
package dynamo

import (
	"context"
	"fmt"
	"log"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"

	"student-backend/internal/httputil"
	"student-backend/internal/models"
)

// Store manages user authentication in Amazon DynamoDB.
type Store struct {
	client    *dynamodb.Client
	tableName string
}

// New creates a new Store connected to DynamoDB.
func New(ctx context.Context) (*Store, error) {
	tableName := httputil.EnvOrDefault("DYNAMODB_TABLE_NAME", "users")

	cfg, err := config.LoadDefaultConfig(ctx)
	if err != nil {
		return nil, fmt.Errorf("load AWS config: %w", err)
	}

	client := dynamodb.NewFromConfig(cfg)

	log.Printf("Connected to DynamoDB (table: %s)", tableName)
	return &Store{client: client, tableName: tableName}, nil
}

// IsEmpty returns true when the table contains no items.
func (s *Store) IsEmpty(ctx context.Context) (bool, error) {
	result, err := s.client.Scan(ctx, &dynamodb.ScanInput{
		TableName: aws.String(s.tableName),
		Limit:     aws.Int32(1),
	})
	if err != nil {
		return false, fmt.Errorf("scan DynamoDB: %w", err)
	}
	return len(result.Items) == 0, nil
}

// PutUser inserts a user into the DynamoDB table.
func (s *Store) PutUser(ctx context.Context, user *models.User) error {
	item, err := attributevalue.MarshalMap(user)
	if err != nil {
		return fmt.Errorf("marshal user: %w", err)
	}
	_, err = s.client.PutItem(ctx, &dynamodb.PutItemInput{
		TableName: aws.String(s.tableName),
		Item:      item,
	})
	return err
}

// GetUser retrieves a user by username from DynamoDB.
// Returns an error if the user is not found.
func (s *Store) GetUser(ctx context.Context, username string) (*models.User, error) {
	result, err := s.client.GetItem(ctx, &dynamodb.GetItemInput{
		TableName: aws.String(s.tableName),
		Key: map[string]types.AttributeValue{
			"username": &types.AttributeValueMemberS{Value: username},
		},
	})
	if err != nil {
		return nil, fmt.Errorf("query DynamoDB: %w", err)
	}
	if result.Item == nil {
		return nil, fmt.Errorf("user not found")
	}

	var user models.User
	if err := attributevalue.UnmarshalMap(result.Item, &user); err != nil {
		return nil, fmt.Errorf("unmarshal DynamoDB item: %w", err)
	}
	return &user, nil
}
