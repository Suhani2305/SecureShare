import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { MoreHorizontal } from "lucide-react";
import { FileIcon } from "../file/file-icon";
import { Button } from "@/components/ui/button";

export interface QuickAccessFile {
  id: number;
  name: string;
  originalName: string;
  mimeType: string;
  size: number;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  
  return parseFloat((bytes / Math.pow(1024, i)).toFixed(1)) + ' ' + sizes[i];
}

export function QuickAccess() {
  const { data: files, isLoading, error } = useQuery<QuickAccessFile[]>({
    queryKey: ["/api/files"],
  });
  
  const recentFiles = files?.slice(0, 6) || [];
  
  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex justify-between items-center p-5 border-b border-gray-200">
        <h2 className="text-lg font-semibold">Quick Access</h2>
        <Button variant="ghost" size="icon">
          <MoreHorizontal className="h-5 w-5 text-gray-500" />
        </Button>
      </CardHeader>
      <CardContent className="p-5">
        {isLoading && (
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        )}
        
        {error && (
          <div className="text-center py-4 text-red-500">
            Failed to load files
          </div>
        )}
        
        {files && files.length === 0 && (
          <div className="text-center py-4 text-gray-500">
            No files available. Upload some files to see them here.
          </div>
        )}
        
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {recentFiles.map((file) => (
            <a 
              key={file.id} 
              href={`/api/files/${file.id}/download`}
              className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition cursor-pointer flex flex-col items-center text-center"
            >
              <div className="text-3xl mb-2">
                <FileIcon mimeType={file.mimeType} size={36} />
              </div>
              <p className="text-sm font-medium truncate w-full">{file.originalName}</p>
              <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
            </a>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
