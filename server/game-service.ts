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
    
    // Check if the user is already a participant in this session
    const isUserAlreadyParticipant = participants.some(participant => participant.id === userId);
    if (isUserAlreadyParticipant) {
      return true; // User is already a participant, consider this a successful join
    }
    
    // Check if the session is already full
    if (participants.length >= 2) {
      return false; // Session already full
    }

    // Add the user to the session if not already a participant
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
    console.log(`Calculating matches for session: ${sessionCode}`);
    
    const session = await storage.getGameSessionByCode(sessionCode);
    if (!session) {
      console.log("Session not found");
      return null;
    }

    const participants = await storage.getSessionParticipants(session.id);
    if (participants.length !== 2) {
      console.log(`Invalid number of participants: ${participants.length}`);
      return null; // Need exactly 2 participants
    }

    // Get all session answers with related data
    const sessionAnswers = await storage.getSessionAnswers(session.id);
    console.log(`Found ${sessionAnswers.length} total answers for session ID ${session.id}`);
    
    // Get all questions
    const allQuestions = await storage.getQuestions();
    console.log(`Found ${allQuestions.length} total questions`);
    
    // First user ID to use as reference for "your" vs "partner's" answers
    const userId1 = participants[0].id;
    const userId2 = participants[1].id;
    console.log(`Comparing answers between users: ${userId1} and ${userId2}`);
    
    // Create maps for each participant's answers
    const user1Answers = new Map<number, { questionText: string, answerText: string, questionType: string }>();
    const user2Answers = new Map<number, { questionText: string, answerText: string, questionType: string }>();
    
    // Debug answers
    console.log("Raw session answers:", sessionAnswers.map(answer => ({
      userId: answer.userId,
      questionId: answer.questionId,
      questionText: answer.question.text,
      selectedOptionId: answer.selectedOptionId,
      selectedOptionText: answer.selectedOption.optionText
    })));
    
    // Fill the maps with all answers
    sessionAnswers.forEach(answer => {
      const answerInfo = {
        questionText: answer.question.text,
        answerText: answer.selectedOption.optionText,
        questionType: answer.question.questionType
      };
      
      if (answer.userId === userId1) {
        user1Answers.set(answer.questionId, answerInfo);
        console.log(`User 1 (${userId1}) answered "${answerInfo.answerText}" to "${answerInfo.questionText}"`);
      } else if (answer.userId === userId2) {
        user2Answers.set(answer.questionId, answerInfo);
        console.log(`User 2 (${userId2}) answered "${answerInfo.answerText}" to "${answerInfo.questionText}"`);
      }
    });
    
    console.log(`User 1 has ${user1Answers.size} answers, User 2 has ${user2Answers.size} answers`);
    
    // Now compare answers and build results
    let matchCount = 0;
    const matchingAnswers: { question: string, answer: string }[] = [];
    const nonMatchingAnswers: { question: string, yourAnswer: string, partnerAnswer: string }[] = [];
    
    // Process only questions both users have answered
    // Convert Map.entries() to array to avoid TypeScript iterator issues
    const user1EntriesArray = Array.from(user1Answers.entries());
    
    for (let i = 0; i < user1EntriesArray.length; i++) {
      const [questionId, user1Answer] = user1EntriesArray[i];
      const user2Answer = user2Answers.get(questionId);
      
      if (!user2Answer) {
        console.log(`User 2 didn't answer question ${questionId}`);
        continue; // Skip if second user didn't answer this question
      }
      
      console.log(`Comparing answers for question "${user1Answer.questionText}": "${user1Answer.answerText}" vs "${user2Answer.answerText}"`);
      
      // Check if answers match
      if (user1Answer.answerText === user2Answer.answerText) {
        matchCount++;
        matchingAnswers.push({
          question: user1Answer.questionText,
          answer: user1Answer.answerText
        });
        console.log(`✓ Match found!`);
      } else {
        nonMatchingAnswers.push({
          question: user1Answer.questionText,
          yourAnswer: user1Answer.answerText,
          partnerAnswer: user2Answer.answerText
        });
        console.log(`✗ No match`);
      }
    }
    
    // Calculate match percentage based on total questions answered by both users
    const totalQuestions = matchingAnswers.length + nonMatchingAnswers.length;
    const matchPercentage = totalQuestions > 0 ? Math.round((matchCount / totalQuestions) * 100) : 0;
    
    console.log(`Match calculation complete: ${matchCount} matches out of ${totalQuestions} questions (${matchPercentage}%)`);
    console.log("Final results:", {
      matchPercentage,
      matchingAnswers,
      nonMatchingAnswers
    });
    
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
        // Use the currency if provided, otherwise default to AED
        const currency = couponTemplate.currency || "AED";
        discount = `${currency} ${couponTemplate.discountValue} OFF`; // Fixed amount with currency
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
