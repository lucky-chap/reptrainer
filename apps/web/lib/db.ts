import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import { v4 as uuidv4 } from "uuid";

// ─── Data Models ───────────────────────────────────────────────────────────

export interface Product {
  id: string;
  companyName: string;
  description: string;
  targetCustomer: string;
  industry: string;
  objections: string[];
  createdAt: string;
}

export interface Persona {
  id: string;
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
  personaId: string;
  productId: string;
  transcript: string;
  durationSeconds: number;
  evaluation: SessionEvaluation | null;
  createdAt: string;
}

// ─── IndexedDB Schema ─────────────────────────────────────────────────────

interface ReptrainerDB extends DBSchema {
  products: {
    key: string;
    value: Product;
    indexes: { "by-created": string };
  };
  personas: {
    key: string;
    value: Persona;
    indexes: { "by-product": string; "by-created": string };
  };
  sessions: {
    key: string;
    value: Session;
    indexes: { "by-persona": string; "by-created": string };
  };
}

const DB_NAME = "reptrainer";
const DB_VERSION = 1;

let dbInstance: IDBPDatabase<ReptrainerDB> | null = null;

async function getDB(): Promise<IDBPDatabase<ReptrainerDB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<ReptrainerDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Products store
      const productStore = db.createObjectStore("products", { keyPath: "id" });
      productStore.createIndex("by-created", "createdAt");

      // Personas store
      const personaStore = db.createObjectStore("personas", { keyPath: "id" });
      personaStore.createIndex("by-product", "productId");
      personaStore.createIndex("by-created", "createdAt");

      // Sessions store
      const sessionStore = db.createObjectStore("sessions", { keyPath: "id" });
      sessionStore.createIndex("by-persona", "personaId");
      sessionStore.createIndex("by-created", "createdAt");
    },
  });

  return dbInstance;
}

// ─── Product Operations ───────────────────────────────────────────────────

export async function saveProduct(product: Product): Promise<void> {
  const db = await getDB();
  await db.put("products", product);
}

export async function getProduct(id: string): Promise<Product | undefined> {
  const db = await getDB();
  return db.get("products", id);
}

export async function seedDemoProducts(db: IDBPDatabase<ReptrainerDB>): Promise<void> {
  const demoProducts: Product[] = [
    {
      id: uuidv4(),
      companyName: "DataStream Pro",
      industry: "Enterprise Data Analytics",
      description: "A real-time data streaming platform that unifies disparate data sources into a single source of truth for analytics teams.",
      targetCustomer: "VP of Data Engineering / CDO at Fortune 500 companies",
      objections: [
        "We already use Snowflake and are happy.",
        "Migration sounds like a multi-year nightmare.",
        "Your pricing model is too unpredictable."
      ],
      createdAt: new Date(Date.now() - 1000).toISOString(),
    },
    {
      id: uuidv4(),
      companyName: "SecureNet Zero",
      industry: "Cybersecurity",
      description: "Zero-trust network access (ZTNA) and endpoint security suite designed to replace legacy VPNs for remote workforces.",
      targetCustomer: "CISO or IT Director at mid-market financial services",
      objections: [
        "We're locked into a 3-year contract with Palo Alto.",
        "Our legacy systems don't support zero-trust models.",
        "It will cause too much friction for our employees."
      ],
      createdAt: new Date(Date.now() - 2000).toISOString(),
    },
    {
      id: uuidv4(),
      companyName: "CloudBuild",
      industry: "DevOps / Infrastructure",
      description: "Platform engineering solution that provides developers with self-serve infrastructure while maintaining central compliance.",
      targetCustomer: "VP of Engineering or Head of DevOps at tech scale-ups",
      objections: [
        "Our engineers prefer to write their own Terraform scripts.",
        "We tried an internal developer portal before and no one used it.",
        "It seems too expensive for the ROI."
      ],
      createdAt: new Date(Date.now() - 3000).toISOString(),
    },
    {
      id: uuidv4(),
      companyName: "SalesOptimizer",
      industry: "Sales Enablement Software",
      description: "AI-driven conversation intelligence and coaching platform that analyzes sales calls to improve rep win rates.",
      targetCustomer: "VP of Sales or Revenue Operations Leader",
      objections: [
        "We currently use Gong and it's heavily integrated into our stack.",
        "Our reps hate feeling micromanaged by AI.",
        "We don't have the bandwidth to train the AI to our specific methodology."
      ],
      createdAt: new Date(Date.now() - 4000).toISOString(),
    },
    {
      id: uuidv4(),
      companyName: "HRConnect",
      industry: "Human Resources tech",
      description: "Global payroll, benefits administration, and employee engagement platform for distributed, remote-first teams.",
      targetCustomer: "CHRO or VP of People at remote-first mid-market companies",
      objections: [
        "We just use Deel which is good enough.",
        "Switching HR systems is too risky right now.",
        "How do you handle compliance in obscure international jurisdictions?"
      ],
      createdAt: new Date(Date.now() - 5000).toISOString(),
    }
  ];

  const tx = db.transaction("products", "readwrite");
  for (const product of demoProducts) {
    void tx.store.put(product);
  }
  await tx.done;
}

export async function getAllProducts(): Promise<Product[]> {
  const db = await getDB();
  const count = await db.count("products");
  if (count === 0) {
    await seedDemoProducts(db);
  }
  const products = await db.getAllFromIndex("products", "by-created");
  return products.reverse(); // newest first
}

export async function deleteProduct(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("products", id);
}

// ─── Persona Operations ──────────────────────────────────────────────────

export async function savePersona(persona: Persona): Promise<void> {
  const db = await getDB();
  await db.put("personas", persona);
}

export async function getPersona(id: string): Promise<Persona | undefined> {
  const db = await getDB();
  return db.get("personas", id);
}

export async function getPersonasByProduct(
  productId: string
): Promise<Persona[]> {
  const db = await getDB();
  const personas = await db.getAllFromIndex("personas", "by-product", productId);
  return personas.reverse();
}

export async function getAllPersonas(): Promise<Persona[]> {
  const db = await getDB();
  const personas = await db.getAllFromIndex("personas", "by-created");
  return personas.reverse();
}

export async function deletePersona(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("personas", id);
}

// ─── Session Operations ──────────────────────────────────────────────────

export async function saveSession(session: Session): Promise<void> {
  const db = await getDB();
  await db.put("sessions", session);
}

export async function getSession(id: string): Promise<Session | undefined> {
  const db = await getDB();
  return db.get("sessions", id);
}

export async function getSessionsByPersona(
  personaId: string
): Promise<Session[]> {
  const db = await getDB();
  const sessions = await db.getAllFromIndex(
    "sessions",
    "by-persona",
    personaId
  );
  return sessions.reverse();
}

export async function getAllSessions(): Promise<Session[]> {
  const db = await getDB();
  const sessions = await db.getAllFromIndex("sessions", "by-created");
  return sessions.reverse();
}

export async function deleteSession(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("sessions", id);
}
