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
import { db, storage } from "./firebase";
import { v4 as uuidv4 } from "uuid";
import type {
  CallSession,
  CallStatus,
  FeedbackReport,
  TranscriptMessage,
  TrainingTrackId,
  CoachDebriefResponse,
  UserMetrics,
  ProgressReport,
  PersonalityType,
} from "@reptrainer/shared";

// ─── Data Models ───────────────────────────────────────────────────────────

export interface Product {
  id: string;
  userId: string;
  companyName: string;
  description: string;
  targetCustomer: string;
  industry: string;
  objections: string[];
  createdAt: string;
}

export interface Persona {
  id: string;
  userId: string;
  productId: string;
  name: string;
  role: string;
  personalityPrompt: string;
  intensityLevel: number; // 1-3
  objectionStrategy: string;
  gender: "male" | "female";
  personalityType?: PersonalityType;
  avatarUrl?: string;
  traits: {
    aggressiveness: number;
    interruptionFrequency: string;
    objectionStyle: string;
  };
  createdAt: string;
}

export interface SessionEvaluation {
  objectionHandlingScore: number;
  confidenceScore: number;
  clarityScore: number;
  strengths: string[];
  weaknesses: string[];
  improvementTips: string[];
}

export interface Session {
  id: string;
  userId: string;
  personaId: string;
  userName?: string;
  productId: string;
  personaName?: string;
  personaRole?: string;
  personaAvatarUrl?: string;
  transcript: string;
  durationSeconds: number;
  evaluation: SessionEvaluation | null;
  createdAt: string;
  insights?: { insight: string; timestamp: number }[];
  audioUrl?: string; // Changed from audioBlob for Firestore/Storage
  debrief?: CoachDebriefResponse | null;
}

// Re-export the shared CallSession type for convenience
export type { CallSession, FeedbackReport, TranscriptMessage };

// ─── Product Operations ───────────────────────────────────────────────────

export async function saveProduct(product: Product): Promise<void> {
  await setDoc(doc(db, "products", product.id), product);
}

export async function getProduct(id: string): Promise<Product | undefined> {
  const docRef = doc(db, "products", id);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? (docSnap.data() as Product) : undefined;
}

export async function getAllProducts(userId: string): Promise<Product[]> {
  const q = query(
    collection(db, "products"),
    where("userId", "==", userId),
    orderBy("createdAt", "desc"),
  );

  const querySnapshot = await getDocs(q);
  const products: Product[] = [];
  querySnapshot.forEach((doc) => {
    products.push(doc.data() as Product);
  });

  // Seed demo products if empty for this user
  if (products.length === 0) {
    const demo = await seedDemoProducts(userId);
    return demo;
  }

  return products;
}

export async function seedDemoProducts(userId: string): Promise<Product[]> {
  const demoProducts: Product[] = [
    {
      id: uuidv4(),
      userId,
      companyName: "DataStream Pro",
      industry: "Enterprise Data Analytics",
      description:
        "A real-time data streaming platform that unifies disparate data sources into a single source of truth for analytics teams.",
      targetCustomer: "VP of Data Engineering / CDO at Fortune 500 companies",
      objections: [
        "We already use Snowflake and are happy.",
        "Migration sounds like a multi-year nightmare.",
        "Your pricing model is too unpredictable.",
      ],
      createdAt: new Date(Date.now() - 1000).toISOString(),
    },
    // Adding just one for brevity in the seeds, we can add more if needed
  ];

  for (const product of demoProducts) {
    await saveProduct(product);
  }
  return demoProducts;
}

export async function deleteProduct(id: string): Promise<void> {
  await deleteDoc(doc(db, "products", id));
}

// ─── Persona Operations ──────────────────────────────────────────────────

export async function savePersona(persona: Persona): Promise<void> {
  await setDoc(doc(db, "personas", persona.id), persona);
}

export async function getPersona(id: string): Promise<Persona | undefined> {
  const docRef = doc(db, "personas", id);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? (docSnap.data() as Persona) : undefined;
}

export async function getPersonasByProduct(
  productId: string,
  userId: string,
): Promise<Persona[]> {
  const q = query(
    collection(db, "personas"),
    where("productId", "==", productId),
    where("userId", "==", userId),
    orderBy("createdAt", "desc"),
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => doc.data() as Persona);
}

export async function getAllPersonas(userId: string): Promise<Persona[]> {
  const q = query(
    collection(db, "personas"),
    where("userId", "==", userId),
    orderBy("createdAt", "desc"),
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => doc.data() as Persona);
}

export async function deletePersona(id: string): Promise<void> {
  const persona = await getPersona(id);
  if (persona?.avatarUrl && persona.avatarUrl.includes("/avatars/")) {
    try {
      // Extract path from URL or use predictable path
      const fileRef = ref(
        storage,
        `avatars/${persona.userId}/${persona.id}.png`,
      );
      await deleteObject(fileRef);
    } catch (error) {
      console.error("Error deleting persona avatar from storage:", error);
    }
  }
  await deleteDoc(doc(db, "personas", id));
}

export async function updatePersona(
  id: string,
  updates: Partial<Persona>,
): Promise<void> {
  await updateDoc(doc(db, "personas", id), updates);
}

// ─── Metrics Operations ──────────────────────────────────────────────────

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

// ─── Session Operations (Legacy) ─────────────────────────────────────────

export async function saveSession(session: Session): Promise<void> {
  await setDoc(doc(db, "sessions", session.id), session);
}

export async function getSession(id: string): Promise<Session | undefined> {
  const docRef = doc(db, "sessions", id);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? (docSnap.data() as Session) : undefined;
}

