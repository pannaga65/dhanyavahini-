const functions = require("firebase-functions");
const { getFirestore } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");

const db = getFirestore();
const messaging = getMessaging();

exports.onOrderUpdate = functions.firestore
  .document("orders/{orderId}")
  .onWrite(async (change, context) => {
    // Exit if order is deleted
    if (!change.after.exists) return null;
    
    const previousData = change.before.data();
    const newData = change.after.data();
    
    // Scenario 1: New Inquiry created (Notify Admins)
    if (!change.before.exists || (previousData && previousData.status !== "Inquiry" && newData.status === "Inquiry")) {
      await notifyAdmins(
        "New Inquiry Received!",
        `Customer ${newData.customerName || "Unknown"} has submitted a new inquiry. Click to review.`
      );
    }
    
    // Scenario 2: Order status changed by Admin (Notify Customer)
    if (previousData && previousData.status !== newData.status && newData.status !== "Inquiry") {
      const statusMessages = {
        "pending": "Your order is pending review.",
        "under review": "Your order is currently under review by our team.",
        "confirmed": "Great news! Your order has been confirmed.",
        "rejected": "Unfortunately, your order has been rejected. Contact us for details.",
        "delivered": "Your order has been delivered successfully!"
      };
      
      const messageBody = statusMessages[newData.status] || `Your order status changed to ${newData.status}.`;
      await notifyCustomer(newData.customerId, "Order Status Update", messageBody);
    }
    
    return null;
  });

async function notifyAdmins(title, body) {
  try {
    const adminsSnap = await db.collection("admins").get();
    const tokens = [];
    adminsSnap.forEach(doc => {
      const data = doc.data();
      if (data.fcmToken) {
        tokens.push(data.fcmToken);
      }
    });
    
    if (tokens.length === 0) return console.log("No admin FCM tokens found.");
    
    const payload = {
      notification: { title, body },
      tokens: tokens
    };
    
    const response = await messaging.sendEachForMulticast(payload);
    console.log(`Successfully sent ${response.successCount} messages to admins.`);
  } catch (error) {
    console.error("Error sending admin notification:", error);
  }
}

async function notifyCustomer(customerId, title, body) {
  if (!customerId) return;
  
  try {
    const userDoc = await db.collection("users").doc(customerId).get();
    if (!userDoc.exists) return;
    
    const fcmToken = userDoc.data().fcmToken;
    if (!fcmToken) return console.log(`No FCM token for user ${customerId}.`);
    
    const payload = {
      notification: { title, body },
      token: fcmToken
    };
    
    await messaging.send(payload);
    console.log(`Successfully sent message to customer ${customerId}.`);
  } catch (error) {
    console.error("Error sending customer notification:", error);
  }
}
