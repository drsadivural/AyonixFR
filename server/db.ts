import { eq, desc, and, gte, lte, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, users, 
  enrollees, InsertEnrollee, Enrollee,
  recognitionLogs, InsertRecognitionLog, RecognitionLog,
  events, InsertEvent, Event,
  settings, InsertSettings, Settings,
  // auditLogs, InsertAuditLog, // Temporarily commented
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

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

// ============= USER OPERATIONS =============

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

export async function updateUserProfile(userId: number, data: { name?: string; email?: string | null; profileCompleted?: boolean }) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  await db.update(users).set(data).where(eq(users.id, userId));
}

// Audit Logs (temporarily disabled due to module caching issue)
export async function createAuditLog(log: any): Promise<void> {
  return; // Temporarily disabled
}

export async function getAuditLogs(limit: number = 100): Promise<any[]> {
  return []; // Temporarily disabled
}

export async function getAuditLogsByOperation(operation: string, limit: number = 100): Promise<any[]> {
  return []; // Temporarily disabled
}

export async function getAuditLogsByEnrollee(enrolleeId: number, limit: number = 100): Promise<any[]> {
  return []; // Temporarily disabled
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

// ============= ENROLLEE OPERATIONS =============

export async function createEnrollee(enrollee: InsertEnrollee): Promise<Enrollee> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(enrollees).values(enrollee);
  const insertedId = Number(result[0].insertId);
  
  const inserted = await db.select().from(enrollees).where(eq(enrollees.id, insertedId)).limit(1);
  if (!inserted[0]) throw new Error("Failed to retrieve inserted enrollee");
  
  return inserted[0];
}

export async function getAllEnrollees(): Promise<Enrollee[]> {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(enrollees).orderBy(desc(enrollees.createdAt));
}

export async function getEnrolleeById(id: number): Promise<Enrollee | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(enrollees).where(eq(enrollees.id, id)).limit(1);
  return result[0];
}

export async function updateEnrollee(id: number, data: Partial<InsertEnrollee>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(enrollees).set(data).where(eq(enrollees.id, id));
}

export async function deleteEnrollee(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(enrollees).where(eq(enrollees.id, id));
}

export async function searchEnrollees(query: string): Promise<Enrollee[]> {
  const db = await getDb();
  if (!db) return [];
  
  const searchPattern = `%${query}%`;
  return await db.select().from(enrollees)
    .where(
      sql`${enrollees.name} LIKE ${searchPattern} OR ${enrollees.surname} LIKE ${searchPattern} OR ${enrollees.email} LIKE ${searchPattern}`
    )
    .orderBy(desc(enrollees.createdAt));
}

// ============= RECOGNITION LOG OPERATIONS =============

export async function createRecognitionLog(log: InsertRecognitionLog): Promise<RecognitionLog> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(recognitionLogs).values(log);
  const insertedId = Number(result[0].insertId);
  
  const inserted = await db.select().from(recognitionLogs).where(eq(recognitionLogs.id, insertedId)).limit(1);
  if (!inserted[0]) throw new Error("Failed to retrieve inserted log");
  
  return inserted[0];
}

export async function getRecognitionLogs(filters?: {
  enrolleeId?: number;
  matched?: boolean;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}): Promise<RecognitionLog[]> {
  const db = await getDb();
  if (!db) return [];
  
  let query = db.select().from(recognitionLogs);
  
  const conditions = [];
  if (filters?.enrolleeId) conditions.push(eq(recognitionLogs.enrolleeId, filters.enrolleeId));
  if (filters?.matched !== undefined) conditions.push(eq(recognitionLogs.matched, filters.matched));
  if (filters?.startDate) conditions.push(gte(recognitionLogs.createdAt, filters.startDate));
  if (filters?.endDate) conditions.push(lte(recognitionLogs.createdAt, filters.endDate));
  
  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }
  
  query = query.orderBy(desc(recognitionLogs.createdAt)) as any;
  
  if (filters?.limit) {
    query = query.limit(filters.limit) as any;
  }
  
  return await query;
}

