export interface PrinterServiceData {
  type: "invoice";
  printer: {
    vendor_id: string;
    product_id: string;
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

export const mapToPrinterServiceData = (invoice: any, orderItems: any[]): PrinterServiceData => {
  const store = invoice.store_details;
  const taxDetails = invoice.tax_details || {};

  // Try to find CGST and SGST
  const cgst = parseFloat(taxDetails['CGST'] || '0');
  const sgst = parseFloat(taxDetails['SGST'] || '0');

  const formattedItems = orderItems.map(item => ({
    name: item.item_details.name,
    hsn: item.item_details.hsn_code || "",
    qty: item.quantity,
    unit: "PCS",
    rate: parseFloat(item.price),
    tax_percent: 5, // Default
    amount: parseFloat(item.price) * item.quantity
  }));

  const data: PrinterServiceData = {
    type: "invoice",
    printer: {
      vendor_id: store?.thermal_printer_vendor_id || "0x0fe6",
      product_id: store?.thermal_printer_product_id || "0x811e",
      paper_width: (store?.thermal_printer_size === '2_INCH' ? '2inch' : '3inch') as "2inch" | "3inch"
    },
    invoice: {
      store: {
        name: store?.name || "Mario Juicy",
        branch: store?.location || "Main Branch",
        gstin: store?.gst_number || "",
        fssai: store?.fssai_lic_no || "",
        phone: store?.phone || store?.mobile || ""
      },
      customer: {
        name: invoice.customer_name || "Guest"
      },
      invoice_no: invoice.invoice_number,
      bill_no: invoice.invoice_number.split('-').pop() || invoice.invoice_number,
      date: new Date(invoice.created_at).toLocaleString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }),
      payment_mode: invoice.payment_method || "CASH",
      dr_ref: invoice.reference_number || "",
      items: formattedItems,
      summary: {
        sub_total: parseFloat(invoice.subtotal),
        discount: parseFloat(invoice.discount_amount || '0'),
        taxable: parseFloat(invoice.subtotal) - parseFloat(invoice.discount_amount || '0'),
        cgst: cgst,
        sgst: sgst,
        grand_total: parseFloat(invoice.total_amount)
      },
      payment: {
        cash: invoice.payment_method === 'CASH' ? parseFloat(invoice.total_amount) : 0,
        card: invoice.payment_method === 'CARD' ? parseFloat(invoice.total_amount) : 0,
        upi: invoice.payment_method === 'UPI' ? parseFloat(invoice.total_amount) : 0,
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
