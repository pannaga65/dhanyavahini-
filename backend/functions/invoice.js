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

    // Verify payment status
    if (!isAdmin && order.paymentStatus !== "Done") {
      return res.status(403).send("Invoice is not available until payment is Done.");
    }
    
    if (!order.invoiceNo) {
      return res.status(403).send("Invoice number has not been generated for this order yet. Please fill dispatch details in the admin panel.");
    }

    // Fetch business profile
    const profileSnap = await db.collection("settings").doc("businessProfile").get();
    const profile = profileSnap.exists ? profileSnap.data() : {};

    // Fetch customer data as fallback (to fix missing GST/address from older orders)
    let customerData = {};
    if (order.customerId) {
      const custSnap = await db.collection("customers").doc(order.customerId).get();
      if (custSnap.exists) customerData = custSnap.data();
    }
    
    const resolvedCustomerName = order.customerName || customerData.displayName || customerData.tradeName || 'Customer';
    const resolvedBillingAddr = order.billingAddress || customerData.billingAddress || 'Address not provided';
    let resolvedShippingAddr = order.shippingAddress || (customerData.mailingAddresses && customerData.mailingAddresses.length > 0 ? customerData.mailingAddresses[0] : null);
    if (!resolvedShippingAddr) resolvedShippingAddr = resolvedBillingAddr;
    const resolvedGst = order.customerGst || customerData.gstNumber || 'Unregistered';

    const dispatch = order.dispatchDetails || {};
    
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
        body {
          font-family: Arial, sans-serif;
          margin: 0;
          padding: 20px;
          color: #000;
          font-size: 12px;
        }
        .container {
          width: 100%;
          max-width: 794px;
          margin: 0 auto;
          border: 1px solid #000;
          background-color: #fff;
        }
        .header-title {
          text-align: center;
          font-size: 18px;
          font-weight: bold;
          border-bottom: 1px solid #000;
          padding: 8px;
        }
        .row {
          display: flex;
          border-bottom: 1px solid #000;
        }
        .col-left {
          width: 50%;
          border-right: 1px solid #000;
          padding: 10px;
        }
        .col-right {
          width: 50%;
          padding: 10px;
        }
        .grid-2 {
          display: flex;
          justify-content: space-between;
          margin-bottom: 5px;
        }
        .bold {
          font-weight: bold;
        }
        h2, h3, p {
          margin: 0 0 5px 0;
        }
        table {
          width: 100%;
          border-collapse: collapse;
        }
        th, td {
          border: 1px solid #000;
          padding: 8px;
          text-align: left;
        }
        th {
          background-color: #f9f9f9;
        }
        .text-right {
          text-align: right;
        }
        .text-center {
          text-align: center;
        }
        .no-border-top {
          border-top: none;
        }
        .no-border-bottom {
          border-bottom: none;
        }
        @media print {
          body, html { margin: 0; padding: 0; max-width: 100%; background-color: #fff; }
          .container { border: 1px solid #000; width: 100%; max-width: 100%; box-shadow: none; }
        }
      </style>
    </head>
    <body>
      <div class="container" id="invoice-content">
        <div class="header-title">BILL OF SUPPLY</div>
        
        <div class="row">
          <div class="col-left">
            ${profile.logoUrl ? `<div style="margin-bottom: 15px;"><img src="${profile.logoUrl}" style="max-height: 80px; max-width: 200px;"/></div>` : ''}
            <h2>${profile.companyName || 'YOUR COMPANY NAME'}</h2>
            <p>${profile.addressLine1 || ''}</p>
            <p>${profile.addressLine2 || ''}</p>
            <p>${profile.city || ''}, ${profile.state || ''} - ${profile.pincode || ''}</p>
            <p>Email: ${profile.email || ''}</p>
            <p>Phone: ${profile.phone || ''}</p>
            <p><span class="bold">GSTIN/UIN:</span> ${profile.gstin || ''}</p>
            <p><span class="bold">UDYAM Reg No:</span> ${profile.udyam || ''}</p>
          </div>
          <div class="col-right">
            <div class="grid-2">
              <div><span class="bold">Invoice No.</span><br/>${order.invoiceNo || ''}</div>
              <div><span class="bold">Dated</span><br/>${invoiceDateStr}</div>
            </div>
            <div class="grid-2">
              <div><span class="bold">Mode/Terms of Payment</span><br/>${dispatch.paymentTerms || '-'}</div>
              <div><span class="bold">Dispatched through</span><br/>${dispatch.dispatchedThrough || '-'}</div>
            </div>
            <div class="grid-2">
              <div><span class="bold">Destination</span><br/>${dispatch.destination || '-'}</div>
              <div><span class="bold">Motor Vehicle No.</span><br/>${dispatch.motorVehicleNo || '-'}</div>
            </div>
            <div class="grid-2" style="margin-bottom:0;">
              <div><span class="bold">Bill of Lading/LR-RR No.</span><br/>${dispatch.lrNumber || '-'}</div>
            </div>
          </div>
        </div>

        <div class="row">
          <div class="col-left">
            <p class="bold">Buyer (Bill to)</p>
            <h3>${resolvedCustomerName}</h3>
            <p>${resolvedBillingAddr}</p>
            <p><span class="bold">GSTIN/UIN:</span> ${resolvedGst}</p>
          </div>
          <div class="col-right">
            <p class="bold">Consignee (Ship to)</p>
            <h3>${resolvedCustomerName}</h3>
            <p>${resolvedShippingAddr}</p>
            <p><span class="bold">GSTIN/UIN:</span> ${resolvedGst}</p>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th class="text-center" style="width:5%;">Sl No.</th>
              <th style="width:35%;">Description of Goods</th>
              <th style="width:15%;">HSN/SAC</th>
              <th class="text-center" style="width:10%;">Quantity</th>
              <th class="text-right" style="width:15%;">Rate</th>
              <th class="text-center" style="width:5%;">Per</th>
              <th class="text-right" style="width:15%;">Amount</th>
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
              <td colspan="6" class="text-right bold">Subtotal</td>
              <td class="text-right">${formatCurrency(order.subtotal || 0)}</td>
            </tr>
            <tr>
              <td colspan="6" class="text-right bold">Total GST</td>
              <td class="text-right">${formatCurrency(order.gstAmount || 0)}</td>
            </tr>
            <tr>
              <td colspan="6" class="text-right bold">Total Amount</td>
              <td class="text-right bold">${formatCurrency(order.totalAmount || 0)}</td>
            </tr>
          </tbody>
        </table>

        <div class="row" style="border-bottom:none;">
          <div class="col-left" style="border-right: none;">
            <p class="bold">Company's Bank Details</p>
            <p>Bank Name: <span class="bold">${profile.bankName || ''}</span></p>
            <p>A/c No: <span class="bold">${profile.accountNumber || ''}</span></p>
            <p>Branch & IFSC Code: <span class="bold">${profile.branch || ''} ${profile.ifscCode || ''}</span></p>
          </div>
          <div class="col-right" style="text-align:right;">
            <p class="bold">for ${profile.companyName || 'YOUR COMPANY NAME'}</p>
            <br/><br/><br/>
            <p>Authorised Signatory</p>
          </div>
        </div>

      </div>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
      <script>
        window.onload = function() {
          var element = document.getElementById('invoice-content');
          var opt = {
            margin:       0,
            filename:     'Invoice_${order.invoiceNo || orderId}.pdf',
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2, useCORS: true },
            jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }
          };
          html2pdf().set(opt).from(element).save();
        }
      </script>
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
