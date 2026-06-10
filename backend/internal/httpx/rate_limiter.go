package httpx

import (
	"sync"
	"time"
)

type rateLimitBucket struct {
	hits []time.Time
}

type rateLimiter struct {
	mu      sync.Mutex
	maxHits int
	window  time.Duration
	buckets map[string]rateLimitBucket
	now     func() time.Time
}

func newRateLimiter(maxHits int, window time.Duration) *rateLimiter {
	if maxHits <= 0 {
		maxHits = 8
	}
	if window <= 0 {
		window = 15 * time.Minute
	}
	return &rateLimiter{
		maxHits: maxHits,
		window:  window,
		buckets: map[string]rateLimitBucket{},
		now:     time.Now,
	}
}

func (r *rateLimiter) allow(key string) (bool, time.Duration) {
	return r.allowMany([]string{key})
}

func (r *rateLimiter) allowMany(keys []string) (bool, time.Duration) {
	if len(keys) == 0 {
		keys = []string{"unknown"}
	}

	r.mu.Lock()
	defer r.mu.Unlock()

	now := r.now().UTC()
	cleaned := make(map[string][]time.Time, len(keys))
	var longestRetryAfter time.Duration

	for _, key := range keys {
		if key == "" {
			key = "unknown"
		}
		kept := r.activeHitsLocked(key, now)
		cleaned[key] = kept
		if len(kept) >= r.maxHits {
			retryAfter := r.window - now.Sub(kept[0])
			if retryAfter < time.Second {
				retryAfter = time.Second
			}
			if retryAfter > longestRetryAfter {
				longestRetryAfter = retryAfter
			}
		}
	}

	if longestRetryAfter > 0 {
		for key, kept := range cleaned {
			r.buckets[key] = rateLimitBucket{hits: kept}
		}
		return false, longestRetryAfter
	}

	for key, kept := range cleaned {
		kept = append(kept, now)
		r.buckets[key] = rateLimitBucket{hits: kept}
	}
	return true, 0
}

func (r *rateLimiter) activeHitsLocked(key string, now time.Time) []time.Time {
	cutoff := now.Add(-r.window)
	bucket := r.buckets[key]
	kept := bucket.hits[:0]
	for _, hit := range bucket.hits {
		if hit.After(cutoff) {
			kept = append(kept, hit)
		}
	}
	return kept
}

func (r *rateLimiter) reset(key string) {
	r.mu.Lock()
	defer r.mu.Unlock()
	delete(r.buckets, key)
}
