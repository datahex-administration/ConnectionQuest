import express, { type Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import { z } from "zod";
import multer from 'multer';
import path from 'path';
import fs from 'fs';

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
  insertCouponTemplateSchema,
  CouponTemplateInsert
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

      try {
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
      } catch (joinError) {
        console.error('Join operation error:', joinError);
        // If this is a duplicate key error (user already in session), consider it successful
        // Check if this is a duplicate key error (user already in session)
        if (joinError && typeof joinError === 'object' && 'code' in joinError && 'constraint' in joinError &&
            joinError.code === '23505' && joinError.constraint === 'session_participants_session_id_user_id_pk') {
          // Get the user data and return success
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
        }
        // If not a duplicate key error, re-throw to be caught by outer catch
        throw joinError;
      }
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
      console.log(`User ${userId} requesting results for session code`);
      
      if (!userId) {
        return res.status(401).json({ error: "User not logged in" });
      }

      const { code } = req.params;
      console.log(`Calculating matches for session code: ${code}`);
      
      // Check if game session exists first
      const gameSession = await storage.getGameSessionByCode(code);
      if (!gameSession) {
        console.log(`Session with code ${code} not found`);
        return res.status(404).json({ error: "Session not found" });
      }
      
      // Check if both users have submitted answers
      const allAnswersSubmitted = await storage.areAllAnswersSubmitted(gameSession.id);
      if (!allAnswersSubmitted) {
        console.log(`Not all answers submitted for session ${code}`);
        return res.status(400).json({ error: "Not all participants have submitted their answers" });
      }

      // Calculate match results (pass userId for perspective)
      const results = await gameService.calculateMatches(code, userId);
      
      if (!results) {
        console.log(`No results available for session ${code}`);
        return res.status(404).json({ error: "Results not available" });
      }
      
      console.log(`Results calculated for session ${code}:`, JSON.stringify(results));
      
      // Create a voucher for the session if match percentage is above threshold (50% or higher)
      let voucher = null;
      if (results.matchPercentage >= 50) {
        // Check if voucher already exists
        const existingVoucher = await storage.getVoucherBySessionId(gameSession.id);
        
        if (existingVoucher) {
          console.log(`Using existing voucher for session ${code}:`, existingVoucher);
          voucher = {
            voucherId: existingVoucher.id,
            voucherCode: existingVoucher.voucherCode,
            discount: existingVoucher.discount,
            validUntil: existingVoucher.validUntil.toISOString()
          };
        } else {
          console.log(`Generating new voucher for session ${code} with match percentage ${results.matchPercentage}%`);
          voucher = await gameService.generateVoucher(results.sessionId, results.matchPercentage);
        }
      } else {
        console.log(`Match percentage ${results.matchPercentage}% too low for voucher`);
      }
      
      const response = {
        ...results,
        voucher
      };
      
      console.log(`Sending results response for session ${code}:`, JSON.stringify(response));
      return res.status(200).json(response);
    } catch (error) {
      console.error("Error calculating results:", error);
      return res.status(500).json({ error: "Failed to calculate results", message: error instanceof Error ? error.message : "Unknown error" });
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
      const search = req.query.search as string || "";
      const status = req.query.status as string || "";
      
      // Get participants with search and filter
      const participants = await storage.getRecentParticipants(limit, (page - 1) * limit, search, status);
      const totalCount = await storage.getTotalParticipants(search, status);
      
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
      const search = req.query.search as string || "";
      
      // Get sessions with search
      const sessions = await storage.getGameSessionsWithParticipants(limit, (page - 1) * limit, search);
      const totalCount = await storage.getTotalGameSessions(search);
      
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

  // Set up multer storage configuration for file uploads
  const multerStorage = multer.diskStorage({
    destination: function (req, file, cb) {
      const uploadDir = path.join(process.cwd(), 'public', 'uploads');
      // Create directory if it doesn't exist
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
      // Generate a unique filename using timestamp and original extension
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname);
      cb(null, 'logo-' + uniqueSuffix + ext);
    }
  });
  
  const upload = multer({ 
    storage: multerStorage,
    limits: {
      fileSize: 2 * 1024 * 1024 // 2MB max file size
    },
    fileFilter: function(req, file, cb) {
      // Accept only image files
      if (!file.mimetype.startsWith('image/')) {
        return cb(new Error('Only image files are allowed'));
      }
      cb(null, true);
    }
  });

  // Logo upload endpoint
  app.post('/api/admin/upload/logo', requireAdmin, upload.single('logo'), async (req: AuthRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      // Generate URL for the uploaded file
      const fileUrl = `/uploads/${req.file.filename}`;
      
      return res.status(200).json({ 
        url: fileUrl,
        filename: req.file.filename
      });
    } catch (error) {
      console.error('Error uploading logo:', error);
      return res.status(500).json({ error: 'Failed to upload logo' });
    }
  });

  // Coupon Template Management Routes
  app.get('/api/admin/coupon-templates', requireAdmin, async (req: AuthRequest, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = req.query.search as string || "";
      
      const templates = await storage.getCouponTemplates(limit, (page - 1) * limit, search);
      const totalCount = await storage.getTotalCouponTemplates(search);
      
      return res.status(200).json({
        templates,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalCount / limit),
          totalItems: totalCount
        }
      });
    } catch (error) {
      console.error("Error fetching coupon templates:", error);
      return res.status(500).json({ error: "Failed to fetch coupon templates" });
    }
  });
  
  app.get('/api/admin/coupon-templates/:id', requireAdmin, async (req: AuthRequest, res) => {
    try {
      const templateId = parseInt(req.params.id);
      const template = await storage.getCouponTemplateById(templateId);
      
      if (!template) {
        return res.status(404).json({ error: "Coupon template not found" });
      }
      
      return res.status(200).json(template);
    } catch (error) {
      console.error("Error fetching coupon template:", error);
      return res.status(500).json({ error: "Failed to fetch coupon template" });
    }
  });
  
  app.post('/api/admin/coupon-templates', requireAdmin, async (req: AuthRequest, res) => {
    try {
      const templateData = insertCouponTemplateSchema.parse(req.body);
      const newTemplate = await storage.createCouponTemplate(templateData);
      
      return res.status(201).json(newTemplate);
    } catch (error) {
      console.error("Error creating coupon template:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      return res.status(500).json({ error: "Failed to create coupon template" });
    }
  });
  
  app.put('/api/admin/coupon-templates/:id', requireAdmin, async (req: AuthRequest, res) => {
    try {
      const templateId = parseInt(req.params.id);
      const template = await storage.getCouponTemplateById(templateId);
      
      if (!template) {
        return res.status(404).json({ error: "Coupon template not found" });
      }
      
      const templateData = insertCouponTemplateSchema.parse(req.body);
      const updatedTemplate = await storage.updateCouponTemplate(templateId, templateData);
      
      return res.status(200).json(updatedTemplate);
    } catch (error) {
      console.error("Error updating coupon template:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      return res.status(500).json({ error: "Failed to update coupon template" });
    }
  });
  
  app.delete('/api/admin/coupon-templates/:id', requireAdmin, async (req: AuthRequest, res) => {
    try {
      const templateId = parseInt(req.params.id);
      const template = await storage.getCouponTemplateById(templateId);
      
      if (!template) {
        return res.status(404).json({ error: "Coupon template not found" });
      }
      
      await storage.deleteCouponTemplate(templateId);
      
      return res.status(200).json({ message: "Coupon template deleted successfully" });
    } catch (error) {
      console.error("Error deleting coupon template:", error);
      return res.status(500).json({ error: "Failed to delete coupon template" });
    }
  });
  
  app.patch('/api/admin/coupon-templates/:id/status', requireAdmin, async (req: AuthRequest, res) => {
    try {
      const templateId = parseInt(req.params.id);
      const { isActive } = req.body;
      
      if (typeof isActive !== 'boolean') {
        return res.status(400).json({ error: "isActive must be a boolean value" });
      }
      
      const template = await storage.getCouponTemplateById(templateId);
      
      if (!template) {
        return res.status(404).json({ error: "Coupon template not found" });
      }
      
      const updatedTemplate = await storage.toggleCouponTemplateStatus(templateId, isActive);
      
      return res.status(200).json(updatedTemplate);
    } catch (error) {
      console.error("Error updating coupon template status:", error);
      return res.status(500).json({ error: "Failed to update coupon template status" });
    }
  });

  // Create HTTP server
  const httpServer = createServer(app);
  return httpServer;
}