export async function getRecognitionLogById(id: number): Promise<RecognitionLog | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(recognitionLogs).where(eq(recognitionLogs.id, id)).limit(1);
  return result[0];
}

// ============= EVENT OPERATIONS =============

export async function createEvent(event: InsertEvent): Promise<Event> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(events).values(event);
  const insertedId = Number(result[0].insertId);
  
  const inserted = await db.select().from(events).where(eq(events.id, insertedId)).limit(1);
  if (!inserted[0]) throw new Error("Failed to retrieve inserted event");
  
  return inserted[0];
}

export async function getEvents(filters?: {
  eventType?: "enrollment" | "match" | "no_match" | "system";
  enrolleeId?: number;
  userId?: number;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}): Promise<Event[]> {
  const db = await getDb();
  if (!db) return [];
  
  let query = db.select().from(events);
  
  const conditions = [];
  if (filters?.eventType) conditions.push(eq(events.eventType, filters.eventType));
  if (filters?.enrolleeId) conditions.push(eq(events.enrolleeId, filters.enrolleeId));
  if (filters?.userId) conditions.push(eq(events.userId, filters.userId));
  if (filters?.startDate) conditions.push(gte(events.createdAt, filters.startDate));
  if (filters?.endDate) conditions.push(lte(events.createdAt, filters.endDate));
  
  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }
  
  query = query.orderBy(desc(events.createdAt)) as any;
  
  if (filters?.limit) {
    query = query.limit(filters.limit) as any;
  }
  
  return await query;
}

// ============= SETTINGS OPERATIONS =============

export async function getUserSettings(userId: number): Promise<Settings | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(settings).where(eq(settings.userId, userId)).limit(1);
  return result[0];
}

export async function upsertSettings(userId: number, data: Partial<InsertSettings>): Promise<Settings> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const existing = await getUserSettings(userId);
  
  if (existing) {
    await db.update(settings).set(data).where(eq(settings.userId, userId));
    const updated = await getUserSettings(userId);
    if (!updated) throw new Error("Failed to retrieve updated settings");
    return updated;
  } else {
    const insertData: InsertSettings = { userId, ...data };
    await db.insert(settings).values(insertData);
    const created = await getUserSettings(userId);
    if (!created) throw new Error("Failed to retrieve created settings");
    return created;
  }
}

// ============= ANALYTICS =============

export async function getEnrolleeStats() {
  const db = await getDb();
  if (!db) return { total: 0, thisMonth: 0, thisWeek: 0 };
  
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  
  const [total] = await db.select({ count: sql<number>`count(*)` }).from(enrollees);
  const [thisMonth] = await db.select({ count: sql<number>`count(*)` })
    .from(enrollees)
    .where(gte(enrollees.createdAt, startOfMonth));
  const [thisWeek] = await db.select({ count: sql<number>`count(*)` })
    .from(enrollees)
    .where(gte(enrollees.createdAt, startOfWeek));
  
  return {
    total: Number(total?.count || 0),
    thisMonth: Number(thisMonth?.count || 0),
    thisWeek: Number(thisWeek?.count || 0),
  };
}

export async function getVerificationStats() {
  const db = await getDb();
  if (!db) return { total: 0, matches: 0, noMatches: 0, successRate: 0 };
  
  const [total] = await db.select({ count: sql<number>`count(*)` }).from(recognitionLogs);
  const [matches] = await db.select({ count: sql<number>`count(*)` })
    .from(recognitionLogs)
    .where(eq(recognitionLogs.matched, true));
  
  const totalCount = Number(total?.count || 0);
  const matchCount = Number(matches?.count || 0);
  const noMatchCount = totalCount - matchCount;
  const successRate = totalCount > 0 ? Math.round((matchCount / totalCount) * 100) : 0;
  
  return {
    total: totalCount,
    matches: matchCount,
    noMatches: noMatchCount,
    successRate,
  };
}
