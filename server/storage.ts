import { db } from "@db";
import { 
  users, 
  gameSessions, 
  sessionParticipants, 
  questions, 
  questionOptions, 
  userAnswers, 
  vouchers,
  settings,
  couponTemplates,
  User,
  GameSession,
  Question,
  QuestionOption,
  UserAnswer,
  Voucher,
  Settings,
  SettingsUpdate,
  CouponTemplate,
  CouponTemplateInsert
} from "@shared/schema";
import { eq, and, desc, sql, count } from "drizzle-orm";

export const storage = {
  // User operations
  async createUser(userData: any): Promise<User> {
    const [newUser] = await db.insert(users).values(userData).returning();
    return newUser;
  },

  async getUserById(id: number): Promise<User | undefined> {
    const result = await db.query.users.findFirst({
      where: eq(users.id, id)
    });
    return result;
  },

  // Game Session operations
  async createGameSession(sessionData: { sessionCode: string }): Promise<GameSession> {
    const [newSession] = await db.insert(gameSessions).values(sessionData).returning();
    return newSession;
  },

  async getGameSessionByCode(code: string): Promise<GameSession | undefined> {
    const result = await db.query.gameSessions.findFirst({
      where: eq(gameSessions.sessionCode, code)
    });
    return result;
  },

  async addParticipantToSession(sessionId: number, userId: number): Promise<void> {
    await db.insert(sessionParticipants).values({
      sessionId,
      userId
    });
  },

  async getSessionParticipants(sessionId: number): Promise<User[]> {
    const result = await db.query.sessionParticipants.findMany({
      where: eq(sessionParticipants.sessionId, sessionId),
      with: {
        user: true
      }
    });
    return result.map(p => p.user);
  },

  async isSessionComplete(sessionId: number): Promise<boolean> {
    const participantCount = await db
      .select({ count: count() })
      .from(sessionParticipants)
      .where(eq(sessionParticipants.sessionId, sessionId));
    
    return participantCount[0].count === 2;
  },

  // Questions operations
  async getQuestions(type?: string): Promise<(Question & { options: QuestionOption[] })[]> {
    let query = db.query.questions;
    if (type) {
      query = query.findMany({
        where: eq(questions.questionType, type),
        with: {
          options: true
        }
      });
    } else {
      query = query.findMany({
        with: {
          options: true
        }
      });
    }
    return query;
  },

  async saveUserAnswer(answerData: Omit<UserAnswer, "id" | "createdAt">): Promise<void> {
    await db.insert(userAnswers).values(answerData);
  },

  async getUserAnswers(userId: number, sessionId: number): Promise<(UserAnswer & { 
    question: Question, 
    selectedOption: QuestionOption 
  })[]> {
    return db.query.userAnswers.findMany({
      where: and(
        eq(userAnswers.userId, userId),
        eq(userAnswers.sessionId, sessionId)
      ),
      with: {
        question: true,
        selectedOption: true
      }
    });
  },

  async getSessionAnswers(sessionId: number): Promise<(UserAnswer & { 
    user: User,
    question: Question, 
    selectedOption: QuestionOption 
  })[]> {
    return db.query.userAnswers.findMany({
      where: eq(userAnswers.sessionId, sessionId),
      with: {
        user: true,
        question: true,
        selectedOption: true
      }
    });
  },
  
  async hasUserSubmittedAnswers(sessionId: number, userId: number): Promise<boolean> {
    const answers = await db.query.userAnswers.findMany({
      where: and(
        eq(userAnswers.sessionId, sessionId),
        eq(userAnswers.userId, userId)
      )
    });
    
    return answers.length > 0;
  },

  async areAllAnswersSubmitted(sessionId: number): Promise<boolean> {
    // 1. Get all participants in this session
    const participants = await this.getSessionParticipants(sessionId);
    if (participants.length < 2) return false;
    
    // 2. Get all questions
    const questions = await this.getQuestions();
    if (!questions.length) return false;
    
    // 3. Get all answers for this session grouped by user
    const answersResult = await db
      .select({ userId: userAnswers.userId, answerCount: count() })
      .from(userAnswers)
      .where(eq(userAnswers.sessionId, sessionId))
      .groupBy(userAnswers.userId);

    // 4. Check if each participant has submitted all answers
    if (answersResult.length < participants.length) {
      return false; // Not all participants have submitted answers
    }

    // Check if each participant has submitted the correct number of answers
    for (const result of answersResult) {
      if (result.answerCount < questions.length) {
        return false; // This participant hasn't answered all questions
      }
    }
    
    return true;
  },

  // Voucher operations
  async createVoucher(voucherData: Omit<Voucher, "id" | "createdAt">): Promise<Voucher> {
    const [newVoucher] = await db.insert(vouchers).values(voucherData).returning();
    return newVoucher;
  },

  async getVoucherBySessionId(sessionId: number): Promise<Voucher | undefined> {
    const voucher = await db.query.vouchers.findFirst({
      where: eq(vouchers.sessionId, sessionId)
    });
    return voucher;
  },

  async markVoucherAsDownloaded(voucherId: number): Promise<void> {
    await db.update(vouchers)
      .set({ downloaded: true })
      .where(eq(vouchers.id, voucherId));
  },

  // Analytics
  async getTotalParticipants(search: string = "", status: string = ""): Promise<number> {
    // Base query
    let query = db.select({ count: count() }).from(users);
    
    // Apply search filter if provided
    if (search) {
      query = query.where(
        sql`LOWER(${users.name}) LIKE LOWER(${'%' + search + '%'}) OR 
            LOWER(${users.whatsappNumber}) LIKE LOWER(${'%' + search + '%'})`
      );
    }
    
    // Note: Status filtering is handled in memory after fetching users 
    // because status is calculated from multiple tables
    const result = await query;
    return result[0].count;
  },

  async getCompletedMatches(): Promise<number> {
    const result = await db
      .select({ count: count() })
      .from(gameSessions)
      .where(eq(gameSessions.completed, true));
    return result[0].count;
  },

  async getVoucherCount(): Promise<number> {
    const result = await db.select({ count: count() }).from(vouchers);
    return result[0].count;
  },

  async getUsersByGender(): Promise<{ gender: string; count: number }[]> {
    const result = await db
      .select({
        gender: users.gender,
        count: count()
      })
      .from(users)
      .groupBy(users.gender);
    return result;
  },

  async getUsersByAgeGroups(): Promise<{ ageGroup: string; count: number }[]> {
    const result = await db.execute<{ ageGroup: string; count: number }>(sql`
      SELECT
        CASE
          WHEN age BETWEEN 18 AND 24 THEN '18-24'
          WHEN age BETWEEN 25 AND 34 THEN '25-34'
          WHEN age BETWEEN 35 AND 44 THEN '35-44'
          ELSE '45+'
        END AS "ageGroup",
        COUNT(*) AS count
      FROM users
      GROUP BY "ageGroup"
      ORDER BY "ageGroup"
    `);
    
    // Ensure the result is properly formatted as an array of objects
    return Array.isArray(result) ? result : (result.rows || []);
  },

  // Question CRUD operations
  async getQuestionById(id: number): Promise<(Question & { options: QuestionOption[] }) | undefined> {
    const question = await db.query.questions.findFirst({
      where: eq(questions.id, id),
      with: {
        options: true
      }
    });
    return question;
  },

  async createQuestion(questionData: { text: string; questionType: string }): Promise<Question> {
    const [newQuestion] = await db.insert(questions).values(questionData).returning();
    return newQuestion;
  },

  async updateQuestion(id: number, questionData: { text: string; questionType: string }): Promise<void> {
    await db.update(questions)
      .set(questionData)
      .where(eq(questions.id, id));
  },

  async deleteQuestion(id: number): Promise<void> {
    await db.delete(questions).where(eq(questions.id, id));
  },

  async createQuestionOption(optionData: { questionId: number; optionText: string }): Promise<QuestionOption> {
    const [newOption] = await db.insert(questionOptions).values(optionData).returning();
    return newOption;
  },

  async deleteQuestionOption(id: number): Promise<void> {
    await db.delete(questionOptions).where(eq(questionOptions.id, id));
  },

  async getTotalGameSessions(search: string = ""): Promise<number> {
    // Base query
    let query = db.select({ count: sql`count(*)` }).from(gameSessions);
    
    // Apply search filter if provided
    if (search) {
      query = query.where(
        sql`LOWER(${gameSessions.sessionCode}) LIKE LOWER(${'%' + search + '%'})`
      );
    }
    
    const result = await query.then(rows => rows[0]);
    return Number(result.count);
  },

  async getGameSessionsWithParticipants(limit: number = 10, offset: number = 0, search: string = ""): Promise<any[]> {
    // Build query with search if provided
    let where = undefined;
    if (search) {
      where = sql`LOWER(${gameSessions.sessionCode}) LIKE LOWER(${'%' + search + '%'})`;
    }
    
    // Get all sessions with pagination
    const sessions = await db.query.gameSessions.findMany({
      orderBy: [desc(gameSessions.createdAt)],
      limit,
      offset,
      where,
      with: {
        participants: {
          with: {
            user: true
          }
        }
      }
    });

    // For each session, check if there's a voucher
    const sessionsWithVouchers = await Promise.all(
      sessions.map(async (session) => {
        const voucher = await db.query.vouchers.findFirst({
          where: eq(vouchers.sessionId, session.id)
        });

        return {
          ...session,
          voucher,
          participants: session.participants.map(p => ({
            ...p,
            user: p.user
          }))
        };
      })
    );

    return sessionsWithVouchers;
  },

  // Settings operations
  async getSettings(): Promise<Settings> {
    // Get first settings record or create default if none exists
    const existingSettings = await db.query.settings.findFirst();
    
    if (existingSettings) {
      return existingSettings;
    }
    
    // Create default settings if none exist
    const [defaultSettings] = await db.insert(settings).values({
      primaryColor: "#8e2c8e",
      secondaryColor: "#d4a5d4",
    }).returning();
    
    return defaultSettings;
  },
  
  async updateSettings(settingsData: SettingsUpdate): Promise<Settings> {
    // Get current settings
    const currentSettings = await this.getSettings();
    
    // Update only the fields that are provided
    const updateData: Partial<Settings> = {};
    if (settingsData.privacyPolicyUrl !== undefined) {
      updateData.privacyPolicyUrl = settingsData.privacyPolicyUrl;
    }
    if (settingsData.termsAndConditionsUrl !== undefined) {
      updateData.termsAndConditionsUrl = settingsData.termsAndConditionsUrl;
    }
    if (settingsData.logoUrl !== undefined) {
      updateData.logoUrl = settingsData.logoUrl;
    }
    if (settingsData.primaryColor !== undefined) {
      updateData.primaryColor = settingsData.primaryColor;
    }
    if (settingsData.secondaryColor !== undefined) {
      updateData.secondaryColor = settingsData.secondaryColor;
    }
    
    // Update timestamp
    updateData.updatedAt = new Date();
    
    // Update the settings in the database
    const [updatedSettings] = await db.update(settings)
      .set(updateData)
      .where(eq(settings.id, currentSettings.id))
      .returning();
    
    return updatedSettings;
  },

  // Coupon Template operations
  async getCouponTemplates(limit: number = 10, offset: number = 0, search: string = ""): Promise<CouponTemplate[]> {
    // Build query with search if provided
    let where = undefined;
    if (search) {
      where = sql`LOWER(${couponTemplates.name}) LIKE LOWER(${'%' + search + '%'})`;
    }
    
    const templates = await db.query.couponTemplates.findMany({
      orderBy: [desc(couponTemplates.createdAt)],
      limit,
      offset,
      where
    });
    
    return templates;
  },
  
  async getTotalCouponTemplates(search: string = ""): Promise<number> {
    // Base query
    let query = db.select({ count: count() }).from(couponTemplates);
    
    // Apply search filter if provided
    if (search) {
      query = query.where(
        sql`LOWER(${couponTemplates.name}) LIKE LOWER(${'%' + search + '%'})`
      );
    }
    
    const result = await query;
    return result[0].count;
  },
  
  async getCouponTemplateById(id: number): Promise<CouponTemplate | undefined> {
    const template = await db.query.couponTemplates.findFirst({
      where: eq(couponTemplates.id, id)
    });
    return template;
  },
  
  async createCouponTemplate(templateData: CouponTemplateInsert): Promise<CouponTemplate> {
    const [newTemplate] = await db.insert(couponTemplates).values(templateData).returning();
    return newTemplate;
  },
  
  async updateCouponTemplate(id: number, templateData: Partial<CouponTemplateInsert>): Promise<CouponTemplate> {
    const [updatedTemplate] = await db.update(couponTemplates)
      .set({
        ...templateData,
        updatedAt: new Date()
      })
      .where(eq(couponTemplates.id, id))
      .returning();
    return updatedTemplate;
  },
  
  async deleteCouponTemplate(id: number): Promise<void> {
    await db.delete(couponTemplates).where(eq(couponTemplates.id, id));
  },
  
  async toggleCouponTemplateStatus(id: number, isActive: boolean): Promise<CouponTemplate> {
    const [updatedTemplate] = await db.update(couponTemplates)
      .set({
        isActive,
        updatedAt: new Date()
      })
      .where(eq(couponTemplates.id, id))
      .returning();
    return updatedTemplate;
  },
  
  async getActiveCouponTemplate(matchPercentage: number): Promise<CouponTemplate | undefined> {
    // Get active template with lowest threshold that matches the given percentage
    const template = await db.query.couponTemplates.findFirst({
      where: and(
        eq(couponTemplates.isActive, true),
        sql`${couponTemplates.matchPercentageThreshold} <= ${matchPercentage}`
      ),
      orderBy: [desc(couponTemplates.matchPercentageThreshold)]
    });
    
    return template;
  },
  
  async getRecentParticipants(limit: number = 10, offset: number = 0, search: string = "", statusFilter: string = ""): Promise<(User & { matchStatus: string; sessionCode?: string; voucherCode?: string })[]> {
    // Build the query with search if provided
    let where = undefined;
    if (search) {
      where = sql`LOWER(${users.name}) LIKE LOWER(${'%' + search + '%'}) OR 
               LOWER(${users.whatsappNumber}) LIKE LOWER(${'%' + search + '%'})`;
    }
    
    const recentUsers = await db.query.users.findMany({
      orderBy: [desc(users.createdAt)],
      limit,
      offset,
      where
    });

    // For each user, determine their match status
    const usersWithStatus = await Promise.all(
      recentUsers.map(async (user) => {
        // Find session participant records for this user
        const participations = await db.query.sessionParticipants.findMany({
          where: eq(sessionParticipants.userId, user.id),
          with: {
            session: true
          }
        });

        let matchStatus = "No Match";
        let sessionCode;
        let voucherCode;

        if (participations.length > 0) {
          const mostRecentSession = participations.reduce((latest, current) => 
            new Date(current.createdAt) > new Date(latest.createdAt) ? current : latest
          );

          // Add session code
          sessionCode = mostRecentSession.session?.sessionCode;

          // Check if the session is complete
          if (mostRecentSession.session?.completed) {
            matchStatus = "Completed";

            // Check if there's a voucher for this session
            const voucher = await db.query.vouchers.findFirst({
              where: eq(vouchers.sessionId, mostRecentSession.session.id)
            });

            if (voucher) {
              voucherCode = voucher.voucherCode;
              matchStatus = voucher.downloaded ? "Voucher Downloaded" : "Voucher Generated";
            } else {
              matchStatus = "No Voucher";
            }
          } else {
            // Get number of participants in the session
            const participants = await db.query.sessionParticipants.findMany({
              where: eq(sessionParticipants.sessionId, mostRecentSession.session!.id)
            });

            // Get number of answers submitted for this session
            const submittedAnswers = await db.query.userAnswers.findMany({
              where: eq(userAnswers.sessionId, mostRecentSession.session!.id)
            });

            // If the participant count is 2 and there are answers, but the session is not complete
            if (participants.length === 2) {
              const userHasSubmitted = await this.hasUserSubmittedAnswers(
                mostRecentSession.session!.id,
                user.id
              );
              
              if (userHasSubmitted) {
                matchStatus = "Waiting for Partner";
              } else {
                matchStatus = "Not Submitted";
              }
            } else {
              matchStatus = "Waiting for Partner to Join";
            }
          }
        }

        return {
          ...user,
          matchStatus,
          sessionCode,
          voucherCode
        };
      })
    );

    // Apply status filter if provided
    if (statusFilter && statusFilter !== "all") {
      return usersWithStatus.filter(user => user.matchStatus === statusFilter);
    }
    
    return usersWithStatus;
  }
};
