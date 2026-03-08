import admin from "firebase-admin";
import { env } from "./env.js";

const app = admin.initializeApp({
  projectId: env.GOOGLE_CLOUD_PROJECT,
  storageBucket:
    env.FIREBASE_STORAGE_BUCKET ||
    `${env.GOOGLE_CLOUD_PROJECT}.firebasestorage.app`,
});

export const storage = admin.storage(app);
export const db = admin.firestore(app);
export const auth = admin.auth(app);
