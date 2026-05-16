package services

import (
	"encoding/json"
	"fmt"
	"mario-backend/config"
	"mario-backend/utils"
	"os"
	"strconv"
	"time"

	"go.uber.org/zap"
)

func isCacheEnabled() bool {
	return os.Getenv("CACHE_ENABLED") == "true"
}

func getCacheTTL() time.Duration {
	ttlStr := os.Getenv("CACHE_TTL_MINUTES")
	if ttlStr == "" {
		return 60 * time.Minute // Default 1 hour
	}
	ttl, err := strconv.Atoi(ttlStr)
	if err != nil {
		return 60 * time.Minute
	}
	return time.Duration(ttl) * time.Minute
}

var CacheExpiration = getCacheTTL()

// Cache Keys
func GetCategoriesCacheKey(storeID uint) string {
	return fmt.Sprintf("store:%d:categories", storeID)
}

func GetItemsCacheKey(storeID uint, categoryID string) string {
	if categoryID == "" {
		return fmt.Sprintf("store:%d:items:all", storeID)
	}
	return fmt.Sprintf("store:%d:items:cat:%s", storeID, categoryID)
}

func GetTablesCacheKey(storeID uint) string {
	return fmt.Sprintf("store:%d:tables", storeID)
}

func InvalidateTablesCache(storeID uint) {
	InvalidateCache(GetTablesCacheKey(storeID))
	InvalidateCache(GetTablesCacheKey(storeID) + ":mobile")
}

// Generic Cache Methods
func SetCache(key string, data interface{}, expiration time.Duration) {
	if !isCacheEnabled() || config.Redis == nil {
		return
	}

	jsonData, err := json.Marshal(data)
	if err != nil {
		utils.Error("Failed to marshal cache data", zap.Error(err), zap.String("key", key))
		return
	}

	err = config.Redis.Set(config.Ctx, key, jsonData, expiration).Err()
	if err != nil {
		utils.Error("Failed to set cache", zap.Error(err), zap.String("key", key))
	}
}

func GetCache(key string, target interface{}) bool {
	if !isCacheEnabled() || config.Redis == nil {
		return false
	}

	val, err := config.Redis.Get(config.Ctx, key).Result()
	if err != nil {
		return false
	}

	err = json.Unmarshal([]byte(val), target)
	if err != nil {
		utils.Error("Failed to unmarshal cache data", zap.Error(err), zap.String("key", key))
		return false
	}

	return true
}

func InvalidateCache(key string) {
	if !isCacheEnabled() || config.Redis == nil {
		return
	}

	err := config.Redis.Del(config.Ctx, key).Err()
	if err != nil {
		utils.Error("Failed to invalidate cache", zap.Error(err), zap.String("key", key))
	}
}

func InvalidateStoreCache(storeID uint) {
	if !isCacheEnabled() || config.Redis == nil {
		return
	}

	// Invalidate all keys for the store
	pattern := fmt.Sprintf("store:%d:*", storeID)
	iter := config.Redis.Scan(config.Ctx, 0, pattern, 0).Iterator()
	for iter.Next(config.Ctx) {
		config.Redis.Del(config.Ctx, iter.Val())
	}
}
