import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Chat messages table for storing conversation history.
 */
export const chatMessages = mysqlTable("chat_messages", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  content: text("content").notNull(),
  role: mysqlEnum("role", ["user", "assistant"]).notNull(),
  disputeId: int("disputeId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = typeof chatMessages.$inferInsert;

/**
 * Disputes table storing case facts and engine outcomes.
 */
export const disputes = mysqlTable("disputes", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  factsJson: text("factsJson").notNull(), // Serialized CaseFacts
  engineOutput: text("engineOutput").notNull(), // Serialized engine result
  decision: varchar("decision", { length: 500 }),
  court: varchar("court", { length: 200 }),
  track: varchar("track", { length: 200 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Dispute = typeof disputes.$inferSelect;
export type InsertDispute = typeof disputes.$inferInsert;

/**
 * Legal knowledge base for RAG retrieval.
 */
export const legalKnowledgeBase = mysqlTable("legal_knowledge_base", {
  id: int("id").autoincrement().primaryKey(),
  category: varchar("category", { length: 100 }).notNull(), // e.g., "Limitation", "Registration", "Specific Relief Act"
  title: varchar("title", { length: 300 }).notNull(),
  content: text("content").notNull(),
  section: varchar("section", { length: 100 }), // e.g., "S.9 SRA", "S.42 SRA"
  bengaliLabel: varchar("bengaliLabel", { length: 300 }), // Bengali translation of title
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type LegalKnowledgeEntry = typeof legalKnowledgeBase.$inferSelect;
export type InsertLegalKnowledgeEntry = typeof legalKnowledgeBase.$inferInsert;

/**
 * Subscription tiers table
 */
export const subscriptionTiers = mysqlTable("subscription_tiers", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  fileUploadLimit: int("fileUploadLimit").default(0),
  textExtractionEnabled: int("textExtractionEnabled").default(0),
  monthlyPrice: int("monthlyPrice").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SubscriptionTier = typeof subscriptionTiers.$inferSelect;
export type InsertSubscriptionTier = typeof subscriptionTiers.$inferInsert;

/**
 * User subscriptions table
 */
export const userSubscriptions = mysqlTable("user_subscriptions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  tierId: int("tierId").notNull(),
  status: mysqlEnum("status", ["active", "inactive", "expired"]).default("active"),
  startDate: timestamp("startDate").defaultNow().notNull(),
  expiryDate: timestamp("expiryDate"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UserSubscription = typeof userSubscriptions.$inferSelect;
export type InsertUserSubscription = typeof userSubscriptions.$inferInsert;

/**
 * Files table for storing uploaded files
 */
export const files = mysqlTable("files", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  fileType: varchar("fileType", { length: 50 }).notNull(), // image, pdf, word, text
  storageKey: varchar("storageKey", { length: 500 }).notNull(),
  fileSize: int("fileSize"),
  uploadedAt: timestamp("uploadedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type File = typeof files.$inferSelect;
export type InsertFile = typeof files.$inferInsert;

/**
 * Extracted text table
 */
export const extractedTexts = mysqlTable("extracted_texts", {
  id: int("id").autoincrement().primaryKey(),
  fileId: int("fileId").notNull(),
  userId: int("userId").notNull(),
  extractedContent: text("extractedContent").notNull(),
  extractionMethod: varchar("extractionMethod", { length: 100 }), // ocr, pdf_parser, docx_parser, text_read
  extractedAt: timestamp("extractedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ExtractedText = typeof extractedTexts.$inferSelect;
export type InsertExtractedText = typeof extractedTexts.$inferInsert;

/**
 * Audit logs table for governance and security
 */
export const auditLogs = mysqlTable("audit_logs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  action: varchar("action", { length: 100 }).notNull(), // file_upload, text_extract, access, modify, delete
  resourceType: varchar("resourceType", { length: 100 }), // file, chat, dispute, user
  resourceId: int("resourceId"),
  details: text("details"),
  ipAddress: varchar("ipAddress", { length: 50 }),
  userAgent: text("userAgent"),
  status: mysqlEnum("status", ["success", "failure"]).default("success"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;