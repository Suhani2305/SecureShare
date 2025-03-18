import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User model
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  role: text("role").notNull().default("user"),
  mfaEnabled: boolean("mfa_enabled").notNull().default(false),
  mfaSecret: text("mfa_secret"),
  lastLogin: timestamp("last_login"),
  failedLoginAttempts: integer("failed_login_attempts").notNull().default(0),
  lockoutUntil: timestamp("lockout_until"),
});

// File model
export const files = pgTable("files", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  originalName: text("original_name").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(),
  path: text("path").notNull(),
  encrypted: boolean("encrypted").notNull().default(true),
  ownerId: integer("owner_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// File share model
export const fileShares = pgTable("file_shares", {
  id: serial("id").primaryKey(),
  fileId: integer("file_id").notNull(),
  userId: integer("user_id").notNull(),
  accessLevel: text("access_level").notNull().default("view"), // view, edit
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Activity log model
export const activityLogs = pgTable("activity_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  action: text("action").notNull(), // upload, download, share, delete, etc.
  resourceId: integer("resource_id"), // Usually file_id
  resourceType: text("resource_type").notNull(), // 'file', 'user', etc.
  details: jsonb("details"),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export const insertFileSchema = createInsertSchema(files).omit({ id: true, createdAt: true });
export const insertFileShareSchema = createInsertSchema(fileShares).omit({ id: true, createdAt: true });
export const insertActivityLogSchema = createInsertSchema(activityLogs).omit({ id: true, createdAt: true });

// Login schema
export const loginSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
});

// MFA Schemas
export const setupMfaSchema = z.object({
  userId: z.number(),
});

export const verifyMfaSchema = z.object({
  userId: z.number(),
  token: z.string().min(6).max(6),
});

export const mfaLoginSchema = z.object({
  userId: z.number(),
  token: z.string().min(6).max(6),
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertFile = z.infer<typeof insertFileSchema>;
export type InsertFileShare = z.infer<typeof insertFileShareSchema>;
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type SetupMfaInput = z.infer<typeof setupMfaSchema>;
export type VerifyMfaInput = z.infer<typeof verifyMfaSchema>;
export type MfaLoginInput = z.infer<typeof mfaLoginSchema>;

export type User = typeof users.$inferSelect;
export type File = typeof files.$inferSelect;
export type FileShare = typeof fileShares.$inferSelect;
export type ActivityLog = typeof activityLogs.$inferSelect;
