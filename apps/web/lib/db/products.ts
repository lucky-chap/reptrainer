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
  Product,
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


// ─── Product Operations ───


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

