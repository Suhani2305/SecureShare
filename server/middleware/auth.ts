import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { storage } from "../storage";

// Define the JWT secret key from environment or use a default for development
const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret_key";

// Extend Express Request type to include user
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

/**
 * Middleware to authenticate requests using JWT
 */
export const authenticateJwt = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ message: "No token provided" });
    }
    
    const token = authHeader.split(" ")[1]; // Format: "Bearer TOKEN"
    
    if (!token) {
      return res.status(401).json({ message: "Invalid token format" });
    }
    
    try {
      // Verify and decode the JWT
      const decoded = jwt.verify(token, JWT_SECRET) as {
        id: number;
        username: string;
        role: string;
      };
      
      // Fetch the user to ensure they still exist and account is active
      const user = await storage.getUser(decoded.id);
      
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }
      
      // Check if the user is locked out
      if (user.lockoutUntil && new Date() < user.lockoutUntil) {
        return res.status(403).json({ 
          message: "Account is temporarily locked. Please try again later.",
          lockoutUntil: user.lockoutUntil
        });
      }
      
      // Set the user in the request object
      req.user = {
        id: decoded.id,
        username: decoded.username,
        role: decoded.role
      };
      
      next();
    } catch (error) {
      console.error("JWT verification error:", error);
      return res.status(401).json({ message: "Invalid or expired token" });
    }
  } catch (error) {
    console.error("Authentication error:", error);
    return res.status(500).json({ message: "Authentication error" });
  }
};

/**
 * Middleware to check if the user has admin role
 */
export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Forbidden: Admin access required" });
  }
  
  next();
};

/**
 * Function to generate a JWT token for a user
 */
export const generateToken = (user: { id: number; username: string; role: string }): string => {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      role: user.role
    },
    JWT_SECRET,
    { expiresIn: "1d" } // Token expires in 1 day
  );
};