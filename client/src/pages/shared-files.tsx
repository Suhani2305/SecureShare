import { useState } from "react";
import { Sidebar } from "@/components/ui/sidebar";
import { Header } from "@/components/ui/header";
import { Button } from "@/components/ui/button";
import { Download, Filter, List, Share2, Trash2 } from "lucide-react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { useQuery, useMutation } from "@tanstack/react-query";
import { FileIcon } from "@/components/file/file-icon";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import { ShareModal } from "@/components/modals/share-modal";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface FileShare {
  file: {
    id: number;
    name: string;
    originalName: string;
    mimeType: string;
    size: number;
    encrypted: boolean;
    ownerId: number;
    createdAt: string;
  };
  share: {
    id: number;
    fileId: number;
    userId: number;
    accessLevel: string;
    expiresAt: string | null;
    createdAt: string;
  };
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  
  return parseFloat((bytes / Math.pow(1024, i)).toFixed(1)) + ' ' + sizes[i];
}

export default function SharedFiles() {
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFile, setSelectedFile] = useState<FileShare | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  
  const { data: sharedFiles, isLoading, error } = useQuery<FileShare[]>({
    queryKey: ["/api/shared-files"],
  });
  
  const filteredFiles = sharedFiles?.filter(item => 
    item.file.originalName.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const deleteMutation = useMutation({
    mutationFn: async (fileId: number) => {
      return apiRequest("DELETE", `/api/files/${fileId}`);
    },
    onSuccess: () => {
      toast({
        title: "File deleted",
        description: "The file has been moved to trash",
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/shared-files"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete the file: " + (error instanceof Error ? error.message : "Unknown error"),
        variant: "destructive",
      });
    },
  });
  
  const handleDeleteFile = (fileId: number) => {
    if (confirm("Are you sure you want to delete this file? It will be moved to trash.")) {
      deleteMutation.mutate(fileId);
    }
  };

  const handleShareFile = (file: FileShare) => {
    setSelectedFile(file);
    setIsShareModalOpen(true);
  };
  
  const handleMenuClick = () => {
    setShowMobileSidebar(!showMobileSidebar);
  };
  
  const handleDownload = async (file: any) => {
    try {
      const response = await apiRequest("GET", `/api/files/${file.id}/download`);
      if (!response.ok) throw new Error('Download failed');
      
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
        description: "Failed to download file",
        variant: "destructive",
      });
    }
  };
  
  return (
    <div className="bg-gray-100 font-sans h-screen flex overflow-hidden">
      <Sidebar />
      
      {/* Mobile sidebar */}
      {showMobileSidebar && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div 
            className="fixed inset-0 bg-gray-600 bg-opacity-75"
            onClick={() => setShowMobileSidebar(false)}
          ></div>
          <div className="fixed inset-y-0 left-0 flex flex-col z-40 w-64 bg-gray-800 text-white">
            <Sidebar />
          </div>
        </div>
      )}
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header onMenuClick={handleMenuClick} />
        
        <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <h1 className="text-2xl font-bold text-gray-800">Shared with Me</h1>
            
            <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
              <div className="relative w-full md:w-64">
                <Input
                  type="text"
                  placeholder="Search files..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full"
                />
              </div>
            </div>
          </div>
          
          <Card className="overflow-hidden">
            <CardHeader className="flex justify-between items-center p-5 border-b border-gray-200">
              <h2 className="text-lg font-semibold">Files Shared with Me</h2>
              <div className="flex">
                <Button variant="ghost" size="icon" className="mr-2">
                  <Filter className="h-5 w-5 text-gray-500" />
                </Button>
                <Button variant="ghost" size="icon">
                  <List className="h-5 w-5 text-gray-500" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading && (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              )}
              
              {error && (
                <div className="text-center py-8 text-red-500">
                  Failed to load shared files
                </div>
              )}
              
              {filteredFiles && filteredFiles.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  {searchQuery ? 
                    "No shared files match your search query." : 
                    "No files have been shared with you yet."}
                </div>
              )}
              
              {filteredFiles && filteredFiles.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="text-left py-3 px-4 font-medium text-gray-600 text-sm">Name</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-600 text-sm">Shared On</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-600 text-sm">File Size</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-600 text-sm">Access Level</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-600 text-sm">Expires</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-600 text-sm">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredFiles.map((item) => (
                        <tr key={item.share.id} className="border-b border-gray-200 hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <div className="flex items-center">
                              <FileIcon mimeType={item.file.mimeType} className="mr-3" />
                              <span className="font-medium">{item.file.originalName}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-gray-600">
                            {format(new Date(item.share.createdAt), "MMM d, yyyy")}
                          </td>
                          <td className="py-3 px-4 text-gray-600">{formatFileSize(item.file.size)}</td>
                          <td className="py-3 px-4 text-gray-600">
                            <span className={`capitalize ${item.share.accessLevel === 'edit' ? 'text-orange-600' : 'text-green-600'}`}>
                              {item.share.accessLevel}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-gray-600">
                            {item.share.expiresAt ? format(new Date(item.share.expiresAt), "MMM d, yyyy") : "Never"}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                title="Download"
                                onClick={() => handleDownload(item.file)}
                              >
                                <Download className="h-4 w-4 text-gray-500 hover:text-primary" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                title="Share"
                                className="mx-1"
                                onClick={() => handleShareFile(item)}
                              >
                                <Share2 className="h-4 w-4 text-gray-500 hover:text-primary" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                title="Delete"
                                onClick={() => handleDeleteFile(item.file.id)}
                              >
                                <Trash2 className="h-4 w-4 text-gray-500 hover:text-red-500" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>

      {selectedFile && (
        <ShareModal
          file={selectedFile.file}
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
        />
      )}
    </div>
  );
}
