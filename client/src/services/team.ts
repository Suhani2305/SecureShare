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
  // Team members
  async getTeamMembers(): Promise<TeamMember[]> {
    const response = await api.get('/api/team/members');
    return response.data.members;
  },

  async addTeamMember(username: string, accessLevel: 'read' | 'write' | 'admin'): Promise<TeamMember> {
    const response = await api.post('/api/team/members', { username, accessLevel });
    return response.data.member;
  },

  async removeTeamMember(memberId: number): Promise<void> {
    await api.delete(`/api/team/members/${memberId}`);
  },

  // Team files
  async getTeamFiles(path: string = '/'): Promise<TeamFile[]> {
    const response = await api.get('/api/team/files', { params: { path } });
    return response.data.files;
  },

  async createFolder(path: string, name: string): Promise<TeamFile> {
    const response = await api.post('/api/team/files/folder', { path, name });
    return response.data.folder;
  },

  async shareFile(fileId: number, users: string[]): Promise<void> {
    await api.post(`/api/team/files/${fileId}/share`, { users });
  },

  // Activity logs
  async getRecentActivity(): Promise<ActivityLog[]> {
    const response = await api.get('/api/team/activity');
    return response.data.activities;
  }
}; 