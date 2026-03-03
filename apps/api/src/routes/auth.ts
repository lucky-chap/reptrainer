import {
  Router,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import { GoogleAuth } from "google-auth-library";

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

      res.json({ apiKey: token.token });
    } catch (error) {
      next(error);
    }
  },
);
