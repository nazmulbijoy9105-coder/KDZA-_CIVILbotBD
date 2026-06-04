import { eq, desc, like } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, chatMessages, disputes, legalKnowledgeBase, subscriptionTiers, userSubscriptions, files, extractedTexts, auditLogs } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Chat message queries
export async function saveChatMessage(
  userId: number,
  content: string,
  role: "user" | "assistant",
  disputeId?: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(chatMessages).values({
    userId,
    content,
    role,
    disputeId,
  });
}

export async function getChatHistory(userId: number, limit: number = 50) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const results = await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.userId, userId))
    .orderBy(desc(chatMessages.createdAt))
    .limit(limit);
  return results.reverse(); // Return in chronological order
}

// Dispute queries
export async function saveDispute(
  userId: number,
  factsJson: string,
  engineOutput: string,
  decision?: string,
  court?: string,
  track?: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(disputes).values({
    userId,
    factsJson,
    engineOutput,
    decision,
    court,
    track,
  });
  return result;
}

export async function getDisputeById(disputeId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db
    .select()
    .from(disputes)
    .where(eq(disputes.id, disputeId))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// Legal knowledge base queries
export async function getLegalKnowledgeByCategory(category: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db
    .select()
    .from(legalKnowledgeBase)
    .where(eq(legalKnowledgeBase.category, category));
}

export async function searchLegalKnowledge(query: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db
    .select()
    .from(legalKnowledgeBase)
    .where(like(legalKnowledgeBase.content, `%${query}%`))
    .limit(10);
}


// Subscription queries
export async function getUserSubscription(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db
    .select()
    .from(userSubscriptions)
    .where(eq(userSubscriptions.userId, userId))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getSubscriptionTier(tierId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db
    .select()
    .from(subscriptionTiers)
    .where(eq(subscriptionTiers.id, tierId))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// File queries
export async function saveFile(
  userId: number,
  fileName: string,
  fileType: string,
  storageKey: string,
  fileSize?: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(files).values({
    userId,
    fileName,
    fileType,
    storageKey,
    fileSize,
  });
}

export async function getUserFiles(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db
    .select()
    .from(files)
    .where(eq(files.userId, userId))
    .orderBy(desc(files.uploadedAt));
}

// Text extraction queries
export async function saveExtractedText(
  fileId: number,
  userId: number,
  extractedContent: string,
  extractionMethod: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(extractedTexts).values({
    fileId,
    userId,
    extractedContent,
    extractionMethod,
  });
}

export async function getExtractedTextByFileId(fileId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db
    .select()
    .from(extractedTexts)
    .where(eq(extractedTexts.fileId, fileId))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// Audit log queries
export async function logAuditEvent(
  userId: number,
  action: string,
  resourceType?: string,
  resourceId?: number,
  details?: string,
  ipAddress?: string,
  userAgent?: string,
  status: "success" | "failure" = "success"
) {
  const db = await getDb();
  if (!db) {
    console.warn("[Audit] Cannot log: database not available");
    return;
  }
  try {
    await db.insert(auditLogs).values({
      userId,
      action,
      resourceType,
      resourceId,
      details,
      ipAddress,
      userAgent,
      status,
    });
  } catch (error) {
    console.error("[Audit] Failed to log event:", error);
  }
}

export async function getAuditLogs(userId?: number, limit: number = 100) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  let query: any = db.select().from(auditLogs);
  if (userId) {
    query = query.where(eq(auditLogs.userId, userId));
  }
  return query.orderBy(desc(auditLogs.timestamp)).limit(limit);
}
