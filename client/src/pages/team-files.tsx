import { useEffect, useState } from "react";
import { Sidebar } from "@/components/ui/sidebar";
import { Header } from "@/components/ui/header";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { FileTable } from "@/components/file/file-table";
import { useToast } from "@/components/ui/use-toast";
import { API_ENDPOINTS } from "@/lib/config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Users, 
  FolderIcon, 
  Clock, 
  Share2, 
  Search,
  SortAsc,
  Filter,
  Bell
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TeamMembersList } from "@/components/team/team-members-list";
import { ActivityFeed } from "@/components/team/activity-feed";
import { ShareModal } from "@/components/modals/share-modal";
import { type UseQueryOptions } from "@tanstack/react-query";

interface SharedFile {
  id: number;
  name: string;
  originalName: string;
  mimeType: string;
  size: number;
  encrypted: boolean;
  createdAt: string;
  updatedAt: string;
  shareId: number;
  accessLevel: string;
  sharedBy: number;
  owner: {
    id: number;
    username: string;
  };
}

interface SidebarProps {
  showMobile: boolean;
  onCloseMobile: () => void;
}

interface ShareModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: SharedFile;
}

export default function TeamFiles() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [sortBy, setSortBy] = useState("date");
  const [selectedFile, setSelectedFile] = useState<SharedFile | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  const queryOptions: UseQueryOptions<SharedFile[]> = {
    queryKey: ["team-files"],
    queryFn: async () => {
      const response = await apiRequest("GET", API_ENDPOINTS.TEAM_FILES);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to fetch team files");
      }
      const data = await response.json();
      return data.files;
    },
    retry: 1
  };

  const { data: files, isLoading, error } = useQuery<SharedFile[]>(queryOptions);

  const handleMenuClick = () => {
    setShowMobileSidebar(!showMobileSidebar);
  };

  const handleShare = (file: SharedFile) => {
    setSelectedFile(file);
    setIsShareModalOpen(true);
  };

  const handleDownload = async (file: SharedFile) => {
    try {
      // First try to download without password
      let response = await apiRequest("GET", `/api/files/${file.id}/download`);
      
      if (response.status === 401) {
        // If unauthorized, check if password is required
        const errorData = await response.json();
        if (errorData.requiresPassword) {
          const password = prompt("This file is password protected. Please enter the password:");
          if (!password) return;
          
          // Retry with password
          response = await apiRequest("GET", `/api/files/${file.id}/download?password=${encodeURIComponent(password)}`);
          if (!response.ok) {
            throw new Error(errorData.message || "Download failed");
          }
        }
      } else if (!response.ok) {
        throw new Error("Download failed");
      }
      
      // If we get here, the response is OK and we can download the file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.originalName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to download file",
        variant: "destructive",
      });
    }
  };

  const sortedFiles = files?.sort((a: SharedFile, b: SharedFile) => {
    switch (sortBy) {
      case "name":
        return a.originalName.localeCompare(b.originalName);
      case "owner":
        return a.owner.username.localeCompare(b.owner.username);
      case "date":
      default:
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    }
  });

  const filteredFiles = sortedFiles?.filter((file: SharedFile) => 
    file.originalName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    if (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load team files. Please try again.",
        variant: "destructive",
      });
    }
  }, [error, toast]);

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar showMobile={showMobileSidebar} onCloseMobile={() => setShowMobileSidebar(false)} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header onMenuClick={handleMenuClick} />
        
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100">
          <div className="container mx-auto px-4 py-6">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-semibold text-gray-900">Team Files</h1>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    type="text"
                    placeholder="Search files..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date">Sort by Date</SelectItem>
                    <SelectItem value="name">Sort by Name</SelectItem>
                    <SelectItem value="owner">Sort by Owner</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Content - Files and Folders */}
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <h2 className="text-lg font-semibold">Shared Files & Folders</h2>
                    <Button variant="outline" onClick={() => setIsShareModalOpen(true)}>
                      <Share2 className="h-4 w-4 mr-2" />
                      Share New
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <div className="flex justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      </div>
                    ) : error ? (
                      <div className="text-center py-8 text-red-500">
                        Failed to load files
                      </div>
                    ) : filteredFiles?.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        No shared files found
                      </div>
                    ) : (
                      <FileTable
                        files={filteredFiles}
                        showShareActions
                        onShare={handleShare}
                        onDownload={handleDownload}
                      />
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Sidebar - Team Members & Activity */}
              <div className="space-y-6">
                {/* Team Members Card */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <h2 className="text-lg font-semibold">Team Members</h2>
                    <Users className="h-5 w-5 text-gray-500" />
                  </CardHeader>
                  <CardContent>
                    <TeamMembersList />
                  </CardContent>
                </Card>

                {/* Activity Feed Card */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <h2 className="text-lg font-semibold">Recent Activity</h2>
                    <Bell className="h-5 w-5 text-gray-500" />
                  </CardHeader>
                  <CardContent>
                    <ActivityFeed />
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </main>
      </div>

      {selectedFile && (
        <ShareModal
          open={isShareModalOpen}
          onOpenChange={setIsShareModalOpen}
          file={selectedFile}
        />
      )}
    </div>
  );
} 