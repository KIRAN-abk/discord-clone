import { Router } from "express";
import { store } from "../lib/store.js";

const router = Router();

router.get("/auth/me", async (req, res) => {
  const userId = req.session?.userId;
  if (!userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const user = await store.findUserById(userId);
  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }
  res.json({ ...user, createdAt: user.createdAt.toISOString() });
});

router.post("/auth/login", async (req, res) => {
  const { username, displayName } = req.body;
  
  if (!username || !displayName) {
    res.status(400).json({ error: "username and displayName are required" });
    return;
  }

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

  req.session.userId = user.id;
  res.json({ ...user, createdAt: user.createdAt.toISOString() });
});

router.post("/auth/logout", (req, res) => {
  req.session = null;
  res.json({ success: true });
});

export default router;
