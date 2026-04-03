const { onSchedule } = require("firebase-functions/v2/scheduler");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

initializeApp();

exports.deleteExpiredRooms = onSchedule("every day 00:00", async () => {
  const db = getFirestore();
  const cutoff = Date.now() - 1 * 60 * 60 * 1000; // 1 hour ago

  const snapshot = await db
    .collection("rooms")
    .where("createdAt", "<", cutoff)
    .get();

  if (snapshot.empty) {
    console.log("No expired rooms to delete.");
    return;
  }

  // Firestore batch deletes up to 500 docs at a time
  const batches = [];
  let batch = db.batch();
  let count = 0;

  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
    count++;
    if (count === 500) {
      batches.push(batch.commit());
      batch = db.batch();
      count = 0;
    }
  });

  if (count > 0) batches.push(batch.commit());

  await Promise.all(batches);
  console.log(`Deleted ${snapshot.size} expired room(s).`);
});
