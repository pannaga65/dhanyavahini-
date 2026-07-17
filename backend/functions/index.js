const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

// 1. Create Customer (Admin Only)
exports.createCustomer = functions.https.onCall(async (data, context) => {
  if (!context.auth || !context.auth.token.admin) {
    throw new functions.https.HttpsError("permission-denied", "Only admins can create new customers.");
  }
  const { email, displayName, tradeName, gstNumber } = data;
  try {
    const userRecord = await admin.auth().createUser({
      email: email,
      displayName: displayName,
      password: Math.random().toString(36).slice(-8) + "A1!", 
    });
    await admin.auth().setCustomUserClaims(userRecord.uid, { customer: true });
    await db.collection("users").doc(userRecord.uid).set({
      uid: userRecord.uid,
      role: "customer",
      email: email,
      displayName: displayName,
      tradeName: tradeName,
      gstNumber: gstNumber,
      active: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    const link = await admin.auth().generatePasswordResetLink(email);
    return { success: true, uid: userRecord.uid, resetLink: link };
  } catch (error) {
    throw new functions.https.HttpsError("internal", error.message);
  }
});

// 2. Update Order Status (Admin Only)
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
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    throw new functions.https.HttpsError("internal", error.message);
  }
});

// 3. Bootstrap First Admin
exports.bootstrapAdmin = functions.https.onRequest(async (req, res) => {
  const adminEmail = "dhanyavahini@gmail.com";
  try {
    const userRecord = await admin.auth().getUserByEmail(adminEmail);
    await admin.auth().setCustomUserClaims(userRecord.uid, { admin: true });
    await db.collection("users").doc(userRecord.uid).set({
      uid: userRecord.uid,
      role: "admin",
      email: adminEmail,
      active: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    res.status(200).send(`Success! ${adminEmail} is now an Admin. You can now log into the React Dashboard.`);
  } catch (error) {
    res.status(500).send(`Error: ${error.message}. (Did you create the account in the Firebase Console first?)`);
  }
});
