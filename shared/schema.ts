import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Database tables

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const styleReferences = pgTable("style_references", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  active: boolean("active").default(false),
  userId: integer("user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const referenceDocuments = pgTable("reference_documents", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  content: text("content").notNull(),
  styleId: integer("style_id").references(() => styleReferences.id),
  userId: integer("user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const contentReferences = pgTable("content_references", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  active: boolean("active").default(false),
  userId: integer("user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const contentDocuments = pgTable("content_documents", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  content: text("content").notNull(),
  contentId: integer("content_id").references(() => contentReferences.id),
  userId: integer("user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const dictationSessions = pgTable("dictation_sessions", {
  id: serial("id").primaryKey(),
  originalText: text("original_text"),
  processedText: text("processed_text"),
  instructions: text("instructions"),
  userId: integer("user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertStyleReferenceSchema = createInsertSchema(styleReferences).pick({
  name: true,
  description: true,
  active: true,
  userId: true,
});

export const insertReferenceDocumentSchema = createInsertSchema(referenceDocuments).pick({
  name: true,
  content: true,
  styleId: true,
  userId: true,
});

export const insertContentReferenceSchema = createInsertSchema(contentReferences).pick({
  name: true,
  description: true,
  active: true,
  userId: true,
});

export const insertContentDocumentSchema = createInsertSchema(contentDocuments).pick({
  name: true,
  content: true,
  contentId: true,
  userId: true,
});

export const insertDictationSessionSchema = createInsertSchema(dictationSessions).pick({
  originalText: true,
  processedText: true,
  instructions: true,
  userId: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertStyleReference = z.infer<typeof insertStyleReferenceSchema>;
export type StyleReference = typeof styleReferences.$inferSelect;

export type InsertReferenceDocument = z.infer<typeof insertReferenceDocumentSchema>;
export type ReferenceDocument = typeof referenceDocuments.$inferSelect;

export type InsertContentReference = z.infer<typeof insertContentReferenceSchema>;
export type ContentReference = typeof contentReferences.$inferSelect;

export type InsertContentDocument = z.infer<typeof insertContentDocumentSchema>;
export type ContentDocument = typeof contentDocuments.$inferSelect;

export type InsertDictationSession = z.infer<typeof insertDictationSessionSchema>;
export type DictationSession = typeof dictationSessions.$inferSelect;

// Enums
export enum SpeechEngine {
  GLADIA = "Gladia",
  WHISPER = "OpenAI Whisper",
  DEEPGRAM = "Deepgram"
}

export enum AIModel {
  GPT4O = "GPT-4o",
  GPT4 = "GPT-4",
  GPT35 = "GPT-3.5",
  CLAUDE_3_OPUS = "Claude 3 Opus",
  CLAUDE_3_SONNET = "Claude 3 Sonnet",
  CLAUDE_3_HAIKU = "Claude 3 Haiku",
  PERPLEXITY_LLAMA_SONAR = "Perplexity Llama Sonar"
}

// Voice types for ElevenLabs
export interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  category?: string;
  description?: string;
}

// API Request/Response schemas
export const transcribeRequestSchema = z.object({
  audio: z.instanceof(Blob),
  engine: z.nativeEnum(SpeechEngine).optional(),
});

export const transcribeResponseSchema = z.object({
  text: z.string(),
  engine: z.nativeEnum(SpeechEngine),
});

export const transformRequestSchema = z.object({
  text: z.string(),
  instructions: z.string().optional(),
  model: z.nativeEnum(AIModel).optional(),
  preset: z.string().optional(),
  useStyleReference: z.boolean().optional(),
  styleReferences: z.array(z.object({
    id: z.number(),
    name: z.string(),
    description: z.string().optional(),
    active: z.boolean().optional(),
    documentCount: z.number().optional(),
  })).optional(),
  useContentReference: z.boolean().optional(),
  contentReferences: z.array(z.object({
    id: z.number(),
    name: z.string(),
    description: z.string().optional(),
    active: z.boolean().optional(),
    documentCount: z.number().optional(),
  })).optional(),
});

export const transformResponseSchema = z.object({
  text: z.string(),
  model: z.nativeEnum(AIModel),
});

export const extractTextRequestSchema = z.object({
  document: z.instanceof(Blob),
});

export const extractTextResponseSchema = z.object({
  text: z.string(),
  fileName: z.string(),
});

export const generateDocumentRequestSchema = z.object({
  text: z.string(),
  format: z.enum(["txt", "docx", "pdf"]),
  fileName: z.string().optional(),
});

export const ttsRequestSchema = z.object({
  text: z.string().min(1),
  voiceId: z.string().optional(),
});

export const apiKeyRequestSchema = z.object({
  gladiaKey: z.string().optional(),
  openaiKey: z.string().optional(),
  deepgramKey: z.string().optional(),
  elevenLabsKey: z.string().optional(),
  anthropicKey: z.string().optional(),
  perplexityKey: z.string().optional(),
  gptzeroKey: z.string().optional(),
});

export const apiStatusResponseSchema = z.object({
  connected: z.boolean(),
  services: z.object({
    gladia: z.boolean(),
    openai: z.boolean(),
    deepgram: z.boolean(),
    elevenLabs: z.boolean(),
    anthropic: z.boolean(),
    perplexity: z.boolean(),
    gptzero: z.boolean(),
  }),
});

export const voicesResponseSchema = z.object({
  voices: z.array(z.object({
    voice_id: z.string(),
    name: z.string(),
    category: z.string().optional(),
    description: z.string().optional(),
  })),
});

// GPTZero AI Detection schemas
export const detectAIRequestSchema = z.object({
  text: z.string().min(1, "Text is required")
});

export const detectAIResponseSchema = z.object({
  isAIGenerated: z.boolean(),
  probability: z.number(),
  burstiness: z.number(),
  humanLikelihood: z.string(),
  rawResponse: z.any().optional()
});
