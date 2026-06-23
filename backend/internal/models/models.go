// Package models defines the core data types shared across the application.
package models

// Student represents the core student record stored in RDS (PostgreSQL).
type Student struct {
	ID    string `json:"id"`
	Name  string `json:"name"`
	Age   int    `json:"age"`
	Major string `json:"major"`
}

// Note represents an unstructured academic remark stored in DocumentDB.
// bson tags are required — without them the MongoDB driver lowercases
// Go field names (StudentID → studentid), breaking queries.
type Note struct {
	ID        string `bson:"_id" json:"id"`
	StudentID string `bson:"student_id" json:"student_id"`
	Content   string `bson:"content" json:"content"`
	CreatedAt string `bson:"created_at" json:"created_at"`
}

// User represents authentication credentials stored in DynamoDB.
type User struct {
	Username     string `dynamodbav:"username" json:"username"`
	PasswordHash string `dynamodbav:"password_hash" json:"-"`
}

// LoginRequest is the payload for POST /login.
type LoginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

// LoginResponse is returned on successful authentication.
type LoginResponse struct {
	Token   string `json:"token"`
	Message string `json:"message"`
}
