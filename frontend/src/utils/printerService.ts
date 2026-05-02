import { toast } from 'sonner';

export interface PrinterServiceData {
  type: "invoice";
  printer: {
    type: string;
    vendor_id: string;
    product_id: string;
    address: string;
    paper_width: "2inch" | "3inch";
  };
  invoice: {
    store: {
      name: string;
      branch: string;
      gstin: string;
      fssai: string;
      phone: string;
    };
    customer: {
      name: string;
    };
    invoice_no: string;
    bill_no: string;
    date: string;
    payment_mode: string;
    dr_ref: string;
    invoice_ref: string | number;
    items: Array<{
      name: string;
      hsn: string;
      qty: number;
      unit: string;
      rate: number;
      tax_percent: number;
      amount: number;
    }>;
    summary: {
      sub_total: number;
      discount: number;
      taxable: number;
      cgst: number;
      sgst: number;
      grand_total: number;
    };
    payment: {
      cash: number;
      card: number;
      balance: number;
      upi: number;
    };
    qr?: {
      description: string;
      value: string;
      size: number;
    };
    footer: string[];
  };
}

export const mapToPrinterServiceData = (invoice: any, orderItems: any[], storeOverride?: any): PrinterServiceData => {
  const store = storeOverride || invoice.store_details || invoice.store;
  const taxDetails = invoice.tax_details || {};
  
  // Handle case where taxDetails is a string (JSON string from raw model)
  let parsedTaxDetails = taxDetails;
  if (typeof taxDetails === 'string') {
    try {
      parsedTaxDetails = JSON.parse(taxDetails);
    } catch (e) {
      parsedTaxDetails = {};
    }
  }

  // Try to find CGST and SGST
  const cgst = parseFloat(parsedTaxDetails['CGST'] || parsedTaxDetails['cgst'] || '0');
  const sgst = parseFloat(parsedTaxDetails['SGST'] || parsedTaxDetails['sgst'] || '0');

  const formattedItems = (orderItems || []).map(item => ({
    name: item?.item_details?.name || "Unknown Item",
    hsn: item?.item_details?.hsn_code || "",
    qty: item?.quantity || 1,
    unit: "PCS",
    rate: parseFloat(item?.price || '0'),
    tax_percent: 5, // Default
    amount: parseFloat(item?.price || '0') * (item?.quantity || 1)
  }));

  const data: PrinterServiceData = {
    type: "invoice",
    printer: {
      type: (store?.thermal_printer_type || 'usb').toLowerCase(),
      vendor_id: store?.thermal_printer_vendor_id || "0x0fe6",
      product_id: store?.thermal_printer_product_id || "0x811e",
      address: store?.thermal_printer_address || "",
      paper_width: (store?.thermal_printer_size === '2_INCH' ? '2inch' : '3inch') as "2inch" | "3inch"
    },
    invoice: {
      store: {
        name: store?.name || store?.Name || "Mario Juicy",
        branch: store?.location || store?.Location || store?.branch_name || "Main Branch",
        gstin: store?.gst_number || store?.GSTNumber || store?.gstin || "",
        fssai: store?.fssai_lic_no || store?.FSSAILicNo || store?.fssai || "",
        phone: store?.phone || store?.Phone || store?.mobile || store?.Mobile || store?.contact || ""
      },
      customer: {
        name: invoice.customer_name || invoice.CustomerName || "Guest"
      },
      invoice_no: invoice.invoice_number || invoice.InvoiceNumber || "",
      bill_no: (invoice.invoice_number || invoice.InvoiceNumber || "").split('-').pop() || invoice.invoice_number || invoice.InvoiceNumber || "",
      date: new Date(invoice.created_at || invoice.CreatedAt || new Date()).toLocaleString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }),
      payment_mode: invoice.payment_method || invoice.PaymentMethod || "CASH",
      dr_ref: invoice.reference_number || invoice.ReferenceNumber || "",
      invoice_ref: invoice.order_id || invoice.OrderID || invoice.order || "",
      items: formattedItems,
      summary: {
        sub_total: parseFloat(invoice.subtotal || invoice.Subtotal || invoice.sub_total || invoice.total || invoice.Total || '0'),
        discount: parseFloat(invoice.discount_amount || invoice.DiscountAmount || '0'),
        taxable: parseFloat(invoice.subtotal || invoice.Subtotal || invoice.sub_total || '0') - parseFloat(invoice.discount_amount || invoice.DiscountAmount || '0'),
        cgst: cgst,
        sgst: sgst,
        grand_total: parseFloat(invoice.total_amount || invoice.TotalAmount || invoice.grand_total || invoice.GrandTotal || invoice.total || invoice.Total || '0')
      },
      payment: {
        cash: (invoice.payment_method || invoice.PaymentMethod) === 'CASH' ? parseFloat(invoice.total_amount || invoice.TotalAmount || invoice.grand_total || invoice.GrandTotal || invoice.total || invoice.Total || '0') : 0,
        card: (invoice.payment_method || invoice.PaymentMethod) === 'CARD' ? parseFloat(invoice.total_amount || invoice.TotalAmount || invoice.grand_total || invoice.GrandTotal || invoice.total || invoice.Total || '0') : 0,
        upi: (invoice.payment_method || invoice.PaymentMethod) === 'UPI' ? parseFloat(invoice.total_amount || invoice.TotalAmount || invoice.grand_total || invoice.GrandTotal || invoice.total || invoice.Total || '0') : 0,
        balance: 0
      },
      footer: [
        "Thank You! Visit Again",
        "Keep the bill for exchange"
      ]
    }
  };

  // Add QR code if UPI
  // if (invoice.payment_method === 'UPI') {
  //   data.invoice.qr = {
  //     description: "Scan to Pay",
  //     value: `upi://pay?pa=test@upi&pn=${encodeURIComponent(store?.name || 'Mario')}&am=${invoice.total_amount}`,
  //     size: 8
  //   };
  // }

  return data;
};

export const printInvoice = async (invoice: any, items: any[], storeOverride?: any): Promise<boolean> => {
  if (!invoice) return false;
  
  const { mapToPrinterServiceData } = await import('./printerService');
  const printData = mapToPrinterServiceData(invoice, items || [], storeOverride);
  const store = storeOverride || invoice.store_details || invoice.store;

  // CHECK: If printer is not selected
  if (!store?.thermal_printer_name) {
    toast.info("Printer not selected", {
      description: "Please configure a thermal printer in Store Settings to print invoices."
    });
    return true; // Return true to prevent error fallbacks or system print
  }
  
  console.log('Printing Invoice Data:', JSON.stringify(printData, null, 2));

  // TRY 1: Direct Fetch to Local Service (Port 8085)
  // This works in both Browser and Electron if the service is running
  try {
    const response = await fetch('http://localhost:8085/print', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(printData)
    });
    if (response.ok) return true;
  } catch (e) {
    console.warn("Direct fetch to printer service failed:", e);
  }

  // TRY 2: Electron Bridge (via preload script)
  if (typeof window !== 'undefined' && (window as any).api) {
    const api = (window as any).api;
    if (api.printToService) {
      try {
        await api.printToService(printData);
        return true;
      } catch (e) {
        console.error("Local service print via bridge failed:", e);
      }
    }
  }

  return false;
};
