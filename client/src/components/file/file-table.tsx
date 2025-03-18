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

interface FileTableProps {
  files: Array<{
    id: string;
    name: string;
    size: number;
    type: string;
    createdAt: string;
    updatedAt: string;
    originalName: string;
    mimeType: string;
    encrypted: boolean;
  }>;
  onDownload?: (fileId: string) => void;
  onDelete?: (fileId: string) => void;
  onRestore?: (fileId: string) => void;
  showActions?: boolean;
  showShareActions?: boolean;
  isTrash?: boolean;
}

export function FileTable({
  files,
  onDownload,
  onDelete,
  onRestore,
  showActions = true,
  showShareActions = true,
  isTrash = false,
}: FileTableProps) {
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
      const response = await fetch(`/api/files/${file.id}/download`);
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

  const deleteMutation = useMutation({
    mutationFn: async (fileId: number) => {
      await apiRequest(`/api/files/${fileId}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/files"] });
      toast({
        title: "Success",
        description: "File deleted successfully",
      });
      setDeleteModalOpen(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete file",
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
            <TableHead>Size</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Modified</TableHead>
            {showActions && <TableHead>Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {files.map((file) => (
            <TableRow key={file.id}>
              <TableCell className="flex items-center gap-2">
                <FileIcon type={file.type} />
                {file.name}
              </TableCell>
              <TableCell>{formatBytes(file.size)}</TableCell>
              <TableCell>{file.type}</TableCell>
              <TableCell>{formatDate(new Date(file.updatedAt))}</TableCell>
              {showActions && (
                <TableCell className="flex gap-2">
                  {!isTrash && onDownload && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDownload(file.id)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  )}
                  {!isTrash && onDelete && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDelete(file.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                  {isTrash && onRestore && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onRestore(file.id)}
                    >
                      <History className="h-4 w-4" />
                    </Button>
                  )}
                </TableCell>
              )}
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