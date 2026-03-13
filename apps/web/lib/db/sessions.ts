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
  Query,
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
import type { Session, CallSession, CallStatus } from "./core";

// ─── Session Operations (redirected to callSessions) ───

/** @deprecated Writes to callSessions. Use updateCallSession for new code. */
export async function saveSession(session: Session): Promise<void> {
  await setDoc(doc(db, "callSessions", session.id), session);
}

/** @deprecated Writes to callSessions. Use updateCallSession for new code. */
export async function updateSession(
  id: string,
  updates: Partial<Session>,
): Promise<void> {
  await updateDoc(doc(db, "callSessions", id), updates);
}

export async function getSession(id: string): Promise<Session | undefined> {
  const docRef = doc(db, "callSessions", id);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? (docSnap.data() as Session) : undefined;
}

export async function getSessionsByPersona(
  personaId: string,
  userId: string,
): Promise<Session[]> {
  const q = query(
    collection(db, "callSessions"),
    where("personaId", "==", personaId),
    where("userId", "==", userId),
    orderBy("createdAt", "desc"),
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => doc.data() as Session);
}

export async function getAllSessions(
  userId: string,
  teamIds: string[] = [],
): Promise<Session[]> {
  const constraints = [orderBy("createdAt", "desc")];

  const userQ = query(
    collection(db, "callSessions"),
    where("userId", "==", userId),
    ...constraints,
  );

  const teamQ =
    Array.isArray(teamIds) && teamIds.length > 0
      ? query(
          collection(db, "callSessions"),
          where("teamId", "in", teamIds),
          ...constraints,
        )
      : null;

  const [userSnap, teamSnap] = await Promise.all([
    getDocs(userQ),
    teamQ ? getDocs(teamQ) : Promise.resolve({ docs: [] }),
  ]);

  const combined = [...userSnap.docs, ...teamSnap.docs].map(
    (d) => d.data() as Session,
  );
  const seen = new Set<string>();
  const sessions = combined
    .filter((s) => {
      if (seen.has(s.id)) return false;
      seen.add(s.id);
      return true;
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return sessions;
}

export async function deleteSession(id: string): Promise<void> {
  await deleteDoc(doc(db, "callSessions", id));
}

export async function deleteCallSession(id: string): Promise<void> {
  await deleteDoc(doc(db, "callSessions", id));
}

// ─── Call Session Operations (New — Timed Calls) ─────────────────────────

/**
 * Create a new call session in Firestore.
 * Records callStartTime and callDuration for authoritative timing.
 */
export async function createCallSession(
  data: Omit<
    CallSession,
    | "callEndTime"
    | "callStatus"
    | "transcriptMessages"
    | "feedbackReport"
    | "legacyEvaluation"
    | "insights"
    | "createdAt"
  > & { callStatus?: CallStatus },
): Promise<CallSession> {
  const session: CallSession = {
    ...data,
    callEndTime: null,
    callStatus: data.callStatus || "pending",
    transcriptMessages: [],
    feedbackReport: null,
    legacyEvaluation: null,
    insights: [],
    createdAt: new Date().toISOString(),
  };
  await setDoc(doc(db, "callSessions", session.id), session);
  return session;
}

/**
 * Update a call session (e.g., start the timer, update transcript, end the call).
 */
export async function updateCallSession(
  id: string,
  updates: Partial<CallSession>,
): Promise<void> {
  await updateDoc(doc(db, "callSessions", id), updates);
}

/**
 * Get a single call session by ID.
 */
export async function getCallSession(
  id: string,
): Promise<CallSession | undefined> {
  const docRef = doc(db, "callSessions", id);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? (docSnap.data() as CallSession) : undefined;
}

/**
 * Get all call sessions for a user.
 */
export async function getAllCallSessions(
  userId: string,
  teamIds: string[] = [],
): Promise<CallSession[]> {
  let q;
  if (teamIds.length > 0) {
    q = query(
      collection(db, "callSessions"),
      where("teamId", "in", teamIds),
      orderBy("createdAt", "desc"),
    );
  } else {
    q = query(
      collection(db, "callSessions"),
      where("userId", "==", userId),
      orderBy("createdAt", "desc"),
    );
  }
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => doc.data() as CallSession);
}

/**
 * Subscribe to call sessions for a user (real-time).
 */
export function subscribeCallSessions(
  userId: string,
  teamIds: string[] = [],
  onData: (sessions: CallSession[]) => void,
  onError: (err: Error) => void,
) {
  let q: Query;
  if (teamIds.length > 0) {
    q = query(
      collection(db, "callSessions"),
      where("teamId", "in", teamIds),
      orderBy("createdAt", "desc"),
    );
  } else {
    q = query(
      collection(db, "callSessions"),
      where("userId", "==", userId),
      orderBy("createdAt", "desc"),
    );
  }
  if (!q) return () => {}; // Fallback for type safety
  return onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((d) => d.data() as CallSession));
    },
    onError,
  );
}

/**
 * Subscribe to a single call session document (real-time).
 * Used on the history detail page to watch for debrief status updates.
 */
export function subscribeCallSessionDoc(
  id: string,
  onData: (session: CallSession | null) => void,
  onError: (err: Error) => void,
) {
  return onSnapshot(
    doc(db, "callSessions", id),
    (snap) => {
      onData(snap.exists() ? (snap.data() as CallSession) : null);
    },
    onError,
  );
}
