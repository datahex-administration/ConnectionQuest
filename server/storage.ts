import { db } from "@db";
import { 
  users, 
  gameSessions, 
  sessionParticipants, 
  questions, 
  questionOptions, 
  userAnswers, 
  vouchers,
  User,
  GameSession,
  Question,
  QuestionOption,
  UserAnswer,
  Voucher
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
  async getTotalParticipants(): Promise<number> {
    const result = await db.select({ count: count() }).from(users);
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

  async getRecentParticipants(limit: number = 10): Promise<(User & { matchStatus: string })[]> {
    const recentUsers = await db.query.users.findMany({
      orderBy: [desc(users.createdAt)],
      limit
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
        if (participations.length > 0) {
          const mostRecentSession = participations.reduce((latest, current) => 
            new Date(current.createdAt) > new Date(latest.createdAt) ? current : latest
          );

          if (mostRecentSession.session.completed) {
            matchStatus = "Completed";
          } else {
            matchStatus = "Pending";
          }
        }

        return {
          ...user,
          matchStatus
        };
      })
    );

    return usersWithStatus;
  }
};
