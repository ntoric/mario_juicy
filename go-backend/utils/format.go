package utils

import (
	"fmt"
	"golang.org/x/text/language"
	"golang.org/x/text/message"
)

// FormatCurrency formats a float64 to Indian Rupee style (2 decimal places)
func FormatCurrency(amount float64) string {
	p := message.NewPrinter(language.English)
	return p.Sprintf("%.2f", amount)
}

// FormatPercentage formats a float64 to a percentage string
func FormatPercentage(val float64) string {
	return fmt.Sprintf("%.1f%%", val)
}
