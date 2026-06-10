package httpx

import "testing"

func TestValidatePasswordForStorageBoundsBcryptInput(t *testing.T) {
	if err := validatePasswordForStorage("password8246"); err != nil {
		t.Fatalf("expected valid password: %v", err)
	}
	if err := validatePasswordForStorage("short"); err == nil {
		t.Fatal("expected short password to be rejected")
	}
	if err := validatePasswordForStorage(string(make([]byte, maxPasswordBytes+1))); err == nil {
		t.Fatal("expected password above bcrypt byte limit to be rejected")
	}
}

func TestValidateEmailForAuthRejectsMalformedInput(t *testing.T) {
	valid := []string{"dev@example.com", "DEV@example.com"}
	for _, email := range valid {
		if !validateEmailForAuth(email) {
			t.Fatalf("expected email %q to be accepted", email)
		}
	}
	invalid := []string{"", "missing-at", "a@b@c", "a@example.com\nX-Header: y"}
	for _, email := range invalid {
		if validateEmailForAuth(email) {
			t.Fatalf("expected email %q to be rejected", email)
		}
	}
}
