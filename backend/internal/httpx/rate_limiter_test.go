package httpx

import (
	"testing"
	"time"
)

func TestRateLimiterBlocksWithinWindowAndAllowsAfterWindow(t *testing.T) {
	limiter := newRateLimiter(2, time.Minute)
	current := time.Date(2026, 6, 3, 10, 0, 0, 0, time.UTC)
	limiter.now = func() time.Time { return current }

	if ok, _ := limiter.allow("login:ip:127.0.0.1"); !ok {
		t.Fatal("first hit should be allowed")
	}
	if ok, _ := limiter.allow("login:ip:127.0.0.1"); !ok {
		t.Fatal("second hit should be allowed")
	}
	if ok, retryAfter := limiter.allow("login:ip:127.0.0.1"); ok || retryAfter <= 0 {
		t.Fatalf("third hit should be blocked with retry-after, ok=%v retryAfter=%s", ok, retryAfter)
	}

	current = current.Add(time.Minute + time.Second)
	if ok, _ := limiter.allow("login:ip:127.0.0.1"); !ok {
		t.Fatal("hit after window should be allowed")
	}
}

func TestAllowAuthAttemptConsumesAllKeys(t *testing.T) {
	limiter := newRateLimiter(1, time.Minute)
	keys := []string{"login:ip:127.0.0.1", "login:pair:127.0.0.1:email"}

	if ok, _ := allowAuthAttempt(limiter, keys); !ok {
		t.Fatal("first multi-key auth attempt should be allowed")
	}
	if ok, _ := allowAuthAttempt(limiter, []string{keys[0], "login:pair:127.0.0.1:other"}); ok {
		t.Fatal("shared IP key should block rotating email attempts")
	}
}
