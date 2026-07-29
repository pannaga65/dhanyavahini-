const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { isPositiveNumber } = require("./validation");

const db = getFirestore();

/**
 * placeSecureOrder
 * 
 * The client sends ONLY productIds and quantities.
 * This function fetches canonical prices from the database,
 * verifies stock availability, deducts stock atomically,
 * and creates the order — all inside a Firestore Transaction.
 * 
 * The client NEVER controls the price.
 */
exports.placeSecureOrder = onCall(async (request) => {
  // 1. Authentication check
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "You must be logged in to place an order.");
  }

  const customerId = request.auth.uid;
  const items = request.data.items;

  // 2. Validate the items array
  if (!Array.isArray(items) || items.length === 0) {
    throw new HttpsError("invalid-argument", "Order must contain at least one item.");
  }
  if (items.length > 50) {
    throw new HttpsError("invalid-argument", "Order cannot contain more than 50 items.");
  }

  for (const item of items) {
    if (!item.productId || typeof item.productId !== "string") {
      throw new HttpsError("invalid-argument", "Each item must have a valid productId.");
    }
    if (!isPositiveNumber(item.quantity)) {
      throw new HttpsError("invalid-argument", "Each item must have a positive quantity.");
    }
  }

  try {
    // 3. Run everything inside a Firestore Transaction for atomicity
    const result = await db.runTransaction(async (transaction) => {
      // 3a. ALL READS FIRST: Fetch customer info
      const userRef = db.collection("users").doc(customerId);
      const userSnap = await transaction.get(userRef);
      const userData = userSnap.exists ? userSnap.data() : {};

      // 3b. ALL READS FIRST: Fetch all products and inventory docs
      const productsData = [];
      for (const item of items) {
        const productRef = db.collection("products").doc(item.productId);
        const inventoryRef = db.collection("inventory").doc(item.productId);

        const productSnap = await transaction.get(productRef);
        const inventorySnap = await transaction.get(inventoryRef);
        
        productsData.push({
          item,
          productSnap,
          inventorySnap,
          inventoryRef
        });
      }

      // 3c. VALIDATION AND WRITES
      const orderItems = [];
      let subtotal = 0;
      let totalGstAmount = 0;

      for (const data of productsData) {
        const { item, productSnap, inventorySnap, inventoryRef } = data;

        if (!productSnap.exists) {
          throw new HttpsError("not-found", `Product ${item.productId} does not exist.`);
        }

        const product = productSnap.data();
        const inventory = inventorySnap.exists ? inventorySnap.data() : null;

        if (product.isActive === false) {
          throw new HttpsError("failed-precondition", `Product "${product.name}" is no longer available.`);
        }

        const availableStock = inventory ? (inventory.availableStockKg || 0) : 0;
        const requestedKg = item.quantity;

        if (requestedKg > availableStock) {
          throw new HttpsError(
            "failed-precondition",
            `Insufficient stock for "${product.name}". Available: ${availableStock} Kg, Requested: ${requestedKg} Kg.`
          );
        }

        if (product.moqKg && requestedKg < product.moqKg) {
          throw new HttpsError(
            "invalid-argument",
            `Minimum order for "${product.name}" is ${product.moqKg} Kg.`
          );
        }

        const lineTotal = product.basePriceKg * requestedKg;
        const itemGstPercentage = (typeof product.gstPercentage === 'number') ? product.gstPercentage : 5;
        const lineGst = lineTotal * (itemGstPercentage / 100);
        
        subtotal += lineTotal;
        totalGstAmount += lineGst;

        orderItems.push({
          productId: item.productId,
          name: product.name,
          category: product.category || "",
          basePriceKg: product.basePriceKg,
          quantityKg: requestedKg,
          lineTotal: lineTotal,
          gstPercentage: itemGstPercentage,
          lineGst: lineGst,
        });

        // 3d. WRITE: Deduct stock atomically
        transaction.update(inventoryRef, {
          availableStockKg: FieldValue.increment(-requestedKg),
          allocatedStockKg: FieldValue.increment(requestedKg),
          lastUpdated: FieldValue.serverTimestamp(),
        });
      }

      // 3e. Calculate totals server-side
      const gstAmount = Math.round(totalGstAmount * 100) / 100;
      const totalAmount = Math.round((subtotal + gstAmount) * 100) / 100;

      // 3f. Resolve shipping address using selectedAddressIndex
      const selectedAddressIndex = (typeof request.data.selectedAddressIndex === 'number') ? request.data.selectedAddressIndex : 0;
      const mailingAddresses = userData.mailingAddresses || [];
      const selectedShippingAddress = (mailingAddresses.length > selectedAddressIndex) 
        ? mailingAddresses[selectedAddressIndex] 
        : (mailingAddresses.length > 0 ? mailingAddresses[0] : "");

      // 3g. WRITE: Create the order document
      const orderRef = db.collection("orders").doc();
      transaction.set(orderRef, {
        customerId: customerId,
        customerName: userData.displayName || userData.tradeName || "Unknown",
        customerEmail: userData.email || "",
        customerGst: userData.gstNumber || "",
        customerPhone: userData.phoneNumber || "",
        tradeName: userData.tradeName || "",
        billingAddress: userData.billingAddress || "",
        shippingAddress: selectedShippingAddress,
        location: userData.lastKnownLocation || null,
        items: orderItems,
        subtotal: subtotal,
        gstAmount: gstAmount,
        totalAmount: totalAmount,
        status: "Inquiry",
        paymentStatus: "Pending",
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      return { orderId: orderRef.id, totalAmount };
    });

    // 4. Write audit log outside the transaction
    await db.collection("audit_logs").add({
      action: "PLACE_ORDER",
      targetId: result.orderId,
      performedBy: customerId,
      details: `Order placed for ₹${result.totalAmount}`,
      timestamp: FieldValue.serverTimestamp(),
    });

    return { success: true, orderId: result.orderId, totalAmount: result.totalAmount };
  } catch (error) {
    console.error("placeSecureOrder error:", error);
    // Re-throw HttpsErrors as-is (they contain user-facing messages)
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", "Failed to place order. Please try again.");
  }
});
