import speakeasy from "speakeasy";
import qrcode from "qrcode";
import { IStorage } from "./storage";

/**
 * MFA utility functions for two-factor authentication
 */
export class MfaService {
  private storage: IStorage;

  constructor(storage: IStorage) {
    this.storage = storage;
  }

  /**
   * Generate a new secret for a user
   * @param userId - The user ID to generate a secret for
   * @returns An object containing the secret in different formats and a QR code data URL
   */
  async generateSecret(userId: number, username: string): Promise<{ secret: speakeasy.GeneratedSecret; qrCodeUrl: string }> {
    try {
      // Get user information to use in the OTP URL
      const user = await this.storage.getUser(userId);
      if (!user) {
        throw new Error("User not found");
      }

      // Generate a new secret
      const secret = speakeasy.generateSecret({
        name: `SecureFileManager:${username || user.username}`
      });

      // Generate QR code
      const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url || "");

      return { secret, qrCodeUrl };
    } catch (error) {
      console.error("Error generating MFA secret:", error);
      throw error;
    }
  }

  /**
   * Verify a token against a user's secret
   * @param token - The token submitted by the user
   * @param secret - The user's secret
   * @returns True if the token is valid, false otherwise
   */
  verifyToken(token: string, secret: string): boolean {
    try {
      return speakeasy.totp.verify({
        secret: secret,
        encoding: "base32",
        token: token,
        window: 1 // Allow a small window of time drift (1 step on each side)
      });
    } catch (error) {
      console.error("Error verifying MFA token:", error);
      return false;
    }
  }

  /**
   * Setup MFA for a user
   * @param userId - The user ID to set up MFA for
   * @returns The generated secret and QR code data URL
   */
  async setupMfa(userId: number): Promise<{ qrCodeUrl: string }> {
    try {
      const user = await this.storage.getUser(userId);
      if (!user) {
        throw new Error("User not found");
      }

      // Only generate a new secret if the user doesn't have one
      if (!user.mfaSecret) {
        // Generate new secret
        const { secret, qrCodeUrl } = await this.generateSecret(userId, user.username);

        // Store the secret temporarily (not enabled yet until verified)
        await this.storage.updateUserMfaSecret(userId, secret.base32);
        
        return { qrCodeUrl };
      } else {
        // If user already has a secret, generate QR code from existing secret
        const secret = {
          otpauth_url: `otpauth://totp/SecureFileManager:${user.username}?secret=${user.mfaSecret}&issuer=SecureFileManager`
        };
        const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);
        
        return { qrCodeUrl };
      }
    } catch (error) {
      console.error("Error setting up MFA:", error);
      throw error;
    }
  }

  /**
   * Verify and enable MFA for a user
   * @param userId - The user ID
   * @param token - The token submitted by the user
   * @returns True if verification succeeded, false otherwise
   */
  async verifyAndEnableMfa(userId: number, token: string): Promise<boolean> {
    try {
      const user = await this.storage.getUser(userId);
      if (!user || !user.mfaSecret) {
        return false;
      }

      // Verify the token
      const isValid = this.verifyToken(token, user.mfaSecret);

      if (isValid) {
        // Enable MFA for the user
        await this.storage.updateUserMfaEnabled(userId, true);
      }

      return isValid;
    } catch (error) {
      console.error("Error verifying MFA:", error);
      return false;
    }
  }

  /**
   * Disable MFA for a user
   * @param userId - The user ID
   */
  async disableMfa(userId: number): Promise<void> {
    try {
      // Clear MFA secret and disable MFA
      await this.storage.updateUserMfaSecret(userId, null);
      await this.storage.updateUserMfaEnabled(userId, false);
    } catch (error) {
      console.error("Error disabling MFA:", error);
      throw error;
    }
  }

  /**
   * Verify MFA token during login
   * @param userId - The user ID
   * @param token - The token submitted by the user
   * @returns True if the token is valid, false otherwise
   */
  async verifyMfaLogin(userId: number, token: string): Promise<boolean> {
    try {
      const user = await this.storage.getUser(userId);
      if (!user || !user.mfaEnabled || !user.mfaSecret) {
        return false;
      }

      return this.verifyToken(token, user.mfaSecret);
    } catch (error) {
      console.error("Error verifying MFA login:", error);
      return false;
    }
  }
}