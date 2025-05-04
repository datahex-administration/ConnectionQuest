import { storage } from "./storage";
import { nanoid } from "nanoid";

export interface GameQuestion {
  id: number;
  text: string;
  options: string[];
  type: string;
}

export interface MatchResult {
  matchPercentage: number;
  matchingAnswers: {
    question: string;
    answer: string;
  }[];
  sessionId: number;
}

export const gameService = {
  generateSessionCode(): string {
    // Generate a random 6-character code (alphanumeric)
    return nanoid(6).toUpperCase();
  },

  async createSession(): Promise<string> {
    const sessionCode = this.generateSessionCode();
    await storage.createGameSession({ sessionCode });
    return sessionCode;
  },

  async joinSession(sessionCode: string, userId: number): Promise<boolean> {
    const session = await storage.getGameSessionByCode(sessionCode);
    if (!session) {
      return false;
    }

    const participants = await storage.getSessionParticipants(session.id);
    if (participants.length >= 2) {
      return false; // Session already full
    }

    await storage.addParticipantToSession(session.id, userId);
    return true;
  },

  async isSessionReady(sessionCode: string): Promise<boolean> {
    const session = await storage.getGameSessionByCode(sessionCode);
    if (!session) {
      return false;
    }

    return storage.isSessionComplete(session.id);
  },

  async getSessionQuestions(sessionCode: string): Promise<{ 
    commonQuestions: GameQuestion[],
    individualQuestions: GameQuestion[]
  }> {
    // Get 5 common questions and 2 individual questions
    const commonQuestions = await storage.getQuestions("common");
    const individualQuestions = await storage.getQuestions("individual");

    return {
      commonQuestions: commonQuestions.slice(0, 5).map(q => ({
        id: q.id,
        text: q.text,
        options: q.options.map(o => o.optionText),
        type: q.questionType
      })),
      individualQuestions: individualQuestions.slice(0, 2).map(q => ({
        id: q.id,
        text: q.text,
        options: q.options.map(o => o.optionText),
        type: q.questionType
      }))
    };
  },

  async submitAnswers(
    sessionCode: string, 
    userId: number, 
    answers: { questionId: number, optionId: number }[]
  ): Promise<void> {
    const session = await storage.getGameSessionByCode(sessionCode);
    if (!session) {
      throw new Error("Session not found");
    }

    // Save each answer
    for (const answer of answers) {
      await storage.saveUserAnswer({
        userId,
        sessionId: session.id,
        questionId: answer.questionId,
        selectedOptionId: answer.optionId
      });
    }
  },

  async calculateMatches(sessionCode: string): Promise<MatchResult | null> {
    const session = await storage.getGameSessionByCode(sessionCode);
    if (!session) {
      return null;
    }

    const participants = await storage.getSessionParticipants(session.id);
    if (participants.length !== 2) {
      return null; // Need exactly 2 participants
    }

    const allAnswers = await storage.getSessionAnswers(session.id);
    
    // Group answers by question
    const answersByQuestion = new Map<number, { userId: number, answer: string }[]>();
    
    allAnswers.forEach(answer => {
      if (!answersByQuestion.has(answer.questionId)) {
        answersByQuestion.set(answer.questionId, []);
      }
      answersByQuestion.get(answer.questionId)?.push({
        userId: answer.userId,
        answer: answer.selectedOption.optionText
      });
    });

    // Find matching answers (only for common questions)
    const commonQuestions = await storage.getQuestions("common");
    const commonQuestionIds = new Set(commonQuestions.map(q => q.id));
    
    let matchCount = 0;
    const matchingAnswers: { question: string, answer: string }[] = [];
    
    for (const [questionId, answers] of answersByQuestion.entries()) {
      // Skip if not a common question or if we don't have answers from both participants
      if (!commonQuestionIds.has(questionId) || answers.length !== 2) {
        continue;
      }
      
      // Check if answers match
      if (answers[0].answer === answers[1].answer) {
        matchCount++;
        
        // Find the question text
        const question = commonQuestions.find(q => q.id === questionId);
        if (question) {
          matchingAnswers.push({
            question: question.text,
            answer: answers[0].answer
          });
        }
      }
    }
    
    // Calculate match percentage
    const totalCommonQuestions = Math.min(commonQuestionIds.size, 5); // We use 5 common questions
    const matchPercentage = Math.round((matchCount / totalCommonQuestions) * 100);
    
    // Update the session with match percentage
    await db.update(gameSessions)
      .set({ 
        matchPercentage,
        completed: true 
      })
      .where(eq(gameSessions.id, session.id));
    
    return {
      matchPercentage,
      matchingAnswers,
      sessionId: session.id
    };
  },

  async generateVoucher(sessionId: number, matchPercentage: number): Promise<{
    voucherId: number,
    voucherCode: string,
    discount: string,
    validUntil: string
  }> {
    // Generate voucher code
    const voucherCode = `MAWADHA-${nanoid(6).toUpperCase()}`;
    
    // Determine discount based on match percentage
    let discount = "10% OFF";
    if (matchPercentage >= 80) {
      discount = "30% OFF";
    } else if (matchPercentage >= 60) {
      discount = "20% OFF";
    }
    
    // Set validity - 3 months from today
    const validUntil = new Date();
    validUntil.setMonth(validUntil.getMonth() + 3);
    
    // Create voucher
    const voucher = await storage.createVoucher({
      sessionId,
      voucherCode,
      voucherType: "COUPLE'S DINNER",
      discount,
      validUntil,
      downloaded: false
    });
    
    return {
      voucherId: voucher.id,
      voucherCode: voucher.voucherCode,
      discount: voucher.discount,
      validUntil: voucher.validUntil.toISOString()
    };
  }
};
