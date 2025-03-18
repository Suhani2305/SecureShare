declare module 'speakeasy' {
  export interface GeneratedSecret {
    ascii: string;
    hex: string;
    base32: string;
    otpauth_url?: string;
  }

  export function generateSecret(options?: {
    length?: number;
    name?: string;
    issuer?: string;
  }): GeneratedSecret;

  export namespace totp {
    export function generate(options: {
      secret: string;
      encoding?: 'ascii' | 'hex' | 'base32';
      algorithm?: 'sha1' | 'sha256' | 'sha512';
      digits?: number;
      step?: number;
      time?: number;
      counter?: number;
    }): string;

    export function verify(options: {
      secret: string;
      encoding?: 'ascii' | 'hex' | 'base32';
      token: string;
      window?: number;
      step?: number;
      time?: number;
      digits?: number;
      algorithm?: 'sha1' | 'sha256' | 'sha512';
      counter?: number;
    }): boolean;
  }
}

declare module 'qrcode' {
  export function toDataURL(text: string, options?: any): Promise<string>;
  export function toFile(path: string, text: string, options?: any): Promise<void>;
  export function toString(text: string, options?: any): Promise<string>;
  export function toCanvas(canvasElement: HTMLCanvasElement, text: string, options?: any): Promise<void>;
  export function toBuffer(text: string, options?: any): Promise<Buffer>;
}