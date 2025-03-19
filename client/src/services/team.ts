import { api } from './api';

export interface TeamMember {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'member';
  avatarUrl?: string;
}

export interface TeamFile {
  id: string;
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
  // Team members
  async getTeamMembers(): Promise<TeamMember[]> {
    const response = await api.get('/team/members');
    return response.data.members;
  },

  async addTeamMember(email: string, role: 'admin' | 'member'): Promise<TeamMember> {
    const response = await api.post('/team/members', { email, role });
    return response.data.member;
  },

  async removeTeamMember(memberId: string): Promise<void> {
    await api.delete(`/team/members/${memberId}`);
  },

  // Team files
  async getTeamFiles(path: string = '/'): Promise<TeamFile[]> {
    const response = await api.get('/team/files', { params: { path } });
    return response.data.files;
  },

  async createFolder(path: string, name: string): Promise<TeamFile> {
    const response = await api.post('/team/files/folder', { path, name });
    return response.data.folder;
  },

  async shareFile(fileId: string, users: string[]): Promise<void> {
    await api.post(`/team/files/${fileId}/share`, { users });
  },

  // Activity logs
  async getRecentActivity(): Promise<ActivityLog[]> {
    const response = await api.get('/team/activity');
    return response.data.activities;
  }
}; 