const functions = require("firebase-functions");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

const db = getFirestore();

exports.updateOrderStatus = functions.https.onCall(async (data, context) => {
  if (!context.auth || !context.auth.token.admin) {
    throw new functions.https.HttpsError("permission-denied", "Only admins can update orders.");
  }
  
  const { orderId, newStatus } = data;
  const validStatuses = ["pending", "under review", "confirmed", "rejected", "delivered"];
  
  if (!validStatuses.includes(newStatus)) {
    throw new functions.https.HttpsError("invalid-argument", "Invalid order status.");
  }
  
  try {
    await db.collection("orders").doc(orderId).update({
      status: newStatus,
      updatedAt: FieldValue.serverTimestamp()
    });
    
    // We will add the push notification trigger here later
    
    return { success: true };
  } catch (error) {
    throw new functions.https.HttpsError("internal", error.message);
  }
});
