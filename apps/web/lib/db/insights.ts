import {
  collection,
  doc,
  getDoc,
  setDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
} from "firebase/firestore";
import { db } from "./core";
import type { SavedTeamInsight } from "@reptrainer/shared";
export type { SavedTeamInsight };

/**
 * Saves generated coaching insights for a team at a specific milestone.
 */
export async function saveTeamInsights(
  insight: SavedTeamInsight,
): Promise<void> {
  await setDoc(doc(db, "teamInsights", insight.id), insight);
}

/**
 * Retrieves the latest saved insights for a team.
 */
export async function getLatestTeamInsights(
  teamId: string,
): Promise<SavedTeamInsight | undefined> {
  const q = query(
    collection(db, "teamInsights"),
    where("teamId", "==", teamId),
    orderBy("milestone", "desc"),
    firestoreLimit(1),
  );
  const snap = await getDocs(q);
  if (snap.empty) return undefined;
  return snap.docs[0].data() as SavedTeamInsight;
}

/**
 * Retrieves insights for a specific milestone, optionally filtered by user.
 */
export async function getTeamInsightsAtMilestone(
  teamId: string,
  milestone: number,
  userId?: string,
): Promise<SavedTeamInsight | undefined> {
  const id =
    userId && userId !== "all"
      ? `${teamId}_${milestone}_${userId}`
      : `${teamId}_${milestone}`;
  const docRef = doc(db, "teamInsights", id);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? (docSnap.data() as SavedTeamInsight) : undefined;
}
