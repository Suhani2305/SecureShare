import { Request, Response, Router } from "express";
import { storage } from "../storage";
import { MfaService } from "../mfa";
import { verifyMfaSchema, setupMfaSchema } from "@shared/schema";
import { authenticate } from "../middleware/auth";
import jwt from "jsonwebtoken";

const router = Router();
const mfaService = new MfaService(storage);

// Set up MFA for a user (generates a QR code)
router.post("/setup", authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    const result = setupMfaSchema.safeParse({ userId });
    if (!result.success) {
      return res.status(400).json({ 
        message: "Invalid request",
        errors: result.error.format() 
      });
    }
    
    const { qrCodeUrl } = await mfaService.setupMfa(userId);
    
    // Log the MFA setup attempt
    await storage.logActivity({
      userId,
      action: "mfa_setup_initiated",
      resourceId: userId,
      resourceType: "user",
      details: { success: true },
      ipAddress: req.ip || null
    });
    
    return res.status(200).json({ qrCodeUrl });
  } catch (error) {
    console.error("Error setting up MFA:", error);
    return res.status(500).json({ message: "Failed to set up MFA" });
  }
});

// Verify and enable MFA for a user
router.post("/verify", authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { token } = req.body;
    
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    const result = verifyMfaSchema.safeParse({ userId, token });
    if (!result.success) {
      return res.status(400).json({ 
        message: "Invalid request",
        errors: result.error.format() 
      });
    }
    
    const isValid = await mfaService.verifyAndEnableMfa(userId, token);
    
    // Log the MFA verification attempt
    await storage.logActivity({
      userId,
      action: "mfa_verification",
      resourceId: userId,
      resourceType: "user",
      details: { success: isValid },
      ipAddress: req.ip || null
    });
    
    if (isValid) {
      // Get user data to generate token
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Generate new token with updated MFA status
      const newToken = jwt.sign(
        { 
          id: user.id, 
          username: user.username, 
          role: user.role,
          mfaEnabled: true 
        },
        JWT_SECRET,
        { expiresIn: "24h" }
      );

      return res.status(200).json({ 
        token: newToken,
        message: "MFA enabled successfully" 
      });
    } else {
      return res.status(400).json({ message: "Invalid verification code" });
    }
  } catch (error) {
    console.error("Error verifying MFA:", error);
    return res.status(500).json({ message: "Failed to verify MFA" });
  }
});

// Disable MFA for a user
router.post("/disable", authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    await mfaService.disableMfa(userId);
    
    // Get user data to generate new token
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Generate new token with updated MFA status
    const newToken = jwt.sign(
      { 
        id: user.id, 
        username: user.username, 
        role: user.role,
        mfaEnabled: false 
      },
      JWT_SECRET,
      { expiresIn: "24h" }
    );
    
    // Log the MFA disabling
    await storage.logActivity({
      userId,
      action: "mfa_disabled",
      resourceId: userId,
      resourceType: "user",
      details: { success: true },
      ipAddress: req.ip || null
    });
    
    return res.status(200).json({ 
      token: newToken,
      message: "MFA disabled successfully" 
    });
  } catch (error) {
    console.error("Error disabling MFA:", error);
    return res.status(500).json({ message: "Failed to disable MFA" });
  }
});

export default router;