import crypto from 'crypto';

/**
 * Encryption service for secure file management
 * Implements AES-256-GCM encryption/decryption with proper key derivation
 */
export class EncryptionService {
  private encryptionKey: Buffer;
  private algorithm = 'aes-256-gcm';

  constructor(masterKey: string) {
    this.encryptionKey = crypto.scryptSync(masterKey, 'salt', 32);
  }

  encrypt(buffer: Buffer): { encryptedData: Buffer, iv: string, authTag: string } {
    const iv = crypto.randomBytes(12); // GCM recommends 12 bytes
    const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, iv);

    const encryptedBuffer = Buffer.concat([
      cipher.update(buffer),
      cipher.final()
    ]);

    const authTag = cipher.getAuthTag();

    return {
      encryptedData: encryptedBuffer,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };
  }

  decrypt(encryptedData: Buffer, iv: string, authTag: string): Buffer {
    const ivBuffer = Buffer.from(iv, 'hex');
    const authTagBuffer = Buffer.from(authTag, 'hex');

    const decipher = crypto.createDecipheriv(this.algorithm, this.encryptionKey, ivBuffer);
    decipher.setAuthTag(authTagBuffer);

    try {
      return Buffer.concat([
        decipher.update(encryptedData),
        decipher.final()
      ]);
    } catch (err) {
      throw new Error('Decryption failed: Data integrity check failed');
    }
  }

  static generateKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  createFileHash(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  verifyFileIntegrity(buffer: Buffer, storedHash: string): boolean {
    const calculatedHash = this.createFileHash(buffer);
    return crypto.timingSafeEqual(
      Buffer.from(calculatedHash, 'hex'),
      Buffer.from(storedHash, 'hex')
    );
  }
}

// Create singleton instance
const masterKey = process.env.ENCRYPTION_MASTER_KEY || EncryptionService.generateKey();
export const encryptionService = new EncryptionService(masterKey);