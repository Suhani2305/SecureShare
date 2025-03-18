export interface StoredFile {
  id: number;
  name: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
  encrypted: boolean;
  ownerId: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface FileShare {
  id: number;
  fileId: number;
  userId: number;
  accessLevel: "view" | "edit";
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  id: number;
  username: string;
  password: string;
  email: string;
  role: string;
  mfaEnabled: boolean;
  mfaSecret: string | null;
  lastLogin: Date | null;
  failedLoginAttempts: number;
  lockoutUntil: Date | null;
  createdAt: Date;
  updatedAt: Date;
} 