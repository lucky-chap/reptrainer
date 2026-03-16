import { Router, type Request, type Response } from "express";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import { requireApiSecret } from "../middleware/auth.js";
import { analyzeCallFile } from "../services/analyzer.js";
import { uploadFile } from "../services/storage.js";
import { db } from "../config/firebase.js";
import type { CallSession } from "@reptrainer/shared";

export const uploadRoutes: Router = Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
});

/**
 * POST /api/upload/call
 * Handles uploading a sales call recording, transcribing it, and generating analysis.
 */
uploadRoutes.post(
  "/call",
  requireApiSecret,
  upload.single("file"),
  async (req: Request, res: Response) => {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const { userId, teamId, userName, personaId, productId } = req.body;

      if (!userId || !teamId || !userName) {
        return res.status(400).json({
          error: "Missing required fields (userId, teamId, userName)",
        });
      }

      const sessionId = uuidv4();
      const timestamp = new Date().toISOString();

      console.log(
        `[upload] Processing call upload for user ${userId}, session ${sessionId}`,
      );

      // 1. Upload to Firebase Storage
      const destination = `calls/${userId}/${sessionId}/${file.originalname}`;
      const audioUrl = await uploadFile(
        file.buffer,
        destination,
        file.mimetype,
      );

      // 2. Analyze with Gemini Pro
      const analysis = await analyzeCallFile(file.buffer, file.mimetype);

      // 3. Create CallSession object
      const callSession: CallSession = {
        id: sessionId,
        userId,
        teamId,
        userName,
        personaId: personaId || "external-call",
        productId: productId || null,
        source: "external",
        externalMetadata: {
          fileName: file.originalname,
          mimeType: file.mimetype,
          originalUrl: audioUrl,
        },
        callStatus: "ended",
        callDurationMinutes: 0, // Will be updated if available
        callStartTime: timestamp,
        callEndTime: timestamp,
        createdAt: timestamp,
        transcriptMessages: analysis.transcript,
        feedbackReport: analysis.feedbackReport,
        audioUrl: audioUrl,
        trackId: null,
        scenarioId: null,
        legacyEvaluation: null,
        insights: [],
      };

      // 4. Save to Firestore
      await db.collection("callSessions").doc(sessionId).set(callSession);

      console.log(
        `[upload] Successfully processed and saved session ${sessionId}`,
      );

      res.status(200).json({
        success: true,
        sessionId,
        audioUrl,
      });
    } catch (error: any) {
      console.error("[upload] Error processing call upload:", error);
      res.status(500).json({
        error: "Failed to process call upload",
        details: error.message,
      });
    }
  },
);
