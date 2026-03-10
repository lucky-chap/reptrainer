import { db, storage } from "../config/firebase.js";
import { env } from "../config/env.js";
import { v4 as uuidv4 } from "uuid";
import {
  GEMINI_TEXT_MODEL,
  type KnowledgeBase,
  type KnowledgeDocument,
  type KnowledgeMetadata,
} from "@reptrainer/shared";
import { GoogleGenAI } from "@google/genai";
import { PDFParse } from "pdf-parse";

import { ragService } from "./rag.js";

const genAI = new GoogleGenAI({
  vertexai: true,
  project: env.GOOGLE_CLOUD_PROJECT,
  location: env.GOOGLE_CLOUD_LOCATION,
});

const TEXT_MODEL = GEMINI_TEXT_MODEL;

/**
 * Uploads a document to the team's knowledge base.
 */
export async function uploadKnowledgeDocument(
  teamId: string,
  buffer: Buffer,
  fileName: string,
  contentType: string,
): Promise<KnowledgeDocument> {
  const bucket = storage.bucket();
  const fileId = uuidv4();
  const destination = `teams/${teamId}/knowledge/${fileId}-${fileName}`;
  const file = bucket.file(destination);

  await file.save(buffer, {
    metadata: { contentType },
  });

  await file.makePublic();

  const doc: KnowledgeDocument = {
    id: fileId,
    name: fileName,
    type: contentType,
    storageUrl: file.publicUrl(),
    createdAt: new Date().toISOString(),
  };

  // Update Firestore
  const kbRef = db.collection("knowledgeBases").doc(teamId);
  const kbSnap = await kbRef.get();

  let ragCorpusId: string | undefined;
  try {
    // Import to Vertex RAG
    const gcsUri = `gs://${bucket.name}/${destination}`;
    ragCorpusId = await ragService.importFile(teamId, gcsUri, fileName);
  } catch (err) {
    console.error("Failed to import file to RAG:", err);
  }

  const updateData: any = {
    updatedAt: new Date().toISOString(),
  };

  if (ragCorpusId) {
    updateData.ragCorpusId = ragCorpusId;
  }

  if (!kbSnap.exists) {
    await kbRef.set({
      teamId,
      documents: [doc],
      embeddingsIndexStatus: "idle",
      ...updateData,
    } as KnowledgeBase);
  } else {
    const data = kbSnap.data() as KnowledgeBase;
    await kbRef.update({
      documents: [...data.documents, doc],
      ...updateData,
    });
  }

  // Update Team status
  await db.collection("teams").doc(teamId).update({
    hasKnowledgeBase: true,
  });

  return doc;
}

/**
 * Extracts structured metadata from the knowledge base using Gemini.
 */
export async function extractKnowledgeMetadata(
  teamId: string,
): Promise<KnowledgeMetadata> {
  const kbRef = db.collection("knowledgeBases").doc(teamId);
  const kbSnap = await kbRef.get();

  if (!kbSnap.exists) {
    throw new Error("Knowledge base not found for team: " + teamId);
  }

  const kb = kbSnap.data() as KnowledgeBase;

  // Update status to processing
  await kbRef.update({ embeddingsIndexStatus: "processing" });

  try {
    // Collect text from documents
    let combinedText = "";
    for (const doc of kb.documents) {
      if (doc.type === "application/pdf") {
        const response = await fetch(doc.storageUrl);
        const arrayBuffer = await response.arrayBuffer();
        const parser = new PDFParse({ data: new Uint8Array(arrayBuffer) });
        const data = await parser.getText();
        combinedText += `\n--- Document: ${doc.name} ---\n${data.text}\n`;
      } else if (doc.type === "text/plain") {
        const response = await fetch(doc.storageUrl);
        combinedText += `\n--- Document: ${doc.name} ---\n${await response.text()}\n`;
      }
    }

    const prompt = `You are an expert business analyst. Analyze the following team knowledge documents and extract structured information.

Knowledge Base Content:
${combinedText.substring(0, 30000)} // Truncate if too long for simple extraction

Extract the following information in JSON format:
{
  "productCategory": "Brief description of the product category (e.g., CRM, Cybersecurity, HR Tech)",
  "icp": "Detailed Ideal Customer Profile (e.g., SaaS startups 20-200 employees)",
  "buyerRoles": ["Role 1", "Role 2", "Role 3"],
  "competitors": ["Competitor A", "Competitor B"],
  "differentiators": ["Key Differentiator 1", "Key Differentiator 2"],
  "valueProps": ["Value Prop 1", "Value Prop 2"],
  "objections": ["Common Objection 1", "Common Objection 2"]
}

IMPORTANT:
- Base your extraction ONLY on the provided content.
- If something is missing, provide a realistic inference based on the context.
- The output should be valid JSON.`;

    const response = await genAI.models.generateContent({
      model: TEXT_MODEL,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });
    const responseText = response.text || "";

    // Simple JSON extraction
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch)
      throw new Error("Failed to extract JSON from Gemini response");

    const metadata = JSON.parse(jsonMatch[0]);
    const finalMetadata: KnowledgeMetadata = {
      teamId,
      ...metadata,
      updatedAt: new Date().toISOString(),
    };

    // Store metadata
    await db.collection("knowledgeMetadata").doc(teamId).set(finalMetadata);

    // Update KB status
    await kbRef.update({ embeddingsIndexStatus: "ready" });

    return finalMetadata;
  } catch (error) {
    console.error("Knowledge extraction failed:", error);
    await kbRef.update({ embeddingsIndexStatus: "failed" });
    throw error;
  }
}

/**
 * Gets the knowledge base for a team.
 */
export async function getKnowledgeBase(
  teamId: string,
): Promise<KnowledgeBase | null> {
  const snap = await db.collection("knowledgeBases").doc(teamId).get();
  return snap.exists ? (snap.data() as KnowledgeBase) : null;
}

/**
 * Gets the knowledge metadata for a team.
 */
export async function getKnowledgeMetadata(
  teamId: string,
): Promise<KnowledgeMetadata | null> {
  const snap = await db.collection("knowledgeMetadata").doc(teamId).get();
  return snap.exists ? (snap.data() as KnowledgeMetadata) : null;
}

/**
 * Initializes the RAG engine for a team and imports existing documents.
 */
export async function initRagEngine(teamId: string): Promise<KnowledgeBase> {
  const kbRef = db.collection("knowledgeBases").doc(teamId);
  const kbSnap = await kbRef.get();

  if (!kbSnap.exists) {
    throw new Error("Knowledge base not found for team: " + teamId);
  }

  const kb = kbSnap.data() as KnowledgeBase;
  const bucket = storage.bucket();

  let ragCorpusId: string | undefined;

  try {
    ragCorpusId = await ragService.getOrCreateCorpus(teamId);

    // Import existing files
    if (kb.documents && kb.documents.length > 0) {
      for (const doc of kb.documents) {
        const gcsUri = `gs://${bucket.name}/teams/${teamId}/knowledge/${doc.id}-${doc.name}`;
        await ragService.importFile(teamId, gcsUri, doc.name);
      }
    }
  } catch (error) {
    console.error("Failed to initialize RAG engine:", error);
    throw new Error(
      "Failed to initialize RAG engine: " + (error as Error).message,
    );
  }

  // Update Firestore
  await kbRef.update({
    ragCorpusId,
    updatedAt: new Date().toISOString(),
  });

  return { ...kb, ragCorpusId, updatedAt: new Date().toISOString() };
}
