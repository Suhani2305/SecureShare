
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { FileItem } from "@/types";
import { FileIcon } from "../file/file-icon";
import { Button } from "@/components/ui/button";
import { RefreshCw, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/utils/auth";

export function Trash() {
  const { token } = useAuth();

  const { token } = useAuth();
  const { data: files, isLoading, error } = useQuery<FileItem[]>({
    queryKey: ["trash"],
    enabled: !!token,
    queryFn: async () => {
      const response = await fetch("/api/trash", {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to fetch trash");
      }
      return response.json();
    }
    enabled: !!token,
    queryFn: async () => {
      const response = await fetch("/api/trash", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error("Failed to fetch deleted files");
      return response.json();
    }
  });

  return (
    <Card>
      <CardHeader className="flex justify-between items-center p-5 border-b border-gray-200">
        <h2 className="text-lg font-semibold">Trash</h2>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading && (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        )}
        
        {files && files.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            Trash is empty
          </div>
        )}
        
        {files && files.length > 0 && (
          <div className="divide-y">
            {files.map((file) => (
              <div key={file.id} className="flex items-center p-4 hover:bg-gray-50">
                <FileIcon mimeType={file.mimeType} size={32} />
                <div className="ml-3 flex-1">
                  <p className="font-medium">{file.originalName}</p>
                  <p className="text-sm text-gray-500">
                    Deleted {format(new Date(file.createdAt), 'MMM d, yyyy')}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" title="Restore">
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" title="Delete permanently">
                    <Trash2 className="h-4 w-4" />
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
