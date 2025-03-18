import { useState, useRef } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/components/ui/use-toast";
import { Upload } from "lucide-react";

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UploadModal({ isOpen, onClose }: UploadModalProps) {
  const [files, setFiles] = useState<FileList | null>(null);
  const [encrypt, setEncrypt] = useState(true);
  const [passwordProtect, setPasswordProtect] = useState(false);
  const [accessControl, setAccessControl] = useState("private");
  const [password, setPassword] = useState(""); // Added state for password
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!files || files.length === 0) {
        throw new Error("No files selected");
      }

      setIsUploading(true);

      const formData = new FormData();
      formData.append("file", files[0]);
      formData.append("encrypt", encrypt.toString());
      formData.append("password", password); // Add password to formData
      formData.append("accessControl", accessControl); // Add accessControl to formData

      const response = await fetch("/api/files", {
        method: "POST",
        body: formData,
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to upload file");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Upload successful",
        description: "Your file has been uploaded.",
      });

      // Reset form
      setFiles(null);
      setPassword(""); // Reset password
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      queryClient.invalidateQueries({ queryKey: ["/api/files"] });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Upload failed",
        description: error.message || "An error occurred while uploading your file.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsUploading(false);
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFiles(e.target.files);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const handleUpload = () => {
    uploadMutation.mutate();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Files</DialogTitle>
        </DialogHeader>

        <div 
          className="border-2 border-dashed border-gray-300 rounded-md p-6 text-center my-4"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          {/* Show upload status */}
          {uploadStatus && (
            <div className={`mt-2 text-sm ${uploadStatus.includes('Error') ? 'text-red-500' : 'text-green-500'}`}>
              {uploadStatus}
            </div>
          )}
          <Upload className="h-10 w-10 text-gray-400 mx-auto mb-2" />
          <p className="mb-2">Drag and drop files here</p>
          <p className="text-sm text-gray-500 mb-3">or</p>
          <Button onClick={handleBrowseClick}>
            Browse Files
          </Button>
          <Input 
            type="file" 
            className="hidden" 
            onChange={handleFileChange} 
            ref={fileInputRef}
          />
          <p className="text-xs text-gray-500 mt-3">Max file size: 100MB</p>

          {files && files.length > 0 && (
            <div className="mt-4 text-left bg-gray-50 p-2 rounded">
              <p className="text-sm truncate">
                Selected: <span className="font-medium">{files[0].name}</span>
              </p>
              <p className="text-xs text-gray-500">
                Size: {(files[0].size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-1">
              Security Options
            </Label>
            <div className="flex items-center mb-2">
              <Checkbox 
                id="encryptFiles" 
                checked={encrypt} 
                onCheckedChange={(checked) => setEncrypt(checked as boolean)}
              />
              <Label htmlFor="encryptFiles" className="ml-2 text-sm text-gray-700">
                Encrypt files (AES-256)
              </Label>
            </div>

            <div className="flex items-center mb-2">
              <Checkbox 
                id="passwordProtect" 
                checked={passwordProtect} 
                onCheckedChange={(checked) => setPasswordProtect(checked as boolean)}
              />
              <Label htmlFor="passwordProtect" className="ml-2 text-sm text-gray-700">
                Password protect
              </Label>
            </div>

            {passwordProtect && (
              <Input
                type="password"
                placeholder="Enter password"
                className="mb-2"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            )}
          </div>

          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-1">
              Access Control
            </Label>
            <select 
              value={accessControl}
              onChange={(e) => setAccessControl(e.target.value)}
              className="w-full rounded-md border border-gray-300 bg-background px-3 py-2 text-sm"
            >
              <option value="private">Private</option>
              <option value="shared">Shared</option>
              <option value="public">Public</option>
            </select>
          </div>
        </div>

        <DialogFooter className="flex justify-end space-x-3">
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button 
            onClick={handleUpload} 
            disabled={!files || files.length === 0 || isUploading}
          >
            {isUploading ? "Uploading..." : "Upload"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}