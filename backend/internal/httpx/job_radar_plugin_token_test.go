package httpx

import (
	"strings"
	"testing"
	"time"
)

func TestJobRadarPluginTokenSecretUsesScopedPrefixAndHash(t *testing.T) {
	secret, err := newJobRadarPluginTokenSecret()
	if err != nil {
		t.Fatalf("create token secret: %v", err)
	}
	if !strings.HasPrefix(secret, jobRadarPluginTokenPrefix) {
		t.Fatalf("expected %q prefix, got %q", jobRadarPluginTokenPrefix, secret)
	}
	if len(secret) <= len(jobRadarPluginTokenPrefix)+32 {
		t.Fatalf("token secret is unexpectedly short: %d", len(secret))
	}

	hash := hashJobRadarPluginToken(secret)
	if len(hash) != 64 {
		t.Fatalf("expected sha256 hex hash length 64, got %d", len(hash))
	}
	if strings.Contains(hash, secret) {
		t.Fatal("token hash must not contain the raw token")
	}
	if hash != hashJobRadarPluginToken("  "+secret+"  ") {
		t.Fatal("token hashing should trim accidental whitespace")
	}
}

func TestPluginTokenExpirationDefaultsAndCaps(t *testing.T) {
	now := time.Date(2026, 6, 23, 12, 0, 0, 0, time.UTC)

	defaultExpiry := pluginTokenExpiresAt(0, now)
	if defaultExpiry == nil || !defaultExpiry.Equal(now.Add(defaultPluginTokenExpiresInDays*24*time.Hour)) {
		t.Fatalf("unexpected default expiry: %v", defaultExpiry)
	}

	cappedExpiry := pluginTokenExpiresAt(999, now)
	if cappedExpiry == nil || !cappedExpiry.Equal(now.Add(maximumPluginTokenExpiresInDays*24*time.Hour)) {
		t.Fatalf("unexpected capped expiry: %v", cappedExpiry)
	}
}

func TestNormalizePluginTokenNameUsesSafeDefaultAndLength(t *testing.T) {
	if got := normalizePluginTokenName(" \t\n"); got != defaultPluginTokenName {
		t.Fatalf("expected default token name, got %q", got)
	}
	longName := strings.Repeat("牛", 130)
	if got := normalizePluginTokenName(longName); len([]rune(got)) != 120 {
		t.Fatalf("expected 120-rune capped name, got %d", len([]rune(got)))
	}
}

func TestBearerTokenFromHeaderTrimsAndRequiresBearerPrefix(t *testing.T) {
	if token, ok := bearerTokenFromHeader("Bearer abc.def "); !ok || token != "abc.def" {
		t.Fatalf("expected bearer token, got token=%q ok=%v", token, ok)
	}
	if _, ok := bearerTokenFromHeader("Basic abc"); ok {
		t.Fatal("basic auth must not be accepted as bearer")
	}
	if _, ok := bearerTokenFromHeader("Bearer   "); ok {
		t.Fatal("empty bearer token must not be accepted")
	}
}
