/**
 * One-time migration script: copies legacy `sessions` documents into `callSessions`.
 *
 * For each doc in `sessions` that does NOT already exist in `callSessions`,
 * creates a corresponding `CallSession` document with mapped fields.
 *
 * Run: npx tsx apps/api/src/scripts/migrate-sessions.ts
 */
import admin from "firebase-admin";
import { env } from "../config/env.js";

// Initialize Firebase Admin
const app = admin.initializeApp({
  projectId: env.GOOGLE_CLOUD_PROJECT,
  storageBucket:
    env.FIREBASE_STORAGE_BUCKET ||
    `${env.GOOGLE_CLOUD_PROJECT}.firebasestorage.app`,
});

const db = admin.firestore(app);

async function migrate() {
  console.log("[migrate] Starting sessions → callSessions migration...");

  const sessionsSnap = await db.collection("sessions").get();
  console.log(`[migrate] Found ${sessionsSnap.size} legacy sessions`);

  if (sessionsSnap.empty) {
    console.log("[migrate] Nothing to migrate.");
    return;
  }

  let migrated = 0;
  let skipped = 0;

  // Firestore batch limit is 500 — process in chunks
  const batchSize = 400;
  let batch = db.batch();
  let batchCount = 0;

  for (const snap of sessionsSnap.docs) {
    const data = snap.data();
    const sessionId = data.id || snap.id;

    // Check if already exists in callSessions
    const existing = await db.doc(`callSessions/${sessionId}`).get();
    if (existing.exists) {
      skipped++;
      continue;
    }

    const callSession = {
      id: sessionId,
      userId: data.userId || "unknown",
      teamId: data.teamId || "unknown",
      personaId: data.personaId || "",
      userName: data.userName || "Rep",
      personaName: data.personaName || "",
      personaRole: data.personaRole || "",
      personaAvatarUrl: data.personaAvatarUrl || null,

      // Timing — estimate from legacy data
      callDurationMinutes: Math.ceil((data.durationSeconds || 0) / 60),
      callStartTime: data.createdAt || null,
      callEndTime: data.createdAt || null,
      callStatus: "ended" as const,

      // Training track
      trackId: data.trackId || null,
      scenarioId: data.scenarioId || null,

      // Transcript — keep string, leave structured messages empty
      transcriptMessages: [],
      transcript: data.transcript || "",

      // Feedback
      feedbackReport: null,
      legacyEvaluation: data.evaluation || null,

      // Insights
      insights: data.insights || [],
      objections: data.objections || [],
      moods: data.moods || [],

      // Media
      audioUrl: data.audioUrl || null,
      debrief: data.debrief || null,
      debriefStatus: data.debrief ? ("ready" as const) : undefined,
      durationSeconds: data.durationSeconds || 0,

      createdAt: data.createdAt || new Date().toISOString(),
    };

    batch.set(db.doc(`callSessions/${sessionId}`), callSession);
    batchCount++;
    migrated++;

    if (batchCount >= batchSize) {
      await batch.commit();
      console.log(`[migrate] Committed batch of ${batchCount} documents`);
      batch = db.batch();
      batchCount = 0;
    }
  }

  // Commit remaining
  if (batchCount > 0) {
    await batch.commit();
    console.log(`[migrate] Committed final batch of ${batchCount} documents`);
  }

  console.log(
    `[migrate] Migration complete. Migrated: ${migrated}, Skipped (already exist): ${skipped}`,
  );
}

migrate()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[migrate] Fatal error:", err);
    process.exit(1);
  });
