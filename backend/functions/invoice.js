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

    const isAdmin = req.query.admin === 'true';

    // Payment status check removed — users can now view the invoice as soon as it is dispatched (i.e. has an invoiceNo).
    
    if (!order.invoiceNo) {
      return res.status(403).send("Invoice number has not been generated for this order yet. Please fill dispatch details in the admin panel.");
    }

    // Fetch business profile
    const profileSnap = await db.collection("settings").doc("businessProfile").get();
    const profile = profileSnap.exists ? profileSnap.data() : {};

    // Fetch customer data as fallback (to fix missing GST/address from older orders)
    let customerData = {};
    if (order.customerId) {
      const custSnap = await db.collection("users").doc(order.customerId).get();
      if (custSnap.exists) customerData = custSnap.data();
    }
    
    const resolvedCustomerName = order.customerName || customerData.displayName || customerData.tradeName || 'Customer';
    const resolvedBillingAddr = order.billingAddress || customerData.billingAddress || 'Address not provided';
    const dispatch = order.dispatchDetails || {};
    let resolvedShippingAddr = dispatch.shippingAddress || order.shippingAddress || (customerData.mailingAddresses && customerData.mailingAddresses.length > 0 ? customerData.mailingAddresses[0] : null);
    if (!resolvedShippingAddr) resolvedShippingAddr = resolvedBillingAddr;
    const resolvedGst = order.customerGst || customerData.gstNumber || 'Unregistered';
    
    // Date formatting
    const invoiceDateStr = order.invoiceDate 
      ? new Date(order.invoiceDate.toDate()).toLocaleDateString('en-IN') 
      : new Date().toLocaleDateString('en-IN');

    // Number formatting
    const formatCurrency = (amount) => {
      return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
    };

    // Calculate taxes (Assuming intra-state CGST/SGST half-and-half for now, or just total GST)
    // For simplicity, we just display the total GST amount. 
    
    // Build HTML string
    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Invoice - ${order.invoiceNo}</title>
      <style>
        * { box-sizing: border-box; }
        body {
          font-family: 'Segoe UI', Arial, sans-serif;
          margin: 0;
          padding: 15mm;
          color: #000;
          font-size: 11px;
          line-height: 1.4;
          background: #fff;
        }
        .container {
          width: 100%;
          max-width: 190mm;
          margin: 0 auto;
          border: 2px solid #000;
          background-color: #fff;
        }
        .header-title {
          text-align: center;
          font-size: 16px;
          font-weight: bold;
          border-bottom: 2px solid #000;
          padding: 6px;
          letter-spacing: 2px;
          text-transform: uppercase;
        }
        .row {
          display: flex;
          border-bottom: 1px solid #000;
        }
        .col-left {
          width: 50%;
          border-right: 1px solid #000;
          padding: 10px 12px;
        }
        .col-right {
          width: 50%;
          padding: 10px 12px;
        }
        .grid-2 {
          display: flex;
          gap: 10px;
          margin-bottom: 6px;
        }
        .grid-2 > div { flex: 1; }
        .bold { font-weight: bold; }
        .label { font-size: 9px; color: #333; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px; }
        h2 { margin: 0 0 6px 0; font-size: 15px; }
        h3 { margin: 0 0 4px 0; font-size: 13px; }
        p { margin: 0 0 3px 0; }
        table {
          width: 100%;
          border-collapse: collapse;
        }
        th, td {
          border: 1px solid #000;
          padding: 6px 8px;
          text-align: left;
          font-size: 11px;
        }
        th {
          background-color: #f5f5f5;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .company-logo {
          max-height: 60px;
          max-width: 160px;
          margin-bottom: 8px;
          display: block;
        }
        .footer-row {
          display: flex;
          border-top: 1px solid #000;
          min-height: 80px;
        }
        .footer-left {
          width: 55%;
          border-right: 1px solid #000;
          padding: 10px 12px;
        }
        .footer-right {
          width: 45%;
          padding: 10px 12px;
          text-align: right;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        @media print {
          body, html { margin: 0; padding: 10mm; background-color: #fff; }
          .container { border: 2px solid #000; width: 100%; max-width: 100%; box-shadow: none; }
        }
      </style>
    </head>
    <body>
      <div class="container" id="invoice-content">
        <div class="header-title">Bill of Supply</div>
        
        <div class="row">
          <div class="col-left">
            ${profile.logoUrl ? `<img src="${profile.logoUrl}" crossorigin="anonymous" class="company-logo" alt="Company Logo" onerror="this.style.display='none'"/>` : ''}
            <h2>${profile.companyName || 'YOUR COMPANY NAME'}</h2>
            <p>${profile.addressLine1 || ''}</p>
            <p>${profile.addressLine2 || ''}</p>
            <p>${[profile.city, profile.state].filter(Boolean).join(', ')}${profile.pincode ? ' - ' + profile.pincode : ''}</p>
            ${profile.email ? `<p>Email: ${profile.email}</p>` : ''}
            ${profile.phone ? `<p>Phone: ${profile.phone}</p>` : ''}
            <p><span class="bold">GSTIN/UIN:</span> ${profile.gstin || 'N/A'}</p>
            ${profile.udyam ? `<p><span class="bold">UDYAM:</span> ${profile.udyam}</p>` : ''}
          </div>
          <div class="col-right">
            <div class="grid-2">
              <div><div class="label">Invoice No.</div>${order.invoiceNo || ''}</div>
              <div><div class="label">Dated</div>${invoiceDateStr}</div>
            </div>
            <div class="grid-2">
              <div><div class="label">Payment Terms</div>${dispatch.paymentTerms || '-'}</div>
              <div><div class="label">Dispatched Through</div>${dispatch.dispatchedThrough || '-'}</div>
            </div>
            <div class="grid-2">
              <div><div class="label">Destination</div>${dispatch.destination || '-'}</div>
              <div><div class="label">Vehicle No.</div>${dispatch.motorVehicleNo || '-'}</div>
            </div>
            <div class="grid-2" style="margin-bottom:0;">
              <div><div class="label">LR-RR No.</div>${dispatch.lrNumber || '-'}</div>
            </div>
          </div>
        </div>

        <div class="row">
          <div class="col-left">
            <div class="label" style="margin-bottom:4px;">Buyer (Bill to)</div>
            <h3>${resolvedCustomerName}</h3>
            <p>${resolvedBillingAddr}</p>
            <p style="margin-top:4px;"><span class="bold">GSTIN/UIN:</span> ${resolvedGst}</p>
          </div>
          <div class="col-right">
            <div class="label" style="margin-bottom:4px;">Consignee (Ship to)</div>
            <h3>${resolvedCustomerName}</h3>
            <p>${resolvedShippingAddr}</p>
            <p style="margin-top:4px;"><span class="bold">GSTIN/UIN:</span> ${resolvedGst}</p>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th class="text-center" style="width:5%;">Sl</th>
              <th style="width:35%;">Description of Goods</th>
              <th style="width:12%;">HSN/SAC</th>
              <th class="text-center" style="width:10%;">Qty (Kg)</th>
              <th class="text-right" style="width:15%;">Rate</th>
              <th class="text-center" style="width:5%;">Per</th>
              <th class="text-right" style="width:18%;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${(order.items || []).map((item, idx) => `
              <tr>
                <td class="text-center">${idx + 1}</td>
                <td>${item.name}</td>
                <td>${item.hsnCode || '-'}</td>
                <td class="text-center">${item.quantityKg}</td>
                <td class="text-right">${formatCurrency(item.basePriceKg)}</td>
                <td class="text-center">Kg</td>
                <td class="text-right">${formatCurrency(item.lineTotal)}</td>
              </tr>
            `).join('')}
            <tr>
              <td colspan="6" class="text-right bold" style="border-bottom:none;">Subtotal</td>
              <td class="text-right" style="border-bottom:none;">${formatCurrency(order.subtotal || 0)}</td>
            </tr>
            <tr>
              <td colspan="6" class="text-right bold" style="border-top:none;border-bottom:none;">GST</td>
              <td class="text-right" style="border-top:none;border-bottom:none;">${formatCurrency(order.gstAmount || 0)}</td>
            </tr>
            <tr>
              <td colspan="6" class="text-right bold" style="border-top:none;font-size:13px;">Total</td>
              <td class="text-right bold" style="border-top:none;font-size:13px;">${formatCurrency(order.totalAmount || 0)}</td>
            </tr>
          </tbody>
        </table>

        <div class="footer-row">
          <div class="footer-left">
            <div class="label" style="margin-bottom:6px;">Company's Bank Details</div>
            <p>Bank Name: <span class="bold">${profile.bankName || ''}</span></p>
            <p>A/c No: <span class="bold">${profile.accountNumber || ''}</span></p>
            <p>Branch & IFSC: <span class="bold">${profile.branch || ''}${profile.ifscCode ? ' / ' + profile.ifscCode : ''}</span></p>
          </div>
          <div class="footer-right">
            <p class="bold">for ${profile.companyName || 'YOUR COMPANY NAME'}</p>
            <p style="margin-top:30px;">Authorised Signatory</p>
          </div>
        </div>

      </div>
      ${req.query.noJs === 'true' ? '' : `
      <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
      <script>
        window.onload = function() {
          // Wait for images to load before generating PDF
          var imgs = document.querySelectorAll('img');
          var loaded = 0;
          var total = imgs.length;
          function tryGenerate() {
            var element = document.getElementById('invoice-content');
            var opt = {
              margin: [5, 0, 5, 0],
              filename: 'Invoice_${order.invoiceNo || orderId}.pdf',
              image: { type: 'jpeg', quality: 0.98 },
              html2canvas: { scale: 2, useCORS: true, allowTaint: true, logging: false },
              jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };
            html2pdf().set(opt).from(element).save();
          }
          if (total === 0) { tryGenerate(); return; }
          imgs.forEach(function(img) {
            if (img.complete) { loaded++; if (loaded >= total) tryGenerate(); }
            else {
              img.onload = function() { loaded++; if (loaded >= total) tryGenerate(); };
              img.onerror = function() { loaded++; if (loaded >= total) tryGenerate(); };
            }
          });
          // Fallback: generate after 3 seconds even if images fail
          setTimeout(tryGenerate, 3000);
        }
      </script>`}
    </body>
    </html>
    `;

    res.set('Content-Type', 'text/html');
    res.status(200).send(html);
  } catch (error) {
    console.error("Error generating invoice:", error);
    res.status(500).send("Error generating invoice");
  }
});
