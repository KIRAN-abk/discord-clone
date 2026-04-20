import { Router } from "express";
import { store } from "../lib/store.js";

const router = Router();

router.get("/channels", async (_req, res) => {
  const channels = (await store.listChannels()).map((c) => ({
    ...c,
    createdAt: c.createdAt.toISOString(),
  }));
  res.json(channels);
});

router.post("/channels", async (req, res) => {
  const userId = req.session?.userId;
  if (!userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const { name } = req.body;
  if (!name) {
    res.status(400).json({ error: "name is required" });
    return;
  }

  const channel = await store.createChannel(name);
  res.status(201).json({ ...channel, createdAt: channel.createdAt.toISOString() });
});

export default router;
