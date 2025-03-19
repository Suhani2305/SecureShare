import React, { useState, useEffect } from 'react';
import { teamService, TeamFile, TeamMember, ActivityLog } from '../services/team';
import { useAuth } from '../contexts/AuthContext';
import { Button, Input, Table, Modal, message } from 'antd';
import { SearchOutlined, ShareAltOutlined, FolderOutlined, FileOutlined } from '@ant-design/icons';

const TeamFiles: React.FC = () => {
  const [files, setFiles] = useState<TeamFile[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'date'>('date');
  const [currentPath, setCurrentPath] = useState('/');
  const [isLoading, setIsLoading] = useState(false);
  const [isAddMemberModalVisible, setIsAddMemberModalVisible] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<'admin' | 'member'>('member');
  const { user } = useAuth();

  // Load initial data
  useEffect(() => {
    loadData();
  }, [currentPath]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [filesData, membersData, activitiesData] = await Promise.all([
        teamService.getTeamFiles(currentPath),
        teamService.getTeamMembers(),
        teamService.getRecentActivity()
      ]);
      
      setFiles(filesData);
      setMembers(membersData);
      setActivities(activitiesData);
    } catch (error) {
      message.error('Failed to load team data');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  // File operations
  const handleFileClick = (file: TeamFile) => {
    if (file.type === 'folder') {
      setCurrentPath(file.path);
    }
  };

  const handleCreateFolder = async () => {
    const name = prompt('Enter folder name:');
    if (!name) return;

    try {
      await teamService.createFolder(currentPath, name);
      message.success('Folder created successfully');
      loadData();
    } catch (error) {
      message.error('Failed to create folder');
    }
  };

  const handleShare = async (fileId: string) => {
    // Implement sharing logic
  };

  // Team member operations
  const handleAddMember = async () => {
    try {
      await teamService.addTeamMember(newMemberEmail, newMemberRole);
      message.success('Team member added successfully');
      setIsAddMemberModalVisible(false);
      loadData();
    } catch (error) {
      message.error('Failed to add team member');
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      await teamService.removeTeamMember(memberId);
      message.success('Team member removed successfully');
      loadData();
    } catch (error) {
      message.error('Failed to remove team member');
    }
  };

  // Filter and sort files
  const filteredFiles = files.filter(file => 
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sortedFiles = [...filteredFiles].sort((a, b) => {
    if (sortBy === 'date') {
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    }
    return a.name.localeCompare(b.name);
  });

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: TeamFile) => (
        <div onClick={() => handleFileClick(record)} style={{ cursor: 'pointer' }}>
          {record.type === 'folder' ? <FolderOutlined /> : <FileOutlined />} {text}
        </div>
      ),
    },
    {
      title: 'Created By',
      dataIndex: 'createdBy',
      key: 'createdBy',
    },
    {
      title: 'Last Modified',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (record: TeamFile) => (
        <Button 
          icon={<ShareAltOutlined />} 
          onClick={() => handleShare(record.id)}
        >
          Share
        </Button>
      ),
    },
  ];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Team Files</h1>
        <div className="flex gap-4">
          <Input
            placeholder="Search files..."
            prefix={<SearchOutlined />}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as 'name' | 'date')}
            className="border rounded px-3 py-2"
          >
            <option value="date">Sort by Date</option>
            <option value="name">Sort by Name</option>
          </select>
          <Button onClick={handleCreateFolder}>New Folder</Button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-6">
        <div className="col-span-3">
          <Table
            dataSource={sortedFiles}
            columns={columns}
            loading={isLoading}
            rowKey="id"
          />
        </div>

        <div className="space-y-6">
          {/* Team Members Section */}
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Team Members</h2>
              <Button onClick={() => setIsAddMemberModalVisible(true)}>
                Add Member
              </Button>
            </div>
            <div className="space-y-2">
              {members.map(member => (
                <div key={member.id} className="flex justify-between items-center">
                  <div>
                    <div>{member.username}</div>
                    <div className="text-sm text-gray-500">{member.role}</div>
                  </div>
                  {user?.role === 'admin' && (
                    <Button 
                      danger 
                      onClick={() => handleRemoveMember(member.id)}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity Section */}
          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
            <div className="space-y-2">
              {activities.map(activity => (
                <div key={activity.id} className="text-sm">
                  <div className="font-medium">{activity.username}</div>
                  <div>{activity.action}</div>
                  <div className="text-gray-500">
                    {new Date(activity.timestamp).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Add Member Modal */}
      <Modal
        title="Add Team Member"
        open={isAddMemberModalVisible}
        onOk={handleAddMember}
        onCancel={() => setIsAddMemberModalVisible(false)}
      >
        <div className="space-y-4">
          <Input
            placeholder="Email address"
            value={newMemberEmail}
            onChange={e => setNewMemberEmail(e.target.value)}
          />
          <select
            value={newMemberRole}
            onChange={e => setNewMemberRole(e.target.value as 'admin' | 'member')}
            className="w-full border rounded px-3 py-2"
          >
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </select>
        </div>
      </Modal>
    </div>
  );
};

export default TeamFiles; 