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
  securityQuestion: text("security_question"),
  securityAnswer: text("security_answer"),
  passwordResetToken: text("password_reset_token"),
  passwordResetExpires: timestamp("password_reset_expires"),
});

// Folder model
export const folders = pgTable("folders", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  parentId: integer("parent_id"),
  ownerId: integer("owner_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  deletedAt: timestamp("deleted_at"),
});

// File model
export const files = pgTable("files", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  originalName: text("original_name").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(),
  path: text("path").notNull(),
  folderId: integer("folder_id"),
  encrypted: boolean("encrypted").notNull().default(true),
  encryptionIV: text("encryption_iv"),
  encryptionTag: text("encryption_tag"),
  encryptionSalt: text("encryption_salt"),
  encryptedKey: text("encrypted_key"),
  ownerId: integer("owner_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  deletedAt: timestamp("deleted_at"),
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

// Add folder share model
export const folderShares = pgTable("folder_shares", {
  id: serial("id").primaryKey(),
  folderId: integer("folder_id").notNull(),
  userId: integer("user_id").notNull(),
  accessLevel: text("access_level").notNull().default("view"), // view, edit
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export const insertFileSchema = createInsertSchema(files).omit({ id: true, createdAt: true });
export const insertFileShareSchema = createInsertSchema(fileShares).omit({ id: true, createdAt: true });
export const insertActivityLogSchema = createInsertSchema(activityLogs).omit({ id: true, createdAt: true });
export const insertFolderSchema = createInsertSchema(folders).omit({ id: true, createdAt: true });
export const insertFolderShareSchema = createInsertSchema(folderShares).omit({ id: true, createdAt: true });

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

// Password reset schemas
export const forgotPasswordSchema = z.object({
  username: z.string().min(3),
  email: z.string().email(),
});

export const verifySecurityAnswerSchema = z.object({
  username: z.string().min(3),
  answer: z.string().min(1),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(6),
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertFile = z.infer<typeof insertFileSchema>;
export type InsertFileShare = z.infer<typeof insertFileShareSchema>;
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
export type InsertFolder = z.infer<typeof insertFolderSchema>;
export type InsertFolderShare = z.infer<typeof insertFolderShareSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type SetupMfaInput = z.infer<typeof setupMfaSchema>;
export type VerifyMfaInput = z.infer<typeof verifyMfaSchema>;
export type MfaLoginInput = z.infer<typeof mfaLoginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type VerifySecurityAnswerInput = z.infer<typeof verifySecurityAnswerSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export type User = typeof users.$inferSelect;
export type File = typeof files.$inferSelect;
export type FileShare = typeof fileShares.$inferSelect;
export type ActivityLog = typeof activityLogs.$inferSelect;
export type Folder = typeof folders.$inferSelect;
export type FolderShare = typeof folderShares.$inferSelect;

export const teamMemberSchema = z.object({
  userId: z.number(),
  accessLevel: z.enum(["read", "write", "admin"]),
  addedBy: z.number()
});

export const teamMemberResponseSchema = z.object({
  id: z.number(),
  userId: z.number(),
  accessLevel: z.enum(["read", "write", "admin"]),
  addedBy: z.number(),
  addedAt: z.date(),
  updatedAt: z.date(),
  username: z.string().optional(),
  email: z.string().optional()
});

export type TeamMember = z.infer<typeof teamMemberResponseSchema>;
export type InsertTeamMember = z.infer<typeof teamMemberSchema>;
