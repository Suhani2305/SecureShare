import React, { useState, useEffect } from 'react';
import { teamService, TeamFile, TeamMember, ActivityLog } from '../services/team';
import { useAuth } from '../contexts/AuthContext';
import { Button, Input, Table, Modal, message, Empty, Spin } from 'antd';
import { SearchOutlined, ShareAltOutlined, FolderOutlined, FileOutlined, LoadingOutlined } from '@ant-design/icons';

const TeamFiles: React.FC = () => {
  const [files, setFiles] = useState<TeamFile[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'date'>('date');
  const [currentPath, setCurrentPath] = useState('/');
  const [isLoading, setIsLoading] = useState(true);
  const [isAddMemberModalVisible, setIsAddMemberModalVisible] = useState(false);
  const [newMemberUsername, setNewMemberUsername] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<'read' | 'write' | 'admin'>('read');
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
      
      setFiles(filesData || []);
      setMembers(membersData || []);
      setActivities(activitiesData || []);
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Failed to load team data');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  // File operations
  const handleFileClick = (file: TeamFile) => {
    if (file.type === 'folder') {
      const newPath = file.path.startsWith('/') ? file.path : `/${file.path}`;
      setCurrentPath(newPath);
    }
  };

  const handleCreateFolder = async () => {
    const name = prompt('Enter folder name:');
    if (!name) return;

    try {
      await teamService.createFolder(currentPath, name);
      message.success('Folder created successfully');
      loadData();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Failed to create folder');
    }
  };

  const handleShare = async (fileId: number) => {
    // Implement sharing logic
    message.info('Sharing functionality coming soon');
  };

  // Team member operations
  const handleAddMember = async () => {
    if (!newMemberUsername.trim()) {
      message.error('Please enter a username');
      return;
    }

    try {
      await teamService.addTeamMember(newMemberUsername, newMemberRole);
      message.success('Team member added successfully');
      setIsAddMemberModalVisible(false);
      setNewMemberUsername('');
      loadData();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Failed to add team member');
    }
  };

  const handleRemoveMember = async (memberId: number) => {
    try {
      await teamService.removeTeamMember(memberId);
      message.success('Team member removed successfully');
      loadData();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Failed to remove team member');
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
          {record.type === 'folder' ? <FolderOutlined className="mr-2" /> : <FileOutlined className="mr-2" />} {text}
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

  const antIcon = <LoadingOutlined style={{ fontSize: 24 }} spin />;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">Team Files</h1>
          {isLoading && <Spin indicator={antIcon} />}
        </div>
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
          <div className="bg-white rounded-lg shadow">
            {!isLoading && files.length === 0 ? (
              <Empty 
                description="No files found" 
                className="py-8"
              />
            ) : (
              <Table
                dataSource={sortedFiles}
                columns={columns}
                loading={isLoading}
                rowKey="id"
                pagination={{ pageSize: 10 }}
              />
            )}
          </div>
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
              {!isLoading && members.length === 0 ? (
                <Empty description="No team members" />
              ) : (
                members.map(member => (
                  <div key={member.id} className="flex justify-between items-center p-2 hover:bg-gray-50 rounded">
                    <div>
                      <div className="font-medium">{member.username}</div>
                      <div className="text-sm text-gray-500">{member.accessLevel}</div>
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
                ))
              )}
            </div>
          </div>

          {/* Recent Activity Section */}
          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
            <div className="space-y-2">
              {!isLoading && activities.length === 0 ? (
                <Empty description="No recent activity" />
              ) : (
                activities.map(activity => (
                  <div key={activity.id} className="p-2 hover:bg-gray-50 rounded">
                    <div className="font-medium">{activity.username}</div>
                    <div>{activity.action}</div>
                    <div className="text-sm text-gray-500">
                      {new Date(activity.timestamp).toLocaleString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add Member Modal */}
      <Modal
        title="Add Team Member"
        open={isAddMemberModalVisible}
        onOk={handleAddMember}
        onCancel={() => {
          setIsAddMemberModalVisible(false);
          setNewMemberUsername('');
        }}
      >
        <div className="space-y-4">
          <Input
            placeholder="Username"
            value={newMemberUsername}
            onChange={e => setNewMemberUsername(e.target.value)}
          />
          <select
            value={newMemberRole}
            onChange={e => setNewMemberRole(e.target.value as 'read' | 'write' | 'admin')}
            className="w-full border rounded px-3 py-2"
          >
            <option value="read">Read Only</option>
            <option value="write">Write</option>
            <option value="admin">Admin</option>
          </select>
        </div>
      </Modal>
    </div>
  );
};

export default TeamFiles; 