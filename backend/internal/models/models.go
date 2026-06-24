// Package models defines the core data types shared across the application.
package models

// Student represents the core student record stored in RDS (PostgreSQL).
type Student struct {
	ID    string `json:"id"`
	Name  string `json:"name"`
	Age   int    `json:"age"`
	Major string `json:"major"`
}

// Note represents an encrypted academic remark stored in DocumentDB.
// Content is KMS-encrypted ciphertext (base64) — never stored in plaintext.
// bson tags are required — without them the MongoDB driver lowercases
// Go field names (StudentID → studentid), breaking queries.
type Note struct {
	ID        string `bson:"_id" json:"id"`
	StudentID string `bson:"student_id" json:"student_id"`
	Content   string `bson:"content" json:"content"`
	CreatedAt string `bson:"created_at" json:"created_at"`
}
