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

    const dispatch = order.dispatchDetails || {};

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
      <style>
        * {
          box-sizing: border-box;
        }
        body {
          font-family: 'Segoe UI', Arial, sans-serif;
          margin: 0;
          padding: 24px;
          color: #1a1a1a;
          font-size: 13px;
          background: #f4f4f5;
        }
        .container {
          width: 100%;
          max-width: 820px;
          margin: 0 auto;
          background: #fff;
          border: 1px solid #d0d0d0;
          border-radius: 6px;
          overflow: hidden;
          box-shadow: 0 1px 4px rgba(0,0,0,0.06);
        }
        .header-title {
          text-align: center;
          font-size: 20px;
          font-weight: 700;
          letter-spacing: 1px;
          background: #fafafa;
          border-bottom: 1px solid #d0d0d0;
          padding: 14px;
          text-transform: uppercase;
        }
        .row {
          display: flex;
          border-bottom: 1px solid #d0d0d0;
        }
        .col-left {
          width: 50%;
          border-right: 1px solid #d0d0d0;
          padding: 14px 16px;
        }
        .col-right {
          width: 50%;
          padding: 14px 16px;
        }
        .grid-2 {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 8px;
        }
        .grid-2 > div {
          flex: 1;
        }
        .bold {
          font-weight: 700;
        }
        .muted {
          color: #555;
        }
        h2, h3, p {
          margin: 0 0 6px 0;
        }
        h2 {
          font-size: 16px;
        }
        h3 {
          font-size: 14px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
        }
        th, td {
          border: 1px solid #d0d0d0;
          padding: 8px 10px;
          text-align: left;
        }
        th {
          background-color: #fafafa;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }
        tbody tr:nth-child(odd) td {
          background-color: #fcfcfc;
        }
        .text-right {
          text-align: right;
        }
        .text-center {
          text-align: center;
        }
        .totals-row td {
          background-color: #fafafa !important;
        }
        .grand-total td {
          font-size: 14px;
          background-color: #f0f0f0 !important;
        }
        .bank-details {
          padding: 14px 16px;
        }
        .footer-note {
          text-align: center;
          padding: 14px;
          font-size: 12px;
          color: #666;
          border-top: 1px solid #d0d0d0;
          background: #fafafa;
        }
        @media print {
          @page {
            margin: 0; /* This removes the default browser headers/footers (URL & Date) */
          }
          body {
            padding: 20px; /* Add padding back so content doesn't hit paper edge */
            background: #fff;
          }
          .container {
            border: 1px solid #000;
            border-radius: 0;
            box-shadow: none;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header-title">Bill of Supply</div>

        <div class="row">
          <div class="col-left">
            ${
              profile.logoUrl
                ? `<img src="${escapeHtml(profile.logoUrl)}" alt="Logo" style="max-width: 150px; max-height: 60px; margin-bottom: 10px;" />`
                : ""
            }
            <h2>${escapeHtml(safe(profile.companyName, "YOUR COMPANY NAME"))}</h2>
            <p class="muted">${escapeHtml(safe(profile.addressLine1, ""))}</p>
            <p class="muted">${escapeHtml(safe(profile.addressLine2, ""))}</p>
            <p class="muted">${escapeHtml(safe(profile.city, ""))}, ${escapeHtml(safe(profile.state, ""))} - ${escapeHtml(safe(profile.pincode, ""))}</p>
            <p class="muted">Email: ${escapeHtml(safe(profile.email, ""))}</p>
            <p class="muted">Phone: ${escapeHtml(safe(profile.phone, ""))}</p>
            <p><span class="bold">GSTIN/UIN:</span> ${escapeHtml(safe(profile.gstin, ""))}</p>
            <p><span class="bold">UDYAM Reg No:</span> ${escapeHtml(safe(profile.udyam, ""))}</p>
          </div>
          <div class="col-right">
            <div class="grid-2">
              <div><span class="bold">Invoice No.</span><br/>${escapeHtml(order.invoiceNo)}</div>
              <div><span class="bold">Dated</span><br/>${invoiceDateStr}</div>
            </div>
            <div class="grid-2">
              <div><span class="bold">Mode/Terms of Payment</span><br/>${escapeHtml(safe(dispatch.paymentTerms))}</div>
              <div><span class="bold">Destination</span><br/>${escapeHtml(safe(dispatch.destination))}</div>
            </div>
            <div class="grid-2">
              <div><span class="bold">Dispatched through</span><br/>${escapeHtml(safe(dispatch.dispatchedThrough))}</div>
              <div><span class="bold">Motor Vehicle No.</span><br/>${escapeHtml(safe(dispatch.motorVehicleNo))}</div>
            </div>
            <div class="grid-2" style="margin-bottom:0;">
              <div><span class="bold">Bill of Lading/LR-RR No.</span><br/>${escapeHtml(safe(dispatch.lrNumber))}</div>
            </div>
          </div>
        </div>

        <div class="row">
          <div class="col-left">
            <p class="bold">Buyer (Bill to)</p>
            <h3>${escapeHtml(safe(order.customerName, "Customer"))}</h3>
            <p class="muted">${escapeHtml(safe(order.billingAddress, "Address not provided"))}</p>
            <p><span class="bold">GSTIN/UIN:</span> ${escapeHtml(safe(order.customerGst, "Unregistered"))}</p>
          </div>
          <div class="col-right">
            <p class="bold">Consignee (Ship to)</p>
            <h3>${escapeHtml(safe(order.customerName, "Customer"))}</h3>
            <p class="muted">${escapeHtml(safe(dispatch.shippingAddress || order.shippingAddress || order.billingAddress, "Address not provided"))}</p>
            <p><span class="bold">GSTIN/UIN:</span> ${escapeHtml(safe(order.customerGst, "Unregistered"))}</p>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th class="text-center" style="width:5%;">Sl No.</th>
              <th style="width:33%;">Description of Goods</th>
              <th style="width:13%;">HSN/SAC</th>
              <th class="text-center" style="width:10%;">Quantity</th>
              <th class="text-right" style="width:15%;">Rate</th>
              <th class="text-center" style="width:5%;">Per</th>
              <th class="text-right" style="width:19%;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
            <tr class="totals-row">
              <td colspan="6" class="text-right bold">Subtotal</td>
              <td class="text-right">${formatCurrency(order.subtotal)}</td>
            </tr>
            <tr class="totals-row">
              <td colspan="6" class="text-right bold">Total GST</td>
              <td class="text-right">${formatCurrency(order.gstAmount)}</td>
            </tr>
            <tr class="grand-total">
              <td colspan="6" class="text-right bold">Total Amount</td>
              <td class="text-right bold">${formatCurrency(order.totalAmount)}</td>
            </tr>
          </tbody>
        </table>

        <div class="bank-details">
          <p class="bold">Company's Bank Details</p>
          <p>Bank Name: <span class="bold">${escapeHtml(safe(profile.bankName, ""))}</span></p>
          <p>A/c No: <span class="bold">${escapeHtml(safe(profile.accountNumber, ""))}</span></p>
          <p>Branch &amp; IFSC Code: <span class="bold">${escapeHtml(safe(profile.branch, ""))} ${escapeHtml(safe(profile.ifscCode, ""))}</span></p>
        </div>

        <div class="footer-note">
          This is a computer generated invoice and does not require a signature.
        </div>
      </div>
      <script>
        // Auto-print when opened
        window.onload = function () {
          window.print();
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