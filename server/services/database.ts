import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

export const db = {
  // User Authentication Operations
  createUser: async (email: string, password: string, role: string = 'user') => {
    const hashedPassword = await bcrypt.hash(password, 10);
    return prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role,
      },
    });
  },

  getUserByEmail: async (email: string) => {
    return prisma.user.findUnique({ where: { email } });
  },

  getUserById: async (id: string) => {
    return prisma.user.findUnique({ 
      where: { id },
      include: {
        files: true,
        teams: {
          include: {
            team: true
          }
        }
      }
    });
  },

  updateUserLoginAttempts: async (userId: string, attempts: number) => {
    return prisma.user.update({
      where: { id: userId },
      data: { loginAttempts: attempts },
    });
  },

  updateLastLogin: async (userId: string) => {
    return prisma.user.update({
      where: { id: userId },
      data: { lastLogin: new Date() },
    });
  },

  // File Operations
  createFile: async (fileData: {
    name: string;
    path: string;
    size: number;
    type: string;
    ownerId: string;
    teamId?: string;
  }) => {
    return prisma.file.create({
      data: fileData,
      include: {
        owner: true,
        team: true
      }
    });
  },

  getUserFiles: async (userId: string) => {
    return prisma.file.findMany({
      where: {
        OR: [
          { ownerId: userId },
          { sharedWith: { some: { userId } } },
          { team: { members: { some: { userId } } } }
        ],
        isDeleted: false,
      },
      include: {
        owner: true,
        sharedWith: {
          include: {
            user: true,
          },
        },
        team: true
      },
    });
  },

  getFileById: async (fileId: string) => {
    return prisma.file.findUnique({
      where: { id: fileId },
      include: {
        owner: true,
        sharedWith: {
          include: {
            user: true,
          },
        },
        team: true
      }
    });
  },

  deleteFile: async (fileId: string) => {
    return prisma.file.update({
      where: { id: fileId },
      data: { isDeleted: true },
    });
  },

  restoreFile: async (fileId: string) => {
    return prisma.file.update({
      where: { id: fileId },
      data: { isDeleted: false },
    });
  },

  permanentlyDeleteFile: async (fileId: string) => {
    return prisma.file.delete({
      where: { id: fileId },
    });
  },

  // Team Operations
  createTeam: async (name: string, description: string, creatorId: string) => {
    return prisma.team.create({
      data: {
        name,
        description,
        members: {
          create: {
            userId: creatorId,
            role: 'admin',
          },
        },
      },
      include: {
        members: {
          include: {
            user: true
          }
        }
      }
    });
  },

  getTeamById: async (teamId: string) => {
    return prisma.team.findUnique({
      where: { id: teamId },
      include: {
        members: {
          include: {
            user: true
          }
        },
        files: true
      }
    });
  },

  getTeamMembers: async (teamId: string) => {
    return prisma.teamMember.findMany({
      where: { teamId },
      include: {
        user: true,
      },
    });
  },

  addTeamMember: async (teamId: string, userId: string, role: string = 'member') => {
    return prisma.teamMember.create({
      data: {
        teamId,
        userId,
        role,
      },
      include: {
        user: true,
        team: true
      }
    });
  },

  removeTeamMember: async (teamId: string, userId: string) => {
    return prisma.teamMember.delete({
      where: {
        userId_teamId: {
          userId,
          teamId,
        },
      },
    });
  },

  // Share Operations
  shareFile: async (fileId: string, userId: string) => {
    return prisma.share.create({
      data: {
        fileId,
        userId,
      },
      include: {
        file: true,
        user: true
      }
    });
  },

  removeShare: async (fileId: string, userId: string) => {
    return prisma.share.delete({
      where: {
        fileId_userId: {
          fileId,
          userId,
        },
      },
    });
  },

  // Security Questions
  addSecurityQuestion: async (userId: string, question: string, answer: string) => {
    return prisma.securityQuestion.create({
      data: {
        userId,
        question,
        answer,
      },
    });
  },

  getSecurityQuestions: async (userId: string) => {
    return prisma.securityQuestion.findMany({
      where: { userId },
    });
  },

  verifySecurityAnswer: async (userId: string, question: string, answer: string) => {
    return prisma.securityQuestion.findFirst({
      where: {
        userId,
        question,
        answer,
      },
    });
  },

  // Activity Logging
  logActivity: async (data: {
    userId: string;
    action: string;
    details?: string;
    fileId?: string;
    teamId?: string;
  }) => {
    return prisma.activityLog.create({
      data,
      include: {
        user: true,
        file: true,
        team: true
      }
    });
  },

  getUserActivity: async (userId: string) => {
    return prisma.activityLog.findMany({
      where: { userId },
      include: {
        file: true,
        team: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  getTeamActivity: async (teamId: string) => {
    return prisma.activityLog.findMany({
      where: { teamId },
      include: {
        user: true,
        file: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  // Admin Operations
  getAllUsers: async () => {
    return prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        lastLogin: true,
        loginAttempts: true,
      },
    });
  },

  getAllTeams: async () => {
    return prisma.team.findMany({
      include: {
        members: {
          include: {
            user: true,
          },
        },
        files: true,
      },
    });
  },

  updateUserStatus: async (userId: string, isActive: boolean) => {
    return prisma.user.update({
      where: { id: userId },
      data: { isActive },
    });
  },

  // Search Operations
  searchFiles: async (userId: string, searchTerm: string) => {
    return prisma.file.findMany({
      where: {
        OR: [
          { ownerId: userId },
          { sharedWith: { some: { userId } } },
          { team: { members: { some: { userId } } } }
        ],
        isDeleted: false,
        name: {
          contains: searchTerm,
          mode: 'insensitive',
        },
      },
      include: {
        owner: true,
        sharedWith: {
          include: {
            user: true,
          },
        },
        team: true
      },
    });
  },

  searchTeams: async (userId: string, searchTerm: string) => {
    return prisma.team.findMany({
      where: {
        members: {
          some: {
            userId,
          },
        },
        name: {
          contains: searchTerm,
          mode: 'insensitive',
        },
      },
      include: {
        members: {
          include: {
            user: true,
          },
        },
        files: true,
      },
    });
  },
}; 