export interface StoredFile {
  id: number;
  name: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
  folderId?: number;
  encrypted: boolean;
  encryptionIV?: string;
  encryptionTag?: string;
  encryptionSalt?: string;
  encryptedKey?: string;
  ownerId: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface FileShare {
  id: number;
  fileId: number;
  userId: number;
  accessLevel: "view" | "edit";
  createdAt: Date;
  updatedAt: Date;
}

export interface StoredFolder {
  id: number;
  name: string;
  parentId?: number;
  ownerId: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface FolderShare {
  id: number;
  folderId: number;
  userId: number;
  accessLevel: "view" | "edit";
  createdAt: Date;
  updatedAt: Date;
}

export interface FolderContents {
  folders: StoredFolder[];
  files: StoredFile[];
  breadcrumbs: {
    id: number;
    name: string;
  }[];
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