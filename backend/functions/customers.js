const functions = require("firebase-functions/v1");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getAuth } = require("firebase-admin/auth");
const nodemailer = require("nodemailer");
const { getWelcomeEmailHtml } = require("./emailTemplates");

const db = getFirestore();
const auth = getAuth();

// Configure the nodemailer transporter using environment variables
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

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
    
    // Send the welcome email with the password reset link
    const customerName = displayName || tradeName || "Customer";
    const htmlBody = getWelcomeEmailHtml(customerName, link);
    
    try {
      await transporter.sendMail({
        from: `"Dhanyavahini" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "Welcome to Dhanyavahini - Setup Your Account",
        html: htmlBody,
      });
      console.log(`Welcome email sent to ${email}`);
    } catch (emailError) {
      console.error("Failed to send welcome email:", emailError);
      // We don't throw here because the user is already created in Firebase.
      // The admin can manually send them the link if the email fails.
    }
    
    return { success: true, uid: userRecord.uid, resetLink: link };
  } catch (error) {
    throw new functions.https.HttpsError("internal", error.message);
  }
});
