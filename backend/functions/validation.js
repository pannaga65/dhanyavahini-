/**
 * validation.js
 * Shared input validation & sanitization helpers for all Cloud Functions.
 * Zero-trust: never trust client input.
 */

/**
 * Strips HTML tags and trims whitespace from a string.
 */
function sanitize(str) {
  if (typeof str !== "string") return "";
  return str.replace(/<[^>]*>/g, "").trim();
}

/**
 * Validates an email address format.
 */
function isValidEmail(email) {
  if (typeof email !== "string") return false;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email.trim());
}

/**
 * Validates an Indian GST number (15 characters: 2 digits, 10 chars PAN, 1 alphanum, 1 char, 1 checksum).
 */
function isValidGST(gst) {
  if (!gst || typeof gst !== "string") return true; // Optional field
  const re = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  return re.test(gst.trim().toUpperCase());
}

/**
 * Validates an Indian PAN number (10 characters: 5 letters, 4 digits, 1 letter).
 */
function isValidPAN(pan) {
  if (!pan || typeof pan !== "string") return true; // Optional field
  const re = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
  return re.test(pan.trim().toUpperCase());
}

/**
 * Validates a 10-digit Indian phone number.
 */
function isValidPhone(phone) {
  if (!phone || typeof phone !== "string") return true; // Optional field
  const cleaned = phone.replace(/[\s\-+()]/g, "");
  // Accept 10 digits, or country code prefix (91) + 10 digits
  return /^(\+?91)?[6-9]\d{9}$/.test(cleaned);
}

/**
 * Validates that a value is a positive number.
 */
function isPositiveNumber(val) {
  return typeof val === "number" && !isNaN(val) && val > 0;
}

/**
 * Validates that a value is a non-negative integer.
 */
function isNonNegativeInt(val) {
  return Number.isInteger(val) && val >= 0;
}

module.exports = {
  sanitize,
  isValidEmail,
  isValidGST,
  isValidPAN,
  isValidPhone,
  isPositiveNumber,
  isNonNegativeInt,
};
