import {
  Router,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import { z } from "zod";
import { validateBody } from "../middleware/validate.js";
import { requireApiSecret } from "../middleware/auth.js";
import { generateProduct } from "../services/vertex.js";

export const productRoutes: Router = Router();

const generateProductSchema = z.object({
  companyName: z.string().optional(),
  briefDescription: z.string().optional(),
});

/**
 * POST /api/product/generate
 * Generates a focused product profile using Gemini AI.
 */
productRoutes.post(
  "/generate",
  requireApiSecret,
  validateBody(generateProductSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const product = await generateProduct(req.body);
      res.json(product);
    } catch (error) {
      next(error);
    }
  },
);
