import { db } from "./index";
import * as schema from "@shared/schema";
import { eq } from "drizzle-orm";

// Predefined questions for the game
const gameQuestions = [
  {
    text: "What's your favorite travel destination?",
    type: "common",
    options: ["Beach", "Mountains", "City", "Countryside"]
  },
  {
    text: "What's your favorite cuisine?",
    type: "common",
    options: ["Italian", "Asian", "Middle Eastern", "American"]
  },
  {
    text: "What's your ideal date night?",
    type: "common",
    options: ["Dinner", "Movie", "Adventure activity", "Stay home"]
  },
  {
    text: "What's your favorite way to relax?",
    type: "common",
    options: ["Reading", "Watching TV", "Exercise", "Socializing"]
  },
  {
    text: "What's your favorite color?",
    type: "common",
    options: ["Blue", "Red", "Green", "Purple"]
  },
  {
    text: "What quality do you value most in a relationship?",
    type: "individual",
    options: ["Trust", "Communication", "Humor", "Independence"]
  },
  {
    text: "What's your partner's biggest strength?",
    type: "individual",
    options: ["Kindness", "Intelligence", "Reliability", "Patience"]
  }
];

async function seedQuestions() {
  // Check if questions already exist
  const existingQuestions = await db.query.questions.findMany();
  if (existingQuestions.length > 0) {
    console.log("Questions already exist in the database. Skipping question seeding.");
    return;
  }

  console.log("Seeding questions...");
  
  for (const questionData of gameQuestions) {
    // Insert the question
    const [question] = await db.insert(schema.questions)
      .values({
        text: questionData.text,
        questionType: questionData.type
      })
      .returning();
    
    // Insert options for the question
    for (const optionText of questionData.options) {
      await db.insert(schema.questionOptions)
        .values({
          questionId: question.id,
          optionText
        });
    }
  }
  
  console.log("Questions seeded successfully!");
}

async function seed() {
  try {
    await seedQuestions();
  } catch (error) {
    console.error("Error seeding database:", error);
  }
}

seed();
