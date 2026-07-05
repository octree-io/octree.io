import { Router } from "express";
import { CHANNELS } from "../lib/channels.js";

export const channelsRouter = Router();

// GET /channels — the canonical list of Chat lobby channels.
channelsRouter.get("/", (_req, res) => {
  res.json(CHANNELS);
});
