import { Request, Response, NextFunction } from "express";
import { adminLoginSchema } from "@shared/schema";

const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "123@Admin";

export interface AuthRequest extends Request {
  adminUser?: { username: string };
}

export function validateAdminLogin(req: Request, res: Response) {
  try {
    const credentials = adminLoginSchema.parse(req.body);

    if (credentials.username === ADMIN_USERNAME && credentials.password === ADMIN_PASSWORD) {
      // Set session data
      if (req.session) {
        req.session.isAdmin = true;
        req.session.adminUser = { username: ADMIN_USERNAME };
      }
      return res.status(200).json({ message: "Login successful" });
    } else {
      return res.status(401).json({ message: "Invalid credentials" });
    }
  } catch (error) {
    console.error("Admin login validation error:", error);
    return res.status(400).json({ message: "Invalid input data" });
  }
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.session?.isAdmin) {
    req.adminUser = req.session.adminUser;
    return next();
  }
  
  return res.status(401).json({ message: "Unauthorized" });
}

export function adminLogout(req: Request, res: Response) {
  req.session?.destroy((err) => {
    if (err) {
      console.error("Session destruction error:", err);
      return res.status(500).json({ message: "Logout failed" });
    }
    
    res.clearCookie("connect.sid");
    return res.status(200).json({ message: "Logged out successfully" });
  });
}
