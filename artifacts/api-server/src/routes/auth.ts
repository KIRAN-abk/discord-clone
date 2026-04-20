import { Router, type IRouter } from "express";
import { LoginBody, LoginResponse, GetMeResponse } from "@workspace/api-zod";
import { store } from "../lib/store";

const router: IRouter = Router();

router.get("/auth/me", async (req, res): Promise<void> => {
  const userId = (req.session as Record<string, unknown>)?.userId as number | undefined;
  if (!userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const user = await store.findUserById(userId);
  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }
  res.json(GetMeResponse.parse({ ...user, createdAt: user.createdAt.toISOString() }));
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { username, displayName } = parsed.data;

  let user = await store.findUserByUsername(username);
  if (!user) {
    const avatarColors = ["5865F2", "57F287", "FEE75C", "EB459E", "ED4245", "FF7300"];
    const color = avatarColors[Math.floor(Math.random() * avatarColors.length)];
    const initials = displayName.substring(0, 2).toUpperCase();
    const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=${color}&color=fff&size=128&bold=true`;
    user = await store.createUser({ username, displayName, avatarUrl });
  } else {
    user = (await store.updateUser(user.id, { displayName })) ?? user;
  }

  (req.session as Record<string, unknown>).userId = user.id;
  res.json(LoginResponse.parse({ ...user, createdAt: user.createdAt.toISOString() }));
});

router.post("/auth/logout", (req, res): void => {
  req.session = null;
  res.json({ success: true });
});

export default router;
