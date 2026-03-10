import {
  collection,
  doc,
  getDoc,
  setDoc,
  getDocs,
  query,
  where,
  orderBy,
  deleteDoc,
  onSnapshot,
  updateDoc,
  Timestamp,
} from "firebase/firestore";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  uploadString,
  deleteObject,
} from "firebase/storage";
import { db, storage } from "./core";
import { v4 as uuidv4 } from "uuid";
import type {
  Persona,
  SessionEvaluation,
  Session,
  CallSession,
  CallStatus,
  FeedbackReport,
  TranscriptMessage,
  UserMetrics,
  TrainingTrackId,
  Team,
  TeamMember,
  Invitation,
  ProgressReport,
  PersonalityType,
  CoachDebriefResponse,
  SkillEvaluation,
  DifficultyLevel,
} from "./core";

// ─── Metrics Operations ───

export async function getUserMetrics(
  userId: string,
): Promise<UserMetrics | undefined> {
  const docRef = doc(db, "userMetrics", userId);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? (docSnap.data() as UserMetrics) : undefined;
}

export async function saveUserMetrics(metrics: UserMetrics): Promise<void> {
  await setDoc(doc(db, "userMetrics", metrics.userId), metrics);
}

export function subscribeUserMetrics(
  userId: string,
  onData: (metrics: UserMetrics | null) => void,
  onError: (err: Error) => void,
) {
  return onSnapshot(
    doc(db, "userMetrics", userId),
    (snap) => {
      onData(snap.exists() ? (snap.data() as UserMetrics) : null);
    },
    onError,
  );
}
