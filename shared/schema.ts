import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enum for speech engines
export enum SpeechEngine {
  WHISPER = "whisper",
  GLADIA = "gladia",
  DEEPGRAM = "deepgram",
  ASSEMBLYAI = "assemblyai"
}

// Enum for AI models
export enum AIModel {
  GPT4O = "gpt-4o",
  CLAUDE_SONNET = "claude-3-5-sonnet-20241022",
  PERPLEXITY = "llama-3.1-sonar-small-128k-online",
  DEEPSEEK = "deepseek-chat"
}

// Request/response schemas for API endpoints
export const transformRequestSchema = z.object({
  text: z.string().min(1, "Text is required"),
  instructions: z.string().optional(),
  model: z.nativeEnum(AIModel).default(AIModel.DEEPSEEK),
  preset: z.string().optional(),
  useStyleReference: z.boolean().optional(),
  styleReferences: z.array(z.object({
    name: z.string(),
    active: z.boolean()
  })).optional(),
  useContentReference: z.boolean().optional(),
  contentReferences: z.array(z.object({
    name: z.string(),
    active: z.boolean()
  })).optional(),
  retainFormatting: z.boolean().default(false),
  includeGraphs: z.boolean().default(false),
});

export const apiKeyRequestSchema = z.object({
  keys: z.record(z.string(), z.string()),
});

export const extractTextRequestSchema = z.object({
  imageData: z.string(),
  enhanceMath: z.boolean().default(true),
});

export const ttsRequestSchema = z.object({
  text: z.string().min(1, "Text is required"),
  voice: z.string().optional(),
  speed: z.number().min(0.5).max(2.0).default(1.0),
});

export const detectAIRequestSchema = z.object({
  text: z.string().min(1, "Text is required"),
});

export const detectAIResponseSchema = z.object({
  isAI: z.boolean(),
  confidence: z.number(),
  details: z.string().optional(),
});

// GPT Bypass rewrite request schema
export const rewriteRequestSchema = z.object({
  inputText: z.string().min(1, "Input text is required"),
  styleText: z.string().optional(),
  contentMixText: z.string().optional(),
  customInstructions: z.string().optional(),
  selectedPresets: z.array(z.string()).optional(),
  provider: z.string().min(1, "Provider is required"),
  selectedChunkIds: z.array(z.string()).optional(),
  mixingMode: z.enum(['style', 'content', 'both']).optional(),
  // NEW: Granular sample selection with validation
  selectedStyleSamples: z.array(z.number()).max(10, "Maximum 10 style samples allowed").optional(),
  selectedContentSamples: z.array(z.number()).max(10, "Maximum 10 content samples allowed").optional(),
});

export type TransformRequest = z.infer<typeof transformRequestSchema>;
export type APIKeyRequest = z.infer<typeof apiKeyRequestSchema>;
export type ExtractTextRequest = z.infer<typeof extractTextRequestSchema>;
export type TTSRequest = z.infer<typeof ttsRequestSchema>;
export type DetectAIRequest = z.infer<typeof detectAIRequestSchema>;
export type DetectAIResponse = z.infer<typeof detectAIResponseSchema>;
export type RewriteRequestValidated = z.infer<typeof rewriteRequestSchema>;

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const documents = pgTable("documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  filename: text("filename").notNull(),
  content: text("content").notNull(),
  wordCount: integer("word_count").notNull(),
  aiScore: integer("ai_score"),
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const rewriteJobs = pgTable("rewrite_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  inputText: text("input_text").notNull(),
  styleText: text("style_text"),
  contentMixText: text("content_mix_text"),
  customInstructions: text("custom_instructions"),
  selectedPresets: jsonb("selected_presets").$type<string[]>(),
  provider: text("provider").notNull(),
  chunks: jsonb("chunks").$type<TextChunk[]>(),
  selectedChunkIds: jsonb("selected_chunk_ids").$type<string[]>(),
  mixingMode: text("mixing_mode").$type<'style' | 'content' | 'both'>(),
  // NEW: Granular sample selection storage
  selectedStyleSamples: jsonb("selected_style_samples").$type<number[]>(),
  selectedContentSamples: jsonb("selected_content_samples").$type<number[]>(),
  outputText: text("output_text"),
  inputAiScore: integer("input_ai_score"),
  outputAiScore: integer("output_ai_score"),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
  createdAt: true,
});

export const insertRewriteJobSchema = createInsertSchema(rewriteJobs).omit({
  id: true,
  createdAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Document = typeof documents.$inferSelect;
export type RewriteJob = typeof rewriteJobs.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type InsertRewriteJob = z.infer<typeof insertRewriteJobSchema>;

export interface TextChunk {
  id: string;
  content: string;
  startWord: number;
  endWord: number;
  aiScore?: number;
}

export interface InstructionPreset {
  id: string;
  name: string;
  description: string;
  category: string;
  instruction: string;
}

export interface WritingSample {
  id: string;
  name: string;
  preview: string;
  content: string;
  category: string;
}

export interface AIProviderConfig {
  provider: 'openai' | 'anthropic' | 'deepseek' | 'perplexity';
  model?: string;
}

export interface RewriteRequest {
  inputText: string;
  styleText?: string;
  contentMixText?: string;
  customInstructions?: string;
  selectedPresets?: string[];
  provider: string;
  selectedChunkIds?: string[];
  mixingMode?: 'style' | 'content' | 'both';
  // NEW: Granular sample selection
  selectedStyleSamples?: number[];
  selectedContentSamples?: number[];
}

export interface RewriteResponse {
  rewrittenText: string;
  inputAiScore: number;
  outputAiScore: number;
  jobId: string;
}

export interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  category?: string;
  settings?: {
    stability?: number;
    similarity_boost?: number;
    style?: number;
    use_speaker_boost?: boolean;
  };
}