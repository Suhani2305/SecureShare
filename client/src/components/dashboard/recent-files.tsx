import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { FileItem } from "@/types";
import { FileIcon } from "../file/file-icon";
import { Button } from "@/components/ui/button";
import { Download, Share2 } from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/utils/auth";
import { API_ENDPOINTS } from "@/lib/config";
import { apiRequest } from "@/lib/queryClient";

export function RecentFiles() {
  const { token } = useAuth();

  const { data: files, isLoading, error } = useQuery<FileItem[]>({
    queryKey: [API_ENDPOINTS.FILES],
    enabled: !!token,
    queryFn: async () => {
      const response = await apiRequest("GET", API_ENDPOINTS.FILES);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to fetch files");
      }
      return response.json();
    }
  });

  const recentFiles = files?.slice(0, 5) || [];

  return (
    <Card>
      <CardHeader className="flex justify-between items-center p-5 border-b border-gray-200">
        <h2 className="text-lg font-semibold">Recent Files</h2>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading && (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        )}

        {recentFiles.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No recent files
          </div>
        )}

        {recentFiles.map((file) => (
          <div key={file.id} className="flex items-center p-4 hover:bg-gray-50 border-b last:border-0">
            <FileIcon mimeType={file.mimeType} size={32} />
            <div className="ml-3 flex-1">
              <p className="font-medium">{file.originalName}</p>
              <p className="text-sm text-gray-500">
                Uploaded {format(new Date(file.createdAt), 'MMM d, yyyy')}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="icon" title="Download" asChild>
                <a href={`/api/files/${file.id}/download`} download>
                  <Download className="h-4 w-4" />
                </a>
              </Button>
              <Button variant="ghost" size="icon" title="Share">
                <Share2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
