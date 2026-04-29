package printer

import (
	"fmt"
	"strconv"
	"strings"

	"github.com/google/gousb"
)

func hexToID(hex string) gousb.ID {
	hex = strings.ReplaceAll(hex, "0x", "")
	val, _ := strconv.ParseInt(hex, 16, 32)
	return gousb.ID(val)
}

func Print(job PrintJob) error {
	ctx := gousb.NewContext()
	defer ctx.Close()

	dev, err := ctx.OpenDeviceWithVIDPID(
		hexToID(job.Printer.VendorID),
		hexToID(job.Printer.ProductID),
	)

	if err != nil {
		return err
	}

	if dev == nil {
		return fmt.Errorf("printer not found (VID:%s PID:%s)", job.Printer.VendorID, job.Printer.ProductID)
	}

	defer dev.Close()

	// Claim the default configuration
	cfg, err := dev.Config(1)
	if err != nil {
		return fmt.Errorf("failed to get config: %v", err)
	}
	defer cfg.Close()

	// Claim the interface
	intf, err := cfg.Interface(0, 0)
	if err != nil {
		return fmt.Errorf("failed to claim interface: %v", err)
	}
	defer intf.Close()

	// Find the OUT endpoint
	var ep *gousb.OutEndpoint
	for _, desc := range intf.Setting.Endpoints {
		if desc.Direction == gousb.EndpointDirectionOut {
			ep, err = intf.OutEndpoint(desc.Number)
			if err != nil {
				return fmt.Errorf("failed to open endpoint: %v", err)
			}
			break
		}
	}

	if ep == nil {
		return fmt.Errorf("no OUT endpoint found")
	}

	// Render the job
	data, err := RenderPrintJob(job)
	if err != nil {
		return fmt.Errorf("rendering failed: %v", err)
	}

	// Send to printer
	_, err = ep.Write(data)
	return err
}

func DetectPrinters() ([]Device, error) {
	ctx := gousb.NewContext()
	defer ctx.Close()

	var devices []Device

	ctx.OpenDevices(func(desc *gousb.DeviceDesc) bool {
		// Basic filtering: Check if it's a printer class (0x07)
		// Or check if it has multiple interfaces (common for POS)
		isPrinter := false
		
		// Check interface classes
		for _, cfg := range desc.Configs {
			for _, intf := range cfg.Interfaces {
				for _, alt := range intf.AltSettings {
					if alt.Class == gousb.ClassPrinter {
						isPrinter = true
						break
					}
				}
			}
		}

		// Try to open and get strings for human-readable labels
		dev, err := ctx.OpenDeviceWithVIDPID(desc.Vendor, desc.Product)
		name := fmt.Sprintf("USB Printer %s:%s", desc.Vendor, desc.Product)
		
		if err == nil && dev != nil {
			defer dev.Close()
			m, _ := dev.Manufacturer()
			p, _ := dev.Product()
			if m != "" || p != "" {
				name = strings.TrimSpace(m + " " + p)
				// If name contains printer keywords, consider it a printer even if class didn't match
				lowerName := strings.ToLower(name)
				if strings.Contains(lowerName, "printer") || strings.Contains(lowerName, "pos") || strings.Contains(lowerName, "thermal") {
					isPrinter = true
				}
			}
		}

		if isPrinter {
			devices = append(devices, Device{
				Name:      name,
				VendorID:  fmt.Sprintf("0x%s", desc.Vendor),
				ProductID: fmt.Sprintf("0x%s", desc.Product),
			})
		}
		
		return false // continue scanning
	})

	return devices, nil
}