export async function getSessionsByPersona(
  personaId: string,
  userId: string,
): Promise<Session[]> {
  const q = query(
    collection(db, "sessions"),
    where("personaId", "==", personaId),
    where("userId", "==", userId),
    orderBy("createdAt", "desc"),
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => doc.data() as Session);
}

export async function getAllSessions(userId: string): Promise<Session[]> {
  const q = query(
    collection(db, "sessions"),
    where("userId", "==", userId),
    orderBy("createdAt", "desc"),
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => doc.data() as Session);
}

export async function deleteSession(id: string): Promise<void> {
  await deleteDoc(doc(db, "sessions", id));
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
): Promise<CallSession[]> {
  const q = query(
    collection(db, "callSessions"),
    where("userId", "==", userId),
    orderBy("createdAt", "desc"),
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => doc.data() as CallSession);
}

/**
 * Subscribe to call sessions for a user (real-time).
 */
export function subscribeCallSessions(
  userId: string,
  onData: (sessions: CallSession[]) => void,
  onError: (err: Error) => void,
) {
  const q = query(
    collection(db, "callSessions"),
    where("userId", "==", userId),
    orderBy("createdAt", "desc"),
  );
  return onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((d) => d.data() as CallSession));
    },
    onError,
  );
}

// ─── Storage Operations ──────────────────────────────────────────────────

export async function uploadSessionAudio(
  userId: string,
  sessionId: string,
  audioBlob: Blob,
): Promise<string> {
  const fileRef = ref(storage, `recordings/${userId}/${sessionId}.webm`);
  await uploadBytes(fileRef, audioBlob);
  return getDownloadURL(fileRef);
}

export async function uploadDebriefAudio(
  userId: string,
  sessionId: string,
  audioBase64: string[],
): Promise<string[]> {
  const uploadPromises = audioBase64.map(async (base64, index) => {
    const fileRef = ref(
      storage,
      `debriefs/${userId}/${sessionId}/slide_${index}.mp3`,
    );
    // Remove data:audio/mpeg;base64, if present
    const cleanBase64 = base64.replace(/^data:audio\/mpeg;base64,/, "");
    await uploadString(fileRef, cleanBase64, "base64", {
      contentType: "audio/mpeg",
    });
    return getDownloadURL(fileRef);
  });

  return Promise.all(uploadPromises);
}

export async function uploadDebriefVisuals(
  userId: string,
  sessionId: string,
  visualBase64: string[],
): Promise<string[]> {
  const uploadPromises = visualBase64.map(async (base64, index) => {
    if (!base64) return "";
    const fileRef = ref(
      storage,
      `debriefs/${userId}/${sessionId}/visual_${index}.jpg`,
    );
    // Handle data:image/jpeg;base64, or data:image/png;base64,
    const cleanBase64 = base64.replace(/^data:image\/[a-z]+;base64,/, "");
    await uploadString(fileRef, cleanBase64, "base64", {
      contentType: "image/jpeg",
    });
    return getDownloadURL(fileRef);
  });

  return Promise.all(uploadPromises);
}

export async function deleteDebriefAudio(
  userId: string,
  sessionId: string,
  numSlides: number,
): Promise<void> {
  const deletePromises = Array.from({ length: numSlides }).map((_, index) => {
    const fileRef = ref(
      storage,
      `debriefs/${userId}/${sessionId}/slide_${index}.mp3`,
    );
    return deleteObject(fileRef).catch((err) => {
      // Ignore if file doesn't exist
      if (err.code !== "storage/object-not-found") {
        console.error(`Error deleting debrief audio slide ${index}:`, err);
      }
    });
  });

  await Promise.all(deletePromises);
}

export async function deleteDebriefVisuals(
  userId: string,
  sessionId: string,
  numVisuals: number,
): Promise<void> {
  const deletePromises = Array.from({ length: numVisuals }).map((_, index) => {
    const fileRef = ref(
      storage,
      `debriefs/${userId}/${sessionId}/visual_${index}.jpg`,
    );
    return deleteObject(fileRef).catch((err) => {
      if (err.code !== "storage/object-not-found") {
        console.error(`Error deleting debrief visual slide ${index}:`, err);
      }
    });
  });

  await Promise.all(deletePromises);
}

export async function uploadPersonaAvatar(
  userId: string,
  personaId: string,
  base64DataUrl: string,
): Promise<string> {
  const fileRef = ref(storage, `avatars/${userId}/${personaId}.png`);
  // Handle data:image/png;base64,... format
  const format = "data_url";
  await uploadString(fileRef, base64DataUrl, format);
  return getDownloadURL(fileRef);
}

// ─── Real-time Subscriptions (cache-first) ───────────────────────────────

export function subscribeProducts(
  userId: string,
  onData: (products: Product[]) => void,
  onError: (err: Error) => void,
) {
  const q = query(
    collection(db, "products"),
    where("userId", "==", userId),
    orderBy("createdAt", "desc"),
  );
  return onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((d) => d.data() as Product));
    },
    onError,
  );
}

export function subscribePersonas(
  userId: string,
  onData: (personas: Persona[]) => void,
  onError: (err: Error) => void,
) {
  const q = query(
    collection(db, "personas"),
    where("userId", "==", userId),
    orderBy("createdAt", "desc"),
  );
  return onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((d) => d.data() as Persona));
    },
    onError,
  );
}

export function subscribeSessions(
  userId: string,
  onData: (sessions: Session[]) => void,
  onError: (err: Error) => void,
) {
  const q = query(
    collection(db, "sessions"),
    where("userId", "==", userId),
    orderBy("createdAt", "desc"),
  );
  return onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((d) => d.data() as Session));
    },
    onError,
  );
}
