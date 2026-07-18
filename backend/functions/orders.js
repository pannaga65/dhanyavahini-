const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

const db = getFirestore();

exports.updateOrderStatus = onCall(async (request) => {
  if (!request.auth || !request.auth.token.admin) {
    throw new HttpsError("permission-denied", "Only admins can update orders.");
  }
  
  const { orderId, newStatus } = request.data;
  const validStatuses = ["pending", "under review", "confirmed", "rejected", "delivered"];
  
  if (!validStatuses.includes(newStatus)) {
    throw new HttpsError("invalid-argument", "Invalid order status.");
  }
  
  try {
    await db.collection("orders").doc(orderId).update({
      status: newStatus,
      updatedAt: FieldValue.serverTimestamp()
    });
    
    // We will add the push notification trigger here later
    
    return { success: true };
  } catch (error) {
    throw new HttpsError("internal", error.message);
  }
});
