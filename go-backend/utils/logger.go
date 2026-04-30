package utils

import (
	"os"

	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

var Log *zap.Logger

// InitializeLogger initializes the global zap logger
func InitializeLogger() {
	config := zap.NewProductionConfig()

	// Customize for development if needed
	if os.Getenv("APP_ENV") == "development" || os.Getenv("DEBUG") == "true" {
		config = zap.NewDevelopmentConfig()
		config.EncoderConfig.EncodeLevel = zapcore.CapitalColorLevelEncoder
	}

	// Set output path (can be extended to log to files)
	config.OutputPaths = []string{"stdout"}

	var err error
	Log, err = config.Build(zap.AddCallerSkip(1))
	if err != nil {
		panic(err)
	}

	zap.ReplaceGlobals(Log)
}

// Info logs info level message
func Info(message string, fields ...zap.Field) {
	Log.Info(message, fields...)
}

// Error logs error level message
func Error(message string, fields ...zap.Field) {
	Log.Error(message, fields...)
}

// Debug logs debug level message
func Debug(message string, fields ...zap.Field) {
	Log.Debug(message, fields...)
}

// Warn logs warn level message
func Warn(message string, fields ...zap.Field) {
	Log.Warn(message, fields...)
}

// Fatal logs fatal level message and exits
func Fatal(message string, fields ...zap.Field) {
	Log.Fatal(message, fields...)
}
