const { onRequest } = require("firebase-functions/v2/https");
const { getFirestore } = require("firebase-admin/firestore");

const db = getFirestore();

exports.downloadInvoice = onRequest(async (req, res) => {
  try {
    const orderId = req.query.orderId;
    if (!orderId) {
      return res.status(400).send("Missing orderId");
    }

    // Fetch order
    const orderSnap = await db.collection("orders").doc(orderId).get();
    if (!orderSnap.exists) {
      return res.status(404).send("Order not found");
    }
    const order = orderSnap.data();

    // Verify payment status (enforced server-side as well as hidden client-side)
    if (order.paymentStatus !== "Done") {
      return res.status(403).send("Invoice is not available until payment is Done.");
    }

    if (!order.invoiceNo) {
      return res
        .status(403)
        .send(
          "Invoice number has not been generated for this order yet. Please fill dispatch details in the admin panel."
        );
    }

    // Fetch business profile
    const profileSnap = await db.collection("settings").doc("businessProfile").get();
    const profile = profileSnap.exists ? profileSnap.data() : {};

    // Fetch live customer details to handle updates
    let customer = {};
    if (order.customerId) {
      const customerSnap = await db.collection("users").doc(order.customerId).get();
      if (customerSnap.exists) {
        customer = customerSnap.data();
      }
    }

    const customerName = customer.tradeName || customer.displayName || order.customerName;
    const customerGst = customer.gstNumber || order.customerGst;
    const customerBillingAddress = customer.billingAddress || order.billingAddress;
    const dispatch = order.dispatchDetails || {};
    // Shipping address defaults to the one selected during dispatch, otherwise live billing address, otherwise order billing address
    const shippingAddress = dispatch.shippingAddress || customerBillingAddress;

    // Date formatting
    const invoiceDateStr = order.invoiceDate
      ? new Date(order.invoiceDate.toDate()).toLocaleDateString("en-IN")
      : new Date().toLocaleDateString("en-IN");

    // Number formatting
    const formatCurrency = (amount) =>
      new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(amount || 0);

    // Small helper to avoid "undefined"/"null" leaking into the HTML
    const safe = (val, fallback = "-") =>
      val === undefined || val === null || val === "" ? fallback : val;

    // Escape user-controlled strings before interpolating into HTML
    const escapeHtml = (str) => {
      if (str === undefined || str === null) return "";
      return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
    };

    const itemsHtml = (order.items || [])
      .map(
        (item, idx) => `
          <tr>
            <td class="text-center">${idx + 1}</td>
            <td>${escapeHtml(item.name)}</td>
            <td>${escapeHtml(safe(item.hsnCode))}</td>
            <td class="text-center">${escapeHtml(item.quantityKg)}</td>
            <td class="text-right">${formatCurrency(item.basePriceKg)}</td>
            <td class="text-center">Kg</td>
            <td class="text-right">${formatCurrency(item.lineTotal)}</td>
          </tr>`
      )
      .join("");

    // Build HTML string
    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Invoice - ${escapeHtml(order.invoiceNo)}</title>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
      <style>
        * { box-sizing: border-box; }
        body {
          font-family: 'Inter', sans-serif;
          margin: 0;
          padding: 40px 20px;
          color: #1f2937;
          font-size: 13px;
          background: #f3f4f6;
          -webkit-font-smoothing: antialiased;
        }
        .container {
          width: 100%;
          max-width: 850px;
          margin: 0 auto;
          background: #ffffff;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
        }
        .header {
          background: #111827;
          color: #ffffff;
          padding: 40px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .header-left {
          display: flex;
          align-items: center;
          gap: 20px;
        }
        .header-right {
          text-align: right;
        }
        .invoice-title {
          font-size: 32px;
          font-weight: 800;
          letter-spacing: 2px;
          margin: 0;
          text-transform: uppercase;
        }
        .invoice-subtitle {
          color: #9ca3af;
          font-size: 14px;
          margin-top: 4px;
        }
        .section-wrapper {
          padding: 0 40px;
        }
        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 40px;
          margin-top: 40px;
          margin-bottom: 40px;
        }
        .info-box {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 20px;
        }
        .info-title {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: #6b7280;
          font-weight: 700;
          margin-bottom: 12px;
        }
        .info-text {
          line-height: 1.6;
        }
        .bold { font-weight: 700; color: #111827; }
        .muted { color: #6b7280; }
        
        .meta-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 15px;
          margin-bottom: 30px;
          padding-bottom: 30px;
          border-bottom: 1px dashed #e5e7eb;
        }
        .meta-item > span {
          display: block;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #6b7280;
          margin-bottom: 4px;
        }
        .meta-item > div {
          font-weight: 600;
          font-size: 13px;
        }

        table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          margin-bottom: 40px;
        }
        th, td {
          padding: 16px;
          text-align: left;
          border-bottom: 1px solid #e5e7eb;
        }
        th {
          background-color: #f9fafb;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: #6b7280;
          font-weight: 700;
          border-top: 1px solid #e5e7eb;
        }
        th:first-child { border-top-left-radius: 8px; border-left: 1px solid #e5e7eb; }
        th:last-child { border-top-right-radius: 8px; border-right: 1px solid #e5e7eb; }
        td:first-child { border-left: 1px solid #e5e7eb; }
        td:last-child { border-right: 1px solid #e5e7eb; }
        tbody tr:last-child td:first-child { border-bottom-left-radius: 8px; }
        tbody tr:last-child td:last-child { border-bottom-right-radius: 8px; }
        
        tbody tr:hover td { background-color: #f9fafb; }
        
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        
        .totals-container {
          display: flex;
          justify-content: flex-end;
          margin-bottom: 40px;
        }
        .totals-box {
          width: 320px;
          background: #f9fafb;
          border-radius: 8px;
          padding: 24px;
        }
        .totals-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 12px;
          color: #4b5563;
        }
        .totals-row.grand-total {
          margin-bottom: 0;
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid #e5e7eb;
          font-size: 18px;
          font-weight: 800;
          color: #111827;
        }
        
        .footer {
          border-top: 1px solid #e5e7eb;
          padding: 30px 40px;
          display: flex;
          justify-content: space-between;
          background: #f9fafb;
        }
        .bank-details { width: 50%; }
        .bank-details p { margin: 4px 0; }
        
        .signature {
          text-align: center;
          align-self: flex-end;
        }
        .sig-line {
          width: 150px;
          border-bottom: 1px solid #111827;
          margin-bottom: 8px;
        }

        @media print {
          @page { margin: 0; }
          body {
            padding: 0;
            background: #fff;
          }
          .container {
            border: none;
            border-radius: 0;
            box-shadow: none;
            max-width: 100%;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        
        <div class="header">
          <div class="header-left">
            ${
              profile.logoUrl
                ? `<img src="${escapeHtml(profile.logoUrl)}" alt="Logo" style="max-height: 70px; border-radius: 8px; background: white; padding: 4px;" />`
                : ""
            }
            <div>
              <h2 style="margin:0; font-size: 20px;">${escapeHtml(safe(profile.companyName, "YOUR COMPANY NAME"))}</h2>
              <div style="color: #9ca3af; font-size: 12px; margin-top: 4px;">
                ${escapeHtml(safe(profile.city, ""))}, ${escapeHtml(safe(profile.state, ""))}
              </div>
            </div>
          </div>
          <div class="header-right">
            <h1 class="invoice-title">INVOICE</h1>
            <div class="invoice-subtitle">TAX INVOICE / BILL OF SUPPLY</div>
          </div>
        </div>

        <div class="section-wrapper">
          <div class="info-grid">
            <div class="info-box">
              <div class="info-title">Billed To</div>
              <div class="info-text">
                <div class="bold" style="font-size: 16px; margin-bottom: 4px;">${escapeHtml(safe(customerName, "Customer"))}</div>
                <div class="muted">${escapeHtml(safe(customerBillingAddress, "Address not provided"))}</div>
                <div style="margin-top: 12px;"><span class="muted">GSTIN:</span> <span class="bold">${escapeHtml(safe(customerGst, "Unregistered"))}</span></div>
              </div>
            </div>
            
            <div class="info-box" style="background: #fff; border-color: transparent; border-left: 1px solid #e5e7eb; border-radius: 0; padding-left: 30px;">
              <div class="info-title">Shipped To</div>
              <div class="info-text">
                <div class="bold" style="font-size: 14px; margin-bottom: 4px;">${escapeHtml(safe(customerName, "Customer"))}</div>
                <div class="muted">${escapeHtml(safe(shippingAddress, "Address not provided"))}</div>
              </div>
            </div>
          </div>

          <div class="meta-grid">
            <div class="meta-item">
              <span>Invoice No.</span>
              <div>${escapeHtml(order.invoiceNo)}</div>
            </div>
            <div class="meta-item">
              <span>Invoice Date</span>
              <div>${invoiceDateStr}</div>
            </div>
            <div class="meta-item">
              <span>Payment Terms</span>
              <div>${escapeHtml(safe(dispatch.paymentTerms, "Not specified"))}</div>
            </div>
            <div class="meta-item">
              <span>Dispatched Through</span>
              <div>${escapeHtml(safe(dispatch.dispatchedThrough, "Not specified"))}</div>
            </div>
            <div class="meta-item">
              <span>Destination</span>
              <div>${escapeHtml(safe(dispatch.destination, "Not specified"))}</div>
            </div>
            <div class="meta-item">
              <span>Vehicle No.</span>
              <div>${escapeHtml(safe(dispatch.motorVehicleNo, "Not specified"))}</div>
            </div>
            <div class="meta-item">
              <span>LR / RR No.</span>
              <div>${escapeHtml(safe(dispatch.lrNumber, "Not specified"))}</div>
            </div>
            <div class="meta-item">
              <span>Company GSTIN</span>
              <div>${escapeHtml(safe(profile.gstin, "Unregistered"))}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th class="text-center" style="width:5%;">#</th>
                <th style="width:33%;">Item Description</th>
                <th style="width:13%;">HSN/SAC</th>
                <th class="text-center" style="width:10%;">Qty (Kg)</th>
                <th class="text-right" style="width:15%;">Rate</th>
                <th class="text-right" style="width:24%;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div class="totals-container">
            <div class="totals-box">
              <div class="totals-row">
                <span>Subtotal</span>
                <span class="bold">${formatCurrency(order.subtotal)}</span>
              </div>
              <div class="totals-row">
                <span>Total GST</span>
                <span class="bold">${formatCurrency(order.gstAmount)}</span>
              </div>
              <div class="totals-row grand-total">
                <span>Total</span>
                <span>${formatCurrency(order.totalAmount)}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="footer">
          <div class="bank-details">
            <div class="info-title">Payment Details</div>
            <p><span class="muted">Bank:</span> <span class="bold">${escapeHtml(safe(profile.bankName, "Not provided"))}</span></p>
            <p><span class="muted">Account No:</span> <span class="bold">${escapeHtml(safe(profile.accountNumber, "Not provided"))}</span></p>
            <p><span class="muted">IFSC:</span> <span class="bold">${escapeHtml(safe(profile.ifscCode, "Not provided"))}</span></p>
            <p><span class="muted">Branch:</span> <span class="bold">${escapeHtml(safe(profile.branch, "Not provided"))}</span></p>
          </div>
          <div class="signature">
            <div class="sig-line"></div>
            <div style="font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Authorized Signature</div>
          </div>
        </div>
        
      </div>
      <script>
        window.onload = function () {
          setTimeout(function() { window.print(); }, 500);
        };
      </script>
    </body>
    </html>
    `;

    res.set("Content-Type", "text/html");
    res.status(200).send(html);
  } catch (error) {
    console.error("Error generating invoice:", error);
    res.status(500).send("Error generating invoice");
  }
});