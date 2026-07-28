const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const { getFirestore } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");

const db = getFirestore();
const messaging = getMessaging();

exports.onOrderUpdate = onDocumentWritten("orders/{orderId}", async (event) => {
    const change = event.data;
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
        "Confirmed": "Great news! Your order has been confirmed.",
        "Dispatched": "Your order has been dispatched! Track your delivery soon.",
        "Delivered": "Your order has been delivered successfully!",
        "Cancelled": "Unfortunately, your order has been cancelled. Contact us for details.",
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
    
    // Save to Firestore for in-app notifications
    const batch = db.batch();
    const now = new Date().toISOString();
    
    adminsSnap.forEach(doc => {
      const data = doc.data();
      if (data.fcmToken) {
        tokens.push(data.fcmToken);
      }
      
      const notifRef = db.collection("notifications").doc();
      batch.set(notifRef, {
        userId: doc.id,
        title,
        body,
        isRead: false,
        createdAt: now
      });
    });
    
    await batch.commit();
    
    if (tokens.length === 0) return console.log("No admin FCM tokens found.");
    
    const payload = {
      notification: { title, body },
      android: {
        notification: {
          channelId: "high_importance_channel",
          priority: "high",
          sound: "default",
        },
      },
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
    // Save to Firestore for in-app notifications
    await db.collection("notifications").add({
      userId: customerId,
      title,
      body,
      isRead: false,
      createdAt: new Date().toISOString()
    });

    const userDoc = await db.collection("users").doc(customerId).get();
    if (!userDoc.exists) return;
    
    const fcmToken = userDoc.data().fcmToken;
    if (!fcmToken) return console.log(`No FCM token for user ${customerId}.`);
    
    const payload = {
      notification: { title, body },
      android: {
        notification: {
          channelId: "high_importance_channel",
          priority: "high",
          sound: "default",
        },
      },
      token: fcmToken
    };
    
    await messaging.send(payload);
    console.log(`Successfully sent message to customer ${customerId}.`);
  } catch (error) {
    console.error("Error sending customer notification:", error);
  }
}
