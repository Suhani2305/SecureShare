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

  const { data: files, isLoading, error } = useQuery<SharedFile[]>({
    queryKey: ["/api/files/team"],
    onSuccess: (data) => {
      console.log("Team files fetched successfully:", {
        count: data?.length,
        files: data?.map(f => ({
          id: f.id,
          name: f.name,
          sharedBy: f.sharedBy,
          accessLevel: f.accessLevel
        }))
      });
    },
    onError: (error) => {
      console.error("Error fetching team files:", error);
      toast({
        title: "Error",
        description: "Failed to load team files",
        variant: "destructive",
      });
    }
  });

  const filteredFiles = files?.filter(file => 
    file.originalName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="bg-gray-100 font-sans h-screen flex overflow-hidden">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        
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
                  Failed to load team files
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