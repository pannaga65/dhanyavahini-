const functions = require("firebase-functions");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getAuth } = require("firebase-admin/auth");

const db = getFirestore();
const auth = getAuth();

exports.createCustomer = functions.https.onCall(async (data, context) => {
  if (!context.auth || !context.auth.token.admin) {
    throw new functions.https.HttpsError("permission-denied", "Only admins can create new customers.");
  }
  
  const { 
    email, displayName, tradeName, gstNumber, 
    panNumber, phoneNumber, billingAddress, mailingAddresses 
  } = data;
  
  try {
    const userRecord = await auth.createUser({
      email: email,
      displayName: displayName,
      password: Math.random().toString(36).slice(-8) + "A1!", 
    });
    
    await auth.setCustomUserClaims(userRecord.uid, { customer: true });
    
    await db.collection("users").doc(userRecord.uid).set({
      uid: userRecord.uid,
      role: "customer",
      email: email,
      displayName: displayName,
      tradeName: tradeName,
      gstNumber: gstNumber,
      panNumber: panNumber || '',
      phoneNumber: phoneNumber || '',
      billingAddress: billingAddress || '',
      mailingAddresses: mailingAddresses ? mailingAddresses.filter(a => a.trim() !== '') : [],
      active: true,
      createdAt: FieldValue.serverTimestamp(),
    });
    
    const link = await auth.generatePasswordResetLink(email);
    return { success: true, uid: userRecord.uid, resetLink: link };
  } catch (error) {
    throw new functions.https.HttpsError("internal", error.message);
  }
});
