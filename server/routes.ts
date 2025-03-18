import express, { Request, Response, NextFunction, Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { MfaService } from "./mfa";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import multer from "multer";
import crypto from "crypto";
import {
  insertUserSchema,
  insertFileSchema,
  insertFileShareSchema,
  insertActivityLogSchema,
  loginSchema,
  setupMfaSchema,
  verifyMfaSchema,
  mfaLoginSchema,
} from "@shared/schema";
import { SecurityUtils } from './security'; // Added import

const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOAD_DIR = path.join(__dirname, "..", "uploads");

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Configure multer for file uploads
const storage_config = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ 
  storage: storage_config,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  }
});

// Authentication middleware
const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number, username: string, role: string };
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

// Role-based access control middleware
const authorize = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    next();
  };
};

// Helper to log activities
const logActivity = async (
  userId: number | undefined,
  action: string,
  resourceId: number | undefined,
  resourceType: string,
  details: any = {},
  ipAddress: string | undefined
) => {
  try {
    await storage.logActivity({
      userId,
      action,
      resourceId,
      resourceType,
      details,
      ipAddress,
    });
  } catch (error) {
    console.error("Error logging activity:", error);
  }
};

// Extend the Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        username: string;
        role: string;
      };
    }
  }
}

// Helper function to check file access
async function checkFileAccess(fileId: number, userId: number, requiredAccess: "view" | "edit" = "view"): Promise<{ hasAccess: boolean; file: File | undefined; share: FileShare | undefined }> {
  const file = await storage.getFile(fileId);
  if (!file) {
    return { hasAccess: false, file: undefined, share: undefined };
  }

  // Owner has full access
  if (file.ownerId === userId) {
    return { hasAccess: true, file, share: undefined };
  }

  // Check shared access
  const shares = await storage.getFileSharesByFileId(fileId);
  const share = shares.find(s => s.userId === userId);
  
  if (!share) {
    return { hasAccess: false, file, share: undefined };
  }

  // Check access level
  if (requiredAccess === "edit" && share.accessLevel !== "edit") {
    return { hasAccess: false, file, share };
  }

  return { hasAccess: true, file, share };
}

