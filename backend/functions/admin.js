const functions = require("firebase-functions");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getAuth } = require("firebase-admin/auth");

const db = getFirestore();
const auth = getAuth();

exports.bootstrapAdmin = functions.https.onRequest(async (req, res) => {
  const adminEmail = "dhanyavahini@gmail.com";
  try {
    const userRecord = await auth.getUserByEmail(adminEmail);
    await auth.setCustomUserClaims(userRecord.uid, { admin: true });
    
    await db.collection("admins").doc(userRecord.uid).set({
      uid: userRecord.uid,
      role: "superadmin",
      email: adminEmail,
      active: true,
      createdAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    
    res.status(200).send(`Success! ${adminEmail} is now an Admin. You can now log into the React Dashboard.`);
  } catch (error) {
    res.status(500).send(`Error: ${error.message}. (Did you create the account in the Firebase Console first?)`);
  }
});
