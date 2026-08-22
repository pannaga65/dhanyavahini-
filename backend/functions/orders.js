const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { sanitize } = require("./validation");

const db = getFirestore();

exports.updateOrderStatus = onCall(async (request) => {
  // 1. Authorization
  if (!request.auth || !request.auth.token.admin) {
    throw new HttpsError("permission-denied", "Only admins can update orders.");
  }

  // 2. Input validation
  const orderId = sanitize(request.data.orderId);
  const newStatus = sanitize(request.data.newStatus);

  if (!orderId) {
    throw new HttpsError("invalid-argument", "Order ID is required.");
  }

  const validStatuses = ["inquiry", "confirmed", "dispatched", "delivered", "cancelled"];
  if (!validStatuses.includes(newStatus.toLowerCase())) {
    throw new HttpsError("invalid-argument", `Invalid order status. Must be one of: ${validStatuses.join(", ")}`);
  }

  // Normalize to PascalCase for consistent storage
  const statusMap = {
    "inquiry": "Inquiry",
    "confirmed": "Confirmed",
    "dispatched": "Dispatched",
    "delivered": "Delivered",
    "cancelled": "Cancelled",
  };
  const normalizedStatus = statusMap[newStatus.toLowerCase()] || newStatus;

  try {
    const orderRef = db.collection("orders").doc(orderId);
    const orderSnap = await orderRef.get();

    if (!orderSnap.exists) {
      throw new HttpsError("not-found", "Order not found.");
    }

    const previousStatus = orderSnap.data().status;

    // 3. Update the order
    await orderRef.update({
      status: normalizedStatus,
      updatedAt: FieldValue.serverTimestamp(),
    });

    // 4. If cancelled, restore inventory stock — but ONLY if stock was already deducted.
    // Stock is deducted at Dispatch (Confirmed stage), NOT at Inquiry.
    // So only restore if the previous status was Confirmed, Dispatched, or Delivered.
    const statusesWithDeductedStock = ["Confirmed", "Dispatched", "Delivered"];
    if (normalizedStatus === "Cancelled" && previousStatus !== "Cancelled" && statusesWithDeductedStock.includes(previousStatus)) {
      const items = orderSnap.data().items || [];
      for (const item of items) {
        if (item.productId && item.quantityKg) {
          await db.collection("inventory").doc(item.productId).update({
            availableStockKg: FieldValue.increment(item.quantityKg),
            allocatedStockKg: FieldValue.increment(-item.quantityKg),
            lastUpdated: FieldValue.serverTimestamp(),
          });
        }
      }
    }

    // 5. Write audit log
    await db.collection("audit_logs").add({
      action: "UPDATE_ORDER_STATUS",
      targetId: orderId,
      previousStatus: previousStatus,
      newStatus: normalizedStatus,
      performedBy: request.auth.uid,
      performedByEmail: request.auth.token.email || "",
      timestamp: FieldValue.serverTimestamp(),
    });

    return { success: true };
  } catch (error) {
    console.error("updateOrderStatus error:", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", "Failed to update order status.");
  }
});

exports.deleteOrder = onCall(async (request) => {
  if (!request.auth || !request.auth.token.admin) {
    throw new HttpsError("permission-denied", "Only admins can delete orders.");
  }

  const orderId = sanitize(request.data.orderId);
  if (!orderId) {
    throw new HttpsError("invalid-argument", "Order ID is required.");
  }

  try {
    const orderRef = db.collection("orders").doc(orderId);
    const orderSnap = await orderRef.get();

    if (!orderSnap.exists) {
      throw new HttpsError("not-found", "Order not found.");
    }

    const orderData = orderSnap.data();
    const previousStatus = orderData.status;

    // 1. Only restore inventory if stock was actually deducted (i.e. status was past Inquiry)
    const statusesWithDeductedStock = ["Confirmed", "Dispatched", "Delivered"];
    if (statusesWithDeductedStock.includes(previousStatus)) {
      const items = orderData.items || [];
      for (const item of items) {
        if (item.productId && item.quantityKg) {
          await db.collection("inventory").doc(item.productId).update({
            availableStockKg: FieldValue.increment(item.quantityKg),
            allocatedStockKg: FieldValue.increment(-item.quantityKg),
            lastUpdated: FieldValue.serverTimestamp(),
          });
        }
      }
    }

    // 2. Delete the order document
    await orderRef.delete();

    // 3. Write audit log
    await db.collection("audit_logs").add({
      action: "DELETE_ORDER",
      targetId: orderId,
      performedBy: request.auth.uid,
      performedByEmail: request.auth.token.email || "",
      timestamp: FieldValue.serverTimestamp(),
    });

    return { success: true };
  } catch (error) {
    console.error("deleteOrder error:", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", "Failed to delete order.");
  }
});
