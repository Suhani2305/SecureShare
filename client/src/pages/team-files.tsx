import { useState } from "react";
import { Sidebar } from "@/components/ui/sidebar";
import { Header } from "@/components/ui/header";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { FileTable } from "@/components/file/file-table";
import { useToast } from "@/components/ui/use-toast";

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
}

export default function TeamFiles() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);

  const { data: files, isLoading, error } = useQuery({
    queryKey: ["/api/files/team"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/files/team");
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to fetch team files");
      }
      return response.json();
    }
  });

  const handleMenuClick = () => {
    setShowMobileSidebar(!showMobileSidebar);
  };

  const filteredFiles = files?.filter(file => 
    file.originalName.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
            <h1 className="text-2xl font-bold text-gray-800">Team Files</h1>
            
            <div className="relative w-full md:w-64">
              <input
                type="text"
                placeholder="Search files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
          
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold">Shared Files</h2>
            </CardHeader>
            <CardContent>
              {isLoading && (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              )}
              
              {error && (
                <div className="text-center py-8 text-red-500">
                  {error instanceof Error ? error.message : "Failed to load team files"}
                </div>
              )}
              
              {filteredFiles && filteredFiles.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  {searchQuery ? 
                    "No files match your search query." : 
                    "No files have been shared with you yet."}
                </div>
              )}
              
              {filteredFiles && filteredFiles.length > 0 && (
                <FileTable 
                  files={filteredFiles}
                  showActions={true}
                  showShareActions={false}
                />
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
} 