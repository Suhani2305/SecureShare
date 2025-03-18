import * as fs from "fs";
import * as path from "path";
import { 
  users, 
  files, 
  fileShares, 
  activityLogs, 
  type User, 
  type InsertUser, 
  type File, 
  type InsertFile, 
  type FileShare, 
  type InsertFileShare, 
  type ActivityLog, 
  type InsertActivityLog 
} from "@shared/schema";
import crypto from "crypto";
import { encryptionService } from "./encryption";
import { eq, and, desc } from "drizzle-orm";

interface CreateFileParams {
  name: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
  encrypted: boolean;
  encryptionKey?: string | null;
  ownerId: number;
  accessControl: string;
}

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserMfaSecret(userId: number, secret: string | null): Promise<boolean>;
  updateUserMfaEnabled(userId: number, enabled: boolean): Promise<boolean>;
  updateUserLastLogin(userId: number): Promise<boolean>;
  incrementFailedLoginAttempts(userId: number): Promise<number>;
  resetFailedLoginAttempts(userId: number): Promise<boolean>;
  setUserLockout(userId: number, until: Date): Promise<boolean>;
  getAllUsers(): Promise<User[]>;
  
  // File operations
  getFile(id: number): Promise<File | undefined>;
  getFilesByOwnerId(ownerId: number): Promise<File[]>;
  createFile(params: CreateFileParams): Promise<{
    id: number;
    name: string;
    originalName: string;
    mimeType: string;
    size: number;
    path: string;
    encrypted: boolean;
    encryptionKey?: string | null;
    ownerId: number;
    accessControl: string;
    createdAt: string;
    updatedAt: string;
  }>;
  deleteFile(id: number): Promise<boolean>;
  encryptFile(fileBuffer: Buffer): Promise<{ encryptedData: Buffer, iv: string }>;
  decryptFile(encryptedData: Buffer, iv: string): Promise<Buffer>;
  
  // File sharing operations
  shareFile(fileShare: InsertFileShare): Promise<FileShare>;
  getFileSharesByFileId(fileId: number): Promise<FileShare[]>;
  getSharedFilesByUserId(userId: number): Promise<{ file: File, share: FileShare }[]>;
  removeFileShare(fileId: number, userId: number): Promise<boolean>;
  
  // Activity logging
  logActivity(log: InsertActivityLog): Promise<ActivityLog>;
  getActivityLogsByUserId(userId: number): Promise<ActivityLog[]>;
  getAllActivityLogs(): Promise<ActivityLog[]>;

  // Move file to trash
  moveFileToTrash(fileId: number): Promise<void>;

  // Restore file from trash
  restoreFileFromTrash(fileId: number): Promise<void>;

  // Get files by owner ID with trash filter
  getFilesByOwnerId(ownerId: number, includeDeleted: boolean): Promise<File[]>;

  // Get file shares by user ID
  getFileSharesByUserId(userId: number): Promise<FileShare[]>;

  // Get user by ID
  getUserById(id: number): Promise<User | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private files: Map<number, File>;
  private fileShares: Map<number, FileShare>;
  private activityLogs: Map<number, ActivityLog>;
  private userIdCounter: number;
  private fileIdCounter: number;
  private fileShareIdCounter: number;
  private activityLogIdCounter: number;
  private uploadDir: string;

  constructor() {
    this.users = new Map();
    this.files = new Map();
    this.fileShares = new Map();
    this.activityLogs = new Map();
    this.userIdCounter = 1;
    this.fileIdCounter = 1;
    this.fileShareIdCounter = 1;
    this.activityLogIdCounter = 1;
    
    // Create upload directory if it doesn't exist
    this.uploadDir = path.resolve(process.cwd(), "uploads");
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const user: User = { 
      ...insertUser, 
      id,
      role: insertUser.role || "user",
      mfaEnabled: insertUser.mfaEnabled || false,
      mfaSecret: insertUser.mfaSecret || null,
      lastLogin: insertUser.lastLogin || null,
      failedLoginAttempts: insertUser.failedLoginAttempts || 0,
      lockoutUntil: insertUser.lockoutUntil || null
    };
    this.users.set(id, user);
    return user;
  }

  async updateUserMfaSecret(userId: number, secret: string | null): Promise<boolean> {
    const user = await this.getUser(userId);
    if (!user) return false;
    
    user.mfaSecret = secret;
    this.users.set(userId, user);
    return true;
  }

  async updateUserMfaEnabled(userId: number, enabled: boolean): Promise<boolean> {
    const user = await this.getUser(userId);
    if (!user) return false;
    
    user.mfaEnabled = enabled;
    this.users.set(userId, user);
    return true;
  }

  async updateUserLastLogin(userId: number): Promise<boolean> {
    const user = await this.getUser(userId);
    if (!user) return false;
    
    user.lastLogin = new Date();
    this.users.set(userId, user);
    return true;
  }

  async incrementFailedLoginAttempts(userId: number): Promise<number> {
    const user = await this.getUser(userId);
    if (!user) return 0;
    
    user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
    this.users.set(userId, user);
    return user.failedLoginAttempts;
  }

  async resetFailedLoginAttempts(userId: number): Promise<boolean> {
    const user = await this.getUser(userId);
    if (!user) return false;
    
    user.failedLoginAttempts = 0;
    user.lockoutUntil = null;
    this.users.set(userId, user);
    return true;
  }

  async setUserLockout(userId: number, until: Date): Promise<boolean> {
    const user = await this.getUser(userId);
    if (!user) return false;
    
    user.lockoutUntil = until;
    this.users.set(userId, user);
    return true;
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  // File operations
  async getFile(id: number): Promise<File | undefined> {
    return this.files.get(id);
  }

  async getFilesByOwnerId(ownerId: number, includeDeleted: boolean = false): Promise<File[]> {
    console.log("Getting files for owner:", {
      ownerId,
      includeDeleted,
      totalFiles: this.files.size,
      allFiles: Array.from(this.files.values()).map(f => ({
        id: f.id,
        name: f.name,
        ownerId: f.ownerId,
        isDeleted: f.isDeleted
      }))
    });

    const userFiles = Array.from(this.files.values())
      .filter((file) => {
        const matches = file.ownerId === ownerId && file.isDeleted === includeDeleted;
        console.log("Checking file:", {
          fileId: file.id,
          fileOwnerId: file.ownerId,
          fileIsDeleted: file.isDeleted,
          matches,
          fileDetails: {
            id: file.id,
            name: file.name,
            ownerId: file.ownerId,
            isDeleted: file.isDeleted
          }
        });
        return matches;
      })
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    
    console.log("Found user files:", {
      count: userFiles.length,
      files: userFiles.map(f => ({
        id: f.id,
        name: f.name,
        ownerId: f.ownerId,
        isDeleted: f.isDeleted
      }))
    });
    
    // Add physical file info
    return userFiles.map(file => {
      const filePath = path.join(this.uploadDir, file.path);
      const stats = fs.statSync(filePath);
      console.log("Physical file info:", {
        fileId: file.id,
        path: filePath,
        exists: fs.existsSync(filePath),
        size: stats.size
      });
      return {
        ...file,
        size: stats.size
      };
    });
  }

  async createFile(params: CreateFileParams): Promise<{
    id: number;
    name: string;
    originalName: string;
    mimeType: string;
    size: number;
    path: string;
    encrypted: boolean;
    encryptionKey?: string | null;
    ownerId: number;
    accessControl: string;
    createdAt: string;
    updatedAt: string;
  }> {
    console.log("Creating file:", {
      originalName: params.originalName,
      ownerId: params.ownerId,
      path: params.path
    });

    const id = this.fileIdCounter++;
    const createdAt = new Date();
    const updatedAt = createdAt;
    const file: File = { 
      ...params, 
      id, 
      createdAt,
      updatedAt,
      encrypted: params.encrypted ?? true,
      isDeleted: false
    };
    this.files.set(id, file);

    console.log("File created in storage:", {
      fileId: id,
      totalFiles: this.files.size,
      fileDetails: {
        id: file.id,
        name: file.name,
        ownerId: file.ownerId,
        isDeleted: file.isDeleted
      }
    });

    // Verify file exists in storage
    const storedFile = this.files.get(id);
    console.log("Verifying stored file:", {
      exists: !!storedFile,
      fileId: id,
      storedFileDetails: storedFile ? {
        id: storedFile.id,
        name: storedFile.name,
        ownerId: storedFile.ownerId,
        isDeleted: storedFile.isDeleted
      } : null
    });

    return {
      id,
      name: params.name,
      originalName: params.originalName,
      mimeType: params.mimeType,
      size: params.size,
      path: params.path,
      encrypted: params.encrypted ?? true,
      encryptionKey: params.encryptionKey,
      ownerId: params.ownerId,
      accessControl: params.accessControl,
      createdAt: createdAt.toISOString(),
      updatedAt: updatedAt.toISOString()
    };
  }

  async deleteFile(id: number): Promise<boolean> {
    const file = await this.getFile(id);
    if (!file) return false;
    
    try {
      // Delete the physical file
      const filePath = path.join(this.uploadDir, file.path);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      
      // Remove from maps
      this.files.delete(id);
      
      // Delete associated file shares
      const sharesToDelete = Array.from(this.fileShares.values())
        .filter(share => share.fileId === id);
      
      for (const share of sharesToDelete) {
        this.fileShares.delete(share.id);
      }
      
      return true;
    } catch (error) {
      console.error("Error deleting file:", error);
      return false;
    }
  }

  async encryptFile(fileBuffer: Buffer): Promise<{ encryptedData: Buffer, iv: string }> {
    const iv = crypto.randomBytes(16); // Using standard IV length for AES
    const key = crypto.scryptSync(process.env.ENCRYPTION_KEY || 'default-key', 'salt', 32);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(fileBuffer), cipher.final()]);
    return {
      encryptedData: encrypted,
      iv: iv.toString('hex')
    };
  }

  async decryptFile(encryptedData: Buffer, iv: string): Promise<Buffer> {
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm', 
      crypto.scryptSync(process.env.ENCRYPTION_KEY || 'default-key', 'salt', 32), 
      Buffer.from(iv, 'hex')
    );
    return Buffer.concat([decipher.update(encryptedData), decipher.final()]);
  }

  // File sharing operations
  async shareFile(insertFileShare: InsertFileShare): Promise<FileShare> {
    const id = this.fileShareIdCounter++;
    const createdAt = new Date();
    const fileShare: FileShare = { 
      ...insertFileShare, 
      id, 
      createdAt,
      accessLevel: insertFileShare.accessLevel || "view",
      expiresAt: insertFileShare.expiresAt || null
    };
    this.fileShares.set(id, fileShare);
    return fileShare;
  }

  async getFileSharesByFileId(fileId: number): Promise<FileShare[]> {
    return Array.from(this.fileShares.values()).filter(
      (share) => share.fileId === fileId
    );
  }

  async getSharedFilesByUserId(userId: number): Promise<{ file: File, share: FileShare }[]> {
    console.log("Getting shared files for user:", userId);
    
    const shares = Array.from(this.fileShares.values())
      .filter((share) => {
        // Check if share is expired
        const isExpired = share.expiresAt && new Date(share.expiresAt) < new Date();
        return share.userId === userId && !isExpired;
      });
    
    console.log("Found valid shares:", shares.length);
    
    const result: { file: File, share: FileShare }[] = [];
    
    for (const share of shares) {
      const file = await this.getFile(share.fileId);
      if (file && !file.isDeleted) {
        console.log("Found shared file:", {
          fileId: file.id,
          fileName: file.name,
          shareId: share.id,
          accessLevel: share.accessLevel,
          expiresAt: share.expiresAt
        });
        result.push({ file, share });
      }
    }
    
    console.log("Total shared files found:", result.length);
    return result;
  }

  async removeFileShare(fileId: number, userId: number): Promise<boolean> {
    const share = Array.from(this.fileShares.values()).find(
      (s) => s.fileId === fileId && s.userId === userId
    );
    
    if (!share) return false;
    
    this.fileShares.delete(share.id);
    return true;
  }

  // Activity logging
  async logActivity(insertLog: InsertActivityLog): Promise<ActivityLog> {
    const id = this.activityLogIdCounter++;
    const createdAt = new Date();
    const log: ActivityLog = { 
      ...insertLog, 
      id, 
      createdAt,
      userId: insertLog.userId || null,
      resourceId: insertLog.resourceId || null,
      details: insertLog.details || {},
      ipAddress: insertLog.ipAddress || null
    };
    this.activityLogs.set(id, log);
    return log;
  }

  async getActivityLogsByUserId(userId: number): Promise<ActivityLog[]> {
    return Array.from(this.activityLogs.values())
      .filter((log) => log.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getAllActivityLogs(): Promise<ActivityLog[]> {
    return Array.from(this.activityLogs.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  // Move file to trash
  async moveFileToTrash(fileId: number): Promise<void> {
    const file = await this.getFile(fileId);
    if (file) {
      file.isDeleted = true;
      file.updatedAt = new Date();
      this.files.set(fileId, file);
    }
  }

  // Restore file from trash
  async restoreFileFromTrash(fileId: number): Promise<void> {
    const file = await this.getFile(fileId);
    if (file) {
      file.isDeleted = false;
      file.updatedAt = new Date();
      this.files.set(fileId, file);
    }
  }

  // Get file shares by user ID
  async getFileSharesByUserId(userId: number): Promise<FileShare[]> {
    return Array.from(this.fileShares.values())
      .filter((share) => share.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getUserById(id: number): Promise<User | undefined> {
    return this.getUser(id);
  }
}

export const storage = new MemStorage();
