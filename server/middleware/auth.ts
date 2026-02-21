import { storage } from "../storage";

export async function requireAuth(req: any, res: any, next: any) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ message: "Authentication required" });
  }
  try {
    const user = await storage.getUser(req.session.userId);
    if (!user) {
      return res.status(401).json({ message: "Invalid session" });
    }
    req.user = user;
    return next();
  } catch (_err) {
    return res.status(500).json({ message: "Failed to validate session" });
  }
}
