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
 * Retrieves insights for a specific milestone.
 */
export async function getTeamInsightsAtMilestone(
  teamId: string,
  milestone: number,
): Promise<SavedTeamInsight | undefined> {
  const docRef = doc(db, "teamInsights", `${teamId}_${milestone}`);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? (docSnap.data() as SavedTeamInsight) : undefined;
}
