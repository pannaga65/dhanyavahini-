const { onSchedule } = require("firebase-functions/v2/scheduler");
const { getFirestore } = require("firebase-admin/firestore");

// Runs once a week to archive old orders
exports.archiveOldOrders = onSchedule("every 7 days", async (event) => {
  const db = getFirestore();
  
  // Calculate date 1 year ago
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  console.log(`Running archiver for orders older than ${oneYearAgo.toISOString()}`);

  try {
    // Fetch all orders older than 1 year
    const snapshot = await db.collection("orders")
      .where("createdAt", "<", oneYearAgo)
      .get();

    if (snapshot.empty) {
      console.log("No old orders found to archive.");
      return;
    }

    const batch = db.batch();
    let count = 0;
    // Firestore batches have a limit of 500 operations. We need 2 operations per doc (set + delete).
    // So we can process max 250 documents per batch execution.
    // If there are more, we just process 250 today, and the rest will be picked up tomorrow.

    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      
      // Only archive orders that have reached an end-state
      if (data.status === "Delivered" || data.status === "Cancelled") {
        if (count >= 250) break; // Keep under the 500 ops limit for a single batch

        const archiveRef = db.collection("orders_archive").doc(docSnap.id);
        batch.set(archiveRef, data);
        batch.delete(docSnap.ref);
        
        count++;
      }
    }

    if (count > 0) {
      await batch.commit();
      console.log(`Successfully archived ${count} orders to 'orders_archive' collection.`);
    } else {
      console.log("Found old orders, but none were in an archivable state (Delivered/Cancelled).");
    }
  } catch (error) {
    console.error("Error archiving old orders:", error);
  }
});
