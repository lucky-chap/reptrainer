import {
  Router,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import { GoogleAuth } from "google-auth-library";
import { env } from "../config/env.js";
import { getLiveSetupConfig } from "../services/vertex.js";

export const authRoutes: Router = Router();

const auth = new GoogleAuth({
  scopes: "https://www.googleapis.com/auth/cloud-platform",
});

/**
 * POST /api/auth/token
 * Fetches a Google Cloud access token for the frontend to connect to Vertex AI.
 */
authRoutes.post(
  "/token",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const client = await auth.getClient();
      const tokenResult = await client.getAccessToken();
      const accessToken = tokenResult.token;
      const { systemPrompt, voiceName } = req.body;

      const setupConfig = systemPrompt
        ? getLiveSetupConfig(
            env.GOOGLE_CLOUD_PROJECT,
            env.GOOGLE_CLOUD_LOCATION,
            systemPrompt,
            voiceName,
          )
        : null;

      res.json({
        token: accessToken,
        project: env.GOOGLE_CLOUD_PROJECT,
        location: env.GOOGLE_CLOUD_LOCATION,
        apiKey: env.GEMINI_API_KEY,
        setupConfig,
      });
    } catch (error) {
      next(error);
    }
  },
);
