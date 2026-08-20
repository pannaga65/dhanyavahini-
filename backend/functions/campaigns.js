const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");

const db = getFirestore();
const messaging = getMessaging();

/**
 * publishCampaign — Admin-only callable function
 * Creates a campaign document, then sends push notifications to ALL customers.
 */
exports.publishCampaign = onCall(async (request) => {
  // 1. Auth check
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "You must be logged in.");
  }
  const adminDoc = await db.collection("admins").doc(request.auth.uid).get();
  if (!adminDoc.exists) {
    throw new HttpsError("permission-denied", "Only admins can publish campaigns.");
  }

  // 2. Validate inputs
  const { title, body, type, imageUrl } = request.data;
  if (!title || !body) {
    throw new HttpsError("invalid-argument", "Title and body are required.");
  }

  const validTypes = ["alert", "new_arrival", "price_drop", "moving_fast", "general"];
  const campaignType = validTypes.includes(type) ? type : "general";

  // 3. Create campaign document
  const campaignRef = await db.collection("campaigns").add({
    title: title.trim(),
    body: body.trim(),
    type: campaignType,
    imageUrl: imageUrl || "",
    isActive: true,
    publishedBy: request.auth.uid,
    createdAt: FieldValue.serverTimestamp(),
  });

  // 4. Fetch all customer FCM tokens and create notifications
  const customersSnap = await db.collection("users")
    .where("role", "==", "customer")
    .get();

  const tokens = [];
  const batch = db.batch();
  const now = new Date().toISOString();

  customersSnap.forEach((doc) => {
    const data = doc.data();
    if (data.fcmToken) {
      tokens.push(data.fcmToken);
    }

    // Create in-app notification for each customer
    const notifRef = db.collection("notifications").doc();
    batch.set(notifRef, {
      userId: doc.id,
      title: `🔔 ${title.trim()}`,
      body: body.trim(),
      isRead: false,
      campaignId: campaignRef.id,
      createdAt: now,
    });
  });

  await batch.commit();

  // 5. Send push notifications in batches
  if (tokens.length > 0) {
    const payload = {
      notification: { title: title.trim(), body: body.trim() },
      android: {
        notification: {
          channelId: "high_importance_channel",
          priority: "high",
          sound: "default",
        },
      },
      tokens: tokens,
    };

    try {
      const response = await messaging.sendEachForMulticast(payload);
      console.log(`Campaign pushed: ${response.successCount}/${tokens.length} delivered.`);
    } catch (error) {
      console.error("Error sending campaign notifications:", error);
    }
  }

  return { success: true, campaignId: campaignRef.id, notifiedCount: tokens.length };
});

/**
 * deleteCampaign — Admin-only callable function
 * Soft-deletes a campaign by setting isActive to false.
 */
exports.deleteCampaign = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "You must be logged in.");
  }
  const adminDoc = await db.collection("admins").doc(request.auth.uid).get();
  if (!adminDoc.exists) {
    throw new HttpsError("permission-denied", "Only admins can delete campaigns.");
  }

  const { campaignId } = request.data;
  if (!campaignId) {
    throw new HttpsError("invalid-argument", "Campaign ID is required.");
  }

  await db.collection("campaigns").doc(campaignId).update({
    isActive: false,
    deletedAt: FieldValue.serverTimestamp(),
  });

  return { success: true };
});
