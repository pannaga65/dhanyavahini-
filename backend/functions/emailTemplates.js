/**
 * emailTemplates.js
 * Contains HTML templates for all automated emails sent by the backend.
 * You can easily customize the text, colors, and layout here!
 */

const getWelcomeEmailHtml = (customerName, resetLink) => {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
      
      <!-- Header -->
      <div style="background-color: #000000; padding: 20px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px; letter-spacing: 2px;">DHANYAVAHINI</h1>
      </div>

      <!-- Body -->
      <div style="padding: 30px; background-color: #ffffff; color: #333333;">
        <h2 style="margin-top: 0;">Welcome to Dhanyavahini, ${customerName}!</h2>
        <p style="font-size: 16px; line-height: 1.5;">
          Your account has been successfully created by our administration team. 
          You can now use the Dhanyavahini Mobile App to securely place orders, track shipments, and manage your invoices.
        </p>
        <p style="font-size: 16px; line-height: 1.5;">
          To get started, please click the button below to set up your secure password.
        </p>
        
        <!-- Action Button -->
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" style="background-color: #000000; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 4px; font-weight: bold; font-size: 16px; display: inline-block;">
            Set Your Password
          </a>
        </div>
        
        <p style="font-size: 14px; color: #666666;">
          If the button above does not work, copy and paste this link into your browser:<br>
          <a href="${resetLink}" style="color: #0066cc;">${resetLink}</a>
        </p>
      </div>

      <!-- Footer -->
      <div style="background-color: #f5f5f5; padding: 15px; text-align: center; font-size: 12px; color: #999999;">
        <p style="margin: 0;">&copy; ${new Date().getFullYear()} Dhanyavahini. All rights reserved.</p>
        <p style="margin: 5px 0 0 0;">This is an automated message. Please do not reply to this email.</p>
      </div>
    </div>
  `;
};

module.exports = {
  getWelcomeEmailHtml
};
