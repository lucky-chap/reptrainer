import {
  collection,
  doc,
  getDoc,
  setDoc,
  onSnapshot,
} from "firebase/firestore";
import { db } from "./core";
import env from "@/config/env";
import type {
  KnowledgeBase,
  KnowledgeMetadata,
  KnowledgeDocument,
} from "./core";

/**
 * Subscribes to the knowledge base of a team.
 */
export function subscribeKnowledgeBase(
  teamId: string,
  onData: (kb: KnowledgeBase | null) => void,
  onError: (err: Error) => void,
) {
  if (!teamId) return () => {};
  const docRef = doc(db, "knowledgeBases", teamId);
  return onSnapshot(
    docRef,
    (snap) => {
      onData(snap.exists() ? (snap.data() as KnowledgeBase) : null);
    },
    onError,
  );
}

/**
 * Subscribes to the knowledge metadata of a team.
 */
export function subscribeKnowledgeMetadata(
  teamId: string,
  onData: (metadata: KnowledgeMetadata | null) => void,
  onError: (err: Error) => void,
) {
  if (!teamId) return () => {};
  const docRef = doc(db, "knowledgeMetadata", teamId);
  return onSnapshot(
    docRef,
    (snap) => {
      onData(snap.exists() ? (snap.data() as KnowledgeMetadata) : null);
    },
    onError,
  );
}

/**
 * Uploads a document to the knowledge base via the API.
 */
export async function uploadKnowledgeDocument(
  teamId: string,
  file: File,
): Promise<KnowledgeDocument> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(
    `${env.NEXT_PUBLIC_API_URL}/api/knowledge/${teamId}/upload`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.NEXT_PUBLIC_API_SECRET_KEY}`,
      },
      body: formData,
    },
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to upload document");
  }

  return response.json();
}

/**
 * Triggers knowledge processing via the API.
 */
export async function processKnowledgeBase(
  teamId: string,
): Promise<KnowledgeMetadata> {
  const response = await fetch(
    `${env.NEXT_PUBLIC_API_URL}/api/knowledge/${teamId}/process`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.NEXT_PUBLIC_API_SECRET_KEY}`,
      },
    },
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to process knowledge");
  }

  return response.json();
}

/**
 * Triggers just the Google Search competitor extraction via the API.
 */
export async function extractCompetitorContexts(
  teamId: string,
): Promise<KnowledgeMetadata> {
  const response = await fetch(
    `${env.NEXT_PUBLIC_API_URL}/api/knowledge/${teamId}/competitors`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.NEXT_PUBLIC_API_SECRET_KEY}`,
      },
    },
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to extract competitors");
  }

  return response.json();
}

/**
 * Gets the knowledge base and metadata for a team.
 */
export async function getKnowledgeInfo(
  teamId: string,
): Promise<{ kb: KnowledgeBase | null; metadata: KnowledgeMetadata | null }> {
  const response = await fetch(
    `${env.NEXT_PUBLIC_API_URL}/api/knowledge/${teamId}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${env.NEXT_PUBLIC_API_SECRET_KEY}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error("Failed to fetch knowledge info");
  }

  return response.json();
}

/**
 * Initializes the RAG engine via the API.
 */
export async function initRagEngine(teamId: string): Promise<KnowledgeBase> {
  const response = await fetch(
    `${env.NEXT_PUBLIC_API_URL}/api/knowledge/${teamId}/rag-init`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.NEXT_PUBLIC_API_SECRET_KEY}`,
      },
    },
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to initialize RAG engine");
  }

  return response.json();
}