export async function registerRoutes(app: Express): Promise<Server> {

  const apiRouter = express.Router();

  /**
   * Authentication Routes
   */
  // Register
  apiRouter.post("/auth/register", async (req, res) => {
    try {
      const validatedData = insertUserSchema.parse(req.body);

      // Check if user already exists
      const existingUser = await storage.getUserByUsername(validatedData.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already taken" });
      }

      // Check if email already exists
      const existingEmail = await storage.getUserByEmail(validatedData.email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email already in use" });
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(validatedData.password, salt);

      // Create user
      const user = await storage.createUser({
        ...validatedData,
        password: hashedPassword,
      });

      // Log activity
      await logActivity(
        user.id,
        "register",
        user.id,
        "user",
        { username: user.username },
        req.ip
      );

      // Create session token
      const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        JWT_SECRET,
        { expiresIn: "30d" }
      );
      
      res.status(201).json({ 
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role
        }
      });
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  });

  // Login
  apiRouter.post("/auth/login", async (req, res) => {
    try {
      const validatedData = loginSchema.parse(req.body);

      // Find user
      const user = await storage.getUserByUsername(validatedData.username);
      if (!user) {
        return res.status(400).json({ message: "Invalid credentials" });
      }

      // Validate password
      const validPassword = await bcrypt.compare(
        validatedData.password,
        user.password
      );
      if (!validPassword) {
        return res.status(400).json({ message: "Invalid credentials" });
      }

      // Check if MFA is enabled
      if (user.mfaEnabled) {
        // Return a signal to client that MFA is required for this user
        return res.json({ 
          requireMfa: true, 
          userId: user.id,
          username: user.username 
        });
      }

      // Create session token
      const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        JWT_SECRET,
        { expiresIn: "30d" }
      );

      // Log activity
      await logActivity(
        user.id,
        "login",
        user.id,
        "user",
        { username: user.username },
        req.ip
      );

      res.json({ 
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role
        }
      });
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  });

  // Get current user
  apiRouter.get("/auth/me", authenticate, async (req, res) => {
    try {
      const user = await storage.getUser(req.user!.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ message: (error as Error).message });
    }
  });

  /**
   * File Routes
   */
  // Upload file
  apiRouter.post("/files", authenticate, upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      console.log("Upload request received:", {
        filename: req.file.originalname,
        userId: req.user!.id
      });

      const file = req.file;
      const encrypt = req.body.encrypt === "true";
      const accessControl = req.body.accessControl || "private";

      // Get file path and read the file
      const filePath = file.path;
      const fileContent = await fs.promises.readFile(filePath);

      console.log("File read successfully:", {
        path: filePath,
        size: fileContent.length
      });

      // Encrypt file if requested
      let encryptedContent = fileContent;
      let encryptionKey;
      if (encrypt) {
        encryptionKey = crypto.randomBytes(32);
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv("aes-256-cbc", encryptionKey, iv);
        encryptedContent = Buffer.concat([iv, cipher.update(fileContent), cipher.final()]);
      }

      // Save encrypted content back to file
      await fs.promises.writeFile(filePath, encryptedContent);

      // Create file record in database
      const newFile = await storage.createFile({
        name: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        path: filePath,
        encrypted: encrypt,
        encryptionKey: encrypt ? encryptionKey?.toString("hex") : null,
        ownerId: req.user!.id,
        accessControl,
      });

      console.log("File record created:", {
        fileId: newFile.id,
        ownerId: newFile.ownerId
      });

      // Log activity
      await logActivity(
        req.user!.id,
        "upload",
        newFile.id,
        "file",
        {
          fileName: file.originalname,
          fileSize: file.size,
          encrypted: encrypt,
        },
        req.ip
      );

      res.status(201).json({
        id: newFile.id,
        name: newFile.originalName,
        size: newFile.size,
        type: newFile.mimeType,
        encrypted: newFile.encrypted,
        createdAt: newFile.createdAt,
      });
    } catch (error) {
      console.error("Error in file upload:", error);
      // Clean up uploaded file if there was an error
      if (req.file) {
        await fs.promises.unlink(req.file.path).catch(console.error);
      }
      res.status(400).json({ message: (error as Error).message });
    }
  });

  // Get all files for the current user
  apiRouter.get("/files", authenticate, async (req, res) => {
    try {
      console.log("Fetching files for user:", req.user!.id);
      const files = await storage.getFilesByOwnerId(req.user!.id);
      console.log("Files found:", files.length);
      res.json(files);
    } catch (error) {
      console.error("Error fetching files:", error);
      res.status(500).json({ message: (error as Error).message });
    }
  });

  // Get file metadata
  apiRouter.get("/files/:id/metadata", authenticate, async (req, res) => {
    try {
      const fileId = parseInt(req.params.id);
      const { hasAccess, file, share } = await checkFileAccess(fileId, req.user!.id);

      if (!hasAccess || !file) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Get additional metadata
      const stats = fs.statSync(path.join(UPLOAD_DIR, file.path));

      const metadata = {
        ...file,
        lastModified: stats.mtime,
        created: stats.birthtime,
        permissions: stats.mode,
        owner: await storage.getUser(file.ownerId),
        shares: await storage.getFileSharesByFileId(file.id),
        accessLevel: share?.accessLevel || "edit" // Owner has edit access
      };

      // Remove sensitive information
      delete metadata.path;
      if (metadata.owner) {
        delete metadata.owner.password;
        delete metadata.owner.mfaSecret;
      }

      res.json(metadata);
    } catch (error) {
      res.status(500).json({ message: (error as Error).message });
    }
  });

  // Get a specific file
  apiRouter.get("/files/:id", authenticate, async (req, res) => {
    try {
      const fileId = parseInt(req.params.id);
      const file = await storage.getFile(fileId);

      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }

      // Check if user has access to the file
      if (file.ownerId !== req.user!.id) {
        // Check if the file is shared with the user
        const shares = await storage.getFileSharesByFileId(file.id);
        const userShare = shares.find(share => share.userId === req.user!.id);

        if (!userShare) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      res.json(file);
    } catch (error) {
      res.status(500).json({ message: (error as Error).message });
    }
  });

  // Download a file
  apiRouter.get("/files/:id/download", authenticate, async (req, res) => {
    try {
      const fileId = parseInt(req.params.id);
      const { hasAccess, file } = await checkFileAccess(fileId, req.user!.id);

      if (!hasAccess || !file) {
        return res.status(403).json({ message: "Access denied" });
      }

      const filePath = path.join(UPLOAD_DIR, file.path);

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: "File not found on server" });
      }

      // Log activity
      await logActivity(
        req.user!.id,
        "download",
        file.id,
        "file",
        { filename: file.originalName },
        req.ip
      );

      if (file.encrypted) {
        try {
          // Read the encrypted file
          const encryptedData = fs.readFileSync(filePath);

          // Security checks on encrypted data
          if (!SecurityUtils.checkBufferOverflow(encryptedData)) {
            return res.status(400).json({ message: "File size exceeds maximum buffer limit" });
          }

          // Extract IV from filename (prefix before first dash)
          const iv = file.path.split('-')[0];

          // Decrypt the file
          const decryptedData = await storage.decryptFile(encryptedData, iv);

          // Scan decrypted content for threats
          const hasMalware = await SecurityUtils.scanForMalware(decryptedData);
          if (hasMalware) {
            return res.status(400).json({ message: "Security threat detected in file" });
          }

          // Set headers
          res.setHeader('Content-Disposition', `attachment; filename="${file.originalName}"`);
          res.setHeader('Content-Type', file.mimeType);

          // Send decrypted file
          return res.send(decryptedData);
        } catch (error) {
          console.error("Decryption error:", error);
          return res.status(500).json({ message: "File decryption failed" });
        }
      } else {
        // For non-encrypted files, stream directly
        res.setHeader('Content-Disposition', `attachment; filename="${file.originalName}"`);
        res.setHeader('Content-Type', file.mimeType);
        fs.createReadStream(filePath).pipe(res);
      }
    } catch (error) {
      res.status(500).json({ message: (error as Error).message });
    }
  });

  // Delete a file
  apiRouter.delete("/files/:id", authenticate, async (req, res) => {
    try {
      const fileId = parseInt(req.params.id);
      const file = await storage.getFile(fileId);

      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }

      // Only the owner can delete the file
      if (file.ownerId !== req.user!.id && req.user!.role !== "admin") {
        return res.status(403).json({ message: "Access denied" });
      }

      const deleted = await storage.deleteFile(fileId);

      if (deleted) {
        // Log activity
        await logActivity(
          req.user!.id,
          "delete",
          fileId,
          "file",
          { filename: file.originalName },
          req.ip
        );

        res.json({ message: "File deleted successfully" });
      } else {
        res.status(500).json({ message: "Failed to delete file" });
      }
    } catch (error) {
      res.status(500).json({ message: (error as Error).message });
    }
  });

  /**
   * File Sharing Routes
   */
  // Share a file
  apiRouter.post("/files/:id/share", authenticate, async (req, res) => {
    try {
      const fileId = parseInt(req.params.id);
      const { userId, accessLevel, expiresAt } = req.body;

      // Validate input
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }

      // Validate access level
      if (accessLevel && !["view", "edit"].includes(accessLevel)) {
        return res.status(400).json({ message: "Invalid access level. Must be 'view' or 'edit'" });
      }

      const file = await storage.getFile(fileId);

      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }

      // Only the owner can share the file
      if (file.ownerId !== req.user!.id) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Check if user exists
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check if file is already shared with this user
      const existingShares = await storage.getFileSharesByFileId(fileId);
      const existingShare = existingShares.find(share => share.userId === userId);
      if (existingShare) {
        return res.status(400).json({ message: "File is already shared with this user" });
      }

      // Create file share
      const fileShare = await storage.shareFile({
        fileId,
        userId,
        accessLevel: accessLevel || "view",
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      });

      // Log activity
      await logActivity(
        req.user!.id,
        "share",
        fileId,
        "file",
        { 
          filename: file.originalName,
          sharedWith: user.username,
          accessLevel: fileShare.accessLevel
        },
        req.ip
      );

      res.status(201).json(fileShare);
    } catch (error) {
      console.error("Error sharing file:", error);
      res.status(500).json({ message: (error as Error).message });
    }
  });

  // Get files shared with current user
  apiRouter.get("/shared-files", authenticate, async (req, res) => {
    try {
      const sharedFiles = await storage.getSharedFilesByUserId(req.user!.id);
      res.json(sharedFiles);
    } catch (error) {
      res.status(500).json({ message: (error as Error).message });
    }
  });

  // Remove file share
  apiRouter.delete("/files/:id/share/:userId", authenticate, async (req, res) => {
    try {
      const fileId = parseInt(req.params.id);
      const userId = parseInt(req.params.userId);

      const file = await storage.getFile(fileId);

      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }

      // Only the owner can remove shares
      if (file.ownerId !== req.user!.id) {
        return res.status(403).json({ message: "Access denied" });
      }

      const removed = await storage.removeFileShare(fileId, userId);

      if (removed) {
        // Log activity
        await logActivity(
          req.user!.id,
          "unshare",
          fileId,
          "file",
          { filename: file.originalName, userId },
          req.ip
        );

        res.json({ message: "File share removed successfully" });
      } else {
        res.status(404).json({ message: "File share not found" });
      }
    } catch (error) {
      res.status(500).json({ message: (error as Error).message });
    }
  });

  /**
   * Admin Routes
   */
  // Get all users (admin only)
  apiRouter.get(
    "/admin/users",
    authenticate,
    authorize(["admin"]),
    async (_req, res) => {
      try {
        const users = await storage.getAllUsers();
        // Remove passwords before sending
        const sanitizedUsers = users.map(({ password, ...rest }) => rest);
        res.json(sanitizedUsers);
      } catch (error) {
        res.status(500).json({ message: (error as Error).message });
      }
    }
  );

  // Get all activity logs (admin only)
  apiRouter.get(
    "/admin/activity-logs",
    authenticate,
    authorize(["admin"]),
    async (_req, res) => {
      try {
        const logs = await storage.getAllActivityLogs();
        res.json(logs);
      } catch (error) {
        res.status(500).json({ message: (error as Error).message });
      }
    }
  );

  // This endpoint has been moved to a dedicated route below

  /**
   * MFA Routes
   */
  // Set up MFA (generates QR code)
  apiRouter.post("/mfa/setup", authenticate, async (req, res) => {
    try {
      const userId = req.user!.id;
      const { qrCodeUrl } = await new MfaService(storage).setupMfa(userId);

      // Log the MFA setup attempt
      await logActivity(
        userId,
        "mfa_setup_initiated",
        userId,
        "user",
        { success: true },
        req.ip
      );

      return res.status(200).json({ qrCodeUrl });
    } catch (error) {
      console.error("Error setting up MFA:", error);
      return res.status(500).json({ message: "Failed to set up MFA" });
    }
  });

  // Verify and enable MFA for a user
  apiRouter.post("/mfa/verify", authenticate, async (req, res) => {
    try {
      const userId = req.user!.id;
      const { token } = req.body;

      const result = verifyMfaSchema.safeParse({ userId, token });
      if (!result.success) {
        return res.status(400).json({ 
          message: "Invalid request",
          errors: result.error.format() 
        });
      }

      const isValid = await new MfaService(storage).verifyAndEnableMfa(userId, token);

      // Log the MFA verification attempt
      await logActivity(
        userId,
        "mfa_verification",
        userId,
        "user",
        { success: isValid },
        req.ip
      );

      if (isValid) {
        return res.status(200).json({ message: "MFA enabled successfully" });
      } else {
        return res.status(400).json({ message: "Invalid verification code" });
      }
    } catch (error) {
      console.error("Error verifying MFA:", error);
      return res.status(500).json({ message: "Failed to verify MFA" });
    }
  });

  // Disable MFA for a user
  apiRouter.post("/mfa/disable", authenticate, async (req, res) => {
    try {
      const userId = req.user!.id;

      await new MfaService(storage).disableMfa(userId);

      // Log the MFA disabling
      await logActivity(
        userId,
        "mfa_disabled",
        userId,
        "user",
        { success: true },
        req.ip
      );

      return res.status(200).json({ message: "MFA disabled successfully" });
    } catch (error) {
      console.error("Error disabling MFA:", error);
      return res.status(500).json({ message: "Failed to disable MFA" });
    }
  });

  // MFA verification during login
  apiRouter.post("/auth/mfa-login", async (req, res) => {
    try {
      const validatedData = mfaLoginSchema.parse(req.body);
      const { userId, token: mfaToken } = validatedData;

      // Find user
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(400).json({ message: "User not found" });
      }

      // Verify MFA token
      const mfaService = new MfaService(storage);
      const isValid = await mfaService.verifyMfaLogin(userId, mfaToken);

      if (!isValid) {
        // Increment failed login attempts and check for lockout
        const failedAttempts = await storage.incrementFailedLoginAttempts(userId);

        // Log the failed MFA attempt
        await logActivity(
          userId,
          "mfa_login_failed",
          userId,
          "user",
          { username: user.username },
          req.ip
        );

        // Check if account should be locked
        if (failedAttempts >= 5) {
          // Lock account for 15 minutes
          const lockUntil = new Date(Date.now() + 15 * 60 * 1000);
          await storage.setUserLockout(userId, lockUntil);

          return res.status(400).json({ 
            message: "Account locked due to too many failed attempts. Try again later."
          });
        }

        return res.status(400).json({ message: "Invalid verification code" });
      }

      // Create JWT token after successful MFA verification
      const jwtToken = jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        JWT_SECRET,
        { expiresIn: "1d" }
      );

      // Update last login time and reset failed attempts
      await storage.updateUserLastLogin(userId);
      await storage.resetFailedLoginAttempts(userId);

      // Log the successful MFA login
      await logActivity(
        userId,
        "mfa_login_success",
        userId,
        "user",
        { username: user.username },
        req.ip
      );

      res.json({ token: jwtToken });
    } catch (error) {
      console.error("MFA login error:", error);
      res.status(400).json({ message: (error as Error).message });
    }
  });

  // Get user's activity logs
  apiRouter.get("/activity-logs", authenticate, async (req, res) => {
    try {
      const logs = await storage.getActivityLogsByUserId(req.user!.id);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ message: (error as Error).message });
    }
  });

  // Get team files (files shared with the user)
  apiRouter.get("/files/team", authenticate, async (req, res) => {
    try {
      console.log("Fetching team files for user:", req.user!.id);
      const sharedFiles = await storage.getSharedFilesByUserId(req.user!.id);
      console.log("Found shared files:", sharedFiles.length);
      
      // Transform the data to match the expected format
      const files = sharedFiles.map(({ file, share }) => ({
        id: file.id,
        name: file.name,
        originalName: file.originalName,
        mimeType: file.mimeType,
        size: file.size,
        encrypted: file.encrypted,
        createdAt: file.createdAt,
        updatedAt: file.updatedAt,
        shareId: share.id,
        accessLevel: share.accessLevel,
        sharedBy: file.ownerId // You might want to fetch the actual username here
      }));
      
      res.json(files);
    } catch (error) {
      console.error("Error fetching team files:", error);
      res.status(500).json({ message: (error as Error).message });
    }
  });

  // Get files in trash
  apiRouter.get("/files/trash", authenticate, async (req, res) => {
    try {
      const trashedFiles = await storage.getFilesByOwnerId(req.user!.id, true);
      res.json(trashedFiles);
    } catch (error) {
      res.status(500).json({ message: (error as Error).message });
    }
  });

  // Move file to trash
  apiRouter.post("/files/:id/trash", authenticate, async (req, res) => {
    try {
      const fileId = parseInt(req.params.id);
      const file = await storage.getFile(fileId);

      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }

      // Only owner can trash the file
      if (file.ownerId !== req.user!.id) {
        return res.status(403).json({ message: "Access denied" });
      }

      await storage.moveFileToTrash(fileId);

      // Log activity
      await logActivity(
        req.user!.id,
        "trash",
        fileId,
        "file",
        { filename: file.originalName },
        req.ip
      );

      res.json({ message: "File moved to trash" });
    } catch (error) {
      res.status(500).json({ message: (error as Error).message });
    }
  });

  // Restore file from trash
  apiRouter.post("/files/:id/restore", authenticate, async (req, res) => {
    try {
      const fileId = parseInt(req.params.id);
      const file = await storage.getFile(fileId);

      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }

      // Only owner can restore the file
      if (file.ownerId !== req.user!.id) {
        return res.status(403).json({ message: "Access denied" });
      }

      await storage.restoreFileFromTrash(fileId);

      // Log activity
      await logActivity(
        req.user!.id,
        "restore",
        fileId,
        "file",
        { filename: file.originalName },
        req.ip
      );

      res.json({ message: "File restored from trash" });
    } catch (error) {
      res.status(500).json({ message: (error as Error).message });
    }
  });

  // Get recent files
  apiRouter.get("/files/recent", authenticate, async (req, res) => {
    try {
      // Get user's files and sort by last modified
      const files = await storage.getFilesByOwnerId(req.user!.id);
      const recentFiles = files
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 10); // Get top 10 most recent files

      res.json(recentFiles);
    } catch (error) {
      res.status(500).json({ message: (error as Error).message });
    }
  });

  // Register API router
  app.use("/api", apiRouter);

  const httpServer = createServer(app);
  return httpServer;
}