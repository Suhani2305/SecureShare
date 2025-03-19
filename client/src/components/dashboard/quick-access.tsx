import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { useQuery, useMutation } from "@tanstack/react-query";
import { FileIcon } from "../file/file-icon";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/utils/auth";

export function QuickAccess() {
  const { toast } = useToast();
  const { token } = useAuth();
  
  const { data: files, isLoading } = useQuery({
    queryKey: ["/api/files"],
    enabled: !!token,
    queryFn: async () => {
      const response = await apiRequest("/api/files");
      if (!response.ok) {
        throw new Error("Failed to fetch files");
      }
      return response.json();
    },
  });

  const handleDownload = async (file: any) => {
    try {
      const response = await fetch(`/api/files/${file.id}/download`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to download file");
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.originalName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Success",
        description: "File downloaded successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to download file",
        variant: "destructive",
      });
    }
  };

  // Get the 5 most recently accessed files
  const recentFiles = files?.slice(0, 5) || [];

  return (
    <Card>
      <CardHeader className="flex justify-between items-center p-5 border-b border-gray-200">
        <h2 className="text-lg font-semibold">Quick Access</h2>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading && (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        )}
        
        {recentFiles.length === 0 && !isLoading && (
          <div className="text-center py-8 text-gray-500">
            No recent files
          </div>
        )}
        
        {recentFiles.length > 0 && (
          <div className="divide-y">
            {recentFiles.map((file) => (
              <div key={file.id} className="flex items-center p-4 hover:bg-gray-50">
                <FileIcon mimeType={file.mimeType} size={32} />
                <div className="ml-3 flex-1">
                  <p className="font-medium">{file.originalName}</p>
                  <p className="text-sm text-gray-500">
                    Last accessed {new Date(file.updatedAt).toLocaleDateString()}
                  </p>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => handleDownload(file)}
                  title="Download"
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
