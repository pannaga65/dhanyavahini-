const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getAuth } = require("firebase-admin/auth");
const nodemailer = require("nodemailer");
const { getWelcomeEmailHtml } = require("./emailTemplates");

const { defineSecret } = require("firebase-functions/params");

const db = getFirestore();
const auth = getAuth();

// Define the secure secret that will hold the App Password
const emailPass = defineSecret("EMAIL_PASS");

exports.createCustomer = onCall({ secrets: [emailPass] }, async (request) => {
  if (!request.auth || !request.auth.token.admin) {
    throw new HttpsError("permission-denied", "Only admins can create new customers.");
  }
  
  // Configure the nodemailer transporter using the secure secret
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "dhanyavahini@gmail.com",
      pass: emailPass.value(),
    },
  });
  
  const { 
    email, displayName, tradeName, gstNumber, 
    panNumber, phoneNumber, billingAddress, mailingAddresses 
  } = request.data;
  
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
        from: `"Dhanyavahini" <dhanyavahini@gmail.com>`,
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
    throw new HttpsError("internal", error.message);
  }
});
