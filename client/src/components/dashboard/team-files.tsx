
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { FileItem } from "@/types";
import { FileIcon } from "../file/file-icon";
import { Button } from "@/components/ui/button";
import { Download, Share2, Trash2 } from "lucide-react";

export function TeamFiles() {
  const { token } = useAuth();
  const { data: files, isLoading, error } = useQuery<FileItem[]>({
    queryKey: ["team-files"],
    enabled: !!token,
    queryFn: async () => {
      const response = await fetch("/api/shared-files", {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to fetch team files");
      }
      return response.json();
    }
  });

  return (
    <Card>
      <CardHeader className="flex justify-between items-center p-5 border-b border-gray-200">
        <h2 className="text-lg font-semibold">Team Files</h2>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading && (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        )}
        
        {files && files.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No team files available
          </div>
        )}
        
        {files && files.length > 0 && (
          <div className="divide-y">
            {files.map((file) => (
              <div key={file.id} className="flex items-center p-4 hover:bg-gray-50">
                <FileIcon mimeType={file.mimeType} size={32} />
                <div className="ml-3 flex-1">
                  <p className="font-medium">{file.originalName}</p>
                  <p className="text-sm text-gray-500">Shared by {file.ownerId}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon">
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon">
                    <Share2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
