import { Request, Response, Router } from "express";
import { storage } from "../storage";
import { authenticate } from "../middleware/auth";
import { z } from "zod";
import path from "path";
import fs from "fs/promises";

const router = Router();

// Schema validation
const addMemberSchema = z.object({
  username: z.string(),
  accessLevel: z.enum(["read", "write", "admin"])
});

const createFolderSchema = z.object({
  path: z.string(),
  name: z.string().min(1)
});

const shareFileSchema = z.object({
  users: z.array(z.string())
});

// Get team members
router.get("/members", authenticate, async (req: Request, res: Response) => {
  try {
    const members = await storage.getTeamMembers();
    return res.status(200).json({ members });
  } catch (error) {
    console.error("Error getting team members:", error);
    return res.status(500).json({ message: "Failed to get team members" });
  }
});

// Add team member
router.post("/members", authenticate, async (req: Request, res: Response) => {
  try {
    const result = addMemberSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ 
        message: "Invalid request",
        errors: result.error.format() 
      });
    }

    const { username, accessLevel } = result.data;
    const member = await storage.addTeamMember(username, accessLevel);

    // Log activity
    await storage.logActivity({
      userId: req.user!.id,
      action: "add_team_member",
      resourceId: member.id.toString(),
      resourceType: "user",
      details: { username, accessLevel },
      ipAddress: req.ip || null
    });

    return res.status(200).json({ member });
  } catch (error: any) {
    console.error("Error adding team member:", error);
    return res.status(500).json({ message: error.message || "Failed to add team member" });
  }
});

// Remove team member
router.delete("/members/:id", authenticate, async (req: Request, res: Response) => {
  try {
    const memberId = parseInt(req.params.id);
    await storage.removeTeamMember(memberId);

    // Log activity
    await storage.logActivity({
      userId: req.user!.id,
      action: "remove_team_member",
      resourceId: memberId.toString(),
      resourceType: "user",
      details: {},
      ipAddress: req.ip || null
    });

    return res.status(200).json({ message: "Member removed successfully" });
  } catch (error) {
    console.error("Error removing team member:", error);
    return res.status(500).json({ message: "Failed to remove team member" });
  }
});

// Get team files
router.get("/files", authenticate, async (req: Request, res: Response) => {
  try {
    const currentPath = req.query.path as string || "/";
    const files = await storage.getTeamFiles(currentPath);
    return res.status(200).json({ files });
  } catch (error) {
    console.error("Error getting team files:", error);
    return res.status(500).json({ message: "Failed to get team files" });
  }
});

// Create folder
router.post("/files/folder", authenticate, async (req: Request, res: Response) => {
  try {
    const result = createFolderSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ 
        message: "Invalid request",
        errors: result.error.format() 
      });
    }

    const { path: folderPath, name } = result.data;
    const folder = await storage.createTeamFolder(folderPath, name);

    // Log activity
    await storage.logActivity({
      userId: req.user!.id,
      action: "create_folder",
      resourceId: folder.id.toString(),
      resourceType: "folder",
      details: { path: folderPath, name },
      ipAddress: req.ip || null
    });

    return res.status(200).json({ folder });
  } catch (error) {
    console.error("Error creating folder:", error);
    return res.status(500).json({ message: "Failed to create folder" });
  }
});

// Share file
router.post("/files/:id/share", authenticate, async (req: Request, res: Response) => {
  try {
    const fileId = parseInt(req.params.id);
    const result = shareFileSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ 
        message: "Invalid request",
        errors: result.error.format() 
      });
    }

    const { users } = result.data;
    await storage.shareTeamFile(fileId, users);

    // Log activity
    await storage.logActivity({
      userId: req.user!.id,
      action: "share_file",
      resourceId: fileId.toString(),
      resourceType: "file",
      details: { sharedWith: users },
      ipAddress: req.ip || null
    });

    return res.status(200).json({ message: "File shared successfully" });
  } catch (error) {
    console.error("Error sharing file:", error);
    return res.status(500).json({ message: "Failed to share file" });
  }
});

// Get recent activity
router.get("/activity", authenticate, async (req: Request, res: Response) => {
  try {
    const activities = await storage.getTeamActivity();
    return res.status(200).json({ activities });
  } catch (error) {
    console.error("Error getting team activity:", error);
    return res.status(500).json({ message: "Failed to get team activity" });
  }
});

export default router; 