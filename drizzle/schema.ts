import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, boolean, json } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["admin", "operator", "viewer"]).default("viewer").notNull(),
  profileCompleted: boolean("profileCompleted").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Enrollees table - stores registered people with face embeddings
 */
export const enrollees = mysqlTable("enrollees", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  surname: varchar("surname", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 50 }),
  address: text("address"),
  instagram: varchar("instagram", { length: 255 }),
  faceImageUrl: text("faceImageUrl").notNull(),
  faceImageKey: text("faceImageKey").notNull(),
  thumbnailUrl: text("thumbnailUrl").notNull(),
  faceEmbedding: json("faceEmbedding").notNull(), // Store face embedding as JSON array
  enrollmentMethod: varchar("enrollmentMethod", { length: 50 }).notNull(), // 'camera', 'photo', 'mobile'
  enrolledBy: int("enrolledBy").notNull(), // user.id who enrolled this person
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Enrollee = typeof enrollees.$inferSelect;
export type InsertEnrollee = typeof enrollees.$inferInsert;

/**
 * Recognition logs table - stores verification attempts and matches
 */
export const recognitionLogs = mysqlTable("recognition_logs", {
  id: int("id").autoincrement().primaryKey(),
  enrolleeId: int("enrolleeId"), // null if no match found
  matchConfidence: int("matchConfidence"), // 0-100, null if no match
  snapshotUrl: text("snapshotUrl").notNull(),
  snapshotKey: text("snapshotKey").notNull(),
  cameraSource: varchar("cameraSource", { length: 255 }).notNull(),
  detectedFaces: int("detectedFaces").notNull().default(0),
  matched: boolean("matched").notNull().default(false),
  verifiedBy: int("verifiedBy").notNull(), // user.id who performed verification
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type RecognitionLog = typeof recognitionLogs.$inferSelect;
export type InsertRecognitionLog = typeof recognitionLogs.$inferInsert;

/**
 * Events table - stores system activity (enrollments, verifications, etc.)
 */
export const events = mysqlTable("events", {
  id: int("id").autoincrement().primaryKey(),
  eventType: mysqlEnum("eventType", ["enrollment", "match", "no_match", "system"]).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  enrolleeId: int("enrolleeId"), // null for system events
  recognitionLogId: int("recognitionLogId"), // null for enrollment events
  imageUrl: text("imageUrl"),
  cameraSource: varchar("cameraSource", { length: 255 }),
  userId: int("userId").notNull(), // user.id who triggered the event
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Event = typeof events.$inferSelect;
export type InsertEvent = typeof events.$inferInsert;

export const auditLogs = mysqlTable("audit_logs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  operation: varchar("operation", { length: 64 }).notNull(), // 'enrollment', 'verification', 'detection', 'deletion'
  enrolleeId: int("enrolleeId"),
  enrolleeName: varchar("enrolleeName", { length: 255 }),
  result: varchar("result", { length: 32 }), // 'success', 'failure', 'match', 'no_match'
  confidence: decimal("confidence", { precision: 5, scale: 4 }),
  details: text("details"), // JSON string with additional data
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: text("userAgent"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;

/**
 * Settings table - stores system configuration
 */
export const settings = mysqlTable("settings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(), // one settings record per user
  
  // LLM Settings
  llmProvider: varchar("llmProvider", { length: 50 }).default("openai"),
  llmApiKey: text("llmApiKey"),
  llmModel: varchar("llmModel", { length: 100 }),
  llmTemperature: int("llmTemperature").default(70), // 0-100, divide by 100 for actual value
  llmMaxTokens: int("llmMaxTokens").default(2000),
  llmSystemPrompt: text("llmSystemPrompt"),
  
  // Voice Settings
  voiceLanguage: varchar("voiceLanguage", { length: 10 }).default("en"), // 'en' or 'ja'
  voiceEngine: varchar("voiceEngine", { length: 50 }).default("whisper"),
  voiceApiKey: text("voiceApiKey"),
  voiceInputSensitivity: int("voiceInputSensitivity").default(50), // 0-100
  voiceOutputSpeed: int("voiceOutputSpeed").default(100), // 50-200
  voiceOutputStyle: varchar("voiceOutputStyle", { length: 50 }).default("conversational"),
  
  // Face Recognition Settings
  matchThreshold: int("matchThreshold").default(75), // 0-100, divide by 100 for actual value
  minFaceSize: int("minFaceSize").default(80), // pixels
  faceTrackingSmoothing: int("faceTrackingSmoothing").default(50), // 0-100
  multiFaceMatch: boolean("multiFaceMatch").default(true),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Settings = typeof settings.$inferSelect;
export type InsertSettings = typeof settings.$inferInsert;
