package printer

type PrinterConfig struct {
	VendorID   string `json:"vendor_id"`
	ProductID  string `json:"product_id"`
	PaperWidth string `json:"paper_width"` // "2inch" or "3inch"
}

type Store struct {
	Name   string `json:"name"`
	Branch string `json:"branch"`
	GSTIN  string `json:"gstin"`
	Fssai  string `json:"fssai"`
	Phone  string `json:"phone"`
}

type Customer struct {
	Name string `json:"name"`
}

type Item struct {
	Name       string  `json:"name"`
	HSN        string  `json:"hsn"`
	Qty        float64 `json:"qty"`
	Unit       string  `json:"unit"`
	Rate       float64 `json:"rate"`
	TaxPercent float64 `json:"tax_percent"`
	Amount     float64 `json:"amount"`
}

type Summary struct {
	SubTotal   float64 `json:"sub_total"`
	Discount   float64 `json:"discount"`
	Taxable    float64 `json:"taxable"`
	CGST       float64 `json:"cgst"`
	SGST       float64 `json:"sgst"`
	GrandTotal float64 `json:"grand_total"`
}

type Payment struct {
	Cash    float64 `json:"cash"`
	Card    float64 `json:"card"`
	Balance float64 `json:"balance"`
	UPI     float64 `json:"upi"`
}

type QR struct {
	Description string `json:"description"`
	Value       string `json:"value"`
	Size        int    `json:"size"`
}

type Invoice struct {
	Store       Store    `json:"store"`
	Customer    Customer `json:"customer"`
	InvoiceNo   string   `json:"invoice_no"`
	BillNo      string   `json:"bill_no"`
	Date        string   `json:"date"`
	PaymentMode string   `json:"payment_mode"`
	DrRef       string   `json:"dr_ref"`
	Items       []Item   `json:"items"`
	Summary     Summary  `json:"summary"`
	Payment     Payment  `json:"payment"`
	QR          *QR      `json:"qr,omitempty"`
	Footer      []string `json:"footer"`
}

type PrintJob struct {
	Type    string        `json:"type"` // "invoice"
	Printer PrinterConfig `json:"printer"`
	Invoice *Invoice      `json:"invoice,omitempty"`
}

type Device struct {
	Name      string `json:"name"`
	VendorID  string `json:"vendor_id"`
	ProductID string `json:"product_id"`
}
