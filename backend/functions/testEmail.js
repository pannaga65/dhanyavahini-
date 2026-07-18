const nodemailer = require("nodemailer");

console.log("Using EMAIL_USER:", process.env.EMAIL_USER);

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

transporter.verify(function (error, success) {
  if (error) {
    console.error("Nodemailer Authentication Error:");
    console.error(error);
  } else {
    console.log("Server is ready to take our messages");
    
    // Test sending an email
    transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER, // Send to yourself
      subject: "Test Email from Dhanyavahini Backend",
      text: "If you see this, Nodemailer is perfectly configured!"
    }, (err, info) => {
      if (err) {
        console.error("Error sending email:", err);
      } else {
        console.log("Test email sent successfully!", info.response);
      }
    });
  }
});
