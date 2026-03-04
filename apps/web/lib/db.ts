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
  Timestamp,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "./firebase";
import { v4 as uuidv4 } from "uuid";

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
  transcript: string;
  durationSeconds: number;
  evaluation: SessionEvaluation | null;
  createdAt: string;
  insights?: { insight: string; timestamp: number }[];
  audioUrl?: string; // Changed from audioBlob for Firestore/Storage
}

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
  await deleteDoc(doc(db, "personas", id));
}

// ─── Session Operations ──────────────────────────────────────────────────

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
