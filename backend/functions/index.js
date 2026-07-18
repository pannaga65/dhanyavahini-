const { initializeApp } = require("firebase-admin/app");

// Initialize Firebase Admin globally once
initializeApp();

// Export all functions flatly so their endpoint names don't change
Object.assign(exports, require('./customers'));
Object.assign(exports, require('./orders'));
Object.assign(exports, require('./admin'));
Object.assign(exports, require('./placeSecureOrder'));
Object.assign(exports, require('./notifications'));
