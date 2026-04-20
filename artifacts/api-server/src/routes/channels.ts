import { Router, type IRouter } from "express";
import { CreateChannelBody, ListChannelsResponse } from "@workspace/api-zod";
import { store } from "../lib/store";

const router: IRouter = Router();

router.get("/channels", async (_req, res): Promise<void> => {
  const channels = (await store.listChannels()).map((c) => ({
    ...c,
    createdAt: c.createdAt.toISOString(),
  }));
  res.json(ListChannelsResponse.parse(channels));
});

router.post("/channels", async (req, res): Promise<void> => {
  const userId = (req.session as Record<string, unknown>)?.userId as number | undefined;
  if (!userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const parsed = CreateChannelBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const channel = await store.createChannel(parsed.data.name);
  res.status(201).json({ ...channel, createdAt: channel.createdAt.toISOString() });
});

export default router;
