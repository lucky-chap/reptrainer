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
  Team,
  TeamMember,
  Invitation,
  PersonalityType,
  CoachDebriefResponse,
  SkillEvaluation,
  DifficultyLevel,
} from "./core";

// ─── Persona Operations ───

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
