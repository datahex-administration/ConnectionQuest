import express, { type Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import { z } from "zod";

// Declare session with custom properties
declare module "express-session" {
  interface SessionData {
    userId?: number;
    isAdmin?: boolean;
    adminUser?: { username: string };
  }
}
import { storage } from "./storage";
import { validateAdminLogin, requireAdmin, adminLogout, AuthRequest } from "./auth";
import { gameService } from "./game-service";
import { 
  insertUserSchema, 
  adminLoginSchema,
  updateSettingsSchema,
} from "@shared/schema";
import { db } from "@db";

// Middleware to check if user is authenticated
// Store active user sessions in memory as a fallback when cookies fail
const activeUserSessions = new Map<string, number>();

// Custom auth middleware that checks both session and fallback token
// Helper function to get userId from session or token
function getUserIdFromRequest(req: Request): number | undefined {
  // Check session first
  if (req.session?.userId) {
    return req.session.userId;
  }
  
  // Check for x-user-token header as fallback
  const userToken = req.headers['x-user-token'] as string;
  if (userToken && activeUserSessions.has(userToken)) {
    const userId = activeUserSessions.get(userToken);
    
    // Recreate session if possible
    if (req.session && userId) {
      req.session.userId = userId;
      // No need to wait for save to complete
      req.session.save(err => {
        if (err) console.error("Error saving session in middleware:", err);
      });
    }
    
    return userId;
  }
  
  return undefined;
}

function requireUser(req: Request, res: Response, next: NextFunction) {
  const userId = getUserIdFromRequest(req);
  if (userId) {
    return next();
  }
  
  return res.status(401).json({ error: "User not logged in" });
}

// Session configuration
const SESSION_SECRET = process.env.SESSION_SECRET || "mawadha-compatibility-game-secret";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup session middleware
  app.use(
    session({
      secret: SESSION_SECRET,
      resave: true,
      saveUninitialized: true,
      cookie: { 
        secure: false, // Allow non-secure cookies for deployment
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        sameSite: 'lax'
      },
    })
  );

  // API Routes
  // User endpoints
  app.get("/api/user", async (req, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      
      if (!userId) {
        return res.status(401).json({ error: "User not logged in" });
      }
      
      const user = await storage.getUserById(userId);
      if (!user) {
        // Clear invalid session and token
        req.session?.destroy(() => {});
        
        // Remove token from active sessions if it exists
        const userToken = req.headers['x-user-token'] as string;
        if (userToken) activeUserSessions.delete(userToken);
        
        return res.status(401).json({ error: "User not found" });
      }
      
      return res.status(200).json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      return res.status(500).json({ error: "Failed to fetch user data" });
    }
  });
  
  app.post("/api/logout", (req, res) => {
    // Check for token in the request headers
    const userToken = req.headers['x-user-token'] as string;
    if (userToken && activeUserSessions.has(userToken)) {
      // Remove token from active sessions
      activeUserSessions.delete(userToken);
    }
    
    req.session?.destroy((err) => {
      if (err) {
        console.error("Session destruction error:", err);
        return res.status(500).json({ error: "Logout failed" });
      }
      
      res.clearCookie("connect.sid");
      return res.status(200).json({ success: true });
    });
  });

  // User Registration
  app.post("/api/users", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const newUser = await storage.createUser(userData);
      
      // Generate a unique token for this user as fallback auth
      const userToken = `user_${newUser.id}_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
      activeUserSessions.set(userToken, newUser.id);
      
      // Store user ID in session
      if (req.session) {
        req.session.userId = newUser.id;
        // Make sure to save the session
        req.session.save(err => {
          if (err) {
            console.error("Error saving session:", err);
          }
        });
      }
      
      // Return user with auth token
      return res.status(201).json({
        ...newUser,
        token: userToken  // Client can use this as fallback in x-user-token header
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error creating user:", error);
      return res.status(500).json({ error: "Failed to create user" });
    }
  });

  // Game Session Management
  // Debug endpoint to check session state
  app.get("/api/debug/session", (req, res) => {
    return res.status(200).json({
      sessionExists: !!req.session,
      userId: req.session?.userId || null,
      sessionID: req.sessionID || null,
      cookie: req.session?.cookie || null
    });
  });

  app.post("/api/sessions/create", async (req, res) => {
    try {
      // Log session info for debugging
      console.log("Session create - Session ID:", req.sessionID);
      console.log("Session create - User ID:", req.session?.userId);
      
      const userId = getUserIdFromRequest(req);
      
      if (!userId) {
        return res.status(401).json({ error: "User not logged in" });
      }

      const sessionCode = await gameService.createSession();
      
      // Join the user to the session
      await gameService.joinSession(sessionCode, userId);
      
      return res.status(201).json({ sessionCode });
    } catch (error) {
      console.error("Error creating game session:", error);
      return res.status(500).json({ error: "Failed to create game session" });
    }
  });

  app.post("/api/sessions/join", async (req, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      
      if (!userId) {
        return res.status(401).json({ error: "User not logged in" });
      }

      const { sessionCode } = req.body;
      if (!sessionCode || typeof sessionCode !== "string") {
        return res.status(400).json({ error: "Invalid session code" });
      }

      const joined = await gameService.joinSession(sessionCode, userId);
      if (!joined) {
        return res.status(404).json({ error: "Session not found or full" });
      }
      
      // After successful join, get user data to return to client
      const user = await storage.getUserById(userId);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }

      // Generate a fresh token for this user
      const userToken = `user_${user.id}_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
      activeUserSessions.set(userToken, user.id);
      
      // Make sure session is fully saved before returning
      if (req.session) {
        req.session.userId = userId;
        await new Promise<void>((resolve, reject) => {
          req.session.save(err => {
            if (err) {
              console.error("Error saving session in join:", err);
              reject(err);
            } else {
              resolve();
            }
          });
        });
      }
      
      return res.status(200).json({ 
        success: true, 
        user: {
          ...user,
          token: userToken // Include token for client to store
        }
      });
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
      const userId = getUserIdFromRequest(req);
      
      if (!userId) {
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
      const userId = getUserIdFromRequest(req);
      
      if (!userId) {
        return res.status(401).json({ error: "User not logged in" });
      }

      const { code } = req.params;
      const { answers } = req.body;
      
      if (!Array.isArray(answers)) {
        return res.status(400).json({ error: "Invalid answers format" });
      }
      
      // TypeScript needs reassurance that userId exists after our earlier check
      await gameService.submitAnswers(code, userId as number, answers);
      
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error("Error submitting answers:", error);
      return res.status(500).json({ error: "Failed to submit answers" });
    }
  });

  app.get("/api/sessions/:code/user-status", async (req, res) => {
    try {
      const userId = Number(req.query.userId);
      
      if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid user ID" });
      }

      const { code } = req.params;
      const gameSession = await storage.getGameSessionByCode(code);
      
      if (!gameSession) {
        return res.status(404).json({ error: "Session not found" });
      }
      
      const hasSubmitted = await storage.hasUserSubmittedAnswers(gameSession.id, userId);
      
      return res.status(200).json({ hasSubmitted });
    } catch (error) {
      console.error("Error checking user session status:", error);
      return res.status(500).json({ error: "Failed to check user status" });
    }
  });
  
  app.get("/api/sessions/:code/results-status", async (req, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      
      if (!userId) {
        return res.status(401).json({ error: "User not logged in" });
      }

      const { code } = req.params;
      // Get session to check if both users have submitted answers
      const gameSession = await storage.getGameSessionByCode(code);
      
      if (!gameSession) {
        return res.status(404).json({ error: "Session not found" });
      }
      
      // Get participants in this session
      const participants = await storage.getSessionParticipants(gameSession.id);
      if (participants.length < 2) {
        return res.status(200).json({ ready: false, message: "Waiting for partner to join" });
      }
      
      // Check if both participants have submitted their answers
      const allAnswersSubmitted = await storage.areAllAnswersSubmitted(gameSession.id);
      
      return res.status(200).json({ ready: allAnswersSubmitted });
    } catch (error) {
      console.error("Error checking results status:", error);
      return res.status(500).json({ error: "Failed to check results status" });
    }
  });

  app.get("/api/sessions/:code/results", async (req, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      
      if (!userId) {
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
      const userId = getUserIdFromRequest(req);
      
      if (!userId) {
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
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const participants = await storage.getRecentParticipants(limit, (page - 1) * limit);
      const totalCount = await storage.getTotalParticipants();
      
      return res.status(200).json({
        participants,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalCount / limit),
          totalItems: totalCount
        }
      });
    } catch (error) {
      console.error("Error fetching participants:", error);
      return res.status(500).json({ error: "Failed to fetch participants" });
    }
  });
  
  app.get("/api/admin/sessions", requireAdmin, async (req: AuthRequest, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const sessions = await storage.getGameSessionsWithParticipants(limit, (page - 1) * limit);
      const totalCount = await storage.getTotalGameSessions();
      
      return res.status(200).json({
        sessions,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalCount / limit),
          totalItems: totalCount
        }
      });
    } catch (error) {
      console.error("Error fetching game sessions:", error);
      return res.status(500).json({ error: "Failed to fetch game sessions" });
    }
  });

  // Question Management Routes
  app.get("/api/admin/questions", requireAdmin, async (req: AuthRequest, res) => {
    try {
      const questions = await storage.getQuestions();
      return res.status(200).json(questions);
    } catch (error) {
      console.error("Error fetching questions:", error);
      return res.status(500).json({ error: "Failed to fetch questions" });
    }
  });

  app.post("/api/admin/questions", requireAdmin, async (req: AuthRequest, res) => {
    try {
      const { text, questionType, options } = req.body;
      
      // Create the question
      const question = await storage.createQuestion({
        text,
        questionType
      });
      
      // Add options for the question
      for (const option of options) {
        await storage.createQuestionOption({
          questionId: question.id,
          optionText: option.optionText
        });
      }
      
      // Get the complete question with options
      const fullQuestion = await storage.getQuestionById(question.id);
      
      return res.status(201).json(fullQuestion);
    } catch (error) {
      console.error("Error creating question:", error);
      return res.status(500).json({ error: "Failed to create question" });
    }
  });

  app.put("/api/admin/questions/:id", requireAdmin, async (req: AuthRequest, res) => {
    try {
      const questionId = parseInt(req.params.id);
      const { text, questionType, options } = req.body;
      
      // Update the question
      await storage.updateQuestion(questionId, {
        text,
        questionType
      });
      
      // Get existing options
      const existingQuestion = await storage.getQuestionById(questionId);
      if (!existingQuestion) {
        return res.status(404).json({ error: "Question not found" });
      }
      
      // Delete existing options
      for (const option of existingQuestion.options) {
        await storage.deleteQuestionOption(option.id);
      }
      
      // Add new options
      for (const option of options) {
        await storage.createQuestionOption({
          questionId,
          optionText: option.optionText
        });
      }
      
      // Get the updated question with new options
      const updatedQuestion = await storage.getQuestionById(questionId);
      
      return res.status(200).json(updatedQuestion);
    } catch (error) {
      console.error("Error updating question:", error);
      return res.status(500).json({ error: "Failed to update question" });
    }
  });

  app.delete("/api/admin/questions/:id", requireAdmin, async (req: AuthRequest, res) => {
    try {
      const questionId = parseInt(req.params.id);
      
      // Get the question to check if it exists
      const question = await storage.getQuestionById(questionId);
      if (!question) {
        return res.status(404).json({ error: "Question not found" });
      }
      
      // Delete options first (foreign key constraint)
      for (const option of question.options) {
        await storage.deleteQuestionOption(option.id);
      }
      
      // Delete the question
      await storage.deleteQuestion(questionId);
      
      return res.status(200).json({ message: "Question deleted successfully" });
    } catch (error) {
      console.error("Error deleting question:", error);
      return res.status(500).json({ error: "Failed to delete question" });
    }
  });

  // Settings Management Routes
  app.get("/api/admin/settings", requireAdmin, async (req: AuthRequest, res) => {
    try {
      const settings = await storage.getSettings();
      return res.status(200).json(settings);
    } catch (error) {
      console.error("Error fetching settings:", error);
      return res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  app.put("/api/admin/settings", requireAdmin, async (req: AuthRequest, res) => {
    try {
      const settingsData = req.body;
      const parsedSettings = updateSettingsSchema.parse(settingsData);
      
      const updatedSettings = await storage.updateSettings(parsedSettings);
      return res.status(200).json(updatedSettings);
    } catch (error) {
      console.error("Error updating settings:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      return res.status(500).json({ error: "Failed to update settings" });
    }
  });

  // Public settings route (no auth required)
  app.get("/api/settings", async (req, res) => {
    try {
      const settings = await storage.getSettings();
      return res.status(200).json(settings);
    } catch (error) {
      console.error("Error fetching settings:", error);
      return res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  // Create HTTP server
  const httpServer = createServer(app);
  return httpServer;
}
