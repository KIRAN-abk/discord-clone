import { Router } from "express";
import { store } from "../lib/store.js";

const router = Router();

router.get("/channels/:channelId/messages", async (req, res) => {
  const channelId = parseInt(req.params.channelId);
  if (isNaN(channelId)) {
    res.status(400).json({ error: "channelId must be a number" });
    return;
  }

  const msgs = (await store.listMessages(channelId)).map((m) => ({
    ...m,
    createdAt: m.createdAt.toISOString(),
  }));

  res.json(msgs);
});

router.post("/channels/:channelId/messages", async (req, res) => {
  const userId = req.session?.userId;
  if (!userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const channelId = parseInt(req.params.channelId);
  if (isNaN(channelId)) {
    res.status(400).json({ error: "channelId must be a number" });
    return;
  }

  const { content } = req.body;
  if (!content) {
    res.status(400).json({ error: "content is required" });
    return;
  }

  const channel = await store.findChannelById(channelId);
  if (!channel) {
    res.status(404).json({ error: "Channel not found" });
    return;
  }

  const user = await store.findUserById(userId);
  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  const message = await store.createMessage({ content, channelId, userId });
  res.status(201).json({
    ...message,
    createdAt: message.createdAt.toISOString(),
    username: user.username,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
  });
});

export default router;
