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


// ─── Storage Operations ───


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

