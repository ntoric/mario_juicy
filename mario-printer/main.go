package main

import (
	"fmt"
	"net/http"

	"mario-printer/printer"

	"github.com/gin-gonic/gin"
)

func main() {
	r := gin.Default()

	// Enable CORS for Mario POS
	r.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	})

	// Health check
	r.GET("/status", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status": "online",
			"system": "Mario Printer Service",
		})
	})

	// Detect connected USB printers
	r.GET("/printers", func(c *gin.Context) {
		devices, err := printer.DetectPrinters()
		if err != nil {
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}
		c.JSON(200, devices)
	})

	// Print invoice
	r.POST("/print", func(c *gin.Context) {
		var job printer.PrintJob
		if err := c.BindJSON(&job); err != nil {
			c.JSON(400, gin.H{"error": "Invalid request format: " + err.Error()})
			return
		}

		fmt.Printf("Received print job for %s\n", job.Printer.VendorID)

		err := printer.Print(job)
		if err != nil {
			fmt.Printf("Printing failed: %v\n", err)
			c.JSON(500, gin.H{"error": "Printing failed: " + err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Printed successfully"})
	})

	fmt.Println("Mario Printer Service starting on :8085...")
	r.Run(":8085")
}
