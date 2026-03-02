import { Router } from "express";

export const healthRoutes: Router = Router();

healthRoutes.get("/", (_req, res) => {
  res.json({
    status: "ok",
    service: "reptrainer-api",
    timestamp: new Date().toISOString(),
  });
});
