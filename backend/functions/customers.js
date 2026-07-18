const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getAuth } = require("firebase-admin/auth");
const nodemailer = require("nodemailer");
const { getWelcomeEmailHtml } = require("./emailTemplates");
const { sanitize, isValidEmail, isValidGST, isValidPAN, isValidPhone } = require("./validation");

const db = getFirestore();
const auth = getAuth();

exports.createCustomer = onCall(async (request) => {
  // 1. Authorization check
  if (!request.auth || !request.auth.token.admin) {
    throw new HttpsError("permission-denied", "Only admins can create new customers.");
  }

  // 2. Extract and sanitize all inputs
  const email = sanitize(request.data.email);
  const displayName = sanitize(request.data.displayName);
  const tradeName = sanitize(request.data.tradeName);
  const gstNumber = sanitize(request.data.gstNumber).toUpperCase();
  const panNumber = sanitize(request.data.panNumber).toUpperCase();
  const phoneNumber = sanitize(request.data.phoneNumber);
  const billingAddress = sanitize(request.data.billingAddress);
  const mailingAddresses = Array.isArray(request.data.mailingAddresses)
    ? request.data.mailingAddresses.map(a => sanitize(a)).filter(a => a !== "")
    : [];

  // 3. Input validation
  if (!isValidEmail(email)) {
    throw new HttpsError("invalid-argument", "Please provide a valid email address.");
  }
  if (!displayName && !tradeName) {
    throw new HttpsError("invalid-argument", "Please provide either a contact name or trade name.");
  }
  if (gstNumber && !isValidGST(gstNumber)) {
    throw new HttpsError("invalid-argument", "Invalid GST number format. Expected 15-character GSTIN.");
  }
  if (panNumber && !isValidPAN(panNumber)) {
    throw new HttpsError("invalid-argument", "Invalid PAN number format. Expected 10-character PAN.");
  }
  if (phoneNumber && !isValidPhone(phoneNumber)) {
    throw new HttpsError("invalid-argument", "Invalid phone number. Expected 10-digit Indian mobile number.");
  }

  // 4. Configure the nodemailer transporter
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "dhanyavahini@gmail.com",
      pass: process.env.EMAIL_PASS,
    },
  });

  try {
    // 5. Create the Firebase Auth user with a temporary random password
    const userRecord = await auth.createUser({
      email: email,
      displayName: displayName || tradeName,
      password: Math.random().toString(36).slice(-8) + "A1!",
    });

    await auth.setCustomUserClaims(userRecord.uid, { customer: true });

    // 6. Write the user document to Firestore
    await db.collection("users").doc(userRecord.uid).set({
      uid: userRecord.uid,
      role: "customer",
      email: email,
      displayName: displayName,
      tradeName: tradeName,
      gstNumber: gstNumber,
      panNumber: panNumber,
      phoneNumber: phoneNumber,
      billingAddress: billingAddress,
      mailingAddresses: mailingAddresses,
      isActive: true,
      createdAt: FieldValue.serverTimestamp(),
    });

    // 7. Generate password reset link and send welcome email
    const link = await auth.generatePasswordResetLink(email);
    const customerName = displayName || tradeName || "Customer";
    const htmlBody = getWelcomeEmailHtml(customerName, link);

    try {
      await transporter.sendMail({
        from: `"Dhanyavahini" <dhanyavahini@gmail.com>`,
        to: email,
        subject: "Welcome to Dhanyavahini - Setup Your Account",
        html: htmlBody,
      });
      console.log(`Welcome email sent to ${email}`);
    } catch (emailError) {
      console.error("Failed to send welcome email:", emailError);
      // Don't throw — the user was already created successfully.
    }

    // 8. Write audit log
    await db.collection("audit_logs").add({
      action: "CREATE_CUSTOMER",
      targetId: userRecord.uid,
      targetEmail: email,
      performedBy: request.auth.uid,
      timestamp: FieldValue.serverTimestamp(),
    });

    return { success: true, uid: userRecord.uid };
  } catch (error) {
    console.error("createCustomer error:", error);
    // Never leak internal details to the client
    if (error.code === "auth/email-already-exists") {
      throw new HttpsError("already-exists", "A user with this email already exists.");
    }
    throw new HttpsError("internal", "Failed to create customer. Please try again.");
  }
});
