import admin from "firebase-admin";
import { config } from "dotenv";
import { resolve } from "path";

// Load environment variables from .env file
config({ path: resolve(process.cwd(), ".env") });

const projectId = process.env.GOOGLE_CLOUD_PROJECT;
if (!projectId) {
  console.error("GOOGLE_CLOUD_PROJECT environment variable is required");
  process.exit(1);
}

const app = admin.initializeApp({
  projectId: projectId,
  storageBucket:
    process.env.FIREBASE_STORAGE_BUCKET || `${projectId}.firebasestorage.app`,
});

const db = admin.firestore(app);
const storage = admin.storage(app);

async function deleteCollection(
  collectionPath: string,
  batchSize: number = 100,
) {
  const collectionRef = db.collection(collectionPath);
  const query = collectionRef.orderBy("__name__").limit(batchSize);

  return new Promise((resolve, reject) => {
    deleteQueryBatch(query, resolve).catch(reject);
  });
}

async function deleteQueryBatch(query: admin.firestore.Query, resolve: any) {
  const snapshot = await query.get();

  const batchSize = snapshot.size;
  if (batchSize === 0) {
    // When there are no documents left, we are done
    resolve();
    return;
  }

  // Delete documents in a batch
  const batch = db.batch();
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });
  await batch.commit();

  // Recurse on the next process tick, to avoid
  // interrupting the main event loop.
  process.nextTick(() => {
    deleteQueryBatch(query, resolve);
  });
}

async function deleteAllData() {
  console.log("Starting data deletion...");

  // Delete Firestore collections
  const collections = [
    "teams",
    "products",
    "personas",
    "sessions",
    "metrics",
    "history",
    "users",
    "feedback",
  ];
  for (const collection of collections) {
    console.log(`Deleting collection: ${collection}`);
    try {
      await deleteCollection(collection);
    } catch (error) {
      console.warn(`Failed to delete collection ${collection}:`, error);
    }
  }

  // Delete Storage files
  console.log("Deleting storage files...");
  try {
    const [files] = await storage.bucket().getFiles();
    console.log(`Found ${files.length} files to delete.`);
    for (const file of files) {
      console.log(`Deleting file: ${file.name}`);
      await file.delete();
    }
  } catch (error) {
    console.warn("Failed to delete storage files:", error);
  }

  console.log("Data deletion complete.");
}

deleteAllData().catch(console.error);
