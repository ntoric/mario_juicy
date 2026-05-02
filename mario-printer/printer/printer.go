package printer

import (
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/google/gousb"
	"tinygo.org/x/bluetooth"
)

var adapter = bluetooth.DefaultAdapter

func hexToID(hex string) gousb.ID {
	hex = strings.ReplaceAll(hex, "0x", "")
	val, _ := strconv.ParseInt(hex, 16, 32)
	return gousb.ID(val)
}

func Print(job PrintJob) error {
	switch strings.ToLower(job.Printer.Type) {
	case "bluetooth":
		return printBluetooth(job)
	case "usb", "":
		return printUSB(job)
	default:
		return fmt.Errorf("unsupported printer type: %s", job.Printer.Type)
	}
}

func printUSB(job PrintJob) error {
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

func printBluetooth(job PrintJob) error {
	if err := adapter.Enable(); err != nil {
		return fmt.Errorf("failed to enable bluetooth adapter: %v", err)
	}

	var addr bluetooth.Address
	addr.Set(job.Printer.Address)

	device, err := adapter.Connect(addr, bluetooth.ConnectionParams{})
	if err != nil {
		return fmt.Errorf("failed to connect to bluetooth printer: %v", err)
	}
	defer device.Disconnect()

	services, err := device.DiscoverServices(nil)
	if err != nil {
		return fmt.Errorf("failed to discover services: %v", err)
	}

	var writeChar *bluetooth.DeviceCharacteristic
	for _, service := range services {
		chars, err := service.DiscoverCharacteristics(nil)
		if err != nil {
			continue
		}
		for _, char := range chars {
			// On some platforms, we can't easily check properties.
			// Common printer characteristic UUIDs:
			// 00002af1-0000-1000-8000-00805f9b34fb (standard BLE write)
			// or just try writing to any characteristic that seems plausible.
			// For now, let's take the first one and try.
			// In a real scenario, we might want to filter by UUID.
			writeChar = &char
			break
		}
		if writeChar != nil {
			break
		}
	}

	if writeChar == nil {
		return fmt.Errorf("no writeable characteristic found on bluetooth printer")
	}

	// Render the job
	data, err := RenderPrintJob(job)
	if err != nil {
		return fmt.Errorf("rendering failed: %v", err)
	}

	// Use MTU if available
	mtu, _ := writeChar.GetMTU()
	if mtu == 0 {
		mtu = 20 // Default fallback
	}

	chunkSize := int(mtu) - 3 // Leave some overhead
	for i := 0; i < len(data); i += chunkSize {
		end := i + chunkSize
		if end > len(data) {
			end = len(data)
		}
		_, err = writeChar.WriteWithoutResponse(data[i:end])
		if err != nil {
			return fmt.Errorf("failed to write to bluetooth printer: %v", err)
		}
		time.Sleep(10 * time.Millisecond)
	}

	return nil
}


func DetectPrinters() ([]Device, error) {
	var devices []Device

	// 1. Detect USB Printers
	usbDevices, err := detectUSBPrinters()
	if err == nil {
		devices = append(devices, usbDevices...)
	}

	// 2. Detect Bluetooth Printers
	btDevices, err := detectBluetoothPrinters()
	if err == nil {
		devices = append(devices, btDevices...)
	}

	return devices, nil
}

func detectUSBPrinters() ([]Device, error) {
	ctx := gousb.NewContext()
	defer ctx.Close()

	var devices []Device

	ctx.OpenDevices(func(desc *gousb.DeviceDesc) bool {
		isPrinter := false
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

		dev, err := ctx.OpenDeviceWithVIDPID(desc.Vendor, desc.Product)
		name := fmt.Sprintf("USB Printer %s:%s", desc.Vendor, desc.Product)

		if err == nil && dev != nil {
			defer dev.Close()
			m, _ := dev.Manufacturer()
			p, _ := dev.Product()
			if m != "" || p != "" {
				name = strings.TrimSpace(m + " " + p)
				lowerName := strings.ToLower(name)
				if strings.Contains(lowerName, "printer") || strings.Contains(lowerName, "pos") || strings.Contains(lowerName, "thermal") {
					isPrinter = true
				}
			}
		}

		if isPrinter {
			devices = append(devices, Device{
				Name:      name,
				Type:      "USB",
				VendorID:  fmt.Sprintf("0x%s", desc.Vendor),
				ProductID: fmt.Sprintf("0x%s", desc.Product),
			})
		}

		return false
	})

	return devices, nil
}

func detectBluetoothPrinters() ([]Device, error) {
	if err := adapter.Enable(); err != nil {
		return nil, err
	}

	var devices []Device
	foundAddresses := make(map[string]bool)

	// Scan for 5 seconds
	err := adapter.Scan(func(adapter *bluetooth.Adapter, device bluetooth.ScanResult) {
		name := device.LocalName()
		if name == "" {
			name = "Unknown BT Device"
		}

		lowerName := strings.ToLower(name)
		// Heuristic to find printers
		if strings.Contains(lowerName, "printer") || strings.Contains(lowerName, "pos") || strings.Contains(lowerName, "thermal") || strings.Contains(lowerName, "mpt") {
			addr := device.Address.String()
			if !foundAddresses[addr] {
				foundAddresses[addr] = true
				devices = append(devices, Device{
					Name:    name,
					Type:    "Bluetooth",
					Address: addr,
				})
			}
		}
	})

	if err != nil {
		return nil, err
	}

	// We need to stop scanning after some time
	go func() {
		time.Sleep(5 * time.Second)
		adapter.StopScan()
	}()

	// Wait for scan to complete (approx)
	time.Sleep(6 * time.Second)

	return devices, nil
}

