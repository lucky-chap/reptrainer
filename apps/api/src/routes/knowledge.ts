import {
  Router,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import multer from "multer";
import { requireApiSecret } from "../middleware/auth.js";
import {
  uploadKnowledgeDocument,
  extractKnowledgeMetadata,
  extractCompetitorContexts,
  initRagEngine,
  getKnowledgeBase,
  getKnowledgeMetadata,
} from "../services/knowledge.js";

export const knowledgeRoutes: Router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

/**
 * POST /api/knowledge/:teamId/upload
 * Uploads a document to the team's knowledge base.
 */
knowledgeRoutes.post(
  "/:teamId/upload",
  requireApiSecret,
  upload.single("file"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const teamId = req.params.teamId as string;
      const file = req.file;

      if (!file) {
        res.status(400).json({ error: "No file uploaded" });
        return;
      }

      const doc = await uploadKnowledgeDocument(
        teamId,
        file.buffer,
        file.originalname,
        file.mimetype,
      );

      res.json(doc);
    } catch (error) {
      next(error);
    }
  },
);

/**
 * POST /api/knowledge/:teamId/process
 * Triggers the AI extraction step for the knowledge base.
 */
knowledgeRoutes.post(
  "/:teamId/process",
  requireApiSecret,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const teamId = req.params.teamId as string;
      const metadata = await extractKnowledgeMetadata(teamId);
      res.json(metadata);
    } catch (error) {
      next(error);
    }
  },
);

/**
 * POST /api/knowledge/:teamId/competitors
 * Triggers the targeted Google Search competitor extraction.
 */
knowledgeRoutes.post(
  "/:teamId/competitors",
  requireApiSecret,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const teamId = req.params.teamId as string;
      const metadata = await extractCompetitorContexts(teamId);
      res.json(metadata);
    } catch (error) {
      next(error);
    }
  },
);

/**
 * POST /api/knowledge/:teamId/rag-init
 * Manually initializes or re-initializes the RAG engine for a team.
 */
knowledgeRoutes.post(
  "/:teamId/rag-init",
  requireApiSecret,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const teamId = req.params.teamId as string;
      const kb = await initRagEngine(teamId);
      res.json(kb);
    } catch (error) {
      next(error);
    }
  },
);

/**
 * GET /api/knowledge/:teamId
 * Gets the knowledge base and metadata for a team.
 */
knowledgeRoutes.get(
  "/:teamId",
  requireApiSecret,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const teamId = req.params.teamId as string;
      const [kb, metadata] = await Promise.all([
        getKnowledgeBase(teamId),
        getKnowledgeMetadata(teamId),
      ]);

      res.json({ kb, metadata });
    } catch (error) {
      next(error);
    }
  },
);
