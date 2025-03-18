import crypto from 'crypto';

/**
 * Enhanced encryption service for secure file management
 * Implements AES-256-GCM encryption/decryption with per-file keys
 */
export class EncryptionService {
  private masterKey: Buffer;
  private algorithm = 'aes-256-gcm';
  private keyLength = 32; // 256 bits
  private saltLength = 32;
  private ivLength = 12;

  constructor(masterKey: string) {
    this.masterKey = Buffer.from(masterKey, 'hex');
  }

  /**
   * Generates a new encryption key for a file
   */
  generateFileKey(): Buffer {
    return crypto.randomBytes(this.keyLength);
  }

  /**
   * Encrypts a file key with the master key
   */
  encryptFileKey(fileKey: Buffer): { encryptedKey: string, salt: string } {
    const salt = crypto.randomBytes(this.saltLength);
    const key = crypto.pbkdf2Sync(this.masterKey, salt, 100000, this.keyLength, 'sha256');
    const iv = crypto.randomBytes(this.ivLength);
    const cipher = crypto.createCipheriv(this.algorithm, key, iv);
    
    const encryptedKey = Buffer.concat([
      iv,
      cipher.update(fileKey),
      cipher.final(),
      cipher.getAuthTag()
    ]);

    return {
      encryptedKey: encryptedKey.toString('hex'),
      salt: salt.toString('hex')
    };
  }

  /**
   * Decrypts a file key using the master key
   */
  decryptFileKey(encryptedKey: string, salt: string): Buffer {
    const encryptedData = Buffer.from(encryptedKey, 'hex');
    const saltBuffer = Buffer.from(salt, 'hex');
    const key = crypto.pbkdf2Sync(this.masterKey, saltBuffer, 100000, this.keyLength, 'sha256');
    
    const iv = encryptedData.slice(0, this.ivLength);
    const tag = encryptedData.slice(-16);
    const data = encryptedData.slice(this.ivLength, -16);
    
    const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
    decipher.setAuthTag(tag);
    
    return Buffer.concat([decipher.update(data), decipher.final()]);
  }

  /**
   * Encrypts file data using a file-specific key
   */
  encryptFile(buffer: Buffer, fileKey: Buffer): { 
    encryptedData: Buffer;
    iv: string;
    authTag: string;
  } {
    const iv = crypto.randomBytes(this.ivLength);
    const cipher = crypto.createCipheriv(this.algorithm, fileKey, iv);
    
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

  /**
   * Decrypts file data using a file-specific key
   */
  decryptFile(encryptedData: Buffer, iv: string, authTag: string, fileKey: Buffer): Buffer {
    const ivBuffer = Buffer.from(iv, 'hex');
    const authTagBuffer = Buffer.from(authTag, 'hex');
    
    const decipher = crypto.createDecipheriv(this.algorithm, fileKey, ivBuffer);
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

  /**
   * Creates a hash of the file content for integrity verification
   */
  createFileHash(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Verifies the integrity of a file by comparing its hash
   */
  verifyFileIntegrity(buffer: Buffer, storedHash: string): boolean {
    const calculatedHash = this.createFileHash(buffer);
    return crypto.timingSafeEqual(
      Buffer.from(calculatedHash, 'hex'),
      Buffer.from(storedHash, 'hex')
    );
  }

  /**
   * Generates a random master key for the encryption service
   */
  static generateMasterKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }
}

// Create singleton instance
const masterKey = process.env.ENCRYPTION_MASTER_KEY || EncryptionService.generateMasterKey();
export const encryptionService = new EncryptionService(masterKey);