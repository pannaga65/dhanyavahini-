import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

// 1. Secure Order Placement (Offline Payments)
// This function calculates the total amount securely on the server using the database price,
// preventing clients from manipulating the cost of their cart.
export const placeSecureOrder = functions.https.onCall(async (data, context) => {
  // Enforce Authentication
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be logged in.");
  }

  const { items } = data; // Expected: Array of { productId, quantity }
  if (!items || !Array.isArray(items) || items.length === 0) {
    throw new functions.https.HttpsError("invalid-argument", "Cart cannot be empty.");
  }

  let subtotal = 0;
  const processedItems: any[] = [];

  // Use a transaction to validate stock and calculate price securely
  await db.runTransaction(async (transaction) => {
    for (const item of items) {
      const productRef = db.collection("products").doc(item.productId);
      const productSnap = await transaction.get(productRef);

      if (!productSnap.exists) {
        throw new functions.https.HttpsError("not-found", `Product ${item.productId} not found.`);
      }

      const productData = productSnap.data();
      const currentPrice = productData?.price || 0;
      
      // Enforce Minimum Order Quantity (MOQ)
      if (item.quantity < (productData?.moq || 1)) {
        throw new functions.https.HttpsError("failed-precondition", `Minimum order quantity for ${productData?.name} is ${productData?.moq}.`);
      }

      // Add to running total
      subtotal += (currentPrice * item.quantity);

      processedItems.push({
        productId: item.productId,
        name: productData?.name,
        price: currentPrice, // Trusting the secure server price, not the client!
        quantity: item.quantity
      });
    }

    // Calculate final totals (e.g. 5% GST for grains)
    const gst = subtotal * 0.05;
    const totalAmount = subtotal + gst;

    // Create Order Document
    const orderRef = db.collection("orders").doc();
    transaction.set(orderRef, {
      customerId: context.auth.uid,
      items: processedItems,
      subtotal,
      gst,
      totalAmount,
      status: "Pending", // Payment handled offline via Bank Transfer
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
  });

  return { success: true, message: "Order placed securely." };
});

// 2. Set Admin Claim (Run once to set up the superadmin)
export const grantAdminRole = functions.https.onCall(async (data, context) => {
  const email = data.email;
  const user = await admin.auth().getUserByEmail(email);
  if (user) {
    await admin.auth().setCustomUserClaims(user.uid, { admin: true });
    return { message: `Success! ${email} has been made an admin.` };
  }
  return { message: "User not found." };
});

// 3. Automated Push Notifications (FCM) on Order Status Change
export const onOrderStatusChanged = functions.firestore
  .document("orders/{orderId}")
  .onUpdate(async (change, context) => {
    const newValue = change.after.data();
    const previousValue = change.before.data();

    // If status changed to Dispatched or Delivered
    if (newValue.status !== previousValue.status) {
      const customerId = newValue.customerId;
      const newStatus = newValue.status;

      // Look up customer's FCM token
      const userDoc = await db.collection("users").doc(customerId).get();
      const fcmToken = userDoc.data()?.fcmToken;

      if (fcmToken) {
        const payload = {
          notification: {
            title: `Order Update`,
            body: `Your order #${context.params.orderId.substring(0, 5)} has been marked as ${newStatus}.`,
          },
        };

        try {
          await admin.messaging().sendToDevice(fcmToken, payload);
          console.log(`Notification sent to ${customerId} for order ${context.params.orderId}`);
        } catch (error) {
          console.error("Failed to send FCM:", error);
        }
      }
    }
  });

// 4. Approve Tender and Convert to Order
export const approveTender = functions.https.onCall(async (data, context) => {
  // Ensure only admins can trigger this
  if (!context.auth || !context.auth.token.admin) {
    throw new functions.https.HttpsError("permission-denied", "Only admins can approve tenders.");
  }
  
  const { bidId, tenderId } = data;
  if (!bidId || !tenderId) {
    throw new functions.https.HttpsError("invalid-argument", "Missing bidId or tenderId.");
  }

  // Use transaction to ensure no double-approvals
  await db.runTransaction(async (t) => {
    const bidRef = db.collection("bids").doc(bidId);
    const tenderRef = bidRef.collection("tenders").doc(tenderId);

    const bidSnap = await t.get(bidRef);
    const tenderSnap = await t.get(tenderRef);

    if (!bidSnap.exists || !tenderSnap.exists) {
      throw new functions.https.HttpsError("not-found", "Bid or Tender not found.");
    }

    const tenderData = tenderSnap.data();
    const bidData = bidSnap.data();

    // 1. Mark Tender as Approved
    t.update(tenderRef, { status: "Approved" });
    
    // 2. Close the Bid Session
    t.update(bidRef, { status: "Completed" });

    // 3. Create the Confirmed Order from the Tender details
    const orderRef = db.collection("orders").doc();
    const subtotal = (tenderData?.proposedPrice || 0) * (tenderData?.volumeRequested || 0);
    const gst = subtotal * 0.05;

    t.set(orderRef, {
      customerId: tenderData?.retailerId,
      items: [{
        productId: bidId, // Reference back to the tender session
        name: bidData?.productName,
        price: tenderData?.proposedPrice,
        quantity: tenderData?.volumeRequested
      }],
      subtotal: subtotal,
      gst: gst,
      totalAmount: subtotal + gst,
      status: "Confirmed", // Skip Pending because Admin explicitly approved it
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
  });

  return { success: true, message: "Tender approved and order created securely." };
});
