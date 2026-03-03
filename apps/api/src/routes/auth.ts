import {
  Router,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import { GoogleAuth } from "google-auth-library";
import { env } from "../config/env.js";

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
      const token = await client.getAccessToken();

      res.json({
        token: token.token,
        project: env.GOOGLE_CLOUD_PROJECT,
        location: env.GOOGLE_CLOUD_LOCATION,
        apiKey: env.GEMINI_API_KEY,
      });
    } catch (error) {
      next(error);
    }
  },
);
