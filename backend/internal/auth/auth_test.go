package auth

import (
	"testing"
	"time"

	"github.com/google/uuid"
)

func TestPasswordHashAndCheck(t *testing.T) {
	hash, err := HashPassword("password8246")
	if err != nil {
		t.Fatalf("hash password: %v", err)
	}
	if hash == "password8246" {
		t.Fatal("password hash must not equal raw password")
	}
	if !CheckPassword(hash, "password8246") {
		t.Fatal("expected password to match hash")
	}
	if CheckPassword(hash, "wrong-password") {
		t.Fatal("wrong password must not match hash")
	}
}

func TestJWTIssueAndParse(t *testing.T) {
	service := NewService("test-secret-test-secret-test-secret", time.Hour, "kill-the-resume-test", "kill-the-resume-web-test")
	userID := uuid.New()
	token, err := service.Issue(userID)
	if err != nil {
		t.Fatalf("issue token: %v", err)
	}
	parsed, err := service.Parse(token)
	if err != nil {
		t.Fatalf("parse token: %v", err)
	}
	if parsed != userID {
		t.Fatalf("parsed user id mismatch: got %s want %s", parsed, userID)
	}
}

func TestJWTRejectsWrongAudience(t *testing.T) {
	issuer := "kill-the-resume-test"
	service := NewService("test-secret-test-secret-test-secret", time.Hour, issuer, "expected-audience")
	token, err := service.Issue(uuid.New())
	if err != nil {
		t.Fatalf("issue token: %v", err)
	}

	wrongAudience := NewService("test-secret-test-secret-test-secret", time.Hour, issuer, "wrong-audience")
	if _, err := wrongAudience.Parse(token); err == nil {
		t.Fatal("expected wrong audience token to be rejected")
	}
}

func TestJWTRejectsWrongIssuer(t *testing.T) {
	audience := "kill-the-resume-web-test"
	service := NewService("test-secret-test-secret-test-secret", time.Hour, "expected-issuer", audience)
	token, err := service.Issue(uuid.New())
	if err != nil {
		t.Fatalf("issue token: %v", err)
	}

	wrongIssuer := NewService("test-secret-test-secret-test-secret", time.Hour, "wrong-issuer", audience)
	if _, err := wrongIssuer.Parse(token); err == nil {
		t.Fatal("expected wrong issuer token to be rejected")
	}
}
