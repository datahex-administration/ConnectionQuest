import express, { type Express } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import { z } from "zod";
import { storage } from "./storage";
import { validateAdminLogin, requireAdmin, adminLogout, AuthRequest } from "./auth";
import { gameService } from "./game-service";
import { 
  insertUserSchema, 
  adminLoginSchema,
} from "@shared/schema";
import { db } from "@db";

// Session configuration
const SESSION_SECRET = process.env.SESSION_SECRET || "mawadha-compatibility-game-secret";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup session middleware
  app.use(
    session({
      secret: SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      cookie: { 
        secure: process.env.NODE_ENV === "production",
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      },
    })
  );

  // API Routes
  // User Registration
  app.post("/api/users", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const newUser = await storage.createUser(userData);
      
      // Store user ID in session
      if (req.session) {
        req.session.userId = newUser.id;
      }
      
      return res.status(201).json(newUser);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error creating user:", error);
      return res.status(500).json({ error: "Failed to create user" });
    }
  });

  // Game Session Management
  app.post("/api/sessions/create", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ error: "User not logged in" });
      }

      const sessionCode = await gameService.createSession();
      
      // Join the user to the session
      await gameService.joinSession(sessionCode, req.session.userId);
      
      return res.status(201).json({ sessionCode });
    } catch (error) {
      console.error("Error creating game session:", error);
      return res.status(500).json({ error: "Failed to create game session" });
    }
  });

  app.post("/api/sessions/join", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ error: "User not logged in" });
      }

      const { sessionCode } = req.body;
      if (!sessionCode || typeof sessionCode !== "string") {
        return res.status(400).json({ error: "Invalid session code" });
      }

      const joined = await gameService.joinSession(sessionCode, req.session.userId);
      if (!joined) {
        return res.status(404).json({ error: "Session not found or full" });
      }
      
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error("Error joining game session:", error);
      return res.status(500).json({ error: "Failed to join game session" });
    }
  });

  app.get("/api/sessions/:code/status", async (req, res) => {
    try {
      const { code } = req.params;
      const isReady = await gameService.isSessionReady(code);
      
      return res.status(200).json({ ready: isReady });
    } catch (error) {
      console.error("Error checking session status:", error);
      return res.status(500).json({ error: "Failed to check session status" });
    }
  });

  app.get("/api/sessions/:code/questions", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ error: "User not logged in" });
      }

      const { code } = req.params;
      const questions = await gameService.getSessionQuestions(code);
      
      return res.status(200).json(questions);
    } catch (error) {
      console.error("Error fetching questions:", error);
      return res.status(500).json({ error: "Failed to fetch questions" });
    }
  });

  app.post("/api/sessions/:code/answers", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ error: "User not logged in" });
      }

      const { code } = req.params;
      const { answers } = req.body;
      
      if (!Array.isArray(answers)) {
        return res.status(400).json({ error: "Invalid answers format" });
      }
      
      await gameService.submitAnswers(code, req.session.userId, answers);
      
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error("Error submitting answers:", error);
      return res.status(500).json({ error: "Failed to submit answers" });
    }
  });

  app.get("/api/sessions/:code/results", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ error: "User not logged in" });
      }

      const { code } = req.params;
      const results = await gameService.calculateMatches(code);
      
      if (!results) {
        return res.status(404).json({ error: "Results not available" });
      }
      
      // Create a voucher for the session if match percentage is above threshold
      let voucher = null;
      if (results.matchPercentage >= 40) {
        voucher = await gameService.generateVoucher(results.sessionId, results.matchPercentage);
      }
      
      return res.status(200).json({
        ...results,
        voucher
      });
    } catch (error) {
      console.error("Error calculating results:", error);
      return res.status(500).json({ error: "Failed to calculate results" });
    }
  });

  app.post("/api/vouchers/:id/download", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ error: "User not logged in" });
      }

      const { id } = req.params;
      const voucherId = parseInt(id);
      
      await storage.markVoucherAsDownloaded(voucherId);
      
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error("Error marking voucher as downloaded:", error);
      return res.status(500).json({ error: "Failed to record voucher download" });
    }
  });

  // Admin Routes
  app.post("/api/admin/login", validateAdminLogin);
  app.post("/api/admin/logout", adminLogout);

  app.get("/api/admin/analytics", requireAdmin, async (req: AuthRequest, res) => {
    try {
      const totalParticipants = await storage.getTotalParticipants();
      const completedMatches = await storage.getCompletedMatches();
      const voucherCount = await storage.getVoucherCount();
      const genderDistribution = await storage.getUsersByGender();
      const ageDistribution = await storage.getUsersByAgeGroups();
      
      return res.status(200).json({
        totalParticipants,
        completedMatches,
        voucherCount,
        genderDistribution,
        ageDistribution
      });
    } catch (error) {
      console.error("Error fetching analytics:", error);
      return res.status(500).json({ error: "Failed to fetch analytics data" });
    }
  });

  app.get("/api/admin/participants", requireAdmin, async (req: AuthRequest, res) => {
    try {
      const participants = await storage.getRecentParticipants();
      return res.status(200).json(participants);
    } catch (error) {
      console.error("Error fetching participants:", error);
      return res.status(500).json({ error: "Failed to fetch participants" });
    }
  });

  // Create HTTP server
  const httpServer = createServer(app);
  return httpServer;
}
