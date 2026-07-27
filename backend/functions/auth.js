const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { getAuth } = require("firebase-admin/auth");
const nodemailer = require("nodemailer");
const { sanitize, isValidEmail } = require("./validation");

const auth = getAuth();

// Reuse the existing transporter config
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "dhanyavahini@gmail.com",
    pass: process.env.EMAIL_PASS,
  },
});

exports.sendCustomPasswordReset = onCall(async (request) => {
  const email = sanitize(request.data.email);

  if (!isValidEmail(email)) {
    throw new HttpsError("invalid-argument", "Please provide a valid email address.");
  }

  try {
    // Check if user exists (will throw if not found)
    const userRecord = await auth.getUserByEmail(email);

    // Generate the custom password reset link via Admin SDK
    const link = await auth.generatePasswordResetLink(email);

    // Beautiful HTML template for password reset
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #E5E7EB; border-radius: 12px; overflow: hidden;">
        <div style="background-color: #2E7D32; padding: 24px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Dhanyavahini</h1>
        </div>
        <div style="padding: 32px; background-color: #FAFAFA;">
          <h2 style="color: #1F2937; margin-top: 0;">Reset Your Password</h2>
          <p style="color: #4B5563; line-height: 1.6; margin-bottom: 24px;">
            Hi ${userRecord.displayName || 'Customer'},<br><br>
            We received a request to reset your password. Click the secure button below to set up a new password for your Dhanyavahini account.
          </p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${link}" style="background-color: #2E7D32; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Reset Password</a>
          </div>
          <p style="color: #6B7280; font-size: 14px; margin-bottom: 0;">
            If you didn't request a password reset, you can safely ignore this email. This link will expire shortly.
          </p>
        </div>
      </div>
    `;

    // Send the email via Nodemailer
    await transporter.sendMail({
      from: `"Dhanyavahini" <dhanyavahini@gmail.com>`,
      to: email,
      subject: "Reset your Dhanyavahini password",
      html: htmlBody,
    });

    return { success: true, message: "Password reset email sent successfully." };
  } catch (error) {
    console.error("sendCustomPasswordReset error:", error);
    // Don't leak exact user existence errors to prevent email enumeration, just return a generic success message
    if (error.code === 'auth/user-not-found') {
      return { success: true, message: "If the email exists, a reset link was sent." };
    }
    throw new HttpsError("internal", "Failed to process password reset request.");
  }
});
