import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { FileIcon } from "./file-icon";
import { formatBytes, formatDate } from "@/lib/utils";
import { Download, Trash2, History, Share2, MoreVertical, Lock, LockOpen } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ShareModal } from "@/components/modals/share-modal";
import { DeleteModal } from "@/components/modals/delete-modal";

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

interface FileTableProps {
  files: SharedFile[];
  showShareActions?: boolean;
  onShare?: (file: SharedFile) => void;
  onDownload?: (file: SharedFile) => void;
}

export function FileTable({ files, showShareActions = false, onShare, onDownload }: FileTableProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<any>(null);

  const handleShare = (file: any) => {
    setSelectedFile(file);
    setShareModalOpen(true);
  };

  const handleDelete = (file: any) => {
    setSelectedFile(file);
    setDeleteModalOpen(true);
  };

  const handleDownload = async (file: any) => {
    try {
      // First try to download without password
      let response = await apiRequest("GET", `/api/files/${file.id}/download`);
      
      // If password is required
      if (response.status === 401 && (await response.json()).requiresPassword) {
        const password = prompt("This file is password protected. Please enter the password:");
        if (!password) return;
        
        // Retry with password
        response = await apiRequest("GET", `/api/files/${file.id}/download?password=${encodeURIComponent(password)}`);
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || "Download failed");
        }
      } else if (!response.ok) {
        throw new Error("Download failed");
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
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download file: " + (error instanceof Error ? error.message : "Unknown error"),
        variant: "destructive",
      });
    }
  };

  const deleteMutation = useMutation({
    mutationFn: async (fileId: number) => {
      const response = await apiRequest(`/api/files/${fileId}/trash`, {
        method: "POST",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to move file to trash");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/files"] });
      queryClient.invalidateQueries({ queryKey: ["/api/trash"] });
      toast({
        title: "Success",
        description: "File moved to trash",
      });
      setDeleteModalOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to move file to trash",
        variant: "destructive",
      });
    },
  });

  const handleDeleteConfirm = () => {
    if (selectedFile) {
      deleteMutation.mutate(selectedFile.id);
    }
  };

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Owner</TableHead>
            <TableHead>Size</TableHead>
            <TableHead>Last Modified</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {files.map((file) => (
            <TableRow key={file.id}>
              <TableCell>{file.originalName}</TableCell>
              <TableCell>{file.owner.username}</TableCell>
              <TableCell>{formatBytes(file.size)}</TableCell>
              <TableCell>{formatDate(file.updatedAt)}</TableCell>
              <TableCell className="text-right space-x-2">
                {onDownload && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDownload(file)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                )}
                {showShareActions && onShare && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onShare(file)}
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <ShareModal
        open={shareModalOpen}
        onOpenChange={setShareModalOpen}
        file={selectedFile}
      />

      <DeleteModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        onConfirm={handleDeleteConfirm}
        title="Delete File"
        description="Are you sure you want to delete this file? This action cannot be undone."
      />
    </>
  );
} 