importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyCKSj3lTW5wEmdqrdOUKyg1il5eFYmB4vM",
  authDomain: "dhanyavahini-4d360.firebaseapp.com",
  projectId: "dhanyavahini-4d360",
  storageBucket: "dhanyavahini-4d360.firebasestorage.app",
  messagingSenderId: "206346048391",
  appId: "1:206346048391:web:bbadc93c69fb176414b922"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification?.title || 'Notification';
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new message.',
    icon: '/vite.svg'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
