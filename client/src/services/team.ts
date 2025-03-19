import { api } from './api';

export interface TeamMember {
  id: number;
  userId: number;
  username: string;
  accessLevel: 'read' | 'write' | 'admin';
  addedBy: number;
  addedAt: string;
  updatedAt: string;
}

export interface TeamFile {
  id: number;
  name: string;
  type: 'file' | 'folder';
  size?: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  path: string;
}

export interface ActivityLog {
  id: string;
  action: string;
  userId: string;
  username: string;
  resourceId: string;
  resourceType: string;
  timestamp: string;
  details: any;
}

export const teamService = {
  // Error handler
  handleError(error: any): never {
    if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    }
    throw error;
  },

  // Team members
  async getTeamMembers(): Promise<TeamMember[]> {
    try {
      const response = await api.get('/api/team/members');
      return response.data.members || [];
    } catch (error) {
      this.handleError(error);
    }
  },

  async addTeamMember(username: string, accessLevel: 'read' | 'write' | 'admin'): Promise<TeamMember> {
    try {
      const response = await api.post('/api/team/members', { username, accessLevel });
      return response.data.member;
    } catch (error) {
      this.handleError(error);
    }
  },

  async removeTeamMember(memberId: number): Promise<void> {
    try {
      await api.delete(`/api/team/members/${memberId}`);
    } catch (error) {
      this.handleError(error);
    }
  },

  // Team files
  async getTeamFiles(path: string = '/'): Promise<TeamFile[]> {
    try {
      const response = await api.get('/api/team/files', { params: { path } });
      return response.data.files || [];
    } catch (error) {
      this.handleError(error);
    }
  },

  async createFolder(path: string, name: string): Promise<TeamFile> {
    try {
      const response = await api.post('/api/team/files/folder', { path, name });
      return response.data.folder;
    } catch (error) {
      this.handleError(error);
    }
  },

  async shareFile(fileId: number, users: string[]): Promise<void> {
    try {
      await api.post(`/api/team/files/${fileId}/share`, { users });
    } catch (error) {
      this.handleError(error);
    }
  },

  // Activity logs
  async getRecentActivity(): Promise<ActivityLog[]> {
    try {
      const response = await api.get('/api/team/activity');
      return response.data.activities || [];
    } catch (error) {
      this.handleError(error);
    }
  }
}; 