const { onRequest } = require("firebase-functions/v2/https");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getAuth } = require("firebase-admin/auth");

const db = getFirestore();
const auth = getAuth();

/**
 * bootstrapAdmin
 * 
 * One-time-use endpoint to grant admin privileges to the primary account.
 * Once an admin exists, this endpoint permanently rejects all further requests.
 */
exports.bootstrapAdmin = onRequest(async (req, res) => {
  const adminEmail = "dhanyavahini@gmail.com";

  try {
    // SECURITY: Check if ANY admin already exists. If so, block completely.
    const existingAdmins = await db.collection("admins").limit(1).get();
    if (!existingAdmins.empty) {
      res.status(403).send("Forbidden: Admin has already been bootstrapped. This endpoint is permanently locked.");
      return;
    }

    const userRecord = await auth.getUserByEmail(adminEmail);
    await auth.setCustomUserClaims(userRecord.uid, { admin: true });

    await db.collection("admins").doc(userRecord.uid).set({
      uid: userRecord.uid,
      role: "superadmin",
      email: adminEmail,
      isActive: true,
      createdAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    // Write audit log
    await db.collection("audit_logs").add({
      action: "BOOTSTRAP_ADMIN",
      targetId: userRecord.uid,
      targetEmail: adminEmail,
      performedBy: "system",
      timestamp: FieldValue.serverTimestamp(),
    });

    res.status(200).send(`Success! ${adminEmail} is now an Admin. This endpoint is now permanently locked.`);
  } catch (error) {
    console.error("bootstrapAdmin error:", error);
    res.status(500).send("Error: Failed to bootstrap admin. Ensure the account exists in Firebase Auth.");
  }
});
