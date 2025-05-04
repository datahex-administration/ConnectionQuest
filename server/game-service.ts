import { storage } from "./storage";
import { nanoid } from "nanoid";
import { db } from "@db";
import { eq } from "drizzle-orm";
import { gameSessions } from "@shared/schema";

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
  nonMatchingAnswers: {
    question: string;
    yourAnswer: string;
    partnerAnswer: string;
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

    // Get all questions
    const allQuestions = await storage.getQuestions();
    const commonQuestions = allQuestions.filter(q => q.questionType === "common");
    const commonQuestionIds = new Set(commonQuestions.map(q => q.id));
    
    let matchCount = 0;
    const matchingAnswers: { question: string, answer: string }[] = [];
    const nonMatchingAnswers: { question: string, yourAnswer: string, partnerAnswer: string }[] = [];
    
    // First user ID to use as reference for "your" vs "partner's" answers
    const userId1 = participants[0].id;
    const userId2 = participants[1].id;
    
    for (const [questionId, answers] of answersByQuestion.entries()) {
      // Only process common questions with answers from both participants
      if (!commonQuestionIds.has(questionId) || answers.length !== 2) {
        continue;
      }
      
      // Find the question text
      const question = allQuestions.find(q => q.id === questionId);
      if (!question) continue;
      
      // Sort answers by user ID to keep consistent "your" vs "partner's"
      const sortedAnswers = answers.sort((a, b) => a.userId - b.userId);
      const yourAnswerObj = sortedAnswers.find(a => a.userId === userId1);
      const partnerAnswerObj = sortedAnswers.find(a => a.userId === userId2);
      
      if (!yourAnswerObj || !partnerAnswerObj) continue;
      
      // Check if answers match
      if (yourAnswerObj.answer === partnerAnswerObj.answer) {
        matchCount++;
        matchingAnswers.push({
          question: question.text,
          answer: yourAnswerObj.answer
        });
      } else {
        // If answers don't match, add to nonMatchingAnswers
        nonMatchingAnswers.push({
          question: question.text,
          yourAnswer: yourAnswerObj.answer,
          partnerAnswer: partnerAnswerObj.answer
        });
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
      nonMatchingAnswers,
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
    
    // Get active coupon template based on match percentage
    const couponTemplate = await storage.getActiveCouponTemplate(matchPercentage);
    
    // Determine discount based on template or fallback to default behavior
    let discount = "10% OFF";
    let voucherType = "COUPLE'S DINNER";
    
    // Set validity - default 3 months from today
    const validUntil = new Date();
    
    if (couponTemplate) {
      // Use the template data
      if (couponTemplate.discountType === "percentage") {
        discount = `${couponTemplate.discountValue}% OFF`;
      } else {
        discount = `${couponTemplate.discountValue} OFF`; // Fixed amount
      }
      
      // Set validity based on template validity days
      validUntil.setDate(validUntil.getDate() + couponTemplate.validityDays);
      
      // Use the template name as voucher type
      voucherType = couponTemplate.name;
    } else {
      // Fallback to default behavior if no template found
      if (matchPercentage >= 80) {
        discount = "30% OFF";
      } else if (matchPercentage >= 60) {
        discount = "20% OFF";
      }
      
      // Default 3-month validity
      validUntil.setMonth(validUntil.getMonth() + 3);
    }
    
    // Create voucher
    const voucher = await storage.createVoucher({
      sessionId,
      voucherCode,
      voucherType,
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
