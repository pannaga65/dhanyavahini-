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

  const validStatuses = ["pending", "under review", "confirmed", "rejected", "dispatched", "delivered", "cancelled"];
  if (!validStatuses.includes(newStatus.toLowerCase())) {
    throw new HttpsError("invalid-argument", `Invalid order status. Must be one of: ${validStatuses.join(", ")}`);
  }

  try {
    const orderRef = db.collection("orders").doc(orderId);
    const orderSnap = await orderRef.get();

    if (!orderSnap.exists) {
      throw new HttpsError("not-found", "Order not found.");
    }

    const previousStatus = orderSnap.data().status;

    // 3. Update the order
    await orderRef.update({
      status: newStatus,
      updatedAt: FieldValue.serverTimestamp(),
    });

    // 4. If cancelled, restore inventory stock
    if (newStatus.toLowerCase() === "cancelled" && previousStatus !== "cancelled") {
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
      newStatus: newStatus,
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
