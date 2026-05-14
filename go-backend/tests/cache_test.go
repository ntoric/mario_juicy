package tests

import (
	"mario-backend/config"
	"mario-backend/services"
	"os"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func TestCacheService(t *testing.T) {
	// Setup env
	os.Setenv("CACHE_ENABLED", "true")
	os.Setenv("CACHE_TTL_MINUTES", "1")

	// Mock Redis is hard without a running instance, but we can check if it respects the flag
	config.Redis = nil // Simulate no redis connection

	key := "test_key"
	data := map[string]string{"foo": "bar"}

	// Should return false when Redis is nil
	var target map[string]string
	got := services.GetCache(key, &target)
	assert.False(t, got)

	// Test flag logic
	os.Setenv("CACHE_ENABLED", "false")
	services.SetCache(key, data, time.Minute)
	// Even if Redis was there, it would return early.
}

func TestCacheKeys(t *testing.T) {
	assert.Equal(t, "store:1:categories", services.GetCategoriesCacheKey(1))
	assert.Equal(t, "store:1:items:all", services.GetItemsCacheKey(1, ""))
	assert.Equal(t, "store:1:items:cat:5", services.GetItemsCacheKey(1, "5"))
	assert.Equal(t, "store:1:tables", services.GetTablesCacheKey(1))
}
