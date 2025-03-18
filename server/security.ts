
import crypto from 'crypto';
import { Buffer } from 'buffer';
import { promisify } from 'util';
import { createHash } from 'crypto';

const MAX_BUFFER_SIZE = 50 * 1024 * 1024; // 50MB max buffer size
const MALWARE_SIGNATURES = new Set([
  '44d88612fea8a8f36de82e1278abb02f', // Example MD5 malware signature
  'f34d5f2d4577ed6d9ceec516631f4'      // Example partial signature
]);

export class SecurityUtils {
  static checkBufferOverflow(buffer: Buffer): boolean {
    return buffer.length <= MAX_BUFFER_SIZE;
  }

  static async scanForMalware(buffer: Buffer): Promise<boolean> {
    const hash = createHash('md5').update(buffer).digest('hex');
    
    // Check against known signatures
    if (MALWARE_SIGNATURES.has(hash)) {
      return true;
    }

    // Check for executable content
    const fileHeader = buffer.slice(0, Math.min(buffer.length, 4)).toString('hex');
    const executableHeaders = ['4d5a', '7f454c']; // PE and ELF headers
    return executableHeaders.some(header => fileHeader.startsWith(header));
  }

  static validateFileMetadata(filename: string, size: number): boolean {
    // Check for directory traversal attempts
    if (filename.includes('..') || filename.startsWith('/')) {
      return false;
    }
    
    // Validate file size
    if (size > MAX_BUFFER_SIZE) {
      return false;
    }
    
    return true;
  }

  static sanitizeFilename(filename: string): string {
    return filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  }
}
