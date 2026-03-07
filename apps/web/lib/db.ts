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
  updateDoc as firestoreUpdateDoc,
  Timestamp,
} from "firebase/firestore";

export const updateDoc = firestoreUpdateDoc;
import {
  ref,
  uploadBytes,
  getDownloadURL,
  uploadString,
  deleteObject,
} from "firebase/storage";
import { db as firestoreDb, storage } from "./firebase";
export const db = firestoreDb;
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
  Team,
  TeamMember,
  Invitation,
} from "@reptrainer/shared";

// ─── Data Models ───────────────────────────────────────────────────────────

export interface Product {
  id: string;
  userId: string;
  teamId: string;
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
  teamId: string;
  productId: string;
  name: string;
  role: string;
  personalityPrompt: string;
  intensityLevel: number; // 1-3
  objectionStrategy: string;
  gender: "male" | "female" | "other";
  voiceName?: string;
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
  teamId?: string;
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

// Re-export shared types for convenience
export type {
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
};

// ─── Product Operations ───────────────────────────────────────────────────

export async function saveProduct(product: Product): Promise<void> {
  await setDoc(doc(db, "products", product.id), product);
}

export async function getProduct(id: string): Promise<Product | undefined> {
  const docRef = doc(db, "products", id);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? (docSnap.data() as Product) : undefined;
}

export async function getAllProducts(
  userId: string,
  teamIds: string[] = [],
): Promise<Product[]> {
  const constraints = [orderBy("createdAt", "desc")];

  const userQ = query(
    collection(db, "products"),
    where("userId", "==", userId),
    ...constraints,
  );

  const teamQ =
    Array.isArray(teamIds) && teamIds.length > 0
      ? query(
          collection(db, "products"),
          where("teamId", "in", teamIds),
          ...constraints,
        )
      : null;

  const [userSnap, teamSnap] = await Promise.all([
    getDocs(userQ),
    teamQ ? getDocs(teamQ) : Promise.resolve({ docs: [] }),
  ]);

  const combined = [...userSnap.docs, ...teamSnap.docs].map(
    (d) => d.data() as Product,
  );
  const seen = new Set<string>();
  const products = combined
    .filter((p) => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

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
      teamId: "personal", // Fallback for demo
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

export async function getAllPersonas(
  userId: string,
  teamIds: string[] = [],
): Promise<Persona[]> {
  const constraints = [orderBy("createdAt", "desc")];

  const userQ = query(
    collection(db, "personas"),
    where("userId", "==", userId),
    ...constraints,
  );

  const teamQ =
    Array.isArray(teamIds) && teamIds.length > 0
      ? query(
          collection(db, "personas"),
          where("teamId", "in", teamIds),
          ...constraints,
        )
      : null;

  const [userSnap, teamSnap] = await Promise.all([
    getDocs(userQ),
    teamQ ? getDocs(teamQ) : Promise.resolve({ docs: [] }),
  ]);

  const combined = [...userSnap.docs, ...teamSnap.docs].map(
    (d) => d.data() as Persona,
  );
  const seen = new Set<string>();
  const personas = combined
    .filter((p) => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return personas;
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

export async function getAllSessions(
  userId: string,
  teamIds: string[] = [],
): Promise<Session[]> {
  const constraints = [orderBy("createdAt", "desc")];

  const userQ = query(
    collection(db, "sessions"),
    where("userId", "==", userId),
    ...constraints,
  );

  const teamQ =
    Array.isArray(teamIds) && teamIds.length > 0
      ? query(
          collection(db, "sessions"),
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
  teamIds: string[] = [],
  onData: (products: Product[]) => void,
  onError: (err: Error) => void,
) {
  const userQ = query(
    collection(db, "products"),
    where("userId", "==", userId),
    orderBy("createdAt", "desc"),
  );

  let userProducts: Product[] = [];
  let teamProducts: Product[] = [];

  const update = () => {
    const combined = [...userProducts, ...teamProducts];
    const seen = new Set<string>();
    const unique = combined
      .filter((p) => {
        if (seen.has(p.id)) return false;
        seen.add(p.id);
        return true;
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    onData(unique);
  };

  const unsubUser = onSnapshot(
    userQ,
    (snap) => {
      userProducts = snap.docs.map((d) => d.data() as Product);
      update();
    },
    onError,
  );

  let unsubTeam = () => {};
  if (Array.isArray(teamIds) && teamIds.length > 0) {
    const teamQ = query(
      collection(db, "products"),
      where("teamId", "in", teamIds),
      orderBy("createdAt", "desc"),
    );
    unsubTeam = onSnapshot(
      teamQ,
      (snap) => {
        teamProducts = snap.docs.map((d) => d.data() as Product);
        update();
      },
      onError,
    );
  }

  return () => {
    unsubUser();
    unsubTeam();
  };
}

export function subscribePersonas(
  userId: string,
  teamIds: string[] = [],
  onData: (personas: Persona[]) => void,
  onError: (err: Error) => void,
) {
  const userQ = query(
    collection(db, "personas"),
    where("userId", "==", userId),
    orderBy("createdAt", "desc"),
  );

  let userPersonas: Persona[] = [];
  let teamPersonas: Persona[] = [];

  const update = () => {
    const combined = [...userPersonas, ...teamPersonas];
    const seen = new Set<string>();
    const unique = combined
      .filter((p) => {
        if (seen.has(p.id)) return false;
        seen.add(p.id);
        return true;
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    onData(unique);
  };

  const unsubUser = onSnapshot(
    userQ,
    (snap) => {
      userPersonas = snap.docs.map((d) => d.data() as Persona);
      update();
    },
    onError,
  );

  let unsubTeam = () => {};
  if (Array.isArray(teamIds) && teamIds.length > 0) {
    const teamQ = query(
      collection(db, "personas"),
      where("teamId", "in", teamIds),
      orderBy("createdAt", "desc"),
    );
    unsubTeam = onSnapshot(
      teamQ,
      (snap) => {
        teamPersonas = snap.docs.map((d) => d.data() as Persona);
        update();
      },
      onError,
    );
  }

  return () => {
    unsubUser();
    unsubTeam();
  };
}

export function subscribeSessions(
  userId: string,
  teamIds: string[] = [],
  onData: (sessions: Session[]) => void,
  onError: (err: Error) => void,
) {
  const userQ = query(
    collection(db, "sessions"),
    where("userId", "==", userId),
    orderBy("createdAt", "desc"),
  );

  let userSessions: Session[] = [];
  let teamSessions: Session[] = [];

  const update = () => {
    const combined = [...userSessions, ...teamSessions];
    const seen = new Set<string>();
    const unique = combined
      .filter((s) => {
        if (seen.has(s.id)) return false;
        seen.add(s.id);
        return true;
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    onData(unique);
  };

  const unsubUser = onSnapshot(
    userQ,
    (snap) => {
      userSessions = snap.docs.map((d) => d.data() as Session);
      update();
    },
    onError,
  );

  let unsubTeam = () => {};
  if (Array.isArray(teamIds) && teamIds.length > 0) {
    const teamQ = query(
      collection(db, "sessions"),
      where("teamId", "in", teamIds),
      orderBy("createdAt", "desc"),
    );
    unsubTeam = onSnapshot(
      teamQ,
      (snap) => {
        teamSessions = snap.docs.map((d) => d.data() as Session);
        update();
      },
      onError,
    );
  }

  return () => {
    unsubUser();
    unsubTeam();
  };
}

export function subscribeSessionsByUserIds(
  userIds: string[],
  onData: (sessions: Session[]) => void,
  onError: (err: Error) => void,
) {
  if (!userIds || userIds.length === 0) {
    onData([]);
    return () => {};
  }

  // Firestore "in" query limit is 30 in some versions, 10 in others.
  // We'll chunk if needed, but for most teams 30 is enough.
  const q = query(
    collection(db, "sessions"),
    where("userId", "in", userIds.slice(0, 30)),
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

// ─── Team Operations ─────────────────────────────────────────────────────

export async function createTeam(
  name: string,
  ownerId: string,
  ownerName?: string,
  ownerAvatarUrl?: string,
): Promise<Team> {
  const team: Team = {
    id: uuidv4(),
    name,
    ownerId,
    createdAt: new Date().toISOString(),
  };
  await setDoc(doc(db, "teams", team.id), team);

  // Add creator as admin member
  await addTeamMember(team.id, ownerId, "admin", ownerName, ownerAvatarUrl);

  return team;
}

export async function getTeam(id: string): Promise<Team | undefined> {
  const docRef = doc(db, "teams", id);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? (docSnap.data() as Team) : undefined;
}

export async function updateTeam(
  id: string,
  updates: Partial<Team>,
): Promise<void> {
  await updateDoc(doc(db, "teams", id), updates);
}

export type TeamWithRole = Team & { role: "admin" | "member" };

export async function getUserMemberships(
  userId: string,
): Promise<TeamWithRole[]> {
  const q = query(collection(db, "teamMembers"), where("userId", "==", userId));
  const querySnapshot = await getDocs(q);

  const memberships = querySnapshot.docs.map((doc) => doc.data() as TeamMember);

  if (memberships.length === 0) return [];

  const teamIds = memberships.map((m) => m.teamId);
  const roleMap: Record<string, "admin" | "member"> = {};
  memberships.forEach((m) => (roleMap[m.teamId] = m.role));

  const teams: TeamWithRole[] = [];
  // Firestore 'in' query has a limit of 10
  const teamsQuery = query(collection(db, "teams"), where("id", "in", teamIds));
  const teamsSnapshot = await getDocs(teamsQuery);

  teamsSnapshot.forEach((doc) => {
    const team = doc.data() as Team;
    teams.push({
      ...team,
      role: roleMap[team.id],
    });
  });

  return teams;
}

export async function getUserTeams(userId: string): Promise<Team[]> {
  const q = query(collection(db, "teamMembers"), where("userId", "==", userId));
  const querySnapshot = await getDocs(q);
  const teamIds = querySnapshot.docs.map(
    (doc) => (doc.data() as TeamMember).teamId,
  );

  if (teamIds.length === 0) return [];

  const teams: Team[] = [];
  // Firestore 'in' query has a limit of 10, but good enough for now
  const teamsQuery = query(collection(db, "teams"), where("id", "in", teamIds));
  const teamsSnapshot = await getDocs(teamsQuery);
  teamsSnapshot.forEach((doc) => {
    teams.push(doc.data() as Team);
  });

  return teams;
}

/**
 * Real-time subscription for combined team and membership data.
 */
export function subscribeUserMemberships(
  userId: string,
  onData: (data: TeamWithRole[]) => void,
  onError: (err: Error) => void,
) {
  const q = query(collection(db, "teamMembers"), where("userId", "==", userId));

  return onSnapshot(
    q,
    async (snap) => {
      const memberships = snap.docs.map((d) => d.data() as TeamMember);
      if (memberships.length === 0) {
        onData([]);
        return;
      }

      const teamIds = memberships.map((m) => m.teamId);
      const roleMap: Record<string, "admin" | "member"> = {};
      memberships.forEach((m) => (roleMap[m.teamId] = m.role));

      try {
        const teamsQuery = query(
          collection(db, "teams"),
          where("id", "in", teamIds),
        );
        const teamsSnap = await getDocs(teamsQuery);

        const teamsWithRoles = teamsSnap.docs.map((d) => {
          const team = d.data() as Team;
          return {
            ...team,
            role: roleMap[team.id],
          };
        });

        onData(teamsWithRoles);
      } catch (err) {
        onError(err as Error);
      }
    },
    onError,
  );
}

export function subscribeUserTeams(
  userId: string,
  onData: (teams: Team[]) => void,
  onError: (err: Error) => void,
) {
  const q = query(collection(db, "teamMembers"), where("userId", "==", userId));
  return onSnapshot(
    q,
    async (snap) => {
      const teamIds = snap.docs.map((d) => (d.data() as TeamMember).teamId);
      if (teamIds.length === 0) {
        onData([]);
        return;
      }
      const teamsQuery = query(
        collection(db, "teams"),
        where("id", "in", teamIds),
      );
      const teamsSnap = await getDocs(teamsQuery);
      onData(teamsSnap.docs.map((d) => d.data() as Team));
    },
    onError,
  );
}

// ─── Membership Operations ────────────────────────────────────────────────

export async function addTeamMember(
  teamId: string,
  userId: string,
  role: "admin" | "member" = "member",
  userName?: string,
  userAvatarUrl?: string,
): Promise<void> {
  const member: TeamMember = {
    id: `${teamId}_${userId}`,
    teamId,
    userId,
    userName,
    userAvatarUrl,
    role,
    joinedAt: new Date().toISOString(),
  };
  await setDoc(doc(db, "teamMembers", member.id), member);
}

export async function removeTeamMember(
  teamId: string,
  userId: string,
): Promise<void> {
  await deleteDoc(doc(db, "teamMembers", `${teamId}_${userId}`));
}

// ─── Invitation Operations ────────────────────────────────────────────────

export async function createInvitation(
  teamId: string,
  email: string,
  invitedBy: string,
  role: "admin" | "member" = "member",
): Promise<Invitation> {
  const invitation: Invitation = {
    id: uuidv4(), // token
    teamId,
    email,
    role,
    status: "pending",
    invitedBy,
    expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days
  };
  await setDoc(doc(db, "invitations", invitation.id), invitation);
  return invitation;
}

export async function getInvitation(
  tokenId: string,
): Promise<Invitation | undefined> {
  const docRef = doc(db, "invitations", tokenId);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? (docSnap.data() as Invitation) : undefined;
}

export async function acceptInvitation(
  tokenId: string,
  userId: string,
  userName?: string,
  userAvatarUrl?: string,
): Promise<void> {
  const invitation = await getInvitation(tokenId);
  if (!invitation || invitation.status !== "pending") {
    throw new Error("Invalid or expired invitation");
  }

  await addTeamMember(
    invitation.teamId,
    userId,
    invitation.role,
    userName,
    userAvatarUrl,
  );
  await updateDoc(doc(db, "invitations", tokenId), { status: "accepted" });
}

export async function getTeamMembers(teamId: string): Promise<TeamMember[]> {
  const q = query(
    collection(db, "teamMembers"),
    where("teamId", "==", teamId),
    orderBy("joinedAt", "desc"),
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => doc.data() as TeamMember);
}

export function subscribeTeamMembers(
  teamId: string,
  onData: (members: TeamMember[]) => void,
  onError: (err: Error) => void,
) {
  const q = query(
    collection(db, "teamMembers"),
    where("teamId", "==", teamId),
    orderBy("joinedAt", "desc"),
  );

  return onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((d) => d.data() as TeamMember));
    },
    onError,
  );
}

export async function getPendingInvitations(
  teamId: string,
): Promise<Invitation[]> {
  const q = query(
    collection(db, "invitations"),
    where("teamId", "==", teamId),
    where("status", "==", "pending"),
    orderBy("expiresAt", "desc"),
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => doc.data() as Invitation);
}
