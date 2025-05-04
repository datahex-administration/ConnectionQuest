import { pgTable, text, serial, integer, boolean, timestamp, primaryKey } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  gender: text("gender").notNull(),
  age: integer("age").notNull(),
  whatsappNumber: text("whatsapp_number").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const gameSessions = pgTable("game_sessions", {
  id: serial("id").primaryKey(),
  sessionCode: text("session_code").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completed: boolean("completed").default(false),
  matchPercentage: integer("match_percentage"),
});

export const sessionParticipants = pgTable("session_participants", {
  sessionId: integer("session_id").references(() => gameSessions.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  pk: primaryKey(t.sessionId, t.userId),
}));

export const questions = pgTable("questions", {
  id: serial("id").primaryKey(),
  text: text("text").notNull(),
  questionType: text("question_type").notNull(), // common or individual
});

export const questionOptions = pgTable("question_options", {
  id: serial("id").primaryKey(),
  questionId: integer("question_id")
    .references(() => questions.id)
    .notNull(),
  optionText: text("option_text").notNull(),
});

export const userAnswers = pgTable("user_answers", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  sessionId: integer("session_id").references(() => gameSessions.id).notNull(),
  questionId: integer("question_id").references(() => questions.id).notNull(),
  selectedOptionId: integer("selected_option_id").references(() => questionOptions.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const vouchers = pgTable("vouchers", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").references(() => gameSessions.id).notNull(),
  voucherCode: text("voucher_code").notNull(),
  voucherType: text("voucher_type").notNull(),
  discount: text("discount").notNull(),
  validUntil: timestamp("valid_until").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  downloaded: boolean("downloaded").default(false),
});

export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  privacyPolicyUrl: text("privacy_policy_url"),
  termsAndConditionsUrl: text("terms_and_conditions_url"),
  logoUrl: text("logo_url"),
  primaryColor: text("primary_color").default("#8e2c8e").notNull(),
  secondaryColor: text("secondary_color").default("#d4a5d4").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const couponTemplates = pgTable("coupon_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  discountType: text("discount_type").notNull(), // percentage, fixed
  discountValue: text("discount_value").notNull(),
  currency: text("currency").default("AED").notNull(), // Currency for fixed amount discounts (AED, USD, etc.)
  validityDays: integer("validity_days").notNull(), // Number of days the coupon is valid
  matchPercentageThreshold: integer("match_percentage_threshold").default(40).notNull(), // Minimum match percentage required
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Relationships
export const gameSessionsRelations = relations(gameSessions, ({ many }) => ({
  participants: many(sessionParticipants),
  answers: many(userAnswers),
  vouchers: many(vouchers),
}));

export const sessionParticipantsRelations = relations(sessionParticipants, ({ one }) => ({
  session: one(gameSessions, {
    fields: [sessionParticipants.sessionId],
    references: [gameSessions.id],
  }),
  user: one(users, {
    fields: [sessionParticipants.userId],
    references: [users.id],
  }),
}));

export const questionsRelations = relations(questions, ({ many }) => ({
  options: many(questionOptions),
  answers: many(userAnswers),
}));

export const questionOptionsRelations = relations(questionOptions, ({ one }) => ({
  question: one(questions, {
    fields: [questionOptions.questionId],
    references: [questions.id],
  }),
}));

export const userAnswersRelations = relations(userAnswers, ({ one }) => ({
  user: one(users, {
    fields: [userAnswers.userId],
    references: [users.id],
  }),
  session: one(gameSessions, {
    fields: [userAnswers.sessionId],
    references: [gameSessions.id],
  }),
  question: one(questions, {
    fields: [userAnswers.questionId],
    references: [questions.id],
  }),
  selectedOption: one(questionOptions, {
    fields: [userAnswers.selectedOptionId],
    references: [questionOptions.id],
  }),
}));

export const vouchersRelations = relations(vouchers, ({ one }) => ({
  session: one(gameSessions, {
    fields: [vouchers.sessionId],
    references: [gameSessions.id],
  }),
}));

// Schemas
export const insertUserSchema = createInsertSchema(users, {
  name: (schema) => schema.min(2, "Name must be at least 2 characters"),
  gender: (schema) => schema.refine(val => ["male", "female", "other", "prefer-not-to-say"].includes(val), "Invalid gender"),
  age: (schema) => schema.min(18, "You must be at least 18 years old").max(100, "Age must be 100 or below"),
  whatsappNumber: (schema) => schema.min(8, "Please enter a valid WhatsApp number with country code"),
});

export const insertGameSessionSchema = createInsertSchema(gameSessions, {
  sessionCode: (schema) => schema.length(6, "Session code must be 6 characters"),
});

export const insertSessionParticipantSchema = createInsertSchema(sessionParticipants);
export const insertQuestionSchema = createInsertSchema(questions);
export const insertQuestionOptionSchema = createInsertSchema(questionOptions);
export const insertUserAnswerSchema = createInsertSchema(userAnswers);
export const insertVoucherSchema = createInsertSchema(vouchers);
export const insertSettingsSchema = createInsertSchema(settings);

export const insertCouponTemplateSchema = createInsertSchema(couponTemplates, {
  name: (schema) => schema.min(2, "Name must be at least 2 characters"),
  discountType: (schema) => schema.refine(val => ["percentage", "fixed"].includes(val), "Discount type must be percentage or fixed"),
  discountValue: (schema) => schema.min(1, "Discount value is required"),
  validityDays: (schema) => schema.min(1, "Validity days must be at least 1"),
  matchPercentageThreshold: (schema) => schema.min(0, "Threshold must be at least 0").max(100, "Threshold must be at most 100"),
});
export const updateSettingsSchema = z.object({
  privacyPolicyUrl: z.string().url("Must be a valid URL").optional().nullable(),
  termsAndConditionsUrl: z.string().url("Must be a valid URL").optional().nullable(),
  logoUrl: z.string().optional().nullable(),
  primaryColor: z.string().regex(/^#[0-9A-F]{6}$/i, "Must be a valid hex color").optional(),
  secondaryColor: z.string().regex(/^#[0-9A-F]{6}$/i, "Must be a valid hex color").optional(),
});

// Types
export type User = typeof users.$inferSelect;
export type UserInsert = z.infer<typeof insertUserSchema>;

export type GameSession = typeof gameSessions.$inferSelect;
export type GameSessionInsert = z.infer<typeof insertGameSessionSchema>;

export type SessionParticipant = typeof sessionParticipants.$inferSelect;
export type Question = typeof questions.$inferSelect;
export type QuestionOption = typeof questionOptions.$inferSelect;
export type UserAnswer = typeof userAnswers.$inferSelect;
export type Voucher = typeof vouchers.$inferSelect;
export type Settings = typeof settings.$inferSelect;
export type SettingsUpdate = z.infer<typeof updateSettingsSchema>;

export type CouponTemplate = typeof couponTemplates.$inferSelect;
export type CouponTemplateInsert = z.infer<typeof insertCouponTemplateSchema>;

// Admin Login schema (not stored in database)
export const adminLoginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export type AdminLogin = z.infer<typeof adminLoginSchema>;
