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
  type InsertActivityLog,
  type StoredFolder,
  type FolderShare,
  type FolderContents
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
  encryptionIV?: string | null;
  encryptionTag?: string | null;
  encryptionSalt?: string | null;
  encryptedKey?: string | null;
  ownerId: number;
  accessControl: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  password: string;
  mfaEnabled: boolean;
  mfaSecret?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TeamMember {
  id: number;
  userId: number;
  accessLevel: 'read' | 'write' | 'admin';
  addedBy: number;
  addedAt: Date;
  updatedAt: Date;
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
    encryptionIV?: string | null;
    encryptionTag?: string | null;
    encryptionSalt?: string | null;
    encryptedKey?: string | null;
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

  // Team member methods
  addTeamMember(params: { userId: number; accessLevel: string; addedBy: number }): Promise<TeamMember>;
  getTeamMember(userId: number): Promise<TeamMember | undefined>;
  getAllTeamMembers(): Promise<TeamMember[]>;
  updateTeamMemberAccess(userId: number, accessLevel: string): Promise<void>;
  removeTeamMember(userId: number): Promise<void>;

  // Folder operations
  getFolder(id: number): Promise<StoredFolder | undefined>;
  getFolderSharesByFolderId(folderId: number): Promise<FolderShare[]>;
  createFolder(params: { name: string; parentId?: number; ownerId: number }): Promise<StoredFolder>;
  getFolderContents(folderId: number): Promise<FolderContents>;
  getFolderBreadcrumbs(folderId: number): Promise<{ id: number; name: string }[]>;
  getRootFolderContents(userId: number): Promise<FolderContents>;
  moveFile(fileId: number, folderId: number | undefined): Promise<void>;

  // Activity logging
  addActivityLog(params: { userId: number; action: string; details: string }): Promise<ActivityLog>;

  // Folder sharing
  shareFolderWithUser(params: { folderId: number; userId: number; accessLevel: string; expiresAt?: Date }): Promise<FolderShare>;

  // Trash operations
  getTrashFiles(): Promise<File[]>;
  restoreFile(id: number): Promise<boolean>;
  permanentlyDeleteFile(id: number): Promise<boolean>;

  // Team operations
  getTeamMembers(): Promise<TeamMember[]>;
  addTeamMember(email: string, role: string): Promise<TeamMember>;
  getTeamFiles(currentPath?: string): Promise<File[]>;
  createTeamFolder(parentPath: string, name: string): Promise<StoredFolder>;
  shareTeamFile(fileId: number, userEmails: string[]): Promise<void>;
  getTeamActivity(): Promise<ActivityLog[]>;

  // Team activity methods
  logActivity(params: {
    userId: number;
    action: string;
    resourceId: string;
    resourceType: string;
    details: any;
    ipAddress: string | null;
  }): Promise<ActivityLog>;

  getTeamActivity(): Promise<ActivityLog[]>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private files: Map<number, File>;
  private fileShares: Map<number, FileShare>;
  private activityLogs: Map<number, ActivityLog>;
  private teamMembers: Map<number, TeamMember>;
  private userIdCounter: number;
  private fileIdCounter: number;
  private fileShareIdCounter: number;
  private activityLogIdCounter: number;
  private teamMemberIdCounter: number;
  private uploadDir: string;
  private folders: Map<number, StoredFolder>;
  private folderShares: Map<number, FolderShare>;
  private folderIdCounter: number;
  private folderShareIdCounter: number;

  constructor() {
    this.users = new Map();
    this.files = new Map();
    this.fileShares = new Map();
    this.activityLogs = new Map();
    this.teamMembers = new Map();
    this.userIdCounter = 1;
    this.fileIdCounter = 1;
    this.fileShareIdCounter = 1;
    this.activityLogIdCounter = 1;
    this.teamMemberIdCounter = 1;
    this.folders = new Map();
    this.folderShares = new Map();
    this.folderIdCounter = 1;
    this.folderShareIdCounter = 1;
    
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
    return Array.from(this.users.values()).find(user => user.username === username);
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
    const userFiles = Array.from(this.files.values()).filter(f => 
      f.ownerId === ownerId && (includeDeleted || !f.isDeleted)
    );
    
    // Add physical file info
    return userFiles.map(file => {
      // Extract just the filename from the full path
      const fileName = path.basename(file.path);
      const filePath = path.join(this.uploadDir, fileName);
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
    encryptionIV?: string | null;
    encryptionTag?: string | null;
    encryptionSalt?: string | null;
    encryptedKey?: string | null;
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
      encryptionIV: params.encryptionIV,
      encryptionTag: params.encryptionTag,
      encryptionSalt: params.encryptionSalt,
      encryptedKey: params.encryptedKey,
      ownerId: params.ownerId,
      accessControl: params.accessControl,
      createdAt: createdAt.toISOString(),
      updatedAt: updatedAt.toISOString()
    };
  }

  async deleteFile(fileId: number): Promise<boolean> {
    try {
      const file = this.files.get(fileId);
      if (!file) {
        return false;
      }

      // Instead of deleting, mark the file as deleted
      file.isDeleted = true;
      file.updatedAt = new Date().toISOString();
      
      // Update the file in the database
      this.files.set(fileId, file);
      
      // Log the deletion
      console.log(`File ${fileId} marked as deleted`);
      
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

  // Team member methods
  async addTeamMember(params: { userId: number; accessLevel: string; addedBy: number }): Promise<TeamMember> {
    const now = new Date();
    const teamMember: TeamMember = {
      id: this.teamMemberIdCounter++,
      userId: params.userId,
      accessLevel: params.accessLevel as 'read' | 'write' | 'admin',
      addedBy: params.addedBy,
      addedAt: now,
      updatedAt: now
    };
    this.teamMembers.set(teamMember.id, teamMember);
    return teamMember;
  }

  async getTeamMember(userId: number): Promise<TeamMember | undefined> {
    return Array.from(this.teamMembers.values()).find(member => member.userId === userId);
  }

  async getAllTeamMembers(): Promise<TeamMember[]> {
    return Array.from(this.teamMembers.values());
  }

  async updateTeamMemberAccess(userId: number, accessLevel: string): Promise<void> {
    const teamMember = await this.getTeamMember(userId);
    if (teamMember) {
      teamMember.accessLevel = accessLevel as 'read' | 'write' | 'admin';
      teamMember.updatedAt = new Date();
      this.teamMembers.set(teamMember.id, teamMember);
    }
  }

  async removeTeamMember(userId: number): Promise<void> {
    const teamMember = await this.getTeamMember(userId);
    if (teamMember) {
      this.teamMembers.delete(teamMember.id);
    }
  }

  // Folder operations
  async getFolder(id: number): Promise<StoredFolder | undefined> {
    return this.folders.get(id);
  }

  async getFolderSharesByFolderId(folderId: number): Promise<FolderShare[]> {
    return Array.from(this.folderShares.values())
      .filter(share => share.folderId === folderId);
  }

  async createFolder(params: { name: string; parentId?: number; ownerId: number }): Promise<StoredFolder> {
    const id = this.folderIdCounter++;
    const now = new Date();
    const folder: StoredFolder = {
      id,
      name: params.name,
      parentId: params.parentId,
      ownerId: params.ownerId,
      createdAt: now,
      updatedAt: now
    };
    this.folders.set(id, folder);
    return folder;
  }

  async getFolderContents(folderId: number): Promise<FolderContents> {
    const folders = Array.from(this.folders.values())
      .filter(folder => folder.parentId === folderId && !folder.deletedAt);
    
    const files = Array.from(this.files.values())
      .filter(file => file.folderId === folderId && !file.isDeleted);

    const breadcrumbs = await this.getFolderBreadcrumbs(folderId);

    return { folders, files, breadcrumbs };
  }

  async getFolderBreadcrumbs(folderId: number): Promise<{ id: number; name: string }[]> {
    const breadcrumbs: { id: number; name: string }[] = [];
    let currentFolder = await this.getFolder(folderId);

    while (currentFolder) {
      breadcrumbs.unshift({ id: currentFolder.id, name: currentFolder.name });
      if (currentFolder.parentId) {
        currentFolder = await this.getFolder(currentFolder.parentId);
      } else {
        break;
      }
    }

    return breadcrumbs;
  }

  async getRootFolderContents(userId: number): Promise<FolderContents> {
    const folders = Array.from(this.folders.values())
      .filter(folder => !folder.parentId && folder.ownerId === userId && !folder.deletedAt);
    
    const files = Array.from(this.files.values())
      .filter(file => !file.folderId && file.ownerId === userId && !file.isDeleted);

    return { folders, files, breadcrumbs: [] };
  }

  async moveFile(fileId: number, folderId: number | undefined): Promise<void> {
    const file = await this.getFile(fileId);
    if (file) {
      file.folderId = folderId;
      file.updatedAt = new Date();
      this.files.set(fileId, file);
    }
  }

  // Activity logging
  async addActivityLog(params: { userId: number; action: string; details: string }): Promise<ActivityLog> {
    const id = this.activityLogIdCounter++;
    const now = new Date();
    const log: ActivityLog = {
      id,
      userId: params.userId,
      action: params.action,
      details: params.details,
      createdAt: now
    };
    this.activityLogs.set(id, log);
    return log;
  }

  // Folder sharing
  async shareFolderWithUser(params: { folderId: number; userId: number; accessLevel: string; expiresAt?: Date }): Promise<FolderShare> {
    const id = this.folderShareIdCounter++;
    const now = new Date();
    const share: FolderShare = {
      id,
      folderId: params.folderId,
      userId: params.userId,
      accessLevel: params.accessLevel as "view" | "edit",
      createdAt: now,
      updatedAt: now
    };
    this.folderShares.set(id, share);
    return share;
  }

  // Trash operations
  async getTrashFiles(): Promise<File[]> {
    try {
      // Get all files marked as deleted
      const trashedFiles = Array.from(this.files.values())
        .filter(file => file.isDeleted)
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      
      // Add physical file info
      return trashedFiles.map(file => {
        // Extract just the filename from the full path
        const fileName = path.basename(file.path);
        const filePath = path.join(this.uploadDir, fileName);
        const stats = fs.statSync(filePath);
        return {
          ...file,
          size: stats.size
        };
      });
    } catch (error) {
      console.error("Error getting trash files:", error);
      return [];
    }
  }

  async restoreFile(fileId: number): Promise<boolean> {
    try {
      const file = this.files.get(fileId);
      if (!file || !file.isDeleted) {
        return false;
      }

      // Restore the file by marking it as not deleted
      file.isDeleted = false;
      file.updatedAt = new Date().toISOString();
      
      // Update the file in the database
      this.files.set(fileId, file);
      
      // Log the restoration
      console.log(`File ${fileId} restored from trash`);
      
      return true;
    } catch (error) {
      console.error("Error restoring file:", error);
      return false;
    }
  }

  async permanentlyDeleteFile(fileId: number): Promise<boolean> {
    try {
      const file = this.files.get(fileId);
      if (!file) {
        return false;
      }

      // Delete the physical file
      const filePath = path.join(this.uploadDir, file.path);
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
      }

      // Remove from internal maps
      this.files.delete(fileId);
      
      // Remove any shares associated with this file
      for (const [shareId, share] of this.fileShares.entries()) {
        if (share.fileId === fileId) {
          this.fileShares.delete(shareId);
        }
      }
      
      // Log the permanent deletion
      console.log(`File ${fileId} permanently deleted`);
      
      return true;
    } catch (error) {
      console.error("Error permanently deleting file:", error);
      return false;
    }
  }

  // Team operations
  async getTeamMembers(): Promise<TeamMember[]> {
    return Array.from(this.teamMembers.values());
  }

  async addTeamMember(email: string, role: string): Promise<TeamMember> {
    try {
      // First check if user exists
      const user = await this.getUserByEmail(email);
      if (!user) {
        throw new Error('User not found');
      }

      // Check if user is already a team member
      const existingMember = await this.getTeamMember(user.id);
      if (existingMember) {
        throw new Error('User is already a team member');
      }

      const id = this.teamMemberIdCounter++;
      const teamMember: TeamMember = {
        id,
        userId: user.id,
        accessLevel: role as 'read' | 'write' | 'admin',
        addedBy: user.id, // This should be the current user's ID
        addedAt: new Date(),
        updatedAt: new Date()
      };

      this.teamMembers.set(id, teamMember);
      return teamMember;
    } catch (error) {
      console.error('Error adding team member:', error);
      throw error;
    }
  }

  async getTeamFiles(currentPath?: string): Promise<File[]> {
    try {
      // Get all files
      const allFiles = Array.from(this.files.values());
      
      // Filter files based on path and deleted status
      const teamFiles = allFiles.filter(file => {
        if (file.isDeleted) return false;
        
        // For root path, return files without a folder
        if (currentPath === '/') {
          return !file.folderId;
        }
        
        // For other paths, return files in the specified folder
        const folder = this.folders.get(parseInt(currentPath));
        return folder && file.folderId === folder.id;
      });

      // Add additional file information
      return teamFiles.map(file => ({
        ...file,
        size: fs.statSync(path.join(this.uploadDir, file.path)).size,
        type: this.getMimeType(file.name)
      }));
    } catch (error) {
      console.error('Error getting team files:', error);
      throw error;
    }
  }

  private getMimeType(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes: { [key: string]: string } = {
      '.txt': 'text/plain',
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif'
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }

  async createTeamFolder(parentPath: string, name: string): Promise<StoredFolder> {
    try {
      // Validate folder name
      if (!name || name.trim().length === 0) {
        throw new Error('Folder name cannot be empty');
      }

      // Get parent folder if path is not root
      let parentId: number | undefined;
      if (parentPath !== '/') {
        const parent = this.folders.get(parseInt(parentPath));
        if (!parent) {
          throw new Error('Parent folder not found');
        }
        parentId = parent.id;
      }

      // Create the folder
      const id = this.folderIdCounter++;
      const now = new Date();
      const folder: StoredFolder = {
        id,
        name: name.trim(),
        parentId,
        createdAt: now,
        updatedAt: now,
        deletedAt: null
      };

      this.folders.set(id, folder);
      return folder;
    } catch (error) {
      console.error('Error creating team folder:', error);
      throw error;
    }
  }

  async shareTeamFile(fileId: number, userEmails: string[]): Promise<void> {
    try {
      // Get the file
      const file = await this.getFile(fileId);
      if (!file) {
        throw new Error('File not found');
      }

      // Get users by email
      const users = await Promise.all(
        userEmails.map(async email => {
          const user = await this.getUserByEmail(email);
          if (!user) {
            throw new Error(`User not found: ${email}`);
          }
          return user;
        })
      );

      // Create file shares
      await Promise.all(
        users.map(async user => {
          const id = this.fileShareIdCounter++;
          const share: FileShare = {
            id,
            fileId,
            userId: user.id,
            accessLevel: 'read',
            createdAt: new Date(),
            updatedAt: new Date()
          };
          this.fileShares.set(id, share);
        })
      );
    } catch (error) {
      console.error('Error sharing team file:', error);
      throw error;
    }
  }

  async getTeamActivity(): Promise<ActivityLog[]> {
    return Array.from(this.activityLogs.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 50); // Return last 50 activities
  }

  // Team activity methods
  async logActivity(params: {
    userId: number;
    action: string;
    resourceId: string;
    resourceType: string;
    details: any;
    ipAddress: string | null;
  }): Promise<ActivityLog> {
    const id = this.activityLogIdCounter++;
    const now = new Date();
    const log: ActivityLog = {
      id,
      userId: params.userId,
      action: params.action,
      resourceId: params.resourceId,
      resourceType: params.resourceType,
      details: params.details,
      ipAddress: params.ipAddress,
      createdAt: now
    };
    this.activityLogs.set(id, log);
    return log;
  }
}

export const storage = new MemStorage();
