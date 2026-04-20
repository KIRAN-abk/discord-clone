import { Router, type IRouter } from "express";
import { SendMessageBody, SendMessageParams, ListMessagesParams, ListMessagesResponse } from "@workspace/api-zod";
import { store } from "../lib/store";

const router: IRouter = Router();

router.get("/channels/:channelId/messages", async (req, res): Promise<void> => {
  const params = ListMessagesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const msgs = (await store.listMessages(params.data.channelId)).map((m) => ({
    ...m,
    createdAt: m.createdAt.toISOString(),
  }));

  res.json(ListMessagesResponse.parse(msgs));
});

router.post("/channels/:channelId/messages", async (req, res): Promise<void> => {
  const userId = (req.session as Record<string, unknown>)?.userId as number | undefined;
  if (!userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const params = SendMessageParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = SendMessageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const channel = await store.findChannelById(params.data.channelId);
  if (!channel) {
    res.status(404).json({ error: "Channel not found" });
    return;
  }

  const user = await store.findUserById(userId);
  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  const msg = await store.createMessage({
    content: parsed.data.content,
    channelId: params.data.channelId,
    userId,
  });

  res.status(201).json({
    ...msg,
    username: user.username,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    createdAt: msg.createdAt.toISOString(),
  });
});

export default router;
